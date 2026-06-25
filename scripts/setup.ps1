#Requires -Version 5.1
<#
.SYNOPSIS
  Installer Stokasir untuk Windows
.DESCRIPTION
  Jalankan sebagai Administrator dari folder root project:
    Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
    .\scripts\setup.ps1 [install|repair|uninstall]
#>
param([string]$Mode = '')

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── Warna output ─────────────────────────────────────────────────────────────
function info($m)   { Write-Host "  >> $m" -ForegroundColor Cyan }
function ok($m)     { Write-Host "  OK $m" -ForegroundColor Green }
function warn($m)   { Write-Host "  !! $m" -ForegroundColor Yellow }
function err($m)    { Write-Host "  XX $m" -ForegroundColor Red; exit 1 }
function header($m) { Write-Host "`n== $m ==" -ForegroundColor Cyan }

# ── Path root project ────────────────────────────────────────────────────────
$ROOT = Split-Path -Parent $PSScriptRoot
$ENV_FILE = "$ROOT\backend\.env"

Write-Host ""
Write-Host "+======================================+" -ForegroundColor White
Write-Host "|      Stokasir - Setup Installer      |" -ForegroundColor White
Write-Host "+======================================+" -ForegroundColor White
Write-Host "  Platform : Windows ($env:PROCESSOR_ARCHITECTURE)" -ForegroundColor Cyan
Write-Host "  Folder   : $ROOT" -ForegroundColor Cyan
Write-Host ""

# ── Cek Administrator ────────────────────────────────────────────────────────
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    warn "Script ini sebaiknya dijalankan sebagai Administrator"
    warn "Beberapa fitur (nginx, mkcert, Task Scheduler) butuh hak admin"
    $cont = Read-Host "  Lanjutkan tanpa Administrator? [y/N]"
    if ($cont -ne 'y') { exit 0 }
}

# ── Pilih mode ───────────────────────────────────────────────────────────────
if (-not $Mode) {
    Write-Host "Pilih mode:"
    Write-Host "  1) install   - install & konfigurasi dari awal"
    Write-Host "  2) repair    - reinstall deps, rebuild, restart service"
    Write-Host "  3) uninstall - hapus service & config"
    Write-Host ""
    $choice = Read-Host "Pilihan [1/2/3]"
    switch ($choice) {
        '1' { $Mode = 'install' }
        'install' { $Mode = 'install' }
        '2' { $Mode = 'repair' }
        'repair' { $Mode = 'repair' }
        '3' { $Mode = 'uninstall' }
        'uninstall' { $Mode = 'uninstall' }
        default { err "Pilihan tidak valid." }
    }
}

# ════════════════════════════════════════════════════════════════════════════
# HELPER: Download file
# ════════════════════════════════════════════════════════════════════════════
function Download-File($url, $dest) {
    info "Mengunduh $url ..."
    $wc = New-Object System.Net.WebClient
    $wc.DownloadFile($url, $dest)
}

# ════════════════════════════════════════════════════════════════════════════
# UNINSTALL
# ════════════════════════════════════════════════════════════════════════════
function Do-Uninstall {
    header "Uninstall Stokasir"
    warn "Mode ini akan menghapus service Stokasir dari Task Scheduler."
    $confirm = Read-Host "  Lanjutkan? [y/N]"
    if ($confirm -ne 'y') { Write-Host "Dibatalkan."; exit 0 }

    foreach ($task in @('Stokasir Backend', 'Stokasir Frontend', 'Stokasir Nginx')) {
        if (Get-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue) {
            Stop-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue
            Unregister-ScheduledTask -TaskName $task -Confirm:$false
            ok "$task dihapus"
        } else {
            warn "$task tidak ditemukan"
        }
    }

    if (Test-Path $ENV_FILE) {
        Remove-Item $ENV_FILE -Force
        ok "backend\.env dihapus"
    }

    # Hapus nginx config stokasir (jangan hapus nginx itu sendiri)
    if (Test-Path 'C:\nginx\conf\stokasir.conf') {
        Remove-Item 'C:\nginx\conf\stokasir.conf' -Force
        ok "nginx config stokasir dihapus"
    }

    Write-Host ""
    Write-Host "+============================================+" -ForegroundColor Green
    Write-Host "|     Stokasir berhasil diuninstall!         |" -ForegroundColor Green
    Write-Host "+============================================+" -ForegroundColor Green
}

# ════════════════════════════════════════════════════════════════════════════
# REPAIR
# ════════════════════════════════════════════════════════════════════════════
function Do-Repair {
    header "Repair Stokasir"

    # Cek Bun
    $bunCmd = Get-Command bun -ErrorAction SilentlyContinue
    if (-not $bunCmd) {
        $bunPath = "$env:USERPROFILE\.bun\bin\bun.exe"
        if (Test-Path $bunPath) { $env:PATH = "$env:USERPROFILE\.bun\bin;$env:PATH" }
        else { err "Bun tidak ditemukan. Jalankan mode install terlebih dahulu." }
    }
    ok "Bun: v$(bun --version)"

    header "1 / 3  Reinstall & Rebuild"
    Set-Location "$ROOT\backend"; bun install --production
    ok "Backend dependencies selesai"
    Set-Location "$ROOT\frontend"; bun install; bun run build
    ok "Frontend build selesai"

    header "2 / 3  Migrasi Database"
    Set-Location "$ROOT\backend"
    try { bun run db:migrate; ok "Migrasi selesai" }
    catch { warn "Tidak ada migrasi baru atau gagal." }

    header "3 / 3  Restart Service"
    foreach ($task in @('Stokasir Backend', 'Stokasir Frontend')) {
        if (Get-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue) {
            Stop-ScheduledTask  -TaskName $task -ErrorAction SilentlyContinue
            Start-ScheduledTask -TaskName $task
            ok "$task di-restart"
        }
    }

    # Reload nginx jika ada
    if (Test-Path 'C:\nginx\nginx.exe') {
        & 'C:\nginx\nginx.exe' -s reload 2>$null
        ok "Nginx di-reload"
    }

    Write-Host ""
    Write-Host "+============================================+" -ForegroundColor Green
    Write-Host "|     Stokasir berhasil di-repair!           |" -ForegroundColor Green
    Write-Host "+============================================+" -ForegroundColor Green
}

# ════════════════════════════════════════════════════════════════════════════
# INSTALL
# ════════════════════════════════════════════════════════════════════════════
function Do-Install {

    # ════════════════════════════════════════════════════════════════════════
    header "1 / 6  Cek & Install Bun"
    # ════════════════════════════════════════════════════════════════════════
    $bunCmd = Get-Command bun -ErrorAction SilentlyContinue
    if (-not $bunCmd) {
        $bunPath = "$env:USERPROFILE\.bun\bin\bun.exe"
        if (Test-Path $bunPath) { $env:PATH = "$env:USERPROFILE\.bun\bin;$env:PATH"; $bunCmd = $true }
    }

    if (-not $bunCmd) {
        info "Menginstall Bun..."
        # Coba winget dulu, fallback ke PowerShell installer
        $winget = Get-Command winget -ErrorAction SilentlyContinue
        if ($winget) {
            winget install Oven-sh.Bun --accept-source-agreements --accept-package-agreements
        } else {
            powershell -c "irm bun.sh/install.ps1 | iex"
        }
        $env:PATH = "$env:USERPROFILE\.bun\bin;$env:PATH"
        if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
            err "Gagal install Bun. Coba manual: https://bun.sh"
        }
        ok "Bun berhasil diinstall: v$(bun --version)"
    } else {
        ok "Bun sudah terinstall: v$(bun --version)"
    }

    $BUN_BIN = (Get-Command bun).Source

    # ════════════════════════════════════════════════════════════════════════
    header "2 / 6  Konfigurasi"
    # ════════════════════════════════════════════════════════════════════════
    Write-Host ""
    Write-Host "  Isi konfigurasi (Enter = pakai nilai default):"
    Write-Host ""

    $defaultData = "C:\stokasir-data"
    $inputData   = Read-Host "  Folder data (database & upload) [$defaultData]"
    $DATA_DIR    = if ($inputData) { $inputData } else { $defaultData }

    # Deteksi IP otomatis
    $detectedIp = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -notmatch '^(127|169)' -and $_.PrefixOrigin -ne 'WellKnown' } |
        Select-Object -First 1).IPAddress
    $defaultIp  = if ($detectedIp) { $detectedIp } else { '192.168.1.x' }
    $inputIp    = Read-Host "  IP server ini (untuk akses HP) [$defaultIp]"
    $SERVER_IP  = if ($inputIp) { $inputIp } else { $defaultIp }

    $defaultJwt = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
    $inputJwt   = Read-Host "  JWT Secret (Enter = generate otomatis)"
    $JWT_SECRET = if ($inputJwt) { $inputJwt } else { $defaultJwt }

    $inputBack  = Read-Host "  Port backend  [3000]"
    $PORT_BACK  = if ($inputBack) { $inputBack } else { '3000' }
    $inputFront = Read-Host "  Port frontend [5173]"
    $PORT_FRONT = if ($inputFront) { $inputFront } else { '5173' }

    Write-Host ""
    $inputNginx   = Read-Host "  Setup nginx reverse proxy (port 80)? [Y/n]"
    $SETUP_NGINX  = ($inputNginx -ne 'n')
    $SETUP_HTTPS  = $false
    if ($SETUP_NGINX) {
        $inputHttps  = Read-Host "  Setup HTTPS dengan mkcert? [Y/n]"
        $SETUP_HTTPS = ($inputHttps -ne 'n')
    }

    $PUBLIC_URL = if ($SETUP_HTTPS) { "https://$SERVER_IP/api" }
                  elseif ($SETUP_NGINX) { "http://$SERVER_IP/api" }
                  else { "http://${SERVER_IP}:${PORT_BACK}" }

    Write-Host ""
    info "Konfigurasi:"
    Write-Host "  Data dir     : $DATA_DIR"
    Write-Host "  IP server    : $SERVER_IP"
    Write-Host "  Port backend : $PORT_BACK"
    Write-Host "  Port frontend: $PORT_FRONT"
    Write-Host "  Nginx        : $(if ($SETUP_NGINX) { 'ya' } else { 'tidak' })"
    Write-Host "  HTTPS        : $(if ($SETUP_HTTPS) { 'ya (mkcert)' } else { 'tidak' })"
    Write-Host "  API URL      : $PUBLIC_URL"
    Write-Host ""
    $lanjut = Read-Host "Lanjutkan? [Y/n]"
    if ($lanjut -eq 'n') { Write-Host "Dibatalkan."; exit 0 }

    # ════════════════════════════════════════════════════════════════════════
    header "3 / 6  Siapkan Folder & Install Dependencies"
    # ════════════════════════════════════════════════════════════════════════
    foreach ($sub in @('uploads\produk','uploads\invoice','uploads\karyawan','backup','logs')) {
        New-Item -ItemType Directory -Path "$DATA_DIR\$sub" -Force | Out-Null
    }
    ok "Folder data siap: $DATA_DIR"

    Set-Location "$ROOT\backend"; bun install --production
    ok "Backend dependencies selesai"

    Set-Location "$ROOT\frontend"; bun install; bun run build
    ok "Frontend build selesai"

    # ════════════════════════════════════════════════════════════════════════
    header "4 / 6  Generate Config & Service Files"
    # ════════════════════════════════════════════════════════════════════════

    # Tulis .env
    @"
DATABASE_URL=$DATA_DIR\data.db
UPLOAD_DIR=$DATA_DIR\uploads
PORT=$PORT_BACK
NODE_ENV=production
JWT_SECRET=$JWT_SECRET
"@ | Set-Content $ENV_FILE -Encoding UTF8
    ok "backend\.env ditulis"

    # Tulis start-frontend.ps1
    $frontendScript = "$ROOT\scripts\start-frontend.ps1"
    @"
`$env:PORT='$PORT_FRONT'
`$env:HOST='0.0.0.0'
`$env:NODE_ENV='production'
`$env:PUBLIC_API_URL='$PUBLIC_URL'
Set-Location '$ROOT\frontend'
& '$BUN_BIN' build\index.js
"@ | Set-Content $frontendScript -Encoding UTF8
    ok "start-frontend.ps1 ditulis"

    # Task Scheduler settings
    $settings = New-ScheduledTaskSettingsSet `
        -RestartCount 5 `
        -RestartInterval (New-TimeSpan -Minutes 1) `
        -ExecutionTimeLimit (New-TimeSpan -Days 365) `
        -StartWhenAvailable
    $trigger = New-ScheduledTaskTrigger -AtLogOn

    # Backend task
    $actionBack = New-ScheduledTaskAction `
        -Execute $BUN_BIN `
        -Argument "run src\index.ts" `
        -WorkingDirectory "$ROOT\backend"
    Register-ScheduledTask -TaskName "Stokasir Backend" `
        -Action $actionBack -Trigger $trigger -Settings $settings `
        -RunLevel Highest -Force | Out-Null
    ok "Task Scheduler: Stokasir Backend"

    # Frontend task
    $actionFront = New-ScheduledTaskAction `
        -Execute "powershell.exe" `
        -Argument "-ExecutionPolicy Bypass -NonInteractive -File `"$frontendScript`""
    Register-ScheduledTask -TaskName "Stokasir Frontend" `
        -Action $actionFront -Trigger $trigger -Settings $settings `
        -RunLevel Highest -Force | Out-Null
    ok "Task Scheduler: Stokasir Frontend"

    # Firewall
    $ports = @($PORT_BACK, $PORT_FRONT, '80')
    if ($SETUP_HTTPS) { $ports += '443' }
    foreach ($p in $ports) {
        netsh advfirewall firewall add rule name="Stokasir-$p" dir=in action=allow protocol=TCP localport=$p 2>$null | Out-Null
    }
    ok "Windows Firewall: port dibuka"

    # ════════════════════════════════════════════════════════════════════════
    header "5 / 6  Setup Nginx & HTTPS"
    # ════════════════════════════════════════════════════════════════════════

    if ($SETUP_NGINX) {
        # Install nginx for Windows
        if (-not (Test-Path 'C:\nginx\nginx.exe')) {
            info "Mengunduh nginx untuk Windows..."
            $nginxVer = '1.27.4'
            $nginxZip = "$env:TEMP\nginx.zip"
            Download-File "https://nginx.org/download/nginx-$nginxVer.zip" $nginxZip
            Expand-Archive $nginxZip 'C:\' -Force
            Rename-Item "C:\nginx-$nginxVer" 'C:\nginx' -ErrorAction SilentlyContinue
            Remove-Item $nginxZip -Force
            ok "Nginx terinstall di C:\nginx\"
        } else {
            ok "Nginx sudah ada: C:\nginx\nginx.exe"
        }

        # Buat folder certs
        New-Item -ItemType Directory -Path 'C:\nginx\certs' -Force | Out-Null

        if ($SETUP_HTTPS) {
            # Install mkcert
            $mkcertPath = 'C:\Windows\System32\mkcert.exe'
            if (-not (Test-Path $mkcertPath)) {
                info "Mengunduh mkcert..."
                Download-File `
                    "https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-windows-amd64.exe" `
                    $mkcertPath
                ok "mkcert terinstall"
            } else {
                ok "mkcert sudah terinstall"
            }

            # Install local CA
            info "Menginstall local CA ke Windows Certificate Store..."
            & mkcert -install
            ok "Local CA terinstall - Edge & Chrome langsung trust"

            # Generate cert
            info "Generate sertifikat untuk $SERVER_IP..."
            & mkcert -cert-file 'C:\nginx\certs\cert.pem' -key-file 'C:\nginx\certs\key.pem' `
                $SERVER_IP localhost 127.0.0.1
            ok "Sertifikat disimpan ke C:\nginx\certs\"

            # Copy rootCA untuk HP karyawan
            $caRoot = & mkcert -CAROOT
            Copy-Item "$caRoot\rootCA.pem" "$DATA_DIR\uploads\rootCA.crt" -Force
            ok "rootCA.crt disalin ke $DATA_DIR\uploads\ (untuk download HP)"

            # Tulis nginx config HTTPS
            $nginxDataDir = $DATA_DIR -replace '\\', '/'
            @"
events {}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;

    server {
        listen 80;
        server_name _;

        location = /rootCA.crt {
            alias $nginxDataDir/uploads/rootCA.crt;
            add_header Content-Type application/x-x509-ca-cert;
            add_header Content-Disposition 'attachment; filename="StokasirCA.crt"';
        }
        location / { return 301 https://`$host`$request_uri; }
    }

    server {
        listen 443 ssl;
        server_name _;

        ssl_certificate     C:/nginx/certs/cert.pem;
        ssl_certificate_key C:/nginx/certs/key.pem;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         HIGH:!aNULL:!MD5;

        gzip on;
        gzip_types text/plain text/css application/javascript application/json;

        location = /service-worker.js {
            proxy_pass http://127.0.0.1:${PORT_FRONT}/service-worker.js;
            add_header Cache-Control "no-store, no-cache, must-revalidate";
        }

        location = /rootCA.crt {
            alias $nginxDataDir/uploads/rootCA.crt;
            add_header Content-Type application/x-x509-ca-cert;
            add_header Content-Disposition 'attachment; filename="StokasirCA.crt"';
        }

        location /uploads/ { alias $nginxDataDir/uploads/; }

        location /api/ {
            proxy_pass http://127.0.0.1:${PORT_BACK}/;
            proxy_set_header Host `$host;
            proxy_set_header X-Forwarded-Proto https;
        }

        location / {
            proxy_pass http://127.0.0.1:${PORT_FRONT};
            proxy_http_version 1.1;
            proxy_set_header Upgrade `$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host `$host;
        }
    }
}
"@ | Set-Content 'C:\nginx\conf\nginx.conf' -Encoding UTF8

        } else {
            # HTTP only nginx config
            $nginxDataDir = $DATA_DIR -replace '\\', '/'
            @"
events {}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;

    server {
        listen 80;
        server_name _;

        gzip on;
        gzip_types text/plain text/css application/javascript application/json;

        location = /service-worker.js {
            proxy_pass http://127.0.0.1:${PORT_FRONT}/service-worker.js;
            add_header Cache-Control "no-store, no-cache, must-revalidate";
        }

        location /uploads/ { alias $nginxDataDir/uploads/; }

        location /api/ {
            proxy_pass http://127.0.0.1:${PORT_BACK}/;
            proxy_set_header Host `$host;
        }

        location / {
            proxy_pass http://127.0.0.1:${PORT_FRONT};
            proxy_http_version 1.1;
            proxy_set_header Upgrade `$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host `$host;
        }
    }
}
"@ | Set-Content 'C:\nginx\conf\nginx.conf' -Encoding UTF8
        }

        ok "nginx.conf ditulis"

        # Daftarkan nginx ke Task Scheduler
        $actionNginx = New-ScheduledTaskAction -Execute 'C:\nginx\nginx.exe'
        Register-ScheduledTask -TaskName "Stokasir Nginx" `
            -Action $actionNginx -Trigger $trigger -Settings $settings `
            -RunLevel Highest -Force | Out-Null
        ok "Task Scheduler: Stokasir Nginx"

    } else {
        info "Nginx dilewati - akses langsung via port $PORT_FRONT"
    }

    # ════════════════════════════════════════════════════════════════════════
    header "6 / 6  Jalankan Stokasir"
    # ════════════════════════════════════════════════════════════════════════

    Start-ScheduledTask "Stokasir Backend"
    Start-Sleep -Seconds 2
    Start-ScheduledTask "Stokasir Frontend"
    if ($SETUP_NGINX) {
        Start-Sleep -Seconds 1
        Start-ScheduledTask "Stokasir Nginx"
    }
    ok "Semua service berjalan"

    # ── Ringkasan ─────────────────────────────────────────────────────────
    Write-Host ""
    Write-Host "+============================================+" -ForegroundColor Green
    Write-Host "|     Stokasir berhasil diinstall!           |" -ForegroundColor Green
    Write-Host "+============================================+" -ForegroundColor Green
    Write-Host ""

    if ($SETUP_HTTPS) {
        Write-Host "  Akses dari HP/browser : " -NoNewline
        Write-Host "https://$SERVER_IP/" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  HTTPS - Install CA di HP karyawan (1x saja):" -ForegroundColor White
        Write-Host "  1. Buka browser HP -> " -NoNewline
        Write-Host "http://$SERVER_IP/rootCA.crt" -ForegroundColor Cyan -NoNewline
        Write-Host " -> download & install"
        Write-Host "     Android : Settings > Security > Install certificate > CA Certificate"
        Write-Host "     iPhone  : Settings > General > VPN & Device Management > install"
        Write-Host "  * Firefox butuh trust manual: " -NoNewline
        Write-Host "about:preferences#privacy" -ForegroundColor Cyan -NoNewline
        Write-Host " -> Certificates -> Import"
    } elseif ($SETUP_NGINX) {
        Write-Host "  Akses dari HP/browser : " -NoNewline
        Write-Host "http://$SERVER_IP/" -ForegroundColor Cyan
    } else {
        Write-Host "  Akses dari HP/browser : " -NoNewline
        Write-Host "http://${SERVER_IP}:${PORT_FRONT}" -ForegroundColor Cyan
    }

    Write-Host ""
    Write-Host "  Perintah Task Scheduler:" -ForegroundColor White
    Write-Host "    Get-ScheduledTask 'Stokasir*'          " -ForegroundColor Yellow -NoNewline
    Write-Host "- status semua"
    Write-Host "    Start-ScheduledTask 'Stokasir Backend' " -ForegroundColor Yellow -NoNewline
    Write-Host "- start backend"
    Write-Host "    Stop-ScheduledTask  'Stokasir Backend' " -ForegroundColor Yellow -NoNewline
    Write-Host "- stop backend"
    if ($SETUP_NGINX) {
        Write-Host "    C:\nginx\nginx.exe -s reload           " -ForegroundColor Yellow -NoNewline
        Write-Host "- reload nginx"
    }
    Write-Host ""
    Write-Host "  Data tersimpan di: " -NoNewline
    Write-Host $DATA_DIR -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Repair/uninstall: " -NoNewline
    Write-Host ".\scripts\setup.ps1 repair|uninstall" -ForegroundColor Cyan
    Write-Host ""
}

# ── Route ────────────────────────────────────────────────────────────────────
switch ($Mode) {
    'install'   { Do-Install }
    'uninstall' { Do-Uninstall }
    'repair'    { Do-Repair }
    default     { err "Mode tidak valid: '$Mode'. Gunakan: install | repair | uninstall" }
}
