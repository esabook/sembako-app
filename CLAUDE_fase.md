# CLAUDE_fase.md — Status Aktif & Next Steps

Versi  : 1.1
Tanggal: 2026-05-17
Baca file ini PERTAMA untuk orientasi cepat sebelum membaca CLAUDE.md / CLAUDE_v2.md.
File ini adalah OVERRIDE TERTINGGI untuk status implementasi dan konvensi aktif.

---

## FASE AKTIF: FASE 5 — Notifikasi & Polish

Fase 1–4 selesai: Fondasi → Operasional Inti → Keuangan → Laporan

---

## STATUS IMPLEMENTASI

| Modul | Status | Catatan |
|---|---|---|
| Auth + RBAC (4 role) | ✅ SELESAI | |
| Master Data (barang/supplier/pelanggan/karyawan/kategori/satuan) | ✅ SELESAI | |
| Kasir + Shift (F11/F12) | ✅ SELESAI | shortcut keyboard lengkap |
| Scanner barcode (USB + kamera) | ✅ SELESAI | |
| Gudang (PO, terima barang, stok opname) | ✅ SELESAI | |
| Keuangan (jurnal kas, hutang supplier, piutang pelanggan) | ✅ SELESAI | |
| Laporan (L/R, arus kas, neraca) | ✅ SELESAI | ada uncommitted change |
| WhatsApp struk & notif | ✅ SELESAI | |
| Absensi & penggajian | ✅ SELESAI | |
| Kartu anggota pelanggan | ✅ SELESAI | |
| **Pengaturan Toko** | ✅ SELESAI | **PRIORITAS TINGGI** |
| **Manajemen Harga** | ✅ SELESAI | **PRIORITAS TINGGI** |
| **Retur Penjualan** | ✅ SELESAI | **PRIORITAS TINGGI** |
| **Notifikasi Terpusat** | ❌ BELUM | **PRIORITAS TINGGI** |
| Promo & Diskon | ❌ BELUM | Fase 6 |
| Label & Barcode cetak | ❌ BELUM | Fase 6 |
| Audit Trail UI | ❌ BELUM | Fase 6 (data log_aktivitas sudah ada) |
| Budget & Target | ❌ BELUM | Fase 6 |

---

## NEXT TASKS (urutan prioritas)

### 1. Commit laporan.ts
```bash
git add backend/src/routes/laporan.ts
git commit -m "fix(laporan): ..."
```

### 2. Modul Pengaturan Toko
```
Schema  : tambah tabel toko_settings ke schema.ts → migration baru
Backend : backend/src/routes/pengaturan.ts
Frontend: frontend/src/routes/(app)/pengaturan/+page.svelte + .ts + .api.ts + .store.ts
API     : GET /api/settings  |  PUT /api/settings/:key  |  POST /api/settings/backup
```

### 3. Modul Manajemen Harga
```
Schema  : tambah tabel harga_jadwal ke schema.ts → migration baru
Backend : backend/src/routes/harga.ts
Frontend: frontend/src/routes/(app)/harga/
API     : GET /api/harga  |  PUT /api/harga/:id  |  POST /api/harga/massal  |  POST /api/harga/simulasi
```

### 4. Modul Retur Penjualan
```
Schema  : tambah retur_penjualan + retur_penjualan_detail → migration baru
Backend : backend/src/routes/retur-penjualan.ts
Frontend: frontend/src/routes/(app)/kasir/retur/
API     : POST /api/retur-penjualan  |  GET /api/retur-penjualan  |  GET /api/retur-penjualan/:id
```

### 5. Modul Notifikasi Terpusat
```
Schema  : tambah notifikasi_config + notifikasi_log → migration baru
Backend : backend/src/routes/notifikasi.ts
Frontend: frontend/src/routes/(app)/pengaturan/notifikasi/
```

**Urutan per modul baru:**
`schema.ts` → `drizzle-kit generate` → `drizzle-kit migrate` → backend route → frontend (types → api → logic → store → +page.svelte)

---

## OVERRIDE KONVENSI SVELTE (lebih baru dari CLAUDE_v2.md)

CLAUDE_v2.md masih menulis `createEventDispatcher` — **itu sudah tidak berlaku.**
Project sekarang full **Svelte 5 runes + callback props**.

```svelte
<!-- ❌ JANGAN (Svelte 4, outdated) -->
import { createEventDispatcher } from 'svelte'
const dispatch = createEventDispatcher()
dispatch('tutup')

<!-- ✅ HARUS (Svelte 5) -->
let { ontutup }: { ontutup?: () => void } = $props()
ontutup?.()
```

```svelte
<!-- ❌ JANGAN -->
export let value = 0
$: total = value * 2

<!-- ✅ HARUS -->
let { value = 0 } = $props()
const total = $derived(value * 2)
```

```svelte
<!-- ❌ JANGAN (cleanup dengan onDestroy) -->
import { onDestroy } from 'svelte'
onMount(() => { ... })
onDestroy(() => cleanup())

<!-- ✅ HARUS (cleanup via return dari onMount) -->
onMount(() => {
  ...
  return () => cleanup()
})
```

---

## ANTI-PATTERNS (jangan lakukan)

```
✗ window / document di luar onMount     → SSR crash
✗ createEventDispatcher                 → Svelte 5 pakai callback props
✗ try/catch langsung di store action    → pakai withLoading() dari $lib/utils/async
✗ hitung langsung di template {a - b}  → pakai $derived atau derived store
✗ localStorage / sessionStorage         → state di store, data persisten di backend
✗ Footer "Co-Authored-By Claude"        → tidak perlu di commit message
✗ export let (Svelte 4 props)           → pakai $props() rune
```

---

## CARA UPDATE FILE INI

Tiap awal session baru atau setelah modul selesai:
1. Update kolom Status di tabel implementasi (❌ → ✅)
2. Update Versi & Tanggal di header
