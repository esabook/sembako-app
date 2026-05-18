# DEPLOY.md — Raspberry Pi / Mini Computer

---

## Target Hardware

```
MINIMUM : Raspberry Pi 4 RAM 2GB
IDEAL   : Raspberry Pi 4 RAM 4GB / Pi 5
OS      : Raspberry Pi OS Lite 64-bit (tanpa desktop)
STORAGE : OS di SD card, DATABASE di USB SSD (wajib)
```

```bash
uname -m   # aarch64 = ARM64 → Bun OK  |  armv7l = ARM32 → ganti Node.js LTS
```

---

## Storage — USB SSD (wajib untuk data.db)

```bash
sudo mkdir -p /mnt/data && sudo mount /dev/sda1 /mnt/data
echo '/dev/sda1 /mnt/data ext4 defaults,noatime 0 2' | sudo tee -a /etc/fstab
mkdir -p /mnt/data/sembako/uploads/{produk,invoice,karyawan}
mkdir -p /mnt/data/sembako/backup
```

Path produksi (env vars):
```
DATABASE_URL = file:/mnt/data/sembako/data.db
UPLOAD_DIR   = /mnt/data/sembako/uploads
```

---

## SQLite — Konfigurasi Pi

```typescript
// backend/src/db/index.ts
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('synchronous = NORMAL')
sqlite.pragma('cache_size = -16000')   // 16MB
sqlite.pragma('temp_store = MEMORY')
sqlite.pragma('mmap_size = 268435456') // 256MB
```

---

## Deploy Workflow

Build di laptop, kirim ke Pi via rsync:

```bash
#!/bin/bash
PI_HOST="eg17@192.168.1.x"
PI_PATH="/home/eg17/sembako-app"

cd frontend && bun run build && cd ..
rsync -avz --exclude 'node_modules' --exclude '.svelte-kit' \
           --exclude 'data.db' --exclude 'uploads' \
  ./ $PI_HOST:$PI_PATH/
ssh $PI_HOST "cd $PI_PATH/backend && bun install --production"
ssh $PI_HOST "pm2 restart all"
```

```javascript
// frontend/svelte.config.js
import adapter from '@sveltejs/adapter-node'
export default { kit: { adapter: adapter({ out: 'build', precompress: true }) } }
```

---

## PM2

```javascript
// ecosystem.config.js
module.exports = { apps: [
  {
    name: 'sembako-backend', script: 'src/index.ts', interpreter: 'bun',
    cwd: '/home/eg17/sembako-app/backend',
    max_memory_restart: '200M',
    env: { NODE_ENV: 'production', PORT: '3000',
           DATABASE_URL: 'file:/mnt/data/sembako/data.db',
           UPLOAD_DIR: '/mnt/data/sembako/uploads' }
  },
  {
    name: 'sembako-frontend', script: 'build/index.js', interpreter: 'bun',
    cwd: '/home/eg17/sembako-app/frontend',
    max_memory_restart: '150M',
    env: { NODE_ENV: 'production', PORT: '5173', HOST: '0.0.0.0',
           PUBLIC_API_URL: 'http://192.168.1.x/api' }
  }
]}
```

```bash
pm2 start ecosystem.config.js && pm2 startup && pm2 save
```

---

## Nginx

```nginx
server {
  listen 80; server_name _;
  gzip on;
  gzip_types text/plain text/css application/javascript application/json;

  location /uploads/ { alias /mnt/data/sembako/uploads/; expires 30d; }
  location /api/ { proxy_pass http://localhost:3000/; proxy_set_header Host $host; }
  location / {
    proxy_pass http://localhost:5173;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
  }
}
```

---

## Backup Otomatis

```bash
# /home/eg17/backup-db.sh
TANGGAL=$(date +%Y%m%d_%H%M%S)
sqlite3 /mnt/data/sembako/data.db ".backup /mnt/data/sembako/backup/data_$TANGGAL.db"
find /mnt/data/sembako/backup -name "*.db" -mtime +7 -delete
```

```
# crontab: backup tiap hari jam 02:00
0 2 * * * /home/eg17/backup-db.sh >> /home/eg17/logs/backup.log 2>&1
```

---

## OS Tuning (sekali)

```bash
# GPU memory minimal (tidak butuh display)
sudo raspi-config → Performance → GPU Memory → 16

# Matikan service tidak perlu
sudo systemctl disable bluetooth avahi-daemon triggerhappy

# Kurangi agresivitas swap
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf && sudo sysctl -p

# Swap di USB SSD
sudo fallocate -l 1G /mnt/data/swapfile && sudo chmod 600 /mnt/data/swapfile
sudo mkswap /mnt/data/swapfile && sudo swapon /mnt/data/swapfile
echo '/mnt/data/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
```

---

## Estimasi RAM

```
OS + Nginx + Backend + Frontend + PM2 + Cache ≈ 306MB
Pi 4 RAM 2GB → sisa ~1.7GB ✅
```

Akses dari device LAN: `http://[IP_PI]/` — set IP Pi jadi static di router.
