# Deploy Frontend ke Cloudflare Pages

> Backend Workers? Baca [`doc/backend/deploy_wrangler.md`](../backend/deploy_wrangler.md).

Frontend di-deploy sebagai **Cloudflare Pages + Functions** — halaman statis di-serve dari edge, SSR routes berjalan sebagai Functions (Workers runtime).

---

## Prasyarat

- Akun Cloudflare (free cukup)
- `wrangler` sudah terinstall sebagai devDependency di `backend/`
- Login: `bunx wrangler login` (dari folder mana saja)
- Backend sudah di-deploy ke CF Workers (butuh URL-nya untuk `BACKEND_URL`)

---

## Arsitektur Proxy

Frontend **tidak** meng-hardcode URL backend ke JS bundle. Semua request API dikirim ke `/api/*` → Pages Function proxy → Workers backend.

```
Browser → /api/* → Pages Function (_worker.js)
                        → BACKEND_URL (env var server-side)
                        → https://stokasir-backend.xxx.workers.dev
```

Keuntungan: URL backend tidak ter-bake di bundle, cukup set `BACKEND_URL` di wrangler.toml tanpa rebuild.

### Pengecualian: WebSocket scan-relay

Proxy `/api/*` (Pages Function) **tidak bisa** mem-forward upgrade WebSocket (101) —
SvelteKit server route mem-buffer body. Jadi untuk scan-relay real-time, browser konek
**langsung** ke backend Workers via `PUBLIC_WS_URL`, melewati proxy:

```
Browser → GET /api/scan-relay/ws-ticket   → proxy → backend (mint ticket JWT 60s, cookie)
Browser → wss://PUBLIC_WS_URL/scan-relay/ws/:id?ticket=…   (LANGSUNG ke Workers, Durable Object)
```

Karena cookie `auth_token` httpOnly tak ikut WS cross-domain, auth WS pakai ticket
(bukan cookie). Hanya aktif saat `PUBLIC_DEPLOYMENT_MODE=online` + `PUBLIC_WS_URL` di-set;
mode LAN/offline pakai long-poll lewat proxy biasa. Detail backend: [`doc/backend/deploy_wrangler.md`](../backend/deploy_wrangler.md#real-time-scan-relay-durable-object--websocket-hibernation).

---

## Urutan Deploy (Chicken-Egg)

Frontend butuh URL backend (`BACKEND_URL`), backend butuh URL frontend (`FRONTEND_URL`).

URL backend bisa diprediksi **sebelum** deploy — format-nya selalu sama:
`https://stokasir-backend.YOUR-SUBDOMAIN.workers.dev`

**Cek subdomain CF kamu:** `dash.cloudflare.com` → Workers & Pages → Overview → lihat `*.workers.dev`

Urutan yang benar:

```
1. Deploy backend (FRONTEND_URL = placeholder)
      → dapat URL: https://stokasir-backend.YOUR-SUBDOMAIN.workers.dev
2. Set BACKEND_URL di frontend/wrangler.toml → build + deploy frontend
      → dapat URL: https://stokasir-frontend.pages.dev (atau nama project kamu)
3. Update FRONTEND_URL di backend/wrangler.toml → redeploy backend
```

Total: 2x deploy backend, 1x deploy frontend.

---

## Setup Awal (Sekali)

### 1. Set BACKEND_URL di wrangler.toml

Edit `frontend/wrangler.toml`, isi URL backend CF Workers:

```toml
[vars]
PUBLIC_DEPLOYMENT_MODE = "online"
BACKEND_URL = "https://stokasir-backend.YOUR-SUBDOMAIN.workers.dev"
# Origin WS scan-relay — browser konek langsung (bypass proxy). Pakai skema wss://
PUBLIC_WS_URL = "wss://stokasir-backend.YOUR-SUBDOMAIN.workers.dev"
```

`BACKEND_URL` adalah server-side private var — tidak terekspos ke browser.
`PUBLIC_WS_URL` **publik** (browser butuh untuk konek WS langsung) — isi origin backend
yang sama, skema `wss://`.

### 2. Update FRONTEND_URL di backend

CF Pages assign URL default saat deploy pertama.
Update `backend/wrangler.toml`:

```toml
[vars]
FRONTEND_URL = "https://stokasir-frontend.pages.dev,https://stokasir.pages.dev"
```

Lalu redeploy backend:

```bash
cd backend && bun run cf:deploy
```

---

## Build

```bash
cd frontend

# Development build
bun run build:cf

# Production build (direkomendasikan untuk deploy)
bun run build:cf:prod
```

Output masuk ke `.svelte-kit/cloudflare/`.

> `PUBLIC_DEPLOYMENT_MODE=online` sudah di-set otomatis oleh script `build:cf` — landing page marketing aktif, redirect ke `/kasir` nonaktif.

---

## Deploy

```bash
cd frontend

# Build dulu
bun run build:cf:prod

# Deploy ke produksi
bunx wrangler pages deploy .svelte-kit/cloudflare --project-name=stokasir-frontend

# Deploy ke preview (tidak mengganti produksi)
bunx wrangler pages deploy .svelte-kit/cloudflare --project-name=stokasir-frontend --branch=preview
```

---

## Env Vars

### Semua vars di wrangler.toml

| Key | Scope | Kapan dibaca | Keterangan |
|-----|-------|-------------|-----------|
| `PUBLIC_DEPLOYMENT_MODE` | Runtime `[vars]` | Server saat request | `"online"` aktifkan marketing + transport WS scan-relay |
| `BACKEND_URL` | Runtime `[vars]` | Server saat request (proxy) | URL Workers backend — private |
| `PUBLIC_WS_URL` | Runtime `[vars]` | Browser (client) | Origin `wss://` backend untuk WS scan-relay langsung. Kosong = long-poll |
| `PUBLIC_UMAMI_SRC` | Runtime `[vars]` | Server saat request | URL script Umami analytics |
| `PUBLIC_UMAMI_ID` | Runtime `[vars]` | Server saat request | Dataset ID Umami |

**Semua vars dibaca via `$env/dynamic/public` atau `platform.env` — cukup set di `[vars]`, tidak perlu rebuild.**

### Preview environment

`[env.preview.vars]` di `frontend/wrangler.toml` untuk deploy ke branch `preview`:

```toml
[env.preview.vars]
PUBLIC_DEPLOYMENT_MODE = "online"
BACKEND_URL = "https://stokasir-backend.YOUR-SUBDOMAIN.workers.dev"
PUBLIC_WS_URL = "wss://stokasir-backend.YOUR-SUBDOMAIN.workers.dev"
```

### Set vars via dashboard (override wrangler.toml)

Cloudflare Dashboard → Pages → stokasir-frontend → Settings → Environment variables.

> Vars di dashboard **override** wrangler.toml untuk production/preview environment.

---

## Dev Lokal dengan Wrangler

Untuk test SSR Functions secara lokal (mensimulasikan CF runtime):

```bash
cd frontend

# Build dulu
bun run build:cf

# Jalankan Pages dev server
bunx wrangler pages dev .svelte-kit/cloudflare --port=4173
```

Akses di `http://localhost:4173`.

> Ini berbeda dari `bun run dev` (Vite dev server). Gunakan `wrangler pages dev` untuk test edge behavior, cookies, SSR, dan proxy `/api/*`.

---

## Custom Domain (Opsional)

Cloudflare Dashboard → Pages → stokasir-frontend → Custom domains → Set up a custom domain.

Setelah custom domain aktif, update `FRONTEND_URL` di `backend/wrangler.toml` dan redeploy backend.

---

## Arsitektur File

### Adapter

| Mode build | Adapter | Output |
|-----------|---------|--------|
| `bun run build` | `svelte-adapter-bun` | `build/` (Node/Bun server) |
| `bun run build:cf` | `@sveltejs/adapter-cloudflare` | `.svelte-kit/cloudflare/` |

Dikontrol via `DEPLOY_TARGET=cloudflare` di `svelte.config.js`.

### File output CF Pages

| File | Fungsi |
|------|--------|
| `_worker.js` | Entry point SSR Functions (semua SSR routes + proxy `/api/*`) |
| `_routes.json` | Auto-generated — mana request ke Functions, mana ke static |
| `_headers` | Cache rules untuk static assets |
| `_app/immutable/*` | JS/CSS chunks dengan content hash — `max-age=31536000, immutable` |

### SSR vs Prerender

| Route | Behavior |
|-------|---------|
| `(app)/` + `(kasir)/` | `ssr = true` → jalan sebagai Functions (edge) |
| `scan/` + `scanner/` | `ssr = false` → CSR, static HTML shell |
| `(marketing)/` + `daftar/` | `prerender = true` → static HTML, deploy tanpa Functions |
| `sitemap.xml/` | Server route → Functions |

### Yang tidak tersedia di CF Pages Functions

| Fitur | Status |
|-------|--------|
| Node.js `fs`, `path` | Tidak tersedia — tapi frontend tidak pakai |
| `Bun.*` API | Tidak tersedia — sudah diisolasi di bun adapter |
| Long-running process | CPU limit 10ms (free) / 30s (paid) per request |

---

## Troubleshooting

### Build gagal: "Cannot find module 'svelte-adapter-bun'"

Tidak terkait — ini error saat `bun run build` (bun adapter). Untuk CF build, gunakan `bun run build:cf`.

### SSR route 500 di production

Cek logs:
```bash
bunx wrangler pages deployment tail --project-name=stokasir-frontend
```

### Request ke /api/* gagal / 502

`BACKEND_URL` belum diset atau salah. Cek via wrangler pages dev dulu.

### CORS error dari frontend ke backend

Backend `FRONTEND_URL` belum diupdate dengan URL CF Pages. Update dan redeploy backend.

### CPU time exceeded (free plan)

Laporan berat (join banyak tabel) bisa trigger limit 10ms. Opsi:
1. Upgrade ke Workers Paid (30s limit)
2. Pindah query berat ke background Worker via Queue
3. Cache hasil di KV

---

## Catatan

- CF Pages free: 500 deployment/bulan, 100k Function request/hari — cukup untuk toko kecil
- Static assets (JS/CSS/images) tidak dihitung ke limit Functions
- Service Worker frontend tetap berjalan di CF Pages — offline mode aktif jika user sudah buka app sebelumnya
