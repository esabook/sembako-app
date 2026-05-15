#!/bin/bash
set -e

PI_HOST="${PI_HOST:-eg17@192.168.1.x}"
PI_PATH="/home/eg17/sembako-app"

echo "→ Build frontend..."
cd frontend && bun run build && cd ..

echo "→ Kirim ke Pi..."
rsync -avz \
  --exclude 'node_modules' \
  --exclude '.svelte-kit' \
  --exclude 'data.db' \
  --exclude 'uploads' \
  ./ "$PI_HOST:$PI_PATH/"

echo "→ Install dependencies di Pi..."
ssh "$PI_HOST" "cd $PI_PATH/backend && bun install --production"
ssh "$PI_HOST" "cd $PI_PATH/frontend && bun install --production"

echo "→ Restart app..."
ssh "$PI_HOST" "pm2 restart all"

echo "✓ Deploy selesai"
