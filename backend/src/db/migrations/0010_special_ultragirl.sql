CREATE TABLE `notifikasi_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`jenis` text NOT NULL,
	`aktif` integer DEFAULT false NOT NULL,
	`channel` text DEFAULT 'dashboard' NOT NULL,
	`threshold` real,
	`jam_kirim` text,
	`hari_kirim` integer,
	`penerima_wa` text,
	`terakhir_dikirim` text,
	`updated_at` text DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notifikasi_config_jenis_unique` ON `notifikasi_config` (`jenis`);--> statement-breakpoint
CREATE TABLE `notifikasi_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`jenis` text NOT NULL,
	`channel` text DEFAULT 'dashboard' NOT NULL,
	`pesan` text NOT NULL,
	`penerima` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`waktu` text DEFAULT (datetime('now','localtime')) NOT NULL,
	`referensi_tipe` text,
	`referensi_id` integer
);
