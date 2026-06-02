# PLAN.md — Toko Sembako Management Software

> **Dokumen konteks utama & acuan kerja untuk Claude Code.**
> Baca ini sebelum mulai sesi baru. Update saat ada keputusan penting.
> **v2.0** — hasil merge PLAN v1.0 + sesi diskusi arsitektur & tech stack.

---

## ⚖️ CATATAN MERGE (baca dulu — ada 3 konflik yang diputuskan)

Dua sumber digabung. Tiga titik bertabrakan dan diputuskan begini:

1. **Offline-first**: v1.0 menjadikan "setiap fitur wajib jalan offline" sebagai aturan hari-1.
   → **Diputuskan: DITUNDA ke Phase 3.** Fase awal = online-only. Alasan: sync dua-arah +
   conflict resolution itu pekerjaan terberat di proyek; jangan dipasang sebelum produk terbukti
   benar untuk toko sendiri. Yang dilakukan sekarang hanya *struktur data yang siap* untuk offline
   nanti + optimistic UI. (Lihat §11 "Hal yang mudah dilupakan" — poin offline sudah direvisi.)

2. **Multi-tenant**: v1.0 benar — pasang `tenant_id` di SEMUA tabel sejak hari-1.
   → **Dipertahankan**, dengan klarifikasi: **kolomnya dipasang sekarang, enforcement RLS-nya
   ditunda** ke Phase 3. Pasang kolom = murah. Menambah kolom ke skema penuh data = mahal.

3. **Struktur repo backend/frontend terpisah** (v1.0) vs **SvelteKit full-stack** (keputusan baru).
   → **Diputuskan: SvelteKit full-stack** (satu codebase, `+server.ts` untuk API). Struktur repo
   di §15 sudah disesuaikan. Pemisahan service (Hono) ditunda ke Phase 3 saat multi-tenant.

---

## 🎯 VISION (1 Kalimat)

Membangun **SaaS multi-tenant** untuk manajemen toko sembako (eceran + grosir) yang
**SOP-driven**, dimulai dari kebutuhan toko sendiri di kecamatan/desa, dirancang untuk dapat
replicate ke toko-toko sejenis.

**Realita bertahap (jangan lompat):**
1. **Phase 1** — Toko sendiri. Single-tenant, online-only. Buktikan SOP benar.
2. **Phase 2** — Management layer. Pemilik decision-making berbasis data.
3. **Phase 3** — Multi-tenant + offline. HANYA saat ada toko kedua nyata.
4. **Phase 4** — Kelengkapan operasional & compliance.

---

## 📋 KATA KUNCI INTI (Quick Reference)

### Bisnis
- `toko sembako` `eceran + grosir` `kecamatan/desa`
- `kompetitor: Indomaret 300m` `modal: Rp 50-75 juta`
- `tim kecil: 2-3 orang` `multi-role karyawan`

### Software
- `multi-tenant SaaS` `multi-store per tenant`
- `PWA mobile-first` (Android + desktop, **bukan** webview native, **tanpa** iOS)
- `online-only dulu` → `offline ditunda Phase 3`
- `SOP-driven workflow` `3 jenis SOP` (lihat §6)
- `25 modul operasional` + `lapis fondasi/master` (lihat §9–10)
- `RBAC 3→6 roles`

### Integrasi
- `WhatsApp Cloud API resmi` / Fonnte (JANGAN library unofficial — rawan banned)
- `POS thermal printer` — Web Bluetooth (Android) / WebUSB (desktop), raw ESC/POS, wajib HTTPS, picu dari gesture user
- `QRIS` via aggregator: Midtrans / Xendit (jangan switching langsung)
- `Barcode scanner` (kamera atau USB)

---

## 🛠️ TECH STACK (LOCKED — jangan ganti tengah jalan tanpa alasan kuat)

### Frontend (PWA)
- Framework: **SvelteKit + TypeScript**
- State: Svelte stores (`ui.store.ts` terpusat) + XState untuk SOP transaksional
- Offline storage: **ditunda** (Phase 3 — kandidat: PowerSync/ElectricSQL, bukan tulis sendiri)
- UI: TailwindCSS (+ JetBrains Mono, estetika terminal dari desain sebelumnya)
- Build: Vite (bawaan SvelteKit)
- PWA: manifest + service worker minimal. **Tanpa Capacitor** (tidak ada target iOS).

### Backend
- Runtime: **Bun**
- Framework: **SvelteKit `+server.ts`** dulu. **Hono** ditunda (pisah service saat multi-tenant).
- Database: **PostgreSQL** (BUKAN SQLite — RLS multi-tenant butuh Postgres)
- ORM: **Drizzle**
- Auth: **Lucia** / better-auth (TS-native)

### Workflow / SOP
- Transaksional: **XState v5** (machine di-share client & server; server re-run transisi sebelum commit)
- Ambient/Hook: **Event bus + hook registry** custom (lihat §7)
- Rule storage: **rule-as-data** di tabel `sop_rule` (lihat §7)

### Infrastructure
- Hosting: VPS Singapura/Indonesia (Hetzner/Biznet/Niagahoster) atau Railway/Render
- File storage: filesystem lokal dulu → S3-compatible saat multi-tenant
- Mobile bridge: **tidak ada** (PWA murni)

### DevOps
- Git, CI/CD basic, testing (happy + sad path), deployment script

---

## 🏗️ ARSITEKTUR 7 LAYER

```
┌─────────────────────────────────────────────────┐
│ Layer 7: Client (PWA)                           │
│   Optimistic UI; offline sync DITUNDA Phase 3   │
├─────────────────────────────────────────────────┤
│ Layer 6: Integration Layer                      │
│   WA, POS printer, QRIS; future: marketplace    │
├─────────────────────────────────────────────────┤
│ Layer 5: Reporting & Insight Layer              │
│   Dashboards, scheduled reports, export         │
├─────────────────────────────────────────────────┤
│ Layer 4: Workflow Engine (SOP Integration)      │
│   3 jenis SOP: XState + Event-bus/Hook + Checklist │
├─────────────────────────────────────────────────┤
│ Layer 3: Domain Modules (25 modul operasional)  │
│   + PRIMITIF reusable (approval, attachment, dll)│
├─────────────────────────────────────────────────┤
│ Layer 2: Configuration Layer (per-tenant)       │
│   Store, user, role, SOP rule customization     │
├─────────────────────────────────────────────────┤
│ Layer 1: Platform Layer (SaaS infrastructure)   │
│   Tenant, auth, billing, audit log              │
└─────────────────────────────────────────────────┘
```

---

## 6. TIGA JENIS SOP (jangan samakan semua jadi XState)

| Jenis | Implementasi | Disimpan di | Contoh |
|---|---|---|---|
| **Transaksional** (alur bercabang, state maju) | XState machine | kode + DB (`sop_instance`) | Penerimaan barang, retur, penggajian |
| **Ambient / Hook** (before/after event, tanpa state sendiri) | Event bus + hook registry | DB (`sop_rule`) | Checklist pre-absen, ucapan post-checkout |
| **Checklist berulang** (linier, selesai/belum) | List + scheduler | DB (template + instance harian) | Kebersihan harian, buka/tutup toko |

> Memaksa semua jadi XState = over-engineering. Pisahkan tiga jenis ini.

---

## 7. SOP AMBIENT = PEMBEDA PRODUK (paling penting)

Aplikasi "memandu" (bukan sekadar "mencatat") karena lapis ambient ini.

**Tiga komponen:**
1. **Event Bus** — semua aksi emit event: `BEFORE_CLOCK_IN`, `AFTER_CHECKOUT`, `SHIFT_OPENED`,
   `PRODUCT_LOW_STOCK`, `INVOICE_DUE_SOON`, dst.
2. **Hook Registry** — tiap event punya slot `before:` (bisa block), `on:`, `after:`.
3. **Rule-as-data** — SOP disimpan sebagai DATA di `sop_rule`, BUKAN dikoding. Tiap tenant bisa
   beda SOP tanpa ubah kode. Ini fondasi "SOP marketplace" & kustomisasi per-tenant nanti.

```ts
sop_rule {
  trigger: "before:clock_in",
  applies_to_role: ["kasir","gudang"],
  blocking: true,                  // tahan absen sampai checklist selesai
  checklist: ["Buka gerbang","Sapu lantai","Nyalakan lampu"],
  evidence_required: "photo"|"checkbox"|"none",
  timeout_minutes: 15,             // lewat → notif pemilik
}
sop_rule {
  trigger: "after:transaction_checkout",
  applies_to_role: ["kasir"],
  blocking: false,
  ui_action: "show_thankyou_modal",
  template: "Terima kasih, {nama_pelanggan}!"
}
```

**Alur:** user klik absen → modul emit `before:clock_in` → hook registry cari rule match →
render checklist (tahan event) → user centang semua → resume → tulis DB → emit `after:clock_in`.

---

## 8. BANGUN PRIMITIF DULU (bukan 25 modul satu-satu)

Pola berulang — abstraksikan jadi primitif reusable sebelum mengulang ke-3 kalinya:
- **Approval gate** (role guard) — modul 3,4,6,9,22
- **Attachment/foto bukti** (handler seragam) — modul 1,3,9,11,20,23
- **WhatsApp service** (provider-agnostic) — modul 3,8,18
- **Rekonsiliasi fisik-vs-sistem** — modul 4,7
- **Alert jatuh tempo / threshold** (scheduler) — modul 8,18
- **Audit log** — semua modul
- **Event bus + Hook registry** — semua SOP ambient

> Tanpa primitif: ~25× kode. Dengan primitif: tiap modul tinggal merangkai potongan.

---

## 9. 25 MODUL OPERASIONAL (+ klasifikasi jenis SOP)

| # | Modul | Pelaku | Frek | Jenis |
|---|---|---|---|---|
| 1 | Stok Masuk | Gudang | Harian | Transaksional |
| 2 | Stok Keluar | Gudang | Harian | Checklist |
| 3 | Barang Rusak/Retur | Gudang | Harian | Transaksional |
| 4 | Stok Opname | Gudang+Manajer | Mgg+Bln | Transaksional |
| 5 | Permintaan Pelanggan | Pelayanan | Harian | CRUD |
| 6 | Komplain Pelanggan | Pelayanan | Harian | Transaksional |
| 7 | Kas Harian | Kasir | Harian | Transaksional |
| 8 | Bon Pelanggan | Kasir | Harian | Transaksional |
| 9 | Pengeluaran Harian | Kasir | Harian | CRUD+approval |
| 10 | Rekap Kas | Kasir | Mgg+Bln | Report |
| 11 | Tugas Kebersihan | Cleaning | Harian | Checklist |
| 12 | Kunjungan Warung | Sales | Harian | CRUD |
| 13 | Order Masuk Grosir | Sales/Kasir | Harian | Transaksional |
| 14 | Pipeline Grosir | Sales | Bulanan | CRUD |
| 15 | Agenda Supplier | Pemilik | Harian | CRUD |
| 16 | Evaluasi Karyawan | Pemilik | Mingguan | CRUD (HR) |
| 17 | Pinjaman & Investasi | Pemilik | Bulanan | CRUD+report |
| 18 | Hutang Dagang Supplier | Pemilik | Hrn/Mgg | CRUD+alert |
| 19 | Tamu Birokrasi | Pemilik/Karyawan | Per kunjungan | CRUD |
| 20 | Inventaris Aset Tetap | Pemilik | Bln/Thn | CRUD |
| 21 | Promo & Diskon | Pemilik/Kasir | Per kebutuhan | Transaksional |
| 22 | Permintaan Karyawan (cuti/izin/kasbon) | Karyawan→Pemilik | Per kebutuhan | Transaksional (HR) |
| 23 | Listrik & Air | Pemilik | Bulanan | CRUD |
| 24 | Acara/Hajatan Besar | Pemilik/Sales | Per kebutuhan | Transaksional |
| 25 | Audit/Inspeksi | Pemilik | Per kebutuhan | CRUD |

---

## 10. STRUKTUR MODUL = DUA LAPIS (+ GAP HR)

25 modul di atas turun dari "buku catatan" → bersifat operasional. Tapi software butuh lapis
fondasi yang tidak ada di paradigma buku:

### Lapis Fondasi / Master (WAJIB ada, sokong semua modul operasional)
- **Master Produk & Harga** (eceran+grosir, histori harga) — fondasi semua transaksi
- **Master Supplier** & **Master Pelanggan**
- **HR / Karyawan** (lihat di bawah — GAP yang ditemukan)
- **Setting Toko** (pajak, mata uang, info toko, mode operasi)
- **Audit Trail / Log Aktivitas**
- **Notifikasi terpusat** (WA outbox, alert)
- **Backup & Restore**

### Domain HR (GAP — tidak muncul di 25 modul karena turun dari "buku")
Saat jadi software, HR harus berdiri sebagai cluster (1 menu, 6-7 sub-layar, berbagi entitas `karyawan`):
- **Master Data Karyawan** (CRUD) — fondasi; semua HR merujuk ini
- **Absensi & Kehadiran** (log harian; uji pertama untuk SOP ambient pre-absen)
- **Jadwal Shift** (scheduler; opsional jika tidak shift)
- **Penggajian** (state machine: absensi→kasbon→insentif→bayar→slip)
- **Cuti & Izin** (= modul #22, perjelas)
- **Sanksi & Insentif / SP & Reward** (SOP sudah ada, angkat ke modul)
- **Evaluasi Karyawan** (= modul #16)

---

## 11. RBAC

```
Super Admin (SaaS owner)
  └─ Tenant Owner (Pemilik Toko)
       └─ Store Manager
            ├─ Cashier
            ├─ Stock Keeper
            └─ Sales Rep
```

Setiap role didefinisikan dengan: modul yang diakses (read/write), workflow yang bisa dijalankan,
approval authority, data visibility scope.

> Pertanyaan terbuka (lihat §18): mulai 3 role atau langsung 6?

---

## 12. 6 LAYER PER MODUL (target, BUKAN wajib untuk semua 25)

Target maksimal tiap modul. Tapi **jangan paksa semua modul punya 6 layer** — modul CRUD
sederhana (Listrik & Air, Inventaris Aset) cukup Input+Storage+View. Insight & Action layer
hanya untuk modul yang datanya layak dianalisis.

1. **Input** — form, bulk import, auto-capture, mobile entry
2. **Storage** — schema (+ tenant_id, audit fields), relations, versioning
3. **View** — list, detail, filter, dashboard widget
4. **Report** — daily, weekly, monthly, custom range, export
5. **Insight** — trend, anomaly, comparison, recommendation (hanya jika relevan)
6. **Action** — alerts, triggers, recommendations, integrations

---

## 13. PHASE PENGEMBANGAN

### Phase 1 — Core Operational (MVP) · single-tenant · online-only
**Goal:** Sistem berjalan untuk toko sendiri.
**Fondasi dulu:** Master Produk & Harga, Master Supplier/Pelanggan, Setting Toko, Auth.
**Primitif:** Approval gate, Attachment, Audit trail, Event bus + Hook registry.
**Modul:** Kas Harian (#7), Bon Pelanggan (#8), Stok Masuk (#1), Stok Keluar (#2), Hutang Dagang (#18).
**Uji hook:** Absensi + checklist pre-absen (`before:clock_in`).
**Fokus:** Input → Transactional Log → Daily Report → Alert.

### Phase 2 — Management Layer
**Goal:** Pemilik decision-making berbasis data.
**Modul:** Rekap Kas, Stok Opname, Evaluasi Karyawan, Agenda Supplier, Pipeline Grosir,
Pinjaman, Inventaris, Promo, + HR (Penggajian, Cuti/Izin).
**Fokus:** Periodic Summary → Tactical Report → Insight.

### Phase 3 — Multi-tenant + Offline + Strategic
**Goal:** Siap multi-tenant SaaS.
**Aktifkan:** RLS (`tenant_id` sudah ada), pisah service Hono, offline-first (PowerSync/ElectricSQL).
**Modul:** Kunjungan Warung, Order Grosir, Permintaan/Komplain, Tamu Birokrasi, Hajatan, Audit.
**Fokus:** Tenant Management → Strategic/Compliance Report.

### Phase 4 — Support & Detail
**Modul:** Kebersihan, Permintaan Karyawan, Listrik & Air, Retur, Pengeluaran.
**Fokus:** Operational Report → Action Layer.

---

## 14. ATURAN KERJA DENGAN CLAUDE CODE

### Sebelum Mulai Code
- [ ] Apa goal sesi ini? (1 kalimat)
- [ ] Layer berapa & modul mana?
- [ ] Ada SOP acuan? Jenis apa (transaksional/ambient/checklist)?
- [ ] Ada dependency dari modul/primitif lain?

### Saat Code
- [ ] Setiap tabel WAJIB punya `tenant_id` + `store_id` sejak hari-1 (RLS ditunda Phase 3)
- [ ] Setiap entity wajib audit fields (`created_by`, `updated_by`, `created_at`, `updated_at`)
- [ ] Soft delete, bukan hard delete (kecuali alasan kuat)
- [ ] Validation di backend, jangan andalkan frontend
- [ ] Action penting → generate audit log
- [ ] Currency simpan integer (Rupiah penuh), bukan float
- [ ] Timezone simpan UTC, display sesuai timezone toko
- [ ] ~~Offline-first: lokal dulu, sync kemudian~~ → **Phase 3.** Phase 1: online-only + optimistic UI.

### Saat Review
- [ ] Multi-tenant: tidak ada data bocor (saat RLS aktif / Phase 3)
- [ ] Role-based access benar
- [ ] Error handling cover edge case
- [ ] Ada test happy path + sad path
- [ ] Primitif dipakai ulang, bukan logika di-copy

### Setelah Selesai
- [ ] Update CHANGELOG.md
- [ ] Update dokumentasi modul & PLAN.md jika ada keputusan baru
- [ ] Commit dengan pesan jelas

---

## 15. STRUKTUR REPOSITORI (disesuaikan: SvelteKit full-stack)

```
toko-sembako/
├── PLAN.md                    ← file ini
├── CHANGELOG.md
├── README.md
│
├── docs/
│   ├── architecture/
│   ├── modules/               ← satu file per modul
│   ├── sops/                  ← 14 dokumen SOP sesi sebelumnya (SALIN ke sini)
│   └── workflows/             ← SOP-to-workflow mapping & definisi XState
│
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db/            ← Drizzle schema + migrations
│   │   │   ├── platform/      ← Layer 1 & 2 (tenant, auth, role)
│   │   │   ├── workflow/      ← Layer 4: XState machines, event bus, hook registry
│   │   │   ├── integration/   ← Layer 6: WA, printer, QRIS
│   │   │   └── primitives/    ← approval, attachment, audit, alert scheduler
│   │   ├── modules/           ← logika per modul (.types/.api/.logic/.store)
│   │   ├── components/        ← UI reusable
│   │   └── workflows/         ← komponen UI step-by-step
│   ├── routes/
│   │   ├── (app)/             ← halaman per modul
│   │   └── api/               ← +server.ts endpoints
│   └── app.html
│
├── tests/
├── static/                    ← PWA manifest, service worker, ikon
└── drizzle.config.ts
```

> Catatan: SvelteKit menyatukan backend & frontend. Pemisahan service (folder `backend/`
> terpisah + Hono) baru relevan di Phase 3.

---

## 16. TEMPLATE TODO PER MODUL

```markdown
## Modul: [Nama]
### Konteks
- Phase: [1/2/3/4] · Jenis SOP: [transaksional/ambient/checklist/CRUD]
- Dependency: [modul/primitif yang harus jadi dulu]
- SOP referensi: [nama dokumen atau "tidak ada"]

### Layer 1 Input
- [ ] Form + validation rules
- [ ] Bulk import (jika perlu) · Mobile entry UX
### Layer 2 Storage
- [ ] Schema (tenant_id + store_id + audit fields) · Relasi · Migration · Seed
### Layer 3 View
- [ ] List + filter · Detail · Dashboard widget · Search
### Layer 4 Report (jika relevan)
- [ ] Daily · Weekly · Monthly · Custom range · Export
### Layer 5 Insight (hanya jika data layak dianalisis)
- [ ] Trend · Anomaly · Comparison · Recommendation
### Layer 6 Action (jika relevan)
- [ ] Alert rules · Notifikasi · Workflow trigger · Integration
### Quality
- [ ] Unit · Integration · (Multi-tenant isolation — Phase 3) · Perf 1000+ records
```

---

## 17. ATURAN ANTI-JALAN-TANPA-ARAH

Setiap sesi Claude Code WAJIB jawab sebelum lanjut:

1. **Layer mana sekarang?** Tidak tahu → STOP, kembali ke PLAN.md
2. **Modul mana?** "Semua sekaligus" → STOP, pilih 1
3. **Output konkret akhir sesi?** Tidak spesifik → STOP, buat goal terukur
4. **Apa yang TIDAK dikerjakan?** Out-of-scope harus jelas (anti scope-creep)
5. **Dependency apa dulu?** Jangan kerjakan child sebelum parent siap
6. **Primitif sudah ada?** Kalau pola ini muncul ke-3 kalinya → bangun primitif dulu

---

## 18. PERTANYAAN TERBUKA (putuskan sebelum koding dalam)

1. **Tujuan akhir**: toko sendiri jalan dulu, atau SaaS jalan dulu? (menggeser prioritas)
2. **HR**: 1 menu cluster, atau modul-modul lepas?
3. **Role final**: mulai 3 (Pemilik/Manajer/Karyawan) atau langsung 6?
4. **Event awal**: daftar 20-30 event kunci apa untuk Phase 1?

---

## 19. HAL YANG MUDAH DILUPAKAN

- [ ] Multi-tenant: `tenant_id` + `store_id` di SEMUA tabel sejak hari-1 (RLS enforcement Phase 3)
- [ ] Audit trail: bangun di awal, bukan belakangan
- [ ] ~~Offline-first setiap fitur~~ → **DITUNDA Phase 3.** Phase 1 online-only + optimistic UI.
      Struktur data tetap disiapkan agar offline mudah ditambah nanti.
- [ ] SOP-driven: jangan bangun screen tanpa mapping ke salah satu dari 3 jenis SOP
- [ ] PWA limitations: Web Bluetooth/USB butuh HTTPS + gesture user; tidak ada di iOS (tidak ditarget)
- [ ] i18n ready: struktur sejak awal meski Indonesia-only
- [ ] Timezone UTC di DB; Currency integer (bukan float)
- [ ] Bangun primitif sebelum mengulang pola ke-3 kalinya

---

## 20. NEXT SESSION TODO

Mulai dari salah satu (pilih SATU):

**A. Setup Foundation** — init SvelteKit+Bun+Drizzle+Postgres, struktur folder, tenant_id pattern, auth.
**B. Schema Design** — Layer 1 (tenant/user/role/store) + Master (produk/harga/supplier/pelanggan) + `sop_rule`/`sop_instance`/`audit_log`.
**C. Workflow Engine** — event bus + hook registry + POC `before:clock_in` checklist; ATAU XState machine Stok Masuk.
**D. First Module End-to-End** — Kas Harian (#7) atau Stok Masuk (#1) tembus DB→logic→UI sebagai template pattern.

> Rekomendasi urutan: **A → B → C (event bus + 1 XState) → D**.

---

## 21. REFERENSI DOKUMEN PRA-SESI

Sumber konten SOP (dari sesi konsultasi sebelumnya — SALIN ke `docs/sops/`):

1. SOP Pengadaan Barang / Supplier
2. SOP Penentuan Harga Jual + Kalkulator Excel
3. Paket Perjanjian Sewa & Modal + Addendum Exit Plan
4. Kartu SOP Tamu Birokrasi
5. SOP Karyawan 7 Bidang
6. Buku Keuangan (kas harian, rekap, BEP)
7. SOP Bon Pelanggan + Tracker
8. Business Plan + Strategi Kompetitif
9. Sanksi & Insentif Karyawan
10. Kartu Checklist Karyawan & Pemilik
11. Template 3 Buku Catatan Cetak
12. BMC Strategic Insight (13 zona × 3 audiens)
13. Buku Saku Karyawan / Service Script (15 skenario, bahasa pasar)

Juga: riwayat desain aplikasi sebelumnya (konvensi frontend `.types/.api/.logic/.store`,
RBAC, UX kasir: shortcut warna, mode Guided/Normal/Pro, `cariBarang()`, gap analysis 10 modul).

> Saat membuat workflow, JADIKAN dokumen-dokumen ini sumber acuan — file ini hanya peta, bukan isi.

---

## 🔁 MAINTENANCE

- Update tiap ada keputusan teknis penting & tiap selesai 1 phase.
- Review minimal 1×/bulan. Beri tanggal jika relevan.

---

*PLAN.md v2.0 — merge v1.0 + sesi arsitektur/tech-stack. Dokumen hidup.*
