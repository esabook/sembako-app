# CLAUDE_v3.md — Sembako App

> Baca `CLAUDE.md` dan `CLAUDE_v2.md` terlebih dahulu.
> File ini berlaku untuk FASE 8+, berisi bugfix wajib hasil review,
> refine backlog, dan roadmap berikutnya.
> Jika konflik dengan file sebelumnya, file ini yang berlaku.

---

## STATUS SAAT INI

```
FASE 1–6  ✅ Selesai
FASE 7    ✅ Selesai
  ✅ Kasbon Lengkap (pengajuan → disetujui → cair → lunas)
  ✅ Jadwal & Shift Kerja (grid mingguan, assign shift, tukar shift)

Branch aktif: development
```

---

## BUGFIX WAJIB — Sebelum Rilis

Semua item HIGH harus di-fix sebelum deploy ke Pi.

### BACKEND

#### B-H1 · jadwal.ts — GET /tukar & POST /tukar tidak bisa diakses
**File:** `backend/src/routes/jadwal.ts`
**Masalah:** Route `GET /:id` (delete) didaftarkan sebelum `GET /tukar` dan `POST /tukar`.
Hono match pertama yang cocok — request ke `/jadwal/tukar` tertangkap oleh `/:id`
dengan `id = NaN`, selalu 404. Semua fitur tukar shift di frontend tidak berfungsi.
**Fix:** Pindahkan semua `/tukar*` route ke atas sebelum `/:id` dan `DELETE /:id`.

---

#### B-H2 · promo.ts — validasi persen 100% cek field yang salah
**File:** `backend/src/routes/promo.ts` baris ~92
**Masalah:**
```ts
if (body.tipe === 'persen' && body.nilai > 100)  // ← SALAH: tipe = 'item'|'kategori'|'total'
```
Seharusnya `body.tipe_nilai === 'persen'`. Akibatnya diskon 200% bisa tersimpan.
**Fix:**
```ts
if (body.tipe_nilai === 'persen' && body.nilai > 100)
  throw new HTTPException(400, { message: 'Diskon persen maks 100%' })
```

---

#### B-H3 · promo.ts — GET /aktif tidak ada permission check
**File:** `backend/src/routes/promo.ts` baris ~33
**Masalah:** Route `GET /promo/aktif` tidak memanggil `requirePermission()`.
JWT auth tetap berjalan, tapi permission layer dilewati.
**Fix:** Tambah `requirePermission('penjualan.lihat')`.

---

#### B-H4 · penggajian.ts — potongan kasbon di luar transaction
**File:** `backend/src/routes/penggajian.ts` baris ~189–207
**Masalah:** Status penggajian di-update ke `'dibayar'`, kemudian kasbon dicicil
dalam loop terpisah, tanpa SQLite transaction. Jika crash di tengah loop,
penggajian marked dibayar tapi kasbon belum dipotong.
**Fix:** Wrap seluruh blok (update penggajian + update kasbon + insert jurnal_kas)
dalam `db.transaction()`.

---

#### B-H5 · jadwal.ts — approval tukar shift tidak validasi kepemilikan jadwal penerima
**File:** `backend/src/routes/jadwal.ts` fungsi `PUT /tukar/:id/setujui`
**Masalah:** Saat approve, `jadwal_penerima_id` langsung dipakai tanpa verifikasi
bahwa jadwal itu memang milik `penerima_id`. Bisa dipakai untuk reassign jadwal
karyawan ketiga.
**Fix:**
```ts
if (req.jadwal_penerima_id) {
  const jp = db.select({ karyawan_id: jadwal_kerja.karyawan_id })
    .from(jadwal_kerja).where(eq(jadwal_kerja.id, req.jadwal_penerima_id)).get()
  if (!jp || jp.karyawan_id !== req.penerima_id)
    throw new HTTPException(400, { message: 'Jadwal penerima tidak valid' })
}
```

---

#### B-H6 · penjualan.ts — transfer/QRIS selalu masuk ke akun kas tunai
**File:** `backend/src/routes/penjualan.ts` baris ~196–209
**Masalah:** Jurnal kas untuk semua metode bayar non-tunai di-post ke akun
`tipe = 'kas'` pertama yang ditemukan. Transfer bank seharusnya ke akun bank.
**Fix:** Tambah field opsional `kas_bank_id` ke body POST penjualan.
Fallback ke kas pertama hanya untuk `metode_bayar: 'tunai'`.

---

#### B-H7 · kasbon.ts — kasbon berstatus 'disetujui' bisa dihapus
**File:** `backend/src/routes/kasbon.ts` baris ~219
**Masalah:** DELETE guard hanya blokir `status === 'aktif'`.
Kasbon yang sudah disetujui manajemen bisa dihapus tanpa approval.
**Fix:** Blokir juga status `'disetujui'`, atau wajib ada catatan untuk delete.

---

### FRONTEND

#### F-H1 · kasir.store.ts — tipeTransaksi tidak reset setelah checkout
**File:** `frontend/src/lib/stores/kasir.ts` fungsi `resetKasir()`
**Masalah:** Setelah transaksi grosir selesai dan `resetKasir()` dipanggil,
`tipeTransaksi` tetap `'grosir'`. Transaksi berikutnya memakai harga grosir
tanpa indikator apapun. Bug finansial pada flow utama kasir.
**Fix:** Tambah `tipeTransaksi.set('eceran')` di dalam `resetKasir()`.

---

#### F-H2 · kasir — kolom Subtotal tidak kurangi diskon item
**File:** `frontend/src/routes/(app)/kasir/+page.svelte` baris ~438
**Masalah:**
```svelte
{rupiah(item.harga_jual * item.jumlah)}  <!-- tidak kurangi diskon_item -->
```
Kasir dan pelanggan melihat angka berbeda di layar vs struk.
**Fix:**
```svelte
{rupiah(item.harga_jual * item.jumlah - item.diskon_item)}
```

---

#### F-H3 · api.ts — network error crash halaman (unhandled rejection)
**File:** `frontend/src/lib/utils/api.ts`
**Masalah:** `fetch()` dan `res.json()` tidak dibungkus try/catch.
Jika Pi offline atau backend return HTML 502, seluruh halaman crash.
Sangat relevan untuk app lokal LAN yang bisa tiba-tiba terputus.
**Fix:** Wrap `request()` function dengan try/catch, return
`{ success: false, error: 'Network error' }` jika gagal.

---

#### F-H4 · kasir — shortcut keyboard F1–F9 mayoritas belum diimplementasi
**File:** `frontend/src/routes/(app)/kasir/+page.svelte` fungsi `onKeydown()`
**Masalah:** Hanya F3 (search), F10 (bayar), F11 (buka shift), F12 (tutup shift)
yang berfungsi. F1, F2, F4, F5, F6, F7, F8, F9 tidak ada di switch statement.
Stiker fisik keyboard yang disebut di CLAUDE.md jadi tidak berguna.
**Fix:** Implementasi penuh shortcut sesuai spec di CLAUDE.md.

---

#### F-H5 · Modal.svelte — klik backdrop tidak menutup modal
**File:** `frontend/src/lib/components/Modal.svelte`
**Masalah:** Backdrop `<div>` tidak punya `onclick` handler.
Di HP tanpa keyboard, satu-satunya cara tutup modal adalah tombol ×.
Semua modal di seluruh app terpengaruh.
**Fix:** Tambah `onclick={tutup}` ke backdrop, `onclick={(e) => e.stopPropagation()}`
ke panel dalam.

---

#### F-H6 · kasir — promo tipe 'total' tampil di UI tapi tidak dikurangi dari total
**File:** `frontend/src/routes/(app)/kasir/kasir.store.ts`
**Masalah:** `promoTotalBerlaku` hanya untuk tampilan badge informatif.
Discount-nya tidak pernah dikurangi dari `total`. Kasir lihat "Diskon 10% berlaku!"
tapi pelanggan tetap bayar harga penuh.
**Fix:** Hitung `diskonTotal` dari promo yang berlaku dan kurangi dari `total`
di derived store, sama seperti `diskonMember`.

---

## REFINE — Medium Priority

Item-item ini penting tapi tidak crash flow utama.

### BACKEND

| ID | File | Masalah | Fix Singkat |
|----|------|---------|------------|
| B-M1 | penggajian.ts + absensi.ts | Filter tanggal pakai `-31` untuk semua bulan. Bulan 30 hari kehilangan hari terakhir. | Hitung `lastDay` dari `new Date(tahun, bln, 0).getDate()` |
| B-M2 | kasbon.ts | Limit check kasbon (MAX 5jt) pakai `sisa_kasbon` tapi kasbon `disetujui` punya `sisa = jumlah` jadi double-count | Pisah hitungan: sum `jumlah` untuk `pengajuan`, sum `sisa_kasbon` untuk `aktif` |
| B-M3 | jadwal.ts | Satu karyawan bisa dapat dua shift berbeda di hari yang sama (unique check include `tipe_shift_id`) | Ubah duplicate check jadi `(karyawan_id, tanggal)` saja |
| B-M4 | karyawan.ts | PUT `/:id` spread raw body langsung ke update object — field extra dari client lolos masuk | Whitelist field yang boleh di-update |
| B-M5 | penggajian.ts | Status bisa di-downgrade: `dibayar → draft`. Kasbon dan jurnal sudah terlanjur jalan. | Guard forward-only transition |
| B-M6 | penjualan.ts | Void tidak reverse piutang pelanggan — record piutang tetap aktif setelah transaksi di-void | Hapus/cancel piutang dan decrement `saldo_piutang` saat void |

### FRONTEND

| ID | File | Masalah | Fix Singkat |
|----|------|---------|------------|
| F-M1 | karyawan/+page.svelte | Double fetch on load: `onMount(muatKaryawan)` + `$effect(() => { queryKaryawan; muatKaryawan() })` | Hapus `onMount`, biarkan `$effect` handle initial load |
| F-M2 | keuangan/+page.svelte | Double fetch on tab switch — sama pola seperti F-M1 | Refactor load logic |
| F-M3 | karyawan/+page.svelte | `clockIn()`/`clockOut()` pakai `alert()` bukan pola error UI yang konsisten | Ganti ke inline error state |
| F-M4 | kasir/+page.svelte | Barcode buffer tidak reset setelah timeout — partial scan + ketik manual menjadi satu string | Tambah `setTimeout(() => barcodeBuffer = '', 200)` setelah setiap keystroke |
| F-M5 | karyawan/+page.svelte | `setujuiTukar()`/`tolakTukar()` tidak cek `res.success`, tidak ada feedback error | Tambah error handling |
| F-M6 | promo/+page.svelte | Input `nilai` tidak punya `max=100` untuk tipe persen, tidak ada validasi frontend | Tambah `max` attribute + validasi di `simpan()` |
| F-M7 | laporan/+page.svelte | Loading state satu variabel untuk tiga tab — switching tab flash "Memuat..." di tab yang sudah loaded | Pisah `loading` per tab: `loadingLR`, `loadingAK`, `loadingNeraca` |
| F-M8 | kasir/+page.svelte | Struk preview hardcode `TOKO SEMBAKO`, bukan pakai `namaToko` | Ganti dengan `{namaToko}` |
| F-M9 | karyawan/+page.svelte | `simpanTipe()` tidak cek `res.success`, modal tutup meski save gagal | Tambah error handling + inline error state |
| F-M10 | promo/+page.svelte | Tidak ada permission guard — URL langsung `/promo` bisa diakses semua role | Tambah `$effect redirect` untuk non-manajer/pemilik |

---

## LOW — Polish

| ID | File | Masalah |
|----|------|---------|
| B-L1 | schema.ts | Tidak ada DB-level unique constraint di `absensi(karyawan_id, tanggal)` dan `penggajian(karyawan_id, periode_bulan)` — race condition bisa buat duplikat |
| B-L2 | schema.ts | Sama untuk `jadwal_kerja` |
| B-L3 | kasbon.ts | Hard DELETE melanggar aturan CLAUDE.md rule 7 (soft delete). Tambah status `'dibatalkan'` |
| F-L1 | kasir/+page.svelte | Dead ternary: `$kasirMode === 'pro' ? 'Retur' : 'Retur'` |
| F-L2 | karyawan/+page.svelte | `URL.createObjectURL()` foto tidak pernah di-revoke — memory leak kecil |
| F-L3 | laporan/+page.svelte | Neraca tidak punya periode filter — tidak bisa lihat historical balance sheet |

---

## FASE 8 — Fitur Baru (Nice to Have)

Urutan disarankan berdasarkan impact ke operasional toko:

```
FASE 8A — Stabilisasi (high impact, fix dulu sebelum fitur baru)
  [ ] Semua item BUGFIX WAJIB di atas
  [ ] Shortcut keyboard kasir F1–F9 lengkap

FASE 8B — Kasir Enhancement
  [ ] Retur Penjualan dari UI kasir (bukan hanya backend)
       → Cari transaksi → pilih item → proses retur
  [ ] Diskon Manual per-order (bukan hanya per-item promo)
       → Input persen atau rupiah langsung di checkout
  [ ] History transaksi lebih lengkap: filter tanggal, cari no. transaksi
  [ ] Cetak/WA ulang struk dari history (bukan hanya langsung checkout)

FASE 8C — Laporan Enhancement
  [ ] Neraca dengan filter periode (sekarang selalu "hari ini")
  [ ] Export PDF real — gunakan browser print (window.print + @media print)
       → Sudah ada CSS, tinggal wiring tombol dan styling per-laporan
  [ ] Export Excel/CSV laporan
       → Sudah ada CSV utility, tinggal endpoint + tombol per laporan
  [ ] Dashboard mobile-friendly — card layout, bukan tabel

FASE 8D — Stok & Gudang
  [ ] Alert stok hampir habis real-time di kasir (badge di search result)
  [ ] Riwayat mutasi stok per barang di halaman gudang
  [ ] Multi-lokasi rak: filter/sort barang per rak

FASE 8E — Integrasi Jadwal ↔ Absensi
  [ ] Saat kasir clock-in, cek jadwal hari ini dan auto-fill shift
  [ ] Alert jika clock-in di luar jam shift yang dijadwalkan
  [ ] Laporan kehadiran vs jadwal: presentase tepat waktu per karyawan

FASE 8F — WhatsApp & Notifikasi
  [ ] Notifikasi WA pengingat hutang (H-3, H-1 jatuh tempo)
  [ ] WA alert ke pemilik: stok habis, void transaksi, diskon tinggi
  [ ] Template WA bisa dikustomisasi dari halaman pengaturan
```

---

## POLA BARU YANG PERLU DIJAGA

Hasil temuan review yang menjadi learning untuk kode ke depan:

```
1. ROUTE ORDER di Hono: static routes (/tukar, /aktif, /jadwal)
   HARUS didaftarkan sebelum dynamic routes (/:id).
   Selalu periksa urutan registrasi saat tambah endpoint baru.

2. TRANSACTION untuk operasi multi-tabel:
   Jika satu aksi update > 1 tabel, selalu pakai db.transaction().
   Contoh: bayar gaji → update penggajian + kasbon + jurnal_kas.

3. API.TS try/catch:
   Setelah fix F-H3, semua caller api.get/post/put/delete
   akan aman dari network error. Tidak perlu try/catch di setiap caller.

4. DOUBLE FETCH pattern:
   Jangan pakai onMount() + $effect() untuk load data yang sama.
   Pilih salah satu: $effect (jika ada reactive deps) atau onMount (jika tidak).

5. PERMISSION GUARD di setiap halaman sensitif:
   Setiap halaman yang bukan kasir harus punya:
   $effect(() => { if ($user && !['pemilik','manajer'].includes($user.role)) goto('/kasir') })
```

---

## SKEMA DATABASE — Tambahan FASE 7

Tiga tabel baru (migration 0014):

```typescript
tipe_shift {
  id, nama, jam_mulai, jam_selesai, warna (#hex), is_active, ...timestamps
}

jadwal_kerja {
  id, karyawan_id, tipe_shift_id, tanggal (YYYY-MM-DD), catatan,
  dibuat_oleh, ...timestamps
}

tukar_shift {
  id, pengaju_id, jadwal_id, penerima_id, jadwal_penerima_id?,
  alasan, status (menunggu|disetujui|ditolak),
  diproses_oleh?, catatan_proses?, ...timestamps
}
```

Dan kolom tambahan di kasbon (migration 0013):
```typescript
kasbon.status  +=  'pengajuan' | 'disetujui' | 'ditolak' | 'aktif' | 'lunas'
kasbon.disetujui_oleh  (integer → karyawan.id)
kasbon.tanggal_cair    (text YYYY-MM-DD)
kasbon.catatan         (text)
```
