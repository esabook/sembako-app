CREATE TABLE `acara_hajatan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama_acara` text NOT NULL,
	`nama_penyelenggara` text NOT NULL,
	`pelanggan_id` integer,
	`tanggal_acara` text NOT NULL,
	`alamat` text,
	`estimasi_tamu` integer,
	`catatan` text,
	`status` text DEFAULT 'persiapan' NOT NULL,
	`total_order` integer DEFAULT 0 NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `checklist_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`kategori` text DEFAULT 'kebersihan' NOT NULL,
	`urutan` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE TABLE `checklist_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`tanggal` text NOT NULL,
	`karyawan_id` integer,
	`selesai` integer DEFAULT false NOT NULL,
	`catatan` text,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`item_id`) REFERENCES `checklist_item`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_checklist_log_tanggal` ON `checklist_log` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_checklist_log_item` ON `checklist_log` (`item_id`);--> statement-breakpoint
CREATE TABLE `inspeksi_toko` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tanggal` text NOT NULL,
	`jenis` text DEFAULT 'rutin' NOT NULL,
	`petugas_id` integer,
	`area` text,
	`temuan` text,
	`tindakan` text,
	`nilai` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`catatan` text,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`petugas_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pipeline_grosir` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama_pelanggan` text NOT NULL,
	`pelanggan_id` integer,
	`nilai_estimasi` integer DEFAULT 0 NOT NULL,
	`tahap` text DEFAULT 'prospek' NOT NULL,
	`petugas_id` integer,
	`produk_minat` text,
	`catatan` text,
	`tanggal_masuk` text NOT NULL,
	`tanggal_update` text,
	`tenant_id` integer DEFAULT 1 NOT NULL,
	`created_by` integer,
	`updated_by` integer,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`petugas_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_pipeline_tahap` ON `pipeline_grosir` (`tahap`);