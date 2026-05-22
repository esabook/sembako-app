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
header "1 / 6  Cek & Install Bun"
# ══════════════════════════════════════════════════════════════════════════════

if command -v bun &>/dev/null; then
  BUN_VER=$(bun --version)
  ok "Bun sudah terinstall: v$BUN_VER"
else
  info "Menginstall Bun..."
  curl -fsSL https://bun.sh/install | bash
  # Tambah ke PATH sesi ini
  export PATH="$HOME/.bun/bin:$PATH"
  if command -v bun &>/dev/null; then
    ok "Bun berhasil diinstall: v$(bun --version)"
  else
    error "Gagal install Bun. Coba manual: curl -fsSL https://bun.sh/install | bash"
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
header "2 / 6  Cek & Install Node.js + PM2"
# ══════════════════════════════════════════════════════════════════════════════

if ! command -v node &>/dev/null; then
  info "Node.js tidak ditemukan. Menginstall..."
  if [[ "$OS" == "mac" ]]; then
    if command -v brew &>/dev/null; then
      brew install node
    else
      error "Homebrew tidak ditemukan. Install Homebrew dulu: https://brew.sh\nAtau install Node.js manual dari: https://nodejs.org"
    fi
  else
    # Linux / Pi
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt install -y nodejs
  fi
  ok "Node.js berhasil diinstall: v$(node --version)"
else
  ok "Node.js sudah terinstall: v$(node --version)"
fi

if ! command -v pm2 &>/dev/null; then
  info "Menginstall PM2..."
  npm install -g pm2
  ok "PM2 berhasil diinstall: v$(pm2 --version)"
else
  ok "PM2 sudah terinstall: v$(pm2 --version)"
fi

# ══════════════════════════════════════════════════════════════════════════════
header "3 / 6  Konfigurasi"
# ══════════════════════════════════════════════════════════════════════════════

echo ""
echo "Isi konfigurasi berikut (tekan Enter untuk pakai nilai default):"
echo ""

# Data directory
if [[ "$OS" == "mac" ]]; then
  DEFAULT_DATA="$HOME/stokasir-data"
else
  DEFAULT_DATA="$HOME/stokasir-data"
fi
read -rp "  Folder data (upload & database) [$DEFAULT_DATA]: " DATA_DIR
DATA_DIR="${DATA_DIR:-$DEFAULT_DATA}"

# IP server
DETECTED_IP=""
if command -v ip &>/dev/null; then
  DETECTED_IP=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' | head -1)
elif command -v ipconfig &>/dev/null; then
  DETECTED_IP=$(ipconfig getifaddr en0 2>/dev/null || true)
fi
DEFAULT_IP="${DETECTED_IP:-192.168.1.x}"
read -rp "  IP server ini (untuk akses HP) [$DEFAULT_IP]: " SERVER_IP
SERVER_IP="${SERVER_IP:-$DEFAULT_IP}"

# JWT Secret
DEFAULT_JWT=$(LC_ALL=C tr -dc 'A-Za-z0-9!@#$%^&*' </dev/urandom 2>/dev/null | head -c 48 || echo "ganti-secret-ini-$(date +%s)")
read -rp "  JWT Secret (Enter = generate otomatis): " JWT_SECRET
JWT_SECRET="${JWT_SECRET:-$DEFAULT_JWT}"

# Port
read -rp "  Port backend  [3000]: " PORT_BACKEND
PORT_BACKEND="${PORT_BACKEND:-3000}"
read -rp "  Port frontend [5173]: " PORT_FRONTEND
PORT_FRONTEND="${PORT_FRONTEND:-5173}"

echo ""
info "Konfigurasi:"
echo "  Data dir    : $DATA_DIR"
echo "  IP server   : $SERVER_IP"
echo "  Port backend: $PORT_BACKEND"
echo "  Port frontend: $PORT_FRONTEND"
echo ""
read -rp "Lanjutkan? [Y/n]: " CONFIRM
if [[ "${CONFIRM,,}" == "n" ]]; then
  echo "Dibatalkan."
  exit 0
fi

# ══════════════════════════════════════════════════════════════════════════════
header "4 / 6  Siapkan Folder & Install Dependencies"
# ══════════════════════════════════════════════════════════════════════════════

info "Membuat folder data..."
mkdir -p "$DATA_DIR/uploads/produk"
mkdir -p "$DATA_DIR/uploads/invoice"
mkdir -p "$DATA_DIR/uploads/karyawan"
mkdir -p "$DATA_DIR/backup"
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
header "5 / 6  Generate Config Files"
# ══════════════════════════════════════════════════════════════════════════════

info "Menulis backend/.env..."
cat > "$SCRIPT_DIR/backend/.env" <<EOF
DATABASE_URL=file:$DATA_DIR/data.db
UPLOAD_DIR=$DATA_DIR/uploads
PORT=$PORT_BACKEND
NODE_ENV=production
JWT_SECRET=$JWT_SECRET
EOF
ok "backend/.env ditulis"

info "Menulis ecosystem.config.js..."
cat > "$SCRIPT_DIR/ecosystem.config.js" <<EOF
module.exports = { apps: [
  {
    name: 'stokasir-backend',
    script: 'src/index.ts',
    interpreter: 'bun',
    cwd: '$SCRIPT_DIR/backend',
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
      PORT: '$PORT_BACKEND',
      DATABASE_URL: 'file:$DATA_DIR/data.db',
      UPLOAD_DIR: '$DATA_DIR/uploads',
      JWT_SECRET: '$JWT_SECRET'
    }
  },
  {
    name: 'stokasir-frontend',
    script: 'build/index.js',
    interpreter: 'bun',
    cwd: '$SCRIPT_DIR/frontend',
    max_memory_restart: '150M',
    env: {
      NODE_ENV: 'production',
      PORT: '$PORT_FRONTEND',
      HOST: '0.0.0.0',
      PUBLIC_API_URL: 'http://$SERVER_IP/api'
    }
  }
]}
EOF
ok "ecosystem.config.js ditulis"

# ══════════════════════════════════════════════════════════════════════════════
header "6 / 6  Jalankan Stokasir"
# ══════════════════════════════════════════════════════════════════════════════

cd "$SCRIPT_DIR"

# Stop proses lama jika ada
pm2 delete stokasir-backend stokasir-frontend 2>/dev/null || true

info "Memulai proses dengan PM2..."
pm2 start ecosystem.config.js

info "Mengatur autostart saat boot..."
# pm2 startup menghasilkan perintah yang perlu dijalankan manual jika butuh sudo
STARTUP_CMD=$(pm2 startup 2>&1 | grep 'sudo env' | head -1)
if [[ -n "$STARTUP_CMD" ]]; then
  warn "Untuk autostart, jalankan perintah ini:"
  echo -e "  ${YELLOW}$STARTUP_CMD${RESET}"
fi

pm2 save

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
echo -e "  Perintah PM2:"
echo -e "    ${YELLOW}pm2 status${RESET}              — lihat status proses"
echo -e "    ${YELLOW}pm2 logs${RESET}                — lihat log"
echo -e "    ${YELLOW}pm2 restart all${RESET}         — restart semua"
echo ""
echo -e "  Data tersimpan di: ${CYAN}$DATA_DIR${RESET}"
echo ""
