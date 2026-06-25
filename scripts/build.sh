#!/usr/bin/env bash
# ============================================================
# scripts/build.sh — Build Stokasir untuk production
#
# Usage:
#   ./scripts/build.sh              # bundle mode (butuh Bun di target)
#   ./scripts/build.sh --compile    # compile binary semua platform
#   ./scripts/build.sh --windows    # compile .exe saja
#   ./scripts/build.sh --pi         # compile Pi ARM64 saja
# ============================================================

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# ── Warna ────────────────────────────────────────────────────
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()   { echo -e "${CYAN}  >> $*${NC}"; }
ok()     { echo -e "${GREEN}  OK $*${NC}"; }
header() { echo -e "\n${CYAN}== $* ==${NC}"; }

# ── Parse args ───────────────────────────────────────────────
MODE="bundle"
for arg in "$@"; do
    case $arg in
        --compile) MODE="compile-all" ;;
        --windows) MODE="compile-windows" ;;
        --linux)   MODE="compile-linux" ;;
        --pi)      MODE="compile-pi" ;;
        --mac)     MODE="compile-mac" ;;
    esac
done

START_TIME=$SECONDS

# ════════════════════════════════════════════════════════════
header "1 / 3  Frontend — SvelteKit + Vite"
# ════════════════════════════════════════════════════════════
cd "$ROOT/frontend"
info "Install dependencies frontend..."
bun install --frozen-lockfile 2>/dev/null || bun install
info "Build frontend (minify + precompress)..."
NODE_ENV=production bun run build
ok "Frontend → frontend/build/ ($(du -sh build | cut -f1))"

# ════════════════════════════════════════════════════════════
header "2 / 3  Backend — Bun"
# ════════════════════════════════════════════════════════════
cd "$ROOT/backend"
mkdir -p dist

if [ "$MODE" = "bundle" ]; then
    info "Bundle backend → dist/server.js (butuh Bun di target)..."
    bun build --minify --target=bun --sourcemap=none \
        ./src/index.ts --outfile dist/server.js
    ok "Backend → backend/dist/server.js ($(du -sh dist/server.js | cut -f1))"

elif [ "$MODE" = "compile-all" ]; then
    info "Compile binary semua platform..."
    bun build --compile --minify --target=bun-windows-x64  ./src/index.ts --outfile dist/stokasir-windows.exe --windows-hide-console
    ok "Windows  → $(du -sh dist/stokasir-windows.exe | cut -f1)"
    bun build --compile --minify --target=bun-linux-x64    ./src/index.ts --outfile dist/stokasir-linux
    ok "Linux    → $(du -sh dist/stokasir-linux | cut -f1)"
    bun build --compile --minify --target=bun-linux-arm64  ./src/index.ts --outfile dist/stokasir-pi
    ok "Pi ARM64 → $(du -sh dist/stokasir-pi | cut -f1)"
    bun build --compile --minify --target=bun-darwin-arm64 ./src/index.ts --outfile dist/stokasir-mac-arm
    ok "Mac ARM  → $(du -sh dist/stokasir-mac-arm | cut -f1)"
    bun build --compile --minify --target=bun-darwin-x64  ./src/index.ts --outfile dist/stokasir-mac-x64
    ok "Mac x64  → $(du -sh dist/stokasir-mac-x64 | cut -f1)"

elif [ "$MODE" = "compile-windows" ]; then
    info "Compile binary Windows x64..."
    bun build --compile --minify --target=bun-windows-x64 \
        ./src/index.ts --outfile dist/stokasir-windows.exe 
    ok "Windows → $(du -sh dist/stokasir-windows.exe | cut -f1)"

elif [ "$MODE" = "compile-linux" ]; then
    info "Compile binary Linux x64..."
    bun build --compile --minify --target=bun-linux-x64 \
        ./src/index.ts --outfile dist/stokasir-linux
    ok "Linux → $(du -sh dist/stokasir-linux | cut -f1)"

elif [ "$MODE" = "compile-pi" ]; then
    info "Compile binary Raspberry Pi ARM64..."
    bun build --compile --minify --target=bun-linux-arm64 \
        ./src/index.ts --outfile dist/stokasir-pi
    ok "Pi ARM64 → $(du -sh dist/stokasir-pi | cut -f1)"

elif [ "$MODE" = "compile-mac" ]; then
    info "Compile binary Mac ARM + x64..."
    bun build --compile --minify --target=bun-darwin-arm64 ./src/index.ts --outfile dist/stokasir-mac-arm
    ok "Mac ARM  → $(du -sh dist/stokasir-mac-arm | cut -f1)"
    bun build --compile --minify --target=bun-darwin-x64   ./src/index.ts --outfile dist/stokasir-mac-x64
    ok "Mac x64  → $(du -sh dist/stokasir-mac-x64 | cut -f1)"
fi

# ════════════════════════════════════════════════════════════
header "3 / 3  Migrasi database (jika ada skema baru)"
# ════════════════════════════════════════════════════════════
cd "$ROOT/backend"
if bun run db:migrate 2>&1 | grep -q "No pending"; then
    ok "Tidak ada migrasi baru"
else
    ok "Migrasi selesai"
fi

# ── Ringkasan ─────────────────────────────────────────────────
ELAPSED=$((SECONDS - START_TIME))
echo ""
echo -e "${GREEN}+================================================+${NC}"
echo -e "${GREEN}|          Build selesai dalam ${ELAPSED}s               |${NC}"
echo -e "${GREEN}+================================================+${NC}"
echo ""
echo -e "  Frontend : ${CYAN}frontend/build/${NC}"

if [ "$MODE" = "bundle" ]; then
    echo -e "  Backend  : ${CYAN}backend/dist/server.js${NC}"
    echo ""
    echo -e "  Jalankan : ${YELLOW}bun backend/dist/server.js${NC}"
else
    echo -e "  Backend  : ${CYAN}backend/dist/${NC}"
    ls -lh "$ROOT/backend/dist/" 2>/dev/null | grep stokasir | awk '{print "    " $NF " (" $5 ")"}'
fi
echo ""
