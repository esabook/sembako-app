# Identitas & Prinsip

Aplikasi manajemen stok-kasir grosir/eceran. Webview lokal via WiFi LAN.
1 developer, 1 toko, < 5 karyawan. Offline-first, siap migrasi ke Turso/Supabase.

```
SIMPEL → sedikit dependencies   RINGAN → cepat di HP jadul
OFFLINE → tanpa internet        WEBVIEW → 1 codebase, HP & laptop
```

## Tech Stack

```
Frontend  : SvelteKit + TypeScript + TailwindCSS (font: JetBrains Mono)
Backend   : Hono.js + Bun runtime, port 3000
Database  : SQLite via bun:sqlite (bukan better-sqlite3), ORM: drizzle-orm/bun-sqlite
Auth      : JWT via jose, httpOnly cookie `auth_token`, RBAC
Storage   : backend/uploads/{produk,invoice,karyawan}/
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
    pengaturan/notifikasi/   pengaturan/audit/
    kasir/retur/   gudang/label/
  lib/
    components/{ui,data,form,layout}/
    stores/        utils/{api.ts,async.ts,wa.ts,audit.ts}

backend/src/
  routes/   db/{schema.ts,index.ts,migrations/}
  middleware/{auth.ts,upload.ts}
  lib/{event-bus.ts,hooks.ts}   ← SOP engine
  utils/{log.ts,audit.ts}
```

## RBAC

```
pemilik  → *
manajer  → semua kecuali role.kelola
kasir    → stok.lihat, harga_jual.lihat, penjualan.*, absensi.diri
gudang   → stok.*, harga_beli.*, pembelian.*, absensi.diri
```

Permission format: `modul.aksi` (stok.lihat, harga_beli.edit, penjualan.void, dll.)
Cek role di frontend: `import { user } from '$lib/stores/auth.js'` → `$user.role`
