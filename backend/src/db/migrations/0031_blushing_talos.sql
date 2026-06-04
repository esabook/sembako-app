CREATE TABLE `pinjaman_investasi` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tipe` text NOT NULL,
	`nama` text NOT NULL,
	`jumlah_pokok` integer NOT NULL,
	`bunga_persen` real DEFAULT 0 NOT NULL,
	`cicilan_per_bulan` integer DEFAULT 0 NOT NULL,
	`tanggal_mulai` text NOT NULL,
	`jatuh_tempo` text,
	`sisa_pokok` integer NOT NULL,
	`status` text DEFAULT 'aktif' NOT NULL,
	`catatan` text,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE TABLE `tamu_birokrasi` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama_tamu` text NOT NULL,
	`instansi` text,
	`keperluan` text NOT NULL,
	`tanggal` text NOT NULL,
	`jam_masuk` text,
	`jam_keluar` text,
	`keterangan` text,
	`dicatat_oleh` integer,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`dicatat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
