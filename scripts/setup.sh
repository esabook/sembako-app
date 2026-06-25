#!/usr/bin/env bash
# setup.sh — Installer Stokasir untuk Linux / Mac / Raspberry Pi
# Jalankan dari folder root project: bash scripts/setup.sh [install|uninstall|repair]
set -e

# ── Warna output ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}→ $*${RESET}"; }
ok()      { echo -e "${GREEN}✓ $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠ $*${RESET}"; }
error()   { echo -e "${RED}✗ $*${RESET}"; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}══ $* ══${RESET}"; }

# ── Deteksi OS ───────────────────────────────────────────────────────────────
detect_os() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "mac"
  elif [[ -f /etc/os-release ]]; then
    . /etc/os-release
    echo "${ID:-linux}"
  else
    echo "linux"
  fi
}

OS=$(detect_os)
ARCH=$(uname -m)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$SCRIPT_DIR/backend/.env"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║      Stokasir — Setup Installer      ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════╝${RESET}"
echo -e "  Platform : ${CYAN}$OS ($ARCH)${RESET}"
echo -e "  Folder   : ${CYAN}$SCRIPT_DIR${RESET}"
echo ""

# ── Pilih mode ───────────────────────────────────────────────────────────────
MODE="${1:-}"
if [[ -z "$MODE" ]]; then
  echo "Pilih mode:"
  echo "  1) install   — install & konfigurasi dari awal"
  echo "  2) repair    — reinstall deps, rebuild, restart service (konfigurasi tetap)"
  echo "  3) uninstall — hapus service & config (data opsional)"
  echo ""
  read -rp "Pilihan [1/2/3]: " CHOICE
  case "$CHOICE" in
    1|install)   MODE="install" ;;
    2|repair)    MODE="repair" ;;
    3|uninstall) MODE="uninstall" ;;
    *) error "Pilihan tidak valid. Jalankan: bash scripts/setup.sh [install|repair|uninstall]" ;;
  esac
fi

# ══════════════════════════════════════════════════════════════════════════════
# UNINSTALL
# ══════════════════════════════════════════════════════════════════════════════
do_uninstall() {
  header "Uninstall Stokasir"

  warn "Mode ini akan menghapus service dan konfigurasi Stokasir."
  read -rp "Lanjutkan? [y/N]: " CONFIRM
  [[ "${CONFIRM,,}" == "y" ]] || { echo "Dibatalkan."; exit 0; }

  if [[ "$OS" == "mac" ]]; then
    LAUNCH_DIR="$HOME/Library/LaunchAgents"
    info "Menghentikan launchd service..."
    launchctl unload "$LAUNCH_DIR/stokasir.backend.plist"  2>/dev/null && ok "backend dihentikan" || warn "backend tidak aktif"
    launchctl unload "$LAUNCH_DIR/stokasir.frontend.plist" 2>/dev/null && ok "frontend dihentikan" || warn "frontend tidak aktif"
    info "Menghapus plist files..."
    rm -f "$LAUNCH_DIR/stokasir.backend.plist"
    rm -f "$LAUNCH_DIR/stokasir.frontend.plist"
    ok "Plist dihapus"

    # Hapus nginx config (Mac/Homebrew)
    BREW_PREFIX=$(brew --prefix 2>/dev/null || echo "/opt/homebrew")
    NGINX_CONF_MAC="$BREW_PREFIX/etc/nginx/servers/stokasir.conf"
    if [[ -f "$NGINX_CONF_MAC" ]]; then
      info "Menghapus konfigurasi nginx..."
      rm -f "$NGINX_CONF_MAC"
      brew services restart nginx 2>/dev/null || true
      ok "Nginx config dihapus"
    fi
  else
    info "Menghentikan systemd service..."
    sudo systemctl stop  stokasir-backend  2>/dev/null && ok "backend dihentikan"  || warn "backend tidak aktif"
    sudo systemctl stop  stokasir-frontend 2>/dev/null && ok "frontend dihentikan" || warn "frontend tidak aktif"
    sudo systemctl disable stokasir-backend  2>/dev/null || true
    sudo systemctl disable stokasir-frontend 2>/dev/null || true
    info "Menghapus service files..."
    sudo rm -f /etc/systemd/system/stokasir-backend.service
    sudo rm -f /etc/systemd/system/stokasir-frontend.service
    sudo systemctl daemon-reload
    ok "Service files dihapus"

    # Hapus nginx config (Linux)
    if [[ -f /etc/nginx/sites-enabled/stokasir ]]; then
      info "Menghapus konfigurasi nginx..."
      sudo rm -f /etc/nginx/sites-enabled/stokasir
      sudo rm -f /etc/nginx/sites-available/stokasir
      sudo nginx -t 2>/dev/null && sudo systemctl reload nginx || true
      ok "Nginx config dihapus"
    fi

    # Hapus cert mkcert
    if [[ -d /etc/nginx/certs ]]; then
      read -rp "  Hapus sertifikat HTTPS di /etc/nginx/certs? [y/N]: " DEL_CERT
      if [[ "${DEL_CERT,,}" == "y" ]]; then
        sudo rm -rf /etc/nginx/certs
        ok "Sertifikat dihapus"
      fi
    fi
  fi

  if [[ -f "$ENV_FILE" ]]; then
    info "Menghapus backend/.env..."
    rm -f "$ENV_FILE"
    ok "backend/.env dihapus"
  fi

  # Tawarkan hapus data dir
  echo ""
  warn "Data aplikasi (database, uploads) TIDAK dihapus secara default."
  read -rp "Hapus folder data juga? Masukkan path atau Enter untuk skip: " DEL_DATA
  DEL_DATA="${DEL_DATA:-}"
  if [[ -n "$DEL_DATA" && -d "$DEL_DATA" ]]; then
    read -rp "  Yakin hapus '$DEL_DATA'? Ini permanen! [y/N]: " DEL_CONFIRM
    if [[ "${DEL_CONFIRM,,}" == "y" ]]; then
      rm -rf "$DEL_DATA"
      ok "Folder data dihapus: $DEL_DATA"
    else
      info "Folder data dipertahankan."
    fi
  fi

  echo ""
  echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════╗${RESET}"
  echo -e "${BOLD}${GREEN}║        Stokasir berhasil diuninstall!        ║${RESET}"
  echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════╝${RESET}"
  echo ""
}

# ══════════════════════════════════════════════════════════════════════════════
# REPAIR — reinstall deps, rebuild, migrate, restart
# ══════════════════════════════════════════════════════════════════════════════
do_repair() {
  header "Repair Stokasir"

  # Cek bun
  if ! command -v bun &>/dev/null; then
    export PATH="$HOME/.bun/bin:$PATH"
    command -v bun &>/dev/null || error "Bun tidak ditemukan. Jalankan install terlebih dahulu."
  fi
  BUN_BIN=$(which bun)
  ok "Bun: v$(bun --version)"

  header "1 / 3  Reinstall Dependencies & Rebuild"

  info "Install backend dependencies..."
  cd "$SCRIPT_DIR/backend"
  bun install --production
  ok "Backend dependencies selesai"

  info "Build frontend..."
  cd "$SCRIPT_DIR/frontend"
  bun install
  bun run build
  ok "Frontend build selesai"

  header "2 / 3  Migrasi Database"

  info "Menjalankan migrasi database..."
  cd "$SCRIPT_DIR/backend"
  if [[ -f "$ENV_FILE" ]]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
  fi
  bun run db:migrate 2>/dev/null || warn "Tidak ada migrasi baru atau perintah db:migrate tidak tersedia."
  ok "Migrasi selesai"

  header "3 / 3  Restart Service"

  if [[ "$OS" == "mac" ]]; then
    LAUNCH_DIR="$HOME/Library/LaunchAgents"
    if [[ -f "$LAUNCH_DIR/stokasir.backend.plist" ]]; then
      launchctl unload "$LAUNCH_DIR/stokasir.backend.plist"  2>/dev/null || true
      launchctl unload "$LAUNCH_DIR/stokasir.frontend.plist" 2>/dev/null || true
      launchctl load "$LAUNCH_DIR/stokasir.backend.plist"
      launchctl load "$LAUNCH_DIR/stokasir.frontend.plist"
      ok "Launchd service di-restart"
    else
      warn "Plist tidak ditemukan — service belum pernah diinstall. Jalankan mode install."
    fi

    # Reload nginx jika ada
    BREW_PREFIX=$(brew --prefix 2>/dev/null || echo "/opt/homebrew")
    if [[ -f "$BREW_PREFIX/etc/nginx/servers/stokasir.conf" ]]; then
      brew services restart nginx 2>/dev/null && ok "Nginx di-restart" || warn "Nginx restart gagal"
    fi
  else
    if systemctl list-unit-files stokasir-backend.service &>/dev/null; then
      sudo systemctl daemon-reload
      sudo systemctl restart stokasir-backend stokasir-frontend
      ok "Systemd service di-restart"
    else
      warn "Service tidak ditemukan — belum pernah diinstall. Jalankan mode install."
    fi

    # Reload nginx jika ada
    if [[ -f /etc/nginx/sites-enabled/stokasir ]]; then
      sudo nginx -t 2>/dev/null && sudo systemctl reload nginx && ok "Nginx di-reload" || warn "Nginx reload gagal"
    fi
  fi

  echo ""
  echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════╗${RESET}"
  echo -e "${BOLD}${GREEN}║        Stokasir berhasil di-repair!          ║${RESET}"
  echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════╝${RESET}"
  echo ""
  if [[ -f "$ENV_FILE" ]]; then
    PORT_FRONTEND_V=$(grep '^PORT=' "$ENV_FILE" | tail -1 | cut -d= -f2 || echo "5173")
    SERVER_IP_V=$(grep 'PUBLIC_API_URL' /etc/systemd/system/stokasir-frontend.service 2>/dev/null \
      | grep -oP 'https?://\K[^/]+' | cut -d: -f1 || echo "localhost")
    echo -e "  Akses: ${CYAN}http://$SERVER_IP_V:$PORT_FRONTEND_V${RESET}"
    echo ""
  fi
}

# ══════════════════════════════════════════════════════════════════════════════
# INSTALL
# ══════════════════════════════════════════════════════════════════════════════
do_install() {
  # ── Cek ARM32 (Raspberry Pi lama) ──────────────────────────────────────────
  if [[ "$ARCH" == "armv7l" ]]; then
    warn "ARM32 terdeteksi. Bun tidak support ARM32."
    warn "Gunakan Node.js LTS sebagai pengganti Bun:"
    warn "  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -"
    warn "  sudo apt install -y nodejs"
    error "Hentikan setup. Install Node.js LTS terlebih dahulu, lalu jalankan setup lagi."
  fi

  # ══════════════════════════════════════════════════════════════════════════
  header "1 / 6  Cek & Install Bun"
  # ══════════════════════════════════════════════════════════════════════════

  if command -v bun &>/dev/null; then
    BUN_VER=$(bun --version)
    ok "Bun sudah terinstall: v$BUN_VER"
  else
    info "Menginstall Bun..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
    if command -v bun &>/dev/null; then
      ok "Bun berhasil diinstall: v$(bun --version)"
    else
      error "Gagal install Bun. Coba manual: curl -fsSL https://bun.sh/install | bash"
    fi
  fi

  BUN_BIN=$(which bun)

  # ══════════════════════════════════════════════════════════════════════════
  header "2 / 6  Konfigurasi"
  # ══════════════════════════════════════════════════════════════════════════

  echo ""
  echo "Isi konfigurasi berikut (tekan Enter untuk pakai nilai default):"
  echo ""

  DEFAULT_DATA="$HOME/stokasir-data"
  read -rp "  Folder data (upload & database) [$DEFAULT_DATA]: " DATA_DIR
  DATA_DIR="${DATA_DIR:-$DEFAULT_DATA}"

  DETECTED_IP=""
  if command -v ip &>/dev/null; then
    DETECTED_IP=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' | head -1)
  elif command -v ipconfig &>/dev/null; then
    DETECTED_IP=$(ipconfig getifaddr en0 2>/dev/null || true)
  fi
  DEFAULT_IP="${DETECTED_IP:-192.168.1.x}"
  read -rp "  IP server ini (untuk akses HP) [$DEFAULT_IP]: " SERVER_IP
  SERVER_IP="${SERVER_IP:-$DEFAULT_IP}"

  DEFAULT_JWT=$(LC_ALL=C tr -dc 'A-Za-z0-9!@#$%^&*' </dev/urandom 2>/dev/null | head -c 48 || echo "ganti-secret-ini-$(date +%s)")
  read -rp "  JWT Secret (Enter = generate otomatis): " JWT_SECRET
  JWT_SECRET="${JWT_SECRET:-$DEFAULT_JWT}"

  read -rp "  Port backend  [3000]: " PORT_BACKEND
  PORT_BACKEND="${PORT_BACKEND:-3000}"
  read -rp "  Port frontend [5173]: " PORT_FRONTEND
  PORT_FRONTEND="${PORT_FRONTEND:-5173}"

  echo ""
  echo -e "  ${BOLD}Nginx & HTTPS${RESET}"
  read -rp "  Setup nginx sebagai reverse proxy (port 80)? [Y/n]: " _NGINX_INPUT
  SETUP_NGINX=true
  [[ "${_NGINX_INPUT,,}" == "n" ]] && SETUP_NGINX=false

  SETUP_HTTPS=false
  if $SETUP_NGINX; then
    read -rp "  Setup HTTPS dengan mkcert (direkomendasikan)? [Y/n]: " _HTTPS_INPUT
    [[ "${_HTTPS_INPUT,,}" != "n" ]] && SETUP_HTTPS=true
  fi

  # Tentukan PUBLIC_API_URL berdasarkan pilihan
  if $SETUP_HTTPS; then
    PUBLIC_URL="https://$SERVER_IP/api"
  elif $SETUP_NGINX; then
    PUBLIC_URL="http://$SERVER_IP/api"
  else
    PUBLIC_URL="http://$SERVER_IP:$PORT_BACKEND"
  fi

  CURRENT_USER="${USER:-$(whoami)}"

  echo ""
  info "Konfigurasi:"
  echo "  Data dir     : $DATA_DIR"
  echo "  IP server    : $SERVER_IP"
  echo "  Port backend : $PORT_BACKEND"
  echo "  Port frontend: $PORT_FRONTEND"
  echo "  Nginx        : $($SETUP_NGINX && echo 'ya' || echo 'tidak')"
  echo "  HTTPS        : $($SETUP_HTTPS && echo 'ya (mkcert)' || echo 'tidak')"
  echo "  API URL      : $PUBLIC_URL"
  echo ""
  read -rp "Lanjutkan? [Y/n]: " CONFIRM
  if [[ "${CONFIRM,,}" == "n" ]]; then
    echo "Dibatalkan."
    exit 0
  fi

  # ══════════════════════════════════════════════════════════════════════════
  header "3 / 6  Siapkan Folder & Install Dependencies"
  # ══════════════════════════════════════════════════════════════════════════

  info "Membuat folder data..."
  mkdir -p "$DATA_DIR/uploads/produk"
  mkdir -p "$DATA_DIR/uploads/invoice"
  mkdir -p "$DATA_DIR/uploads/karyawan"
  mkdir -p "$DATA_DIR/backup"
  mkdir -p "$DATA_DIR/logs"
  ok "Folder data siap: $DATA_DIR"

  info "Install backend dependencies..."
  cd "$SCRIPT_DIR/backend"
  bun install --production
  ok "Backend dependencies selesai"

  info "Build frontend..."
  cd "$SCRIPT_DIR/frontend"
  bun install
  bun run build
  ok "Frontend build selesai"

  # ══════════════════════════════════════════════════════════════════════════
  header "4 / 6  Generate Config & Service Files"
  # ══════════════════════════════════════════════════════════════════════════

  info "Menulis backend/.env..."
  cat > "$ENV_FILE" <<ENVEOF
DATABASE_URL=$DATA_DIR/data.db
UPLOAD_DIR=$DATA_DIR/uploads
PORT=$PORT_BACKEND
NODE_ENV=production
JWT_SECRET=$JWT_SECRET
ENVEOF
  ok "backend/.env ditulis"

  if [[ "$OS" == "mac" ]]; then
    LAUNCH_DIR="$HOME/Library/LaunchAgents"
    mkdir -p "$LAUNCH_DIR"

    info "Menulis launchd plist backend..."
    cat > "$LAUNCH_DIR/stokasir.backend.plist" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>stokasir.backend</string>
  <key>ProgramArguments</key>
  <array>
    <string>$BUN_BIN</string>
    <string>run</string>
    <string>src/index.ts</string>
  </array>
  <key>WorkingDirectory</key><string>$SCRIPT_DIR/backend</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>DATABASE_URL</key><string>file:$DATA_DIR/data.db</string>
    <key>UPLOAD_DIR</key><string>$DATA_DIR/uploads</string>
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
PLISTEOF
    ok "stokasir.backend.plist ditulis"

    info "Menulis launchd plist frontend..."
    cat > "$LAUNCH_DIR/stokasir.frontend.plist" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>stokasir.frontend</string>
  <key>ProgramArguments</key>
  <array>
    <string>$BUN_BIN</string>
    <string>build/index.js</string>
  </array>
  <key>WorkingDirectory</key><string>$SCRIPT_DIR/frontend</string>
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
PLISTEOF
    ok "stokasir.frontend.plist ditulis"

  else
    info "Menulis systemd service backend..."
    sudo tee /etc/systemd/system/stokasir-backend.service > /dev/null <<SVCEOF
[Unit]
Description=Stokasir Backend
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$SCRIPT_DIR/backend
ExecStart=$BUN_BIN run src/index.ts
Restart=on-failure
RestartSec=5
EnvironmentFile=$SCRIPT_DIR/backend/.env

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
WorkingDirectory=$SCRIPT_DIR/frontend
ExecStart=$BUN_BIN build/index.js
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

  # ══════════════════════════════════════════════════════════════════════════
  header "5 / 6  Setup Nginx & HTTPS"
  # ══════════════════════════════════════════════════════════════════════════

  if $SETUP_NGINX; then
    # ── Install nginx ───────────────────────────────────────────────────────
    if ! command -v nginx &>/dev/null; then
      info "Menginstall nginx..."
      if [[ "$OS" == "mac" ]]; then
        command -v brew &>/dev/null || error "Homebrew tidak ditemukan. Install: https://brew.sh"
        brew install nginx
      else
        sudo apt-get update -qq
        sudo apt-get install -y nginx
      fi
      ok "Nginx terinstall"
    else
      ok "Nginx sudah terinstall: $(nginx -v 2>&1 | head -1 | tr -d '\n')"
    fi

    # ── Install mkcert & generate cert ─────────────────────────────────────
    if $SETUP_HTTPS; then
      if ! command -v mkcert &>/dev/null; then
        info "Menginstall mkcert..."
        if [[ "$OS" == "mac" ]]; then
          brew install mkcert nss
        elif [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
          # Raspberry Pi ARM64
          curl -fsSLo /tmp/mkcert \
            https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-arm64
          chmod +x /tmp/mkcert && sudo mv /tmp/mkcert /usr/local/bin/mkcert
          sudo apt-get install -y libnss3-tools 2>/dev/null || true
        else
          # amd64 / x86_64
          if apt-cache show mkcert &>/dev/null 2>&1; then
            sudo apt-get install -y mkcert libnss3-tools
          else
            curl -fsSLo /tmp/mkcert \
              https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64
            chmod +x /tmp/mkcert && sudo mv /tmp/mkcert /usr/local/bin/mkcert
            sudo apt-get install -y libnss3-tools 2>/dev/null || true
          fi
        fi
        ok "mkcert terinstall"
      else
        ok "mkcert sudah terinstall"
      fi

      # Install local CA ke sistem
      info "Menginstall local CA..."
      mkcert -install
      ok "Local CA terinstall di sistem ini"

      # Generate sertifikat dengan nama file yang tetap
      info "Generate sertifikat untuk $SERVER_IP..."
      sudo mkdir -p /etc/nginx/certs
      mkcert \
        -cert-file /tmp/stokasir-cert.pem \
        -key-file  /tmp/stokasir-key.pem  \
        "$SERVER_IP" localhost 127.0.0.1
      sudo mv /tmp/stokasir-cert.pem /etc/nginx/certs/cert.pem
      sudo mv /tmp/stokasir-key.pem  /etc/nginx/certs/key.pem
      sudo chmod 640 /etc/nginx/certs/key.pem
      ok "Sertifikat disimpan ke /etc/nginx/certs/"

      # Salin rootCA ke folder uploads agar HP bisa download
      CA_ROOT=$(mkcert -CAROOT)
      cp "$CA_ROOT/rootCA.pem" "$DATA_DIR/uploads/rootCA.crt"
      ok "rootCA.crt disalin ke $DATA_DIR/uploads/ (HP bisa download via browser)"

      # Tulis nginx config HTTPS
      info "Menulis konfigurasi nginx (HTTP → HTTPS)..."
      if [[ "$OS" == "mac" ]]; then
        BREW_PREFIX=$(brew --prefix)
        NGINX_CONF_PATH="$BREW_PREFIX/etc/nginx/servers/stokasir.conf"
      else
        NGINX_CONF_PATH="/etc/nginx/sites-available/stokasir"
      fi

      sudo tee "$NGINX_CONF_PATH" > /dev/null <<NGINXEOF
# HTTP — hanya untuk download CA cert, sisanya redirect ke HTTPS
server {
    listen 80;
    server_name _;

    # Download CA cert via HTTP (tanpa redirect) agar HP bisa install sebelum trust HTTPS
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

    # nginx handle kompresi sendiri — jangan forward Accept-Encoding ke upstream
    # (adapter-bun serve .js.gz/.js.br precompressed; bentrok dengan gzip nginx → MIME error)
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_types text/plain text/css text/javascript application/javascript application/json image/svg+xml;

    # Download rootCA untuk HP karyawan — install 1x, no more warnings
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
        # Strip Accept-Encoding — nginx kompres sendiri, bukan Bun (hindari double-encoding)
        proxy_set_header      Accept-Encoding "";
    }
}
NGINXEOF

    else
      # HTTP only nginx config
      info "Menulis konfigurasi nginx (HTTP only)..."
      if [[ "$OS" == "mac" ]]; then
        BREW_PREFIX=$(brew --prefix)
        NGINX_CONF_PATH="$BREW_PREFIX/etc/nginx/servers/stokasir.conf"
      else
        NGINX_CONF_PATH="/etc/nginx/sites-available/stokasir"
      fi

      sudo tee "$NGINX_CONF_PATH" > /dev/null <<NGINXEOF
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

    # Enable site (Linux: symlink; Mac: file sudah di servers/)
    if [[ "$OS" != "mac" ]]; then
      sudo ln -sf /etc/nginx/sites-available/stokasir /etc/nginx/sites-enabled/stokasir
      sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    fi

    # Test & start nginx
    if sudo nginx -t 2>/dev/null; then
      if [[ "$OS" == "mac" ]]; then
        brew services restart nginx
      else
        sudo systemctl enable nginx
        sudo systemctl restart nginx
      fi
      ok "Nginx berjalan"
    else
      warn "Konfigurasi nginx ada masalah. Cek dengan: sudo nginx -t"
    fi

  else
    info "Nginx dilewati — akses langsung via port $PORT_FRONTEND"
  fi

  # ══════════════════════════════════════════════════════════════════════════
  header "6 / 6  Jalankan Stokasir"
  # ══════════════════════════════════════════════════════════════════════════

  if [[ "$OS" == "mac" ]]; then
    launchctl unload "$LAUNCH_DIR/stokasir.backend.plist"  2>/dev/null || true
    launchctl unload "$LAUNCH_DIR/stokasir.frontend.plist" 2>/dev/null || true

    info "Memulai proses via launchd..."
    launchctl load "$LAUNCH_DIR/stokasir.backend.plist"
    launchctl load "$LAUNCH_DIR/stokasir.frontend.plist"
    ok "Stokasir berjalan — auto-start aktif saat login"
  else
    info "Reload systemd dan aktifkan service..."
    sudo systemctl daemon-reload
    sudo systemctl enable stokasir-backend stokasir-frontend
    sudo systemctl restart stokasir-backend stokasir-frontend
    ok "Stokasir berjalan — auto-start aktif saat boot"
  fi

  # ── Ringkasan ──────────────────────────────────────────────────────────────
  echo ""
  echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════╗${RESET}"
  echo -e "${BOLD}${GREEN}║        Stokasir berhasil diinstall!          ║${RESET}"
  echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════╝${RESET}"
  echo ""

  if $SETUP_HTTPS; then
    echo -e "  Akses dari HP/browser : ${CYAN}https://$SERVER_IP/${RESET}"
    echo -e "  (HTTP otomatis redirect ke HTTPS)"
  elif $SETUP_NGINX; then
    echo -e "  Akses dari HP/browser : ${CYAN}http://$SERVER_IP/${RESET}"
  else
    echo -e "  Akses dari HP/browser : ${CYAN}http://$SERVER_IP:$PORT_FRONTEND${RESET}"
  fi

  echo -e "  API health check      : ${CYAN}http://localhost:$PORT_BACKEND/health${RESET}"
  echo ""

  if $SETUP_HTTPS; then
    echo -e "  ${BOLD}HTTPS — Install CA di HP karyawan (1x saja):${RESET}"
    echo -e "  1. Buka browser HP → ${CYAN}https://$SERVER_IP/rootCA.crt${RESET}"
    echo -e "  2. Download & install sebagai CA Certificate"
    echo -e "     Android: Settings → Security → Install certificate → CA Certificate"
    echo -e "     iPhone : Settings → General → VPN & Device Management → install profile"
    echo -e "             lalu Settings → General → About → Certificate Trust Settings → aktifkan"
    echo ""
  fi

  if $SETUP_NGINX; then
    echo -e "  Perintah nginx:"
    if [[ "$OS" == "mac" ]]; then
      echo -e "    ${YELLOW}brew services status nginx${RESET}       — status"
      echo -e "    ${YELLOW}brew services restart nginx${RESET}      — restart"
    else
      echo -e "    ${YELLOW}sudo systemctl status nginx${RESET}      — status"
      echo -e "    ${YELLOW}sudo systemctl reload nginx${RESET}      — reload config"
      echo -e "    ${YELLOW}sudo nginx -t${RESET}                    — test config"
    fi
    echo ""
  fi

  if [[ "$OS" == "mac" ]]; then
    echo -e "  Perintah launchd:"
    echo -e "    ${YELLOW}launchctl list | grep stokasir${RESET}          — status proses"
    echo -e "    ${YELLOW}tail -f $DATA_DIR/logs/backend.log${RESET}      — log backend"
    echo -e "    ${YELLOW}tail -f $DATA_DIR/logs/frontend.log${RESET}     — log frontend"
    echo -e "    ${YELLOW}launchctl kickstart gui/\$(id -u)/stokasir.backend${RESET}  — restart backend"
    echo -e "    ${YELLOW}launchctl kickstart gui/\$(id -u)/stokasir.frontend${RESET} — restart frontend"
  else
    echo -e "  Perintah systemd:"
    echo -e "    ${YELLOW}sudo systemctl status stokasir-backend${RESET}   — status backend"
    echo -e "    ${YELLOW}sudo systemctl status stokasir-frontend${RESET}  — status frontend"
    echo -e "    ${YELLOW}journalctl -u stokasir-backend -f${RESET}         — log backend"
    echo -e "    ${YELLOW}journalctl -u stokasir-frontend -f${RESET}        — log frontend"
    echo -e "    ${YELLOW}sudo systemctl restart stokasir-backend${RESET}  — restart"
  fi

  echo ""
  echo -e "  Data tersimpan di: ${CYAN}$DATA_DIR${RESET}"
  echo ""
  echo -e "  Repair/uninstall: ${CYAN}bash scripts/setup.sh repair|uninstall${RESET}"
  echo ""
}

# ── Route ────────────────────────────────────────────────────────────────────
case "$MODE" in
  install)   do_install ;;
  uninstall) do_uninstall ;;
  repair)    do_repair ;;
  *) error "Mode tidak valid: '$MODE'. Gunakan: install | repair | uninstall" ;;
esac
