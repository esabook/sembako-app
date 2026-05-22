# DEPLOY.md — Panduan Instalasi Server

Stokasir berjalan sebagai server lokal di jaringan WiFi toko. Pilih platform server:

- [Raspberry Pi](#raspberry-pi) — pilihan utama untuk toko (hemat listrik, 24/7)
- [Linux (Ubuntu/Debian)](#linux-ubuntudebian) — mini PC, NUC, atau VPS lokal
- [Mac](#mac) — laptop/Mac mini yang selalu menyala
- [Windows](#windows) — PC toko yang selalu menyala

---

## Prasyarat Semua Platform

```
Bun    ≥ 1.1  — satu-satunya runtime yang dibutuhkan     [WAJIB]
Nginx         — reverse proxy + HTTPS termination         [OPSIONAL]
mkcert        — sertifikat HTTPS lokal tanpa biaya        [OPSIONAL, untuk HTTPS]
```

Process manager: **tidak perlu install apapun** — tiap OS sudah punya:
- Linux/Pi → `systemd` (built-in)
- Mac      → `launchd` (built-in)
- Windows  → Task Scheduler (built-in)

Struktur folder project:
```
stokasir/
├── backend/    ← Hono.js API (Bun)
├── frontend/   ← SvelteKit (build → Bun adapter)
└── DEPLOY.md
```

---

## Raspberry Pi

**Minimum:** Pi 4 RAM 2GB · **Ideal:** Pi 4 RAM 4GB / Pi 5
OS: Raspberry Pi OS Lite 64-bit (tanpa desktop)

```bash
uname -m   # aarch64 = ARM64 → Bun OK  |  armv7l = ARM32 → ganti Node.js LTS
```

### 1. Install Bun `WAJIB`

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
```

### 2. Storage USB SSD `WAJIB` — jangan simpan DB di SD card

```bash
sudo mkdir -p /mnt/data && sudo mount /dev/sda1 /mnt/data
echo '/dev/sda1 /mnt/data ext4 defaults,noatime 0 2' | sudo tee -a /etc/fstab
mkdir -p /mnt/data/stokasir/uploads/{produk,invoice,karyawan}
mkdir -p /mnt/data/stokasir/backup
```

### 3. Clone / Transfer project `WAJIB`

```bash
# Dari laptop developer via rsync:
rsync -avz --exclude 'node_modules' --exclude '.svelte-kit' \
           --exclude 'data.db' --exclude 'uploads' \
  ./ eg17@192.168.1.x:/home/eg17/stokasir/
```

### 4. Install dependencies & build `WAJIB`

```bash
cd /home/eg17/stokasir/backend  && bun install --production
cd /home/eg17/stokasir/frontend && bun install --production && bun run build
```

### 5. Env vars `WAJIB`

```bash
# /home/eg17/stokasir/backend/.env
DATABASE_URL=file:/mnt/data/stokasir/data.db
UPLOAD_DIR=/mnt/data/stokasir/uploads
PORT=3000
NODE_ENV=production
JWT_SECRET=ganti-dengan-string-acak-panjang
```

### 6. systemd service `WAJIB`

```bash
# /etc/systemd/system/stokasir-backend.service
sudo tee /etc/systemd/system/stokasir-backend.service > /dev/null <<'EOF'
[Unit]
Description=Stokasir Backend
After=network.target

[Service]
Type=simple
User=eg17
WorkingDirectory=/home/eg17/stokasir/backend
ExecStart=/home/eg17/.bun/bin/bun run src/index.ts
Restart=on-failure
RestartSec=5
EnvironmentFile=/home/eg17/stokasir/backend/.env

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/stokasir-frontend.service > /dev/null <<'EOF'
[Unit]
Description=Stokasir Frontend
After=network.target stokasir-backend.service

[Service]
Type=simple
User=eg17
WorkingDirectory=/home/eg17/stokasir/frontend
ExecStart=/home/eg17/.bun/bin/bun build/index.js
Restart=on-failure
RestartSec=5
Environment=PORT=5173
Environment=HOST=0.0.0.0
Environment=NODE_ENV=production
Environment=PUBLIC_API_URL=http://192.168.1.x/api

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable stokasir-backend stokasir-frontend
sudo systemctl start  stokasir-backend stokasir-frontend
```

### 7. Nginx `OPSIONAL`

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/stokasir
# → paste konfigurasi Nginx di bawah
sudo ln -s /etc/nginx/sites-available/stokasir /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

### 8. OS Tuning `OPSIONAL`

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
OS + Nginx + Backend (Bun) + Frontend (Bun) ≈ 240MB
Pi 4 RAM 2GB → sisa ~1.76GB ✅
```

---

## Linux (Ubuntu/Debian)

Mini PC, NUC, atau laptop Linux yang selalu menyala.

### 1. Install Bun `WAJIB`

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
```

### 2. Siapkan folder data `WAJIB`

```bash
mkdir -p ~/stokasir-data/uploads/{produk,invoice,karyawan}
mkdir -p ~/stokasir-data/backup
```

### 3. Clone / Transfer project `WAJIB`

```bash
# Kloning dari git:
git clone <url-repo> ~/stokasir

# Atau transfer dari laptop via rsync:
rsync -avz --exclude 'node_modules' --exclude '.svelte-kit' \
           --exclude 'data.db' --exclude 'uploads' \
  ./ user@192.168.1.x:~/stokasir/
```

### 4. Install dependencies & build `WAJIB`

```bash
cd ~/stokasir/backend  && bun install --production
cd ~/stokasir/frontend && bun install --production && bun run build
```

### 5. Env vars `WAJIB`

```bash
# ~/stokasir/backend/.env
DATABASE_URL=file:/home/user/stokasir-data/data.db
UPLOAD_DIR=/home/user/stokasir-data/uploads
PORT=3000
NODE_ENV=production
JWT_SECRET=ganti-dengan-string-acak-panjang
```

### 6. systemd service `WAJIB`

Sesuaikan `User`, `WorkingDirectory`, `ExecStart`, dan path env — sama seperti bagian Raspberry Pi di atas.

```bash
sudo systemctl daemon-reload
sudo systemctl enable stokasir-backend stokasir-frontend
sudo systemctl start  stokasir-backend stokasir-frontend
```

### 7. Nginx `OPSIONAL`

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/stokasir
# → paste konfigurasi Nginx di bawah
sudo ln -s /etc/nginx/sites-available/stokasir /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl enable nginx && sudo systemctl restart nginx
```

### 8. Backup otomatis (crontab) `OPSIONAL`

```bash
crontab -e
# tambah baris:
0 2 * * * ~/stokasir/backup-db.sh >> ~/logs/backup.log 2>&1
```

---

## Mac

Laptop Mac atau Mac mini yang dijadikan server toko.

### 1. Install Bun `WAJIB`

```bash
# Via installer resmi (tidak butuh Homebrew):
curl -fsSL https://bun.sh/install | bash
source ~/.zshrc

# Atau via Homebrew jika sudah terinstall:
brew install bun
```

### 2. Siapkan folder data `WAJIB`

```bash
mkdir -p ~/stokasir-data/uploads/{produk,invoice,karyawan}
mkdir -p ~/stokasir-data/backup
mkdir -p ~/stokasir-data/logs
```

### 3. Clone / Transfer project `WAJIB`

```bash
git clone <url-repo> ~/stokasir
# atau rsync dari laptop lain
```

### 4. Install dependencies & build `WAJIB`

```bash
cd ~/stokasir/backend  && bun install --production
cd ~/stokasir/frontend && bun install --production && bun run build
```

### 5. Env vars `WAJIB`

```bash
# ~/stokasir/backend/.env
DATABASE_URL=file:/Users/namauser/stokasir-data/data.db
UPLOAD_DIR=/Users/namauser/stokasir-data/uploads
PORT=3000
NODE_ENV=production
JWT_SECRET=ganti-dengan-string-acak-panjang
```

### 6. launchd — auto-start saat login `WAJIB`

```bash
BUN_BIN=$(which bun)   # biasanya /Users/namauser/.bun/bin/bun

# Backend
cat > ~/Library/LaunchAgents/stokasir.backend.plist <<EOF
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
  <key>WorkingDirectory</key><string>/Users/namauser/stokasir/backend</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>DATABASE_URL</key><string>file:/Users/namauser/stokasir-data/data.db</string>
    <key>UPLOAD_DIR</key><string>/Users/namauser/stokasir-data/uploads</string>
    <key>PORT</key><string>3000</string>
    <key>NODE_ENV</key><string>production</string>
    <key>JWT_SECRET</key><string>isi-jwt-secret-disini</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/Users/namauser/stokasir-data/logs/backend.log</string>
  <key>StandardErrorPath</key><string>/Users/namauser/stokasir-data/logs/backend.error.log</string>
</dict>
</plist>
EOF

# Frontend
cat > ~/Library/LaunchAgents/stokasir.frontend.plist <<EOF
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
  <key>WorkingDirectory</key><string>/Users/namauser/stokasir/frontend</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PORT</key><string>5173</string>
    <key>HOST</key><string>0.0.0.0</string>
    <key>NODE_ENV</key><string>production</string>
    <key>PUBLIC_API_URL</key><string>http://192.168.1.x/api</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/Users/namauser/stokasir-data/logs/frontend.log</string>
  <key>StandardErrorPath</key><string>/Users/namauser/stokasir-data/logs/frontend.error.log</string>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/stokasir.backend.plist
launchctl load ~/Library/LaunchAgents/stokasir.frontend.plist
```

### 7. Nginx via Homebrew `OPSIONAL`

```bash
brew install nginx
sudo nano /opt/homebrew/etc/nginx/servers/stokasir.conf
# → paste konfigurasi Nginx di bawah
brew services restart nginx
```

### 8. Agar Mac tidak tidur saat jadi server `WAJIB`

```
System Settings → Battery → Prevent automatic sleeping when display is off → ON
System Settings → Lock Screen → Never (atau durasi panjang)
```

---

## Windows

PC Windows yang selalu menyala (kasir utama atau komputer khusus toko).

### Cara cepat — pakai installer otomatis `DIREKOMENDASIKAN`

Klik-kanan PowerShell → **Run as Administrator**, lalu:

```powershell
# Dari folder root project:
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
```

Script interaktif akan menangani semua langkah: install Bun, konfigurasi, build,
migrasi database, nginx (opsional), HTTPS via mkcert (opsional), firewall, dan
Task Scheduler.

Mode yang tersedia:
```powershell
scripts\setup.ps1 install    # install dari awal (default jika tidak ada argumen)
scripts\setup.ps1 repair     # reinstall deps, rebuild, restart task
scripts\setup.ps1 uninstall  # hapus task & config
```

---

### Cara manual (langkah demi langkah)

#### 1. Install Bun `WAJIB`

Download installer dari [bun.sh](https://bun.sh) → jalankan `.exe`

Atau via PowerShell:
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
# Atau via winget:
winget install --id Oven-sh.Bun
```

Restart terminal setelah install.

#### 2. Siapkan folder data `WAJIB`

```powershell
mkdir C:\stokasir-data\uploads\produk
mkdir C:\stokasir-data\uploads\invoice
mkdir C:\stokasir-data\uploads\karyawan
mkdir C:\stokasir-data\backup
mkdir C:\stokasir-data\logs
```

#### 3. Clone / Transfer project `WAJIB`

```powershell
# Ekstrak zip project ke C:\stokasir\
# atau git clone jika sudah ada Git
git clone <url-repo> C:\stokasir
```

#### 4. Install dependencies & build `WAJIB`

```powershell
cd C:\stokasir\backend
bun install --production

cd C:\stokasir\frontend
bun install          # butuh devDependencies untuk build
bun run build
```

#### 5. Migrasi database `WAJIB`

```powershell
cd C:\stokasir\backend
bun run db:migrate
```

#### 6. Env vars `WAJIB`

Buat file `C:\stokasir\backend\.env`:
```
DATABASE_URL=C:/stokasir-data/data.db
UPLOAD_DIR=C:\stokasir-data\uploads
PORT=3000
NODE_ENV=production
JWT_SECRET=ganti-dengan-string-acak-panjang
```

#### 7. Task Scheduler — auto-start saat login `WAJIB`

```powershell
$BUN_BIN = (Get-Command bun).Source
$settings = New-ScheduledTaskSettingsSet `
    -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Days 365) -StartWhenAvailable
$triggerLogon   = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$triggerStartup = New-ScheduledTaskTrigger -AtStartup

# Backend (Bun baca .env otomatis dari WorkingDirectory)
$actionBack = New-ScheduledTaskAction -Execute $BUN_BIN `
    -Argument "run src\index.ts" -WorkingDirectory "C:\stokasir\backend"
Register-ScheduledTask -TaskName "Stokasir Backend" `
    -Action $actionBack -Trigger @($triggerLogon, $triggerStartup) `
    -Settings $settings -RunLevel Highest -Force

# Wrapper untuk frontend (membawa env vars)
@"
`$env:PORT='5173'; `$env:HOST='0.0.0.0'
`$env:NODE_ENV='production'
`$env:PUBLIC_API_URL='http://192.168.1.x/api'   # ganti IP
Set-Location 'C:\stokasir\frontend'
& '$BUN_BIN' build\index.js
"@ | Set-Content "C:\stokasir\start-frontend.ps1"

$actionFront = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -NonInteractive -WindowStyle Hidden -File C:\stokasir\start-frontend.ps1"
Register-ScheduledTask -TaskName "Stokasir Frontend" `
    -Action $actionFront -Trigger @($triggerLogon, $triggerStartup) `
    -Settings $settings -RunLevel Highest -Force

# Jalankan sekarang
Start-ScheduledTask "Stokasir Backend"
Start-Sleep 3
Start-ScheduledTask "Stokasir Frontend"
```

#### 8. Windows Firewall — buka port `WAJIB`

```powershell
netsh advfirewall firewall add rule name="Stokasir-3000" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="Stokasir-5173" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="Stokasir-80"   dir=in action=allow protocol=TCP localport=80
```

#### 9. Agar PC tidak sleep saat jadi server `WAJIB`

```
Settings → System → Power → Screen and sleep → semua set ke "Never"
```

#### 10. Nginx for Windows `OPSIONAL`

Install via winget: `winget install Nginx.Nginx`
atau download dari [nginx.org/en/download.html](https://nginx.org/en/download.html) → ekstrak ke `C:\nginx\`.

Buat `C:\nginx\conf\conf.d\stokasir.conf` → paste server block dari bagian [Konfigurasi Nginx](#nginx--server-block-opsional) di bawah.

```powershell
# Daftarkan nginx ke Task Scheduler
$nginxDir = "C:\nginx"
$actionNginx = New-ScheduledTaskAction `
    -Execute "$nginxDir\nginx.exe" -WorkingDirectory $nginxDir
Register-ScheduledTask -TaskName "Stokasir Nginx" `
    -Action $actionNginx `
    -Trigger @($triggerLogon, $triggerStartup) `
    -Settings (New-ScheduledTaskSettingsSet -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1)) `
    -RunLevel Highest -Force
Start-ScheduledTask "Stokasir Nginx"
```

> Tanpa Nginx: akses langsung via `http://[IP-PC]:5173` dari HP. Backend tetap di `:3000`.

---

## Konfigurasi Bersama

### Manajemen service

**Linux / Pi (systemd)**
```bash
sudo systemctl status  stokasir-backend stokasir-frontend
sudo systemctl restart stokasir-backend stokasir-frontend
sudo systemctl stop    stokasir-backend stokasir-frontend
journalctl -u stokasir-backend  -f    # log backend
journalctl -u stokasir-frontend -f    # log frontend
```

**Mac (launchd)**
```bash
launchctl list | grep stokasir
launchctl kickstart gui/$(id -u)/stokasir.backend    # restart backend
launchctl kickstart gui/$(id -u)/stokasir.frontend   # restart frontend
launchctl unload ~/Library/LaunchAgents/stokasir.backend.plist   # stop
tail -f ~/stokasir-data/logs/backend.log             # log
```

**Windows (Task Scheduler)**
```powershell
Get-ScheduledTask 'Stokasir*'               # lihat status
Start-ScheduledTask 'Stokasir Backend'      # jalankan
Stop-ScheduledTask  'Stokasir Backend'      # stop
# Log: lihat di Task Scheduler → History, atau tambahkan redirect di start-frontend.ps1
```

### Nginx — server block `OPSIONAL`

Berlaku untuk Linux / Mac / Pi. Untuk Windows sesuaikan path `alias`.

**Versi HTTP saja (tanpa HTTPS):**

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

---

### HTTPS dengan mkcert `OPSIONAL — Direkomendasikan`

mkcert membuat sertifikat HTTPS yang dipercaya oleh browser — **tanpa biaya, tanpa warning**.
HP karyawan cukup install CA certificate **1x saja**.

#### 1. Install mkcert di server (Pi / Linux / Mac)

```bash
# Raspberry Pi / Ubuntu / Debian
sudo apt install -y mkcert libnss3-tools

# Mac
brew install mkcert
```

#### 2. Generate sertifikat

```bash
mkcert -install                                      # install local CA ke sistem
IP_SERVER="192.168.1.x"                              # ganti dengan IP server Pi/PC
mkcert $IP_SERVER localhost 127.0.0.1

sudo mkdir -p /etc/nginx/certs
sudo mv ${IP_SERVER}+2.pem     /etc/nginx/certs/cert.pem
sudo mv ${IP_SERVER}+2-key.pem /etc/nginx/certs/key.pem
sudo chmod 640 /etc/nginx/certs/key.pem
```

#### 3. Sediakan rootCA untuk HP karyawan

```bash
# Salin rootCA ke folder public agar bisa didownload HP
cp "$(mkcert -CAROOT)/rootCA.pem" /home/user/stokasir-data/uploads/rootCA.crt
# Akses dari HP: https://192.168.1.x/rootCA.crt
```

#### 4. Nginx config dengan HTTPS

```nginx
# HTTP → HTTPS redirect
server {
  listen 80;
  server_name _;
  return 301 https://$host$request_uri;
}

# HTTPS
server {
  listen 443 ssl;
  server_name _;

  ssl_certificate     /etc/nginx/certs/cert.pem;
  ssl_certificate_key /etc/nginx/certs/key.pem;
  ssl_protocols       TLSv1.2 TLSv1.3;
  ssl_ciphers         HIGH:!aNULL:!MD5;

  gzip on;
  gzip_types text/plain text/css application/javascript application/json;

  # Download CA certificate untuk HP karyawan
  location = /rootCA.crt {
    alias /home/user/stokasir-data/uploads/rootCA.crt;  # sesuaikan path
    add_header Content-Type application/x-x509-ca-cert;
    add_header Content-Disposition 'attachment; filename="StokasirCA.crt"';
  }

  location /uploads/ {
    alias /home/user/stokasir-data/uploads/;            # sesuaikan path
    expires 30d;
    add_header Cache-Control "public, immutable";
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3000/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto https;
  }

  location / {
    proxy_pass http://127.0.0.1:5173;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header X-Forwarded-Proto https;
  }
}
```

Setelah update config nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

#### 5. Update env frontend (jika pakai HTTPS)

Di systemd service atau `.env` frontend, ubah:
```
PUBLIC_API_URL=https://192.168.1.x/api
```

#### 6. Cara install CA di HP karyawan

**Android:**
1. Buka browser → `https://192.168.1.x/rootCA.crt` → download
2. Settings → Security → Encryption & Credentials → Install a certificate → CA Certificate
3. Pilih file yang didownload

**iPhone / iOS:**
1. Kirim file `rootCA.crt` via AirDrop atau WhatsApp
2. Tap file → Allow → Profile Downloaded
3. Settings → General → VPN & Device Management → install profile
4. Settings → General → About → Certificate Trust Settings → aktifkan

> **Tips:** Buat QR code dari URL `https://192.168.1.x/rootCA.crt` dan tempel di dekat kasir
> agar karyawan baru bisa langsung scan dan install tanpa perlu ketik URL.

### backup-db.sh `OPSIONAL`

Berlaku untuk Linux / Mac / Pi.

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
# Cek bisa diakses dari server sendiri
curl http://localhost:3000/health          # → {"success":true,"data":{"status":"ok"}}
curl http://localhost:5173                 # → HTML halaman login
curl http://localhost/api/health           # → via Nginx HTTP
curl -k https://localhost/api/health       # → via Nginx HTTPS (jika mkcert sudah setup)

# Cek service berjalan (Linux/Pi)
sudo systemctl status stokasir-backend stokasir-frontend nginx

# Cek service berjalan (Mac)
launchctl list | grep stokasir

# Cek service berjalan (Windows)
Get-ScheduledTask 'Stokasir*'
```

Akses dari HP/laptop di jaringan yang sama:
- HTTP  : `http://[IP-SERVER]/`
- HTTPS : `https://[IP-SERVER]/` (setelah install CA di HP — lihat langkah 6 di atas)

Set IP server menjadi **static** di pengaturan router agar alamat tidak berubah.
