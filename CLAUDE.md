# CLAUDE.md — Toko Sembako App

File ini adalah konteks lengkap project untuk Claude Code.
Baca seluruh file ini sebelum menulis kode apapun.

---

## IDENTITAS PROJECT

Aplikasi manajemen toko sembako grosir dan eceran.
Berbasis webview — akses dari laptop dan HP via jaringan WiFi lokal.
Dibangun oleh 1 developer, untuk 1 toko, kurang dari 5 karyawan.
Mulai offline (lokal), arsitektur siap migrasi ke cloud (Turso) nanti.

---

## PRINSIP UTAMA

```
SIMPEL   → sedikit dependencies, mudah di-maintain sendiri
RINGAN   → cepat di HP jadul sekalipun
OFFLINE  → jalan tanpa internet, sync opsional nanti
WEBVIEW  → 1 codebase, akses dari HP & laptop via WiFi LAN
```

Jangan tambah library jika bisa diselesaikan dengan built-in.
Jangan over-engineer. Prioritas: jalan dulu, sempurna nanti.

---

## TECH STACK

```
FRONTEND   SvelteKit + TypeScript + TailwindCSS
           Font: JetBrains Mono (terminal aesthetic)

BACKEND    Hono.js + Bun runtime
           Port: 3000

DATABASE   SQLite via better-sqlite3
           ORM: Drizzle ORM
           File: backend/data.db

STORAGE    Filesystem lokal
           Folder: backend/uploads/
           Subfolders: produk/, invoice/, karyawan/

AUTH       JWT via jose
           Storage: httpOnly cookie
           System: RBAC (Role-Based Access Control)
```

### Jalur Migrasi Database (jika nanti butuh cloud)
```
SQLite lokal  →  Turso (ganti 1 baris connection string)
              →  PostgreSQL via Supabase (jika butuh scale)
Drizzle ORM support keduanya — kode query tidak berubah.
```

---

## STRUKTUR FOLDER

```
sembako-app/
├── frontend/                        ← SvelteKit
│   ├── src/
│   │   ├── routes/
│   │   │   ├── (auth)/login/        ← halaman login
│   │   │   └── (app)/
│   │   │       ├── dashboard/       ← owner/manajer
│   │   │       ├── kasir/           ← transaksi
│   │   │       ├── gudang/          ← stok & terima barang
│   │   │       ├── karyawan/        ← absensi & gaji
│   │   │       ├── keuangan/        ← hutang, piutang, kas
│   │   │       └── laporan/         ← L/R, arus kas, neraca
│   │   ├── lib/
│   │   │   ├── components/          ← UI komponen reusable
│   │   │   ├── stores/              ← Svelte stores (state)
│   │   │   └── utils/
│   │   │       ├── api.ts           ← fetch wrapper ke backend
│   │   │       └── wa.ts            ← WhatsApp link generator
│   │   └── app.css                  ← tema dark/light/eye comfort
│   ├── static/
│   ├── svelte.config.js
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── index.ts                 ← entry point, Hono app
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── barang.ts
│   │   │   ├── supplier.ts
│   │   │   ├── pelanggan.ts
│   │   │   ├── karyawan.ts
│   │   │   ├── penjualan.ts
│   │   │   ├── pembelian.ts
│   │   │   ├── stok.ts
│   │   │   ├── keuangan.ts
│   │   │   └── laporan.ts
│   │   ├── db/
│   │   │   ├── schema.ts            ← semua tabel Drizzle
│   │   │   ├── index.ts             ← koneksi SQLite
│   │   │   └── migrations/          ← generated oleh drizzle-kit
│   │   └── middleware/
│   │       ├── auth.ts              ← JWT verify + RBAC check
│   │       └── upload.ts            ← handle multipart foto
│   ├── uploads/
│   │   ├── produk/
│   │   ├── invoice/
│   │   └── karyawan/
│   ├── drizzle.config.ts
│   ├── data.db                      ← SQLite file (gitignore)
│   └── package.json
│
└── CLAUDE.md                        ← file ini
```

---

## SISTEM ROLE & AKSES (RBAC)

### Role yang Ada
```
pemilik   → super admin, akses semua fitur
manajer   → akses semua kecuali: kelola role, kelola user
kasir     → kasir, stok lihat, harga jual lihat, absensi diri
gudang    → stok edit, barang masuk, harga beli, PO, retur supplier
```

### Permission Granular
```
Format: [modul].[aksi]
Contoh: stok.lihat, stok.edit, harga_beli.lihat

MODUL          AKSI TERSEDIA
─────────────────────────────────────────────
stok           lihat, edit, hapus
harga_jual     lihat, edit
harga_beli     lihat, edit
penjualan      buat, lihat, void
pembelian      buat, lihat
piutang        lihat, edit
hutang         lihat, edit
laporan        lihat, export
karyawan       lihat, edit
gaji           lihat, edit
absensi        diri, semua
role           kelola
```

### Mapping Role → Permission
```typescript
const permissions = {
  kasir: [
    'stok.lihat', 'harga_jual.lihat',
    'penjualan.buat', 'penjualan.lihat',
    'absensi.diri'
  ],
  gudang: [
    'stok.lihat', 'stok.edit',
    'harga_beli.lihat', 'harga_beli.edit',
    'pembelian.buat', 'pembelian.lihat',
    'absensi.diri'
  ],
  manajer: [
    'stok.*', 'harga_jual.*', 'harga_beli.*',
    'penjualan.*', 'pembelian.*',
    'piutang.*', 'hutang.*',
    'laporan.*', 'karyawan.lihat',
    'absensi.semua'
  ],
  pemilik: ['*']
}
```

---

## SKEMA DATABASE (Drizzle ORM + SQLite)

### Aturan Penting
```
1. Semua tabel pakai id INTEGER PRIMARY KEY AUTOINCREMENT
2. Master data (barang, supplier, dll) TIDAK BOLEH dihapus
   → gunakan field is_active = 0/1
3. Harga di detail transaksi adalah SNAPSHOT
   → disimpan permanen meski harga master berubah
4. Setiap perubahan stok WAJIB ada referensi dokumen
   → lewat tabel mutasi_stok
5. Hutang/piutang otomatis terbentuk dari transaksi
   → tidak ada input ganda
6. Laporan yang di-approve disimpan sebagai JSON snapshot
```

### Tabel Master Data
```typescript
// Master Barang
barang {
  id, kode_barang, nama_barang,
  kategori_id, satuan_dasar_id,
  konversi_satuan,        // misal: 1 karton = 24 pcs
  harga_beli_terakhir,
  harga_jual_eceran,
  harga_jual_grosir,
  stok_minimum,
  stok_sekarang,          // dihitung dari mutasi_stok
  lokasi_rak,
  foto_path,              // path ke uploads/produk/
  is_active
}

// Master Supplier
supplier {
  id, kode_supplier, nama_supplier,
  kontak, alamat,
  terms_bayar,            // tempo hari
  limit_hutang,
  is_active
}

// Master Pelanggan
pelanggan {
  id, kode_pelanggan, nama,
  tipe,                   // eceran / grosir / langganan
  kontak, alamat,
  limit_piutang,
  saldo_piutang,          // dihitung otomatis
  is_active
}

// Master Karyawan
karyawan {
  id, kode_karyawan, nama,
  role_id,
  gaji_pokok,
  tipe_gaji,              // harian / bulanan
  kontak,
  foto_path,
  is_active
}

// Tabel Pendukung Master
kategori { id, nama }
satuan { id, nama, singkatan }
```

### Tabel Modul Pembelian
```typescript
purchase_order {
  id, no_po, supplier_id, tanggal_po,
  tanggal_estimasi_datang,
  status,                 // draft/dikirim/sebagian/lunas/batal
  total_nilai,
  dibuat_oleh             // karyawan_id
}

po_detail {
  id, po_id, barang_id, satuan_id,
  jumlah_pesan,
  jumlah_diterima,        // diisi saat barang datang
  harga_beli_estimasi
}

barang_masuk {
  id, no_penerimaan, po_id,  // nullable jika tanpa PO
  supplier_id, tanggal_terima,
  no_faktur_supplier,
  foto_faktur_path,       // path ke uploads/invoice/
  total_nilai,
  diterima_oleh
}

barang_masuk_detail {
  id, penerimaan_id, barang_id, satuan_id,
  jumlah_terima,
  harga_beli,             // update harga_beli_terakhir di master
  tgl_kadaluarsa
}
```

### Tabel Modul Penjualan
```typescript
penjualan {
  id, no_transaksi,
  pelanggan_id,           // nullable = pelanggan umum
  tanggal,
  tipe,                   // eceran / grosir
  kasir_id,
  subtotal, diskon_total, total,
  metode_bayar,           // tunai/transfer/qris/hutang
  bayar, kembalian,
  status                  // lunas/hutang/void
}

penjualan_detail {
  id, penjualan_id, barang_id, satuan_id,
  jumlah,
  harga_jual,             // SNAPSHOT — jangan ambil dari master
  diskon_item,
  subtotal
}
```

### Tabel Stok
```typescript
// Sumber kebenaran tunggal untuk stok
mutasi_stok {
  id, barang_id, tanggal,
  jenis,                  // masuk/keluar/koreksi/opname
  referensi_tipe,         // barang_masuk/penjualan/opname/dll
  referensi_id,
  jumlah_sebelum,
  jumlah_perubahan,       // positif atau negatif
  jumlah_sesudah,
  dicatat_oleh
}

stok_opname {
  id, no_opname,
  tanggal_mulai, tanggal_selesai,
  status,                 // draft/proses/selesai/approved
  diapprove_oleh
}

stok_opname_detail {
  id, opname_id, barang_id,
  stok_sistem,            // snapshot saat opname dimulai
  stok_fisik,             // hasil hitung manual
  selisih,                // dihitung otomatis
  alasan_selisih,
  dihitung_oleh
}
```

### Tabel Keuangan
```typescript
kas_bank {
  id, nama,
  tipe                    // kas / bank
}

jurnal_kas {
  id, tanggal, kas_bank_id,
  jenis,                  // masuk / keluar
  kategori,               // penjualan/pembelian/gaji/operasional/dll
  referensi_tipe,
  referensi_id,
  keterangan, jumlah,
  dicatat_oleh
}

hutang_supplier {
  id, supplier_id, barang_masuk_id,
  tanggal_hutang, tanggal_jatuh_tempo,
  total_hutang, sisa_hutang,
  status                  // belum/sebagian/lunas
}

pembayaran_hutang {
  id, hutang_id, tanggal_bayar,
  jumlah_bayar, kas_bank_id,
  dibayar_oleh
}

piutang_pelanggan {
  id, pelanggan_id, penjualan_id,
  tanggal_piutang, tanggal_jatuh_tempo,
  total_piutang, sisa_piutang,
  status
}

pembayaran_piutang {
  id, piutang_id, tanggal_bayar,
  jumlah_bayar, kas_bank_id,
  diterima_oleh
}
```

### Tabel Karyawan & Penggajian
```typescript
absensi {
  id, karyawan_id, tanggal,
  jam_masuk, jam_keluar,
  shift, status,          // hadir/izin/sakit/alpa
  dicatat_oleh
}

penggajian {
  id, karyawan_id, periode_bulan,
  hari_kerja, hari_hadir,
  gaji_pokok, tunjangan,
  potongan_kasbon, potongan_lain,
  total_gaji,
  status                  // draft/approved/dibayar
}

kasbon {
  id, karyawan_id,
  tanggal_pinjam, jumlah,
  cicilan_per_bulan, sisa_kasbon,
  status
}
```

### Tabel Histori Harga
```typescript
histori_harga_beli {
  id, barang_id, supplier_id, barang_masuk_id,
  harga_beli, tanggal_berlaku
}

histori_harga_jual {
  id, barang_id,
  harga_eceran, harga_grosir,
  tanggal_berlaku,
  tanggal_berakhir,       // null = masih aktif
  diubah_oleh
}
```

### Tabel Sistem
```typescript
wa_templates {
  id, kode,               // struk/hutang_baru/pengingat/order/dll
  teks,                   // isi pesan dengan {{placeholder}}
  aktif
}

periode_laporan {
  id, periode_mulai, periode_selesai,
  tipe_laporan,
  status,                 // draft/final/approved
  data_json,              // snapshot laporan tersimpan
  dibuat_oleh,
  diapprove_oleh
}

log_aktivitas {
  id, karyawan_id, aksi,
  modul, referensi_id,
  detail_json,
  waktu, ip_address
}
```

---

## MODUL & FITUR

### Modul Kasir
```
FITUR UTAMA:
- Cari barang (nama / kode / barcode scanner)
- Keranjang belanja dengan edit inline (qty, hapus, diskon item)
- Tipe transaksi: eceran / grosir (otomatis ubah harga semua item)
- Metode bayar: tunai / transfer / QRIS / hutang
- Hitung kembalian realtime
- Struk: print thermal / kirim WhatsApp
- Pilih pelanggan (untuk grosir / transaksi hutang)

FITUR PENDUKUNG:
- Absensi diri (clock in/out dari UI kasir)
- Catatan shift + rekap kas
- Buka shift (isi kas awal) + tutup shift (hitung fisik)
- Riwayat transaksi shift hari ini

UX:
- Mode GUIDED (0-50 trx): panduan aktif, konfirmasi 3 langkah
- Mode NORMAL (51-200 trx): panduan minimal
- Mode PRO (200+ trx): bersih, keyboard-first
- Shortcut keyboard dengan sistem warna stiker fisik
- Scanner barcode: USB/BT (zero kode) + kamera HP (BarcodeDetector API)
```

### Shortcut Keyboard Kasir
```
F1  [BIRU]    Fokus pencarian barang
F2  [KUNING]  Qty +1 item aktif
F3  [KUNING]  Qty -1 item aktif
F4  [KUNING]  Ganti satuan item aktif
F5  [MERAH]   Hapus item dari keranjang
F6  [BIRU]    Riwayat transaksi shift
F7  [BIRU]    Cek stok barang
F8  [KUNING]  Input diskon
F9  [UNGU]    Transaksi hutang
F10 [HIJAU]   Proses bayar
F11 [ORANYE]  Buka shift
F12 [ORANYE]  Tutup shift
ENT [HIJAU]   Tambah item ke keranjang
ESC [MERAH]   Batal / tutup popup
```

### Modul Gudang
```
1. TERIMA BARANG
   - Cocokkan dengan PO atau input tanpa PO
   - Scan barcode per item (mode: qty manual atau scan per unit)
   - Input harga beli dari faktur
   - Foto faktur (kamera HP → simpan ke uploads/invoice/)
   - Stok otomatis bertambah, hutang otomatis tercatat

2. KELOLA STOK
   - Tabel stok dengan status warna (HABIS/HAMPIR HABIS/AMAN)
   - Scan barcode → langsung lihat stok item
   - Riwayat mutasi per barang
   - Koreksi stok manual (butuh approval pemilik jika selisih > 5)

3. STOK OPNAME
   - Scan barcode → fokus ke baris item
   - Input stok fisik → selisih otomatis dihitung
   - Progress bar per item
   - Approve → stok sistem diperbarui

4. PURCHASE ORDER
   - Auto-suggest qty dari rata penjualan 7 hari
   - "Dari Stok Kritis" → isi otomatis barang yang perlu reorder
   - Status: draft → dikirim → sebagian → lunas
   - Kirim via WhatsApp ke supplier

5. RETUR SUPPLIER
   - Scan item rusak → masuk list retur
   - Foto barang rusak
   - Hutang berkurang otomatis
```

### Modul Keuangan
```
- Jurnal kas (semua arus uang masuk/keluar)
- Hutang supplier + pembayaran
- Piutang pelanggan + pembayaran
- Multi akun kas/bank
```

### Modul Laporan
```
LABA RUGI:
  Penjualan bersih - HPP = Laba Kotor
  Laba Kotor - Biaya Operasional = Laba Bersih

ARUS KAS:
  Operasional / Investasi / Pendanaan
  Saldo awal → mutasi → saldo akhir per akun kas/bank

NERACA:
  Aset = Liabilitas + Modal
  Validasi silang otomatis dengan L/R dan Arus Kas

Semua laporan:
- Filter periode (harian/mingguan/bulanan/custom)
- Export PDF / Excel
- Approve → tersimpan sebagai JSON snapshot (tidak bisa diubah)
```

### Dashboard Owner
```
ALERT ZONE (prioritas tertinggi):
  - Stok habis + estimasi kehilangan penjualan
  - Barang mendekati kadaluarsa + nilai risiko
  - Piutang macet / lewat jatuh tempo
  - Anomali kasir (void banyak, diskon tinggi, selisih kas)

TODAY ZONE:
  - Total penjualan hari ini vs kemarin (delta %)
  - Jumlah transaksi, rata per transaksi
  - Margin kotor, status kas

TREND ZONE:
  - Grafik penjualan 30 hari
  - Top 5 barang by margin kontribusi
  - Pelanggan grosir aktif vs tidak aktif
  - Heatmap jam/hari penjualan ramai

RISIKO AKTIF:
  - Hutang jatuh tempo 7 hari ke depan
  - Overstock (stok > 3× rata penjualan)
  - Konsentrasi supplier (>50% dari 1 supplier)
  - Tren margin menyempit

INSIGHT OTOMATIS:
  Format: ⚡ PELUANG | ⚠ PERHATIAN | 🔴 BAHAYA | ✓ POSITIF
  Contoh: "Sabtu besok biasanya +40% — cek stok Beras & Minyak"
```

---

## INTEGRASI EKSTERNAL

### Scanner Barcode
```
Semua input scanner lewat 1 fungsi: cariBarang(kode: string)

Deteksi input scanner vs ketik manual:
  < 50ms antar karakter = scanner → langsung cari + tambah
  > 50ms antar karakter = manual  → tampilkan hasil pencarian

Kamera HP (BarcodeDetector API):
  const detector = new BarcodeDetector({
    formats: ['ean_13', 'ean_8', 'qr_code', 'code_128']
  })
  const barcodes = await detector.detect(videoFrame)
  if (barcodes.length > 0) cariBarang(barcodes[0].rawValue)
```

### WhatsApp (wa.me link)
```
Semua WA lewat 1 fungsi: bukaWhatsApp(nomorHP, kodeTemplate, data)

Template tersimpan di tabel wa_templates.
Placeholder format: {{nama}}, {{total}}, {{tanggal}}

Penggunaan:
  1. Struk transaksi → ke pelanggan
  2. Notifikasi hutang baru → ke pelanggan
  3. Pengingat jatuh tempo → ke pelanggan (H-3, H-1)
  4. Konfirmasi lunas → ke pelanggan
  5. Order PO → ke supplier
  6. Alert internal → ke pemilik (stok habis, void, tutup shift)
```

### Printer Struk
```
Fase awal: window.print() + CSS @media print
  → muncul dialog print OS
  → format 58mm atau 80mm diatur via CSS

Fase berkembang: QZ Tray (silent print, tanpa dialog)

Format struk: teks plain, monospace
Opsi output per transaksi: Print / WhatsApp / Skip
Default bisa di-set per preferensi toko
```

---

## SISTEM TEMA UI

```css
/* 3 tema — ganti via toggle di navbar */

/* DARK — terminal klasik */
[data-theme="dark"] {
  --bg: #0a0a0a;  --surface: #111111;  --surface2: #1a1a1a;
  --border: #2a2a2a;  --text: #d4d4d4;  --text-dim: #666666;
  --accent: #00e676;  --warn: #ffb300;
  --danger: #ff5252;  --info: #40c4ff;
}

/* LIGHT — siang hari */
[data-theme="light"] {
  --bg: #f0f0f0;  --surface: #ffffff;  --surface2: #e8e8e8;
  --border: #cccccc;  --text: #222222;  --text-dim: #888888;
  --accent: #007a3d;  --warn: #b37800;
  --danger: #c62828;  --info: #0077aa;
}

/* EYE COMFORT — malam hari */
[data-theme="eye"] {
  --bg: #12100a;  --surface: #1c1a12;  --surface2: #252218;
  --border: #35301f;  --text: #e8d9a0;  --text-dim: #7a6e45;
  --accent: #d4a017;  --warn: #e07020;
  --danger: #cc4444;  --info: #5aaccc;
}
```

---

## CARA JALANKAN PROJECT

```bash
# Terminal 1 — Backend
cd sembako-app/backend
bun run dev
# → http://localhost:3000

# Terminal 2 — Frontend
cd sembako-app/frontend
bun run dev
# → http://localhost:5173        (laptop)
# → http://192.168.1.x:5173     (HP via WiFi)

# Database — generate & migrate
cd backend
bun run db:generate
bun run db:migrate

# Lihat isi database (GUI)
bun run db:studio
# → http://local.drizzle.studio
```

---

## URUTAN PENGERJAAN (ROADMAP)

```
FASE 1 — Fondasi
  [ ] Schema database Drizzle lengkap (schema.ts)
  [ ] Migrasi database
  [ ] Auth: login, JWT, middleware RBAC
  [ ] Master data CRUD: barang, supplier, pelanggan, karyawan
  [ ] Sistem tema dark/light/eye comfort

FASE 2 — Operasional Inti
  [ ] Modul Kasir (transaksi, keranjang, bayar)
  [ ] Scanner barcode integration
  [ ] Mutasi stok otomatis
  [ ] Modul Gudang (terima barang, kelola stok, PO)

FASE 3 — Keuangan
  [ ] Jurnal kas
  [ ] Hutang & piutang (otomatis dari transaksi)
  [ ] Pembayaran hutang/piutang

FASE 4 — Laporan
  [ ] Laba Rugi
  [ ] Arus Kas
  [ ] Neraca
  [ ] Export PDF / Excel

FASE 5 — Polish
  [ ] Dashboard owner dengan insight otomatis
  [ ] Stok opname
  [ ] Absensi & penggajian
  [ ] Upload foto (produk, invoice, karyawan)
  [ ] WhatsApp integration
  [ ] Printer struk
  [ ] Mode GUIDED/NORMAL/PRO untuk kasir
  [ ] Notifikasi stok kritis
```

---

## ATURAN CODING

```
1. Selalu TypeScript — tidak ada file .js
2. Semua route backend dikelompokkan per modul di folder routes/
3. Middleware auth dicek di SETIAP route yang butuh login
4. Validasi input di backend — jangan andalkan frontend saja
5. Setiap endpoint API return format konsisten:
   { success: true, data: ... }
   { success: false, error: "pesan error" }
6. Foto disimpan di filesystem, path-nya di database
7. Hapus = set is_active = 0, bukan DELETE dari database
8. Harga di detail transaksi = snapshot, bukan foreign key ke harga master
9. Setiap perubahan stok = 1 baris di mutasi_stok
10. Gunakan transaction SQLite saat operasi multi-tabel
    (misal: bayar → stok berkurang + jurnal kas bertambah)
```

---

## CATATAN TAMBAHAN

```
- Aplikasi ini untuk internal toko, bukan SaaS publik
- Semua device harus terhubung ke WiFi yang sama untuk akses
- Backup cukup dengan copy file data.db
- Tidak ada fitur sync multi-device real-time (phase 1)
- Jika nanti butuh cloud: migrasi ke Turso (SQLite) atau Supabase (PostgreSQL)
- WhatsApp menggunakan wa.me link (bukan API berbayar) untuk fase awal
- QRIS menggunakan statis (bukan payment gateway) untuk fase awal
```

---

## DEPLOYMENT — RASPBERRY PI / MINI COMPUTER

### Target Hardware
```
MINIMUM : Raspberry Pi 4 RAM 2GB
IDEAL   : Raspberry Pi 4 RAM 4GB, atau Raspberry Pi 5
OS      : Raspberry Pi OS Lite 64-bit (tanpa desktop)
          atau Ubuntu Server 22.04 LTS ARM64
STORAGE : OS di SD card, DATABASE di USB SSD (wajib)

JANGAN pakai:
  ✗ Raspberry Pi Zero / 1 / 2 — terlalu lemah
  ✗ Pi 3 dengan SD card murah — I/O bottleneck
  ✗ OS versi Desktop — buang RAM untuk GUI
```

### Cek Arsitektur Pi
```bash
uname -m
# aarch64 = ARM64 → Bun bisa dipakai
# armv7l  = ARM32 → ganti ke Node.js LTS
```

### Storage — Pisahkan Database dari SD Card
```
SD Card  → OS + kode aplikasi (read-mostly, aman)
USB SSD  → data.db + uploads/ (write intensif)

SD card mati jika terlalu sering write.
SQLite = write intensif = WAJIB di USB SSD.

USB SSD murah: ~Rp 150rb, jauh lebih tahan dari SD card.
```

```bash
# Mount USB SSD
sudo mkdir -p /mnt/data
sudo mount /dev/sda1 /mnt/data

# Auto mount saat boot (tambah ke /etc/fstab)
echo '/dev/sda1 /mnt/data ext4 defaults,noatime 0 2' | sudo tee -a /etc/fstab
# noatime = tidak update access time saat baca → hemat write

# Struktur folder di USB SSD
mkdir -p /mnt/data/sembako/uploads/{produk,invoice,karyawan}
mkdir -p /mnt/data/sembako/backup
```

### Path Produksi (berbeda dari development)
```
Development (laptop):
  database : backend/data.db
  uploads  : backend/uploads/

Production (Pi):
  database : /mnt/data/sembako/data.db
  uploads  : /mnt/data/sembako/uploads/

Gunakan environment variable:
  DATABASE_URL = file:/mnt/data/sembako/data.db
  UPLOAD_DIR   = /mnt/data/sembako/uploads
```

### SQLite — Konfigurasi untuk Pi
```typescript
// backend/src/db/index.ts
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'

const DB_PATH = process.env.DATABASE_URL ?? './data.db'
const sqlite = new Database(DB_PATH)

// Wajib aktifkan di production Pi
sqlite.pragma('journal_mode = WAL')      // concurrent read/write
sqlite.pragma('synchronous = NORMAL')    // balance safety vs speed
sqlite.pragma('cache_size = -16000')     // 16MB cache (hemat RAM di Pi 2GB)
sqlite.pragma('temp_store = MEMORY')     // temp table di RAM, bukan disk
sqlite.pragma('mmap_size = 268435456')   // 256MB memory-mapped I/O

export const db = drizzle(sqlite)
```

### Foto — Resize Saat Upload (Hemat Storage & RAM)
```typescript
// Wajib resize foto sebelum simpan
// Jangan simpan foto asli kamera (3-8MB per foto)
// bun add sharp

import sharp from 'sharp'

async function simpanFoto(buffer: Buffer, namaFile: string, folder: string) {
  const basePath = process.env.UPLOAD_DIR ?? './uploads'

  // Thumbnail untuk tabel/list
  await sharp(buffer)
    .resize(60, 60, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toFile(`${basePath}/${folder}/thumb_${namaFile}`)

  // Medium untuk detail/popup
  await sharp(buffer)
    .resize(300, 300, { fit: 'inside' })
    .jpeg({ quality: 85 })
    .toFile(`${basePath}/${folder}/med_${namaFile}`)

  // Simpan original hanya untuk invoice (dokumen penting)
  // Untuk foto produk & karyawan: tidak perlu simpan original
}
```

### Build di Laptop, Deploy ke Pi
```
JANGAN build di Pi — CPU kecil, proses lama dan panas.

WORKFLOW:
  1. Laptop: coding + testing
  2. Laptop: bun run build (frontend)
  3. Laptop: kirim ke Pi via rsync
  4. Pi: bun install --production
  5. Pi: pm2 restart
```

```bash
# Script deploy dari laptop (simpan sebagai deploy.sh)
#!/bin/bash
PI_HOST="eg17@192.168.1.x"
PI_PATH="/home/eg17/sembako-app"

echo "→ Build frontend..."
cd frontend && bun run build && cd ..

echo "→ Kirim ke Pi..."
rsync -avz --exclude 'node_modules' \
           --exclude '.svelte-kit' \
           --exclude 'data.db' \
           --exclude 'uploads' \
  ./ $PI_HOST:$PI_PATH/

echo "→ Install dependencies di Pi..."
ssh $PI_HOST "cd $PI_PATH/backend && bun install --production"
ssh $PI_HOST "cd $PI_PATH/frontend && bun install --production"

echo "→ Restart app..."
ssh $PI_HOST "pm2 restart all"

echo "✓ Deploy selesai"
```

### SvelteKit — Adapter untuk Pi
```javascript
// frontend/svelte.config.js
import adapter from '@sveltejs/adapter-node'

export default {
  kit: {
    adapter: adapter({
      out: 'build',
      precompress: true,   // gzip assets saat build, hemat bandwidth WiFi
    })
  }
}
```

### PM2 — Process Manager
```bash
# Install PM2
npm install -g pm2
```

```javascript
// ecosystem.config.js — taruh di root project
module.exports = {
  apps: [
    {
      name: 'sembako-backend',
      script: 'src/index.ts',
      interpreter: 'bun',
      cwd: '/home/eg17/sembako-app/backend',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '200M',  // restart otomatis jika RAM > 200MB
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        DATABASE_URL: 'file:/mnt/data/sembako/data.db',
        UPLOAD_DIR: '/mnt/data/sembako/uploads'
      },
      error_file: '/home/eg17/logs/backend-err.log',
      out_file:   '/home/eg17/logs/backend-out.log',
    },
    {
      name: 'sembako-frontend',
      script: 'build/index.js',
      interpreter: 'bun',
      cwd: '/home/eg17/sembako-app/frontend',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '150M',
      env: {
        NODE_ENV: 'production',
        PORT: '5173',
        HOST: '0.0.0.0',          // akses dari semua device LAN
        PUBLIC_API_URL: 'http://192.168.1.x/api'
      },
      error_file: '/home/eg17/logs/frontend-err.log',
      out_file:   '/home/eg17/logs/frontend-out.log',
    }
  ]
}
```

```bash
# Jalankan pertama kali
pm2 start ecosystem.config.js

# Auto start saat Pi boot
pm2 startup    # ikuti instruksi yang muncul
pm2 save

# Perintah harian
pm2 status     # cek status
pm2 monit      # monitor RAM & CPU realtime
pm2 logs       # lihat log
pm2 restart all
```

### Nginx — Reverse Proxy
```bash
sudo apt install -y nginx
```

```nginx
# /etc/nginx/sites-available/sembako
server {
    listen 80;
    server_name _;

    # Gzip — hemat bandwidth WiFi
    gzip on;
    gzip_types text/plain text/css application/javascript
               application/json image/svg+xml;
    gzip_min_length 1000;

    # Foto & aset statis — cache 30 hari di browser
    location /uploads/ {
        alias /mnt/data/sembako/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # JS/CSS build — cache 7 hari (hash di nama file)
    location ~* \.(js|css|woff2|ico)$ {
        proxy_pass http://localhost:5173;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # API backend
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sembako \
           /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
```

### Estimasi RAM Usage di Pi
```
OS (Raspberry Pi OS Lite)    ~180MB
Nginx                         ~10MB
Backend (Hono + SQLite)       ~30MB
Frontend (SvelteKit node)     ~40MB
PM2 daemon                    ~30MB
SQLite WAL cache              ~16MB
─────────────────────────────────────
TOTAL                        ~306MB

Pi 4 RAM 2GB → sisa ~1.7GB  ✅
Pi 4 RAM 4GB → sangat aman  ✅
```

### Backup Otomatis
```bash
# /home/eg17/backup-db.sh
#!/bin/bash
TANGGAL=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/mnt/data/sembako/backup"
DB_FILE="/mnt/data/sembako/data.db"

mkdir -p $BACKUP_DIR

# SQLite online backup — aman tanpa matikan app
sqlite3 $DB_FILE ".backup $BACKUP_DIR/data_$TANGGAL.db"

# Hapus backup lebih dari 7 hari
find $BACKUP_DIR -name "*.db" -mtime +7 -delete

echo "$(date): Backup selesai → data_$TANGGAL.db"
```

```bash
chmod +x /home/eg17/backup-db.sh

# Cron — tiap hari jam 02:00
crontab -e
# Tambahkan:
0 2 * * * /home/eg17/backup-db.sh >> /home/eg17/logs/backup.log 2>&1
```

### OS Tuning Awal (Lakukan Sekali)
```bash
# Kurangi GPU memory (tidak butuh display)
sudo raspi-config
# → Performance → GPU Memory → 16

# Matikan service tidak perlu
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon
sudo systemctl disable triggerhappy

# Kurangi agresivitas swap
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Swap di USB SSD (bukan SD card)
sudo fallocate -l 1G /mnt/data/swapfile
sudo chmod 600 /mnt/data/swapfile
sudo mkswap /mnt/data/swapfile
sudo swapon /mnt/data/swapfile
echo '/mnt/data/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
```

### Akses dari Device Lain
```
Setelah deploy, semua device di WiFi yang sama akses via:
  http://[IP_PI]/          ← web app (port 80 via Nginx)
  http://[IP_PI]/api/      ← API backend

Cari IP Pi:
  hostname -I              ← di terminal Pi
  atau lihat di router admin

Tips: set IP Pi jadi static di router
agar IP tidak berubah saat reboot.
```
