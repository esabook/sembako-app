# setup.ps1 — Installer Stokasir untuk Windows
# Jalankan dari folder root project:
#   powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
#
# Butuh: PowerShell 5+ (sudah ada di Windows 10/11)

$ErrorActionPreference = "Stop"

# ── Warna output ────────────────────────────────────────────────────────────
function Write-Step($msg)  { Write-Host "`n══ $msg ══" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Info($msg)  { Write-Host "  → $msg" -ForegroundColor Cyan }
function Write-Warn($msg)  { Write-Host "  ⚠ $msg" -ForegroundColor Yellow }
function Write-Err($msg)   { Write-Host "  ✗ $msg" -ForegroundColor Red; exit 1 }

$SCRIPT_DIR = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      Stokasir — Setup Installer      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "  Platform : Windows"
Write-Host "  Folder   : $SCRIPT_DIR"
Write-Host ""

# ══════════════════════════════════════════════════════════════════════════════
Write-Step "1 / 5  Cek & Install Bun"
# ══════════════════════════════════════════════════════════════════════════════

$bunExists = $null
try { $bunExists = Get-Command bun -ErrorAction Stop } catch {}

if ($bunExists) {
    $bunVer = & bun --version
    Write-Ok "Bun sudah terinstall: v$bunVer"
} else {
    Write-Info "Menginstall Bun..."
    try {
        powershell -c "irm bun.sh/install.ps1 | iex"
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        Write-Ok "Bun berhasil diinstall. Mungkin perlu restart terminal jika error."
    } catch {
        Write-Err "Gagal install Bun otomatis. Install manual dari: https://bun.sh"
    }
}

$BUN_BIN = (Get-Command bun).Source

# ══════════════════════════════════════════════════════════════════════════════
Write-Step "2 / 5  Konfigurasi"
# ══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "  Isi konfigurasi berikut (Enter = pakai nilai default):" -ForegroundColor White
Write-Host ""

$defaultData = "C:\stokasir-data"
$inputData = Read-Host "  Folder data (upload & database) [$defaultData]"
$DATA_DIR = if ($inputData) { $inputData } else { $defaultData }

$detectedIP = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.' } |
    Select-Object -First 1).IPAddress
$defaultIP = if ($detectedIP) { $detectedIP } else { "192.168.1.x" }
$inputIP = Read-Host "  IP server ini (untuk akses HP) [$defaultIP]"
$SERVER_IP = if ($inputIP) { $inputIP } else { $defaultIP }

$inputJWT = Read-Host "  JWT Secret (Enter = generate otomatis)"
if ($inputJWT) {
    $JWT_SECRET = $inputJWT
} else {
    $bytes = New-Object Byte[] 36
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $JWT_SECRET = [Convert]::ToBase64String($bytes)
}

$inputBackend = Read-Host "  Port backend  [3000]"
$PORT_BACKEND = if ($inputBackend) { $inputBackend } else { "3000" }

$inputFrontend = Read-Host "  Port frontend [5173]"
$PORT_FRONTEND = if ($inputFrontend) { $inputFrontend } else { "5173" }

Write-Host ""
Write-Info "Konfigurasi:"
Write-Host "    Data dir     : $DATA_DIR"
Write-Host "    IP server    : $SERVER_IP"
Write-Host "    Port backend : $PORT_BACKEND"
Write-Host "    Port frontend: $PORT_FRONTEND"
Write-Host ""
$confirm = Read-Host "  Lanjutkan? [Y/n]"
if ($confirm -eq "n" -or $confirm -eq "N") {
    Write-Host "Dibatalkan." ; exit 0
}

# ══════════════════════════════════════════════════════════════════════════════
Write-Step "3 / 5  Siapkan Folder & Install Dependencies"
# ══════════════════════════════════════════════════════════════════════════════

Write-Info "Membuat folder data..."
New-Item -ItemType Directory -Force -Path "$DATA_DIR\uploads\produk"   | Out-Null
New-Item -ItemType Directory -Force -Path "$DATA_DIR\uploads\invoice"  | Out-Null
New-Item -ItemType Directory -Force -Path "$DATA_DIR\uploads\karyawan" | Out-Null
New-Item -ItemType Directory -Force -Path "$DATA_DIR\backup"           | Out-Null
New-Item -ItemType Directory -Force -Path "$DATA_DIR\logs"             | Out-Null
Write-Ok "Folder data siap: $DATA_DIR"

Write-Info "Install backend dependencies..."
Set-Location "$SCRIPT_DIR\backend"
& bun install --production
Write-Ok "Backend dependencies selesai"

Write-Info "Build frontend..."
Set-Location "$SCRIPT_DIR\frontend"
& bun install --production
& bun run build
Write-Ok "Frontend build selesai"

# ══════════════════════════════════════════════════════════════════════════════
Write-Step "4 / 5  Generate Config & Buka Firewall"
# ══════════════════════════════════════════════════════════════════════════════

Write-Info "Menulis backend\.env..."
$DB_PATH = $DATA_DIR.Replace("\", "/")
@"
DATABASE_URL=file:$DB_PATH/data.db
UPLOAD_DIR=$DATA_DIR\uploads
PORT=$PORT_BACKEND
NODE_ENV=production
JWT_SECRET=$JWT_SECRET
"@ | Set-Content -Path "$SCRIPT_DIR\backend\.env" -Encoding UTF8
Write-Ok "backend\.env ditulis"

# Wrapper script untuk frontend (bawa env vars ke proses bun)
$WRAPPER = "$SCRIPT_DIR\start-frontend.ps1"
@"
`$env:PORT           = '$PORT_FRONTEND'
`$env:HOST           = '0.0.0.0'
`$env:NODE_ENV       = 'production'
`$env:PUBLIC_API_URL = 'http://$SERVER_IP/api'
Set-Location '$SCRIPT_DIR\frontend'
& '$BUN_BIN' build\index.js
"@ | Set-Content -Path $WRAPPER -Encoding UTF8
Write-Ok "start-frontend.ps1 ditulis"

Write-Info "Membuka port di Windows Firewall..."
$rules = @(
    @{ Name="Stokasir-$PORT_BACKEND";  Port=$PORT_BACKEND },
    @{ Name="Stokasir-$PORT_FRONTEND"; Port=$PORT_FRONTEND },
    @{ Name="Stokasir-80";             Port="80" }
)
foreach ($r in $rules) {
    try {
        netsh advfirewall firewall add rule name=$r.Name dir=in action=allow protocol=TCP localport=$r.Port | Out-Null
        Write-Ok "Port $($r.Port) dibuka"
    } catch {
        Write-Warn "Gagal buka port $($r.Port) — coba manual di Windows Defender Firewall"
    }
}

# ══════════════════════════════════════════════════════════════════════════════
Write-Step "5 / 5  Daftarkan ke Task Scheduler & Jalankan"
# ══════════════════════════════════════════════════════════════════════════════

$taskSettings = New-ScheduledTaskSettingsSet `
    -RestartCount 5 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Days 365) `
    -StartWhenAvailable

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

# Backend — Bun membaca .env otomatis dari WorkingDirectory
Write-Info "Mendaftarkan task 'Stokasir Backend'..."
$actionBack = New-ScheduledTaskAction `
    -Execute $BUN_BIN `
    -Argument "run src\index.ts" `
    -WorkingDirectory "$SCRIPT_DIR\backend"
try { Unregister-ScheduledTask -TaskName "Stokasir Backend"  -Confirm:$false 2>$null } catch {}
Register-ScheduledTask -TaskName "Stokasir Backend" `
    -Action $actionBack -Trigger $trigger -Settings $taskSettings `
    -RunLevel Highest -Force | Out-Null
Write-Ok "Task 'Stokasir Backend' didaftarkan"

# Frontend — env vars via wrapper PowerShell script
Write-Info "Mendaftarkan task 'Stokasir Frontend'..."
$actionFront = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -NonInteractive -File `"$WRAPPER`""
try { Unregister-ScheduledTask -TaskName "Stokasir Frontend" -Confirm:$false 2>$null } catch {}
Register-ScheduledTask -TaskName "Stokasir Frontend" `
    -Action $actionFront -Trigger $trigger -Settings $taskSettings `
    -RunLevel Highest -Force | Out-Null
Write-Ok "Task 'Stokasir Frontend' didaftarkan"

Write-Info "Menjalankan tasks sekarang..."
try { Start-ScheduledTask -TaskName "Stokasir Backend"  } catch { Write-Warn "Jalankan manual: Start-ScheduledTask 'Stokasir Backend'" }
Start-Sleep -Seconds 2
try { Start-ScheduledTask -TaskName "Stokasir Frontend" } catch { Write-Warn "Jalankan manual: Start-ScheduledTask 'Stokasir Frontend'" }

# ── Ringkasan ────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║        Stokasir berhasil diinstall!          ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Akses dari browser  : http://${SERVER_IP}:$PORT_FRONTEND" -ForegroundColor Cyan
Write-Host "  (via Nginx port 80) : http://$SERVER_IP/  ← jika Nginx sudah setup" -ForegroundColor Cyan
Write-Host "  API health check    : http://localhost:$PORT_BACKEND/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Perintah Task Scheduler:" -ForegroundColor White
Write-Host "    Get-ScheduledTask 'Stokasir*'               — lihat status" -ForegroundColor Yellow
Write-Host "    Start-ScheduledTask 'Stokasir Backend'      — jalankan backend" -ForegroundColor Yellow
Write-Host "    Stop-ScheduledTask  'Stokasir Backend'      — stop backend" -ForegroundColor Yellow
Write-Host "    Start-ScheduledTask 'Stokasir Frontend'     — jalankan frontend" -ForegroundColor Yellow
Write-Host "    Stop-ScheduledTask  'Stokasir Frontend'     — stop frontend" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Data tersimpan di: $DATA_DIR" -ForegroundColor Cyan
Write-Host ""
