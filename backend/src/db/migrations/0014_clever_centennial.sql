CREATE TABLE `jadwal_kerja` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer NOT NULL,
	`tipe_shift_id` integer NOT NULL,
	`tanggal` text NOT NULL,
	`catatan` text,
	`dibuat_oleh` integer,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tipe_shift_id`) REFERENCES `tipe_shift`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dibuat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tipe_shift` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`jam_mulai` text NOT NULL,
	`jam_selesai` text NOT NULL,
	`warna` text DEFAULT '#00e676' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE TABLE `tukar_shift` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pengaju_id` integer NOT NULL,
	`jadwal_id` integer NOT NULL,
	`penerima_id` integer NOT NULL,
	`jadwal_penerima_id` integer,
	`alasan` text,
	`status` text DEFAULT 'menunggu' NOT NULL,
	`diproses_oleh` integer,
	`catatan_proses` text,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`pengaju_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`jadwal_id`) REFERENCES `jadwal_kerja`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`penerima_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`jadwal_penerima_id`) REFERENCES `jadwal_kerja`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`diproses_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
