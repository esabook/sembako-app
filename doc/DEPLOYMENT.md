# Deployment Guide — Stokasir App

Panduan deploy ke Raspberry Pi / mini computer untuk produksi.

---

## Target Hardware

| Spesifikasi | Minimum | Ideal |
|---|---|---|
| Hardware | Raspberry Pi 4 RAM 2GB | Raspberry Pi 4 RAM 4GB / Pi 5 |
| OS | Raspberry Pi OS Lite 64-bit | Ubuntu Server 22.04 LTS ARM64 |
| Storage | SD card (OS) + USB SSD (data) | SD card (OS) + USB SSD (data) |

**Jangan pakai:** Raspberry Pi Zero / 1 / 2 / 3, atau OS versi Desktop.

Cek arsitektur sebelum mulai:

```bash
uname -m
# aarch64 = ARM64 → Bun bisa dipakai
# armv7l  = ARM32 → ganti ke Node.js LTS
```

---

## Estimasi RAM

```
OS (Raspberry Pi OS Lite)    ~180MB
Nginx                         ~10MB
Backend (Hono + SQLite)       ~30MB
Frontend (SvelteKit node)     ~40MB
PM2 daemon                    ~30MB
SQLite WAL cache              ~16MB
─────────────────────────────────────
TOTAL                        ~306MB
```

Pi 4 RAM 2GB → sisa ~1.7GB ✓

---

## Setup Awal Pi (Lakukan Sekali)

### 1. Mount USB SSD

```bash
sudo mkdir -p /mnt/data
sudo mount /dev/sda1 /mnt/data

# Auto mount saat boot
echo '/dev/sda1 /mnt/data ext4 defaults,noatime 0 2' | sudo tee -a /etc/fstab
# noatime = tidak update access time saat baca → hemat write

# Buat struktur folder
mkdir -p /mnt/data/stokasir/uploads/{produk,invoice,karyawan}
mkdir -p /mnt/data/stokasir/backup
```

> SD card rentan rusak akibat write intensif. SQLite **wajib** di USB SSD.

### 2. OS Tuning

```bash
# Kurangi GPU memory (tidak butuh display)
sudo raspi-config
# → Performance → GPU Memory → 16

# Matikan service tidak perlu
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon
sudo systemctl disable triggerhappy

# Kurangi agresivitas swap
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Swap di USB SSD (bukan SD card)
sudo fallocate -l 1G /mnt/data/swapfile
sudo chmod 600 /mnt/data/swapfile
sudo mkswap /mnt/data/swapfile
sudo swapon /mnt/data/swapfile
echo '/mnt/data/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
```

### 3. Install Dependensi

```bash
# Bun (jika ARM64)
curl -fsSL https://bun.sh/install | bash

# PM2
npm install -g pm2

# Nginx
sudo apt install -y nginx
```

---

## Konfigurasi Aplikasi

### Environment Variables

| Variable | Development | Production (Pi) |
|---|---|---|
| `DATABASE_URL` | `./data.db` | `file:/mnt/data/stokasir/data.db` |
| `UPLOAD_DIR` | `./uploads` | `/mnt/data/stokasir/uploads` |
| `PORT` | `3000` | `3000` |
| `HOST` | `localhost` | `0.0.0.0` |
| `PUBLIC_API_URL` | `http://localhost:3000` | `http://[IP_PI]/api` |

### SvelteKit Adapter

```javascript
// frontend/svelte.config.js
import adapter from '@sveltejs/adapter-node'

export default {
  kit: {
    adapter: adapter({
      out: 'build',
      precompress: true,   // gzip assets saat build, hemat bandwidth WiFi
    })
  }
}
```

---

## PM2 — Process Manager

Buat file konfigurasi di root project:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'stokasir-backend',
      script: 'src/index.ts',
      interpreter: 'bun',
      cwd: '/home/eg17/stokasir/backend',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        DATABASE_URL: 'file:/mnt/data/stokasir/data.db',
        UPLOAD_DIR: '/mnt/data/stokasir/uploads'
      },
      error_file: '/home/eg17/logs/backend-err.log',
      out_file:   '/home/eg17/logs/backend-out.log',
    },
    {
      name: 'stokasir-frontend',
      script: 'build/index.js',
      interpreter: 'bun',
      cwd: '/home/eg17/stokasir/frontend',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '150M',
      env: {
        NODE_ENV: 'production',
        PORT: '5173',
        HOST: '0.0.0.0',
        PUBLIC_API_URL: 'http://192.168.1.x/api'
      },
      error_file: '/home/eg17/logs/frontend-err.log',
      out_file:   '/home/eg17/logs/frontend-out.log',
    }
  ]
}
```

```bash
# Jalankan pertama kali
pm2 start ecosystem.config.js

# Auto start saat Pi boot
pm2 startup    # ikuti instruksi yang muncul
pm2 save

# Perintah harian
pm2 status        # cek status
pm2 monit         # monitor RAM & CPU realtime
pm2 logs          # lihat log
pm2 restart all   # restart semua
```

---

## Nginx — Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/stokasir
```

```nginx
server {
    listen 80;
    server_name _;

    # Gzip — hemat bandwidth WiFi
    gzip on;
    gzip_types text/plain text/css application/javascript
               application/json image/svg+xml;
    gzip_min_length 1000;

    # Foto & aset statis — cache 30 hari di browser
    location /uploads/ {
        alias /mnt/data/stokasir/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # JS/CSS build — cache 7 hari
    location ~* \.(js|css|woff2|ico)$ {
        proxy_pass http://localhost:5173;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # API backend
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/stokasir /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
```

---

## Deploy dari Laptop

> **Jangan build di Pi** — CPU kecil, proses lama dan panas. Build di laptop lalu kirim via rsync.

Gunakan script `deploy.sh` di root project:

```bash
# Set IP Pi terlebih dahulu, lalu jalankan:
PI_HOST=eg17@192.168.1.x ./deploy.sh
```

Script ini otomatis:
1. Build frontend di laptop
2. Kirim semua file ke Pi via rsync (skip `node_modules`, `data.db`, `uploads`)
3. Install production dependencies di Pi
4. Restart PM2

---

## Backup Otomatis

Buat script backup di Pi:

```bash
nano /home/eg17/backup-db.sh
```

```bash
#!/bin/bash
TANGGAL=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/mnt/data/stokasir/backup"
DB_FILE="/mnt/data/stokasir/data.db"

mkdir -p $BACKUP_DIR

# SQLite online backup — aman tanpa matikan app
sqlite3 $DB_FILE ".backup $BACKUP_DIR/data_$TANGGAL.db"

# Hapus backup lebih dari 7 hari
find $BACKUP_DIR -name "*.db" -mtime +7 -delete

echo "$(date): Backup selesai → data_$TANGGAL.db"
```

```bash
chmod +x /home/eg17/backup-db.sh

# Jadwalkan via cron — tiap hari jam 02:00
crontab -e
# Tambahkan baris ini:
0 2 * * * /home/eg17/backup-db.sh >> /home/eg17/logs/backup.log 2>&1
```

---

## Akses dari Device Lain

Setelah deploy, semua device di WiFi yang sama akses via:

```
http://[IP_PI]/        ← web app
http://[IP_PI]/api/    ← API backend
```

Cari IP Pi:

```bash
hostname -I
```

**Tips:** Set IP Pi jadi static di pengaturan router agar tidak berubah saat reboot.
