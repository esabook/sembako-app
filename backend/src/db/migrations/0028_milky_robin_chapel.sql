CREATE TABLE `retur_supplier` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`no_retur` text NOT NULL,
	`barang_masuk_id` integer NOT NULL,
	`supplier_id` integer NOT NULL,
	`tanggal` text NOT NULL,
	`dicatat_oleh` integer,
	`total_retur` real DEFAULT 0 NOT NULL,
	`alasan` text,
	`metode_refund` text DEFAULT 'kurang_hutang' NOT NULL,
	`hutang_id` integer,
	`kas_bank_id` integer,
	`catatan` text,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
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
CREATE TABLE `retur_supplier_detail` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`retur_id` integer NOT NULL,
	`barang_id` integer NOT NULL,
	`jumlah_retur` real NOT NULL,
	`harga_beli` real NOT NULL,
	`subtotal` real NOT NULL,
	FOREIGN KEY (`retur_id`) REFERENCES `retur_supplier`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action
);
