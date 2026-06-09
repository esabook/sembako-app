CREATE TABLE `retur_penjualan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`no_retur` text NOT NULL,
	`penjualan_id` integer NOT NULL,
	`tanggal` text NOT NULL,
	`kasir_id` integer,
	`total_retur` real DEFAULT 0 NOT NULL,
	`alasan` text,
	`metode_refund` text DEFAULT 'tunai' NOT NULL,
	`kas_bank_id` integer,
	`catatan` text,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
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
	`harga_jual` real NOT NULL,
	`subtotal` real NOT NULL,
	FOREIGN KEY (`retur_id`) REFERENCES `retur_penjualan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON UPDATE no action ON DELETE no action
);
