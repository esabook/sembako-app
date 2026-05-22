#!/bin/bash
# instal.command — Mac launcher
# Double-click di Finder → Terminal terbuka → browser otomatis buka installer
cd "$(dirname "$0")"

if ! command -v bun &>/dev/null; then
  osascript -e 'display dialog "Bun belum terinstall.\n\nInstall dulu:\ncurl -fsSL https://bun.sh/install | bash\n\nLalu buka lagi file ini." buttons {"OK"} default button "OK" with icon stop with title "Stokasir Installer"'
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║      Stokasir — Memulai Installer        ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Browser akan terbuka otomatis..."
echo "Tekan Ctrl+C di sini untuk menghentikan server installer."
echo ""

bun instalasi.ts
