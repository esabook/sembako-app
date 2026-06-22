CREATE TABLE `pembayaran_langganan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`toko_id` integer NOT NULL,
	`periode_bulan` integer DEFAULT 1 NOT NULL,
	`nominal` integer DEFAULT 0 NOT NULL,
	`bukti_path` text,
	`status` text DEFAULT 'menunggu' NOT NULL,
	`catatan_admin` text,
	`diverifikasi_oleh` integer,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`toko_id`) REFERENCES `toko`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`diverifikasi_oleh`) REFERENCES `platform_admin`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_pembayaran_toko` ON `pembayaran_langganan` (`toko_id`);--> statement-breakpoint
CREATE INDEX `idx_pembayaran_status` ON `pembayaran_langganan` (`status`);--> statement-breakpoint
CREATE TABLE `platform_admin` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`nama` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platform_admin_username_unique` ON `platform_admin` (`username`);--> statement-breakpoint
ALTER TABLE `toko` ADD `status_langganan` text DEFAULT 'trial' NOT NULL;--> statement-breakpoint
ALTER TABLE `toko` ADD `trial_berakhir` text;--> statement-breakpoint
ALTER TABLE `toko` ADD `aktif_sampai` text;--> statement-breakpoint
ALTER TABLE `toko` ADD `email_pemilik` text;--> statement-breakpoint
ALTER TABLE `toko` ADD `wa_pemilik` text;