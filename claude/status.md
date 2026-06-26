# Status Implementasi

| Fase | Status | Catatan |
|------|--------|---------|
| **Fase A** — SaaS-Readiness | ✅ Selesai | A1–A4 done; A5 (i18n) skip |
| **Fase B** — SOP Engine + Primitif | ✅ Selesai | B1–B7 done; B8 (XState) skip |
| **Fase C** — Modul Ekor | ✅ Selesai | 25/25 modul PLAN(1).md done |
| **Sprint 1** — Performa & DX | ✅ Selesai | N+1, null-safety, index DB, debounce, withLoading, warna |
| **Sprint 2** — UX & Polish | ✅ Selesai | Page title, error page, animasi, toast, transisi modal |
| **Sprint 3** — Correctness | ✅ Selesai | Skeleton loader, Spinner SVG, deployment mode env |
| **Fase D-1** — Currency Integer | ✅ Selesai | 60 kolom real → integer, migrate.ts PRAGMA fix |
| **Fase D-2** — Multi-Dialect DB | ✅ Selesai | builders dialect-aware; PG migration di-regenerate dari schema terkini (72 tabel) |
| **Fase D-3** — Multi-Toko + Multi-Cabang | ✅ Selesai | Phase 1–4 done (lihat detail di bawah) |
| **Fase D-4** — Cloud Storage | ✅ Selesai | STORAGE_DRIVER=local\|s3, S3/R2/MinIO ready |
| **Fase D-5** — Backup/Restore Hybrid | ✅ Selesai | SQLite: binary .db; libSQL/PG: streaming NDJSON.gz; opsional include media |
| **Fase E-1** — Analytics + Chart | ✅ Selesai | layerchart@1.0.13; 3 wrapper (ChartBatang/Garis/Donat); chart di 12/13 tab laporan + halaman analitik |

**Modul aktif:** dashboard, kasir, gudang, karyawan, keuangan, laporan, harga, pengaturan, kasir/retur, gudang/label, promo, pelanggan, crm, sales, aset, keuangan/pinjaman, tamu, tugas, hajatan, inspeksi, karyawan/izin, karyawan/evaluasi, karyawan/sanksi.

**Roles aktif:** pemilik, manajer, kasir, gudang, sales, pelayanan (6 role).

---

## Detail Fase D-3: Multi-Toko + Multi-Cabang

**Hierarki:** `Toko (tenant_id)` → isolasi data antar bisnis · `Cabang (cabang_id)` → filter dalam satu toko

| Phase | Status | Isi |
|-------|--------|-----|
| **Phase 1** — Schema | ✅ | Tabel `toko`, `cabang`; kolom `toko_id`/`cabang_id` di `karyawan`; `cabang_id` di 10 tabel transaksional |
| **Phase 2** — Auth + Core | ✅ | JWT payload: `tenant_id`, `cabang_id`; `tenantMiddleware`; routes penjualan/stok/laporan/keuangan/shift |
| **Phase 3** — Semua Routes | ✅ | 42 route files diperbarui: semua query filter by `tenant_id`; transaksional juga by `cabang_id` |
| **Phase 4** — UI | ✅ | Topbar cabang; admin CRUD `/pengaturan/toko`; karyawan form dropdown cabang; laporan filter cabang |

**Pola tenant filter (semua route):**
```typescript
const tenantId = user.tenant_id ?? 1
const cabangId = user.cabang_id ?? null  // null = lihat semua cabang toko
// GET: eq(table.tenant_id, tenantId), cabangId ? eq(table.cabang_id, cabangId) : undefined
// INSERT: tenant_id: tenantId, cabang_id: cabangId ?? 1
```

**Catatan khusus:**
- `karyawan` pakai `toko_id` (FK ke toko), bukan `tenant_id`
- `toko_settings` pakai `toko_id`, bukan `tenant_id`
- `absensi-kiosk` (publik, tanpa JWT): derive `tenant_id` dari `karyawan.toko_id`
- Tabel master (barang, supplier, pelanggan): filter `tenant_id` saja, tidak ada `cabang_id`

---

## Detail Fase D-4: Cloud Storage

**Driver:** `STORAGE_DRIVER=local` (default) atau `STORAGE_DRIVER=s3`

| Mode | Behavior | Path di DB |
|------|----------|-----------|
| `local` | Simpan ke `UPLOAD_DIR` disk, serve `/uploads/*` | `subdir/file.jpg` (relatif) |
| `s3` | Upload ke S3/R2/MinIO via `@aws-sdk/client-s3` | `https://cdn.example.com/subdir/file.jpg` (full URL) |

Frontend `imgUrl(path)` / `thumbUrl(path)` di `$lib/utils/upload.ts` handle keduanya transparan.

**Env vars untuk S3:** `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_REGION`, `S3_PUBLIC_URL`

---

## Bugfix Wajib

### Masih Open

_(tidak ada saat ini)_

### Sudah Diperbaiki

- 30× `requirePermission('*')` di 9 route files → diganti permission string semantik (`pengaturan.kelola`, `karyawan.lihat`, `laporan.lihat`, `absensi.diri`)

- TabReturSupplier: DataTable snippet API (`{#snippet body()}`) bukan default slot
- keuangan/+page.svelte: `onclick|self` → `onclick={(e) => if (e.target===e.currentTarget)…}`
- Semua a11y warnings label for/id + dialog tabindex/keyboard
- backend/index.ts: array-destructure count() → `.get()` agar TypeScript-safe
- absensi-kiosk.ts: destructure split default value; tugas.ts: non-null assertion
- penjualan.ts + retur-supplier.ts: `.get()!` → null guard + HTTPException
- penggajian.ts: N+1 generate gaji → 5 total queries via inArray + Map
- 6 index DB baru: karyawan, barang, barang_masuk_detail, penggajian, kasbon, notifikasi_log

---

## Backlog

```text
Selesai:
  [x] Service Worker / offline cache — implemented dengan deployment mode env
  [x] tenant_id di semua tabel (Fase A1)
  [x] Backup & Restore UI (Fase A4)
  [x] Migrasi ke Turso (libSQL) remote — set DATABASE_URL=libsql://... + TURSO_AUTH_TOKEN
  [x] Konversi 60 kolom real → integer Rupiah (Fase D-1)
  [x] Multi-dialect DB (SQLite/Turso/PostgreSQL/MySQL) — builders.ts dialect-aware
  [x] PostgreSQL migration terkini — 0000_gray_kingpin.sql, 72 tabel, schema lengkap
  [x] Multi-toko + multi-cabang (Fase D-3, Phase 1–4)
  [x] Cloud file storage abstraction — STORAGE_DRIVER=local|s3 (Fase D-4)
  [x] Backup/restore hybrid — SQLite binary .db + libSQL/PG streaming NDJSON.gz (Fase D-5)
  [x] Analytics + chart laporan — layerchart wrapper; chart di 12/13 tab laporan (Fase E-1)

## Deploy Checklist

### Turso (cloud libSQL) — recommended
  1. Buat DB di turso.tech, dapat DATABASE_URL + TURSO_AUTH_TOKEN
  2. Set env: DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... JWT_SECRET=... FRONTEND_URL=...
  3. bun run db:migrate   ← apply SQLite migrations (Turso kompatibel)
  4. bun run db:seed      ← buat toko-1, cabang-1, admin user
  5. Deploy backend + frontend

### PostgreSQL (Supabase / Neon / self-hosted)
  1. Set env: DATABASE_URL=postgresql://...
  2. bun run db:migrate   ← apply postgres/0000_gray_kingpin.sql (72 tabel)
  3. bun run db:seed
  4. Deploy

### Cloud File Storage (opsional — untuk uploads persisten)
  Set: STORAGE_DRIVER=s3 S3_ENDPOINT=... S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=...
       S3_BUCKET=stokasir-uploads S3_PUBLIC_URL=https://cdn.example.com

Masih terbuka:
  [ ] Dockerfile + compose untuk self-hosted cloud (Fly.io / Railway / VPS)
  [ ] Backup/restore untuk Turso (saat ini 501 — gunakan Turso dashboard / turso db dump)
```
