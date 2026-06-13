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
CREATE TABLE `toko` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kode_toko` text NOT NULL,
	`nama` text NOT NULL,
	`alamat` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `toko_kode_toko_unique` ON `toko` (`kode_toko`);--> statement-breakpoint
DROP INDEX `toko_settings_key_unique`;--> statement-breakpoint
ALTER TABLE `toko_settings` ADD `toko_id` integer DEFAULT 1 NOT NULL REFERENCES toko(id);--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_toko_settings_key` ON `toko_settings` (`toko_id`,`key`);--> statement-breakpoint
ALTER TABLE `jurnal_kas` ADD `cabang_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `karyawan` ADD `toko_id` integer DEFAULT 1 REFERENCES toko(id);--> statement-breakpoint
ALTER TABLE `karyawan` ADD `cabang_id` integer REFERENCES cabang(id);--> statement-breakpoint
CREATE INDEX `idx_karyawan_toko` ON `karyawan` (`toko_id`);--> statement-breakpoint
ALTER TABLE `kas_bank` ADD `cabang_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `mutasi_stok` ADD `cabang_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_mutasi_stok_cabang` ON `mutasi_stok` (`cabang_id`);--> statement-breakpoint
ALTER TABLE `penjualan` ADD `cabang_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_penjualan_cabang` ON `penjualan` (`cabang_id`);--> statement-breakpoint
ALTER TABLE `penjualan_detail` ADD `cabang_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `retur_penjualan` ADD `cabang_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `retur_penjualan_detail` ADD `cabang_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `retur_penjualan_tukar` ADD `cabang_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `shift_kasir` ADD `cabang_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `stok_opname` ADD `cabang_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `stok_opname_detail` ADD `cabang_id` integer DEFAULT 1 NOT NULL;