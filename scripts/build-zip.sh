#!/usr/bin/env bash
# build-zip.sh — Buat paket distribusi Stokasir (dijalankan developer)
# Hasil: dist/stokasir-vX.Y.zip
#
# Jalankan dari root project: bash scripts/build-zip.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

# Ambil versi dari package.json frontend
VERSION=$(node -p "require('./frontend/package.json').version" 2>/dev/null || echo "1.0")
DIST_DIR="$SCRIPT_DIR/build"
ZIP_NAME="stokasir-v$VERSION.zip"

echo "→ Build Stokasir v$VERSION"

# ── Build frontend ────────────────────────────────────────────────────────────
echo "→ Build frontend..."
cd frontend
bun install --production
bun run build
cd "$SCRIPT_DIR"
echo "✓ Frontend build selesai"

# ── Siapkan folder staging ────────────────────────────────────────────────────
STAGING="$DIST_DIR/stokasir"
rm -rf "$STAGING"
mkdir -p "$STAGING"

echo "→ Menyalin file..."

# Backend (source + lockfile, tanpa node_modules)
rsync -a --exclude='node_modules' --exclude='.env' --exclude='data.db' \
  backend/ "$STAGING/backend/"

# Frontend (source + build hasil kompilasi, tanpa node_modules + .svelte-kit)
rsync -a --exclude='node_modules' --exclude='.svelte-kit' \
  frontend/ "$STAGING/frontend/"

# Scripts
cp -r scripts/ "$STAGING/scripts/"
chmod +x "$STAGING/scripts/setup.sh"
chmod +x "$STAGING/scripts/build-zip.sh"

# Docs & config
cp README-INSTALL.md "$STAGING/" 2>/dev/null || true
cp DEPLOY.md         "$STAGING/"
cp README.md         "$STAGING/"

# ── Buat ZIP ──────────────────────────────────────────────────────────────────
mkdir -p "$DIST_DIR"
cd "$DIST_DIR"

if command -v zip &>/dev/null; then
  zip -r "$ZIP_NAME" stokasir/ -x "*.DS_Store" -x "*__pycache__*"
  echo "✓ ZIP: $DIST_DIR/$ZIP_NAME"
elif command -v tar &>/dev/null; then
  TAR_NAME="stokasir-v$VERSION.tar.gz"
  tar czf "$TAR_NAME" stokasir/ --exclude='*.DS_Store'
  echo "✓ TAR: $DIST_DIR/$TAR_NAME"
else
  echo "✗ zip dan tar tidak ditemukan. Install zip: sudo apt install zip"
  exit 1
fi

rm -rf "$STAGING"

ls -lh "$DIST_DIR/"
echo ""
echo "Selesai. Distribusikan file di dist/ kepada pengguna."
