# Deploy Backend ke Cloudflare Workers + D1

## Prasyarat

- Akun Cloudflare + Workers plan (free cukup untuk dev)
- `wrangler` sudah terinstall sebagai devDependency
- Login: `bunx wrangler login`

---

## Setup Awal (Sekali)

### 1. Buat D1 database

```bash
bun run cf:d1:create
# atau: bunx wrangler d1 create stokasir
```

Copy `database_id` dari output, paste ke `backend/wrangler.toml`:

```toml
[[d1_databases]]
database_id = "PASTE_ID_DI_SINI"
```

### 2. Set secret JWT

```bash
bunx wrangler secret put JWT_SECRET
# masukkan string min 32 karakter
```

### 3. Update vars di wrangler.toml

Edit `backend/wrangler.toml` sesuai environment produksi:

```toml
[vars]
FRONTEND_URL = "https://your-app.pages.dev"
PLATFORM_ADMIN_PASSWORD = "ganti-password-kuat"
# dst.
```

---

## Migrasi Database

```bash
# Test lokal dulu (D1 lokal via wrangler)
bun run cf:d1:migrate:local

# Apply ke D1 produksi
bun run cf:d1:migrate
```

Migrasi diambil dari `src/db/migrations/sqlite/` — file SQL yang sama dengan SQLite lokal (D1 = SQLite-compatible).

---

## Deploy

```bash
bun run cf:deploy
# = bunx wrangler deploy
```

### Dev lokal dengan D1

```bash
bun run cf:dev
# = bunx wrangler dev src/worker.ts
# berjalan di http://localhost:8787
```

---

## Arsitektur

### Entry point

| Mode | File | DB |
|------|------|----|
| Bun (lokal/Pi/server) | `src/index.ts` | SQLite / PG / MySQL / Turso |
| Cloudflare Workers | `src/worker.ts` | D1 |

### Cara D1 diinject ke routes

Semua 50+ route file import `db` dari `src/db/index.ts`. Di CF Workers tidak bisa inisialisasi DB di module level karena D1 binding baru tersedia saat request datang.

Solusi: ESM named export adalah **live binding** — `export let db` di `db/index.ts` memungkinkan `setD1Db()` mengganti nilai `db` dan semua importer otomatis mendapat nilai baru, tanpa ubah satu pun file route.

```
worker.ts middleware (request pertama)
  → setD1Db(drizzle(c.env.DB))
  → db di db/index.ts di-reassign
  → semua routes langsung pakai D1
```

### Modules yang di-stub untuk CF Workers

| Module | Stub |
|--------|------|
| `bun:sqlite` | `src/db/stubs/bun-sqlite.ts` |

Didaftarkan di `wrangler.toml`:
```toml
[alias]
"bun:sqlite" = "./src/db/stubs/bun-sqlite.ts"
```

### Yang TIDAK tersedia di CF Workers

| Fitur | Alternatif |
|-------|-----------|
| `/uploads/*` serve file | R2 public bucket / Cloudflare Images |
| Image resize (`sharp`) | Cloudflare Images API — upload.ts fallback ke passthrough |
| `initScheduler()` (setInterval) | CF Cron Triggers di wrangler.toml |
| Local SQLite WAL / PRAGMA | — (D1 handle otomatis) |

---

## Variabel Lingkungan

### [vars] di wrangler.toml (bukan rahasia)

| Key | Default | Keterangan |
|-----|---------|-----------|
| `DATABASE_URL` | `d1://` | Sentinel — jangan diubah untuk CF mode |
| `JWT_EXPIRY_HOURS` | `12` | Durasi token JWT |
| `FRONTEND_URL` | — | CORS origin, pisah koma jika multi |
| `SAAS_GATING` | `0` | `1` = aktifkan mode SaaS, cek langganan |
| `STORAGE_DRIVER` | `r2` | `local` / `r2` / `s3` |
| `PLATFORM_ADMIN_USER` | `superadmin` | Username admin platform |

### Secrets (via `wrangler secret put`)

| Key | Keterangan |
|-----|-----------|
| `JWT_SECRET` | Wajib, min 32 karakter |
| `PLATFORM_ADMIN_PASSWORD` | Bisa juga di [vars] jika tidak sensitif |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Jika pakai R2/S3 untuk uploads |

---

## Scripts

```bash
bun run cf:dev              # dev lokal dengan D1
bun run cf:deploy           # deploy ke CF Workers
bun run cf:d1:create        # buat D1 database baru
bun run cf:d1:migrate       # migrate D1 produksi
bun run cf:d1:migrate:local # migrate D1 lokal
bun run cf:secret           # shortcut wrangler secret put
bun run cf:types            # generate CF types (worker-configuration.d.ts)
```

---

## Typecheck untuk CF Workers

```bash
bunx tsc -p tsconfig.worker.json --noEmit
```

File `tsconfig.worker.json` menggunakan `@cloudflare/workers-types` instead of `@types/bun`.
