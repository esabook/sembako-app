CREATE TABLE `draft_keranjang` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kasir_id` integer NOT NULL,
	`pelanggan_id` integer,
	`tipe` text DEFAULT 'eceran' NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`kasir_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `draft_keranjang_kasir_id_unique` ON `draft_keranjang` (`kasir_id`);--> statement-breakpoint
CREATE TABLE `draft_keranjang_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`draft_id` integer NOT NULL,
	`barang_id` integer NOT NULL,
	`tipe_harga` text DEFAULT 'eceran' NOT NULL,
	`satuan_id` integer,
	`jumlah` real NOT NULL,
	`harga_jual` real NOT NULL,
	`diskon_item` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`draft_id`) REFERENCES `draft_keranjang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON UPDATE no action ON DELETE no action
);
