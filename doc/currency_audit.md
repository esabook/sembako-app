# Currency Audit — Kolom `real` di Schema Stokasir

> **A3 — Fase A SaaS-Readiness** (updated Sprint 4)
> Tujuan: inventarisasi semua 78 kolom `real`, tetapkan keputusan tipe akhir.
> Konversi nilai uang (`real` → `integer` Rupiah penuh) dilakukan saat cutover
> PostgreSQL (Fase D) atau lebih awal per-tabel jika ada akumulasi bug float.

---

## Keputusan Tipe

| Kategori | Tipe sekarang | Target Fase D | Catatan |
|---|---|---|---|
| **Uang (Rupiah)** | `real` | `integer` (bigint di Postgres) | Tidak ada pecahan sen di Rupiah |
| **Kuantitas barang** | `real` | tetap `real` | Bisa kg, liter, 0.5 pcs |
| **Persentase** | `real` | tetap `real` | Diskon %, margin % |
| **Ambiguous** | `real` | case-by-case | Lihat catatan per kolom |

---

## Daftar Lengkap — 78 Kolom

### UANG (55 kolom) → target `integer` di Fase D

| Tabel | Kolom | Keterangan |
|---|---|---|
| `karyawan` | `gaji_pokok` | Gaji kontrak, Rupiah bulanan/harian |
| `barang` | `harga_beli_terakhir` | Harga beli terakhir dari supplier |
| `barang` | `harga_beli_rata` | WAC — Weighted Average Cost |
| `barang` | `harga_jual_eceran` | Harga jual master eceran |
| `barang` | `harga_jual_grosir` | Harga jual master grosir |
| `supplier` | `limit_hutang` | Batas kredit hutang ke supplier |
| `pelanggan` | `limit_piutang` | Batas kredit piutang pelanggan |
| `pelanggan` | `saldo_piutang` | Denormalized sum sisa piutang aktif |
| `histori_harga_beli` | `harga_beli` | Snapshot harga beli per dokumen masuk |
| `histori_harga_jual` | `harga_eceran` | Snapshot harga eceran per periode |
| `histori_harga_jual` | `harga_grosir` | Snapshot harga grosir per periode |
| `purchase_order` | `total_nilai` | Total estimasi nilai PO |
| `po_detail` | `harga_beli_estimasi` | Harga beli estimasi saat PO dibuat |
| `barang_masuk` | `total_nilai` | Total nilai faktur penerimaan |
| `barang_masuk_detail` | `harga_beli` | Harga beli aktual per item masuk |
| `penjualan` | `subtotal` | Subtotal sebelum diskon |
| `penjualan` | `diskon_total` | Total diskon transaksi |
| `penjualan` | `total` | Total setelah diskon |
| `penjualan` | `bayar` | Jumlah uang diterima |
| `penjualan` | `kembalian` | Kembalian ke pelanggan |
| `penjualan_detail` | `harga_jual` | **SNAPSHOT** — harga efektif saat transaksi |
| `penjualan_detail` | `diskon_item` | Diskon per item dalam Rupiah |
| `penjualan_detail` | `subtotal` | jumlah × harga_jual − diskon_item |
| `kas_bank` | `saldo_awal` | Saldo pembukaan akun kas/bank |
| `jurnal_kas` | `jumlah` | Nilai transaksi kas masuk/keluar |
| `hutang_supplier` | `total_hutang` | Total hutang saat faktur dibuat |
| `hutang_supplier` | `sisa_hutang` | Sisa hutang belum dibayar |
| `pembayaran_hutang` | `jumlah_bayar` | Nilai cicilan/pelunasan hutang |
| `piutang_pelanggan` | `total_piutang` | Total piutang saat transaksi |
| `piutang_pelanggan` | `sisa_piutang` | Sisa piutang belum dibayar |
| `pembayaran_piutang` | `jumlah_bayar` | Nilai cicilan/pelunasan piutang |
| `penggajian` | `gaji_pokok` | **SNAPSHOT** gaji pokok saat periode digaji |
| `penggajian` | `tunjangan` | Tunjangan periode ini |
| `penggajian` | `potongan_kasbon` | Potongan cicilan kasbon bulan ini |
| `penggajian` | `potongan_lain` | Potongan lain-lain |
| `penggajian` | `total_gaji` | Net gaji = pokok + tunjangan − potongan |
| `kasbon` | `jumlah` | Pokok pinjaman kasbon |
| `kasbon` | `cicilan_per_bulan` | Cicilan bulanan yang disepakati |
| `kasbon` | `sisa_kasbon` | Sisa pokok belum dilunasi |
| `shift_kasir` | `kas_awal` | Kas fisik saat buka shift |
| `shift_kasir` | `kas_fisik` | Kas fisik saat tutup shift (nullable) |
| `shift_kasir` | `kas_sistem` | Kas sistem = kas_awal + penjualan tunai |
| `shift_kasir` | `selisih_kas` | kas_fisik − kas_sistem (boleh negatif) |
| `shift_kasir` | `total_penjualan` | Total penjualan periode shift |
| `harga_jadwal` | `harga_eceran_baru` | Harga eceran baru yang dijadwalkan |
| `harga_jadwal` | `harga_grosir_baru` | Harga grosir baru yang dijadwalkan |
| `retur_penjualan` | `total_retur` | Total nilai retur |
| `retur_penjualan_detail` | `harga_jual` | **SNAPSHOT** harga efektif saat retur |
| `retur_penjualan_detail` | `subtotal` | jumlah_retur × harga_jual |
| `retur_penjualan_tukar` | `harga_jual` | **SNAPSHOT** harga barang pengganti |
| `retur_penjualan_tukar` | `subtotal` | jumlah × harga_jual |
| `retur_supplier_detail` | `harga_beli` | **SNAPSHOT** harga beli saat retur ke supplier |
| `retur_supplier_detail` | `subtotal` | jumlah × harga_beli |
| `sanksi_insentif` | `jumlah` | Nominal rupiah sanksi/insentif, selalu positif |
| `budget_operasional` | `nilai_budget` | Target anggaran per kategori operasional |
| `target_penjualan` | `target_omzet` | Target omzet penjualan bulanan |
| `promo` | `min_total` | Minimum total belanja untuk promo berlaku |
| `draft_keranjang_item` | `harga_jual` | Harga di draft keranjang kasir |
| `draft_keranjang_item` | `diskon_item` | Diskon item di draft keranjang |

> **SNAPSHOT** = nilai dikunci saat transaksi terjadi, tidak berubah meski harga master berubah.
> Kolom ini **wajib dikonversi bersamaan** dengan tabel induknya di Fase D.

---

### KUANTITAS (15 kolom) → tetap `real`

| Tabel | Kolom | Keterangan |
|---|---|---|
| `barang` | `stok_minimum` | Bisa 0.5 kg, 1.5 liter, dll |
| `barang` | `stok_sekarang` | Stok aktual, bisa pecahan |
| `po_detail` | `jumlah_pesan` | Jumlah dipesan, bisa pecahan |
| `po_detail` | `jumlah_diterima` | Jumlah sudah diterima, bisa pecahan |
| `barang_masuk_detail` | `jumlah_terima` | Jumlah fisik diterima, bisa pecahan |
| `penjualan_detail` | `jumlah` | Qty terjual, bisa 0.5 kg |
| `mutasi_stok` | `jumlah_sebelum` | Stok sebelum mutasi |
| `mutasi_stok` | `jumlah_perubahan` | Delta stok (negatif untuk keluar) |
| `mutasi_stok` | `jumlah_sesudah` | Stok setelah mutasi |
| `stok_opname_detail` | `stok_sistem` | Stok sistem saat opname |
| `stok_opname_detail` | `stok_fisik` | Stok fisik hasil hitung (nullable) |
| `stok_opname_detail` | `selisih` | stok_fisik − stok_sistem |
| `retur_penjualan_detail` | `jumlah_retur` | Qty diretur, bisa pecahan |
| `retur_penjualan_tukar` | `jumlah` | Qty barang pengganti |
| `draft_keranjang_item` | `jumlah` | Qty di draft keranjang |

---

### PERSENTASE (2 kolom) → tetap `real`

| Tabel | Kolom | Keterangan |
|---|---|---|
| `kartu_anggota` | `diskon_member` | Diskon % per tier (0–100), bisa 5.5% |
| `target_penjualan` | `target_margin_pct` | Target margin % (misal 15.0) |

---

### AMBIGUOUS (2 kolom) → keputusan ditunda

| Tabel | Kolom | Nilai saat ini | Keputusan |
|---|---|---|---|
| `notifikasi_config` | `threshold` | Hari / % / unit sesuai `jenis` notifikasi | **Tetap `real`** — polimorfik by design; tidak bisa integer murni |
| `promo` | `nilai` | Rupiah (jika `tipe_nilai='rupiah'`) atau % (jika `tipe_nilai='persen'`) | **Tetap `real`** — nilai % boleh pecahan; jika Rupiah pisahkan ke kolom `nilai_rupiah integer` saat Fase D |

---

## Catatan Migrasi Fase D

1. **Konversi unit**: semua kolom uang `real` → `integer` dengan `ROUND(nilai)`. Rupiah tidak punya sen, jadi `ROUND` aman untuk semua data historis.
2. **Urutan migrasi**: konversi tabel detail sebelum tabel header (karena ada FK + konsistensi snapshot).
3. **Kolom `selisih_kas`**: bisa negatif → pakai `integer` signed (SQLite INTEGER sudah signed 64-bit).
4. **Kolom snapshot** (harga_jual, gaji_pokok di penggajian): konversi sekaligus dengan tabel induk — jangan konversi sebagian.
5. **`promo.nilai`**: jika akan dikonversi, pisah dulu ke dua kolom (`nilai_persen real`, `nilai_rupiah integer`) lalu hapus `nilai`.

---

## Urutan Migrasi per Tabel (Fase D)

Migrasi detail sebelum header — constraint FK dan konsistensi snapshot. **Tahap saat toko kedua nyata atau cutover ke PostgreSQL.**

### Tahap 1 — Tabel master (tidak ada FK ke tabel lain)

- `karyawan`
- `barang`
- `supplier`
- `pelanggan`
- `kas_bank`
- `kartu_anggota`

### Tahap 2 — Tabel transaksi header

- `purchase_order`
- `barang_masuk`
- `penjualan`
- `hutang_supplier`
- `piutang_pelanggan`
- `penggajian`
- `kasbon`
- `shift_kasir`
- `retur_penjualan`
- `harga_jadwal`
- `budget_operasional`
- `target_penjualan`
- `promo`

### Tahap 3 — Tabel detail + snapshot (FK ke Tahap 2)

- `po_detail`
- `barang_masuk_detail`
- `penjualan_detail`
- `pembayaran_hutang`
- `pembayaran_piutang`
- `retur_penjualan_detail`
- `retur_penjualan_tukar`
- `retur_supplier_detail`
- `draft_keranjang_item`
- `sanksi_insentif`
- `histori_harga_beli`
- `histori_harga_jual`

### Checklist Tahap D

- [x] Buat migration script: `ROUND(nilai)` untuk semua kolom uang (0036_nostalgic_galactus.sql)
- [x] Ubah schema: semua `flt()` uang → `money()` builder (SQLite: integer, PG: bigint)
- [x] Deploy SQLite: jalankan `bun run db:migrate` (Fase D-1 selesai 2026-06-11)
- [ ] Validasi: sum() detail = header sebelum/sesudah per tabel (manual check)
- [ ] Test: edge case negatif (kasbon, selisih_kas) → INTEGER signed
- [ ] Deploy PG: Tahap 1 → Tahap 2 → Tahap 3 (Fase D-2, saat cutover PostgreSQL)

---

## Status

- [x] Inventarisasi selesai — 78 kolom real terdokumentasi (60 uang, 15 kuantitas, 2 persentase, 1 ambiguous)
- [x] Migrasi urutan direncanakan — Tahap 1–3 checklist (Fase D)
- [x] Konversi uang → integer SQLite (Fase D-1, selesai 2026-06-11) — 60 kolom via `money()` builder
- [ ] Pisah `promo.nilai` jika diperlukan (Fase D-2)
- [ ] Konversi uang → bigint PostgreSQL (Fase D-2, saat cutover)
