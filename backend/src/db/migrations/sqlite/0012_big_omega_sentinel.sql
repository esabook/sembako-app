CREATE TABLE `promo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`deskripsi` text,
	`tipe` text NOT NULL,
	`nilai` real NOT NULL,
	`tipe_nilai` text DEFAULT 'persen' NOT NULL,
	`min_qty` integer DEFAULT 1 NOT NULL,
	`min_total` real DEFAULT 0 NOT NULL,
	`berlaku_mulai` text,
	`berlaku_sampai` text,
	`max_penggunaan` integer,
	`jumlah_dipakai` integer DEFAULT 0 NOT NULL,
	`aktif` integer DEFAULT true NOT NULL,
	`dibuat_oleh` integer,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`dibuat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `promo_target` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`promo_id` integer NOT NULL,
	`target_tipe` text NOT NULL,
	`target_id` integer NOT NULL,
	FOREIGN KEY (`promo_id`) REFERENCES `promo`(`id`) ON UPDATE no action ON DELETE no action
);
