CREATE TABLE `preferensi_pengguna` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer NOT NULL,
	`modul` text NOT NULL,
	`nilai_json` text DEFAULT '{}' NOT NULL,
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_preferensi_pengguna` ON `preferensi_pengguna` (`karyawan_id`,`modul`);