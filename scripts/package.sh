#!/usr/bin/env bash
# ============================================================
# scripts/package.sh — Buat paket distribusi XAMPP-style
#
# Usage:
#   ./scripts/package.sh              # package Windows x64
#   ./scripts/package.sh --linux      # package Linux x64
#   ./scripts/package.sh --pi         # package Raspberry Pi ARM64
#   ./scripts/package.sh --all        # semua platform
#
# Output: scripts/release/stokasir-{platform}.zip
# ============================================================

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
info()   { echo -e "${CYAN}  >> $*${NC}"; }
ok()     { echo -e "${GREEN}  OK $*${NC}"; }
header() { echo -e "\n${CYAN}${BOLD}== $* ==${NC}"; }
warn()   { echo -e "${YELLOW}  !! $*${NC}"; }

# ── Parse args ───────────────────────────────────────────────
TARGETS=("windows")
for arg in "$@"; do
    case $arg in
        --linux) TARGETS=("linux") ;;
        --pi)    TARGETS=("pi") ;;
        --mac)   TARGETS=("mac") ;;
        --all)   TARGETS=("windows" "linux" "pi") ;;
    esac
done

BUN_VERSION=$(bun --version)
RELEASE_DIR="$ROOT/scripts/release"
mkdir -p "$RELEASE_DIR"

START_TIME=$SECONDS

# ════════════════════════════════════════════════════════════
header "1 / 3  Build Frontend + Backend"
# ════════════════════════════════════════════════════════════
bash "$ROOT/scripts/build.sh"

# ════════════════════════════════════════════════════════════
header "2 / 3  Download Bun runtime"
# ════════════════════════════════════════════════════════════
BUN_CACHE="$ROOT/scripts/.bun-cache"
mkdir -p "$BUN_CACHE"

download_bun() {
    local platform="$1"   # windows | linux | pi
    local bun_file="$BUN_CACHE/bun-$platform"
    [ -f "${bun_file}.exe" ] && { ok "Bun $platform sudah di cache"; return; }
    [ -f "$bun_file" ] && { ok "Bun $platform sudah di cache"; return; }

    local zip_name url
    case "$platform" in
        windows) zip_name="bun-windows-x64";     url="https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/${zip_name}.zip" ;;
        linux)   zip_name="bun-linux-x64";       url="https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/${zip_name}.zip" ;;
        pi)      zip_name="bun-linux-aarch64";   url="https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/${zip_name}.zip" ;;
    esac

    info "Download Bun v${BUN_VERSION} untuk $platform..."
    local tmp_zip="$BUN_CACHE/${zip_name}.zip"
    curl -fsSL "$url" -o "$tmp_zip"
    unzip -q -o "$tmp_zip" -d "$BUN_CACHE/tmp-$platform"

    if [ "$platform" = "windows" ]; then
        cp "$BUN_CACHE/tmp-$platform/${zip_name}/bun.exe" "${bun_file}.exe"
    else
        cp "$BUN_CACHE/tmp-$platform/${zip_name}/bun" "$bun_file"
        chmod +x "$bun_file"
    fi

    rm -rf "$tmp_zip" "$BUN_CACHE/tmp-$platform"
    ok "Bun $platform → $(du -sh ${bun_file}* | cut -f1)"
}

for target in "${TARGETS[@]}"; do
    download_bun "$target"
done

# ════════════════════════════════════════════════════════════
header "3 / 3  Buat paket distribusi"
# ════════════════════════════════════════════════════════════

JWT_SECRET=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 48 || true)

package_platform() {
    local platform="$1"
    local out_name="stokasir-${platform}"
    local out_dir="$RELEASE_DIR/$out_name"

    info "Paket $platform → $out_name.zip ..."
    rm -rf "$out_dir"
    mkdir -p "$out_dir/data/uploads/"{produk,invoice,karyawan}

    # Bun runtime
    if [ "$platform" = "windows" ]; then
        cp "$ROOT/scripts/.bun-cache/bun-windows.exe" "$out_dir/bun.exe"
    else
        cp "$ROOT/scripts/.bun-cache/bun-$platform" "$out_dir/bun"
        chmod +x "$out_dir/bun"
    fi

    # Backend bundled
    mkdir -p "$out_dir/backend"
    cp "$ROOT/backend/dist/server.js" "$out_dir/backend/"

    # Drizzle migrations (dijalankan oleh backend saat startup)
    cp -r "$ROOT/backend/src/db/migrations" "$out_dir/backend/migrations"

    # Frontend build
    cp -r "$ROOT/frontend/build" "$out_dir/frontend"

    # .env siap pakai
    cat > "$out_dir/.env" <<EOF
DATABASE_URL=./data/data.db
UPLOAD_DIR=./data/uploads
MIGRATIONS_DIR=./backend/migrations
PORT=3000
FRONTEND_PORT=5173
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
EOF

    # Launcher scripts
    if [ "$platform" = "windows" ]; then
        cat > "$out_dir/MULAI.bat" <<'BAT'
@echo off
title Stokasir
cd /d "%~dp0"

echo.
echo  +=============================+
echo  ^|       S T O K A S I R       ^|
echo  +=============================+
echo.

:: Baca port dari .env
set PORT=3000
set FRONTEND_PORT=5173
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="PORT"          set PORT=%%b
    if "%%a"=="FRONTEND_PORT" set FRONTEND_PORT=%%b
)

:: Jalankan backend
echo  Memulai backend  (port %PORT%)...
start "Stokasir-BE" /MIN cmd /c "bun.exe backend\server.js"
timeout /t 2 /nobreak >nul

:: Jalankan frontend
echo  Memulai frontend (port %FRONTEND_PORT%)...
start "Stokasir-FE" /MIN cmd /c "set PORT=%FRONTEND_PORT% && set HOST=0.0.0.0 && bun.exe frontend\build\index.js"
timeout /t 2 /nobreak >nul

:: Buka browser
echo  Membuka browser...
start http://localhost:%FRONTEND_PORT%

echo.
echo  Stokasir berjalan di http://localhost:%FRONTEND_PORT%
echo  Akses dari HP: http://[IP-PC-INI]:%FRONTEND_PORT%
echo.
echo  Tekan sembarang tombol untuk MENGHENTIKAN Stokasir...
pause >nul

:: Stop semua
call "%~dp0HENTI.bat" silent
BAT

        cat > "$out_dir/HENTI.bat" <<'BAT'
@echo off
if not "%1"=="silent" echo Menghentikan Stokasir...
taskkill /FI "WINDOWTITLE eq Stokasir-BE" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Stokasir-FE" /F >nul 2>&1
if not "%1"=="silent" echo Stokasir dihentikan.
if not "%1"=="silent" pause
BAT

    else
        # Linux / Pi
        local bun_cmd="./bun"
        cat > "$out_dir/mulai.sh" <<SHELL
#!/usr/bin/env bash
cd "\$(dirname "\$0")"
source .env 2>/dev/null || true
PORT=\${PORT:-3000}
FRONTEND_PORT=\${FRONTEND_PORT:-5173}

echo ""
echo " +=============================+"
echo " |       S T O K A S I R       |"
echo " +=============================+"
echo ""
echo " Memulai backend  (port \$PORT)..."
${bun_cmd} backend/server.js &
BE_PID=\$!

sleep 2
echo " Memulai frontend (port \$FRONTEND_PORT)..."
PORT=\$FRONTEND_PORT HOST=0.0.0.0 ${bun_cmd} frontend/index.js &
FE_PID=\$!

sleep 1
echo ""
echo " Stokasir berjalan di http://localhost:\$FRONTEND_PORT"
echo " Akses dari HP: http://\$(hostname -I | awk '{print \$1}'):\$FRONTEND_PORT"
echo ""
echo " Ctrl+C untuk menghentikan."
echo ""

trap "kill \$BE_PID \$FE_PID 2>/dev/null; echo ' Stokasir dihentikan.'" EXIT INT TERM
wait
SHELL
        chmod +x "$out_dir/mulai.sh"

        cat > "$out_dir/henti.sh" <<'SHELL'
#!/usr/bin/env bash
pkill -f "backend/server.js" 2>/dev/null
pkill -f "frontend/index.js" 2>/dev/null
echo "Stokasir dihentikan."
SHELL
        chmod +x "$out_dir/henti.sh"
    fi

    # README singkat
    if [ "$platform" = "windows" ]; then
        cat > "$out_dir/README.txt" <<'README'
STOKASIR — Panduan Singkat
==========================

MULAI    : Double-click MULAI.bat
HENTI    : Double-click HENTI.bat atau tekan tombol di jendela MULAI

Login pertama:
  Username : admin
  Password : admin123
  (Ganti password setelah login pertama!)

Data tersimpan di folder: data\
Backup cukup copy folder data\ ke tempat lain.

Akses dari HP karyawan:
  Buka browser HP → ketik http://[IP-PC-INI]:5173
  IP PC bisa dilihat di jendela MULAI.bat setelah dijalankan.
README
    else
        cat > "$out_dir/README.txt" <<'README'
STOKASIR — Panduan Singkat
==========================

MULAI    : bash mulai.sh
HENTI    : bash henti.sh  (atau Ctrl+C di jendela mulai.sh)

Login pertama:
  Username : admin
  Password : admin123

Data tersimpan di folder: data/
Backup cukup copy folder data/ ke tempat lain.
README
    fi

    # Zip
    cd "$RELEASE_DIR"
    zip -r "${out_name}.zip" "$out_name" -x "*.DS_Store" 2>/dev/null
    rm -rf "$out_dir"
    ok "$out_name.zip → $(du -sh ${out_name}.zip | cut -f1)"
}

for target in "${TARGETS[@]}"; do
    package_platform "$target"
done

# ── Selesai ───────────────────────────────────────────────────
ELAPSED=$((SECONDS - START_TIME))
echo ""
echo -e "${GREEN}${BOLD}+================================================+${NC}"
echo -e "${GREEN}${BOLD}|      Paket siap distribusi dalam ${ELAPSED}s         |${NC}"
echo -e "${GREEN}${BOLD}+================================================+${NC}"
echo ""
echo -e "  Hasil : ${CYAN}scripts/release/${NC}"
ls -lh "$RELEASE_DIR"/*.zip 2>/dev/null | awk '{print "    " $NF " (" $5 ")"}'
echo ""
echo -e "  ${YELLOW}Cara pakai (Windows):${NC}"
echo -e "    1. Extract stokasir-windows.zip"
echo -e "    2. Double-click ${BOLD}MULAI.bat${NC}"
echo -e "    3. Browser otomatis terbuka → login admin/admin123"
echo ""
