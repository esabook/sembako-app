CREATE TABLE `lampiran` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`referensi_tipe` text NOT NULL,
	`referensi_id` integer NOT NULL,
	`tipe` text DEFAULT 'gambar' NOT NULL,
	`path` text NOT NULL,
	`thumb_path` text,
	`nama_asli` text,
	`ukuran` integer,
	`uploaded_by` integer NOT NULL,
	`dibuat_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`uploaded_by`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_lampiran_ref` ON `lampiran` (`referensi_tipe`,`referensi_id`);