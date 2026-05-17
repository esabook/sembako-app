# CLAUDE_v2.md — Tambahan Modul & Update

Versi  : 2.0
Tanggal: 2026-05-16
Dibuat dari percakapan eksplorasi di Claude.ai

Cara pakai:
  Baca CLAUDE.md terlebih dahulu (konteks utama),
  lalu baca file ini sebagai TAMBAHAN & KOREKSI.
  Jika ada konflik antara CLAUDE.md dan file ini,
  file ini yang berlaku (lebih baru).

---

## MODUL BARU — BELUM ADA DI CLAUDE.md

### Prioritas pengerjaan modul baru:
```
TINGGI   → masuk Fase 1 atau 2 (segera dibangun)
SEDANG   → masuk Fase 5 atau 6 (setelah operasional stabil)
RENDAH   → Fase 7+ (nice to have)
```

---

### [TINGGI] MODUL PENGATURAN TOKO

Dibutuhkan dari hari pertama. Dipakai oleh semua modul lain.

```
FITUR:
  □ Profil toko: nama, alamat, telp, logo
    → dipakai di: struk, laporan, WA template, header app
  □ Setting default per modul:
    - Default metode bayar (tunai/transfer/qris)
    - Default output struk (print/WA/skip)
    - Batas diskon tanpa approval supervisor (default: 20%)
    - Stok minimum default untuk barang baru
  □ Format nomor otomatis:
    - No transaksi  : TRX-{YYYYMMDD}-{NNNN}
    - No PO         : PO-{YYYYMMDD}-{NNN}
    - No penerimaan : RCV-{YYYYMMDD}-{NNN}
  □ Jam operasional & nama shift
    (Pagi 08:00-14:00, Siang 14:00-20:00, dll)
  □ Manajemen akun kas/bank
    (tambah, nonaktifkan, rename)
  □ Backup & restore database manual
    (tombol di UI — bukan hanya via terminal)
```

```typescript
// Tabel baru yang dibutuhkan
toko_settings {
  id, key, value, tipe,   // tipe: string/number/boolean/json
  keterangan
}
// Contoh rows:
// key: 'nama_toko',      value: 'Toko Sembako Makmur'
// key: 'default_bayar',  value: 'tunai'
// key: 'batas_diskon',   value: '20'
// key: 'format_no_trx',  value: 'TRX-{YYYYMMDD}-{NNNN}'
```

**Route baru:**
```
GET  /api/settings          → ambil semua setting
PUT  /api/settings/:key     → update 1 setting
POST /api/settings/backup   → trigger backup database
POST /api/settings/restore  → restore dari file
```

**Posisi di folder:**
```
frontend/src/routes/(app)/pengaturan/
backend/src/routes/pengaturan.ts
```

---

### [TINGGI] MODUL MANAJEMEN HARGA

Penting untuk menjaga margin. Harga sekarang tersebar di master barang, perlu UI terpusat.

```
FITUR:
  □ Halaman daftar semua barang + harga beli + harga jual + margin
  □ Edit harga satu per satu inline
  □ Update harga massal:
    - Pilih beberapa barang → naik/turun Rp X atau Y%
    - Filter by kategori atau supplier
  □ Simulasi margin:
    "Jika harga beli naik Rp 500, harga jual perlu jadi berapa
     agar margin tetap 15%?"
  □ Jadwal harga aktif:
    - Set harga baru berlaku mulai tanggal tertentu
    - Harga lama otomatis diarsip ke histori
  □ Perbandingan harga beli antar supplier per barang
  □ Alert otomatis ke pemilik saat harga beli naik
    → notifikasi WA + flag di dashboard
```

```typescript
// Tabel baru
harga_jadwal {
  id, barang_id,
  harga_eceran_baru,
  harga_grosir_baru,
  berlaku_mulai,        // tanggal aktif
  status,               // pending / aktif / expired
  dibuat_oleh,
  catatan
}
```

**Route baru:**
```
GET  /api/harga                    → daftar semua harga + margin
PUT  /api/harga/:barang_id         → update harga langsung
POST /api/harga/massal             → update harga banyak sekaligus
POST /api/harga/simulasi           → hitung margin simulasi
POST /api/harga/jadwal             → buat jadwal perubahan harga
GET  /api/harga/supplier-compare   → bandingkan harga beli antar supplier
```

**Posisi di folder:**
```
frontend/src/routes/(app)/harga/
backend/src/routes/harga.ts
```

---

### [TINGGI] MODUL RETUR PENJUALAN

Skenario sangat sering terjadi. Saat ini belum ada sama sekali.

```
FITUR:
  □ Cari transaksi asal (by no transaksi atau nama pelanggan)
  □ Pilih item yang diretur + qty
  □ Pilih alasan: barang rusak / salah item / tidak sesuai / lainnya
  □ Pilih resolusi:
    - Tukar barang lain (buat transaksi baru)
    - Kembalikan uang (refund kas)
    - Kredit ke piutang (kurangi hutang pelanggan)
  □ Stok otomatis bertambah kembali (via mutasi_stok)
  □ Jurnal kas otomatis jika resolusi = refund
  □ Piutang berkurang otomatis jika resolusi = kredit
  □ Laporan retur per periode
```

```typescript
// Tabel baru
retur_penjualan {
  id, no_retur,
  penjualan_id,         // transaksi asal
  pelanggan_id,
  tanggal,
  alasan,               // rusak/salah/tidak_sesuai/lainnya
  resolusi,             // tukar/refund/kredit
  total_nilai,
  status,               // draft/selesai
  diproses_oleh
}

retur_penjualan_detail {
  id, retur_id,
  barang_id, satuan_id,
  jumlah,
  harga_jual,           // dari snapshot transaksi asal
  subtotal
}
```

**Route baru:**
```
POST /api/retur-penjualan         → buat retur baru
GET  /api/retur-penjualan         → daftar semua retur
GET  /api/retur-penjualan/:id     → detail retur
```

**Posisi di folder:**
```
frontend/src/routes/(app)/kasir/retur/
backend/src/routes/retur-penjualan.ts
```

---

### [TINGGI] MODUL NOTIFIKASI TERPUSAT

Owner perlu info tanpa harus buka app. Saat ini alert hanya di dashboard.

```
FITUR:
  □ Pusat konfigurasi semua alert (on/off per jenis)
  □ Scheduled report via WA:
    "Kirim ringkasan penjualan tiap hari jam 21:00"
  □ Log semua notifikasi yang pernah dikirim/dijadwalkan
  □ Jenis alert yang bisa dikonfigurasi:
    - Stok habis (realtime)
    - Stok hampir habis (realtime)
    - Barang kadaluarsa < N hari
    - Hutang jatuh tempo H-N
    - Piutang macet > N hari
    - Void transaksi (realtime)
    - Diskon > N% (realtime)
    - Selisih kas shift (saat tutup shift)
    - Ringkasan harian (jam tertentu)
    - Ringkasan mingguan (hari tertentu)
```

```typescript
// Tabel baru
notifikasi_config {
  id, jenis,            // stok_habis/hutang_tempo/void/dll
  aktif,                // 0/1
  channel,              // wa/dashboard/keduanya
  threshold,            // nilai batas (hari, %, unit)
  jam_kirim,            // untuk scheduled (format HH:MM)
  hari_kirim,           // untuk weekly (1-7)
  penerima_wa,          // no HP tujuan WA
  terakhir_dikirim
}

notifikasi_log {
  id, jenis, channel,
  pesan, penerima,
  status,               // terkirim/gagal/pending
  waktu,
  referensi_tipe,       // barang/hutang/penjualan/dll
  referensi_id
}
```

**Posisi di folder:**
```
frontend/src/routes/(app)/pengaturan/notifikasi/
backend/src/routes/notifikasi.ts
```

---

### [SEDANG] MODUL PROMO & DISKON

Bangun setelah operasional stabil (Fase 5-6).

```
FITUR:
  □ Buat aturan promo:
    - Diskon % atau Rp untuk item / kategori tertentu
    - Beli min qty → dapat diskon
    - Beli min Rp total → dapat diskon
    - Bundling: beli A + B = harga spesial
    - Harga khusus per pelanggan atau grup pelanggan
  □ Periode aktif (tanggal mulai & berakhir)
  □ Batas penggunaan (max N transaksi atau N pelanggan)
  □ Promo otomatis teraplikasi saat item masuk keranjang kasir
  □ Laporan efektivitas promo
```

```typescript
// Tabel baru
promo {
  id, nama, tipe,       // item/kategori/total/bundling/pelanggan
  nilai,                // angka diskon atau harga spesial
  tipe_nilai,           // persen/rupiah
  min_qty, min_total,
  berlaku_mulai, berlaku_sampai,
  max_penggunaan,       // null = tidak terbatas
  jumlah_dipakai,
  aktif
}

promo_target {
  id, promo_id,
  target_tipe,          // barang/kategori/pelanggan/grup
  target_id
}
```

---

### [SEDANG] MODUL LABEL & BARCODE

Bangun di Fase 5-6, penting untuk produk curah/lokal.

```
FITUR:
  □ Generate barcode dari kode_barang (format EAN-13 atau Code-128)
  □ Design label: nama barang, harga, kode, barcode
  □ Preview label sebelum cetak
  □ Cetak ke printer label (Brother, Zebra, atau thermal biasa)
  □ Cetak massal: pilih barang + qty label
```

**Library:**
```
JsBarcode  → generate barcode SVG (ringan, no server needed)
bun add jsbarcode
```

**Posisi di folder:**
```
frontend/src/routes/(app)/gudang/label/
```

---

### [SEDANG] MODUL AUDIT TRAIL — UI

Data log sudah ada di tabel `log_aktivitas`, tapi belum ada halaman UI-nya.

```
FITUR:
  □ Halaman log aktivitas dengan filter:
    by karyawan, by modul, by aksi, by tanggal
  □ Highlight aksi berisiko:
    void, diskon > 20%, koreksi stok, hapus/nonaktifkan data
  □ Detail diff perubahan:
    "Stok Beras: 24 → 20 oleh Rina — 14 Mei 14:35"
  □ Export log ke CSV/Excel
```

**Route baru:**
```
GET /api/audit?karyawan=&modul=&aksi=&dari=&sampai=
GET /api/audit/export
```

**Posisi di folder:**
```
frontend/src/routes/(app)/pengaturan/audit/
backend/src/routes/audit.ts
```

---

### [SEDANG] MODUL BUDGET & TARGET

Bangun setelah ada data historis minimal 1 bulan.
Realisasi dihitung otomatis dari data yang sudah ada
(jurnal_kas, penjualan) — tidak ada input ganda.

```
FITUR UTAMA:

TARGET PENJUALAN (per bulan):
  □ Set target omzet bulanan (Rp)
  □ Set target jumlah transaksi
  □ Set target margin kotor (%)
  □ Breakdown target per minggu (opsional, hitung otomatis)

BUDGET OPERASIONAL (per bulan):
  □ Set budget per kategori pengeluaran:
      gaji, sewa, listrik/air, kemasan/bahan, operasional, lain-lain
  □ Kategori harus sesuai dengan field kategori di jurnal_kas
    → realisasi dihitung otomatis, tidak perlu input ulang
  □ Sisa budget = budget - realisasi (auto dari jurnal_kas)

MONITORING & DASHBOARD:
  □ Widget di dashboard owner:
      - Progress bar omzet hari ini / bulan ini vs target
      - % margin bulan berjalan vs target
      - Bar chart budget vs realisasi per kategori
  □ Proyeksi akhir bulan:
      jika hari ke-10 sudah Rp 15jt → proyeksi = (15jt / 10) × 30 = 45jt
  □ Status per metrik: AMAN / PERHATIAN / BAHAYA
      AMAN      → realisasi ≥ 90% dari target (untuk penjualan)
      PERHATIAN → realisasi 70-89% dari target
      BAHAYA    → realisasi < 70% dari target
      (terbalik untuk pengeluaran: BAHAYA jika realisasi > 110% budget)

ALERT:
  □ Pengeluaran kategori melebihi budget → notifikasi ke pemilik
  □ Proyeksi omzet di bawah target (H-10 bulan) → alert dashboard
  □ Margin bulan berjalan di bawah target → flag di dashboard

RIWAYAT:
  □ Bandingkan realisasi bulan ini vs bulan lalu
  □ Tabel histori target per bulan (bisa lihat 6 bulan ke belakang)
  □ Salin target bulan lalu → tinggal edit angkanya
```

```typescript
// Tabel target penjualan
target_penjualan {
  id,
  periode_bulan,        // YYYY-MM
  target_omzet,         // Rp total penjualan bersih
  target_transaksi,     // jumlah transaksi
  target_margin_pct,    // target margin kotor dalam persen
  catatan,
  dibuat_oleh,
  dibuat_at
}

// Tabel budget operasional
// kategori harus match dengan nilai kolom 'kategori' di jurnal_kas
budget_operasional {
  id,
  periode_bulan,        // YYYY-MM
  kategori,             // gaji/sewa/listrik/kemasan/operasional/lain
  nilai_budget,         // Rp yang dianggarkan
  catatan,
  dibuat_oleh,
  dibuat_at
}

// Kategori standar (bisa dikembangkan via toko_settings):
//   'gaji'         → pembayaran gaji karyawan
//   'sewa'         → sewa toko
//   'listrik'      → tagihan listrik & air
//   'kemasan'      → plastik, kardus, dll
//   'operasional'  → bensin, ATK, dll
//   'lain'         → pengeluaran tidak terkategori
```

**Route baru:**
```
GET  /api/budget-target/:periode         → ambil target + budget bulan ini
POST /api/budget-target/target           → set/update target penjualan
POST /api/budget-target/budget           → set/update budget operasional
GET  /api/budget-target/:periode/realisasi  → target vs realisasi aktual
GET  /api/budget-target/:periode/proyeksi   → proyeksi akhir bulan
GET  /api/budget-target/histori          → riwayat 6 bulan terakhir
POST /api/budget-target/salin/:dari/:ke  → salin target bulan lalu
```

**Logika realisasi (tidak ada tabel tambahan):**
```typescript
// Omzet realisasi → dari tabel penjualan
SELECT SUM(total) FROM penjualan
WHERE status = 'lunas' AND strftime('%Y-%m', tanggal) = :periode

// Margin realisasi → (penjualan - HPP) / penjualan
// HPP diambil dari harga_beli snapshot di penjualan_detail

// Realisasi pengeluaran per kategori → dari jurnal_kas
SELECT kategori, SUM(jumlah) FROM jurnal_kas
WHERE jenis = 'keluar' AND strftime('%Y-%m', tanggal) = :periode
GROUP BY kategori
```

**Posisi di folder:**
```
frontend/src/routes/(app)/keuangan/budget/
  ├── +page.svelte
  ├── +page.ts
  ├── budget.types.ts
  ├── budget.api.ts
  ├── budget.logic.ts
  └── budget.store.ts

backend/src/routes/budget-target.ts
```

---

### [RENDAH] MODUL KASBON LENGKAP

Kasbon sederhana sudah ada. Ini upgrade-nya.

```
FITUR TAMBAHAN:
  □ Flow pengajuan → approval → cair
  □ Jadwal cicilan otomatis terhitung
  □ Potongan gaji otomatis saat penggajian
  □ Batas maksimal kasbon per karyawan
  □ Riwayat kasbon lengkap per karyawan
```

---

### [RENDAH] MODUL JADWAL & SHIFT KERJA

Bangun jika karyawan sudah > 5 orang.

```
FITUR:
  □ Buat jadwal shift mingguan/bulanan
  □ Assign karyawan ke shift
  □ Tampilkan siapa bertugas hari ini
  □ Tukar shift dengan approval
  □ Absensi dibandingkan otomatis dengan jadwal
  □ Rekap jam kerja aktual vs terjadwal
```

---

## UPDATE ROADMAP — LENGKAP

Gantikan bagian URUTAN PENGERJAAN di CLAUDE.md dengan ini:

```
FASE 1 — Fondasi
  [ ] Schema database Drizzle lengkap (schema.ts)
  [ ] Migrasi database
  [ ] Auth: login, JWT, middleware RBAC
  [ ] Master data CRUD: barang, supplier, pelanggan, karyawan
  [ ] Sistem tema dark/light/eye comfort
  [ ] Modul Pengaturan Toko (profil, setting default, format nomor)

FASE 2 — Operasional Inti
  [ ] Modul Kasir (transaksi, keranjang, bayar)
  [ ] Scanner barcode integration
  [ ] Mutasi stok otomatis
  [ ] Modul Gudang (terima barang, kelola stok, PO)
  [ ] Modul Manajemen Harga (terpusat, massal, simulasi margin)
  [ ] Modul Retur Penjualan

FASE 3 — Keuangan
  [ ] Jurnal kas
  [ ] Hutang & piutang (otomatis dari transaksi)
  [ ] Pembayaran hutang/piutang

FASE 4 — Laporan
  [ ] Laba Rugi
  [ ] Arus Kas
  [ ] Neraca
  [ ] Export PDF / Excel

FASE 5 — Notifikasi & Polish
  [ ] Modul Notifikasi Terpusat (config + log + WA scheduled)
  [ ] Dashboard owner dengan insight otomatis
  [ ] Stok opname
  [ ] Absensi & penggajian
  [ ] Upload foto (produk, invoice, karyawan)
  [ ] WhatsApp integration
  [ ] Printer struk
  [ ] Mode GUIDED/NORMAL/PRO untuk kasir

FASE 6 — Fitur Lanjutan
  [ ] Modul Promo & Diskon
  [ ] Modul Label & Barcode
  [ ] Modul Audit Trail UI
  [ ] Modul Budget & Target

FASE 7 — Nice to Have
  [ ] Kasbon lengkap (flow approval + cicilan otomatis)
  [ ] Jadwal & Shift Kerja
```

---

## UPDATE STRUKTUR FOLDER

Tambahkan ke struktur folder di CLAUDE.md:

```
frontend/src/routes/(app)/
  ├── dashboard/
  ├── kasir/
  │   └── retur/          ← BARU: retur penjualan
  ├── gudang/
  │   └── label/          ← BARU: cetak label barcode
  ├── harga/              ← BARU: manajemen harga terpusat
  ├── karyawan/
  ├── keuangan/
  ├── laporan/
  └── pengaturan/         ← BARU: pengaturan toko
      ├── notifikasi/     ← BARU: konfigurasi notifikasi
      └── audit/          ← BARU: audit trail UI

backend/src/routes/
  ├── ... (yang sudah ada)
  ├── harga.ts            ← BARU
  ├── pengaturan.ts       ← BARU
  ├── notifikasi.ts       ← BARU
  ├── retur-penjualan.ts  ← BARU
  └── audit.ts            ← BARU
```

---

## UPDATE SKEMA DATABASE

Tabel baru yang perlu ditambahkan ke schema.ts:

```typescript
// Dari Modul Pengaturan Toko
toko_settings       { id, key, value, tipe, keterangan }

// Dari Modul Manajemen Harga
harga_jadwal        { id, barang_id, harga_eceran_baru, harga_grosir_baru,
                      berlaku_mulai, status, dibuat_oleh, catatan }

// Dari Modul Retur Penjualan
retur_penjualan     { id, no_retur, penjualan_id, pelanggan_id, tanggal,
                      alasan, resolusi, total_nilai, status, diproses_oleh }
retur_penjualan_detail { id, retur_id, barang_id, satuan_id,
                         jumlah, harga_jual, subtotal }

// Dari Modul Notifikasi
notifikasi_config   { id, jenis, aktif, channel, threshold,
                      jam_kirim, hari_kirim, penerima_wa, terakhir_dikirim }
notifikasi_log      { id, jenis, channel, pesan, penerima,
                      status, waktu, referensi_tipe, referensi_id }

// Dari Modul Promo (Fase 6)
promo               { id, nama, tipe, nilai, tipe_nilai,
                      min_qty, min_total, berlaku_mulai, berlaku_sampai,
                      max_penggunaan, jumlah_dipakai, aktif }
promo_target        { id, promo_id, target_tipe, target_id }

// Dari Modul Budget & Target (Fase 6)
target_penjualan    { id, periode_bulan, target_omzet, target_transaksi,
                      target_margin_pct, catatan, dibuat_oleh, dibuat_at }
budget_operasional  { id, periode_bulan, kategori, nilai_budget,
                      catatan, dibuat_oleh, dibuat_at }
```

---

## CARA PAKAI FILE INI BERSAMA CLAUDE.md

### Untuk Claude Code di terminal:

Letakkan kedua file di root project:
```
sembako-app/
├── CLAUDE.md       ← konteks utama (jangan diedit manual)
├── CLAUDE_v2.md    ← tambahan & update (file ini)
└── ...
```

Claude Code otomatis membaca semua file `.md` di root project.
Tidak perlu instruksi tambahan — keduanya akan terbaca.

### Jika Claude Code hanya baca 1 file:

Tambahkan baris ini di bagian paling atas CLAUDE.md:

```markdown
> Baca juga: CLAUDE_v2.md untuk modul tambahan & update roadmap.
```

### Untuk sesi baru di Claude.ai (chat):

Upload kedua file sekaligus, lalu tulis:
```
Baca CLAUDE.md sebagai konteks utama,
lalu CLAUDE_v2.md sebagai tambahan & koreksi.
Mulai dari [tugas yang ingin dikerjakan].
```

---

## KONVENSI FRONTEND — SEPARATION OF CONCERNS

### Prinsip Utama
```
File .svelte = HANYA template HTML + bind ke store
Logic        = file .ts terpisah, bisa di-test & reuse
Tidak ada business logic, fetch, atau try/catch di .svelte
```

---

### Struktur File Per Modul (Wajib Diikuti)

```
src/routes/(app)/[modul]/
├── +page.svelte        ← HTML template + bind store SAJA
├── +page.ts            ← SvelteKit load function (SSR data)
├── [modul].types.ts    ← interface & type definitions
├── [modul].api.ts      ← semua fetch ke backend
├── [modul].logic.ts    ← fungsi murni (pure functions)
└── [modul].store.ts    ← state + actions (pakai withLoading)
```

---

### Tanggung Jawab Tiap File

```
[modul].types.ts
  → interface, type, enum
  → tidak ada import selain TypeScript built-in
  → contoh: interface Barang, ItemKeranjang, Transaksi

[modul].api.ts
  → hanya fungsi fetch ke backend
  → tidak ada state, tidak ada UI logic
  → semua return typed Promise<T>
  → contoh: cariBarang(), submitTransaksi()

[modul].logic.ts
  → fungsi murni: input → output, tidak ada side effect
  → tidak ada fetch, tidak ada store, tidak ada DOM
  → bisa di-test tanpa browser
  → contoh: hitungTotal(), validasiQty(), formatNomorTrx()

[modul].store.ts
  → writable/derived stores untuk state
  → actions yang memanggil api.ts + logic.ts
  → semua async action WAJIB pakai withLoading()
  → tidak ada try/catch langsung

+page.svelte
  → import store & actions, tidak ada logic sendiri
  → hanya: bind, on:event, {#if}, {#each}
  → boleh 1 exception: debounce input (berkaitan DOM langsung)
```

---

### Error Handling & Loading — Sistem Terpusat

Semua async di store pakai `withLoading()`. Tidak ada try/catch
di level store. Tidak ada `isLoading` atau `error` store lokal.

```
lib/
├── types/
│   └── error.types.ts          ← AppError, ToastItem, LoadingState
├── stores/
│   └── ui.store.ts             ← toast, loading, errors, adaLoading
├── utils/
│   └── async.ts                ← withLoading() wrapper tunggal
└── components/
    ├── ToastContainer.svelte   ← render toast (dipasang di layout)
    └── LoadingBar.svelte       ← bar loading global (di layout)
```

#### `withLoading()` — Cara Pakai
```typescript
import { withLoading } from '$lib/utils/async'

// Di dalam store action:
export async function cari(query: string) {
  const result = await withLoading(
    () => cariBarang(query),          // fungsi async
    {
      loadingKey:   'kasir-cari',     // unik per operasi
      loadingPesan: 'Mencari...',     // teks di loading bar
      modul:        'kasir',          // untuk log
      aksi:         'cari_barang',    // untuk log
      errorPesan:   'Gagal mencari barang',  // pesan user
      bisaRetry:    true,             // tampilkan tombol retry
    }
  )
  if (result) hasilCari.set(result)
}

export async function prosesBayar() {
  const result = await withLoading(
    () => submitTransaksi({ ... }),
    {
      loadingKey:     'kasir-bayar',
      loadingPesan:   'Menyimpan transaksi...',
      modul:          'kasir',
      aksi:           'submit_transaksi',
      bisaRetry:      false,
      suksesOtomatis: true,
      suksesPesan:    'Transaksi berhasil'
    }
  )
  if (result) bersihkanKeranjang()
  return result
}
```

#### Toast API
```typescript
import { toast } from '$lib/stores/ui.store'

toast.sukses('Berhasil disimpan')          // hijau, hilang 3 detik
toast.error('Koneksi gagal')               // merah, tidak hilang
toast.warn('Stok hampir habis')            // kuning, hilang 5 detik
toast.info('Sinkronisasi selesai')         // biru, hilang 3 detik
toast.hapus(id)                            // hapus manual
```

#### Alur Error Lengkap
```
store.action()
  → withLoading(fn, opts)
      → loading.mulai()     → LoadingBar muncul
      → fn() dipanggil
          SUKSES → toast.sukses() jika suksesOtomatis
          GAGAL  → errors.tambah() + toast.error()
      → loading.selesai()   → LoadingBar hilang
  → return data | null
```

#### Petaan Error Otomatis
```
'Failed to fetch'     → 'Koneksi ke server gagal. Cek jaringan WiFi.'
'404'                 → 'Data tidak ditemukan.'
'401' / '403'         → 'Akses ditolak. Silakan login ulang.'
'500'                 → 'Terjadi kesalahan di server. Coba lagi.'
'stok'                → 'Stok tidak mencukupi.'
lainnya               → 'Terjadi kesalahan. Silakan coba lagi.'

Override via errorPesan di opts jika perlu pesan spesifik.
```

---

### Pasang di Root Layout (Sekali Selamanya)

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import LoadingBar from '$lib/components/LoadingBar.svelte'
  import ToastContainer from '$lib/components/ToastContainer.svelte'
</script>

<LoadingBar />
<slot />
<ToastContainer />
```

---

### Aturan Tambahan Frontend

```
1. Semua format angka pakai Intl API (bukan moment/lodash)
   new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })

2. Debounce pencarian 150ms — di +page.svelte (event DOM)

3. Lazy load komponen berat:
   const PopupStokOpname = import('../PopupStokOpname.svelte')

4. Foto pakai loading="lazy" di semua <img>

5. Tidak ada localStorage/sessionStorage
   State ada di Svelte store (hilang saat tab ditutup)
   Data persisten ada di backend/database

6. Animasi HANYA pakai transform & opacity
   Jangan: width, height, top, left, margin, padding

7. Derived store untuk kalkulasi — jangan hitung di template
   ✓ export const total = derived([subtotal, diskon], ...)
   ✗ {subtotal - diskon} langsung di template
```

---

## KONVENSI KOMPONEN REUSABLE

### Prinsip
```
Komponen reusable (lib/components):
  → tidak import store manapun
  → komunikasi via props (masuk) & events (keluar)
  → bisa dipakai di modul apapun

Komponen modul-spesifik (routes/[modul]/components):
  → boleh import store modulnya sendiri
  → hanya dipakai di 1 modul
```

---

### Struktur Folder Komponen

```
src/lib/components/
├── ui/                        ← atom (komponen terkecil)
│   ├── Button.svelte          ← variant, size, shortcut, loading
│   ├── Input.svelte
│   ├── Badge.svelte
│   ├── Modal.svelte           ← slot konten + named slot footer
│   ├── Toast.svelte
│   └── Spinner.svelte
├── data/                      ← tampilkan data
│   ├── DataTable.svelte       ← generik, slot per cell
│   ├── SearchInput.svelte     ← debounce, keyboard nav events
│   ├── FotoThumb.svelte
│   └── EmptyState.svelte
├── form/                      ← input & form
│   ├── InputRupiah.svelte     ← format Rp otomatis, inputmode numeric
│   ├── InputQty.svelte        ← tombol [-][qty][+], min/max
│   ├── SelectSatuan.svelte
│   └── DateRangePicker.svelte
└── layout/
    ├── PageHeader.svelte
    ├── TwoPanel.svelte
    └── SectionCard.svelte

src/routes/(app)/kasir/components/
├── KeranjangItem.svelte       ← grid foto+info+qty+subtotal+hapus
├── HasilCari.svelte           ← list hasil + keyboard aktifIndex
├── PopupBayar.svelte
└── PopupEditItem.svelte
```

---

### Kontrak Komponen — Props & Events

#### Button
```svelte
<!-- Props -->
export let variant: 'primary' | 'danger' | 'ghost' | 'dim' = 'primary'
export let size: 'sm' | 'md' | 'lg' = 'md'
export let disabled = false
export let loading = false
export let shortcut: string | null = null
export let type: 'button' | 'submit' = 'button'

<!-- Events -->
on:click

<!-- Contoh -->
<Button variant="primary" size="lg" shortcut="F10" on:click={prosesBayar}>
  BAYAR
</Button>
```

#### Modal
```svelte
<!-- Props -->
export let judul: string
export let lebar: 'sm' | 'md' | 'lg' = 'md'
export let bisaTutup = true

<!-- Events -->
on:tutup     ← Esc atau klik backdrop

<!-- Slot -->
default      ← konten modal
footer       ← named slot untuk tombol aksi

<!-- Contoh -->
<Modal judul="KONFIRMASI" lebar="md" on:tutup={() => showModal = false}>
  <p>Konten di sini</p>
  <svelte:fragment slot="footer">
    <Button variant="ghost" on:click={() => showModal = false}>Batal</Button>
    <Button variant="primary" on:click={simpan}>Simpan</Button>
  </svelte:fragment>
</Modal>
```

#### InputRupiah
```svelte
<!-- Props -->
export let value: number = 0
export let label: string | null = null
export let placeholder = '0'
export let disabled = false
export let autofocus = false
export let min = 0

<!-- Events -->
on:change    → detail = number (nilai bersih tanpa format)
on:blur

<!-- Fitur -->
→ Tampilkan format: 50000 → "50.000"
→ Input: hanya terima digit, strip karakter lain
→ Select all saat fokus
```

#### InputQty
```svelte
<!-- Props -->
export let value: number = 1
export let min = 0
export let max = 9999
export let disabled = false

<!-- Events -->
on:change    → detail = number

<!-- Fitur -->
→ Tombol [-] disable jika value === min
→ Tombol [+] disable jika value === max
→ Input angka langsung + clamp ke min/max
→ Select all saat fokus
```

#### SearchInput
```svelte
<!-- Props -->
export let value = ''
export let placeholder = '> cari...'
export let loading = false
export let autofocus = true
export let debounce = 150

<!-- Events -->
on:search    → detail = string (setelah debounce)
on:escape    → user tekan Esc (untuk tutup hasil)
on:enter     → detail = string (user tekan Enter)
on:arrowdown → navigasi keyboard ke bawah
on:arrowup   → navigasi keyboard ke atas

<!-- Fitur -->
→ Debounce default 150ms
→ Esc = kosongkan + dispatch escape
→ Tombol × muncul saat ada isi
→ Ikon > berubah ⟳ saat loading
```

#### DataTable
```svelte
<!-- Props -->
export let kolom: { key, label, align?, lebar? }[]
export let data: Record<string, unknown>[]
export let loading = false
export let kosongPesan = 'Tidak ada data'
export let klikBaris = false

<!-- Events -->
on:klik    → detail = baris (jika klikBaris = true)

<!-- Slot -->
cell       → custom render per cell
           → let:col, let:baris, let:i

<!-- Contoh custom cell -->
<DataTable {kolom} {data} on:klik={bukaDetail}>
  <svelte:fragment slot="cell" let:col let:baris>
    {#if col.key === 'status'}
      <Badge tipe={baris.status}>{baris.status}</Badge>
    {:else}
      {baris[col.key] ?? '—'}
    {/if}
  </svelte:fragment>
</DataTable>
```

#### KeranjangItem (modul-spesifik kasir)
```svelte
<!-- Props -->
export let item: ItemKeranjang
export let aktif = false      ← keyboard focus indicator

<!-- Events -->
on:klik      → user klik baris (buka popup edit)
on:ubahQty   → detail = number
on:hapus

<!-- Fitur -->
→ Grid: foto(36px) + info + InputQty + subtotal + hapus
→ Tombol hapus muncul saat hover saja
→ Foto fallback = initial nama barang
→ Subtotal dihitung realtime dari (harga - diskon) × qty
```

#### HasilCari (modul-spesifik kasir)
```svelte
<!-- Props -->
export let items: Barang[]
export let aktifIndex = 0    ← untuk navigasi ↑↓ keyboard

<!-- Events -->
on:pilih    → detail = Barang

<!-- Fitur -->
→ Grid: foto(40px) + detail + stok + tombol +
→ ⚠ muncul jika stok ≤ 5
→ Highlight baris sesuai aktifIndex
→ Tombol + di kanan untuk tambah cepat
```

---

### Aturan Komponen

```
1. Props masuk  → export let namaProps
2. Events keluar → createEventDispatcher + dispatch('nama', data)
3. Tidak import store di lib/components
4. Style scoped — tidak bocor ke luar (Svelte default)
5. Slot untuk konten custom (DataTable cell, Modal footer)

UKURAN IDEAL:
  < 100 baris  = atom (Button, Input, Badge)
  100-200 baris = molekul (KeranjangItem, HasilCari)
  > 200 baris  = pecah jadi lebih kecil

NAMING EVENTS (konsisten di semua komponen):
  on:klik      → user klik item
  on:pilih     → user pilih sesuatu dari list
  on:ubahQty   → qty berubah
  on:hapus     → hapus item
  on:tutup     → tutup modal/popup
  on:simpan    → simpan form
  on:batal     → batal aksi
  on:search    → input pencarian (setelah debounce)
  on:escape    → user tekan Esc
```

---

## CHANGELOG

```
v2.3 — 2026-05-17
  ~ Budget & Target: perluas spec lengkap
    - Pisah tabel jadi target_penjualan + budget_operasional
    - Tambah logika realisasi otomatis dari jurnal_kas & penjualan
    - Tambah fitur proyeksi akhir bulan & salin target bulan lalu
    - Tambah route API lengkap + posisi folder

v2.2 — 2026-05-17
  + Konvensi komponen reusable
  + Struktur folder lib/components (ui/data/form/layout)
  + Kontrak props & events semua komponen utama
  + Komponen modul-spesifik kasir (KeranjangItem, HasilCari)
  + Aturan ukuran & naming events

v2.1 — 2026-05-17
  + Konvensi frontend: separation of concerns
  + Struktur file per modul (types/api/logic/store/svelte)
  + Sistem error handling & loading terpusat
  + withLoading() wrapper — cara pakai lengkap
  + Toast API reference
  + Aturan tambahan frontend (Intl, lazy load, animasi)

v2.0 — 2026-05-16
  + Modul Pengaturan Toko (TINGGI)
  + Modul Manajemen Harga (TINGGI)
  + Modul Retur Penjualan (TINGGI)
  + Modul Notifikasi Terpusat (TINGGI)
  + Modul Promo & Diskon (SEDANG)
  + Modul Label & Barcode (SEDANG)
  + Modul Audit Trail UI (SEDANG)
  + Modul Budget & Target (SEDANG)
  + Modul Kasbon Lengkap (RENDAH)
  + Modul Jadwal & Shift Kerja (RENDAH)
  + Update roadmap Fase 1-7
  + Update struktur folder
  + Update skema database (tabel baru)
```
