# Deploy Frontend ke Cloudflare Pages

> Backend Workers? Baca [`doc/backend/deploy_wrangler.md`](../backend/deploy_wrangler.md).

Frontend di-deploy sebagai **Cloudflare Pages + Functions** — halaman statis di-serve dari edge, SSR routes berjalan sebagai Functions (Workers runtime).

---

## Prasyarat

- Akun Cloudflare (free cukup)
- `wrangler` sudah terinstall sebagai devDependency di `backend/`
- Login: `bunx wrangler login` (dari folder mana saja)
- Backend sudah di-deploy ke CF Workers (butuh URL-nya untuk `PUBLIC_API_URL`)

---

## Urutan Deploy (Chicken-Egg)

Frontend butuh URL backend (`PUBLIC_API_URL`), backend butuh URL frontend (`FRONTEND_URL`).
Solusi: URL backend bisa diprediksi **sebelum** deploy — format-nya selalu sama.

**Cek subdomain CF kamu:** `dash.cloudflare.com` → Workers & Pages → Overview → lihat `*.workers.dev`

Urutan yang benar:

```
1. Deploy backend (FRONTEND_URL = placeholder)
      → dapat URL: https://stokasir-backend.YOUR-SUBDOMAIN.workers.dev
2. Set PUBLIC_API_URL → build + deploy frontend
      → dapat URL: https://stokasir-frontend.pages.dev
3. Update FRONTEND_URL di backend → redeploy backend
```

Total: 2x deploy backend, 1x deploy frontend.
Backend deploy pertama tetap normal — CORS hanya gagal jika ada request dari frontend, tapi frontend belum ada.

---

## Setup Awal (Sekali)

### 1. Set PUBLIC_API_URL di wrangler.toml

Edit `frontend/wrangler.toml`, isi URL backend CF Workers:

```toml
[vars]
PUBLIC_DEPLOYMENT_MODE = "online"
PUBLIC_API_URL = "https://stokasir-backend.YOUR-SUBDOMAIN.workers.dev"
```

> **Catatan:** `PUBLIC_API_URL` di-bake saat build (`import.meta.env`). Perubahan wrangler.toml di bagian `[vars]` untuk key ini tidak otomatis berlaku — harus rebuild. Lihat [Env Vars](#env-vars) di bawah.

### 2. Update FRONTEND_URL di backend

CF Pages assign URL default `https://stokasir-frontend.pages.dev` saat deploy pertama.
Update `backend/wrangler.toml`:

```toml
[vars]
FRONTEND_URL = "https://stokasir-frontend.pages.dev"
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
# (deploy pertama: wrangler otomatis buat project baru di Cloudflare jika belum ada)
bunx wrangler pages deploy .svelte-kit/cloudflare --project-name=stokasir-frontend

# Deploy ke preview (tidak mengganti produksi)
bunx wrangler pages deploy .svelte-kit/cloudflare --project-name=stokasir-frontend --branch=preview
```

---

## Env Vars

### Klasifikasi

| Cara set | Key | Kapan dibaca | Contoh |
|----------|-----|-------------|--------|
| Build-time (script env) | `PUBLIC_API_URL` | Di-bake ke JS saat `vite build` | URL backend |
| Runtime `[vars]` (wrangler.toml) | `PUBLIC_DEPLOYMENT_MODE` | Dibaca server saat request | `"online"` |
| Runtime `[vars]` (wrangler.toml) | `PUBLIC_UMAMI_SRC/ID` | Dibaca server saat request | URL Umami |

**Aturan penting:**
- `PUBLIC_API_URL` pakai `import.meta.env` → wajib di-set di environment **sebelum build**, bukan hanya di `[vars]`
- `PUBLIC_DEPLOYMENT_MODE` pakai `$env/dynamic/public` → dibaca dari `platform.env` saat runtime, cukup set di `[vars]`

### Set PUBLIC_API_URL untuk build

Cara 1 — export sebelum build:
```bash
export PUBLIC_API_URL="https://stokasir-backend.YOUR-SUBDOMAIN.workers.dev"
bun run build:cf:prod
```

Cara 2 — file `.env.cf` (jangan di-commit):
```bash
# frontend/.env.cf
PUBLIC_API_URL=https://stokasir-backend.YOUR-SUBDOMAIN.workers.dev
```
```bash
env $(cat .env.cf) bun run build:cf:prod
```

Cara 3 — GitHub Actions (CI/CD), set sebagai repository secret lalu inject ke env build.

### Set vars runtime via dashboard

Cloudflare Dashboard → Pages → stokasir-frontend → Settings → Environment variables:

```
PUBLIC_UMAMI_SRC   = https://analytics.example.com/script.js   [optional]
PUBLIC_UMAMI_ID    = xxxx-xxxx-xxxx                             [optional]
```

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

> Ini berbeda dari `bun run dev` (Vite dev server). Gunakan `wrangler pages dev` untuk test edge behavior, cookies, SSR.

---

## Custom Domain (Opsional)

Cloudflare Dashboard → Pages → stokasir-frontend → Custom domains → Set up a custom domain.

Setelah custom domain aktif, update `FRONTEND_URL` di `backend/wrangler.toml` dan redeploy backend.

---

## Arsitektur

### Adapter

| Mode build | Adapter | Output |
|-----------|---------|--------|
| `bun run build` | `svelte-adapter-bun` | `build/` (Node/Bun server) |
| `bun run build:cf` | `@sveltejs/adapter-cloudflare` | `.svelte-kit/cloudflare/` |

Dikontrol via `DEPLOY_TARGET=cloudflare` di `svelte.config.js`.

### File output CF Pages

| File | Fungsi |
|------|--------|
| `_worker.js` | Entry point SSR Functions (semua SSR routes) |
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

### PUBLIC_API_URL kosong / `/api` tidak jalan

`PUBLIC_API_URL` harus di-set sebelum build. Verifikasi:
```bash
# Cek apakah URL ter-bake di output
grep -r "workers.dev" .svelte-kit/cloudflare/_worker.js | head -3
```

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
