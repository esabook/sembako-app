PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_kasbon` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer NOT NULL,
	`tanggal_pinjam` text NOT NULL,
	`jumlah` real NOT NULL,
	`cicilan_per_bulan` real DEFAULT 0 NOT NULL,
	`sisa_kasbon` real NOT NULL,
	`status` text DEFAULT 'pengajuan' NOT NULL,
	`disetujui_oleh` integer,
	`tanggal_cair` text,
	`catatan` text,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`disetujui_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_kasbon`("id", "karyawan_id", "tanggal_pinjam", "jumlah", "cicilan_per_bulan", "sisa_kasbon", "status", "disetujui_oleh", "tanggal_cair", "catatan", "created_at", "updated_at") SELECT "id", "karyawan_id", "tanggal_pinjam", "jumlah", "cicilan_per_bulan", "sisa_kasbon", "status", "disetujui_oleh", "tanggal_cair", "catatan", "created_at", "updated_at" FROM `kasbon`;--> statement-breakpoint
DROP TABLE `kasbon`;--> statement-breakpoint
ALTER TABLE `__new_kasbon` RENAME TO `kasbon`;--> statement-breakpoint
PRAGMA foreign_keys=ON;