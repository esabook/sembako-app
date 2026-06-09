CREATE TABLE `aset_tetap` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`kategori` text DEFAULT 'Lainnya' NOT NULL,
	`nilai_beli` integer DEFAULT 0 NOT NULL,
	`nilai_sekarang` integer DEFAULT 0 NOT NULL,
	`tanggal_beli` text,
	`kondisi` text DEFAULT 'baik' NOT NULL,
	`lokasi` text,
	`catatan` text,
	`is_active` integer DEFAULT true NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE TABLE `tagihan_utilitas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`jenis` text DEFAULT 'listrik' NOT NULL,
	`periode_bulan` text NOT NULL,
	`jumlah` integer DEFAULT 0 NOT NULL,
	`tanggal_bayar` text,
	`meter_awal` integer,
	`meter_akhir` integer,
	`catatan` text,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime'))
);
