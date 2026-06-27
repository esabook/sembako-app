# Deploy Backend — Lokal (LAN / Pi)

> Deploy ke cloud (Turso/Supabase/Railway)? Baca `claude/deployment.md`.

Backend berjalan sebagai server Hono.js (Bun) di jaringan LAN toko.

---

## Prasyarat

```
Bun ≥ 1.1   — satu-satunya runtime yang dibutuhkan
```

Process manager: tidak perlu install apapun — tiap OS sudah punya:
- Linux/Pi → `systemd` (built-in)
- Mac      → `launchd` (built-in)
- Windows  → Task Scheduler (built-in)

---

## Raspberry Pi / Linux (Ubuntu/Debian)

### 1. Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
```

Cek arsitektur dulu:
```bash
uname -m   # aarch64 = ARM64 → Bun OK  |  armv7l = ARM32 → ganti Node.js LTS
```

### 2. Storage USB SSD (Pi) — jangan simpan DB di SD card

```bash
sudo mkdir -p /mnt/data && sudo mount /dev/sda1 /mnt/data
echo '/dev/sda1 /mnt/data ext4 defaults,noatime 0 2' | sudo tee -a /etc/fstab
mkdir -p /mnt/data/stokasir/uploads/{produk,invoice,karyawan}
mkdir -p /mnt/data/stokasir/backup
```

Linux non-Pi:
```bash
mkdir -p ~/stokasir-data/uploads/{produk,invoice,karyawan}
mkdir -p ~/stokasir-data/backup
```

### 3. Transfer project

```bash
# Dari laptop developer via rsync (jangan build di Pi — CPU kecil):
rsync -avz --exclude 'node_modules' --exclude '.svelte-kit' \
           --exclude 'data.db' --exclude 'data_demo.db' --exclude 'uploads' \
  ./ eg17@192.168.1.x:/home/eg17/stokasir/
```

### 4. Install dependencies

```bash
cd /home/eg17/stokasir/backend && bun install --production
```

### 5. Migrasi database

```bash
cd /home/eg17/stokasir/backend
bun run db:migrate
```

DB demo (`data_demo.db`) di-migrate otomatis saat backend pertama start — tak perlu langkah manual.

### 6. Env vars

```bash
# /home/eg17/stokasir/backend/.env
DATABASE_URL=file:/mnt/data/stokasir/data.db   # Linux: file:/home/user/stokasir-data/data.db
DEMO_DATABASE_URL=file:/mnt/data/stokasir/data_demo.db   # DB demo terpisah (default file:./data_demo.db)
UPLOAD_DIR=/mnt/data/stokasir/uploads          # Linux: /home/user/stokasir-data/uploads
PORT=3000
NODE_ENV=production
JWT_SECRET=ganti-dengan-string-acak-panjang

# CORS origin — satu URL atau CSV untuk multi-device:
FRONTEND_URL=https://192.168.1.x
# FRONTEND_URL=https://192.168.1.x,https://192.168.1.y
```

### 7. systemd service

```bash
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

sudo systemctl daemon-reload
sudo systemctl enable stokasir-backend
sudo systemctl start  stokasir-backend
```

### 8. OS Tuning (Pi, opsional)

```bash
sudo raspi-config → Performance → GPU Memory → 16

sudo systemctl disable bluetooth avahi-daemon triggerhappy

echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf && sudo sysctl -p

sudo fallocate -l 1G /mnt/data/swapfile && sudo chmod 600 /mnt/data/swapfile
sudo mkswap /mnt/data/swapfile && sudo swapon /mnt/data/swapfile
echo '/mnt/data/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
```

---

## Mac

### 1. Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.zshrc
# atau: brew install bun
```

### 2. Siapkan folder data

```bash
mkdir -p ~/stokasir-data/uploads/{produk,invoice,karyawan}
mkdir -p ~/stokasir-data/backup
mkdir -p ~/stokasir-data/logs
```

### 3. Env vars

```bash
# ~/stokasir/backend/.env
DATABASE_URL=file:/Users/namauser/stokasir-data/data.db
UPLOAD_DIR=/Users/namauser/stokasir-data/uploads
PORT=3000
NODE_ENV=production
JWT_SECRET=ganti-dengan-string-acak-panjang
FRONTEND_URL=https://192.168.1.x
```

### 4. launchd — auto-start saat login

```bash
BUN_BIN=$(which bun)

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
    <key>FRONTEND_URL</key><string>https://192.168.1.x</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/Users/namauser/stokasir-data/logs/backend.log</string>
  <key>StandardErrorPath</key><string>/Users/namauser/stokasir-data/logs/backend.error.log</string>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/stokasir.backend.plist
```

---

## Windows

### 1. Install Bun

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
# atau: winget install --id Oven-sh.Bun
```

### 2. Siapkan folder data

```powershell
mkdir C:\stokasir-data\uploads\produk
mkdir C:\stokasir-data\uploads\invoice
mkdir C:\stokasir-data\uploads\karyawan
mkdir C:\stokasir-data\backup
mkdir C:\stokasir-data\logs
```

### 3. Env vars

Buat file `C:\stokasir\backend\.env`:
```
DATABASE_URL=C:/stokasir-data/data.db
UPLOAD_DIR=C:\stokasir-data\uploads
PORT=3000
NODE_ENV=production
JWT_SECRET=ganti-dengan-string-acak-panjang
FRONTEND_URL=https://192.168.1.x
```

### 4. Migrasi database

```powershell
cd C:\stokasir\backend
bun run db:migrate
```

### 5. Task Scheduler — auto-start

```powershell
$BUN_BIN = (Get-Command bun).Source
$settings = New-ScheduledTaskSettingsSet `
    -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Days 365) -StartWhenAvailable
$triggerLogon   = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$triggerStartup = New-ScheduledTaskTrigger -AtStartup

$actionBack = New-ScheduledTaskAction -Execute $BUN_BIN `
    -Argument "run src\index.ts" -WorkingDirectory "C:\stokasir\backend"
Register-ScheduledTask -TaskName "Stokasir Backend" `
    -Action $actionBack -Trigger @($triggerLogon, $triggerStartup) `
    -Settings $settings -RunLevel Highest -Force

Start-ScheduledTask "Stokasir Backend"
```

### 6. Windows Firewall — buka port backend

```powershell
netsh advfirewall firewall add rule name="Stokasir-3000" dir=in action=allow protocol=TCP localport=3000
```

---

## Manajemen Service

**Linux / Pi (systemd)**
```bash
sudo systemctl status  stokasir-backend
sudo systemctl restart stokasir-backend
sudo systemctl stop    stokasir-backend
journalctl -u stokasir-backend -f
```

**Mac (launchd)**
```bash
launchctl list | grep stokasir.backend
launchctl kickstart gui/$(id -u)/stokasir.backend
launchctl unload ~/Library/LaunchAgents/stokasir.backend.plist
tail -f ~/stokasir-data/logs/backend.log
```

**Windows (Task Scheduler)**
```powershell
Get-ScheduledTask 'Stokasir Backend'
Start-ScheduledTask 'Stokasir Backend'
Stop-ScheduledTask  'Stokasir Backend'
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

## Backup Otomatis

**Linux / Mac / Pi — `backup-db.sh`**

```bash
#!/bin/bash
# chmod +x backup-db.sh
TANGGAL=$(date +%Y%m%d_%H%M%S)
DB_FILE=~/stokasir-data/data.db              # Pi: /mnt/data/stokasir/data.db
BACKUP_DIR=~/stokasir-data/backup

mkdir -p $BACKUP_DIR
sqlite3 $DB_FILE ".backup $BACKUP_DIR/data_$TANGGAL.db"
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
echo "$(date): Backup selesai → data_$TANGGAL.db"
```

```bash
chmod +x ~/stokasir/backup-db.sh
crontab -e
# tambah baris:
0 2 * * * ~/stokasir/backup-db.sh >> ~/logs/backup.log 2>&1
```

---

## Verifikasi

```bash
curl http://localhost:3000/health   # → {"success":true,"data":{"status":"ok"}}
```

### Estimasi RAM

```
OS + Nginx + Backend (Bun) + Frontend (Bun) ≈ 240MB
Pi 4 RAM 2GB → sisa ~1.76GB ✅
```
