PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_acara_hajatan` (
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
INSERT INTO `__new_acara_hajatan`("id", "nama_acara", "nama_penyelenggara", "pelanggan_id", "tanggal_acara", "alamat", "estimasi_tamu", "catatan", "status", "total_order", "tenant_id", "created_by", "updated_by", "created_at", "updated_at") SELECT "id", "nama_acara", "nama_penyelenggara", "pelanggan_id", "tanggal_acara", "alamat", "estimasi_tamu", "catatan", "status", "total_order", "tenant_id", "created_by", "updated_by", "created_at", "updated_at" FROM `acara_hajatan`;--> statement-breakpoint
DROP TABLE `acara_hajatan`;--> statement-breakpoint
ALTER TABLE `__new_acara_hajatan` RENAME TO `acara_hajatan`;--> statement-breakpoint
CREATE TABLE `__new_agenda_supplier` (
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
INSERT INTO `__new_agenda_supplier`("id", "supplier_id", "nama_supplier", "tipe", "tanggal", "jam", "lokasi", "petugas_id", "hasil", "catatan", "status", "tenant_id", "created_by", "updated_by", "created_at", "updated_at") SELECT "id", "supplier_id", "nama_supplier", "tipe", "tanggal", "jam", "lokasi", "petugas_id", "hasil", "catatan", "status", "tenant_id", "created_by", "updated_by", "created_at", "updated_at" FROM `agenda_supplier`;--> statement-breakpoint
DROP TABLE `agenda_supplier`;--> statement-breakpoint
ALTER TABLE `__new_agenda_supplier` RENAME TO `agenda_supplier`;--> statement-breakpoint
CREATE TABLE `__new_approval` (
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
INSERT INTO `__new_approval`("id", "referensi_tipe", "referensi_id", "status", "diminta_oleh", "diproses_oleh", "catatan_pengaju", "catatan_proses", "dibuat_at", "diproses_at", "tenant_id") SELECT "id", "referensi_tipe", "referensi_id", "status", "diminta_oleh", "diproses_oleh", "catatan_pengaju", "catatan_proses", "dibuat_at", "diproses_at", "tenant_id" FROM `approval`;--> statement-breakpoint
DROP TABLE `approval`;--> statement-breakpoint
ALTER TABLE `__new_approval` RENAME TO `approval`;--> statement-breakpoint
CREATE INDEX `idx_approval_ref` ON `approval` (`referensi_tipe`,`referensi_id`);--> statement-breakpoint
CREATE INDEX `idx_approval_status` ON `approval` (`status`);--> statement-breakpoint
CREATE TABLE `__new_aset_tetap` (
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
INSERT INTO `__new_aset_tetap`("id", "nama", "kategori", "nilai_beli", "nilai_sekarang", "tanggal_beli", "kondisi", "lokasi", "catatan", "is_active", "tenant_id", "created_by", "updated_by", "created_at", "updated_at") SELECT "id", "nama", "kategori", "nilai_beli", "nilai_sekarang", "tanggal_beli", "kondisi", "lokasi", "catatan", "is_active", "tenant_id", "created_by", "updated_by", "created_at", "updated_at" FROM `aset_tetap`;--> statement-breakpoint
DROP TABLE `aset_tetap`;--> statement-breakpoint
ALTER TABLE `__new_aset_tetap` RENAME TO `aset_tetap`;--> statement-breakpoint
CREATE TABLE `__new_barang` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kode_barang` text NOT NULL,
	`nama_barang` text NOT NULL,
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
INSERT INTO `__new_barang`("id", "kode_barang", "nama_barang", "kategori_id", "satuan_dasar_id", "konversi_satuan", "harga_beli_terakhir", "harga_beli_rata", "harga_jual_eceran", "harga_jual_grosir", "stok_minimum", "stok_sekarang", "lokasi_rak", "foto_path", "is_active", "tenant_id", "created_by", "updated_by", "created_at", "updated_at") SELECT "id", "kode_barang", "nama_barang", "kategori_id", "satuan_dasar_id", "konversi_satuan", ROUND("harga_beli_terakhir"), ROUND("harga_beli_rata"), ROUND("harga_jual_eceran"), ROUND("harga_jual_grosir"), "stok_minimum", "stok_sekarang", "lokasi_rak", "foto_path", "is_active", "tenant_id", "created_by", "updated_by", "created_at", "updated_at" FROM `barang`;--> statement-breakpoint
DROP TABLE `barang`;--> statement-breakpoint
ALTER TABLE `__new_barang` RENAME TO `barang`;--> statement-breakpoint
CREATE UNIQUE INDEX `barang_kode_barang_unique` ON `barang` (`kode_barang`);--> statement-breakpoint
CREATE INDEX `idx_barang_active` ON `barang` (`is_active`);--> statement-breakpoint
CREATE TABLE `__new_barang_masuk` (
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
INSERT INTO `__new_barang_masuk`("id", "no_penerimaan", "po_id", "supplier_id", "tanggal_terima", "no_faktur_supplier", "foto_faktur_path", "total_nilai", "diterima_oleh", "tenant_id", "created_at", "updated_at") SELECT "id", "no_penerimaan", "po_id", "supplier_id", "tanggal_terima", "no_faktur_supplier", "foto_faktur_path", ROUND("total_nilai"), "diterima_oleh", "tenant_id", "created_at", "updated_at" FROM `barang_masuk`;--> statement-breakpoint
DROP TABLE `barang_masuk`;--> statement-breakpoint
ALTER TABLE `__new_barang_masuk` RENAME TO `barang_masuk`;--> statement-breakpoint
CREATE UNIQUE INDEX `barang_masuk_no_penerimaan_unique` ON `barang_masuk` (`no_penerimaan`);--> statement-breakpoint
CREATE TABLE `__new_barang_masuk_detail` (
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
INSERT INTO `__new_barang_masuk_detail`("id", "penerimaan_id", "barang_id", "satuan_id", "jumlah_terima", "harga_beli", "tgl_kadaluarsa", "tenant_id") SELECT "id", "penerimaan_id", "barang_id", "satuan_id", "jumlah_terima", ROUND("harga_beli"), "tgl_kadaluarsa", "tenant_id" FROM `barang_masuk_detail`;--> statement-breakpoint
DROP TABLE `barang_masuk_detail`;--> statement-breakpoint
ALTER TABLE `__new_barang_masuk_detail` RENAME TO `barang_masuk_detail`;--> statement-breakpoint
CREATE INDEX `idx_bmd_kadaluarsa` ON `barang_masuk_detail` (`tgl_kadaluarsa`);--> statement-breakpoint
CREATE TABLE `__new_budget_operasional` (
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
INSERT INTO `__new_budget_operasional`("id", "periode_bulan", "kategori", "nilai_budget", "catatan", "dibuat_oleh", "tenant_id", "created_at", "updated_at") SELECT "id", "periode_bulan", "kategori", ROUND("nilai_budget"), "catatan", "dibuat_oleh", "tenant_id", "created_at", "updated_at" FROM `budget_operasional`;--> statement-breakpoint
DROP TABLE `budget_operasional`;--> statement-breakpoint
ALTER TABLE `__new_budget_operasional` RENAME TO `budget_operasional`;--> statement-breakpoint
CREATE TABLE `__new_checklist_item` (
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
INSERT INTO `__new_checklist_item`("id", "nama", "kategori", "urutan", "is_active", "tenant_id", "created_by", "updated_by", "created_at", "updated_at") SELECT "id", "nama", "kategori", "urutan", "is_active", "tenant_id", "created_by", "updated_by", "created_at", "updated_at" FROM `checklist_item`;--> statement-breakpoint
DROP TABLE `checklist_item`;--> statement-breakpoint
ALTER TABLE `__new_checklist_item` RENAME TO `checklist_item`;--> statement-breakpoint
CREATE TABLE `__new_checklist_log` (
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
INSERT INTO `__new_checklist_log`("id", "item_id", "tanggal", "karyawan_id", "selesai", "catatan", "tenant_id", "created_at", "updated_at") SELECT "id", "item_id", "tanggal", "karyawan_id", "selesai", "catatan", "tenant_id", "created_at", "updated_at" FROM `checklist_log`;--> statement-breakpoint
DROP TABLE `checklist_log`;--> statement-breakpoint
ALTER TABLE `__new_checklist_log` RENAME TO `checklist_log`;--> statement-breakpoint
CREATE INDEX `idx_checklist_log_tanggal` ON `checklist_log` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_checklist_log_item` ON `checklist_log` (`item_id`);--> statement-breakpoint
CREATE TABLE `__new_draft_keranjang` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kasir_id` integer NOT NULL,
	`pelanggan_id` integer,
	`tipe` text DEFAULT 'eceran' NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`kasir_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_draft_keranjang`("id", "kasir_id", "pelanggan_id", "tipe", "created_at", "updated_at") SELECT "id", "kasir_id", "pelanggan_id", "tipe", "created_at", "updated_at" FROM `draft_keranjang`;--> statement-breakpoint
DROP TABLE `draft_keranjang`;--> statement-breakpoint
ALTER TABLE `__new_draft_keranjang` RENAME TO `draft_keranjang`;--> statement-breakpoint
CREATE UNIQUE INDEX `draft_keranjang_kasir_id_unique` ON `draft_keranjang` (`kasir_id`);--> statement-breakpoint
CREATE TABLE `__new_draft_keranjang_item` (
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
INSERT INTO `__new_draft_keranjang_item`("id", "draft_id", "barang_id", "tipe_harga", "satuan_id", "jumlah", "harga_jual", "diskon_item") SELECT "id", "draft_id", "barang_id", "tipe_harga", "satuan_id", "jumlah", ROUND("harga_jual"), ROUND("diskon_item") FROM `draft_keranjang_item`;--> statement-breakpoint
DROP TABLE `draft_keranjang_item`;--> statement-breakpoint
ALTER TABLE `__new_draft_keranjang_item` RENAME TO `draft_keranjang_item`;--> statement-breakpoint
CREATE TABLE `__new_evaluasi_karyawan` (
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
INSERT INTO `__new_evaluasi_karyawan`("id", "karyawan_id", "periode", "nilai", "catatan", "dinilai_oleh", "tanggal", "tenant_id", "created_at", "updated_at") SELECT "id", "karyawan_id", "periode", "nilai", "catatan", "dinilai_oleh", "tanggal", "tenant_id", "created_at", "updated_at" FROM `evaluasi_karyawan`;--> statement-breakpoint
DROP TABLE `evaluasi_karyawan`;--> statement-breakpoint
ALTER TABLE `__new_evaluasi_karyawan` RENAME TO `evaluasi_karyawan`;--> statement-breakpoint
CREATE INDEX `idx_eval_karyawan` ON `evaluasi_karyawan` (`karyawan_id`);--> statement-breakpoint
CREATE TABLE `__new_harga_jadwal` (
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
INSERT INTO `__new_harga_jadwal`("id", "barang_id", "harga_eceran_baru", "harga_grosir_baru", "berlaku_mulai", "berlaku_sampai", "status", "dibuat_oleh", "tenant_id", "created_at", "updated_at") SELECT "id", "barang_id", ROUND("harga_eceran_baru"), ROUND("harga_grosir_baru"), "berlaku_mulai", "berlaku_sampai", "status", "dibuat_oleh", "tenant_id", "created_at", "updated_at" FROM `harga_jadwal`;--> statement-breakpoint
DROP TABLE `harga_jadwal`;--> statement-breakpoint
ALTER TABLE `__new_harga_jadwal` RENAME TO `harga_jadwal`;--> statement-breakpoint
CREATE TABLE `__new_histori_harga_beli` (
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
INSERT INTO `__new_histori_harga_beli`("id", "barang_id", "supplier_id", "barang_masuk_id", "harga_beli", "tanggal_berlaku", "dicatat_oleh", "tenant_id") SELECT "id", "barang_id", "supplier_id", "barang_masuk_id", ROUND("harga_beli"), "tanggal_berlaku", "dicatat_oleh", "tenant_id" FROM `histori_harga_beli`;--> statement-breakpoint
DROP TABLE `histori_harga_beli`;--> statement-breakpoint
ALTER TABLE `__new_histori_harga_beli` RENAME TO `histori_harga_beli`;--> statement-breakpoint
CREATE TABLE `__new_histori_harga_jual` (
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
INSERT INTO `__new_histori_harga_jual`("id", "barang_id", "harga_eceran", "harga_grosir", "tanggal_berlaku", "tanggal_berakhir", "diubah_oleh", "tenant_id") SELECT "id", "barang_id", ROUND("harga_eceran"), ROUND("harga_grosir"), "tanggal_berlaku", "tanggal_berakhir", "diubah_oleh", "tenant_id" FROM `histori_harga_jual`;--> statement-breakpoint
DROP TABLE `histori_harga_jual`;--> statement-breakpoint
ALTER TABLE `__new_histori_harga_jual` RENAME TO `histori_harga_jual`;--> statement-breakpoint
CREATE TABLE `__new_hutang_supplier` (
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
INSERT INTO `__new_hutang_supplier`("id", "supplier_id", "barang_masuk_id", "tanggal_hutang", "tanggal_jatuh_tempo", "total_hutang", "sisa_hutang", "status", "tenant_id", "created_by", "updated_by", "created_at", "updated_at") SELECT "id", "supplier_id", "barang_masuk_id", "tanggal_hutang", "tanggal_jatuh_tempo", ROUND("total_hutang"), ROUND("sisa_hutang"), "status", "tenant_id", "created_by", "updated_by", "created_at", "updated_at" FROM `hutang_supplier`;--> statement-breakpoint
DROP TABLE `hutang_supplier`;--> statement-breakpoint
ALTER TABLE `__new_hutang_supplier` RENAME TO `hutang_supplier`;--> statement-breakpoint
CREATE INDEX `idx_hutang_status` ON `hutang_supplier` (`status`);--> statement-breakpoint
CREATE INDEX `idx_hutang_jatuh` ON `hutang_supplier` (`tanggal_jatuh_tempo`);--> statement-breakpoint
CREATE TABLE `__new_inspeksi_toko` (
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
INSERT INTO `__new_inspeksi_toko`("id", "tanggal", "jenis", "petugas_id", "area", "temuan", "tindakan", "nilai", "status", "catatan", "tenant_id", "created_by", "updated_by", "created_at", "updated_at") SELECT "id", "tanggal", "jenis", "petugas_id", "area", "temuan", "tindakan", "nilai", "status", "catatan", "tenant_id", "created_by", "updated_by", "created_at", "updated_at" FROM `inspeksi_toko`;--> statement-breakpoint
DROP TABLE `inspeksi_toko`;--> statement-breakpoint
ALTER TABLE `__new_inspeksi_toko` RENAME TO `inspeksi_toko`;--> statement-breakpoint
CREATE TABLE `__new_jadwal_kerja` (
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
INSERT INTO `__new_jadwal_kerja`("id", "karyawan_id", "tipe_shift_id", "tanggal", "catatan", "dibuat_oleh", "tenant_id", "created_at", "updated_at") SELECT "id", "karyawan_id", "tipe_shift_id", "tanggal", "catatan", "dibuat_oleh", "tenant_id", "created_at", "updated_at" FROM `jadwal_kerja`;--> statement-breakpoint
DROP TABLE `jadwal_kerja`;--> statement-breakpoint
ALTER TABLE `__new_jadwal_kerja` RENAME TO `jadwal_kerja`;--> statement-breakpoint
CREATE TABLE `__new_jurnal_kas` (
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
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`kas_bank_id`) REFERENCES `kas_bank`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dicatat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_jurnal_kas`("id", "tanggal", "kas_bank_id", "jenis", "kategori", "referensi_tipe", "referensi_id", "keterangan", "jumlah", "dicatat_oleh", "tenant_id", "created_at", "updated_at") SELECT "id", "tanggal", "kas_bank_id", "jenis", "kategori", "referensi_tipe", "referensi_id", "keterangan", ROUND("jumlah"), "dicatat_oleh", "tenant_id", "created_at", "updated_at" FROM `jurnal_kas`;--> statement-breakpoint
DROP TABLE `jurnal_kas`;--> statement-breakpoint
ALTER TABLE `__new_jurnal_kas` RENAME TO `jurnal_kas`;--> statement-breakpoint
CREATE INDEX `idx_jurnal_kas_tanggal` ON `jurnal_kas` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_jurnal_kas_akun` ON `jurnal_kas` (`kas_bank_id`);--> statement-breakpoint
CREATE TABLE `__new_kartu_anggota` (
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
INSERT INTO `__new_kartu_anggota`("id", "no_kartu", "tier", "diskon_member", "poin", "pelanggan_id", "is_active", "tenant_id", "created_by", "updated_by", "created_at", "updated_at") SELECT "id", "no_kartu", "tier", "diskon_member", "poin", "pelanggan_id", "is_active", "tenant_id", "created_by", "updated_by", "created_at", "updated_at" FROM `kartu_anggota`;--> statement-breakpoint
DROP TABLE `kartu_anggota`;--> statement-breakpoint
ALTER TABLE `__new_kartu_anggota` RENAME TO `kartu_anggota`;--> statement-breakpoint
CREATE UNIQUE INDEX `kartu_anggota_no_kartu_unique` ON `kartu_anggota` (`no_kartu`);--> statement-breakpoint
CREATE TABLE `__new_karyawan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kode_karyawan` text NOT NULL,
	`nama` text NOT NULL,
	`role` text NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`gaji_pokok` integer DEFAULT 0 NOT NULL,
	`tipe_gaji` text DEFAULT 'bulanan' NOT NULL,
	`kontak` text,
	`foto_path` text,
	`pin_absensi` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
INSERT INTO `__new_karyawan`("id", "kode_karyawan", "nama", "role", "username", "password_hash", "gaji_pokok", "tipe_gaji", "kontak", "foto_path", "pin_absensi", "is_active", "created_at", "updated_at") SELECT "id", "kode_karyawan", "nama", "role", "username", "password_hash", ROUND("gaji_pokok"), "tipe_gaji", "kontak", "foto_path", "pin_absensi", "is_active", "created_at", "updated_at" FROM `karyawan`;--> statement-breakpoint
DROP TABLE `karyawan`;--> statement-breakpoint
ALTER TABLE `__new_karyawan` RENAME TO `karyawan`;--> statement-breakpoint
CREATE UNIQUE INDEX `karyawan_kode_karyawan_unique` ON `karyawan` (`kode_karyawan`);--> statement-breakpoint
CREATE UNIQUE INDEX `karyawan_username_unique` ON `karyawan` (`username`);--> statement-breakpoint
CREATE INDEX `idx_karyawan_active` ON `karyawan` (`is_active`);--> statement-breakpoint
CREATE TABLE `__new_kas_bank` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`tipe` text NOT NULL,
	`saldo_awal` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer
);
--> statement-breakpoint
INSERT INTO `__new_kas_bank`("id", "nama", "tipe", "saldo_awal", "is_active", "tenant_id", "created_by", "updated_by") SELECT "id", "nama", "tipe", ROUND("saldo_awal"), "is_active", "tenant_id", "created_by", "updated_by" FROM `kas_bank`;--> statement-breakpoint
DROP TABLE `kas_bank`;--> statement-breakpoint
ALTER TABLE `__new_kas_bank` RENAME TO `kas_bank`;--> statement-breakpoint
CREATE TABLE `__new_kasbon` (
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
	CONSTRAINT "chk_kasbon_jumlah_pos" CHECK("__new_kasbon"."jumlah" > 0),
	CONSTRAINT "chk_kasbon_sisa_pos" CHECK("__new_kasbon"."sisa_kasbon" >= 0),
	CONSTRAINT "chk_kasbon_cicilan_pos" CHECK("__new_kasbon"."cicilan_per_bulan" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_kasbon`("id", "karyawan_id", "tanggal_pinjam", "jumlah", "cicilan_per_bulan", "sisa_kasbon", "status", "disetujui_oleh", "tanggal_cair", "catatan", "tenant_id", "created_at", "updated_at") SELECT "id", "karyawan_id", "tanggal_pinjam", ROUND("jumlah"), ROUND("cicilan_per_bulan"), ROUND("sisa_kasbon"), "status", "disetujui_oleh", "tanggal_cair", "catatan", "tenant_id", "created_at", "updated_at" FROM `kasbon`;--> statement-breakpoint
DROP TABLE `kasbon`;--> statement-breakpoint
ALTER TABLE `__new_kasbon` RENAME TO `kasbon`;--> statement-breakpoint
CREATE INDEX `idx_kasbon_karyawan_status` ON `kasbon` (`karyawan_id`,`status`);--> statement-breakpoint
CREATE TABLE `__new_komplain_pelanggan` (
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
INSERT INTO `__new_komplain_pelanggan`("id", "pelanggan_id", "nama_pelanggan", "kategori", "deskripsi", "tanggal", "status", "resolusi", "ditangani_oleh", "tenant_id", "created_by", "updated_by", "created_at", "updated_at") SELECT "id", "pelanggan_id", "nama_pelanggan", "kategori", "deskripsi", "tanggal", "status", "resolusi", "ditangani_oleh", "tenant_id", "created_by", "updated_by", "created_at", "updated_at" FROM `komplain_pelanggan`;--> statement-breakpoint
DROP TABLE `komplain_pelanggan`;--> statement-breakpoint
ALTER TABLE `__new_komplain_pelanggan` RENAME TO `komplain_pelanggan`;--> statement-breakpoint
CREATE TABLE `__new_kunjungan_sales` (
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
INSERT INTO `__new_kunjungan_sales`("id", "pelanggan_id", "nama_warung", "alamat", "petugas_id", "tanggal", "tujuan", "hasil", "catatan", "status_tindak_lanjut", "tenant_id", "created_by", "updated_by", "created_at", "updated_at") SELECT "id", "pelanggan_id", "nama_warung", "alamat", "petugas_id", "tanggal", "tujuan", "hasil", "catatan", "status_tindak_lanjut", "tenant_id", "created_by", "updated_by", "created_at", "updated_at" FROM `kunjungan_sales`;--> statement-breakpoint
DROP TABLE `kunjungan_sales`;--> statement-breakpoint
ALTER TABLE `__new_kunjungan_sales` RENAME TO `kunjungan_sales`;--> statement-breakpoint
CREATE TABLE `__new_lampiran` (
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
INSERT INTO `__new_lampiran`("id", "referensi_tipe", "referensi_id", "tipe", "path", "thumb_path", "nama_asli", "ukuran", "uploaded_by", "dibuat_at", "tenant_id") SELECT "id", "referensi_tipe", "referensi_id", "tipe", "path", "thumb_path", "nama_asli", "ukuran", "uploaded_by", "dibuat_at", "tenant_id" FROM `lampiran`;--> statement-breakpoint
DROP TABLE `lampiran`;--> statement-breakpoint
ALTER TABLE `__new_lampiran` RENAME TO `lampiran`;--> statement-breakpoint
CREATE INDEX `idx_lampiran_ref` ON `lampiran` (`referensi_tipe`,`referensi_id`);--> statement-breakpoint
CREATE TABLE `__new_log_aktivitas` (
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
INSERT INTO `__new_log_aktivitas`("id", "karyawan_id", "aksi", "modul", "referensi_id", "detail_json", "waktu", "ip_address") SELECT "id", "karyawan_id", "aksi", "modul", "referensi_id", "detail_json", "waktu", "ip_address" FROM `log_aktivitas`;--> statement-breakpoint
DROP TABLE `log_aktivitas`;--> statement-breakpoint
ALTER TABLE `__new_log_aktivitas` RENAME TO `log_aktivitas`;--> statement-breakpoint
CREATE TABLE `__new_notifikasi_config` (
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
INSERT INTO `__new_notifikasi_config`("id", "jenis", "aktif", "channel", "threshold", "jam_kirim", "hari_kirim", "penerima_wa", "terakhir_dikirim", "updated_at", "tenant_id") SELECT "id", "jenis", "aktif", "channel", "threshold", "jam_kirim", "hari_kirim", "penerima_wa", "terakhir_dikirim", "updated_at", "tenant_id" FROM `notifikasi_config`;--> statement-breakpoint
DROP TABLE `notifikasi_config`;--> statement-breakpoint
ALTER TABLE `__new_notifikasi_config` RENAME TO `notifikasi_config`;--> statement-breakpoint
CREATE UNIQUE INDEX `notifikasi_config_jenis_unique` ON `notifikasi_config` (`jenis`);--> statement-breakpoint
CREATE TABLE `__new_notifikasi_log` (
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
INSERT INTO `__new_notifikasi_log`("id", "jenis", "channel", "pesan", "penerima", "status", "tenant_id", "waktu", "referensi_tipe", "referensi_id") SELECT "id", "jenis", "channel", "pesan", "penerima", "status", "tenant_id", "waktu", "referensi_tipe", "referensi_id" FROM `notifikasi_log`;--> statement-breakpoint
DROP TABLE `notifikasi_log`;--> statement-breakpoint
ALTER TABLE `__new_notifikasi_log` RENAME TO `notifikasi_log`;--> statement-breakpoint
CREATE INDEX `idx_notif_log_ref` ON `notifikasi_log` (`referensi_tipe`,`referensi_id`,`waktu`);--> statement-breakpoint
CREATE TABLE `__new_pelanggan` (
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
INSERT INTO `__new_pelanggan`("id", "kode_pelanggan", "nama", "gender", "tipe", "kontak", "alamat", "limit_piutang", "saldo_piutang", "is_active", "tenant_id", "created_by", "updated_by", "created_at", "updated_at") SELECT "id", "kode_pelanggan", "nama", "gender", "tipe", "kontak", "alamat", ROUND("limit_piutang"), ROUND("saldo_piutang"), "is_active", "tenant_id", "created_by", "updated_by", "created_at", "updated_at" FROM `pelanggan`;--> statement-breakpoint
DROP TABLE `pelanggan`;--> statement-breakpoint
ALTER TABLE `__new_pelanggan` RENAME TO `pelanggan`;--> statement-breakpoint
CREATE UNIQUE INDEX `pelanggan_kode_pelanggan_unique` ON `pelanggan` (`kode_pelanggan`);--> statement-breakpoint
CREATE TABLE `__new_pembayaran_hutang` (
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
INSERT INTO `__new_pembayaran_hutang`("id", "hutang_id", "tanggal_bayar", "jumlah_bayar", "kas_bank_id", "dibayar_oleh", "tenant_id", "created_at", "updated_at") SELECT "id", "hutang_id", "tanggal_bayar", ROUND("jumlah_bayar"), "kas_bank_id", "dibayar_oleh", "tenant_id", "created_at", "updated_at" FROM `pembayaran_hutang`;--> statement-breakpoint
DROP TABLE `pembayaran_hutang`;--> statement-breakpoint
ALTER TABLE `__new_pembayaran_hutang` RENAME TO `pembayaran_hutang`;--> statement-breakpoint
CREATE TABLE `__new_pembayaran_piutang` (
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
INSERT INTO `__new_pembayaran_piutang`("id", "piutang_id", "tanggal_bayar", "jumlah_bayar", "kas_bank_id", "diterima_oleh", "tenant_id", "created_at", "updated_at") SELECT "id", "piutang_id", "tanggal_bayar", ROUND("jumlah_bayar"), "kas_bank_id", "diterima_oleh", "tenant_id", "created_at", "updated_at" FROM `pembayaran_piutang`;--> statement-breakpoint
DROP TABLE `pembayaran_piutang`;--> statement-breakpoint
ALTER TABLE `__new_pembayaran_piutang` RENAME TO `pembayaran_piutang`;--> statement-breakpoint
CREATE TABLE `__new_pengajuan_izin` (
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
INSERT INTO `__new_pengajuan_izin`("id", "karyawan_id", "jenis", "tanggal_mulai", "tanggal_selesai", "alasan", "bukti_path", "status", "diproses_oleh", "catatan_proses", "tenant_id", "created_at", "updated_at") SELECT "id", "karyawan_id", "jenis", "tanggal_mulai", "tanggal_selesai", "alasan", "bukti_path", "status", "diproses_oleh", "catatan_proses", "tenant_id", "created_at", "updated_at" FROM `pengajuan_izin`;--> statement-breakpoint
DROP TABLE `pengajuan_izin`;--> statement-breakpoint
ALTER TABLE `__new_pengajuan_izin` RENAME TO `pengajuan_izin`;--> statement-breakpoint
CREATE INDEX `idx_izin_karyawan` ON `pengajuan_izin` (`karyawan_id`);--> statement-breakpoint
CREATE INDEX `idx_izin_status` ON `pengajuan_izin` (`status`);--> statement-breakpoint
CREATE TABLE `__new_penggajian` (
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
INSERT INTO `__new_penggajian`("id", "karyawan_id", "periode_bulan", "hari_kerja", "hari_hadir", "gaji_pokok", "tunjangan", "potongan_kasbon", "potongan_lain", "total_gaji", "status", "tenant_id", "created_at", "updated_at") SELECT "id", "karyawan_id", "periode_bulan", "hari_kerja", "hari_hadir", ROUND("gaji_pokok"), ROUND("tunjangan"), ROUND("potongan_kasbon"), ROUND("potongan_lain"), ROUND("total_gaji"), "status", "tenant_id", "created_at", "updated_at" FROM `penggajian`;--> statement-breakpoint
DROP TABLE `penggajian`;--> statement-breakpoint
ALTER TABLE `__new_penggajian` RENAME TO `penggajian`;--> statement-breakpoint
CREATE INDEX `idx_penggajian_karyawan_bulan` ON `penggajian` (`karyawan_id`,`periode_bulan`);--> statement-breakpoint
CREATE TABLE `__new_penjualan` (
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
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`kasir_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_penjualan_subtotal" CHECK("__new_penjualan"."subtotal" >= 0),
	CONSTRAINT "chk_penjualan_total" CHECK("__new_penjualan"."total" >= 0),
	CONSTRAINT "chk_penjualan_diskon" CHECK("__new_penjualan"."diskon_total" >= 0),
	CONSTRAINT "chk_penjualan_bayar" CHECK("__new_penjualan"."bayar" >= 0),
	CONSTRAINT "chk_penjualan_kembalian" CHECK("__new_penjualan"."kembalian" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_penjualan`("id", "no_transaksi", "pelanggan_id", "tanggal", "tipe", "kasir_id", "subtotal", "diskon_total", "total", "metode_bayar", "bayar", "kembalian", "status", "tenant_id", "created_at", "updated_at") SELECT "id", "no_transaksi", "pelanggan_id", "tanggal", "tipe", "kasir_id", ROUND("subtotal"), ROUND("diskon_total"), ROUND("total"), "metode_bayar", ROUND("bayar"), ROUND("kembalian"), "status", "tenant_id", "created_at", "updated_at" FROM `penjualan`;--> statement-breakpoint
DROP TABLE `penjualan`;--> statement-breakpoint
ALTER TABLE `__new_penjualan` RENAME TO `penjualan`;--> statement-breakpoint
CREATE UNIQUE INDEX `penjualan_no_transaksi_unique` ON `penjualan` (`no_transaksi`);--> statement-breakpoint
CREATE INDEX `idx_penjualan_tanggal` ON `penjualan` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_penjualan_status` ON `penjualan` (`status`);--> statement-breakpoint
CREATE INDEX `idx_penjualan_kasir` ON `penjualan` (`kasir_id`);--> statement-breakpoint
CREATE TABLE `__new_penjualan_detail` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`penjualan_id` integer NOT NULL,
	`barang_id` integer NOT NULL,
	`satuan_id` integer,
	`jumlah` real NOT NULL,
	`harga_jual` integer NOT NULL,
	`diskon_item` integer DEFAULT 0 NOT NULL,
	`subtotal` integer NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`penjualan_id`) REFERENCES `penjualan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_detail_jumlah_pos" CHECK("__new_penjualan_detail"."jumlah" > 0),
	CONSTRAINT "chk_detail_harga_pos" CHECK("__new_penjualan_detail"."harga_jual" >= 0),
	CONSTRAINT "chk_detail_diskon_pos" CHECK("__new_penjualan_detail"."diskon_item" >= 0),
	CONSTRAINT "chk_detail_subtotal_pos" CHECK("__new_penjualan_detail"."subtotal" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_penjualan_detail`("id", "penjualan_id", "barang_id", "satuan_id", "jumlah", "harga_jual", "diskon_item", "subtotal", "tenant_id") SELECT "id", "penjualan_id", "barang_id", "satuan_id", "jumlah", ROUND("harga_jual"), ROUND("diskon_item"), ROUND("subtotal"), "tenant_id" FROM `penjualan_detail`;--> statement-breakpoint
DROP TABLE `penjualan_detail`;--> statement-breakpoint
ALTER TABLE `__new_penjualan_detail` RENAME TO `penjualan_detail`;--> statement-breakpoint
CREATE INDEX `idx_penjualan_detail_trx` ON `penjualan_detail` (`penjualan_id`);--> statement-breakpoint
CREATE TABLE `__new_periode_laporan` (
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
INSERT INTO `__new_periode_laporan`("id", "periode_mulai", "periode_selesai", "tipe_laporan", "status", "data_json", "dibuat_oleh", "diapprove_oleh", "created_at", "updated_at") SELECT "id", "periode_mulai", "periode_selesai", "tipe_laporan", "status", "data_json", "dibuat_oleh", "diapprove_oleh", "created_at", "updated_at" FROM `periode_laporan`;--> statement-breakpoint
DROP TABLE `periode_laporan`;--> statement-breakpoint
ALTER TABLE `__new_periode_laporan` RENAME TO `periode_laporan`;--> statement-breakpoint
CREATE TABLE `__new_permintaan_pelanggan` (
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
INSERT INTO `__new_permintaan_pelanggan`("id", "pelanggan_id", "nama_pelanggan", "nama_barang", "barang_id", "qty_minta", "catatan", "status", "tanggal", "ditangani_oleh", "tenant_id", "created_by", "updated_by", "created_at", "updated_at") SELECT "id", "pelanggan_id", "nama_pelanggan", "nama_barang", "barang_id", "qty_minta", "catatan", "status", "tanggal", "ditangani_oleh", "tenant_id", "created_by", "updated_by", "created_at", "updated_at" FROM `permintaan_pelanggan`;--> statement-breakpoint
DROP TABLE `permintaan_pelanggan`;--> statement-breakpoint
ALTER TABLE `__new_permintaan_pelanggan` RENAME TO `permintaan_pelanggan`;--> statement-breakpoint
CREATE TABLE `__new_pinjaman_investasi` (
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
INSERT INTO `__new_pinjaman_investasi`("id", "tipe", "nama", "jumlah_pokok", "bunga_persen", "cicilan_per_bulan", "tanggal_mulai", "jatuh_tempo", "sisa_pokok", "status", "catatan", "tenant_id", "created_by", "updated_by", "created_at", "updated_at") SELECT "id", "tipe", "nama", "jumlah_pokok", "bunga_persen", "cicilan_per_bulan", "tanggal_mulai", "jatuh_tempo", "sisa_pokok", "status", "catatan", "tenant_id", "created_by", "updated_by", "created_at", "updated_at" FROM `pinjaman_investasi`;--> statement-breakpoint
DROP TABLE `pinjaman_investasi`;--> statement-breakpoint
ALTER TABLE `__new_pinjaman_investasi` RENAME TO `pinjaman_investasi`;--> statement-breakpoint
CREATE TABLE `__new_pipeline_grosir` (
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
INSERT INTO `__new_pipeline_grosir`("id", "nama_pelanggan", "pelanggan_id", "nilai_estimasi", "tahap", "petugas_id", "produk_minat", "catatan", "tanggal_masuk", "tanggal_update", "tenant_id", "created_by", "updated_by", "created_at", "updated_at") SELECT "id", "nama_pelanggan", "pelanggan_id", "nilai_estimasi", "tahap", "petugas_id", "produk_minat", "catatan", "tanggal_masuk", "tanggal_update", "tenant_id", "created_by", "updated_by", "created_at", "updated_at" FROM `pipeline_grosir`;--> statement-breakpoint
DROP TABLE `pipeline_grosir`;--> statement-breakpoint
ALTER TABLE `__new_pipeline_grosir` RENAME TO `pipeline_grosir`;--> statement-breakpoint
CREATE INDEX `idx_pipeline_tahap` ON `pipeline_grosir` (`tahap`);--> statement-breakpoint
CREATE TABLE `__new_piutang_pelanggan` (
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
	CONSTRAINT "chk_piutang_total_pos" CHECK("__new_piutang_pelanggan"."total_piutang" > 0),
	CONSTRAINT "chk_piutang_sisa_pos" CHECK("__new_piutang_pelanggan"."sisa_piutang" >= 0),
	CONSTRAINT "chk_piutang_sisa_lte_total" CHECK("__new_piutang_pelanggan"."sisa_piutang" <= "__new_piutang_pelanggan"."total_piutang")
);
--> statement-breakpoint
INSERT INTO `__new_piutang_pelanggan`("id", "pelanggan_id", "penjualan_id", "tanggal_piutang", "tanggal_jatuh_tempo", "total_piutang", "sisa_piutang", "status", "tenant_id", "created_by", "updated_by", "created_at", "updated_at") SELECT "id", "pelanggan_id", "penjualan_id", "tanggal_piutang", "tanggal_jatuh_tempo", ROUND("total_piutang"), ROUND("sisa_piutang"), "status", "tenant_id", "created_by", "updated_by", "created_at", "updated_at" FROM `piutang_pelanggan`;--> statement-breakpoint
DROP TABLE `piutang_pelanggan`;--> statement-breakpoint
ALTER TABLE `__new_piutang_pelanggan` RENAME TO `piutang_pelanggan`;--> statement-breakpoint
CREATE INDEX `idx_piutang_status` ON `piutang_pelanggan` (`status`);--> statement-breakpoint
CREATE INDEX `idx_piutang_jatuh` ON `piutang_pelanggan` (`tanggal_jatuh_tempo`);--> statement-breakpoint
CREATE TABLE `__new_po_detail` (
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
INSERT INTO `__new_po_detail`("id", "po_id", "barang_id", "satuan_id", "jumlah_pesan", "jumlah_diterima", "harga_beli_estimasi", "tenant_id") SELECT "id", "po_id", "barang_id", "satuan_id", "jumlah_pesan", "jumlah_diterima", ROUND("harga_beli_estimasi"), "tenant_id" FROM `po_detail`;--> statement-breakpoint
DROP TABLE `po_detail`;--> statement-breakpoint
ALTER TABLE `__new_po_detail` RENAME TO `po_detail`;--> statement-breakpoint
CREATE TABLE `__new_preferensi_pengguna` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer NOT NULL,
	`modul` text NOT NULL,
	`nilai_json` text DEFAULT '{}' NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_preferensi_pengguna`("id", "karyawan_id", "modul", "nilai_json", "updated_at") SELECT "id", "karyawan_id", "modul", "nilai_json", "updated_at" FROM `preferensi_pengguna`;--> statement-breakpoint
DROP TABLE `preferensi_pengguna`;--> statement-breakpoint
ALTER TABLE `__new_preferensi_pengguna` RENAME TO `preferensi_pengguna`;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_preferensi_pengguna` ON `preferensi_pengguna` (`karyawan_id`,`modul`);--> statement-breakpoint
CREATE TABLE `__new_promo` (
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
INSERT INTO `__new_promo`("id", "nama", "deskripsi", "tipe", "nilai", "tipe_nilai", "min_qty", "min_total", "berlaku_mulai", "berlaku_sampai", "max_penggunaan", "jumlah_dipakai", "aktif", "dibuat_oleh", "tenant_id", "created_at", "updated_at") SELECT "id", "nama", "deskripsi", "tipe", "nilai", "tipe_nilai", "min_qty", ROUND("min_total"), "berlaku_mulai", "berlaku_sampai", "max_penggunaan", "jumlah_dipakai", "aktif", "dibuat_oleh", "tenant_id", "created_at", "updated_at" FROM `promo`;--> statement-breakpoint
DROP TABLE `promo`;--> statement-breakpoint
ALTER TABLE `__new_promo` RENAME TO `promo`;--> statement-breakpoint
CREATE TABLE `__new_purchase_order` (
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
INSERT INTO `__new_purchase_order`("id", "no_po", "supplier_id", "tanggal_po", "tanggal_estimasi_datang", "status", "total_nilai", "dibuat_oleh", "tenant_id", "created_at", "updated_at") SELECT "id", "no_po", "supplier_id", "tanggal_po", "tanggal_estimasi_datang", "status", ROUND("total_nilai"), "dibuat_oleh", "tenant_id", "created_at", "updated_at" FROM `purchase_order`;--> statement-breakpoint
DROP TABLE `purchase_order`;--> statement-breakpoint
ALTER TABLE `__new_purchase_order` RENAME TO `purchase_order`;--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_order_no_po_unique` ON `purchase_order` (`no_po`);--> statement-breakpoint
CREATE TABLE `__new_retur_penjualan` (
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
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`penjualan_id`) REFERENCES `penjualan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`kasir_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`kas_bank_id`) REFERENCES `kas_bank`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_retur_penjualan`("id", "no_retur", "penjualan_id", "tanggal", "kasir_id", "total_retur", "alasan", "metode_refund", "kas_bank_id", "catatan", "tenant_id", "created_at", "updated_at") SELECT "id", "no_retur", "penjualan_id", "tanggal", "kasir_id", ROUND("total_retur"), "alasan", "metode_refund", "kas_bank_id", "catatan", "tenant_id", "created_at", "updated_at" FROM `retur_penjualan`;--> statement-breakpoint
DROP TABLE `retur_penjualan`;--> statement-breakpoint
ALTER TABLE `__new_retur_penjualan` RENAME TO `retur_penjualan`;--> statement-breakpoint
CREATE UNIQUE INDEX `retur_penjualan_no_retur_unique` ON `retur_penjualan` (`no_retur`);--> statement-breakpoint
CREATE TABLE `__new_retur_penjualan_detail` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`retur_id` integer NOT NULL,
	`barang_id` integer NOT NULL,
	`satuan_id` integer,
	`jumlah_retur` real NOT NULL,
	`harga_jual` integer NOT NULL,
	`subtotal` integer NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`retur_id`) REFERENCES `retur_penjualan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_retur_penjualan_detail`("id", "retur_id", "barang_id", "satuan_id", "jumlah_retur", "harga_jual", "subtotal", "tenant_id") SELECT "id", "retur_id", "barang_id", "satuan_id", "jumlah_retur", ROUND("harga_jual"), ROUND("subtotal"), "tenant_id" FROM `retur_penjualan_detail`;--> statement-breakpoint
DROP TABLE `retur_penjualan_detail`;--> statement-breakpoint
ALTER TABLE `__new_retur_penjualan_detail` RENAME TO `retur_penjualan_detail`;--> statement-breakpoint
CREATE TABLE `__new_retur_penjualan_tukar` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`retur_id` integer NOT NULL,
	`barang_id` integer NOT NULL,
	`satuan_id` integer,
	`jumlah` real NOT NULL,
	`harga_jual` integer NOT NULL,
	`subtotal` integer NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`retur_id`) REFERENCES `retur_penjualan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_retur_penjualan_tukar`("id", "retur_id", "barang_id", "satuan_id", "jumlah", "harga_jual", "subtotal", "tenant_id") SELECT "id", "retur_id", "barang_id", "satuan_id", "jumlah", ROUND("harga_jual"), ROUND("subtotal"), "tenant_id" FROM `retur_penjualan_tukar`;--> statement-breakpoint
DROP TABLE `retur_penjualan_tukar`;--> statement-breakpoint
ALTER TABLE `__new_retur_penjualan_tukar` RENAME TO `retur_penjualan_tukar`;--> statement-breakpoint
CREATE TABLE `__new_retur_supplier` (
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
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`barang_masuk_id`) REFERENCES `barang_masuk`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dicatat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hutang_id`) REFERENCES `hutang_supplier`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`kas_bank_id`) REFERENCES `kas_bank`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_retur_supplier`("id", "no_retur", "barang_masuk_id", "supplier_id", "tanggal", "dicatat_oleh", "total_retur", "alasan", "metode_refund", "hutang_id", "kas_bank_id", "catatan", "tenant_id", "created_at", "updated_at") SELECT "id", "no_retur", "barang_masuk_id", "supplier_id", "tanggal", "dicatat_oleh", ROUND("total_retur"), "alasan", "metode_refund", "hutang_id", "kas_bank_id", "catatan", "tenant_id", "created_at", "updated_at" FROM `retur_supplier`;--> statement-breakpoint
DROP TABLE `retur_supplier`;--> statement-breakpoint
ALTER TABLE `__new_retur_supplier` RENAME TO `retur_supplier`;--> statement-breakpoint
CREATE UNIQUE INDEX `retur_supplier_no_retur_unique` ON `retur_supplier` (`no_retur`);--> statement-breakpoint
CREATE INDEX `idx_retur_sup_bm` ON `retur_supplier` (`barang_masuk_id`);--> statement-breakpoint
CREATE INDEX `idx_retur_sup_supplier` ON `retur_supplier` (`supplier_id`);--> statement-breakpoint
CREATE TABLE `__new_retur_supplier_detail` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`retur_id` integer NOT NULL,
	`barang_id` integer NOT NULL,
	`jumlah_retur` real NOT NULL,
	`harga_beli` integer NOT NULL,
	`subtotal` integer NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`retur_id`) REFERENCES `retur_supplier`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_retur_supplier_detail`("id", "retur_id", "barang_id", "jumlah_retur", "harga_beli", "subtotal", "tenant_id") SELECT "id", "retur_id", "barang_id", "jumlah_retur", ROUND("harga_beli"), ROUND("subtotal"), "tenant_id" FROM `retur_supplier_detail`;--> statement-breakpoint
DROP TABLE `retur_supplier_detail`;--> statement-breakpoint
ALTER TABLE `__new_retur_supplier_detail` RENAME TO `retur_supplier_detail`;--> statement-breakpoint
CREATE TABLE `__new_sanksi_insentif` (
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
INSERT INTO `__new_sanksi_insentif`("id", "karyawan_id", "tipe", "jenis", "jumlah", "tanggal", "keterangan", "periode_bulan", "dicatat_oleh", "tenant_id", "created_at", "updated_at") SELECT "id", "karyawan_id", "tipe", "jenis", ROUND("jumlah"), "tanggal", "keterangan", "periode_bulan", "dicatat_oleh", "tenant_id", "created_at", "updated_at" FROM `sanksi_insentif`;--> statement-breakpoint
DROP TABLE `sanksi_insentif`;--> statement-breakpoint
ALTER TABLE `__new_sanksi_insentif` RENAME TO `sanksi_insentif`;--> statement-breakpoint
CREATE INDEX `idx_si_karyawan_bulan` ON `sanksi_insentif` (`karyawan_id`,`periode_bulan`);--> statement-breakpoint
CREATE TABLE `__new_shift_kasir` (
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
	`created_by` integer,
	`updated_by` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_shift_kasir`("id", "karyawan_id", "tanggal", "jam_buka", "jam_tutup", "kas_awal", "kas_fisik", "kas_sistem", "selisih_kas", "jumlah_transaksi", "total_penjualan", "catatan", "status", "tenant_id", "created_by", "updated_by", "created_at", "updated_at") SELECT "id", "karyawan_id", "tanggal", "jam_buka", "jam_tutup", ROUND("kas_awal"), ROUND("kas_fisik"), ROUND("kas_sistem"), ROUND("selisih_kas"), "jumlah_transaksi", ROUND("total_penjualan"), "catatan", "status", "tenant_id", "created_by", "updated_by", "created_at", "updated_at" FROM `shift_kasir`;--> statement-breakpoint
DROP TABLE `shift_kasir`;--> statement-breakpoint
ALTER TABLE `__new_shift_kasir` RENAME TO `shift_kasir`;--> statement-breakpoint
CREATE TABLE `__new_sop_instance` (
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
INSERT INTO `__new_sop_instance`("id", "rule_id", "karyawan_id", "status", "payload_json", "hasil_json", "dibuat_at", "diselesaikan_at") SELECT "id", "rule_id", "karyawan_id", "status", "payload_json", "hasil_json", "dibuat_at", "diselesaikan_at" FROM `sop_instance`;--> statement-breakpoint
DROP TABLE `sop_instance`;--> statement-breakpoint
ALTER TABLE `__new_sop_instance` RENAME TO `sop_instance`;--> statement-breakpoint
CREATE INDEX `idx_sop_instance_rule` ON `sop_instance` (`rule_id`);--> statement-breakpoint
CREATE INDEX `idx_sop_instance_karyawan` ON `sop_instance` (`karyawan_id`);--> statement-breakpoint
CREATE INDEX `idx_sop_instance_status` ON `sop_instance` (`status`);--> statement-breakpoint
CREATE TABLE `__new_sop_rule` (
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
INSERT INTO `__new_sop_rule`("id", "nama", "event_name", "tipe", "deskripsi", "config_json", "is_active", "urutan", "tenant_id", "created_at", "updated_at") SELECT "id", "nama", "event_name", "tipe", "deskripsi", "config_json", "is_active", "urutan", "tenant_id", "created_at", "updated_at" FROM `sop_rule`;--> statement-breakpoint
DROP TABLE `sop_rule`;--> statement-breakpoint
ALTER TABLE `__new_sop_rule` RENAME TO `sop_rule`;--> statement-breakpoint
CREATE INDEX `idx_sop_rule_event` ON `sop_rule` (`event_name`);--> statement-breakpoint
CREATE TABLE `__new_stok_opname` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`no_opname` text NOT NULL,
	`tanggal_mulai` text NOT NULL,
	`tanggal_selesai` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`diapprove_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`diapprove_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_stok_opname`("id", "no_opname", "tanggal_mulai", "tanggal_selesai", "status", "diapprove_oleh", "tenant_id", "created_at", "updated_at") SELECT "id", "no_opname", "tanggal_mulai", "tanggal_selesai", "status", "diapprove_oleh", "tenant_id", "created_at", "updated_at" FROM `stok_opname`;--> statement-breakpoint
DROP TABLE `stok_opname`;--> statement-breakpoint
ALTER TABLE `__new_stok_opname` RENAME TO `stok_opname`;--> statement-breakpoint
CREATE UNIQUE INDEX `stok_opname_no_opname_unique` ON `stok_opname` (`no_opname`);--> statement-breakpoint
CREATE TABLE `__new_supplier` (
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
INSERT INTO `__new_supplier`("id", "kode_supplier", "nama_supplier", "kontak", "alamat", "terms_bayar", "limit_hutang", "is_active", "tenant_id", "created_by", "updated_by", "created_at", "updated_at") SELECT "id", "kode_supplier", "nama_supplier", "kontak", "alamat", "terms_bayar", ROUND("limit_hutang"), "is_active", "tenant_id", "created_by", "updated_by", "created_at", "updated_at" FROM `supplier`;--> statement-breakpoint
DROP TABLE `supplier`;--> statement-breakpoint
ALTER TABLE `__new_supplier` RENAME TO `supplier`;--> statement-breakpoint
CREATE UNIQUE INDEX `supplier_kode_supplier_unique` ON `supplier` (`kode_supplier`);--> statement-breakpoint
CREATE TABLE `__new_tagihan_utilitas` (
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
INSERT INTO `__new_tagihan_utilitas`("id", "jenis", "periode_bulan", "jumlah", "tanggal_bayar", "meter_awal", "meter_akhir", "catatan", "tenant_id", "created_by", "updated_by", "created_at", "updated_at") SELECT "id", "jenis", "periode_bulan", "jumlah", "tanggal_bayar", "meter_awal", "meter_akhir", "catatan", "tenant_id", "created_by", "updated_by", "created_at", "updated_at" FROM `tagihan_utilitas`;--> statement-breakpoint
DROP TABLE `tagihan_utilitas`;--> statement-breakpoint
ALTER TABLE `__new_tagihan_utilitas` RENAME TO `tagihan_utilitas`;--> statement-breakpoint
CREATE TABLE `__new_tamu_birokrasi` (
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
INSERT INTO `__new_tamu_birokrasi`("id", "nama_tamu", "instansi", "keperluan", "tanggal", "jam_masuk", "jam_keluar", "keterangan", "dicatat_oleh", "tenant_id", "created_at", "updated_at") SELECT "id", "nama_tamu", "instansi", "keperluan", "tanggal", "jam_masuk", "jam_keluar", "keterangan", "dicatat_oleh", "tenant_id", "created_at", "updated_at" FROM `tamu_birokrasi`;--> statement-breakpoint
DROP TABLE `tamu_birokrasi`;--> statement-breakpoint
ALTER TABLE `__new_tamu_birokrasi` RENAME TO `tamu_birokrasi`;--> statement-breakpoint
CREATE TABLE `__new_target_penjualan` (
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
INSERT INTO `__new_target_penjualan`("id", "periode_bulan", "target_omzet", "target_transaksi", "target_margin_pct", "catatan", "dibuat_oleh", "tenant_id", "created_at", "updated_at") SELECT "id", "periode_bulan", ROUND("target_omzet"), "target_transaksi", "target_margin_pct", "catatan", "dibuat_oleh", "tenant_id", "created_at", "updated_at" FROM `target_penjualan`;--> statement-breakpoint
DROP TABLE `target_penjualan`;--> statement-breakpoint
ALTER TABLE `__new_target_penjualan` RENAME TO `target_penjualan`;--> statement-breakpoint
CREATE UNIQUE INDEX `target_penjualan_periode_bulan_unique` ON `target_penjualan` (`periode_bulan`);--> statement-breakpoint
CREATE TABLE `__new_tipe_shift` (
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
INSERT INTO `__new_tipe_shift`("id", "nama", "jam_mulai", "jam_selesai", "warna", "is_active", "tenant_id", "created_by", "updated_by", "created_at", "updated_at") SELECT "id", "nama", "jam_mulai", "jam_selesai", "warna", "is_active", "tenant_id", "created_by", "updated_by", "created_at", "updated_at" FROM `tipe_shift`;--> statement-breakpoint
DROP TABLE `tipe_shift`;--> statement-breakpoint
ALTER TABLE `__new_tipe_shift` RENAME TO `tipe_shift`;--> statement-breakpoint
CREATE TABLE `__new_toko_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`updated_at` text
);
--> statement-breakpoint
INSERT INTO `__new_toko_settings`("id", "key", "value", "updated_at") SELECT "id", "key", "value", "updated_at" FROM `toko_settings`;--> statement-breakpoint
DROP TABLE `toko_settings`;--> statement-breakpoint
ALTER TABLE `__new_toko_settings` RENAME TO `toko_settings`;--> statement-breakpoint
CREATE UNIQUE INDEX `toko_settings_key_unique` ON `toko_settings` (`key`);--> statement-breakpoint
CREATE TABLE `__new_tukar_shift` (
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
INSERT INTO `__new_tukar_shift`("id", "pengaju_id", "jadwal_id", "penerima_id", "jadwal_penerima_id", "alasan", "status", "diproses_oleh", "catatan_proses", "tenant_id", "created_at", "updated_at") SELECT "id", "pengaju_id", "jadwal_id", "penerima_id", "jadwal_penerima_id", "alasan", "status", "diproses_oleh", "catatan_proses", "tenant_id", "created_at", "updated_at" FROM `tukar_shift`;--> statement-breakpoint
DROP TABLE `tukar_shift`;--> statement-breakpoint
ALTER TABLE `__new_tukar_shift` RENAME TO `tukar_shift`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
