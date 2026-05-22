@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════════════╗
echo ║      Stokasir — Memulai Installer        ║
echo ╚══════════════════════════════════════════╝
echo.

where bun >nul 2>&1
if %errorlevel% neq 0 (
    echo  Bun belum terinstall.
    echo  Download dari: https://bun.sh
    echo  Atau jalankan di PowerShell:
    echo    powershell -c "irm bun.sh/install.ps1 ^| iex"
    echo.
    pause
    exit /b 1
)

echo  Browser akan terbuka otomatis...
echo  Tekan Ctrl+C untuk menghentikan server installer.
echo.

start "" bun instalasi.ts
timeout /t 2 /nobreak >nul
start http://localhost:7777
