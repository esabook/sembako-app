ALTER TABLE `pelanggan` ADD `no_kartu` text;--> statement-breakpoint
ALTER TABLE `pelanggan` ADD `tier` text;--> statement-breakpoint
ALTER TABLE `pelanggan` ADD `poin` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `pelanggan` ADD `diskon_member` real DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `pelanggan_no_kartu_unique` ON `pelanggan` (`no_kartu`);