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
ALTER TABLE `barang` ADD `tipe_produk` text DEFAULT 'physical_good' NOT NULL;--> statement-breakpoint
ALTER TABLE `draft_keranjang` ADD `meja_id` integer REFERENCES meja(id);--> statement-breakpoint
ALTER TABLE `penjualan` ADD `tipe_layanan` text DEFAULT 'retail' NOT NULL;--> statement-breakpoint
ALTER TABLE `penjualan` ADD `meja_id` integer REFERENCES meja(id);--> statement-breakpoint
CREATE INDEX `idx_penjualan_meja` ON `penjualan` (`meja_id`);--> statement-breakpoint
ALTER TABLE `penjualan_detail` ADD `status_kds` text;--> statement-breakpoint
ALTER TABLE `penjualan_detail` ADD `dilayani_oleh` integer REFERENCES karyawan(id);--> statement-breakpoint
ALTER TABLE `penjualan_detail` ADD `booking_id` integer REFERENCES booking(id);--> statement-breakpoint
ALTER TABLE `penjualan_detail` ADD `catatan` text;--> statement-breakpoint
CREATE INDEX `idx_pd_kds` ON `penjualan_detail` (`status_kds`);