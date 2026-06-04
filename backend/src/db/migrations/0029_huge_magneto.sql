CREATE TABLE `evaluasi_karyawan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer NOT NULL,
	`periode` text NOT NULL,
	`nilai` integer NOT NULL,
	`catatan` text,
	`dinilai_oleh` integer NOT NULL,
	`tanggal` text NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dinilai_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_eval_karyawan` ON `evaluasi_karyawan` (`karyawan_id`);--> statement-breakpoint
CREATE TABLE `pengajuan_izin` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer NOT NULL,
	`jenis` text NOT NULL,
	`tanggal_mulai` text NOT NULL,
	`tanggal_selesai` text NOT NULL,
	`alasan` text,
	`bukti_path` text,
	`status` text DEFAULT 'menunggu' NOT NULL,
	`diproses_oleh` integer,
	`catatan_proses` text,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`diproses_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_izin_karyawan` ON `pengajuan_izin` (`karyawan_id`);--> statement-breakpoint
CREATE INDEX `idx_izin_status` ON `pengajuan_izin` (`status`);--> statement-breakpoint
CREATE TABLE `sanksi_insentif` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer NOT NULL,
	`tipe` text NOT NULL,
	`jenis` text NOT NULL,
	`jumlah` real NOT NULL,
	`tanggal` text NOT NULL,
	`keterangan` text,
	`periode_bulan` text NOT NULL,
	`dicatat_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dicatat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_si_karyawan_bulan` ON `sanksi_insentif` (`karyawan_id`,`periode_bulan`);