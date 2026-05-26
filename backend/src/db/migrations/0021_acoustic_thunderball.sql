CREATE TABLE `retur_penjualan_tukar` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`retur_id` integer NOT NULL,
	`barang_id` integer NOT NULL,
	`satuan_id` integer,
	`jumlah` real NOT NULL,
	`harga_jual` real NOT NULL,
	`subtotal` real NOT NULL,
	FOREIGN KEY (`retur_id`) REFERENCES `retur_penjualan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON UPDATE no action ON DELETE no action
);
