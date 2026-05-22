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
Write-Step "1 / 6  Cek & Install Bun"
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
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        Write-Ok "Bun berhasil diinstall. Mungkin perlu restart terminal jika error."
    } catch {
        Write-Err "Gagal install Bun otomatis. Install manual dari: https://bun.sh"
    }
}

# ══════════════════════════════════════════════════════════════════════════════
Write-Step "2 / 6  Cek Node.js & PM2"
# ══════════════════════════════════════════════════════════════════════════════

$nodeExists = $null
try { $nodeExists = Get-Command node -ErrorAction Stop } catch {}

if (-not $nodeExists) {
    Write-Warn "Node.js tidak ditemukan."
    Write-Warn "Download dan install dari: https://nodejs.org (pilih LTS)"
    Write-Warn "Setelah install, restart PowerShell dan jalankan setup ini lagi."
    Write-Err "Node.js diperlukan untuk PM2 (process manager)."
}
$nodeVer = & node --version
Write-Ok "Node.js: $nodeVer"

$pm2Exists = $null
try { $pm2Exists = Get-Command pm2 -ErrorAction Stop } catch {}

if (-not $pm2Exists) {
    Write-Info "Menginstall PM2 dan PM2 Windows Startup..."
    & npm install -g pm2 pm2-windows-startup
    & pm2-windows-startup install
    Write-Ok "PM2 terinstall"
} else {
    $pm2Ver = & pm2 --version
    Write-Ok "PM2 sudah terinstall: v$pm2Ver"
}

# ══════════════════════════════════════════════════════════════════════════════
Write-Step "3 / 6  Konfigurasi"
# ══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "  Isi konfigurasi berikut (Enter = pakai nilai default):" -ForegroundColor White
Write-Host ""

$defaultData = "C:\stokasir-data"
$inputData = Read-Host "  Folder data (upload & database) [$defaultData]"
$DATA_DIR = if ($inputData) { $inputData } else { $defaultData }

# Deteksi IP lokal
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
Write-Step "4 / 6  Siapkan Folder & Install Dependencies"
# ══════════════════════════════════════════════════════════════════════════════

Write-Info "Membuat folder data..."
New-Item -ItemType Directory -Force -Path "$DATA_DIR\uploads\produk"   | Out-Null
New-Item -ItemType Directory -Force -Path "$DATA_DIR\uploads\invoice"  | Out-Null
New-Item -ItemType Directory -Force -Path "$DATA_DIR\uploads\karyawan" | Out-Null
New-Item -ItemType Directory -Force -Path "$DATA_DIR\backup"           | Out-Null
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
Write-Step "5 / 6  Generate Config Files"
# ══════════════════════════════════════════════════════════════════════════════

Write-Info "Menulis backend\.env..."
# Path Windows untuk SQLite harus pakai forward slash
$DB_PATH = $DATA_DIR.Replace("\", "/")
@"
DATABASE_URL=file:$DB_PATH/data.db
UPLOAD_DIR=$DATA_DIR\uploads
PORT=$PORT_BACKEND
NODE_ENV=production
JWT_SECRET=$JWT_SECRET
"@ | Set-Content -Path "$SCRIPT_DIR\backend\.env" -Encoding UTF8
Write-Ok "backend\.env ditulis"

Write-Info "Menulis ecosystem.config.js..."
$backendCwd  = $SCRIPT_DIR.Replace("\", "\\") + "\\backend"
$frontendCwd = $SCRIPT_DIR.Replace("\", "\\") + "\\frontend"
$dbPath      = $DATA_DIR.Replace("\", "/")
@"
module.exports = { apps: [
  {
    name: 'stokasir-backend',
    script: 'src/index.ts',
    interpreter: 'bun',
    cwd: '$backendCwd',
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
      PORT: '$PORT_BACKEND',
      DATABASE_URL: 'file:$dbPath/data.db',
      UPLOAD_DIR: '$DATA_DIR\uploads',
      JWT_SECRET: '$JWT_SECRET'
    }
  },
  {
    name: 'stokasir-frontend',
    script: 'build/index.js',
    interpreter: 'bun',
    cwd: '$frontendCwd',
    max_memory_restart: '150M',
    env: {
      NODE_ENV: 'production',
      PORT: '$PORT_FRONTEND',
      HOST: '0.0.0.0',
      PUBLIC_API_URL: 'http://$SERVER_IP/api'
    }
  }
]}
"@ | Set-Content -Path "$SCRIPT_DIR\ecosystem.config.js" -Encoding UTF8
Write-Ok "ecosystem.config.js ditulis"

# ══════════════════════════════════════════════════════════════════════════════
Write-Step "6 / 6  Buka Firewall & Jalankan Stokasir"
# ══════════════════════════════════════════════════════════════════════════════

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

Set-Location $SCRIPT_DIR

Write-Info "Stop proses lama (jika ada)..."
& pm2 delete stokasir-backend stokasir-frontend 2>$null

Write-Info "Memulai proses dengan PM2..."
& pm2 start ecosystem.config.js
& pm2 save

Write-Info "Mengatur autostart saat Windows boot..."
& pm2-windows-startup install 2>$null

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
Write-Host "  Perintah PM2:"
Write-Host "    pm2 status              — lihat status proses" -ForegroundColor Yellow
Write-Host "    pm2 logs                — lihat log" -ForegroundColor Yellow
Write-Host "    pm2 restart all         — restart semua" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Data tersimpan di: $DATA_DIR" -ForegroundColor Cyan
Write-Host ""
