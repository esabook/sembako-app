# Deploy Frontend — Lokal (LAN / Pi)

> Deploy ke cloud? Baca `claude/deployment.md`.

Frontend berjalan sebagai SvelteKit node server (Bun) di jaringan LAN toko.

⚠️ **Offline mode butuh HTTPS.**
Service Worker hanya bisa diregistrasi di HTTPS. Tanpa Nginx + mkcert → Service Worker tidak aktif → offline mode mati.
Nginx + mkcert OPSIONAL hanya jika app **tidak perlu** offline.

---

## Prasyarat

```
Bun   ≥ 1.1  — runtime untuk menjalankan build output
Nginx        — reverse proxy + HTTPS termination   [WAJIB untuk offline mode]
mkcert       — sertifikat HTTPS lokal tanpa biaya  [WAJIB untuk offline mode]
```

---

## Build Frontend

> **Jangan build di Pi** — CPU kecil. Build di laptop lalu kirim via rsync.

```bash
# Di laptop developer:
cd frontend && bun install && bun run build

# Kirim ke server
rsync -avz --exclude 'node_modules' --exclude '.svelte-kit' \
           --exclude 'data.db' --exclude 'uploads' \
  ./ eg17@192.168.1.x:/home/eg17/stokasir/
```

---

## Env Vars Frontend

Dipakai saat `bun run build` (bake ke binary):

```bash
# frontend/.env (atau .env.production)
PUBLIC_DEPLOYMENT_MODE=offline   # LAN/Pi = offline, cloud VPS = online
PUBLIC_API_URL=                  # kosong = pakai Nginx proxy di /api
```

Setelah HTTPS aktif, update dan rebuild:
```
PUBLIC_API_URL=https://192.168.1.x/api
```

---

## Raspberry Pi / Linux

### 1. Install dependencies & build di server (jika tidak rsync)

```bash
cd /home/eg17/stokasir/frontend && bun install --production && bun run build
```

### 2. systemd service

```bash
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

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable stokasir-frontend
sudo systemctl start  stokasir-frontend
```

### 3. Nginx — install

```bash
sudo apt install -y nginx mkcert libnss3-tools
sudo nano /etc/nginx/sites-available/stokasir
# → paste konfigurasi Nginx di bawah
sudo ln -s /etc/nginx/sites-available/stokasir /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl enable nginx && sudo systemctl restart nginx
```

---

## Mac

### 1. launchd — auto-start saat login

```bash
BUN_BIN=$(which bun)

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
    <key>PUBLIC_API_URL</key><string>https://192.168.1.x/api</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/Users/namauser/stokasir-data/logs/frontend.log</string>
  <key>StandardErrorPath</key><string>/Users/namauser/stokasir-data/logs/frontend.error.log</string>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/stokasir.frontend.plist
```

### 2. Nginx via Homebrew

```bash
brew install nginx mkcert
sudo nano /opt/homebrew/etc/nginx/servers/stokasir.conf
# → paste konfigurasi Nginx di bawah
brew services restart nginx
```

### 3. Agar Mac tidak tidur saat jadi server

```
System Settings → Battery → Prevent automatic sleeping when display is off → ON
System Settings → Lock Screen → Never
```

---

## Windows

### 1. Install dependencies & build

```powershell
cd C:\stokasir\frontend
bun install          # butuh devDependencies untuk build
bun run build
```

### 2. Task Scheduler — auto-start

```powershell
$BUN_BIN = (Get-Command bun).Source
$settings = New-ScheduledTaskSettingsSet `
    -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Days 365) -StartWhenAvailable
$triggerLogon   = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$triggerStartup = New-ScheduledTaskTrigger -AtStartup

@"
`$env:PORT='5173'; `$env:HOST='0.0.0.0'
`$env:NODE_ENV='production'
`$env:PUBLIC_API_URL='https://192.168.1.x/api'   # ganti IP
Set-Location 'C:\stokasir\frontend'
& '$BUN_BIN' build\index.js
"@ | Set-Content "C:\stokasir\start-frontend.ps1"

$actionFront = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -NonInteractive -WindowStyle Hidden -File C:\stokasir\start-frontend.ps1"
Register-ScheduledTask -TaskName "Stokasir Frontend" `
    -Action $actionFront -Trigger @($triggerLogon, $triggerStartup) `
    -Settings $settings -RunLevel Highest -Force

Start-ScheduledTask "Stokasir Frontend"
```

### 3. Windows Firewall — buka port

```powershell
netsh advfirewall firewall add rule name="Stokasir-5173" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="Stokasir-80"   dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="Stokasir-443"  dir=in action=allow protocol=TCP localport=443
```

### 4. Nginx for Windows

```powershell
winget install Nginx.Nginx
# atau download dari nginx.org → ekstrak ke C:\nginx\
# Buat C:\nginx\conf\conf.d\stokasir.conf → paste server block di bawah

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

### 5. Agar PC tidak sleep

```
Settings → System → Power → Screen and sleep → semua set ke "Never"
```

---

## Nginx — Konfigurasi Server Block

### Versi HTTP saja (tanpa HTTPS — testing awal)

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
    # SSE (Server-Sent Events) — wajib untuk scanner HP
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;
    proxy_set_header Connection '';
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

### Versi HTTPS (wajib untuk offline mode)

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
    alias /home/user/stokasir-data/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3000/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto https;
    # SSE (Server-Sent Events) — wajib untuk scanner HP
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;
    proxy_set_header Connection '';
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

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## HTTPS dengan mkcert

mkcert membuat sertifikat HTTPS yang dipercaya browser — tanpa biaya, tanpa warning.
HP karyawan cukup install CA certificate 1x saja.

### 1. Install mkcert di server

```bash
# Raspberry Pi / Ubuntu / Debian
sudo apt install -y mkcert libnss3-tools

# Mac
brew install mkcert
```

### 2. Generate sertifikat

```bash
mkcert -install                              # install local CA ke sistem
IP_SERVER="192.168.1.x"                     # ganti dengan IP server
mkcert $IP_SERVER localhost 127.0.0.1

sudo mkdir -p /etc/nginx/certs
sudo mv ${IP_SERVER}+2.pem     /etc/nginx/certs/cert.pem
sudo mv ${IP_SERVER}+2-key.pem /etc/nginx/certs/key.pem
sudo chmod 640 /etc/nginx/certs/key.pem
```

### 3. Sediakan rootCA untuk HP karyawan

```bash
cp "$(mkcert -CAROOT)/rootCA.pem" /home/user/stokasir-data/uploads/rootCA.crt
# Akses dari HP: https://192.168.1.x/rootCA.crt
```

> Tips: Buat QR code dari URL `https://192.168.1.x/rootCA.crt` dan tempel di dekat kasir.

### 4. Install CA di HP karyawan

**Android:**
1. Buka browser → `https://192.168.1.x/rootCA.crt` → download
2. Settings → Security → Encryption & Credentials → Install a certificate → CA Certificate

**iPhone / iOS:**
1. Kirim file `rootCA.crt` via AirDrop atau WhatsApp
2. Tap file → Allow → Profile Downloaded
3. Settings → General → VPN & Device Management → install profile
4. Settings → General → About → Certificate Trust Settings → aktifkan

---

## Manajemen Service

**Linux / Pi (systemd)**
```bash
sudo systemctl status  stokasir-frontend nginx
sudo systemctl restart stokasir-frontend nginx
sudo systemctl stop    stokasir-frontend
journalctl -u stokasir-frontend -f
```

**Mac (launchd)**
```bash
launchctl list | grep stokasir.frontend
launchctl kickstart gui/$(id -u)/stokasir.frontend
launchctl unload ~/Library/LaunchAgents/stokasir.frontend.plist
tail -f ~/stokasir-data/logs/frontend.log
```

**Windows (Task Scheduler)**
```powershell
Get-ScheduledTask 'Stokasir Frontend'
Start-ScheduledTask 'Stokasir Frontend'
Stop-ScheduledTask  'Stokasir Frontend'
```

---

## Verifikasi

```bash
curl http://localhost:5173                 # → HTML halaman login
curl http://localhost/api/health           # → via Nginx HTTP
curl -k https://localhost/api/health       # → via Nginx HTTPS

# Akses dari HP/laptop di jaringan yang sama:
# HTTPS: https://[IP-SERVER]/   ← gunakan ini (offline mode aktif)
# HTTP:  http://[IP-SERVER]/    ← testing awal saja
```

Set IP server jadi **static** di pengaturan router agar alamat tidak berubah.
