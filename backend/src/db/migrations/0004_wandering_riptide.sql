CREATE TABLE `kartu_anggota` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`no_kartu` text NOT NULL,
	`tier` text DEFAULT 'reguler' NOT NULL,
	`diskon_member` real DEFAULT 0 NOT NULL,
	`poin` integer DEFAULT 0 NOT NULL,
	`pelanggan_id` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kartu_anggota_no_kartu_unique` ON `kartu_anggota` (`no_kartu`);--> statement-breakpoint
DROP INDEX `pelanggan_no_kartu_unique`;--> statement-breakpoint
ALTER TABLE `pelanggan` DROP COLUMN `no_kartu`;--> statement-breakpoint
ALTER TABLE `pelanggan` DROP COLUMN `tier`;--> statement-breakpoint
ALTER TABLE `pelanggan` DROP COLUMN `poin`;--> statement-breakpoint
ALTER TABLE `pelanggan` DROP COLUMN `diskon_member`;