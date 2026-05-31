#!/usr/bin/env bash
# ============================================================
# scripts/prebuilt.sh — Prebuild Stokasir untuk distribusi offline
#
# Jalankan di mesin developer/build. Hasilnya dipakai oleh
# setup-prebuilt.sh di mesin target tanpa perlu build atau mkcert.
#
# Usage:
#   ./scripts/prebuilt.sh                        # bundle mode, tanya IP interaktif
#   ./scripts/prebuilt.sh --ip=192.168.1.10      # sertakan IP di cert (bisa diulang)
#   ./scripts/prebuilt.sh --ip=192.168.1.10 --ip=192.168.1.11
#   ./scripts/prebuilt.sh --compile              # compile binary (tidak butuh bun di target)
#   ./scripts/prebuilt.sh --no-cert              # skip generate mkcert
#   ./scripts/prebuilt.sh --clean                # hapus output lama saja
#
# Output: scripts/prebuilt/
#   app/
#     backend/server.js      ← bundle (atau di bin/ jika --compile)
#     backend/migrations/    ← drizzle SQL files
#     frontend/              ← SvelteKit build
#   certs/
#     cert.pem               ← sertifikat server (nginx)
#     key.pem                ← private key (nginx)
#     rootCA.pem             ← CA root — HP karyawan install 1x untuk trust HTTPS
#   bin/                     ← (compile mode saja) backend binary per platform
#   manifest.json            ← metadata build
# ============================================================

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BOLD='\033[1m'; RED='\033[0;31m'; NC='\033[0m'
info()   { echo -e "${CYAN}  >> $*${NC}"; }
ok()     { echo -e "${GREEN}  ✓ $*${NC}"; }
header() { echo -e "\n${CYAN}${BOLD}══ $* ══${NC}"; }
warn()   { echo -e "${YELLOW}  !! $*${NC}"; }
error()  { echo -e "${RED}  ✗ $*${NC}"; exit 1; }

# ── Parse args ───────────────────────────────────────────────
COMPILE_MODE=false
SKIP_CERT=false
CLEAN_ONLY=false
EXTRA_IPS=()

for arg in "$@"; do
    case $arg in
        --compile)    COMPILE_MODE=true ;;
        --no-cert)    SKIP_CERT=true ;;
        --clean)      CLEAN_ONLY=true ;;
        --ip=*)       EXTRA_IPS+=("${arg#--ip=}") ;;
    esac
done

PREBUILT_DIR="$ROOT/scripts/prebuilt"
START_TIME=$SECONDS

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║    Stokasir — Prebuilt Generator         ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"

# ── Clean only ───────────────────────────────────────────────
if $CLEAN_ONLY; then
    info "Menghapus $PREBUILT_DIR..."
    rm -rf "$PREBUILT_DIR"
    ok "scripts/prebuilt/ dihapus"
    exit 0
fi

# ── Cek bun ──────────────────────────────────────────────────
if ! command -v bun &>/dev/null; then
    export PATH="$HOME/.bun/bin:$PATH"
    command -v bun &>/dev/null || error "Bun tidak ditemukan. Install: curl -fsSL https://bun.sh/install | bash"
fi
BUN_VER=$(bun --version)
echo -e "  Bun    : ${CYAN}v$BUN_VER${NC}"
echo -e "  Mode   : ${CYAN}$($COMPILE_MODE && echo 'compile (standalone binary)' || echo 'bundle (butuh bun di target)')${NC}"
echo -e "  Output : ${CYAN}scripts/prebuilt/${NC}"
echo ""

# ════════════════════════════════════════════════════════════
header "1 / 4  Build Frontend"
# ════════════════════════════════════════════════════════════
cd "$ROOT/frontend"
info "Install frontend dependencies..."
bun install --frozen-lockfile 2>/dev/null || bun install
info "Build frontend (production)..."
NODE_ENV=production bun run build
ok "Frontend → frontend/build/ ($(du -sh build | cut -f1))"

# ════════════════════════════════════════════════════════════
header "2 / 4  Build Backend"
# ════════════════════════════════════════════════════════════
cd "$ROOT/backend"
mkdir -p dist

if $COMPILE_MODE; then
    info "Compile binary Linux x64..."
    bun build --compile --minify --target=bun-linux-x64 \
        ./src/index.ts --outfile dist/stokasir-linux
    ok "Linux    → $(du -sh dist/stokasir-linux | cut -f1)"

    info "Compile binary Pi ARM64..."
    bun build --compile --minify --target=bun-linux-arm64 \
        ./src/index.ts --outfile dist/stokasir-pi
    ok "Pi ARM64 → $(du -sh dist/stokasir-pi | cut -f1)"

    info "Compile binary Mac ARM64..."
    bun build --compile --minify --target=bun-darwin-arm64 \
        ./src/index.ts --outfile dist/stokasir-mac-arm
    ok "Mac ARM  → $(du -sh dist/stokasir-mac-arm | cut -f1)"

    info "Compile binary Mac x64..."
    bun build --compile --minify --target=bun-darwin-x64 \
        ./src/index.ts --outfile dist/stokasir-mac-x64
    ok "Mac x64  → $(du -sh dist/stokasir-mac-x64 | cut -f1)"
else
    info "Bundle backend → dist/server.js..."
    bun build --minify --target=bun --sourcemap=none \
        ./src/index.ts --outfile dist/server.js
    ok "Backend  → backend/dist/server.js ($(du -sh dist/server.js | cut -f1))"
fi

# ════════════════════════════════════════════════════════════
header "3 / 4  Kumpulkan Artifacts"
# ════════════════════════════════════════════════════════════

info "Membuat struktur output..."
rm -rf "$PREBUILT_DIR"
mkdir -p "$PREBUILT_DIR/app/backend"
mkdir -p "$PREBUILT_DIR/app/frontend"
mkdir -p "$PREBUILT_DIR/certs"
$COMPILE_MODE && mkdir -p "$PREBUILT_DIR/bin"

# Frontend build
info "Salin frontend build..."
cp -r "$ROOT/frontend/build/." "$PREBUILT_DIR/app/frontend/"
ok "Frontend disalin ($(du -sh "$PREBUILT_DIR/app/frontend" | cut -f1))"

# Backend
if $COMPILE_MODE; then
    info "Salin binary backend..."
    for bin in stokasir-linux stokasir-pi stokasir-mac-arm stokasir-mac-x64; do
        if [[ -f "$ROOT/backend/dist/$bin" ]]; then
            cp "$ROOT/backend/dist/$bin" "$PREBUILT_DIR/bin/"
            chmod +x "$PREBUILT_DIR/bin/$bin"
        fi
    done
    ok "Binary backend disalin"
else
    info "Salin bundle backend..."
    cp "$ROOT/backend/dist/server.js" "$PREBUILT_DIR/app/backend/server.js"
    ok "server.js disalin ($(du -sh "$PREBUILT_DIR/app/backend/server.js" | cut -f1))"
fi

# Drizzle migrations
info "Salin migrations database..."
cp -r "$ROOT/backend/src/db/migrations" "$PREBUILT_DIR/app/backend/migrations"
MIGRATION_COUNT=$(find "$PREBUILT_DIR/app/backend/migrations" -name "*.sql" | wc -l | tr -d ' ')
ok "Migrations disalin ($MIGRATION_COUNT file SQL)"

# ════════════════════════════════════════════════════════════
header "4 / 4  Generate Sertifikat mkcert"
# ════════════════════════════════════════════════════════════

if $SKIP_CERT; then
    warn "Generate sertifikat dilewati (--no-cert)"
    warn "Setup target harus setup HTTPS manual atau tanpa HTTPS"
else
    # Cek mkcert tersedia
    if ! command -v mkcert &>/dev/null; then
        warn "mkcert tidak ditemukan di mesin ini."
        warn "Install mkcert:"
        warn "  Linux : sudo apt install mkcert  ||  brew install mkcert"
        warn "  Mac   : brew install mkcert nss"
        warn "Lanjut tanpa cert — gunakan --no-cert untuk suppress peringatan ini."
        SKIP_CERT=true
    fi
fi

if ! $SKIP_CERT; then
    # Tanya IP jika belum ada dari args
    if [[ ${#EXTRA_IPS[@]} -eq 0 ]]; then
        echo ""
        echo "  Cert akan di-generate untuk: localhost, 127.0.0.1, stokasir.local"
        echo "  IP server LAN disertakan supaya HP karyawan bisa HTTPS langsung ke IP."
        echo ""

        # Auto-detect IP
        DETECTED_IP=""
        if command -v ip &>/dev/null; then
            DETECTED_IP=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' | head -1 || true)
        fi
        [[ -z "$DETECTED_IP" ]] && command -v hostname &>/dev/null && \
            DETECTED_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
        DEFAULT_IP="${DETECTED_IP:-}"

        if [[ -n "$DEFAULT_IP" ]]; then
            echo "  IP terdeteksi: ${CYAN}$DEFAULT_IP${NC} (akan disertakan otomatis)"
        fi

        read -rp "  IP tambahan? (Enter = pakai deteksi otomatis, spasi untuk beberapa IP) [${DEFAULT_IP:-kosong}]: " IP_INPUT
        # Jika Enter tanpa input: pakai IP yang terdeteksi
        IP_INPUT="${IP_INPUT:-$DEFAULT_IP}"
        if [[ -n "$IP_INPUT" ]]; then
            read -ra EXTRA_IPS <<< "$IP_INPUT"
        fi
    fi

    # Bangun daftar domain untuk mkcert
    CERT_HOSTS=(localhost 127.0.0.1 stokasir.local *.stokasir.local)
    for ip in "${EXTRA_IPS[@]}"; do
        CERT_HOSTS+=("$ip")
    done

    echo ""
    info "Generate sertifikat untuk: ${CERT_HOSTS[*]}"

    # Pastikan local CA sudah di-install
    mkcert -install
    ok "Local CA terinstall"

    # Generate cert ke folder sementara lalu salin
    TMP_CERT_DIR=$(mktemp -d)
    mkcert \
        -cert-file "$TMP_CERT_DIR/cert.pem" \
        -key-file  "$TMP_CERT_DIR/key.pem"  \
        "${CERT_HOSTS[@]}"

    cp "$TMP_CERT_DIR/cert.pem" "$PREBUILT_DIR/certs/cert.pem"
    cp "$TMP_CERT_DIR/key.pem"  "$PREBUILT_DIR/certs/key.pem"
    rm -rf "$TMP_CERT_DIR"

    # Salin rootCA.pem agar HP karyawan bisa install trust
    CA_ROOT=$(mkcert -CAROOT)
    cp "$CA_ROOT/rootCA.pem" "$PREBUILT_DIR/certs/rootCA.pem"

    ok "cert.pem    → scripts/prebuilt/certs/cert.pem"
    ok "key.pem     → scripts/prebuilt/certs/key.pem"
    ok "rootCA.pem  → scripts/prebuilt/certs/rootCA.pem"

    # Simpan daftar host ke metadata
    CERT_HOSTS_JSON=$(printf '"%s",' "${CERT_HOSTS[@]}" | sed 's/,$//')
    CERT_HOSTS_META="[$CERT_HOSTS_JSON]"
else
    CERT_HOSTS_META="[]"
fi

# ── Tulis manifest ───────────────────────────────────────────
GIT_REF=$(git -C "$ROOT" describe --tags --always 2>/dev/null || echo "dev")
BUILD_MODE=$($COMPILE_MODE && echo 'compile' || echo 'bundle')
cat > "$PREBUILT_DIR/manifest.json" <<JSON
{
  "app": "stokasir",
  "version": "$GIT_REF",
  "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "bunVersion": "$BUN_VER",
  "mode": "$BUILD_MODE",
  "hasCerts": $($SKIP_CERT && echo 'false' || echo 'true'),
  "certHosts": $CERT_HOSTS_META
}
JSON
ok "manifest.json ditulis"

# ── Ringkasan ────────────────────────────────────────────────
ELAPSED=$((SECONDS - START_TIME))
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║       Prebuilt selesai dalam ${ELAPSED}s               ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Output : ${CYAN}scripts/prebuilt/${NC}  ($(du -sh "$PREBUILT_DIR" | cut -f1))"
echo ""
echo -e "  ${BOLD}Isi:${NC}"
echo -e "    app/backend/    ← backend bundle + migrations"
echo -e "    app/frontend/   ← SvelteKit build"
if ! $SKIP_CERT; then
    echo -e "    certs/          ← cert.pem, key.pem, rootCA.pem"
    echo -e "                      (valid untuk: ${CERT_HOSTS[*]})"
fi
echo ""
echo -e "  ${BOLD}Instalasi di target:${NC}"
echo -e "    ${YELLOW}bash scripts/setup-prebuilt.sh install${NC}"
echo ""
if ! $SKIP_CERT; then
    echo -e "  ${YELLOW}⚠  rootCA.pem harus diinstall di HP karyawan (1x saja).${NC}"
    echo -e "  ${YELLOW}   setup-prebuilt.sh akan menyediakan URL download-nya.${NC}"
    echo ""
fi
