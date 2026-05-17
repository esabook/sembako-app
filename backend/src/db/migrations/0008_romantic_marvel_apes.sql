CREATE TABLE `harga_jadwal` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`barang_id` integer NOT NULL,
	`harga_eceran_baru` real NOT NULL,
	`harga_grosir_baru` real NOT NULL,
	`berlaku_mulai` text NOT NULL,
	`berlaku_sampai` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`dibuat_oleh` integer,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dibuat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
