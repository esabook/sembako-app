#Requires -Version 5.1
# ============================================================
# scripts\setup-prebuilt.ps1 => Installer Stokasir dari prebuilt artifacts (Windows)
#
# Tidak perlu build / mkcert / bun install di mesin target.
# Jalankan (PowerShell sebagai Administrator):
#   powershell -ExecutionPolicy Bypass -File scripts\setup-prebuilt.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\setup-prebuilt.ps1 install
#   powershell -ExecutionPolicy Bypass -File scripts\setup-prebuilt.ps1 repair
#   powershell -ExecutionPolicy Bypass -File scripts\setup-prebuilt.ps1 uninstall
#
# Prasyarat: scripts/prebuilt.sh sudah dijalankan di mesin developer
# Service manager: NSSM (diunduh otomatis jika tidak ada)
# ============================================================

param(
    [ValidateSet('install','repair','uninstall','')]
    [string]$Mode = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ==============================================================
# Fungsi output berwarna
# ==============================================================
function Info   { param($msg) Write-Host "  -> $msg" -ForegroundColor Cyan }
function Ok     { param($msg) Write-Host "  OK $msg" -ForegroundColor Green }
function Warn   { param($msg) Write-Host "  !! $msg" -ForegroundColor Yellow }
function Fail   { param($msg) Write-Host "  XX $msg" -ForegroundColor Red; exit 1 }
function Header { param($msg) Write-Host "`n== $msg ==" -ForegroundColor Cyan }

# ==============================================================
# Helper: Read-Host dengan nilai default (Enter = pakai default)
# ==============================================================
function Read-Default {
    param([string]$Prompt, [string]$Default)
    $answer = Read-Host "  $Prompt [$Default]"
    if ($answer) { return $answer } else { return $Default }
}

# ==============================================================
# Cek hak Administrator
# ==============================================================
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
           ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host ""
    Write-Host "  Script ini butuh hak Administrator." -ForegroundColor Red
    Write-Host "  Klik kanan PowerShell -> 'Run as Administrator', lalu jalankan ulang." -ForegroundColor Yellow
    Write-Host ""
    Pause
    exit 1
}

# ==============================================================
# Path dasar
# ==============================================================
$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$PrebuiltDir = Join-Path $ScriptDir "prebuilt"

# ==============================================================
# Banner
# ==============================================================
Write-Host ""
Write-Host "==============================================================================================" -ForegroundColor Cyan
Write-Host "=        Stokasir Setup Prebuilt Installer        =" -ForegroundColor Cyan
Write-Host "==============================================================================================" -ForegroundColor Cyan
Write-Host "  Platform : Windows ($env:PROCESSOR_ARCHITECTURE)" -ForegroundColor Cyan
Write-Host "  Prebuilt : $PrebuiltDir" -ForegroundColor Cyan
Write-Host ""

# ==============================================================
# Validasi folder prebuilt
# ==============================================================
if (-not (Test-Path $PrebuiltDir)) {
    Fail "Folder scripts\prebuilt\ tidak ditemukan.`n  Jalankan terlebih dahulu: bash scripts/prebuilt.sh"
}
if (-not (Test-Path "$PrebuiltDir\manifest.json")) {
    Fail "manifest.json tidak ditemukan. Prebuilt mungkin tidak lengkap."
}
if (-not (Test-Path "$PrebuiltDir\app\backend\server.js") -and
    -not (Test-Path "$PrebuiltDir\bin\stokasir-win.exe")) {
    Fail "Backend artifact tidak ditemukan. Jalankan ulang prebuilt.sh."
}
if (-not (Test-Path "$PrebuiltDir\app\frontend")) {
    Fail "Frontend artifact tidak ditemukan. Jalankan ulang prebuilt.sh."
}

# Baca manifest
$manifest         = Get-Content "$PrebuiltDir\manifest.json" -Raw | ConvertFrom-Json
$ManifestMode     = $manifest.mode
$ManifestVersion  = $manifest.version
$ManifestDate     = $manifest.buildDate
$ManifestHasCerts = [bool]$manifest.hasCerts

Write-Host "  Versi    : $ManifestVersion" -ForegroundColor Cyan
Write-Host "  Build    : $ManifestDate"    -ForegroundColor Cyan
Write-Host "  Mode     : $ManifestMode"    -ForegroundColor Cyan
Write-Host "  Sertifikat: $(if ($ManifestHasCerts) { 'ya (HTTPS siap)' } else { 'tidak (HTTP only)' })" -ForegroundColor Cyan
Write-Host ""

$HasCerts = $ManifestHasCerts -and (Test-Path "$PrebuiltDir\certs\cert.pem")

# ==============================================================
# Helper: Dapatkan path NSSM (download otomatis jika perlu)
# ==============================================================
function Get-NssmPath {
    # 1. Cari di PATH sistem
    $found = Get-Command nssm -ErrorAction SilentlyContinue
    if ($found) { return $found.Source }

    # 2. Cari di folder scripts\
    $local = Join-Path $ScriptDir "nssm.exe"
    if (Test-Path $local) { return $local }

    # 3. Download otomatis dari nssm.cc
    Warn "NSSM tidak ditemukan => mengunduh dari nssm.cc..."
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $zip = Join-Path $env:TEMP "nssm.zip"
        $dir = Join-Path $env:TEMP "nssm-extract"

        Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile $zip -UseBasicParsing
        Expand-Archive -Path $zip -DestinationPath $dir -Force

        $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'AMD64') { 'win64' } else { 'win32' }
        $exe  = Get-ChildItem "$dir\nssm-*\$arch\nssm.exe" | Select-Object -First 1
        Copy-Item $exe.FullName $local -Force

        Ok "NSSM diunduh -> $local"
        return $local
    } catch {
        Fail "Gagal mengunduh NSSM.`n  Download manual: https://nssm.cc/`n  Taruh nssm.exe di folder scripts\"
    }
}

# ==============================================================
# Helper: Dapatkan path Nginx (download & install otomatis jika perlu)
# ==============================================================
function Get-NginxPath {
    # 1. Cari di PATH sistem
    $found = Get-Command nginx -ErrorAction SilentlyContinue
    if ($found) { return $found.Source }

    # 2. Sudah terinstall di C:\nginx
    $local = "C:\nginx\nginx.exe"
    if (Test-Path $local) {
        if ($env:PATH -notlike "*C:\nginx*") { $env:PATH = "C:\nginx;" + $env:PATH }
        return $local
    }

    # 3. Download otomatis dari nginx.org
    Warn "Nginx tidak ditemukan => mengunduh dari nginx.org..."
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

        Info "Mengecek versi nginx terbaru..."
        $page    = (Invoke-WebRequest -Uri "https://nginx.org/en/download.html" -UseBasicParsing).Content
        $matched = [regex]::Match($page, 'nginx-(\d+\.\d+\.\d+)\.zip')
        if (-not $matched.Success) { throw "Tidak bisa mendeteksi versi nginx." }
        $ver = $matched.Groups[1].Value
        Info "Versi ditemukan: nginx-$ver"

        $zipUrl = "https://nginx.org/download/nginx-$ver.zip"
        $zip    = Join-Path $env:TEMP "nginx-$ver.zip"
        $dir    = Join-Path $env:TEMP "nginx-extract"

        Info "Mengunduh nginx-$ver.zip ..."
        Invoke-WebRequest -Uri $zipUrl -OutFile $zip -UseBasicParsing
        Info "Mengekstrak..."
        if (Test-Path $dir) { Remove-Item $dir -Recurse -Force }
        Expand-Archive -Path $zip -DestinationPath $dir -Force

        # Pindah hasil ekstrak ke C:\nginx
        $extracted = Get-ChildItem $dir -Directory | Where-Object { $_.Name -like "nginx-*" } | Select-Object -First 1
        if (-not $extracted) { throw "Folder nginx tidak ditemukan setelah ekstrak." }
        if (Test-Path "C:\nginx") { Remove-Item "C:\nginx" -Recurse -Force }
        Move-Item $extracted.FullName "C:\nginx" -Force
        Ok "Nginx $ver diinstall ke C:\nginx\"

        # Tambahkan C:\nginx ke PATH permanen (sistem) dan sesi ini
        $machinePath = [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
        if ($machinePath -notlike "*C:\nginx*") {
            [System.Environment]::SetEnvironmentVariable("PATH", "C:\nginx;$machinePath", "Machine")
            Ok "C:\nginx ditambahkan ke PATH sistem"
        }
        $env:PATH = "C:\nginx;" + $env:PATH

        # Buat folder yang dibutuhkan nginx
        foreach ($folder in @("C:\nginx\conf\sites", "C:\nginx\logs", "C:\nginx\temp")) {
            New-Item -ItemType Directory -Force -Path $folder | Out-Null
        }

        return "C:\nginx\nginx.exe"
    } catch {
        Fail "Gagal mengunduh Nginx: $_`n  Download manual: https://nginx.org/en/download.html`n  Ekstrak ke C:\nginx\"
    }
}

# ==============================================================
# Helper: Stop dan hapus service NSSM (jika ada)
# ==============================================================
function Remove-NssmService {
    param([string]$SvcName, [string]$NssmExe)

    $svc = Get-Service -Name $SvcName -ErrorAction SilentlyContinue
    if (-not $svc) { Warn "Service $SvcName tidak ditemukan, dilewati."; return }

    # Hentikan service jika sedang berjalan
    if ($svc.Status -ne 'Stopped') {
        Info "Stop service: $SvcName (status: $($svc.Status))..."
        & $NssmExe stop $SvcName confirm 2>$null | Out-Null

        # Tunggu sampai benar-benar stopped (maks 10 detik)
        $waited = 0
        while ($waited -lt 10) {
            Start-Sleep -Seconds 1; $waited++
            $s = Get-Service -Name $SvcName -ErrorAction SilentlyContinue
            if (-not $s -or $s.Status -eq 'Stopped') { break }
        }
    }

    & $NssmExe remove $SvcName confirm 2>$null | Out-Null
    Ok "Service $SvcName dihapus"
}

# ==============================================================
# Helper: Matikan proses bun/stokasir yang berjalan manual
# ==============================================================
function Stop-StrayStokasir {
    Info "Memeriksa proses bun stokasir yang berjalan manual..."
    $killed = 0

    Get-WmiObject Win32_Process -ErrorAction SilentlyContinue |
        Where-Object {
            $_.Name -like "*bun*" -and
            $_.CommandLine -like "*stokasir*" -and
            ($_.CommandLine -like "*server.js*" -or $_.CommandLine -like "*index.js*")
        } |
        ForEach-Object {
            Warn "Matikan proses stray: PID $($_.ProcessId) -> $($_.CommandLine)"
            Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
            $killed++
        }

    if ($killed -gt 0) {
        Start-Sleep -Seconds 1
        Ok "$killed proses stray dihentikan"
    } else {
        Ok "Tidak ada proses bun stokasir yang berjalan manual"
    }
}

# ==============================================================
# Helper: Bebaskan port tertentu (matikan proses yang memakainya)
# ==============================================================
function Stop-ProcessOnPort {
    param([int]$Port)
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if (-not $conn) { return }

        $pid_  = $conn.OwningProcess | Select-Object -First 1
        $proc  = Get-Process -Id $pid_ -ErrorAction SilentlyContinue
        $name  = if ($proc) { $proc.ProcessName } else { "unknown" }

        Warn "Port $Port dipakai PID $pid_ ($name) => dimatikan"
        Stop-Process -Id $pid_ -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
        Ok "Port $Port bebas"
    } catch { <# port sudah bebas, tidak perlu tindakan #> }
}

# ==============================================================
# Helper: Tulis file nginx conf tanpa BOM
# ==============================================================
function Write-NoBom {
    param([string]$Path, [string]$Content)
    [IO.File]::WriteAllText($Path, $Content, [Text.UTF8Encoding]::new($false))
}

# ==============================================================
# Helper: Hapus BOM dari file (jika ada) dan kembalikan isinya
# ==============================================================
function Remove-BomFromFile {
    param([string]$Path)
    $raw = [IO.File]::ReadAllBytes($Path)
    if ($raw.Length -ge 3 -and $raw[0] -eq 0xEF -and $raw[1] -eq 0xBB -and $raw[2] -eq 0xBF) {
        $raw = $raw[3..($raw.Length - 1)]
        [IO.File]::WriteAllBytes($Path, $raw)
        Info "BOM dihapus dari: $(Split-Path -Leaf $Path)"
    }
    return [Text.Encoding]::UTF8.GetString($raw)
}

# ==============================================================
# Helper: Buat nginx.conf dengan blok HTTPS atau HTTP saja
# ==============================================================
function New-NginxSiteConf {
    param(
        [string]$Path,
        [string]$DataSlash,
        [string]$PortBe,
        [string]$PortFe,
        [bool]$UseHttps
    )

    if ($UseHttps) {
        $content = @"
server {
    listen 80;
    server_name _;

    # Endpoint khusus untuk download CA cert (install di HP karyawan)
    location = /rootCA.crt {
        alias $DataSlash/uploads/rootCA.crt;
        add_header Content-Type application/x-x509-ca-cert;
        add_header Content-Disposition 'attachment; filename="StokasirCA.crt"';
    }

    # Redirect semua traffic HTTP ke HTTPS
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
    gzip_vary on;
    gzip_types text/plain text/css text/javascript application/javascript application/json image/svg+xml;

    location = /rootCA.crt {
        alias $DataSlash/uploads/rootCA.crt;
        add_header Content-Type application/x-x509-ca-cert;
        add_header Content-Disposition 'attachment; filename="StokasirCA.crt"';
    }
    location /uploads/ {
        alias $DataSlash/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    location /api/ {
        proxy_pass         http://127.0.0.1:$PortBe/;
        proxy_http_version 1.1;
        proxy_set_header   Host `$host;
        proxy_set_header   X-Real-IP `$remote_addr;
        proxy_set_header   X-Forwarded-Proto https;
    }
    location / {
        proxy_pass         http://127.0.0.1:$PortFe;
        proxy_http_version 1.1;
        proxy_set_header   Host `$host;
        proxy_set_header   Upgrade `$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Accept-Encoding "";
    }
}
"@
    } else {
        $content = @"
server {
    listen 80;
    server_name _;

    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/javascript application/javascript application/json image/svg+xml;

    location /uploads/ {
        alias $DataSlash/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    location /api/ {
        proxy_pass         http://127.0.0.1:$PortBe/;
        proxy_http_version 1.1;
        proxy_set_header   Host `$host;
        proxy_set_header   X-Real-IP `$remote_addr;
    }
    location / {
        proxy_pass         http://127.0.0.1:$PortFe;
        proxy_http_version 1.1;
        proxy_set_header   Host `$host;
        proxy_set_header   Upgrade `$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Accept-Encoding "";
    }
}
"@
    }

    Write-NoBom -Path $Path -Content $content
}

# ==============================================================
# Pilih mode jika tidak diberikan via parameter
# ==============================================================
if (-not $Mode) {
    Write-Host "Pilih mode:"
    Write-Host "  1) install   => install & konfigurasi dari awal"
    Write-Host "  2) repair    => restart service (konfigurasi tetap)"
    Write-Host "  3) uninstall => hapus service & config (data opsional)"
    Write-Host ""
    $choice = Read-Host "Pilihan [1/2/3]"
    switch -Regex ($choice) {
        '^(1|install)$'   { $Mode = 'install' }
        '^(2|repair)$'    { $Mode = 'repair' }
        '^(3|uninstall)$' { $Mode = 'uninstall' }
        default           { Fail "Pilihan tidak valid." }
    }
}

# ==============================================================
# UNINSTALL
# ==============================================================
function Invoke-Uninstall {
    Header "Uninstall Stokasir"

    Warn "Mode ini akan menghapus service dan konfigurasi Stokasir."
    $confirm = Read-Host "Lanjutkan? [y/N]"
    if ($confirm -ne 'y') { Write-Host "Dibatalkan."; exit 0 }

    $nssm = Get-NssmPath

    # URUTAN PENTING: frontend dulu (bergantung pada backend), baru backend
    Remove-NssmService 'stokasir-frontend' $nssm
    Remove-NssmService 'stokasir-backend'  $nssm

    # Hapus nginx config dan reload jika nginx sedang berjalan
    $nginxConf = "C:\nginx\conf\sites\stokasir.conf"
    if (Test-Path $nginxConf) {
        Remove-Item $nginxConf -Force
        Ok "Nginx config dihapus"

        $ngExe = if (Test-Path "C:\nginx\nginx.exe") { "C:\nginx\nginx.exe" }
                 else { (Get-Command nginx -ErrorAction SilentlyContinue).Source }

        if ($ngExe -and (Get-Process nginx -ErrorAction SilentlyContinue)) {
            $prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
            & $ngExe -p "C:\nginx" -s reload 2>$null | Out-Null
            $ErrorActionPreference = $prev
            Ok "Nginx di-reload"
        } elseif ($ngExe) {
            Info "Nginx tidak sedang berjalan, tidak perlu reload"
        }
    }

    # Opsional: hapus folder install
    $delPath = Read-Host "  Path install dir yang ingin dihapus (kosongkan untuk skip)"
    if ($delPath -and (Test-Path $delPath)) {
        $delConfirm = Read-Host "  Hapus '$delPath'? [y/N]"
        if ($delConfirm -eq 'y') {
            Remove-Item $delPath -Recurse -Force
            Ok "Install dir dihapus: $delPath"
        }
    }

    Write-Host ""
    Write-Host "==============================================================================================" -ForegroundColor Green
    Write-Host "=        Stokasir berhasil diuninstall!        =" -ForegroundColor Green
    Write-Host "==============================================================================================" -ForegroundColor Green
    Write-Host ""
}

# ==============================================================
# REPAIR
# ==============================================================
function Invoke-Repair {
    Header "Repair / Restart Stokasir"

    $nssm = Get-NssmPath

    # Baca port dari .env (gunakan default jika tidak ada)
    $portBe = 3000; $portFe = 5173
    $envFile = "$env:USERPROFILE\stokasir\.env"
    if (Test-Path $envFile) {
        $portLine = Get-Content $envFile | Where-Object { $_ -match '^PORT=' } | Select-Object -First 1
        if ($portLine) { $portBe = [int]($portLine -replace '^PORT=', '') }
    }

    # Bersihkan proses dan port sebelum restart
    Stop-StrayStokasir
    Stop-ProcessOnPort $portBe
    Stop-ProcessOnPort $portFe

    $backendExists  = Get-Service -Name 'stokasir-backend'  -ErrorAction SilentlyContinue
    $frontendExists = Get-Service -Name 'stokasir-frontend' -ErrorAction SilentlyContinue

    if ($backendExists -and $frontendExists) {
        # Restart backend dulu, tunggu sebentar, baru frontend
        & $nssm restart stokasir-backend  | Out-Null
        Start-Sleep -Seconds 2
        & $nssm restart stokasir-frontend | Out-Null
        Ok "Service di-restart"
    } else {
        Warn "Service tidak ditemukan => jalankan mode install terlebih dahulu"
    }

    Write-Host ""
    Write-Host "==============================================================================================" -ForegroundColor Green
    Write-Host "=        Stokasir berhasil di-restart!         =" -ForegroundColor Green
    Write-Host "==============================================================================================" -ForegroundColor Green
    Write-Host ""
}

# ==============================================================
# INSTALL
# ==============================================================
function Invoke-Install {

    # ── 1 / 5  Cek Runtime ────────────────────────────────────
    Header "1 / 5  Cek Runtime"

    # Pastikan Bun tersedia (install otomatis jika belum ada)
    $bunCmd = Get-Command bun -ErrorAction SilentlyContinue
    if (-not $bunCmd) {
        Info "Bun tidak ditemukan => menginstall..."
        try {
            Invoke-RestMethod bun.sh/install.ps1 | Invoke-Expression
            $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" +
                        [System.Environment]::GetEnvironmentVariable("PATH","User")
            $bunCmd = Get-Command bun -ErrorAction SilentlyContinue
        } catch {
            Fail "Gagal install Bun. Install manual dari https://bun.sh"
        }
    }
    if (-not $bunCmd) { Fail "Bun tidak ditemukan setelah install. Tambahkan ke PATH lalu coba lagi." }
    $bunPath = $bunCmd.Source
    Ok "Bun: v$(bun --version) ($bunPath)"

    $nssm = Get-NssmPath
    Ok "NSSM: $nssm"

    # ── 2 / 5  Konfigurasi ────────────────────────────────────
    Header "2 / 5  Konfigurasi"
    Write-Host ""
    Write-Host "Isi konfigurasi berikut (Enter = pakai nilai default):"
    Write-Host ""

    $InstallDir = Read-Default "Folder install"  "$env:USERPROFILE\stokasir"
    $DataDir    = Read-Default "Folder data (database & uploads)" "$InstallDir\data"

    # Deteksi IP LAN otomatis
    $detectedIp = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -notlike '127.*' -and
            $_.IPAddress -notlike '169.254.*' -and
            $_.PrefixOrigin -ne 'WellKnown'
        } | Select-Object -First 1).IPAddress
    $defaultIp = if ($detectedIp) { $detectedIp } else { '192.168.1.x' }
    $ServerIP = Read-Default "IP server ini (untuk akses HP)" $defaultIp

    # Generate JWT secret secara acak jika tidak diisi
    $rng   = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    $bytes = New-Object byte[] 36
    $rng.GetBytes($bytes)
    $autoJwt   = [Convert]::ToBase64String($bytes)
    $inputJwt  = Read-Host "  JWT Secret (Enter = generate otomatis)"
    $JwtSecret = if ($inputJwt) { $inputJwt } else { $autoJwt }

    $PortBe = Read-Default "Port backend"  "3000"
    $PortFe = Read-Default "Port frontend" "5173"

    Write-Host ""
    Write-Host "  Nginx & HTTPS" -ForegroundColor White
    $v = Read-Host "  Setup nginx sebagai reverse proxy (port 80/443)? [Y/n]"
    $SetupNginx = ($v -ne 'n')

    $SetupHttps = $false
    if ($SetupNginx -and $HasCerts) {
        $v = Read-Host "  Gunakan sertifikat HTTPS dari prebuilt? [Y/n]"
        $SetupHttps = ($v -ne 'n')
    } elseif ($SetupNginx -and -not $HasCerts) {
        Warn "Prebuilt tidak menyertakan sertifikat => HTTPS tidak tersedia."
        Warn "Jalankan ulang prebuilt.sh tanpa --no-cert untuk mengaktifkan HTTPS."
    }

    # Tentukan URL publik sesuai setup
    if     ($SetupHttps) { $PublicUrl = "https://$ServerIP/api" }
    elseif ($SetupNginx) { $PublicUrl = "http://$ServerIP/api" }
    else                 { $PublicUrl = "http://${ServerIP}:$PortBe" }

    Write-Host ""
    Info "Ringkasan konfigurasi:"
    Write-Host "  Install dir  : $InstallDir"
    Write-Host "  Data dir     : $DataDir"
    Write-Host "  IP server    : $ServerIP"
    Write-Host "  Port backend : $PortBe"
    Write-Host "  Port frontend: $PortFe"
    Write-Host "  Nginx        : $(if ($SetupNginx) { 'ya' } else { 'tidak' })"
    Write-Host "  HTTPS        : $(if ($SetupHttps) { 'ya (dari prebuilt certs)' } else { 'tidak' })"
    Write-Host "  API URL      : $PublicUrl"
    Write-Host ""
    $v = Read-Host "Lanjutkan? [Y/n]"
    if ($v -eq 'n') { Write-Host "Dibatalkan."; exit 0 }

    # ── 3 / 5  Deploy Artifacts ───────────────────────────────
    Header "3 / 5  Deploy Artifacts"

    Info "Membuat direktori..."
    foreach ($dir in @(
        "$DataDir\uploads\produk",
        "$DataDir\uploads\invoice",
        "$DataDir\uploads\karyawan",
        "$DataDir\backup",
        "$DataDir\logs"
    )) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    Ok "Direktori siap"

    # Salin backend (binary atau bundle js, tergantung manifest)
    Info "Salin backend..."
    New-Item -ItemType Directory -Force -Path "$InstallDir\backend" | Out-Null
    $winBin = "$PrebuiltDir\bin\stokasir-win.exe"
    if ($ManifestMode -eq 'compile' -and (Test-Path $winBin)) {
        Copy-Item $winBin "$InstallDir\backend\stokasir.exe" -Force
        Ok "Binary backend disalin -> $InstallDir\backend\stokasir.exe"
        $BackendExe  = "$InstallDir\backend\stokasir.exe"
        $BackendArgs = $null
    } else {
        Copy-Item "$PrebuiltDir\app\backend\server.js" "$InstallDir\backend\server.js" -Force
        Ok "Bundle backend disalin -> $InstallDir\backend\server.js"
        $BackendExe  = $bunPath
        $BackendArgs = "$InstallDir\backend\server.js"
    }

    # Salin migrations
    Info "Salin migrations..."
    $migrDst = "$InstallDir\backend\migrations"
    if (Test-Path $migrDst) { Remove-Item $migrDst -Recurse -Force }
    Copy-Item "$PrebuiltDir\app\backend\migrations" $migrDst -Recurse -Force
    Ok "Migrations disalin"

    # Salin frontend
    Info "Salin frontend..."
    New-Item -ItemType Directory -Force -Path "$InstallDir\frontend" | Out-Null
    Copy-Item "$PrebuiltDir\app\frontend\*" "$InstallDir\frontend\" -Recurse -Force
    Ok "Frontend disalin -> $InstallDir\frontend\"

    # Salin sertifikat HTTPS jika dipilih
    if ($SetupHttps) {
        Info "Salin sertifikat ke C:\nginx\certs\..."
        New-Item -ItemType Directory -Force -Path "C:\nginx\certs" | Out-Null
        Copy-Item "$PrebuiltDir\certs\cert.pem" "C:\nginx\certs\cert.pem" -Force
        Copy-Item "$PrebuiltDir\certs\key.pem"  "C:\nginx\certs\key.pem"  -Force
        Ok "cert.pem + key.pem disalin ke C:\nginx\certs\"
        Copy-Item "$PrebuiltDir\certs\rootCA.pem" "$DataDir\uploads\rootCA.crt" -Force
        Ok "rootCA.crt disalin ke $DataDir\uploads\"
    }

    # Tulis file .env (gunakan forward slash agar bun membacanya dengan benar)
    Info "Menulis .env..."
    $DataFwd    = $DataDir.Replace('\','/')
    $InstallFwd = $InstallDir.Replace('\','/')
    @"
DATABASE_URL=$DataFwd/data.db
UPLOAD_DIR=$DataFwd/uploads
MIGRATIONS_DIR=$InstallFwd/backend/migrations
PORT=$PortBe
NODE_ENV=production
JWT_SECRET=$JwtSecret
"@ | Set-Content "$InstallDir\.env" -Encoding UTF8
    Ok ".env ditulis"

    # ── 4 / 5  Setup Service (NSSM) ───────────────────────────
    Header "4 / 5  Setup Service (NSSM)"

    # Hapus service lama jika ada
    # URUTAN PENTING: frontend dulu (bergantung pada backend), baru backend
    Remove-NssmService 'stokasir-frontend' $nssm
    Remove-NssmService 'stokasir-backend'  $nssm

    # Daftarkan service backend
    Info "Install service backend..."
    & $nssm install stokasir-backend $BackendExe | Out-Null
    if ($BackendArgs) { & $nssm set stokasir-backend AppParameters $BackendArgs | Out-Null }
    & $nssm set stokasir-backend AppDirectory    "$InstallDir\backend"            | Out-Null
    & $nssm set stokasir-backend AppEnvironmentExtra @(
        "DATABASE_URL=$DataFwd/data.db",
        "UPLOAD_DIR=$DataFwd/uploads",
        "MIGRATIONS_DIR=$InstallFwd/backend/migrations",
        "PORT=$PortBe",
        "NODE_ENV=production",
        "JWT_SECRET=$JwtSecret"
    ) | Out-Null
    & $nssm set stokasir-backend AppStdout        "$DataDir\logs\backend.log"       | Out-Null
    & $nssm set stokasir-backend AppStderr        "$DataDir\logs\backend.error.log" | Out-Null
    & $nssm set stokasir-backend AppRotateFiles   1                                 | Out-Null
    & $nssm set stokasir-backend AppRotateOnline  1                                 | Out-Null
    & $nssm set stokasir-backend Start            SERVICE_AUTO_START                | Out-Null
    Ok "stokasir-backend service terdaftar"

    # Daftarkan service frontend
    Info "Install service frontend..."
    & $nssm install stokasir-frontend $bunPath | Out-Null
    & $nssm set stokasir-frontend AppParameters     "$InstallDir\frontend\index.js"  | Out-Null
    & $nssm set stokasir-frontend AppDirectory      "$InstallDir\frontend"           | Out-Null
    & $nssm set stokasir-frontend AppEnvironmentExtra @(
        "PORT=$PortFe",
        "HOST=0.0.0.0",
        "NODE_ENV=production",
        "PUBLIC_API_URL=$PublicUrl"
    ) | Out-Null
    & $nssm set stokasir-frontend AppStdout         "$DataDir\logs\frontend.log"       | Out-Null
    & $nssm set stokasir-frontend AppStderr         "$DataDir\logs\frontend.error.log" | Out-Null
    & $nssm set stokasir-frontend AppRotateFiles    1                                  | Out-Null
    & $nssm set stokasir-frontend AppRotateOnline   1                                  | Out-Null
    & $nssm set stokasir-frontend Start             SERVICE_AUTO_START                 | Out-Null
    & $nssm set stokasir-frontend DependOnService   stokasir-backend                   | Out-Null
    Ok "stokasir-frontend service terdaftar"

    # ── 5 / 5  Nginx & Jalankan ───────────────────────────────
    Header "5 / 5  Nginx & Jalankan"

    if ($SetupNginx) {
        $ngExe = Get-NginxPath
        if (-not $ngExe) {
            Warn "Nginx tidak berhasil diinstall => akses langsung via port $PortFe"
            $SetupNginx = $false
        } else {
            Ok "Nginx: $ngExe"
        }
    }

    if ($SetupNginx) {
        # Tentukan folder konfigurasi nginx
        $ngRoot    = Split-Path -Parent (Split-Path -Parent $ngExe)
        $ngConfDir = if (Test-Path "$ngRoot\conf") { "$ngRoot\conf" } else { "C:\nginx\conf" }
        $ngSites   = "$ngConfDir\sites"
        New-Item -ItemType Directory -Force -Path $ngSites | Out-Null

        # Tambahkan baris "include sites/*.conf;" ke nginx.conf jika belum ada
        $ngMain = "$ngConfDir\nginx.conf"
        if (Test-Path $ngMain) {
            $content = Remove-BomFromFile -Path $ngMain
            if ($content -notmatch 'include\s+sites/') {
                $content = $content -replace '(http\s*\{)', "`$1`n    include sites/*.conf;"
                Write-NoBom -Path $ngMain -Content $content
                Ok "nginx.conf: ditambah include sites/*.conf"
            }
        }

        # Tulis konfigurasi virtual host Stokasir
        $DataSlash = $DataDir.Replace('\','/')
        New-NginxSiteConf -Path "$ngSites\stokasir.conf" `
                          -DataSlash $DataSlash -PortBe $PortBe -PortFe $PortFe `
                          -UseHttps $SetupHttps

        # Pastikan folder logs ada agar nginx tidak error saat start
        New-Item -ItemType Directory -Force -Path "C:\nginx\logs" | Out-Null

        # Hapus BOM dari semua .conf di C:\nginx (jaga-jaga file lama bermasalah)
        Get-ChildItem "C:\nginx\conf" -Recurse -Filter "*.conf" -ErrorAction SilentlyContinue |
            ForEach-Object { Remove-BomFromFile -Path $_.FullName | Out-Null }

        # Test konfigurasi nginx lalu reload/start
        # (nginx -t menulis ke stderr bahkan saat sukses, nonaktifkan Stop sementara)
        $prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
        $ngTest = & $ngExe -p "C:\nginx" -t 2>&1
        $ngExit = $LASTEXITCODE
        $ErrorActionPreference = $prev

        if ($ngExit -eq 0) {
            if (Get-Process nginx -ErrorAction SilentlyContinue) {
                $ErrorActionPreference = 'Continue'
                & $ngExe -p "C:\nginx" -s reload 2>$null | Out-Null
                $ErrorActionPreference = $prev
                Ok "Nginx di-reload"
            } else {
                Start-Process -FilePath $ngExe -ArgumentList '-p','C:\nginx' `
                              -WorkingDirectory 'C:\nginx' -WindowStyle Hidden
                Start-Sleep -Seconds 1
                if (Get-Process nginx -ErrorAction SilentlyContinue) { Ok "Nginx berjalan" }
                else { Warn "Nginx mungkin gagal start. Cek: C:\nginx\logs\error.log" }
            }
        } else {
            Warn "Konfigurasi nginx ada masalah:`n$ngTest"
            Warn "Cek manual: nginx -p C:\nginx -t"
        }
    }

    # Bersihkan proses liar lalu jalankan service
    Stop-StrayStokasir
    Stop-ProcessOnPort ([int]$PortBe)
    Stop-ProcessOnPort ([int]$PortFe)

    Info "Menjalankan service..."
    & $nssm start stokasir-backend  | Out-Null
    Start-Sleep -Seconds 2
    & $nssm start stokasir-frontend | Out-Null
    Ok "Stokasir berjalan => auto-start aktif saat boot"

    # ── Ringkasan ──────────────────────────────────────────────
    Write-Host ""
    Write-Host "==============================================================================================" -ForegroundColor Green
    Write-Host "=        Stokasir berhasil diinstall!          =" -ForegroundColor Green
    Write-Host "==============================================================================================" -ForegroundColor Green
    Write-Host ""

    if     ($SetupHttps) { Write-Host "  Akses : https://$ServerIP/" -ForegroundColor Cyan
                           Write-Host "  (HTTP redirect otomatis ke HTTPS)" }
    elseif ($SetupNginx) { Write-Host "  Akses : http://$ServerIP/"  -ForegroundColor Cyan }
    else                 { Write-Host "  Akses : http://${ServerIP}:$PortFe" -ForegroundColor Cyan }
    Write-Host "  Health: http://localhost:$PortBe/health" -ForegroundColor Cyan
    Write-Host ""

    if ($SetupHttps) {
        Write-Host "  Install CA di HP karyawan (1x saja):" -ForegroundColor White
        Write-Host "  1. Buka browser HP -> http://$ServerIP/rootCA.crt" -ForegroundColor Cyan
        Write-Host "     Android : Settings -> Security -> Install certificate -> CA Certificate"
        Write-Host "     iPhone  : Settings -> General -> VPN & Device Management -> install"
        Write-Host "               lalu General -> About -> Certificate Trust Settings -> aktifkan"
        Write-Host ""
    }

    Write-Host "  Data    : $DataDir" -ForegroundColor Cyan
    Write-Host "  Log     : $DataDir\logs\" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Perintah service:" -ForegroundColor White
    Write-Host "    nssm status stokasir-backend"                                         -ForegroundColor Yellow
    Write-Host "    nssm status stokasir-frontend"                                        -ForegroundColor Yellow
    Write-Host "    Get-Content $DataDir\logs\backend.log -Tail 50 -Wait"                -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Repair   : powershell -ExecutionPolicy Bypass -File scripts\setup-prebuilt.ps1 repair"    -ForegroundColor Cyan
    Write-Host "  Uninstall: powershell -ExecutionPolicy Bypass -File scripts\setup-prebuilt.ps1 uninstall" -ForegroundColor Cyan
    Write-Host ""
}

# ==============================================================
# Route ke fungsi yang sesuai
# ==============================================================
switch ($Mode) {
    'install'   { Invoke-Install }
    'repair'    { Invoke-Repair }
    'uninstall' { Invoke-Uninstall }
    default     { Fail "Mode tidak valid: '$Mode'. Gunakan: install | repair | uninstall" }
}
