# install-windows.ps1 — Daftarkan printer-agent.exe sebagai Windows Service
# Jalankan sebagai Administrator:  .\install-windows.ps1 -Device COM3 -Width 42
param(
    [string]$Device = "COM3",
    [int]$Width     = 42,
    [int]$Port      = 9999
)

$bin    = "$PSScriptRoot\printer-agent.exe"
$cfgDir = "$env:ProgramData\Stokasir"
$cfg    = "$cfgDir\printer-agent.yaml"

if (-not (Test-Path $bin)) {
    Write-Error "printer-agent.exe tidak ditemukan di $PSScriptRoot"
    exit 1
}

# Buat direktori config
New-Item -ItemType Directory -Force -Path $cfgDir | Out-Null

# Tulis config
@"
server:
  host: "127.0.0.1"
  port: $Port

printer:
  type: "serial"
  device: "$Device"
  width: $Width
"@ | Set-Content $cfg

# Salin binary ke Program Files
$dest = "$env:ProgramFiles\Stokasir\printer-agent.exe"
New-Item -ItemType Directory -Force -Path "$env:ProgramFiles\Stokasir" | Out-Null
Copy-Item $bin $dest -Force

# Daftarkan sebagai Windows Service
sc.exe create StokasirPrinter `
    binPath= "`"$dest`" --config `"$cfg`"" `
    start= auto `
    DisplayName= "Stokasir Printer Agent"
sc.exe description StokasirPrinter "ESC/POS bridge untuk aplikasi kasir Stokasir"
sc.exe start StokasirPrinter

Write-Host "OK — Service StokasirPrinter berjalan di port $Port"
Write-Host "Config: $cfg"
