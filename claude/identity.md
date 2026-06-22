# Identitas & Prinsip

Aplikasi manajemen stok-kasir grosir/eceran. Webview lokal via WiFi LAN atau cloud.
Multi-toko, multi-cabang. Offline-first, siap deploy ke Turso/Supabase/Railway/Fly.io.

```
SIMPEL → sedikit dependencies   RINGAN → cepat di HP jadul
OFFLINE → tanpa internet        WEBVIEW → 1 codebase, HP & laptop
```

## Tech Stack

```
Frontend  : SvelteKit + TypeScript + TailwindCSS (font: dynamic)
Backend   : Hono.js + Bun runtime, port 3000
Database  : SQLite (default) / Turso libSQL / PostgreSQL / MySQL
            ORM: Drizzle ORM — builders.ts abstraksi multi-dialect
Auth      : JWT via jose, httpOnly cookie `auth_token`, RBAC
Storage   : STORAGE_DRIVER=local (uploads/ di disk) | s3 (S3/R2/MinIO)
```

```bash
cd backend  && bun run dev       # http://localhost:3000
cd frontend && bun run dev       # http://localhost:5173
cd backend  && bun run db:generate && bun run db:migrate
```

## Struktur Folder

```
frontend/src/
  routes/(app)/
    dashboard/   kasir/    gudang/    karyawan/
    keuangan/    laporan/  harga/     pengaturan/
    pengaturan/toko/       ← admin CRUD toko + cabang
  lib/
    components/{ui,data,form,layout}/
    stores/        utils/{api.ts,async.ts,wa.ts,audit.ts,upload.ts}
                            └─ upload.ts: imgUrl()/thumbUrl() helper

backend/src/
  routes/   db/{schema.ts,index.ts,builders.ts,migrations/}
  middleware/{auth.ts,tenant.ts,upload.ts}
  lib/{event-bus.ts,hooks.ts}        ← SOP engine
  utils/{log.ts,audit.ts,storage.ts,backup-logical.ts}
              └─ storage.ts: storagePut() — driver local|s3
              └─ backup-logical.ts: createBackupStream()/restoreFromBackup()
```

## Multi-Toko / Multi-Cabang

```
Hierarki: Toko (tenant_id) → isolasi antar bisnis berbeda
              └── Cabang (cabang_id) → filter dalam 1 toko

JWT payload: { id, nama, role, tenant_id, cabang_id }
  cabang_id = null → lihat semua cabang dalam toko (manajer/pemilik)

tenantMiddleware: set tenant_id + cabang_id dari JWT ke context
Pola query:
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? null
  where: and(eq(t.tenant_id, tenantId), cabangId ? eq(t.cabang_id, cabangId) : undefined)

Tabel master (barang, supplier, pelanggan): filter tenant_id saja
Tabel transaksional (penjualan, stok, kas, shift): filter tenant_id + cabang_id
Tabel karyawan: kolom toko_id (FK ke toko), bukan tenant_id
```

## RBAC

```
pemilik    → * (semua permission)
manajer    → semua kecuali role.kelola
kasir      → stok.lihat, harga_jual.lihat, penjualan.*, absensi.diri
gudang     → stok.*, harga_beli.*, pembelian.*, absensi.diri
sales      → penjualan.*, pelanggan.*, absensi.diri
pelayanan  → penjualan.lihat, pelanggan.*, absensi.diri
```

Permission format: `modul.aksi` (stok.lihat, harga_beli.edit, penjualan.void, dll.)
Cek role di frontend: `import { user } from '$lib/stores/auth.js'` → `$user.role`
