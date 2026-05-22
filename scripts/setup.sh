#!/usr/bin/env bash
# setup.sh — Installer Stokasir untuk Linux / Mac / Raspberry Pi
# Jalankan dari folder root project: bash scripts/setup.sh
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

echo ""
echo -e "${BOLD}╔══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║      Stokasir — Setup Installer      ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════╝${RESET}"
echo -e "  Platform : ${CYAN}$OS ($ARCH)${RESET}"
echo -e "  Folder   : ${CYAN}$SCRIPT_DIR${RESET}"
echo ""

# ── Cek ARM32 (Raspberry Pi lama) ────────────────────────────────────────────
if [[ "$ARCH" == "armv7l" ]]; then
  warn "ARM32 terdeteksi. Bun tidak support ARM32."
  warn "Gunakan Node.js LTS sebagai pengganti Bun:"
  warn "  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -"
  warn "  sudo apt install -y nodejs"
  error "Hentikan setup. Install Node.js LTS terlebih dahulu, lalu jalankan setup lagi."
fi

# ══════════════════════════════════════════════════════════════════════════════
header "1 / 5  Cek & Install Bun"
# ══════════════════════════════════════════════════════════════════════════════

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

# ══════════════════════════════════════════════════════════════════════════════
header "2 / 5  Konfigurasi"
# ══════════════════════════════════════════════════════════════════════════════

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

CURRENT_USER="${USER:-$(whoami)}"

echo ""
info "Konfigurasi:"
echo "  Data dir     : $DATA_DIR"
echo "  IP server    : $SERVER_IP"
echo "  Port backend : $PORT_BACKEND"
echo "  Port frontend: $PORT_FRONTEND"
echo ""
read -rp "Lanjutkan? [Y/n]: " CONFIRM
if [[ "${CONFIRM,,}" == "n" ]]; then
  echo "Dibatalkan."
  exit 0
fi

# ══════════════════════════════════════════════════════════════════════════════
header "3 / 5  Siapkan Folder & Install Dependencies"
# ══════════════════════════════════════════════════════════════════════════════

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
bun install --production
bun run build
ok "Frontend build selesai"

# ══════════════════════════════════════════════════════════════════════════════
header "4 / 5  Generate Config & Service Files"
# ══════════════════════════════════════════════════════════════════════════════

info "Menulis backend/.env..."
cat > "$SCRIPT_DIR/backend/.env" <<ENVEOF
DATABASE_URL=file:$DATA_DIR/data.db
UPLOAD_DIR=$DATA_DIR/uploads
PORT=$PORT_BACKEND
NODE_ENV=production
JWT_SECRET=$JWT_SECRET
ENVEOF
ok "backend/.env ditulis"

if [[ "$OS" == "mac" ]]; then
  # ── macOS: launchd plist di ~/Library/LaunchAgents/ ──────────────────────
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
    <key>PUBLIC_API_URL</key><string>http://$SERVER_IP/api</string>
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
  # ── Linux / Pi: systemd service di /etc/systemd/system/ ─────────────────
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
Environment=PUBLIC_API_URL=http://$SERVER_IP/api

[Install]
WantedBy=multi-user.target
SVCEOF
  ok "stokasir-frontend.service ditulis"
fi

# ══════════════════════════════════════════════════════════════════════════════
header "5 / 5  Jalankan Stokasir"
# ══════════════════════════════════════════════════════════════════════════════

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

# ── Ringkasan ────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║        Stokasir berhasil diinstall!          ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  Akses dari browser  : ${CYAN}http://$SERVER_IP:$PORT_FRONTEND${RESET}"
echo -e "  (via Nginx port 80) : ${CYAN}http://$SERVER_IP/${RESET}  ← jika Nginx sudah setup"
echo -e "  API health check    : ${CYAN}http://localhost:$PORT_BACKEND/health${RESET}"
echo ""

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
