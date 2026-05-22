# DEPLOY.md — Panduan Instalasi Server

Stokasir berjalan sebagai server lokal di jaringan WiFi toko. Pilih platform server:

- [Raspberry Pi](#raspberry-pi) — pilihan utama untuk toko (hemat listrik, 24/7)
- [Linux (Ubuntu/Debian)](#linux-ubuntudebian) — mini PC, NUC, atau VPS lokal
- [Mac](#mac) — laptop/Mac mini yang selalu menyala
- [Windows](#windows) — PC toko yang selalu menyala

---

## Prasyarat Semua Platform

```
Bun   ≥ 1.1   — runtime backend + build frontend
PM2   ≥ 5     — process manager (auto restart, startup)
Nginx          — reverse proxy (opsional tapi dianjurkan)
```

Struktur folder project:
```
stokasir/
├── backend/    ← Hono.js API (Bun)
├── frontend/   ← SvelteKit (build → Node adapter)
└── DEPLOY.md
```

---

## Raspberry Pi

**Minimum:** Pi 4 RAM 2GB · **Ideal:** Pi 4 RAM 4GB / Pi 5
OS: Raspberry Pi OS Lite 64-bit (tanpa desktop)

```bash
uname -m   # aarch64 = ARM64 → Bun OK  |  armv7l = ARM32 → ganti Node.js LTS
```

### 1. Install Bun & PM2

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

npm install -g pm2
```

### 2. Storage USB SSD (wajib — jangan simpan DB di SD card)

```bash
sudo mkdir -p /mnt/data && sudo mount /dev/sda1 /mnt/data
echo '/dev/sda1 /mnt/data ext4 defaults,noatime 0 2' | sudo tee -a /etc/fstab
mkdir -p /mnt/data/stokasir/uploads/{produk,invoice,karyawan}
mkdir -p /mnt/data/stokasir/backup
```

### 3. Clone / Transfer project

```bash
# Dari laptop developer via rsync:
rsync -avz --exclude 'node_modules' --exclude '.svelte-kit' \
           --exclude 'data.db' --exclude 'uploads' \
  ./ eg17@192.168.1.x:/home/eg17/stokasir/
```

### 4. Install dependencies & build

```bash
cd /home/eg17/stokasir/backend  && bun install --production
cd /home/eg17/stokasir/frontend && bun install --production && bun run build
```

### 5. Env vars

```bash
# /home/eg17/stokasir/backend/.env
DATABASE_URL=file:/mnt/data/stokasir/data.db
UPLOAD_DIR=/mnt/data/stokasir/uploads
PORT=3000
NODE_ENV=production
JWT_SECRET=ganti-dengan-string-acak-panjang
```

### 6. PM2 & autostart

```bash
cd /home/eg17/stokasir
pm2 start ecosystem.config.js
pm2 startup   # ikuti instruksi yang muncul
pm2 save
```

### 7. Nginx

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/stokasir
# → paste konfigurasi Nginx di bawah
sudo ln -s /etc/nginx/sites-available/stokasir /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

### OS Tuning (sekali)

```bash
sudo raspi-config → Performance → GPU Memory → 16

sudo systemctl disable bluetooth avahi-daemon triggerhappy

echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf && sudo sysctl -p

sudo fallocate -l 1G /mnt/data/swapfile && sudo chmod 600 /mnt/data/swapfile
sudo mkswap /mnt/data/swapfile && sudo swapon /mnt/data/swapfile
echo '/mnt/data/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
```

### Estimasi RAM

```
OS + Nginx + Backend + Frontend + PM2 ≈ 306MB
Pi 4 RAM 2GB → sisa ~1.7GB ✅
```

---

## Linux (Ubuntu/Debian)

Mini PC, NUC, atau laptop Linux yang selalu menyala.

### 1. Install Bun & PM2

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# PM2 membutuhkan Node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g pm2
```

### 2. Siapkan folder data

```bash
mkdir -p ~/stokasir-data/uploads/{produk,invoice,karyawan}
mkdir -p ~/stokasir-data/backup
```

### 3. Clone / Transfer project

```bash
# Kloning dari git:
git clone <url-repo> ~/stokasir

# Atau transfer dari laptop via rsync:
rsync -avz --exclude 'node_modules' --exclude '.svelte-kit' \
           --exclude 'data.db' --exclude 'uploads' \
  ./ user@192.168.1.x:~/stokasir/
```

### 4. Install dependencies & build

```bash
cd ~/stokasir/backend  && bun install --production
cd ~/stokasir/frontend && bun install --production && bun run build
```

### 5. Env vars

```bash
# ~/stokasir/backend/.env
DATABASE_URL=file:/home/user/stokasir-data/data.db
UPLOAD_DIR=/home/user/stokasir-data/uploads
PORT=3000
NODE_ENV=production
JWT_SECRET=ganti-dengan-string-acak-panjang
```

### 6. PM2 & autostart

```bash
cd ~/stokasir
pm2 start ecosystem.config.js
pm2 startup systemd   # generate perintah → jalankan perintah yang muncul
pm2 save
```

### 7. Nginx

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/stokasir
# → paste konfigurasi Nginx di bawah
sudo ln -s /etc/nginx/sites-available/stokasir /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl enable nginx && sudo systemctl restart nginx
```

### 8. Backup otomatis (crontab)

```bash
crontab -e
# tambah baris:
0 2 * * * ~/stokasir/backup-db.sh >> ~/logs/backup.log 2>&1
```

---

## Mac

Laptop Mac atau Mac mini yang dijadikan server toko.

### 1. Install Homebrew (jika belum ada)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install Bun & PM2

```bash
brew install bun

# PM2 via Node.js
brew install node
npm install -g pm2
```

### 3. Siapkan folder data

```bash
mkdir -p ~/stokasir-data/uploads/{produk,invoice,karyawan}
mkdir -p ~/stokasir-data/backup
```

### 4. Clone / Transfer project

```bash
git clone <url-repo> ~/stokasir
# atau rsync dari laptop lain
```

### 5. Install dependencies & build

```bash
cd ~/stokasir/backend  && bun install --production
cd ~/stokasir/frontend && bun install --production && bun run build
```

### 6. Env vars

```bash
# ~/stokasir/backend/.env
DATABASE_URL=file:/Users/namauser/stokasir-data/data.db
UPLOAD_DIR=/Users/namauser/stokasir-data/uploads
PORT=3000
NODE_ENV=production
JWT_SECRET=ganti-dengan-string-acak-panjang
```

### 7. PM2 & autostart (launchd)

```bash
cd ~/stokasir
pm2 start ecosystem.config.js
pm2 startup   # PM2 akan generate LaunchAgent plist secara otomatis
pm2 save
```

### 8. Nginx via Homebrew

```bash
brew install nginx
sudo nano /opt/homebrew/etc/nginx/servers/stokasir.conf
# → paste konfigurasi Nginx di bawah
brew services restart nginx
```

### Agar Mac tidak tidur saat jadi server

```
System Settings → Battery → Prevent automatic sleeping when display is off → ON
System Settings → Lock Screen → Never (atau durasi panjang)
```

---

## Windows

PC Windows yang selalu menyala (kasir utama atau komputer khusus toko).

### 1. Install Bun

Download installer dari [bun.sh](https://bun.sh) → jalankan `.exe`

Atau via PowerShell:
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

Restart terminal setelah install.

### 2. Install Node.js & PM2

Download Node.js LTS dari [nodejs.org](https://nodejs.org) → jalankan installer.

```powershell
npm install -g pm2
npm install -g pm2-windows-startup
pm2-windows-startup install
```

### 3. Siapkan folder data

```powershell
mkdir C:\stokasir-data\uploads\produk
mkdir C:\stokasir-data\uploads\invoice
mkdir C:\stokasir-data\uploads\karyawan
mkdir C:\stokasir-data\backup
```

### 4. Clone / Transfer project

```powershell
# Ekstrak zip project ke C:\stokasir\
# atau git clone jika sudah ada Git
git clone <url-repo> C:\stokasir
```

### 5. Install dependencies & build

```powershell
cd C:\stokasir\backend
bun install --production

cd C:\stokasir\frontend
bun install --production
bun run build
```

### 6. Env vars

Buat file `C:\stokasir\backend\.env`:
```
DATABASE_URL=file:C:/stokasir-data/data.db
UPLOAD_DIR=C:/stokasir-data/uploads
PORT=3000
NODE_ENV=production
JWT_SECRET=ganti-dengan-string-acak-panjang
```

### 7. PM2 & autostart

```powershell
cd C:\stokasir
pm2 start ecosystem.config.js
pm2 save
```

PM2 Windows Startup akan otomatis restart app saat PC reboot.

### 8. Reverse proxy — Nginx for Windows

Download Nginx untuk Windows dari [nginx.org/en/download.html](https://nginx.org/en/download.html), ekstrak ke `C:\nginx\`.

Edit `C:\nginx\conf\nginx.conf` → tambah server block (lihat Konfigurasi Nginx di bawah, ganti path uploads).

```powershell
# Jalankan Nginx sebagai background process
Start-Process "C:\nginx\nginx.exe"

# Agar otomatis jalan saat Windows start:
# Buat Scheduled Task di Task Scheduler → trigger "At startup" → action: C:\nginx\nginx.exe
```

> **Alternatif Windows:** Jika tidak ingin setup Nginx, akses langsung via `http://[IP-PC]:5173` dari HP. Backend tetap di `:3000`, tapi pastikan kedua port tidak diblokir Windows Firewall.

### Windows Firewall — buka port

```powershell
# Buka port 80 (Nginx) dan 5173 (frontend langsung) dan 3000 (backend)
netsh advfirewall firewall add rule name="Stokasir-80"   dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="Stokasir-5173" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="Stokasir-3000" dir=in action=allow protocol=TCP localport=3000
```

### Agar PC tidak sleep saat jadi server

```
Settings → System → Power → Screen and sleep → semua set ke "Never"
```

---

## Konfigurasi Bersama

### ecosystem.config.js (PM2)

Tempatkan di root folder project. Sesuaikan `cwd` dan path `DATABASE_URL` / `UPLOAD_DIR` dengan platform:

```javascript
module.exports = { apps: [
  {
    name: 'stokasir-backend',
    script: 'src/index.ts',
    interpreter: 'bun',
    cwd: '/home/user/stokasir/backend',         // sesuaikan path
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
      PORT: '3000',
      DATABASE_URL: 'file:/home/user/stokasir-data/data.db',  // sesuaikan
      UPLOAD_DIR: '/home/user/stokasir-data/uploads'           // sesuaikan
    }
  },
  {
    name: 'stokasir-frontend',
    script: 'build/index.js',
    interpreter: 'bun',
    cwd: '/home/user/stokasir/frontend',        // sesuaikan path
    max_memory_restart: '150M',
    env: {
      NODE_ENV: 'production',
      PORT: '5173',
      HOST: '0.0.0.0',
      PUBLIC_API_URL: 'http://192.168.1.x/api'  // ganti dengan IP server
    }
  }
]}
```

### Nginx — server block (Linux / Mac / Pi)

```nginx
server {
  listen 80;
  server_name _;

  gzip on;
  gzip_types text/plain text/css application/javascript application/json;

  location /uploads/ {
    alias /home/user/stokasir-data/uploads/;   # sesuaikan path
    expires 30d;
    add_header Cache-Control "public, immutable";
  }

  location /api/ {
    proxy_pass http://localhost:3000/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  location / {
    proxy_pass http://localhost:5173;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
  }
}
```

### backup-db.sh (Linux / Mac / Pi)

```bash
#!/bin/bash
# Simpan sebagai ~/stokasir/backup-db.sh, lalu chmod +x backup-db.sh
TANGGAL=$(date +%Y%m%d_%H%M%S)
DB_FILE=~/stokasir-data/data.db
BACKUP_DIR=~/stokasir-data/backup

mkdir -p $BACKUP_DIR
sqlite3 $DB_FILE ".backup $BACKUP_DIR/data_$TANGGAL.db"
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
echo "$(date): Backup selesai → data_$TANGGAL.db"
```

---

## SQLite — Konfigurasi Performa

Sudah dikonfigurasi di `backend/src/db/index.ts`:

```typescript
sqlite.pragma('journal_mode = WAL')       // baca & tulis bisa bersamaan
sqlite.pragma('synchronous = NORMAL')     // lebih cepat, masih aman
sqlite.pragma('cache_size = -16000')      // 16MB cache
sqlite.pragma('temp_store = MEMORY')
sqlite.pragma('mmap_size = 268435456')    // 256MB mmap
```

---

## Verifikasi Instalasi

```bash
# Cek kedua proses berjalan
pm2 status

# Cek log jika ada error
pm2 logs stokasir-backend --lines 20
pm2 logs stokasir-frontend --lines 20

# Cek bisa diakses dari server sendiri
curl http://localhost:3000/health    # → {"success":true,"data":{"status":"ok"}}
curl http://localhost:5173           # → HTML halaman login
curl http://localhost/api/health     # → via Nginx (jika Nginx sudah jalan)
```

Akses dari HP/laptop di jaringan yang sama: `http://[IP-SERVER]/`

Set IP server menjadi **static** di pengaturan router agar alamat tidak berubah.
