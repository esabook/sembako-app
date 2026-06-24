CREATE TABLE `absensi` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer NOT NULL,
	`tanggal` text NOT NULL,
	`jam_masuk` text,
	`jam_keluar` text,
	`shift` text,
	`status` text DEFAULT 'hadir' NOT NULL,
	`terlambat_menit` integer,
	`dicatat_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dicatat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_absensi_tanggal` ON `absensi` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_absensi_karyawan` ON `absensi` (`karyawan_id`);--> statement-breakpoint
CREATE TABLE `acara_hajatan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama_acara` text NOT NULL,
	`nama_penyelenggara` text NOT NULL,
	`pelanggan_id` integer,
	`tanggal_acara` text NOT NULL,
	`alamat` text,
	`estimasi_tamu` integer,
	`catatan` text,
	`status` text DEFAULT 'persiapan' NOT NULL,
	`total_order` integer DEFAULT 0 NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `agenda_supplier` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_id` integer,
	`nama_supplier` text NOT NULL,
	`tipe` text DEFAULT 'kunjungan' NOT NULL,
	`tanggal` text NOT NULL,
	`jam` text,
	`lokasi` text,
	`petugas_id` integer,
	`hasil` text,
	`catatan` text,
	`status` text DEFAULT 'dijadwalkan' NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`petugas_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `approval` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`referensi_tipe` text NOT NULL,
	`referensi_id` integer NOT NULL,
	`status` text DEFAULT 'menunggu' NOT NULL,
	`diminta_oleh` integer NOT NULL,
	`diproses_oleh` integer,
	`catatan_pengaju` text,
	`catatan_proses` text,
	`dibuat_at` text NOT NULL,
	`diproses_at` text,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`diminta_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`diproses_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_approval_ref` ON `approval` (`referensi_tipe`,`referensi_id`);--> statement-breakpoint
CREATE INDEX `idx_approval_status` ON `approval` (`status`);--> statement-breakpoint
CREATE TABLE `aset_tetap` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`kategori` text DEFAULT 'Lainnya' NOT NULL,
	`nilai_beli` integer DEFAULT 0 NOT NULL,
	`nilai_sekarang` integer DEFAULT 0 NOT NULL,
	`tanggal_beli` text,
	`kondisi` text DEFAULT 'baik' NOT NULL,
	`lokasi` text,
	`catatan` text,
	`is_active` integer DEFAULT true NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `bahan_baku` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kode_bahan` text NOT NULL,
	`nama` text NOT NULL,
	`satuan_id` integer,
	`stok_sekarang` real DEFAULT 0 NOT NULL,
	`stok_minimum` real DEFAULT 0 NOT NULL,
	`harga_beli_rata` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_bahan_baku_stok" CHECK("bahan_baku"."stok_sekarang" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bahan_baku_kode_bahan_unique` ON `bahan_baku` (`kode_bahan`);--> statement-breakpoint
CREATE INDEX `idx_bahan_baku_active` ON `bahan_baku` (`is_active`);--> statement-breakpoint
CREATE TABLE `barang` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kode_barang` text NOT NULL,
	`nama_barang` text NOT NULL,
	`tipe_produk` text DEFAULT 'physical_good' NOT NULL,
	`kategori_id` integer,
	`satuan_dasar_id` integer,
	`konversi_satuan` text,
	`harga_beli_terakhir` integer DEFAULT 0 NOT NULL,
	`harga_beli_rata` integer DEFAULT 0 NOT NULL,
	`harga_jual_eceran` integer DEFAULT 0 NOT NULL,
	`harga_jual_grosir` integer DEFAULT 0 NOT NULL,
	`stok_minimum` real DEFAULT 0 NOT NULL,
	`stok_sekarang` real DEFAULT 0 NOT NULL,
	`lokasi_rak` text,
	`foto_path` text,
	`is_active` integer DEFAULT true NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`kategori_id`) REFERENCES `kategori`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`satuan_dasar_id`) REFERENCES `satuan`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_barang_harga_jual_eceran" CHECK(harga_jual_eceran >= 0),
	CONSTRAINT "chk_barang_harga_jual_grosir" CHECK(harga_jual_grosir >= 0),
	CONSTRAINT "chk_barang_stok" CHECK(stok_sekarang >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `barang_kode_barang_unique` ON `barang` (`kode_barang`);--> statement-breakpoint
CREATE INDEX `idx_barang_active` ON `barang` (`is_active`);--> statement-breakpoint
CREATE TABLE `barang_masuk` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`no_penerimaan` text NOT NULL,
	`po_id` integer,
	`supplier_id` integer NOT NULL,
	`tanggal_terima` text NOT NULL,
	`no_faktur_supplier` text,
	`foto_faktur_path` text,
	`total_nilai` integer DEFAULT 0 NOT NULL,
	`diterima_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`po_id`) REFERENCES `purchase_order`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`diterima_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `barang_masuk_no_penerimaan_unique` ON `barang_masuk` (`no_penerimaan`);--> statement-breakpoint
CREATE TABLE `barang_masuk_detail` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`penerimaan_id` integer NOT NULL,
	`barang_id` integer NOT NULL,
	`satuan_id` integer,
	`jumlah_terima` real NOT NULL,
	`harga_beli` integer NOT NULL,
	`tgl_kadaluarsa` text,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`penerimaan_id`) REFERENCES `barang_masuk`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_bmd_kadaluarsa` ON `barang_masuk_detail` (`tgl_kadaluarsa`);--> statement-breakpoint
CREATE TABLE `barang_modifier_grup` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`barang_id` integer NOT NULL,
	`grup_modifier_id` integer NOT NULL,
	`urutan` integer DEFAULT 0 NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`grup_modifier_id`) REFERENCES `grup_modifier`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_barang_modifier` ON `barang_modifier_grup` (`barang_id`,`grup_modifier_id`);--> statement-breakpoint
CREATE TABLE `booking` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`no_booking` text NOT NULL,
	`pelanggan_id` integer,
	`karyawan_id` integer,
	`barang_id` integer NOT NULL,
	`waktu_mulai` text NOT NULL,
	`waktu_selesai` text,
	`status` text DEFAULT 'booked' NOT NULL,
	`penjualan_id` integer,
	`kredit_id` integer,
	`catatan` text,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`cabang_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`penjualan_id`) REFERENCES `penjualan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`kredit_id`) REFERENCES `kredit_membership`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booking_no_booking_unique` ON `booking` (`no_booking`);--> statement-breakpoint
CREATE INDEX `idx_booking_waktu` ON `booking` (`waktu_mulai`);--> statement-breakpoint
CREATE INDEX `idx_booking_status` ON `booking` (`status`);--> statement-breakpoint
CREATE INDEX `idx_booking_karyawan` ON `booking` (`karyawan_id`);--> statement-breakpoint
CREATE TABLE `budget_operasional` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`periode_bulan` text NOT NULL,
	`kategori` text NOT NULL,
	`nilai_budget` integer DEFAULT 0 NOT NULL,
	`catatan` text,
	`dibuat_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`dibuat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cabang` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`toko_id` integer NOT NULL,
	`kode_cabang` text NOT NULL,
	`nama` text NOT NULL,
	`alamat` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`toko_id`) REFERENCES `toko`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_cabang_toko_kode` ON `cabang` (`toko_id`,`kode_cabang`);--> statement-breakpoint
CREATE INDEX `idx_cabang_toko` ON `cabang` (`toko_id`);--> statement-breakpoint
CREATE TABLE `checklist_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`kategori` text DEFAULT 'kebersihan' NOT NULL,
	`urutan` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `checklist_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`tanggal` text NOT NULL,
	`karyawan_id` integer,
	`selesai` integer DEFAULT false NOT NULL,
	`catatan` text,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`item_id`) REFERENCES `checklist_item`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_checklist_log_tanggal` ON `checklist_log` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_checklist_log_item` ON `checklist_log` (`item_id`);--> statement-breakpoint
CREATE TABLE `detail_layanan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`barang_id` integer NOT NULL,
	`durasi_menit` integer DEFAULT 30 NOT NULL,
	`buffer_menit` integer DEFAULT 0 NOT NULL,
	`dapat_dibooking` integer DEFAULT true NOT NULL,
	`komisi_persen` real DEFAULT 0 NOT NULL,
	`komisi_nominal` integer DEFAULT 0 NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_detail_layanan_barang` ON `detail_layanan` (`barang_id`);--> statement-breakpoint
CREATE TABLE `draft_keranjang` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kasir_id` integer NOT NULL,
	`pelanggan_id` integer,
	`tipe` text DEFAULT 'eceran' NOT NULL,
	`label` text,
	`nomor_bill` integer DEFAULT 1 NOT NULL,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`jumlah_item` integer DEFAULT 0 NOT NULL,
	`meja_id` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`kasir_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`meja_id`) REFERENCES `meja`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_draft_kasir` ON `draft_keranjang` (`kasir_id`);--> statement-breakpoint
CREATE TABLE `draft_keranjang_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`draft_id` integer NOT NULL,
	`barang_id` integer NOT NULL,
	`tipe_harga` text DEFAULT 'eceran' NOT NULL,
	`satuan_id` integer,
	`jumlah` real NOT NULL,
	`harga_jual` integer NOT NULL,
	`diskon_item` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`draft_id`) REFERENCES `draft_keranjang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `evaluasi_karyawan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer NOT NULL,
	`periode` text NOT NULL,
	`nilai` integer NOT NULL,
	`catatan` text,
	`dinilai_oleh` integer NOT NULL,
	`tanggal` text NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dinilai_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_eval_karyawan` ON `evaluasi_karyawan` (`karyawan_id`);--> statement-breakpoint
CREATE TABLE `grup_modifier` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`wajib` integer DEFAULT false NOT NULL,
	`min_pilih` integer DEFAULT 0 NOT NULL,
	`max_pilih` integer DEFAULT 1 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer
);
--> statement-breakpoint
CREATE TABLE `harga_jadwal` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`barang_id` integer NOT NULL,
	`harga_eceran_baru` integer NOT NULL,
	`harga_grosir_baru` integer NOT NULL,
	`berlaku_mulai` text NOT NULL,
	`berlaku_sampai` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`dibuat_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dibuat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `histori_harga_beli` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`barang_id` integer NOT NULL,
	`supplier_id` integer,
	`barang_masuk_id` integer,
	`harga_beli` integer NOT NULL,
	`tanggal_berlaku` text NOT NULL,
	`dicatat_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dicatat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `histori_harga_jual` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`barang_id` integer NOT NULL,
	`harga_eceran` integer NOT NULL,
	`harga_grosir` integer NOT NULL,
	`tanggal_berlaku` text NOT NULL,
	`tanggal_berakhir` text,
	`diubah_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`diubah_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `hutang_supplier` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_id` integer NOT NULL,
	`barang_masuk_id` integer NOT NULL,
	`tanggal_hutang` text NOT NULL,
	`tanggal_jatuh_tempo` text,
	`total_hutang` integer NOT NULL,
	`sisa_hutang` integer NOT NULL,
	`status` text DEFAULT 'belum' NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_masuk_id`) REFERENCES `barang_masuk`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_hutang_status` ON `hutang_supplier` (`status`);--> statement-breakpoint
CREATE INDEX `idx_hutang_jatuh` ON `hutang_supplier` (`tanggal_jatuh_tempo`);--> statement-breakpoint
CREATE TABLE `inspeksi_toko` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tanggal` text NOT NULL,
	`jenis` text DEFAULT 'rutin' NOT NULL,
	`petugas_id` integer,
	`area` text,
	`temuan` text,
	`tindakan` text,
	`nilai` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`catatan` text,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`petugas_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `jadwal_kerja` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer NOT NULL,
	`tipe_shift_id` integer NOT NULL,
	`tanggal` text NOT NULL,
	`catatan` text,
	`dibuat_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tipe_shift_id`) REFERENCES `tipe_shift`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dibuat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `jadwal_staf` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer NOT NULL,
	`hari` integer NOT NULL,
	`jam_mulai` text NOT NULL,
	`jam_selesai` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`cabang_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_jadwal_staf_karyawan` ON `jadwal_staf` (`karyawan_id`);--> statement-breakpoint
CREATE TABLE `jurnal_kas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tanggal` text NOT NULL,
	`kas_bank_id` integer NOT NULL,
	`jenis` text NOT NULL,
	`kategori` text NOT NULL,
	`referensi_tipe` text,
	`referensi_id` integer,
	`keterangan` text,
	`jumlah` integer NOT NULL,
	`dicatat_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`cabang_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`kas_bank_id`) REFERENCES `kas_bank`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dicatat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_jurnal_kas_tanggal` ON `jurnal_kas` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_jurnal_kas_akun` ON `jurnal_kas` (`kas_bank_id`);--> statement-breakpoint
CREATE TABLE `kartu_anggota` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`no_kartu` text NOT NULL,
	`tier` text DEFAULT 'reguler' NOT NULL,
	`diskon_member` real DEFAULT 0 NOT NULL,
	`poin` integer DEFAULT 0 NOT NULL,
	`pelanggan_id` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kartu_anggota_no_kartu_unique` ON `kartu_anggota` (`no_kartu`);--> statement-breakpoint
CREATE TABLE `karyawan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kode_karyawan` text NOT NULL,
	`nama` text NOT NULL,
	`role` text NOT NULL,
	`username` text NOT NULL,
	`email` text,
	`password_hash` text NOT NULL,
	`gaji_pokok` integer DEFAULT 0 NOT NULL,
	`tipe_gaji` text DEFAULT 'bulanan' NOT NULL,
	`kontak` text,
	`foto_path` text,
	`pin_absensi` text,
	`is_active` integer DEFAULT true NOT NULL,
	`toko_id` integer DEFAULT 1,
	`cabang_id` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`toko_id`) REFERENCES `toko`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cabang_id`) REFERENCES `cabang`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `karyawan_kode_karyawan_unique` ON `karyawan` (`kode_karyawan`);--> statement-breakpoint
CREATE UNIQUE INDEX `karyawan_username_unique` ON `karyawan` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `karyawan_email_unique` ON `karyawan` (`email`);--> statement-breakpoint
CREATE INDEX `idx_karyawan_active` ON `karyawan` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_karyawan_toko` ON `karyawan` (`toko_id`);--> statement-breakpoint
CREATE TABLE `kas_bank` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`tipe` text NOT NULL,
	`saldo_awal` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`cabang_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer
);
--> statement-breakpoint
CREATE TABLE `kasbon` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer NOT NULL,
	`tanggal_pinjam` text NOT NULL,
	`jumlah` integer NOT NULL,
	`cicilan_per_bulan` integer DEFAULT 0 NOT NULL,
	`sisa_kasbon` integer NOT NULL,
	`status` text DEFAULT 'pengajuan' NOT NULL,
	`disetujui_oleh` integer,
	`tanggal_cair` text,
	`catatan` text,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`disetujui_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_kasbon_jumlah_pos" CHECK("kasbon"."jumlah" > 0),
	CONSTRAINT "chk_kasbon_sisa_pos" CHECK("kasbon"."sisa_kasbon" >= 0),
	CONSTRAINT "chk_kasbon_cicilan_pos" CHECK("kasbon"."cicilan_per_bulan" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_kasbon_karyawan_status` ON `kasbon` (`karyawan_id`,`status`);--> statement-breakpoint
CREATE TABLE `kategori` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`kode` text,
	`contoh` text,
	`is_preset` integer DEFAULT false NOT NULL,
	`created_by` integer,
	`updated_by` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kategori_nama_unique` ON `kategori` (`nama`);--> statement-breakpoint
CREATE TABLE `komisi_staf` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer NOT NULL,
	`penjualan_id` integer,
	`penjualan_detail_id` integer,
	`barang_id` integer,
	`nilai_komisi` integer DEFAULT 0 NOT NULL,
	`persen` real DEFAULT 0 NOT NULL,
	`tanggal` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`penjualan_id`) REFERENCES `penjualan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`penjualan_detail_id`) REFERENCES `penjualan_detail`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_komisi_nilai" CHECK("komisi_staf"."nilai_komisi" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_komisi_karyawan` ON `komisi_staf` (`karyawan_id`);--> statement-breakpoint
CREATE INDEX `idx_komisi_status` ON `komisi_staf` (`status`);--> statement-breakpoint
CREATE TABLE `komplain_pelanggan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pelanggan_id` integer,
	`nama_pelanggan` text,
	`kategori` text DEFAULT 'lainnya' NOT NULL,
	`deskripsi` text NOT NULL,
	`tanggal` text NOT NULL,
	`status` text DEFAULT 'masuk' NOT NULL,
	`resolusi` text,
	`ditangani_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ditangani_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `kredit_membership` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pelanggan_id` integer NOT NULL,
	`paket_id` integer NOT NULL,
	`sisa_kuota` integer NOT NULL,
	`tanggal_mulai` text NOT NULL,
	`tanggal_expired` text,
	`penjualan_id` integer,
	`status` text DEFAULT 'aktif' NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`paket_id`) REFERENCES `paket_membership`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`penjualan_id`) REFERENCES `penjualan`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_kredit_kuota" CHECK("kredit_membership"."sisa_kuota" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_kredit_pelanggan` ON `kredit_membership` (`pelanggan_id`);--> statement-breakpoint
CREATE INDEX `idx_kredit_status` ON `kredit_membership` (`status`);--> statement-breakpoint
CREATE TABLE `kunjungan_sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pelanggan_id` integer,
	`nama_warung` text NOT NULL,
	`alamat` text,
	`petugas_id` integer,
	`tanggal` text NOT NULL,
	`tujuan` text DEFAULT 'prospek' NOT NULL,
	`hasil` text,
	`catatan` text,
	`status_tindak_lanjut` text DEFAULT 'open' NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`petugas_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lampiran` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`referensi_tipe` text NOT NULL,
	`referensi_id` integer NOT NULL,
	`tipe` text DEFAULT 'gambar' NOT NULL,
	`path` text NOT NULL,
	`thumb_path` text,
	`nama_asli` text,
	`ukuran` integer,
	`uploaded_by` integer NOT NULL,
	`dibuat_at` text NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`uploaded_by`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_lampiran_ref` ON `lampiran` (`referensi_tipe`,`referensi_id`);--> statement-breakpoint
CREATE TABLE `log_aktivitas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer,
	`aksi` text NOT NULL,
	`modul` text NOT NULL,
	`referensi_id` integer,
	`detail_json` text,
	`waktu` text,
	`ip_address` text,
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `meja` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kode_meja` text NOT NULL,
	`nama` text,
	`kapasitas` integer DEFAULT 2 NOT NULL,
	`status` text DEFAULT 'kosong' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`cabang_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_meja_kode` ON `meja` (`tenant_id`,`cabang_id`,`kode_meja`);--> statement-breakpoint
CREATE INDEX `idx_meja_status` ON `meja` (`status`);--> statement-breakpoint
CREATE TABLE `modifier` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`grup_modifier_id` integer NOT NULL,
	`nama` text NOT NULL,
	`harga_tambahan` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`grup_modifier_id`) REFERENCES `grup_modifier`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_modifier_harga" CHECK("modifier"."harga_tambahan" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_modifier_grup` ON `modifier` (`grup_modifier_id`);--> statement-breakpoint
CREATE TABLE `mutasi_stok` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`barang_id` integer NOT NULL,
	`tanggal` text NOT NULL,
	`jenis` text NOT NULL,
	`referensi_tipe` text,
	`referensi_id` integer,
	`jumlah_sebelum` real NOT NULL,
	`jumlah_perubahan` real NOT NULL,
	`jumlah_sesudah` real NOT NULL,
	`dicatat_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`cabang_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dicatat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_mutasi_stok_barang` ON `mutasi_stok` (`barang_id`);--> statement-breakpoint
CREATE INDEX `idx_mutasi_stok_tanggal` ON `mutasi_stok` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_mutasi_stok_cabang` ON `mutasi_stok` (`cabang_id`);--> statement-breakpoint
CREATE TABLE `notifikasi_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`jenis` text NOT NULL,
	`aktif` integer DEFAULT false NOT NULL,
	`channel` text DEFAULT 'dashboard' NOT NULL,
	`threshold` real,
	`jam_kirim` text,
	`hari_kirim` integer,
	`penerima_wa` text,
	`terakhir_dikirim` text,
	`updated_at` text,
	`tenant_id` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notifikasi_config_jenis_unique` ON `notifikasi_config` (`jenis`);--> statement-breakpoint
CREATE TABLE `notifikasi_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`jenis` text NOT NULL,
	`channel` text DEFAULT 'dashboard' NOT NULL,
	`pesan` text NOT NULL,
	`penerima` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`waktu` text NOT NULL,
	`referensi_tipe` text,
	`referensi_id` integer
);
--> statement-breakpoint
CREATE INDEX `idx_notif_log_ref` ON `notifikasi_log` (`referensi_tipe`,`referensi_id`,`waktu`);--> statement-breakpoint
CREATE TABLE `paket_membership` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kode_paket` text NOT NULL,
	`nama` text NOT NULL,
	`barang_id` integer,
	`jumlah_sesi` integer NOT NULL,
	`harga` integer DEFAULT 0 NOT NULL,
	`masa_berlaku_hari` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_paket_sesi" CHECK("paket_membership"."jumlah_sesi" > 0),
	CONSTRAINT "chk_paket_harga" CHECK("paket_membership"."harga" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `paket_membership_kode_paket_unique` ON `paket_membership` (`kode_paket`);--> statement-breakpoint
CREATE TABLE `pelanggan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kode_pelanggan` text NOT NULL,
	`nama` text NOT NULL,
	`gender` text,
	`tipe` text DEFAULT 'eceran' NOT NULL,
	`kontak` text,
	`alamat` text,
	`limit_piutang` integer DEFAULT 0 NOT NULL,
	`saldo_piutang` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pelanggan_kode_pelanggan_unique` ON `pelanggan` (`kode_pelanggan`);--> statement-breakpoint
CREATE TABLE `pembayaran_hutang` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hutang_id` integer NOT NULL,
	`tanggal_bayar` text NOT NULL,
	`jumlah_bayar` integer NOT NULL,
	`kas_bank_id` integer NOT NULL,
	`dibayar_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`hutang_id`) REFERENCES `hutang_supplier`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`kas_bank_id`) REFERENCES `kas_bank`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dibayar_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pembayaran_langganan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`toko_id` integer NOT NULL,
	`periode_bulan` integer DEFAULT 1 NOT NULL,
	`nominal` integer DEFAULT 0 NOT NULL,
	`bukti_path` text,
	`status` text DEFAULT 'menunggu' NOT NULL,
	`catatan_admin` text,
	`diverifikasi_oleh` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`toko_id`) REFERENCES `toko`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`diverifikasi_oleh`) REFERENCES `platform_admin`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_pembayaran_toko` ON `pembayaran_langganan` (`toko_id`);--> statement-breakpoint
CREATE INDEX `idx_pembayaran_status` ON `pembayaran_langganan` (`status`);--> statement-breakpoint
CREATE TABLE `pembayaran_piutang` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`piutang_id` integer NOT NULL,
	`tanggal_bayar` text NOT NULL,
	`jumlah_bayar` integer NOT NULL,
	`kas_bank_id` integer NOT NULL,
	`diterima_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`piutang_id`) REFERENCES `piutang_pelanggan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`kas_bank_id`) REFERENCES `kas_bank`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`diterima_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pengajuan_izin` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer NOT NULL,
	`jenis` text NOT NULL,
	`tanggal_mulai` text NOT NULL,
	`tanggal_selesai` text NOT NULL,
	`alasan` text,
	`bukti_path` text,
	`status` text DEFAULT 'menunggu' NOT NULL,
	`diproses_oleh` integer,
	`catatan_proses` text,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`diproses_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_izin_karyawan` ON `pengajuan_izin` (`karyawan_id`);--> statement-breakpoint
CREATE INDEX `idx_izin_status` ON `pengajuan_izin` (`status`);--> statement-breakpoint
CREATE TABLE `penggajian` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer NOT NULL,
	`periode_bulan` text NOT NULL,
	`hari_kerja` integer DEFAULT 0 NOT NULL,
	`hari_hadir` integer DEFAULT 0 NOT NULL,
	`gaji_pokok` integer NOT NULL,
	`tunjangan` integer DEFAULT 0 NOT NULL,
	`potongan_kasbon` integer DEFAULT 0 NOT NULL,
	`potongan_lain` integer DEFAULT 0 NOT NULL,
	`total_gaji` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_penggajian_karyawan_bulan` ON `penggajian` (`karyawan_id`,`periode_bulan`);--> statement-breakpoint
CREATE TABLE `penjualan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`no_transaksi` text NOT NULL,
	`pelanggan_id` integer,
	`tanggal` text NOT NULL,
	`tipe` text DEFAULT 'eceran' NOT NULL,
	`kasir_id` integer,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`diskon_total` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`metode_bayar` text NOT NULL,
	`bayar` integer DEFAULT 0 NOT NULL,
	`kembalian` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'lunas' NOT NULL,
	`tipe_layanan` text DEFAULT 'retail' NOT NULL,
	`meja_id` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`cabang_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`kasir_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`meja_id`) REFERENCES `meja`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_penjualan_subtotal" CHECK("penjualan"."subtotal" >= 0),
	CONSTRAINT "chk_penjualan_total" CHECK("penjualan"."total" >= 0),
	CONSTRAINT "chk_penjualan_diskon" CHECK("penjualan"."diskon_total" >= 0),
	CONSTRAINT "chk_penjualan_bayar" CHECK("penjualan"."bayar" >= 0),
	CONSTRAINT "chk_penjualan_kembalian" CHECK("penjualan"."kembalian" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `penjualan_no_transaksi_unique` ON `penjualan` (`no_transaksi`);--> statement-breakpoint
CREATE INDEX `idx_penjualan_tanggal` ON `penjualan` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_penjualan_status` ON `penjualan` (`status`);--> statement-breakpoint
CREATE INDEX `idx_penjualan_kasir` ON `penjualan` (`kasir_id`);--> statement-breakpoint
CREATE INDEX `idx_penjualan_cabang` ON `penjualan` (`cabang_id`);--> statement-breakpoint
CREATE INDEX `idx_penjualan_meja` ON `penjualan` (`meja_id`);--> statement-breakpoint
CREATE TABLE `penjualan_detail` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`penjualan_id` integer NOT NULL,
	`barang_id` integer NOT NULL,
	`satuan_id` integer,
	`jumlah` real NOT NULL,
	`harga_jual` integer NOT NULL,
	`diskon_item` integer DEFAULT 0 NOT NULL,
	`subtotal` integer NOT NULL,
	`status_kds` text,
	`dilayani_oleh` integer,
	`booking_id` integer,
	`catatan` text,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`cabang_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`penjualan_id`) REFERENCES `penjualan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dilayani_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`booking_id`) REFERENCES `booking`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_detail_jumlah_pos" CHECK("penjualan_detail"."jumlah" > 0),
	CONSTRAINT "chk_detail_harga_pos" CHECK("penjualan_detail"."harga_jual" >= 0),
	CONSTRAINT "chk_detail_diskon_pos" CHECK("penjualan_detail"."diskon_item" >= 0),
	CONSTRAINT "chk_detail_subtotal_pos" CHECK("penjualan_detail"."subtotal" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_penjualan_detail_trx` ON `penjualan_detail` (`penjualan_id`);--> statement-breakpoint
CREATE INDEX `idx_pd_kds` ON `penjualan_detail` (`status_kds`);--> statement-breakpoint
CREATE TABLE `penjualan_detail_modifier` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`penjualan_detail_id` integer NOT NULL,
	`modifier_id` integer NOT NULL,
	`nama_snapshot` text NOT NULL,
	`harga_snapshot` integer DEFAULT 0 NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`penjualan_detail_id`) REFERENCES `penjualan_detail`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`modifier_id`) REFERENCES `modifier`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_pdm_detail` ON `penjualan_detail_modifier` (`penjualan_detail_id`);--> statement-breakpoint
CREATE TABLE `periode_laporan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`periode_mulai` text NOT NULL,
	`periode_selesai` text NOT NULL,
	`tipe_laporan` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`data_json` text,
	`dibuat_oleh` integer,
	`diapprove_oleh` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`dibuat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`diapprove_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `permintaan_pelanggan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pelanggan_id` integer,
	`nama_pelanggan` text,
	`nama_barang` text NOT NULL,
	`barang_id` integer,
	`qty_minta` integer,
	`catatan` text,
	`status` text DEFAULT 'menunggu' NOT NULL,
	`tanggal` text NOT NULL,
	`ditangani_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ditangani_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pinjaman_investasi` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tipe` text NOT NULL,
	`nama` text NOT NULL,
	`jumlah_pokok` integer NOT NULL,
	`bunga_persen` real DEFAULT 0 NOT NULL,
	`cicilan_per_bulan` integer DEFAULT 0 NOT NULL,
	`tanggal_mulai` text NOT NULL,
	`jatuh_tempo` text,
	`sisa_pokok` integer NOT NULL,
	`status` text DEFAULT 'aktif' NOT NULL,
	`catatan` text,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `pipeline_grosir` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama_pelanggan` text NOT NULL,
	`pelanggan_id` integer,
	`nilai_estimasi` integer DEFAULT 0 NOT NULL,
	`tahap` text DEFAULT 'prospek' NOT NULL,
	`petugas_id` integer,
	`produk_minat` text,
	`catatan` text,
	`tanggal_masuk` text NOT NULL,
	`tanggal_update` text,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`petugas_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_pipeline_tahap` ON `pipeline_grosir` (`tahap`);--> statement-breakpoint
CREATE TABLE `piutang_pelanggan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pelanggan_id` integer NOT NULL,
	`penjualan_id` integer NOT NULL,
	`tanggal_piutang` text NOT NULL,
	`tanggal_jatuh_tempo` text,
	`total_piutang` integer NOT NULL,
	`sisa_piutang` integer NOT NULL,
	`status` text DEFAULT 'belum' NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`penjualan_id`) REFERENCES `penjualan`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_piutang_total_pos" CHECK("piutang_pelanggan"."total_piutang" > 0),
	CONSTRAINT "chk_piutang_sisa_pos" CHECK("piutang_pelanggan"."sisa_piutang" >= 0),
	CONSTRAINT "chk_piutang_sisa_lte_total" CHECK("piutang_pelanggan"."sisa_piutang" <= "piutang_pelanggan"."total_piutang")
);
--> statement-breakpoint
CREATE INDEX `idx_piutang_status` ON `piutang_pelanggan` (`status`);--> statement-breakpoint
CREATE INDEX `idx_piutang_jatuh` ON `piutang_pelanggan` (`tanggal_jatuh_tempo`);--> statement-breakpoint
CREATE TABLE `platform_admin` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`nama` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platform_admin_username_unique` ON `platform_admin` (`username`);--> statement-breakpoint
CREATE TABLE `po_detail` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`po_id` integer NOT NULL,
	`barang_id` integer NOT NULL,
	`satuan_id` integer,
	`jumlah_pesan` real NOT NULL,
	`jumlah_diterima` real DEFAULT 0 NOT NULL,
	`harga_beli_estimasi` integer DEFAULT 0 NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`po_id`) REFERENCES `purchase_order`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `preferensi_pengguna` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer NOT NULL,
	`modul` text NOT NULL,
	`nilai_json` text DEFAULT '{}' NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_preferensi_pengguna` ON `preferensi_pengguna` (`karyawan_id`,`modul`);--> statement-breakpoint
CREATE TABLE `promo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`deskripsi` text,
	`tipe` text NOT NULL,
	`nilai` real NOT NULL,
	`tipe_nilai` text DEFAULT 'persen' NOT NULL,
	`min_qty` integer DEFAULT 1 NOT NULL,
	`min_total` integer DEFAULT 0 NOT NULL,
	`berlaku_mulai` text,
	`berlaku_sampai` text,
	`max_penggunaan` integer,
	`jumlah_dipakai` integer DEFAULT 0 NOT NULL,
	`aktif` integer DEFAULT true NOT NULL,
	`dibuat_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`dibuat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `promo_target` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`promo_id` integer NOT NULL,
	`target_tipe` text NOT NULL,
	`target_id` integer NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`promo_id`) REFERENCES `promo`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_order` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`no_po` text NOT NULL,
	`supplier_id` integer NOT NULL,
	`tanggal_po` text NOT NULL,
	`tanggal_estimasi_datang` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`total_nilai` integer DEFAULT 0 NOT NULL,
	`dibuat_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dibuat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_order_no_po_unique` ON `purchase_order` (`no_po`);--> statement-breakpoint
CREATE TABLE `resep` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`barang_id` integer NOT NULL,
	`bahan_baku_id` integer NOT NULL,
	`jumlah` real NOT NULL,
	`satuan_id` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bahan_baku_id`) REFERENCES `bahan_baku`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_resep_jumlah" CHECK("resep"."jumlah" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_resep_menu_bahan` ON `resep` (`barang_id`,`bahan_baku_id`);--> statement-breakpoint
CREATE INDEX `idx_resep_barang` ON `resep` (`barang_id`);--> statement-breakpoint
CREATE TABLE `retur_penjualan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`no_retur` text NOT NULL,
	`penjualan_id` integer NOT NULL,
	`tanggal` text NOT NULL,
	`kasir_id` integer,
	`total_retur` integer DEFAULT 0 NOT NULL,
	`alasan` text,
	`metode_refund` text DEFAULT 'tunai' NOT NULL,
	`kas_bank_id` integer,
	`catatan` text,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`cabang_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`penjualan_id`) REFERENCES `penjualan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`kasir_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`kas_bank_id`) REFERENCES `kas_bank`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `retur_penjualan_no_retur_unique` ON `retur_penjualan` (`no_retur`);--> statement-breakpoint
CREATE TABLE `retur_penjualan_detail` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`retur_id` integer NOT NULL,
	`barang_id` integer NOT NULL,
	`satuan_id` integer,
	`jumlah_retur` real NOT NULL,
	`harga_jual` integer NOT NULL,
	`subtotal` integer NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`cabang_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`retur_id`) REFERENCES `retur_penjualan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `retur_penjualan_tukar` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`retur_id` integer NOT NULL,
	`barang_id` integer NOT NULL,
	`satuan_id` integer,
	`jumlah` real NOT NULL,
	`harga_jual` integer NOT NULL,
	`subtotal` integer NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`cabang_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`retur_id`) REFERENCES `retur_penjualan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `retur_supplier` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`no_retur` text NOT NULL,
	`barang_masuk_id` integer NOT NULL,
	`supplier_id` integer NOT NULL,
	`tanggal` text NOT NULL,
	`dicatat_oleh` integer,
	`total_retur` integer DEFAULT 0 NOT NULL,
	`alasan` text,
	`metode_refund` text DEFAULT 'kurang_hutang' NOT NULL,
	`hutang_id` integer,
	`kas_bank_id` integer,
	`catatan` text,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`cabang_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`barang_masuk_id`) REFERENCES `barang_masuk`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dicatat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hutang_id`) REFERENCES `hutang_supplier`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`kas_bank_id`) REFERENCES `kas_bank`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `retur_supplier_no_retur_unique` ON `retur_supplier` (`no_retur`);--> statement-breakpoint
CREATE INDEX `idx_retur_sup_bm` ON `retur_supplier` (`barang_masuk_id`);--> statement-breakpoint
CREATE INDEX `idx_retur_sup_supplier` ON `retur_supplier` (`supplier_id`);--> statement-breakpoint
CREATE INDEX `idx_retur_sup_cabang` ON `retur_supplier` (`cabang_id`);--> statement-breakpoint
CREATE TABLE `retur_supplier_detail` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`retur_id` integer NOT NULL,
	`barang_id` integer NOT NULL,
	`jumlah_retur` real NOT NULL,
	`harga_beli` integer NOT NULL,
	`subtotal` integer NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`cabang_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`retur_id`) REFERENCES `retur_supplier`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sanksi_insentif` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer NOT NULL,
	`tipe` text NOT NULL,
	`jenis` text NOT NULL,
	`jumlah` integer NOT NULL,
	`tanggal` text NOT NULL,
	`keterangan` text,
	`periode_bulan` text NOT NULL,
	`dicatat_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dicatat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_si_karyawan_bulan` ON `sanksi_insentif` (`karyawan_id`,`periode_bulan`);--> statement-breakpoint
CREATE TABLE `satuan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`singkatan` text NOT NULL,
	`contoh` text,
	`is_preset` integer DEFAULT false NOT NULL,
	`created_by` integer,
	`updated_by` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `satuan_nama_unique` ON `satuan` (`nama`);--> statement-breakpoint
CREATE TABLE `shift_kasir` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer NOT NULL,
	`tanggal` text NOT NULL,
	`jam_buka` text NOT NULL,
	`jam_tutup` text,
	`kas_awal` integer DEFAULT 0 NOT NULL,
	`kas_fisik` integer,
	`kas_sistem` integer,
	`selisih_kas` integer,
	`jumlah_transaksi` integer DEFAULT 0 NOT NULL,
	`total_penjualan` integer DEFAULT 0 NOT NULL,
	`catatan` text,
	`status` text DEFAULT 'buka' NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`cabang_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sop_instance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rule_id` integer NOT NULL,
	`karyawan_id` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`payload_json` text,
	`hasil_json` text,
	`dibuat_at` text NOT NULL,
	`diselesaikan_at` text,
	FOREIGN KEY (`rule_id`) REFERENCES `sop_rule`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_sop_instance_rule` ON `sop_instance` (`rule_id`);--> statement-breakpoint
CREATE INDEX `idx_sop_instance_karyawan` ON `sop_instance` (`karyawan_id`);--> statement-breakpoint
CREATE INDEX `idx_sop_instance_status` ON `sop_instance` (`status`);--> statement-breakpoint
CREATE TABLE `sop_rule` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`event_name` text NOT NULL,
	`tipe` text DEFAULT 'checklist' NOT NULL,
	`deskripsi` text,
	`config_json` text,
	`is_active` integer DEFAULT true NOT NULL,
	`urutan` integer DEFAULT 0 NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_sop_rule_event` ON `sop_rule` (`event_name`);--> statement-breakpoint
CREATE TABLE `stok_opname` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`no_opname` text NOT NULL,
	`tanggal_mulai` text NOT NULL,
	`tanggal_selesai` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`diapprove_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`cabang_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`diapprove_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stok_opname_no_opname_unique` ON `stok_opname` (`no_opname`);--> statement-breakpoint
CREATE TABLE `stok_opname_detail` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`opname_id` integer NOT NULL,
	`barang_id` integer NOT NULL,
	`stok_sistem` real NOT NULL,
	`stok_fisik` real,
	`selisih` real,
	`alasan_selisih` text,
	`dihitung_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`cabang_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`opname_id`) REFERENCES `stok_opname`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dihitung_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `supplier` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kode_supplier` text NOT NULL,
	`nama_supplier` text NOT NULL,
	`kontak` text,
	`alamat` text,
	`terms_bayar` integer DEFAULT 0 NOT NULL,
	`limit_hutang` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `supplier_kode_supplier_unique` ON `supplier` (`kode_supplier`);--> statement-breakpoint
CREATE TABLE `tagihan_utilitas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`jenis` text DEFAULT 'listrik' NOT NULL,
	`periode_bulan` text NOT NULL,
	`jumlah` integer DEFAULT 0 NOT NULL,
	`tanggal_bayar` text,
	`meter_awal` integer,
	`meter_akhir` integer,
	`catatan` text,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `tamu_birokrasi` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama_tamu` text NOT NULL,
	`instansi` text,
	`keperluan` text NOT NULL,
	`tanggal` text NOT NULL,
	`jam_masuk` text,
	`jam_keluar` text,
	`keterangan` text,
	`dicatat_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`dicatat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `target_penjualan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`periode_bulan` text NOT NULL,
	`target_omzet` integer DEFAULT 0 NOT NULL,
	`target_transaksi` integer DEFAULT 0 NOT NULL,
	`target_margin_pct` real DEFAULT 0 NOT NULL,
	`catatan` text,
	`dibuat_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`dibuat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `target_penjualan_periode_bulan_unique` ON `target_penjualan` (`periode_bulan`);--> statement-breakpoint
CREATE TABLE `tipe_shift` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`jam_mulai` text NOT NULL,
	`jam_selesai` text NOT NULL,
	`warna` text DEFAULT '#00e676' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `toko` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kode_toko` text NOT NULL,
	`nama` text NOT NULL,
	`alamat` text,
	`is_active` integer DEFAULT true NOT NULL,
	`status_langganan` text DEFAULT 'trial' NOT NULL,
	`trial_berakhir` text,
	`aktif_sampai` text,
	`hapus_terjadwal` text,
	`email_pemilik` text,
	`wa_pemilik` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `toko_kode_toko_unique` ON `toko` (`kode_toko`);--> statement-breakpoint
CREATE TABLE `toko_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`toko_id` integer DEFAULT 1 NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`updated_at` text,
	FOREIGN KEY (`toko_id`) REFERENCES `toko`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_toko_settings_key` ON `toko_settings` (`toko_id`,`key`);--> statement-breakpoint
CREATE TABLE `tukar_shift` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pengaju_id` integer NOT NULL,
	`jadwal_id` integer NOT NULL,
	`penerima_id` integer NOT NULL,
	`jadwal_penerima_id` integer,
	`alasan` text,
	`status` text DEFAULT 'menunggu' NOT NULL,
	`diproses_oleh` integer,
	`catatan_proses` text,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`pengaju_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`jadwal_id`) REFERENCES `jadwal_kerja`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`penerima_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`jadwal_penerima_id`) REFERENCES `jadwal_kerja`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`diproses_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `wa_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kode` text NOT NULL,
	`teks` text NOT NULL,
	`aktif` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wa_templates_kode_unique` ON `wa_templates` (`kode`);