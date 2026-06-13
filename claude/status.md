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
| **Fase D-2** — PostgreSQL Migration | ✅ Selesai | builders dialect-aware, PG migration generated (70 tabel) |
| **Fase D** — Multi-tenant Cutover | ⏸ Ditunda | Tunggu toko kedua nyata |

**Modul aktif:** dashboard, kasir, gudang, karyawan, keuangan, laporan, harga, pengaturan, kasir/retur, gudang/label, promo, pelanggan, crm, sales, aset, keuangan/pinjaman, tamu, tugas, hajatan, inspeksi, karyawan/izin, karyawan/evaluasi, karyawan/sanksi.

**Roles aktif:** pemilik, manajer, kasir, gudang, sales, pelayanan (6 role).

## Bugfix Wajib

### Masih Open

_(tidak ada saat ini)_

### Sudah Diperbaiki

- TabReturSupplier: DataTable snippet API (`{#snippet body()}`) bukan default slot
- keuangan/+page.svelte: `onclick|self` → `onclick={(e) => if (e.target===e.currentTarget)…}`
- Semua a11y warnings label for/id + dialog tabindex/keyboard
- backend/index.ts: array-destructure count() → `.get()` agar TypeScript-safe
- absensi-kiosk.ts: destructure split default value; tugas.ts: non-null assertion
- penjualan.ts + retur-supplier.ts: `.get()!` → null guard + HTTPException
- penggajian.ts: N+1 generate gaji → 5 total queries via inArray + Map
- 6 index DB baru: karyawan, barang, barang_masuk_detail, penggajian, kasbon, notifikasi_log

## Backlog

```text
Aktif:
  [ ] Fase D — migrasi ke PostgreSQL (hanya saat toko kedua)

Pertimbangan jangka panjang:
  [x] Service Worker / offline cache — fully implemented dengan deployment mode env
  [x] tenant_id di semua tabel (A1, done)
  [x] Backup & Restore UI (A4, done)
  [ ] Multi-toko / multi-cabang → Fase D
  [x] Migrasi ke Turso (libSQL) untuk akses remote — core done; set DATABASE_URL=libsql://... + TURSO_AUTH_TOKEN; backup/restore return 501 untuk non-sqlite dialect
  [x] Konversi 60 kolom real → integer Rupiah (Fase D-1 selesai, doc: currency_audit.md)
```
