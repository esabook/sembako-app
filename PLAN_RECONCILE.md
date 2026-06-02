# PLAN.md — Stokasir → Visi SaaS Sembako

> **Dokumen kerja kanonik.** Rekonsiliasi antara **Stokasir** (aplikasi yang sudah jalan)
> dan visi **PLAN(1).md** (SaaS multi-tenant). Baca ini sebelum mulai sesi.
> **v3.0** — keputusan arah: **EVOLUSI Stokasir**, bukan rebuild.
>
> - Visi jangka panjang & rasionalisasi arsitektur → arsip di **`PLAN(1).md`** (jangan dihapus).
> - Konvensi coding harian (Svelte 5, store pattern, RBAC) → **`CLAUDE.md`**.
> - Pola implementasi fitur baru → **`CLAUDE_SKILL_FEATURE_DEV.md`**.

---

## ⚖️ KEPUTUSAN ARAH (baca dulu)

PLAN(1).md ditulis seolah greenfield: Postgres + RLS, SvelteKit full-stack, Lucia, XState
sejak hari-1. Realitanya **Stokasir sudah jadi dan terpakai** — single-tenant, SQLite + Hono
terpisah, JWT, ~12 modul jalan, deploy di Raspberry Pi LAN.

**Diputuskan: EVOLUSI, bukan rebuild.** Pertahankan kode terbukti. Ambil visi PLAN(1).md
sebagai *arah*, bukan *perintah rewrite*. Prinsip pemandu (dari PLAN(1).md sendiri):

> *"Kolom dipasang sekarang, enforcement ditunda. Pasang kolom = murah.
> Menambah kolom ke skema penuh data = mahal."*

Artinya: yang **murah & irreversible-friendly** dikerjakan sekarang (kolom `tenant_id`,
audit fields, struktur SOP). Yang **mahal & belum perlu** (Postgres, RLS, pisah service Hono,
offline sync) ditunda ke **Fase D** — dipicu hanya saat ada **toko kedua nyata**.

| | Stokasir (sekarang) | PLAN(1).md (visi) | Keputusan |
|---|---|---|---|
| Tenancy | single-tenant | multi-tenant + RLS | kolom `tenant_id`/`store_id` sekarang, RLS Fase D |
| DB | SQLite (bun:sqlite) | PostgreSQL | tetap SQLite s/d Fase D, lalu cutover |
| Backend | Hono terpisah :3000 | SvelteKit `+server.ts` | tetap Hono (sudah jalan), pisah service tetap relevan multi-tenant |
| Auth | JWT (jose) + cookie | Lucia/better-auth | tetap JWT, cukup untuk single-tenant |
| Roles | 4 (pemilik/manajer/kasir/gudang) | 6 | tambah `sales` + `pelayanan` saat modulnya dibangun |
| Currency | `real` (float) ×75 | integer Rupiah | audit & migrasi bertahap (lihat Fase A) |
| SOP engine | tidak ada | XState + event bus + hook | bangun bertahap (Fase B) |
| PWA | manifest + SW ✅ | PWA mobile-first | sudah ada, lanjut polish |

---

## 📸 KONDISI SAAT INI (titik berangkat)

**Stack:** SvelteKit + TS + Tailwind (JetBrains Mono) · Hono + Bun :3000 · SQLite/Drizzle ·
JWT httpOnly · RBAC 4 role · PWA (service-worker.ts + manifest.webmanifest).

**Yang SUDAH ada** (≈48 tabel, 27 route, ~12 modul frontend):

- **Fondasi/Master** ✅ — Produk & Harga (histori beli/jual, harga terjadwal), Supplier,
  Pelanggan, Kartu Anggota/tier, Setting Toko, Audit Trail (`log_aktivitas`),
  Notifikasi terpusat (config/log + WA templates).
- **Operasional** ✅ — Kasir (guided/normal/pro, barcode, shortcut), Gudang (PO, barang masuk,
  mutasi stok, opname, label/barcode), Keuangan (jurnal kas, kas/bank, hutang supplier,
  piutang pelanggan, budget & target), Laporan (laba-rugi/arus-kas/neraca), Dashboard
  (alert, anomali, insight), Retur Penjualan (termasuk dari UI kasir), Promo & Diskon.
- **HR** ✅ — Karyawan, Absensi (+ kiosk PIN), Penggajian, Kasbon, Shift & Jadwal, Tukar Shift.

**Yang BELUM ada** (gap vs PLAN(1).md — detail di §Roadmap):
SaaS-readiness (tenant_id/store_id, audit fields seragam, currency integer), SOP engine
(event bus/hook/`sop_rule`), primitif reusable (approval gate, attachment handler, alert
scheduler), Backup & Restore, dan ~13 modul (CRM/sales, aset, utilitas, HR lanjutan, strategis).

---

## 🧭 PETA MODUL: 25 MODUL PLAN(1).md vs STOKASIR

| # | Modul | Status | Catatan |
|---|---|---|---|
| 1 | Stok Masuk | ✅ | `barang_masuk`, `purchase_order` |
| 2 | Stok Keluar | ✅ | `mutasi_stok` |
| 3 | Barang Rusak/Retur | ◑ | retur pelanggan ✅; retur ke supplier ❌ |
| 4 | Stok Opname | ✅ | `stok_opname` |
| 5 | Permintaan Pelanggan | ❌ | CRM — Fase C |
| 6 | Komplain Pelanggan | ❌ | CRM — Fase C |
| 7 | Kas Harian | ✅ | `jurnal_kas`, `kas_bank` |
| 8 | Bon Pelanggan (piutang) | ✅ | `piutang_pelanggan` |
| 9 | Pengeluaran Harian | ◑ | `budget_operasional`; approval gate ❌ |
| 10 | Rekap Kas | ✅ | modul laporan |
| 11 | Tugas Kebersihan | ❌ | checklist SOP — Fase C |
| 12 | Kunjungan Warung | ❌ | sales — Fase C |
| 13 | Order Masuk Grosir | ◑ | mode grosir di kasir ✅; pipeline ❌ |
| 14 | Pipeline Grosir | ❌ | sales — Fase C |
| 15 | Agenda Supplier | ❌ | Fase C |
| 16 | Evaluasi Karyawan | ❌ | HR — Fase C |
| 17 | Pinjaman & Investasi | ❌ | strategis — Fase C |
| 18 | Hutang Dagang Supplier | ✅ | `hutang_supplier`, `pembayaran_hutang` |
| 19 | Tamu Birokrasi | ❌ | Fase C |
| 20 | Inventaris Aset Tetap | ❌ | CRUD — Fase C |
| 21 | Promo & Diskon | ✅ | `promo`, `promo_target` |
| 22 | Permintaan Karyawan | ◑ | kasbon ✅; cuti/izin ❌ |
| 23 | Listrik & Air | ❌ | CRUD — Fase C |
| 24 | Acara/Hajatan Besar | ❌ | Fase C |
| 25 | Audit/Inspeksi | ◑ | audit trail ✅; modul inspeksi ❌ |

**Skor:** ✅ 11 · ◑ 5 · ❌ 9. Stokasir sudah menutup hampir seluruh Fase 1 & 2 PLAN(1).md.
Kerja tersisa = **fondasi SaaS + SOP engine + modul ekor**, bukan inti operasional.

---

## 📐 PRINSIP YANG DIJAGA (gabungan)

Dari PLAN(1).md (tetap berlaku) + CLAUDE.md (konvensi harian):

1. **Tiap tabel baru** wajib siap multi-tenant: kolom `tenant_id` + `store_id` sejak dibuat
   (nullable/default 1 dulu; enforcement RLS Fase D).
2. **Tiap entity** wajib audit fields: `created_by`, `updated_by` + `created_at`, `updated_at`.
   (Helper `timestamps` sudah ada untuk dua terakhir; tambah dua pertama.)
3. **Soft delete** (`is_active = 0`), bukan DELETE.
4. **Validasi di backend.** Response `{ success, data }` | `{ success, error }`.
5. **Multi-tabel → `db.transaction()`.**
6. **Currency = integer Rupiah** untuk tabel/kolom **baru**. Yang lama (`real`) dimigrasi bertahap.
7. **Harga di detail transaksi = SNAPSHOT**, bukan FK ke master.
8. **Tiap perubahan stok = 1 baris `mutasi_stok`** dengan referensi dokumen.
9. **SOP-driven**: jangan bangun screen tanpa memetakan ke 1 dari 3 jenis SOP
   (transaksional / ambient / checklist) — lihat PLAN(1).md §6.
10. **Bangun primitif sebelum pola berulang ke-3 kali** (approval, attachment, alert, audit).

---

## 🗺️ ROADMAP EVOLUSI (4 fase)

### Fase A — SaaS-Readiness Retrofit (murah, kerjakan sekarang)

Tujuan: pasang fondasi yang mahal-jika-ditunda, tanpa mengubah perilaku app.

- [ ] **A1 — Kolom tenancy.** Tambah `tenant_id`/`store_id` (default 1) ke tabel transaksional &
      master via migrasi Drizzle. Tidak di-enforce; hanya hadir. Mulai dari tabel inti
      (barang, penjualan, mutasi_stok, jurnal_kas) lalu sisanya.
- [ ] **A2 — Audit fields seragam.** Helper `auditFields` = `created_by`/`updated_by` (FK
      `karyawan.id`). Isi otomatis dari middleware auth di setiap write. Backfill `dibuat_oleh`
      yang sudah ada (~23 kolom) ke pola seragam.
- [ ] **A3 — Audit currency.** Inventarisasi 75 kolom `real`. Tetapkan: kolom uang murni →
      target integer; kolom kuantitas pecahan (stok kg/liter) → tetap `real`. Buat tabel
      keputusan di `doc/`. Migrasi nilai uang dilakukan saat cutover Postgres (Fase D) atau
      lebih awal per-tabel jika ada akumulasi bug float.
- [ ] **A4 — Backup & Restore.** Route + UI export/import `data.db` (SQLite mudah: file copy +
      WAL checkpoint). Wajib sebelum perubahan skema besar.
- [ ] **A5 — i18n-ready struktur.** Tidak menerjemahkan, hanya pastikan string UI tidak tercecer
      hardcode di tempat yang sulit diekstrak nanti.

### Fase B — SOP Engine + Primitif (pembeda produk)

Tujuan: fondasi "memandu, bukan sekadar mencatat" (PLAN(1).md §7) + primitif reusable.

- [ ] **B1 — Event Bus.** Emitter ringan di backend: aksi penting emit event
      (`AFTER_CHECKOUT`, `PRODUCT_LOW_STOCK`, `INVOICE_DUE_SOON`, `BEFORE_CLOCK_IN`, …).
- [ ] **B2 — Hook Registry.** Slot `before:`/`on:`/`after:` per event; `before:` bisa block.
- [ ] **B3 — Rule-as-data.** Tabel `sop_rule` (+ `sop_instance` untuk yang transaksional).
      SOP disimpan sebagai data, bukan dikoding (lihat skema contoh di PLAN(1).md §7).
- [ ] **B4 — POC ambient.** `before:clock_in` checklist pra-absen (evidence: checkbox/foto,
      timeout → notif pemilik). Uji pertama hook engine; sambung ke modul absensi yang sudah ada.
- [ ] **B5 — Primitif `approval-gate`.** Abstraksi role-guard approval (dipakai modul 3,4,6,9,22).
- [ ] **B6 — Primitif `attachment`.** Handler foto/bukti seragam (filesystem + path di DB),
      satukan pola upload yang sudah tersebar (produk/invoice/karyawan).
- [ ] **B7 — Primitif `alert-scheduler`.** Cron ringan untuk jatuh tempo/threshold
      (hutang H-3/H-1, stok minimum) → kirim ke notifikasi terpusat + WA.
- [ ] **B8 — XState (opsional, hanya jika perlu).** Bungkus alur bercabang (penerimaan barang,
      penggajian) ke machine bila kompleksitas state sudah menyakitkan. Jangan paksa CRUD jadi XState.

> Catatan: B1–B4 cukup besar — boleh dijadikan 1 sesi fokus tersendiri. Jangan campur dengan modul.

### Fase C — Modul Ekor (per prioritas toko, bukan urut nomor)

Bangun mengikuti `CLAUDE_SKILL_FEATURE_DEV.md` + template TODO PLAN(1).md §16.
Tiap modul wajib jawab §17 (layer mana, modul mana, output konkret, out-of-scope, dependency).

- [ ] **C1 — HR lanjutan**: Cuti & Izin (#22), Evaluasi Karyawan (#16), Sanksi/Insentif.
      *Dependency:* approval-gate (B5). Reuse entitas `karyawan`.
- [ ] **C2 — Sales/Grosir**: Kunjungan Warung (#12), Pipeline Grosir (#14),
      Order Masuk Grosir lengkap (#13), Agenda Supplier (#15). *Butuh role `sales`.*
- [ ] **C3 — CRM**: Permintaan Pelanggan (#5), Komplain Pelanggan (#6). *Butuh role `pelayanan`.*
- [ ] **C4 — Aset & Utilitas (CRUD ringan)**: Inventaris Aset (#20), Listrik & Air (#23).
      Cukup Input + Storage + View (jangan dipaksa 6 layer).
- [ ] **C5 — Checklist & strategis**: Tugas Kebersihan (#11, pakai SOP checklist B3),
      Pinjaman & Investasi (#17), Tamu Birokrasi (#19), Hajatan (#24), Audit/Inspeksi (#25).
- [ ] **C6 — Retur supplier (#3)** lengkapi sisi gudang (saat ini hanya retur pelanggan).
- [ ] **C7 — Roles 4→6**: tambah `sales` + `pelayanan` ke enum `karyawan.role` + matriks RBAC.

### Fase D — Cutover Multi-tenant (HANYA saat toko kedua nyata)

Pemicu eksplisit: **ada toko/tenant kedua yang benar-benar mau pakai.** Sebelum itu — jangan.

- [ ] **D1 — Migrasi SQLite → PostgreSQL.** Drizzle dialect swap; script ETL `data.db` → Postgres;
      konversi kolom uang `real` → `bigint` (rupiah penuh) di sini.
- [ ] **D2 — Aktifkan RLS** berbasis `tenant_id` (kolom sudah ada dari A1).
- [ ] **D3 — Pisah service** (Hono standalone / SvelteKit `+server.ts`) sesuai beban.
- [ ] **D4 — File storage → S3-compatible.**
- [ ] **D5 — Offline-first** (PowerSync/ElectricSQL — jangan tulis sync sendiri).
- [ ] **D6 — Auth → Lucia/better-auth** bila butuh multi-tenant session/SSO.

---

## 🚫 YANG TIDAK DIKERJAKAN SEKARANG (anti scope-creep)

- ❌ Migrasi Postgres / RLS / pisah service → **Fase D**, bukan sebelumnya.
- ❌ Offline sync dua-arah & conflict resolution → **Fase D**.
- ❌ Rewrite Hono → SvelteKit `+server.ts` hanya demi "ikut visi" — tidak ada ROI single-tenant.
- ❌ Mengonversi semua 75 kolom `real` sekaligus → bertahap (A3 audit dulu, konversi di D1).
- ❌ Memaksa semua modul jadi XState / 6 layer → CRUD ringan cukup 3 layer.
- ❌ Billing / Super Admin SaaS layer → relevan hanya pasca Fase D.

---

## ❓ PERTANYAAN TERBUKA (putuskan saat menyentuh fasenya)

1. **Backfill tenant_id**: semua tabel sekaligus (1 migrasi besar) atau bertahap per modul? (A1)
2. **Currency**: konversi `real`→integer per-tabel lebih awal, atau tunggu cutover D1? (A3)
3. **SOP engine dulu atau modul dulu?** Rekomendasi: Fase B (engine) sebelum Fase C, agar modul
   baru langsung lahir SOP-driven, bukan diretrofit. (B vs C)
4. **Role 6**: aktifkan enum sekarang atau saat modul sales/CRM dibangun? (C7)

---

## 🔗 RUJUKAN

- **`PLAN(1).md`** — visi SaaS penuh, arsitektur 7 layer, 3 jenis SOP, rasionalisasi tech stack (arsip).
- **`CLAUDE.md`** — konvensi coding wajib (Svelte 5 runes, store pattern, async utils, RBAC, responsive).
- **`CLAUDE_SKILL_FEATURE_DEV.md`** — pola implementasi fitur baru.
- **`DEPLOY.md`** — deploy ke Raspberry Pi.
- **Memory** `project-roadmap-status` — status implementasi per fase (sumber kebenaran progres harian).
