CREATE TABLE `budget_operasional` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`periode_bulan` text NOT NULL,
	`kategori` text NOT NULL,
	`nilai_budget` real DEFAULT 0 NOT NULL,
	`catatan` text,
	`dibuat_oleh` integer,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`dibuat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `target_penjualan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`periode_bulan` text NOT NULL,
	`target_omzet` real DEFAULT 0 NOT NULL,
	`target_transaksi` integer DEFAULT 0 NOT NULL,
	`target_margin_pct` real DEFAULT 0 NOT NULL,
	`catatan` text,
	`dibuat_oleh` integer,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`dibuat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `target_penjualan_periode_bulan_unique` ON `target_penjualan` (`periode_bulan`);