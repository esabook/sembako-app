#!/usr/bin/env bash
# ============================================================
# scripts/setup-prebuilt.sh — Installer Stokasir dari prebuilt artifacts
#
# Tidak perlu build / mkcert / bun install di mesin target.
# Jalankan: bash scripts/setup-prebuilt.sh [install|repair|uninstall]
#
# Prasyarat: scripts/prebuilt.sh sudah dijalankan di mesin developer
# ============================================================
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()   { echo -e "${CYAN}→ $*${RESET}"; }
ok()     { echo -e "${GREEN}✓ $*${RESET}"; }
warn()   { echo -e "${YELLOW}⚠ $*${RESET}"; }
error()  { echo -e "${RED}✗ $*${RESET}"; exit 1; }
header() { echo -e "\n${BOLD}${CYAN}══ $* ══${RESET}"; }

# ── Path ─────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PREBUILT_DIR="$SCRIPT_DIR/prebuilt"

# ── Deteksi OS + Arch ─────────────────────────────────────────
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then echo "mac"
    elif [[ -f /etc/os-release ]]; then . /etc/os-release; echo "${ID:-linux}"
    else echo "linux"
    fi
}
OS=$(detect_os)
ARCH=$(uname -m)

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   Stokasir — Setup Prebuilt Installer        ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${RESET}"
echo -e "  Platform : ${CYAN}$OS ($ARCH)${RESET}"
echo -e "  Prebuilt : ${CYAN}$PREBUILT_DIR${RESET}"
echo ""

# ── Validasi prebuilt ─────────────────────────────────────────
if [[ ! -d "$PREBUILT_DIR" ]]; then
    error "Folder scripts/prebuilt/ tidak ditemukan.\nJalankan terlebih dahulu: bash scripts/prebuilt.sh"
fi
if [[ ! -f "$PREBUILT_DIR/manifest.json" ]]; then
    error "manifest.json tidak ditemukan di scripts/prebuilt/. Prebuilt mungkin tidak lengkap."
fi
if [[ ! -f "$PREBUILT_DIR/app/backend/server.js" ]] && [[ ! -f "$PREBUILT_DIR/bin/stokasir-linux" ]]; then
    error "Backend artifact tidak ditemukan di scripts/prebuilt/. Jalankan ulang prebuilt.sh."
fi
if [[ ! -d "$PREBUILT_DIR/app/frontend" ]]; then
    error "Frontend artifact tidak ditemukan di scripts/prebuilt/. Jalankan ulang prebuilt.sh."
fi

# Baca manifest
MANIFEST_MODE=$(grep '"mode"' "$PREBUILT_DIR/manifest.json" | grep -o '"compile"\|"bundle"' | tr -d '"' || echo "bundle")
MANIFEST_HAS_CERTS=$(grep '"hasCerts"' "$PREBUILT_DIR/manifest.json" | grep -o 'true\|false' || echo "false")
MANIFEST_VERSION=$(grep '"version"' "$PREBUILT_DIR/manifest.json" | grep -oP '(?<=: ")[^"]+' || echo "dev")
MANIFEST_DATE=$(grep '"buildDate"' "$PREBUILT_DIR/manifest.json" | grep -oP '(?<=: ")[^"]+' || echo "-")

echo -e "  Versi    : ${CYAN}$MANIFEST_VERSION${RESET}"
echo -e "  Build    : ${CYAN}$MANIFEST_DATE${RESET}"
echo -e "  Mode     : ${CYAN}$MANIFEST_MODE${RESET}"
echo -e "  Sertifikat: ${CYAN}$($MANIFEST_HAS_CERTS && echo 'ya (HTTPS siap)' || echo 'tidak (HTTP only)')${RESET}"
echo ""

HAS_CERTS=false
[[ "$MANIFEST_HAS_CERTS" == "true" && -f "$PREBUILT_DIR/certs/cert.pem" ]] && HAS_CERTS=true

# ── Helpers: kill proses liar ─────────────────────────────────
# Matikan semua proses bun/node yang menjalankan file stokasir
kill_stray_stokasir() {
    info "Memeriksa proses bun stokasir yang berjalan manual..."
    local pids
    pids=$(pgrep -f 'bun.*(stokasir).*(server\.js|index\.js)' 2>/dev/null || true)
    if [[ -n "$pids" ]]; then
        while IFS= read -r pid; do
            [[ -z "$pid" ]] && continue
            local cmd
            cmd=$(ps -p "$pid" -o args= 2>/dev/null || echo "unknown")
            warn "Matikan proses stray: PID $pid → $cmd"
            kill "$pid" 2>/dev/null || true
        done <<< "$pids"
        sleep 1
        ok "Proses stray dihentikan"
    else
        ok "Tidak ada proses bun stokasir yang berjalan manual"
    fi
}

# Matikan proses yang menempati port tertentu
kill_port_proc() {
    local port="$1"
    local pid
    pid=$(ss -tlnp 2>/dev/null | grep ":${port} " | grep -oP 'pid=\K[0-9]+' | head -1 || true)
    if [[ -n "$pid" ]]; then
        local cmd
        cmd=$(ps -p "$pid" -o args= 2>/dev/null || echo "unknown")
        warn "Port $port dipakai PID $pid ($cmd) — dimatikan"
        kill "$pid" 2>/dev/null || sudo kill "$pid" 2>/dev/null || true
        sleep 1
        ok "Port $port bebas"
    fi
}

# ── Tentukan backend binary ───────────────────────────────────
get_backend_binary() {
    if [[ "$MANIFEST_MODE" == "compile" ]]; then
        local bin=""
        case "$ARCH" in
            x86_64)          bin="$PREBUILT_DIR/bin/stokasir-linux" ;;
            aarch64|arm64)
                if [[ "$OS" == "mac" ]]; then bin="$PREBUILT_DIR/bin/stokasir-mac-arm"
                else bin="$PREBUILT_DIR/bin/stokasir-pi"; fi ;;
        esac
        [[ -f "$bin" ]] && echo "$bin" || echo ""
    else
        echo ""
    fi
}
BACKEND_BINARY=$(get_backend_binary)

# ── Pilih mode ───────────────────────────────────────────────
MODE="${1:-}"
if [[ -z "$MODE" ]]; then
    echo "Pilih mode:"
    echo "  1) install   — install & konfigurasi dari awal"
    echo "  2) repair    — salin ulang artifact + restart (konfigurasi & data tetap)"
    echo "  3) uninstall — hapus service & config (data opsional)"
    echo ""
    read -rp "Pilihan [1/2/3]: " CHOICE
    case "$CHOICE" in
        1|install)   MODE="install" ;;
        2|repair)    MODE="repair" ;;
        3|uninstall) MODE="uninstall" ;;
        *) error "Pilihan tidak valid." ;;
    esac
fi

# ══════════════════════════════════════════════════════════════
# UNINSTALL
# ══════════════════════════════════════════════════════════════
do_uninstall() {
    header "Uninstall Stokasir"

    warn "Mode ini akan menghapus service dan konfigurasi Stokasir."
    read -rp "Lanjutkan? [y/N]: " CONFIRM
    [[ "${CONFIRM,,}" == "y" ]] || { echo "Dibatalkan."; exit 0; }

    if [[ "$OS" == "mac" ]]; then
        LAUNCH_DIR="$HOME/Library/LaunchAgents"
        launchctl unload "$LAUNCH_DIR/stokasir.backend.plist"  2>/dev/null && ok "backend dihentikan"  || warn "backend tidak aktif"
        launchctl unload "$LAUNCH_DIR/stokasir.frontend.plist" 2>/dev/null && ok "frontend dihentikan" || warn "frontend tidak aktif"
        rm -f "$LAUNCH_DIR/stokasir.backend.plist" "$LAUNCH_DIR/stokasir.frontend.plist"
        ok "Plist dihapus"
        BREW_PREFIX=$(brew --prefix 2>/dev/null || echo "/opt/homebrew")
        if [[ -f "$BREW_PREFIX/etc/nginx/servers/stokasir.conf" ]]; then
            rm -f "$BREW_PREFIX/etc/nginx/servers/stokasir.conf"
            brew services restart nginx 2>/dev/null || true
            ok "Nginx config dihapus"
        fi
    else
        sudo systemctl stop  stokasir-backend  2>/dev/null && ok "backend dihentikan"  || warn "backend tidak aktif"
        sudo systemctl stop  stokasir-frontend 2>/dev/null && ok "frontend dihentikan" || warn "frontend tidak aktif"
        sudo systemctl disable stokasir-backend  2>/dev/null || true
        sudo systemctl disable stokasir-frontend 2>/dev/null || true
        sudo rm -f /etc/systemd/system/stokasir-backend.service
        sudo rm -f /etc/systemd/system/stokasir-frontend.service
        sudo systemctl daemon-reload
        ok "Service files dihapus"

        if [[ -f /etc/nginx/sites-enabled/stokasir ]]; then
            sudo rm -f /etc/nginx/sites-enabled/stokasir /etc/nginx/sites-available/stokasir
            sudo nginx -t 2>/dev/null && sudo systemctl reload nginx || true
            ok "Nginx config dihapus"
        fi

        if [[ -d /etc/nginx/certs ]]; then
            read -rp "  Hapus sertifikat HTTPS di /etc/nginx/certs? [y/N]: " DEL_CERT
            if [[ "${DEL_CERT,,}" == "y" ]]; then
                sudo rm -rf /etc/nginx/certs
                ok "Sertifikat dihapus"
            fi
        fi
    fi

    # Hapus install dir jika ada
    read -rp "  Path install dir (kosongkan untuk skip): " DEL_INSTALL
    if [[ -n "$DEL_INSTALL" && -d "$DEL_INSTALL" ]]; then
        read -rp "  Hapus '$DEL_INSTALL'? [y/N]: " DEL_CONFIRM
        if [[ "${DEL_CONFIRM,,}" == "y" ]]; then
            rm -rf "$DEL_INSTALL"
            ok "Install dir dihapus: $DEL_INSTALL"
        fi
    fi

    echo ""
    echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════╗${RESET}"
    echo -e "${BOLD}${GREEN}║        Stokasir berhasil diuninstall!        ║${RESET}"
    echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════╝${RESET}"
    echo ""
}

# ══════════════════════════════════════════════════════════════
# REPAIR — salin ulang artifact prebuilt + restart service
# ══════════════════════════════════════════════════════════════
do_repair() {
    header "Repair Stokasir — Salin Artifact + Restart"

    # ── Deteksi install dir ───────────────────────────────────
    local _install_dir="" _env_file="" _data_dir="" _port_be=3000 _port_fe=5173

    if [[ "$OS" == "mac" ]]; then
        LAUNCH_DIR="$HOME/Library/LaunchAgents"
        if [[ -f "$LAUNCH_DIR/stokasir.backend.plist" ]]; then
            _install_dir=$(grep -A1 'WorkingDirectory' "$LAUNCH_DIR/stokasir.backend.plist" \
                | grep '<string>' | sed 's/.*<string>\(.*\)<\/string>/\1/' || true)
            # WorkingDirectory di plist → $INSTALL_DIR/backend, naik satu level
            [[ -n "$_install_dir" ]] && _install_dir=$(dirname "$_install_dir")
        fi
    else
        if systemctl list-unit-files stokasir-backend.service &>/dev/null 2>&1; then
            _env_file=$(systemctl show stokasir-backend -p EnvironmentFiles 2>/dev/null \
                | grep -oP '/\S+\.env' | head -1 || true)
            local _svc_dir
            _svc_dir=$(systemctl show stokasir-backend -p WorkingDirectory 2>/dev/null \
                | cut -d= -f2 || true)
            # WorkingDirectory → $INSTALL_DIR/backend, naik satu level
            [[ -n "$_svc_dir" ]] && _install_dir=$(dirname "$_svc_dir")
        fi
    fi

    [[ -z "$_install_dir" ]] && _install_dir="$HOME/stokasir"
    read -rp "  Folder install [$_install_dir]: " _input_dir
    _install_dir="${_input_dir:-$_install_dir}"

    [[ ! -d "$_install_dir" ]] && error "Folder '$_install_dir' tidak ditemukan. Jalankan mode install terlebih dahulu."

    # Baca .env untuk data dir & port
    _env_file="$_install_dir/.env"
    if [[ -f "$_env_file" ]]; then
        _data_dir=$(grep '^DATABASE_URL=' "$_env_file" | cut -d= -f2 | xargs dirname || true)
        _port_be=$(grep '^PORT=' "$_env_file" | cut -d= -f2 || echo "3000")
    fi
    [[ -z "$_data_dir" || "$_data_dir" == "." ]] && _data_dir="$_install_dir/data"

    info "Install dir : $_install_dir"
    info "Data dir    : $_data_dir"

    # ── Stop service ─────────────────────────────────────────
    header "Menghentikan service..."
    if [[ "$OS" == "mac" ]]; then
        launchctl unload "$LAUNCH_DIR/stokasir.backend.plist"  2>/dev/null || true
        launchctl unload "$LAUNCH_DIR/stokasir.frontend.plist" 2>/dev/null || true
    else
        sudo systemctl stop stokasir-backend stokasir-frontend 2>/dev/null || true
    fi
    kill_stray_stokasir
    kill_port_proc "$_port_be"
    kill_port_proc "$_port_fe"
    ok "Service dihentikan"

    # ── Salin ulang artifact ──────────────────────────────────
    header "Salin artifact prebuilt..."

    info "Salin backend..."
    mkdir -p "$_install_dir/backend"
    if [[ "$MANIFEST_MODE" == "compile" && -n "$BACKEND_BINARY" ]]; then
        cp "$BACKEND_BINARY" "$_install_dir/backend/stokasir"
        chmod +x "$_install_dir/backend/stokasir"
        ok "Binary backend diperbarui → $_install_dir/backend/stokasir"
    else
        cp "$PREBUILT_DIR/app/backend/server.js" "$_install_dir/backend/server.js"
        ok "Bundle backend diperbarui → $_install_dir/backend/server.js"
    fi

    info "Salin migrations..."
    rm -rf "$_install_dir/backend/migrations"
    cp -r "$PREBUILT_DIR/app/backend/migrations" "$_install_dir/backend/migrations"
    ok "Migrations diperbarui"

    info "Salin frontend..."
    mkdir -p "$_install_dir/frontend"
    rm -rf "$_install_dir/frontend"
    cp -r "$PREBUILT_DIR/app/frontend/." "$_install_dir/frontend/"
    ok "Frontend diperbarui ($(du -sh "$_install_dir/frontend" | cut -f1))"

    # ── Ganti database? (default N) ───────────────────────────
    local _db_path="$_data_dir/data.db"
    if [[ -f "$PREBUILT_DIR/app/backend/data.db" ]]; then
        echo ""
        warn "Prebuilt menyertakan data.db bawaan."
        warn "Mengganti database akan MENGHAPUS semua data transaksi & stok!"
        read -rp "  Ganti database dengan data.db bawaan? [y/N]: " _REPLACE_DB
        if [[ "${_REPLACE_DB,,}" == "y" ]]; then
            cp "$_db_path" "$_db_path.bak.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
            cp "$PREBUILT_DIR/app/backend/data.db" "$_db_path"
            ok "Database diganti (backup disimpan sebagai .bak)"
        else
            ok "Database tetap dipertahankan"
        fi
    fi

    # ── Start service ─────────────────────────────────────────
    header "Menjalankan ulang service..."
    if [[ "$OS" == "mac" ]]; then
        if [[ -f "$LAUNCH_DIR/stokasir.backend.plist" ]]; then
            launchctl load "$LAUNCH_DIR/stokasir.backend.plist"
            launchctl load "$LAUNCH_DIR/stokasir.frontend.plist"
            ok "Launchd service di-restart"
        else
            warn "Plist tidak ditemukan — jalankan mode install untuk mendaftarkan service"
        fi
    else
        if systemctl list-unit-files stokasir-backend.service &>/dev/null 2>&1; then
            sudo systemctl daemon-reload
            sudo systemctl restart stokasir-backend stokasir-frontend
            ok "Systemd service di-restart"
        else
            warn "Service tidak terdaftar — jalankan mode install terlebih dahulu"
        fi
    fi

    echo ""
    echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════╗${RESET}"
    echo -e "${BOLD}${GREEN}║     Stokasir berhasil di-repair & restart!   ║${RESET}"
    echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════╝${RESET}"
    echo ""
}

# ══════════════════════════════════════════════════════════════
# INSTALL
# ══════════════════════════════════════════════════════════════
do_install() {
    if [[ "$ARCH" == "armv7l" ]]; then
        error "ARM32 tidak didukung. Gunakan Raspberry Pi model 3B+/4/5 (ARM64)."
    fi

    # ── 1 / 5  Cek & Install Bun (untuk menjalankan bundle) ──
    header "1 / 5  Cek Runtime"

    if [[ "$MANIFEST_MODE" == "compile" && -n "$BACKEND_BINARY" ]]; then
        ok "Backend: binary standalone (bun tidak diperlukan untuk backend)"
    fi

    # Frontend tetap butuh bun (adapter-bun menghasilkan index.js)
    if command -v bun &>/dev/null; then
        ok "Bun sudah terinstall: v$(bun --version)"
    else
        info "Menginstall Bun (diperlukan untuk menjalankan frontend)..."
        curl -fsSL https://bun.sh/install | bash
        export PATH="$HOME/.bun/bin:$PATH"
        command -v bun &>/dev/null || error "Gagal install Bun."
        ok "Bun berhasil diinstall: v$(bun --version)"
    fi
    BUN_BIN=$(which bun)

    # ── 2 / 5  Konfigurasi ────────────────────────────────────
    header "2 / 5  Konfigurasi"

    echo ""
    echo "Isi konfigurasi berikut (Enter = pakai nilai default):"
    echo ""

    DEFAULT_INSTALL="$HOME/stokasir"
    read -rp "  Folder install [$DEFAULT_INSTALL]: " INSTALL_DIR
    INSTALL_DIR="${INSTALL_DIR:-$DEFAULT_INSTALL}"

    DEFAULT_DATA="$INSTALL_DIR/data"
    read -rp "  Folder data (database & uploads) [$DEFAULT_DATA]: " DATA_DIR
    DATA_DIR="${DATA_DIR:-$DEFAULT_DATA}"

    DETECTED_IP=""
    if command -v ip &>/dev/null; then
        DETECTED_IP=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' | head -1 || true)
    elif command -v ipconfig &>/dev/null; then
        DETECTED_IP=$(ipconfig getifaddr en0 2>/dev/null || true)
    fi
    DEFAULT_IP="${DETECTED_IP:-192.168.1.x}"
    read -rp "  IP server ini (untuk akses HP) [$DEFAULT_IP]: " SERVER_IP
    SERVER_IP="${SERVER_IP:-$DEFAULT_IP}"

    DEFAULT_JWT=$(LC_ALL=C tr -dc 'A-Za-z0-9!@#$%^&*' </dev/urandom 2>/dev/null | head -c 48 \
        || echo "ganti-secret-ini-$(date +%s)")
    read -rp "  JWT Secret (Enter = generate otomatis): " JWT_SECRET
    JWT_SECRET="${JWT_SECRET:-$DEFAULT_JWT}"

    read -rp "  Port backend  [3000]: " PORT_BACKEND
    PORT_BACKEND="${PORT_BACKEND:-3000}"
    read -rp "  Port frontend [5173]: " PORT_FRONTEND
    PORT_FRONTEND="${PORT_FRONTEND:-5173}"

    echo ""
    echo -e "  ${BOLD}Nginx & HTTPS${RESET}"
    read -rp "  Setup nginx sebagai reverse proxy (port 80/443)? [Y/n]: " _NGINX_INPUT
    SETUP_NGINX=true
    [[ "${_NGINX_INPUT,,}" == "n" ]] && SETUP_NGINX=false

    SETUP_HTTPS=false
    if $SETUP_NGINX && $HAS_CERTS; then
        read -rp "  Gunakan sertifikat HTTPS dari prebuilt? [Y/n]: " _HTTPS_INPUT
        [[ "${_HTTPS_INPUT,,}" != "n" ]] && SETUP_HTTPS=true
    elif $SETUP_NGINX && ! $HAS_CERTS; then
        warn "Prebuilt tidak menyertakan sertifikat — HTTPS tidak tersedia."
        warn "Jalankan ulang prebuilt.sh tanpa --no-cert untuk mengaktifkan HTTPS."
    fi

    if $SETUP_HTTPS; then
        PUBLIC_URL="https://$SERVER_IP/api"
    elif $SETUP_NGINX; then
        PUBLIC_URL="http://$SERVER_IP/api"
    else
        PUBLIC_URL="http://$SERVER_IP:$PORT_BACKEND"
    fi

    CURRENT_USER="${USER:-$(whoami)}"

    echo ""
    info "Ringkasan konfigurasi:"
    echo "  Install dir  : $INSTALL_DIR"
    echo "  Data dir     : $DATA_DIR"
    echo "  IP server    : $SERVER_IP"
    echo "  Port backend : $PORT_BACKEND"
    echo "  Port frontend: $PORT_FRONTEND"
    echo "  Nginx        : $($SETUP_NGINX && echo 'ya' || echo 'tidak')"
    echo "  HTTPS        : $($SETUP_HTTPS && echo 'ya (dari prebuilt certs)' || echo 'tidak')"
    echo "  API URL      : $PUBLIC_URL"
    echo ""
    read -rp "Lanjutkan? [Y/n]: " CONFIRM
    [[ "${CONFIRM,,}" == "n" ]] && { echo "Dibatalkan."; exit 0; }

    # ── 3 / 5  Salin Artifacts ke Install Dir ─────────────────
    header "3 / 5  Deploy Artifacts"

    info "Membuat direktori..."
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$DATA_DIR/uploads/produk"
    mkdir -p "$DATA_DIR/uploads/invoice"
    mkdir -p "$DATA_DIR/uploads/karyawan"
    mkdir -p "$DATA_DIR/backup"
    mkdir -p "$DATA_DIR/logs"
    ok "Direktori siap"

    info "Salin backend..."
    mkdir -p "$INSTALL_DIR/backend"
    if [[ "$MANIFEST_MODE" == "compile" && -n "$BACKEND_BINARY" ]]; then
        cp "$BACKEND_BINARY" "$INSTALL_DIR/backend/stokasir"
        chmod +x "$INSTALL_DIR/backend/stokasir"
        ok "Binary backend disalin → $INSTALL_DIR/backend/stokasir"
    else
        cp "$PREBUILT_DIR/app/backend/server.js" "$INSTALL_DIR/backend/server.js"
        ok "Bundle backend disalin → $INSTALL_DIR/backend/server.js"
    fi

    info "Salin migrations..."
    cp -r "$PREBUILT_DIR/app/backend/migrations" "$INSTALL_DIR/backend/migrations"
    ok "Migrations disalin"

    info "Salin frontend..."
    mkdir -p "$INSTALL_DIR/frontend"
    cp -r "$PREBUILT_DIR/app/frontend/." "$INSTALL_DIR/frontend/"
    ok "Frontend disalin → $INSTALL_DIR/frontend/ ($(du -sh "$INSTALL_DIR/frontend" | cut -f1))"

    # ── Sertifikat HTTPS ──────────────────────────────────────
    if $SETUP_HTTPS; then
        info "Salin sertifikat ke /etc/nginx/certs/..."
        sudo mkdir -p /etc/nginx/certs
        sudo cp "$PREBUILT_DIR/certs/cert.pem" /etc/nginx/certs/cert.pem
        sudo cp "$PREBUILT_DIR/certs/key.pem"  /etc/nginx/certs/key.pem
        sudo chmod 640 /etc/nginx/certs/key.pem
        ok "cert.pem + key.pem disalin ke /etc/nginx/certs/"

        # rootCA agar HP bisa download
        cp "$PREBUILT_DIR/certs/rootCA.pem" "$DATA_DIR/uploads/rootCA.crt"
        ok "rootCA.crt disalin ke $DATA_DIR/uploads/ (HP bisa download)"
    fi

    # ── .env ─────────────────────────────────────────────────
    info "Menulis .env..."
    cat > "$INSTALL_DIR/.env" <<ENVEOF
DATABASE_URL=$DATA_DIR/data.db
UPLOAD_DIR=$DATA_DIR/uploads
MIGRATIONS_DIR=$INSTALL_DIR/backend/migrations
PORT=$PORT_BACKEND
NODE_ENV=production
JWT_SECRET=$JWT_SECRET
ENVEOF
    ok ".env ditulis"

    # ── 4 / 5  Service Files ──────────────────────────────────
    header "4 / 5  Setup Service"

    # Tentukan ExecStart backend
    if [[ "$MANIFEST_MODE" == "compile" && -n "$BACKEND_BINARY" ]]; then
        BACKEND_EXEC="$INSTALL_DIR/backend/stokasir"
    else
        BACKEND_EXEC="$BUN_BIN $INSTALL_DIR/backend/server.js"
    fi
    FRONTEND_EXEC="$BUN_BIN $INSTALL_DIR/frontend/index.js"

    if [[ "$OS" == "mac" ]]; then
        LAUNCH_DIR="$HOME/Library/LaunchAgents"
        mkdir -p "$LAUNCH_DIR"

        info "Menulis launchd plist backend..."
        cat > "$LAUNCH_DIR/stokasir.backend.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>stokasir.backend</string>
  <key>ProgramArguments</key>
  <array>
    $(if [[ "$MANIFEST_MODE" == "compile" && -n "$BACKEND_BINARY" ]]; then
        echo "<string>$INSTALL_DIR/backend/stokasir</string>"
    else
        echo "<string>$BUN_BIN</string><string>$INSTALL_DIR/backend/server.js</string>"
    fi)
  </array>
  <key>WorkingDirectory</key><string>$INSTALL_DIR/backend</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>DATABASE_URL</key><string>$DATA_DIR/data.db</string>
    <key>UPLOAD_DIR</key><string>$DATA_DIR/uploads</string>
    <key>MIGRATIONS_DIR</key><string>$INSTALL_DIR/backend/migrations</string>
    <key>PORT</key><string>$PORT_BACKEND</string>
    <key>NODE_ENV</key><string>production</string>
    <key>JWT_SECRET</key><string>$JWT_SECRET</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$DATA_DIR/logs/backend.log</string>
  <key>StandardErrorPath</key><string>$DATA_DIR/logs/backend.error.log</string>
</dict>
</plist>
PLIST
        ok "stokasir.backend.plist ditulis"

        info "Menulis launchd plist frontend..."
        cat > "$LAUNCH_DIR/stokasir.frontend.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>stokasir.frontend</string>
  <key>ProgramArguments</key>
  <array>
    <string>$BUN_BIN</string>
    <string>$INSTALL_DIR/frontend/index.js</string>
  </array>
  <key>WorkingDirectory</key><string>$INSTALL_DIR/frontend</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PORT</key><string>$PORT_FRONTEND</string>
    <key>HOST</key><string>0.0.0.0</string>
    <key>NODE_ENV</key><string>production</string>
    <key>PUBLIC_API_URL</key><string>$PUBLIC_URL</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$DATA_DIR/logs/frontend.log</string>
  <key>StandardErrorPath</key><string>$DATA_DIR/logs/frontend.error.log</string>
</dict>
</plist>
PLIST
        ok "stokasir.frontend.plist ditulis"

    else
        # Linux / Raspberry Pi — systemd
        info "Menulis systemd service backend..."
        sudo tee /etc/systemd/system/stokasir-backend.service > /dev/null <<SVCEOF
[Unit]
Description=Stokasir Backend
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$INSTALL_DIR/backend
ExecStart=$BACKEND_EXEC
Restart=on-failure
RestartSec=5
EnvironmentFile=$INSTALL_DIR/.env

[Install]
WantedBy=multi-user.target
SVCEOF
        ok "stokasir-backend.service ditulis"

        info "Menulis systemd service frontend..."
        sudo tee /etc/systemd/system/stokasir-frontend.service > /dev/null <<SVCEOF
[Unit]
Description=Stokasir Frontend
After=network.target stokasir-backend.service

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$INSTALL_DIR/frontend
ExecStart=$FRONTEND_EXEC
Restart=on-failure
RestartSec=5
Environment=PORT=$PORT_FRONTEND
Environment=HOST=0.0.0.0
Environment=NODE_ENV=production
Environment=PUBLIC_API_URL=$PUBLIC_URL

[Install]
WantedBy=multi-user.target
SVCEOF
        ok "stokasir-frontend.service ditulis"
    fi

    # ── 5 / 5  Nginx & Start ──────────────────────────────────
    header "5 / 5  Nginx & Jalankan"

    if $SETUP_NGINX; then
        if ! command -v nginx &>/dev/null; then
            info "Menginstall nginx..."
            if [[ "$OS" == "mac" ]]; then
                brew install nginx
            else
                sudo apt-get update -qq && sudo apt-get install -y nginx
            fi
            ok "Nginx terinstall"
        else
            ok "Nginx: $(nginx -v 2>&1 | head -1)"
        fi

        if [[ "$OS" == "mac" ]]; then
            BREW_PREFIX=$(brew --prefix)
            NGINX_CONF="$BREW_PREFIX/etc/nginx/servers/stokasir.conf"
        else
            NGINX_CONF="/etc/nginx/sites-available/stokasir"
        fi

        if $SETUP_HTTPS; then
            info "Menulis nginx config (HTTP → HTTPS)..."
            sudo tee "$NGINX_CONF" > /dev/null <<NGINXEOF
# HTTP — hanya untuk download rootCA.crt, sisanya redirect ke HTTPS
server {
    listen 80;
    server_name _;

    location = /rootCA.crt {
        alias $DATA_DIR/uploads/rootCA.crt;
        add_header Content-Type application/x-x509-ca-cert;
        add_header Content-Disposition 'attachment; filename="StokasirCA.crt"';
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl;
    server_name _;

    ssl_certificate     /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;

    # nginx handle kompresi sendiri — hindari double-encoding dari upstream (adapter-bun precompress)
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_types text/plain text/css text/javascript application/javascript application/json image/svg+xml;

    location = /rootCA.crt {
        alias $DATA_DIR/uploads/rootCA.crt;
        add_header Content-Type application/x-x509-ca-cert;
        add_header Content-Disposition 'attachment; filename="StokasirCA.crt"';
    }

    location /uploads/ {
        alias $DATA_DIR/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass         http://127.0.0.1:$PORT_BACKEND/;
        proxy_http_version 1.1;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-Proto https;
    }

    location / {
        proxy_pass            http://127.0.0.1:$PORT_FRONTEND;
        proxy_http_version    1.1;
        proxy_set_header      Host \$host;
        proxy_set_header      Upgrade \$http_upgrade;
        proxy_set_header      Connection 'upgrade';
        proxy_set_header      X-Forwarded-Proto https;
        # Strip Accept-Encoding — nginx kompres sendiri, bukan Bun (hindari MIME error)
        proxy_set_header      Accept-Encoding "";
    }
}
NGINXEOF
        else
            info "Menulis nginx config (HTTP only)..."
            sudo tee "$NGINX_CONF" > /dev/null <<NGINXEOF
server {
    listen 80;
    server_name _;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_types text/plain text/css text/javascript application/javascript application/json image/svg+xml;

    location /uploads/ {
        alias $DATA_DIR/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass         http://127.0.0.1:$PORT_BACKEND/;
        proxy_http_version 1.1;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
    }

    location / {
        proxy_pass            http://127.0.0.1:$PORT_FRONTEND;
        proxy_http_version    1.1;
        proxy_set_header      Host \$host;
        proxy_set_header      Upgrade \$http_upgrade;
        proxy_set_header      Connection 'upgrade';
        proxy_set_header      Accept-Encoding "";
    }
}
NGINXEOF
        fi

        if [[ "$OS" != "mac" ]]; then
            sudo ln -sf /etc/nginx/sites-available/stokasir /etc/nginx/sites-enabled/stokasir
            sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
        fi

        if sudo nginx -t 2>/dev/null; then
            if [[ "$OS" == "mac" ]]; then
                brew services restart nginx
            else
                sudo systemctl enable nginx
                sudo systemctl restart nginx
            fi
            ok "Nginx berjalan"
        else
            warn "Konfigurasi nginx ada masalah — cek: sudo nginx -t"
        fi
    fi

    # ── Start service ─────────────────────────────────────────
    # Pastikan tidak ada proses bun liar yang memakai port yang sama
    kill_stray_stokasir
    kill_port_proc "$PORT_BACKEND"
    kill_port_proc "$PORT_FRONTEND"

    if [[ "$OS" == "mac" ]]; then
        launchctl unload "$LAUNCH_DIR/stokasir.backend.plist"  2>/dev/null || true
        launchctl unload "$LAUNCH_DIR/stokasir.frontend.plist" 2>/dev/null || true
        launchctl load "$LAUNCH_DIR/stokasir.backend.plist"
        launchctl load "$LAUNCH_DIR/stokasir.frontend.plist"
        ok "Stokasir berjalan — auto-start aktif saat login"
    else
        sudo systemctl daemon-reload
        sudo systemctl enable stokasir-backend stokasir-frontend
        sudo systemctl restart stokasir-backend stokasir-frontend
        ok "Stokasir berjalan — auto-start aktif saat boot"
    fi

    # ── Ringkasan ─────────────────────────────────────────────
    echo ""
    echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════╗${RESET}"
    echo -e "${BOLD}${GREEN}║        Stokasir berhasil diinstall!          ║${RESET}"
    echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════╝${RESET}"
    echo ""

    if $SETUP_HTTPS; then
        echo -e "  Akses : ${CYAN}https://$SERVER_IP/${RESET}"
        echo -e "  (HTTP redirect otomatis ke HTTPS)"
    elif $SETUP_NGINX; then
        echo -e "  Akses : ${CYAN}http://$SERVER_IP/${RESET}"
    else
        echo -e "  Akses : ${CYAN}http://$SERVER_IP:$PORT_FRONTEND${RESET}"
    fi
    echo -e "  Health: ${CYAN}http://localhost:$PORT_BACKEND/health${RESET}"
    echo ""

    if $SETUP_HTTPS; then
        echo -e "  ${BOLD}Install CA di HP karyawan (1x saja):${RESET}"
        echo -e "  1. Buka browser HP → ${CYAN}http://$SERVER_IP/rootCA.crt${RESET}"
        echo -e "  2. Download & install:"
        echo -e "     Android : Settings → Security → Install certificate → CA Certificate"
        echo -e "     iPhone  : Settings → General → VPN & Device Management → install"
        echo -e "               lalu General → About → Certificate Trust Settings → aktifkan"
        echo ""
    fi

    echo -e "  Data    : ${CYAN}$DATA_DIR${RESET}"
    echo -e "  Log     : ${CYAN}$DATA_DIR/logs/${RESET}"
    echo ""

    if [[ "$OS" == "mac" ]]; then
        echo -e "  Perintah launchd:"
        echo -e "    ${YELLOW}launchctl list | grep stokasir${RESET}    — status"
        echo -e "    ${YELLOW}tail -f $DATA_DIR/logs/backend.log${RESET}"
    else
        echo -e "  Perintah systemd:"
        echo -e "    ${YELLOW}sudo systemctl status stokasir-backend${RESET}"
        echo -e "    ${YELLOW}sudo systemctl status stokasir-frontend${RESET}"
        echo -e "    ${YELLOW}journalctl -u stokasir-backend -f${RESET}"
    fi
    echo ""
    echo -e "  Repair   : ${CYAN}bash scripts/setup-prebuilt.sh repair${RESET}"
    echo -e "  Uninstall: ${CYAN}bash scripts/setup-prebuilt.sh uninstall${RESET}"
    echo ""
}

# ── Route ────────────────────────────────────────────────────
case "$MODE" in
    install)   do_install ;;
    repair)    do_repair ;;
    uninstall) do_uninstall ;;
    *) error "Mode tidak valid: '$MODE'. Gunakan: install | repair | uninstall" ;;
esac
