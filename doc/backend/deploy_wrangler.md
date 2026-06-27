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

Copy `database_id` dari output, paste ke `backend/wrangler.toml` (binding `DB`):

```toml
[[d1_databases]]
binding = "DB"
database_id = "PASTE_ID_DI_SINI"
```

### 1b. Buat D1 database demo

Sandbox demo hidup di DB terpisah (binding `DB_DEMO`) agar bisa di-reset total
tanpa risiko ke data prod.

```bash
bunx wrangler d1 create stokasir_demo
```

Copy `database_id`, paste ke `backend/wrangler.toml` (binding `DB_DEMO`):

```toml
[[d1_databases]]
binding = "DB_DEMO"
database_id = "PASTE_DEMO_ID_DI_SINI"
```

### 2. Buat KV namespace

```bash
bunx wrangler kv namespace create stokasir-cache
```

Copy `id` dari output, paste ke `backend/wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "KV"
id = "PASTE_ID_DI_SINI"
```

KV dipakai untuk: rate limiting auth, cache kategori/satuan/barang list, cache dashboard.

### 3. Set secret JWT

```bash
bunx wrangler secret put JWT_SECRET
# masukkan string min 32 karakter
```

### 4. Update vars di wrangler.toml

Edit `backend/wrangler.toml` sesuai environment produksi:

```toml
[vars]
FRONTEND_URL = "https://your-app.pages.dev"
PLATFORM_ADMIN_PASSWORD = "ganti-password-kuat"
# dst.
```

### 5. Durable Object scan-relay — otomatis

`wrangler.toml` mendaftarkan Durable Object `RelayDO` (koordinator scan-relay
phone↔kasir, lihat [Arsitektur](#real-time-scan-relay-durable-object--websocket-hibernation)):

```toml
[[durable_objects.bindings]]
name = "RELAY"
class_name = "RelayDO"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["RelayDO"]   # SQLite-backed = free tier
```

Tak ada langkah manual — migrasi DO ikut otomatis saat `bun run cf:deploy`.
DO SQLite-backed sehingga jalan di **Workers free plan**.

---

## Migrasi Database

```bash
# Test lokal dulu (D1 lokal via wrangler)
bun run cf:d1:migrate:local

# Apply ke D1 produksi
bun run cf:d1:migrate

# DB demo — schema sama, apply ke stokasir_demo (tak ada npm script, panggil langsung)
bunx wrangler d1 migrations apply stokasir_demo --local    # test lokal
bunx wrangler d1 migrations apply stokasir_demo --remote    # produksi
```

Migrasi diambil dari `src/db/migrations/sqlite/` — file SQL yang sama dengan SQLite lokal (D1 = SQLite-compatible). DB demo pakai schema identik, jadi migrasi yang sama di-apply ke `stokasir_demo`.

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
| State in-memory lintas request (Map global) | Durable Object — isolate Workers tak share memori |

### Real-time scan-relay (Durable Object + WebSocket Hibernation)

Scan-relay (barcode dari HP → terminal kasir + sync qty) butuh state bersama
antar request. Di Bun satu proses cukup pakai `Map` global ([scan_relay.ts](../../backend/src/routes/scan_relay.ts)),
tapi di Workers **rusak**: tiap request bisa kena isolate berbeda — GET listener
daftar di isolate A, POST scan kena isolate B → `Map` kosong → `503`.

Solusi mode cloud: Durable Object `RelayDO` jadi titik koordinasi konsisten
per-session.

| File | Peran |
|------|-------|
| [`src/do/relay-do.ts`](../../backend/src/do/relay-do.ts) | Class `RelayDO` — `ctx.acceptWebSocket` (hibernatable), broadcast, pre-qty persist di `ctx.storage` |
| [`src/do/relay-types.ts`](../../backend/src/do/relay-types.ts) | Seam bertipe (`RelayNamespace`, `relayStub`) — isolasi DO API dari route, tanpa `any` |
| [`src/routes/scan_relay_do.ts`](../../backend/src/routes/scan_relay_do.ts) | Router Workers — ticket JWT + upgrade WS + forward POST ke DO |
| [`src/routes/scan_relay.ts`](../../backend/src/routes/scan_relay.ts) | Versi Bun/LAN (long-poll) — **dipakai di `index.ts`, tak diubah** |

Alur & biaya:

- **Listener** (kasir/gudang/HP) konek WS → DO `acceptWebSocket`. Idle = hibernate,
  **0 biaya duration** (cuma kena saat ada pesan). Muat free tier sampai ratusan toko.
- **Sender scan** (kamera HP) tetap HTTP POST `/scan-relay/scanner/:id` → worker forward
  ke DO → broadcast ke listener.
- **Auth WS**: cookie `auth_token` httpOnly **tak ikut** WS cross-domain, jadi browser
  ambil ticket JWT 60s via `GET /scan-relay/ws-ticket` (lewat proxy /api, cookie jalan),
  lalu konek WS langsung ke backend dengan `?ticket=`. Worker validasi ticket (cek tenant),
  bukan cookie.
- WS accept + hibernation **wajib** di class DO pakai `ctx.acceptWebSocket` — Hono
  `upgradeWebSocket` TIDAK hibernate (akan tetap nagih duration).

Mode Bun/LAN (`index.ts`) tetap pakai long-poll `scan_relay.ts` — DO tak ada di Bun,
dan offline tak butuh.

---

## Variabel Lingkungan

### [vars] di wrangler.toml (bukan rahasia)

| Key | Nilai prod | Keterangan |
|-----|------------|-----------|
| `DATABASE_URL` | `d1://` | Sentinel — jangan diubah untuk CF mode |
| `DEMO_DATABASE_URL` | `d1://` | Sentinel DB demo — route ke binding `DB_DEMO` |
| `JWT_EXPIRY_HOURS` | `12` | Durasi token JWT |
| `FRONTEND_URL` | (URL Pages, pisah koma) | CORS origin, bisa multi nilai |
| `SAAS_GATING` | `1` | `1` = aktifkan mode SaaS, cek langganan |
| `NODE_ENV` | `production` | Environment mode |
| `STORAGE_DRIVER` | `r2` | `local` / `r2` / `s3` |
| `UPLOAD_DIR` | `""` | Kosong di CF mode (pakai R2) |
| `S3_ENDPOINT` | `""` | Kosong jika pakai R2 native |
| `S3_REGION` | `auto` | Region R2/S3 |
| `S3_BUCKET` | `""` | Nama bucket |
| `S3_PUBLIC_URL` | `""` | URL publik bucket |
| `PLATFORM_ADMIN_USER` | `superadmin` | Username admin platform |
| `PLATFORM_ADMIN_PASSWORD` | (set langsung) | Password admin platform |

### Secrets (via `wrangler secret put`)

| Key | Keterangan |
|-----|-----------|
| `JWT_SECRET` | Wajib, min 32 karakter |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Jika pakai R2/S3 untuk uploads |

---

## Observability

`wrangler.toml` mengaktifkan logging otomatis:

```toml
[observability.logs]
enabled = true
invocation_logs = true
```

Lihat logs live:
```bash
bunx wrangler tail
```

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
