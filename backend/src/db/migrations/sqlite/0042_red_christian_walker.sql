ALTER TABLE `karyawan` ADD `email` text;--> statement-breakpoint
CREATE UNIQUE INDEX `karyawan_email_unique` ON `karyawan` (`email`);