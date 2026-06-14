# Env Vars & Deployment

Template: `backend/.env.example` dan `frontend/.env.example`.

## Backend (`backend/.env`)

```text
# Wajib
JWT_SECRET=           # 32+ karakter random, ganti di production
PORT=3000
FRONTEND_URL=http://localhost:5173   # CSV untuk multi-origin

# Database — pilih satu
DATABASE_URL=file:./data.db          # SQLite lokal (default, Pi/dev)
# DATABASE_URL=libsql://[db].[org].turso.io    # Turso
# TURSO_AUTH_TOKEN=...                          # wajib jika Turso/libSQL self-hosted
# DATABASE_URL=postgresql://user:pass@host/db  # Supabase / Neon / self-hosted
# DATABASE_URL=mysql://user:pass@host/db       # PlanetScale / self-hosted

# File storage
STORAGE_DRIVER=local    # 'local' (default) | 's3'
UPLOAD_DIR=./uploads    # hanya dipakai jika STORAGE_DRIVER=local

# S3 / R2 / MinIO — hanya jika STORAGE_DRIVER=s3
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET=stokasir-uploads
S3_REGION=auto
S3_ENDPOINT=            # kosong = AWS default; isi untuk R2/MinIO
S3_PUBLIC_URL=          # base URL publik untuk akses file (https://cdn.example.com)

# Opsional
JWT_EXPIRY_HOURS=12
```

## Frontend (`frontend/.env`)

```text
PUBLIC_DEPLOYMENT_MODE=offline   # 'offline' (LAN/Pi) | 'online' (cloud VPS)
PUBLIC_API_URL=                  # kosong = /api via Nginx proxy
```

Wajib rebuild frontend (`bun run build`) setelah ganti nilai `PUBLIC_*`.

## Perbedaan mode frontend

| | `offline` (default) | `online` |
|---|---|---|
| SW cache endpoints | 5 (semua kasir-critical) | 1 (pengaturan/publik saja) |
| Pesan offline | "WiFi toko dan server menyala" | "koneksi internet" |

## Deploy Checklist

### SQLite / Raspberry Pi (offline LAN)
1. `bun run db:migrate` — apply SQLite migrations
2. `bun run db:seed` — seed toko-1, cabang-1, admin user
3. `bun run build` (frontend dengan `PUBLIC_DEPLOYMENT_MODE=offline`)
4. Jalankan backend + serve frontend via Nginx

### Turso (cloud libSQL — recommended untuk cloud)
1. Buat DB di turso.tech → dapat DATABASE_URL + TURSO_AUTH_TOKEN
2. Set env: `DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... JWT_SECRET=... FRONTEND_URL=...`
3. `bun run db:migrate` — apply SQLite migrations (Turso kompatibel)
4. `bun run db:seed`
5. Deploy backend + frontend (Fly.io / Railway / VPS)

### PostgreSQL (Supabase / Neon / self-hosted)
1. Set env: `DATABASE_URL=postgresql://...`
2. `bun run db:migrate` — apply `postgres/0000_gray_kingpin.sql` (72 tabel)
3. `bun run db:seed`
4. Deploy

### Cloud File Storage (opsional — untuk uploads persisten)
```
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com   # contoh Cloudflare R2
S3_BUCKET=stokasir-uploads
S3_REGION=auto
S3_PUBLIC_URL=https://cdn.example.com
```

## Backup & Restore

| Dialect | Backup format | Keterangan |
|---|---|---|
| SQLite | `.db` binary | Download via pengaturan → Backup |
| Turso/libSQL | `.json.gz` streaming | NDJSON per baris, gzip on-the-fly |
| PostgreSQL | `.json.gz` streaming | Sama seperti libSQL |

**Include media** (`?include_media=1`): jika `STORAGE_DRIVER=local`, sertakan semua file di `uploads/` sebagai base64 dalam `.json.gz`.

Restore `.json.gz`: disable FK → truncate semua tabel → re-insert batch 200 → restore file gambar.

Untuk Turso: alternatif gunakan `turso db dump` via CLI atau Turso dashboard.

## Migrations

```bash
# Generate migration baru setelah ubah schema.ts
cd backend && bun run db:generate

# Apply migration
cd backend && bun run db:migrate
```

Migration output:
- SQLite/Turso → `src/db/migrations/sqlite/`
- PostgreSQL → `src/db/migrations/postgres/`
- MySQL → `src/db/migrations/mysql/`
