CREATE TABLE `shift_kasir` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer NOT NULL,
	`tanggal` text NOT NULL,
	`jam_buka` text NOT NULL,
	`jam_tutup` text,
	`kas_awal` real DEFAULT 0 NOT NULL,
	`kas_fisik` real,
	`kas_sistem` real,
	`selisih_kas` real,
	`jumlah_transaksi` integer DEFAULT 0 NOT NULL,
	`total_penjualan` real DEFAULT 0 NOT NULL,
	`catatan` text,
	`status` text DEFAULT 'buka' NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
