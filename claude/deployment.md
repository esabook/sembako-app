# Env Vars & Deployment Mode

Template tersedia: `backend/.env.example` dan `frontend/.env.example`.

## Backend (`backend/.env`)

```text
JWT_SECRET=         # wajib ganti di production (32+ karakter random)
PORT=3000
FRONTEND_URL=       # CORS origin — CSV untuk multi-origin
DATABASE_URL=file:./data.db
UPLOAD_DIR=./uploads
```

## Frontend (`frontend/.env`)

```text
PUBLIC_DEPLOYMENT_MODE=offline   # 'offline' (LAN/Pi) | 'online' (cloud VPS)
PUBLIC_API_URL=                  # kosong = /api via Nginx proxy
```

Wajib rebuild frontend (`bun run build`) setelah ganti nilai `PUBLIC_*`.

## Perbedaan mode

| | `offline` (default) | `online` |
|---|---|---|
| SW cache endpoints | 5 (semua kasir-critical) | 1 (pengaturan/publik saja) |
| Pesan offline | "WiFi toko dan server menyala" | "koneksi internet" |
| Nav retry | 2x | 1x |
