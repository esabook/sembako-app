CREATE TABLE `approval` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`referensi_tipe` text NOT NULL,
	`referensi_id` integer NOT NULL,
	`status` text DEFAULT 'menunggu' NOT NULL,
	`diminta_oleh` integer NOT NULL,
	`diproses_oleh` integer,
	`catatan_pengaju` text,
	`catatan_proses` text,
	`dibuat_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	`diproses_at` text,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`diminta_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`diproses_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_approval_ref` ON `approval` (`referensi_tipe`,`referensi_id`);--> statement-breakpoint
CREATE INDEX `idx_approval_status` ON `approval` (`status`);