PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_barang` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kode_barang` text NOT NULL,
	`nama_barang` text NOT NULL,
	`kategori_id` integer,
	`satuan_dasar_id` integer,
	`konversi_satuan` text,
	`harga_beli_terakhir` real DEFAULT 0 NOT NULL,
	`harga_beli_rata` real DEFAULT 0 NOT NULL,
	`harga_jual_eceran` real DEFAULT 0 NOT NULL,
	`harga_jual_grosir` real DEFAULT 0 NOT NULL,
	`stok_minimum` real DEFAULT 0 NOT NULL,
	`stok_sekarang` real DEFAULT 0 NOT NULL,
	`lokasi_rak` text,
	`foto_path` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`kategori_id`) REFERENCES `kategori`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`satuan_dasar_id`) REFERENCES `satuan`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_barang_harga_jual_eceran" CHECK(harga_jual_eceran >= 0),
	CONSTRAINT "chk_barang_harga_jual_grosir" CHECK(harga_jual_grosir >= 0),
	CONSTRAINT "chk_barang_stok" CHECK(stok_sekarang >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_barang`("id", "kode_barang", "nama_barang", "kategori_id", "satuan_dasar_id", "konversi_satuan", "harga_beli_terakhir", "harga_beli_rata", "harga_jual_eceran", "harga_jual_grosir", "stok_minimum", "stok_sekarang", "lokasi_rak", "foto_path", "is_active", "created_at", "updated_at") SELECT "id", "kode_barang", "nama_barang", "kategori_id", "satuan_dasar_id", "konversi_satuan", "harga_beli_terakhir", "harga_beli_rata", "harga_jual_eceran", "harga_jual_grosir", "stok_minimum", "stok_sekarang", "lokasi_rak", "foto_path", "is_active", "created_at", "updated_at" FROM `barang`;--> statement-breakpoint
DROP TABLE `barang`;--> statement-breakpoint
ALTER TABLE `__new_barang` RENAME TO `barang`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `barang_kode_barang_unique` ON `barang` (`kode_barang`);--> statement-breakpoint
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
	FOREIGN KEY (`disetujui_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_kasbon_jumlah_pos" CHECK("__new_kasbon"."jumlah" > 0),
	CONSTRAINT "chk_kasbon_sisa_pos" CHECK("__new_kasbon"."sisa_kasbon" >= 0),
	CONSTRAINT "chk_kasbon_cicilan_pos" CHECK("__new_kasbon"."cicilan_per_bulan" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_kasbon`("id", "karyawan_id", "tanggal_pinjam", "jumlah", "cicilan_per_bulan", "sisa_kasbon", "status", "disetujui_oleh", "tanggal_cair", "catatan", "created_at", "updated_at") SELECT "id", "karyawan_id", "tanggal_pinjam", "jumlah", "cicilan_per_bulan", "sisa_kasbon", "status", "disetujui_oleh", "tanggal_cair", "catatan", "created_at", "updated_at" FROM `kasbon`;--> statement-breakpoint
DROP TABLE `kasbon`;--> statement-breakpoint
ALTER TABLE `__new_kasbon` RENAME TO `kasbon`;--> statement-breakpoint
CREATE TABLE `__new_penjualan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`no_transaksi` text NOT NULL,
	`pelanggan_id` integer,
	`tanggal` text NOT NULL,
	`tipe` text DEFAULT 'eceran' NOT NULL,
	`kasir_id` integer,
	`subtotal` real DEFAULT 0 NOT NULL,
	`diskon_total` real DEFAULT 0 NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`metode_bayar` text NOT NULL,
	`bayar` real DEFAULT 0 NOT NULL,
	`kembalian` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'lunas' NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`kasir_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_penjualan_subtotal" CHECK("__new_penjualan"."subtotal" >= 0),
	CONSTRAINT "chk_penjualan_total" CHECK("__new_penjualan"."total" >= 0),
	CONSTRAINT "chk_penjualan_diskon" CHECK("__new_penjualan"."diskon_total" >= 0),
	CONSTRAINT "chk_penjualan_bayar" CHECK("__new_penjualan"."bayar" >= 0),
	CONSTRAINT "chk_penjualan_kembalian" CHECK("__new_penjualan"."kembalian" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_penjualan`("id", "no_transaksi", "pelanggan_id", "tanggal", "tipe", "kasir_id", "subtotal", "diskon_total", "total", "metode_bayar", "bayar", "kembalian", "status", "created_at", "updated_at") SELECT "id", "no_transaksi", "pelanggan_id", "tanggal", "tipe", "kasir_id", "subtotal", "diskon_total", "total", "metode_bayar", "bayar", "kembalian", "status", "created_at", "updated_at" FROM `penjualan`;--> statement-breakpoint
DROP TABLE `penjualan`;--> statement-breakpoint
ALTER TABLE `__new_penjualan` RENAME TO `penjualan`;--> statement-breakpoint
CREATE UNIQUE INDEX `penjualan_no_transaksi_unique` ON `penjualan` (`no_transaksi`);--> statement-breakpoint
CREATE INDEX `idx_penjualan_tanggal` ON `penjualan` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_penjualan_status` ON `penjualan` (`status`);--> statement-breakpoint
CREATE INDEX `idx_penjualan_kasir` ON `penjualan` (`kasir_id`);--> statement-breakpoint
CREATE TABLE `__new_penjualan_detail` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`penjualan_id` integer NOT NULL,
	`barang_id` integer NOT NULL,
	`satuan_id` integer,
	`jumlah` real NOT NULL,
	`harga_jual` real NOT NULL,
	`diskon_item` real DEFAULT 0 NOT NULL,
	`subtotal` real NOT NULL,
	FOREIGN KEY (`penjualan_id`) REFERENCES `penjualan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_detail_jumlah_pos" CHECK("__new_penjualan_detail"."jumlah" > 0),
	CONSTRAINT "chk_detail_harga_pos" CHECK("__new_penjualan_detail"."harga_jual" >= 0),
	CONSTRAINT "chk_detail_diskon_pos" CHECK("__new_penjualan_detail"."diskon_item" >= 0),
	CONSTRAINT "chk_detail_subtotal_pos" CHECK("__new_penjualan_detail"."subtotal" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_penjualan_detail`("id", "penjualan_id", "barang_id", "satuan_id", "jumlah", "harga_jual", "diskon_item", "subtotal") SELECT "id", "penjualan_id", "barang_id", "satuan_id", "jumlah", "harga_jual", "diskon_item", "subtotal" FROM `penjualan_detail`;--> statement-breakpoint
DROP TABLE `penjualan_detail`;--> statement-breakpoint
ALTER TABLE `__new_penjualan_detail` RENAME TO `penjualan_detail`;--> statement-breakpoint
CREATE INDEX `idx_penjualan_detail_trx` ON `penjualan_detail` (`penjualan_id`);--> statement-breakpoint
CREATE TABLE `__new_piutang_pelanggan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pelanggan_id` integer NOT NULL,
	`penjualan_id` integer NOT NULL,
	`tanggal_piutang` text NOT NULL,
	`tanggal_jatuh_tempo` text,
	`total_piutang` real NOT NULL,
	`sisa_piutang` real NOT NULL,
	`status` text DEFAULT 'belum' NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`penjualan_id`) REFERENCES `penjualan`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_piutang_total_pos" CHECK("__new_piutang_pelanggan"."total_piutang" > 0),
	CONSTRAINT "chk_piutang_sisa_pos" CHECK("__new_piutang_pelanggan"."sisa_piutang" >= 0),
	CONSTRAINT "chk_piutang_sisa_lte_total" CHECK("__new_piutang_pelanggan"."sisa_piutang" <= "__new_piutang_pelanggan"."total_piutang")
);
--> statement-breakpoint
INSERT INTO `__new_piutang_pelanggan`("id", "pelanggan_id", "penjualan_id", "tanggal_piutang", "tanggal_jatuh_tempo", "total_piutang", "sisa_piutang", "status", "created_at", "updated_at") SELECT "id", "pelanggan_id", "penjualan_id", "tanggal_piutang", "tanggal_jatuh_tempo", "total_piutang", "sisa_piutang", "status", "created_at", "updated_at" FROM `piutang_pelanggan`;--> statement-breakpoint
DROP TABLE `piutang_pelanggan`;--> statement-breakpoint
ALTER TABLE `__new_piutang_pelanggan` RENAME TO `piutang_pelanggan`;--> statement-breakpoint
CREATE INDEX `idx_piutang_status` ON `piutang_pelanggan` (`status`);--> statement-breakpoint
CREATE INDEX `idx_piutang_jatuh` ON `piutang_pelanggan` (`tanggal_jatuh_tempo`);