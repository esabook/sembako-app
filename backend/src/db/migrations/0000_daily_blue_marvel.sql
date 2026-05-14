CREATE TABLE `absensi` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer NOT NULL,
	`tanggal` text NOT NULL,
	`jam_masuk` text,
	`jam_keluar` text,
	`shift` text,
	`status` text DEFAULT 'hadir' NOT NULL,
	`dicatat_oleh` integer,
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dicatat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `barang` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kode_barang` text NOT NULL,
	`nama_barang` text NOT NULL,
	`kategori_id` integer,
	`satuan_dasar_id` integer,
	`konversi_satuan` text,
	`harga_beli_terakhir` real DEFAULT 0 NOT NULL,
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
	FOREIGN KEY (`satuan_dasar_id`) REFERENCES `satuan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `barang_kode_barang_unique` ON `barang` (`kode_barang`);--> statement-breakpoint
CREATE TABLE `barang_masuk` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`no_penerimaan` text NOT NULL,
	`po_id` integer,
	`supplier_id` integer NOT NULL,
	`tanggal_terima` text NOT NULL,
	`no_faktur_supplier` text,
	`foto_faktur_path` text,
	`total_nilai` real DEFAULT 0 NOT NULL,
	`diterima_oleh` integer,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`po_id`) REFERENCES `purchase_order`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`diterima_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `barang_masuk_no_penerimaan_unique` ON `barang_masuk` (`no_penerimaan`);--> statement-breakpoint
CREATE TABLE `barang_masuk_detail` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`penerimaan_id` integer NOT NULL,
	`barang_id` integer NOT NULL,
	`satuan_id` integer,
	`jumlah_terima` real NOT NULL,
	`harga_beli` real NOT NULL,
	`tgl_kadaluarsa` text,
	FOREIGN KEY (`penerimaan_id`) REFERENCES `barang_masuk`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `histori_harga_beli` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`barang_id` integer NOT NULL,
	`supplier_id` integer,
	`barang_masuk_id` integer,
	`harga_beli` real NOT NULL,
	`tanggal_berlaku` text NOT NULL,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `histori_harga_jual` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`barang_id` integer NOT NULL,
	`harga_eceran` real NOT NULL,
	`harga_grosir` real NOT NULL,
	`tanggal_berlaku` text NOT NULL,
	`tanggal_berakhir` text,
	`diubah_oleh` integer,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`diubah_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `hutang_supplier` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_id` integer NOT NULL,
	`barang_masuk_id` integer NOT NULL,
	`tanggal_hutang` text NOT NULL,
	`tanggal_jatuh_tempo` text,
	`total_hutang` real NOT NULL,
	`sisa_hutang` real NOT NULL,
	`status` text DEFAULT 'belum' NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_masuk_id`) REFERENCES `barang_masuk`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `jurnal_kas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tanggal` text NOT NULL,
	`kas_bank_id` integer NOT NULL,
	`jenis` text NOT NULL,
	`kategori` text NOT NULL,
	`referensi_tipe` text,
	`referensi_id` integer,
	`keterangan` text,
	`jumlah` real NOT NULL,
	`dicatat_oleh` integer,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`kas_bank_id`) REFERENCES `kas_bank`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dicatat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `karyawan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kode_karyawan` text NOT NULL,
	`nama` text NOT NULL,
	`role` text NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`gaji_pokok` real DEFAULT 0 NOT NULL,
	`tipe_gaji` text DEFAULT 'bulanan' NOT NULL,
	`kontak` text,
	`foto_path` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `karyawan_kode_karyawan_unique` ON `karyawan` (`kode_karyawan`);--> statement-breakpoint
CREATE UNIQUE INDEX `karyawan_username_unique` ON `karyawan` (`username`);--> statement-breakpoint
CREATE TABLE `kas_bank` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`tipe` text NOT NULL,
	`saldo_awal` real DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `kasbon` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer NOT NULL,
	`tanggal_pinjam` text NOT NULL,
	`jumlah` real NOT NULL,
	`cicilan_per_bulan` real DEFAULT 0 NOT NULL,
	`sisa_kasbon` real NOT NULL,
	`status` text DEFAULT 'aktif' NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `kategori` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kategori_nama_unique` ON `kategori` (`nama`);--> statement-breakpoint
CREATE TABLE `log_aktivitas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer,
	`aksi` text NOT NULL,
	`modul` text NOT NULL,
	`referensi_id` integer,
	`detail_json` text,
	`waktu` text DEFAULT (datetime('now','localtime')),
	`ip_address` text,
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mutasi_stok` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`barang_id` integer NOT NULL,
	`tanggal` text NOT NULL,
	`jenis` text NOT NULL,
	`referensi_tipe` text,
	`referensi_id` integer,
	`jumlah_sebelum` real NOT NULL,
	`jumlah_perubahan` real NOT NULL,
	`jumlah_sesudah` real NOT NULL,
	`dicatat_oleh` integer,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dicatat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pelanggan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kode_pelanggan` text NOT NULL,
	`nama` text NOT NULL,
	`tipe` text DEFAULT 'eceran' NOT NULL,
	`kontak` text,
	`alamat` text,
	`limit_piutang` real DEFAULT 0 NOT NULL,
	`saldo_piutang` real DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pelanggan_kode_pelanggan_unique` ON `pelanggan` (`kode_pelanggan`);--> statement-breakpoint
CREATE TABLE `pembayaran_hutang` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hutang_id` integer NOT NULL,
	`tanggal_bayar` text NOT NULL,
	`jumlah_bayar` real NOT NULL,
	`kas_bank_id` integer NOT NULL,
	`dibayar_oleh` integer,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`hutang_id`) REFERENCES `hutang_supplier`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`kas_bank_id`) REFERENCES `kas_bank`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dibayar_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pembayaran_piutang` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`piutang_id` integer NOT NULL,
	`tanggal_bayar` text NOT NULL,
	`jumlah_bayar` real NOT NULL,
	`kas_bank_id` integer NOT NULL,
	`diterima_oleh` integer,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`piutang_id`) REFERENCES `piutang_pelanggan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`kas_bank_id`) REFERENCES `kas_bank`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`diterima_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `penggajian` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karyawan_id` integer NOT NULL,
	`periode_bulan` text NOT NULL,
	`hari_kerja` integer DEFAULT 0 NOT NULL,
	`hari_hadir` integer DEFAULT 0 NOT NULL,
	`gaji_pokok` real NOT NULL,
	`tunjangan` real DEFAULT 0 NOT NULL,
	`potongan_kasbon` real DEFAULT 0 NOT NULL,
	`potongan_lain` real DEFAULT 0 NOT NULL,
	`total_gaji` real NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `penjualan` (
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
	FOREIGN KEY (`kasir_id`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `penjualan_no_transaksi_unique` ON `penjualan` (`no_transaksi`);--> statement-breakpoint
CREATE TABLE `penjualan_detail` (
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
	FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `periode_laporan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`periode_mulai` text NOT NULL,
	`periode_selesai` text NOT NULL,
	`tipe_laporan` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`data_json` text,
	`dibuat_oleh` integer,
	`diapprove_oleh` integer,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`dibuat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`diapprove_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `piutang_pelanggan` (
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
	FOREIGN KEY (`penjualan_id`) REFERENCES `penjualan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `po_detail` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`po_id` integer NOT NULL,
	`barang_id` integer NOT NULL,
	`satuan_id` integer,
	`jumlah_pesan` real NOT NULL,
	`jumlah_diterima` real DEFAULT 0 NOT NULL,
	`harga_beli_estimasi` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`po_id`) REFERENCES `purchase_order`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_order` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`no_po` text NOT NULL,
	`supplier_id` integer NOT NULL,
	`tanggal_po` text NOT NULL,
	`tanggal_estimasi_datang` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`total_nilai` real DEFAULT 0 NOT NULL,
	`dibuat_oleh` integer,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dibuat_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_order_no_po_unique` ON `purchase_order` (`no_po`);--> statement-breakpoint
CREATE TABLE `satuan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`singkatan` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `satuan_nama_unique` ON `satuan` (`nama`);--> statement-breakpoint
CREATE TABLE `stok_opname` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`no_opname` text NOT NULL,
	`tanggal_mulai` text NOT NULL,
	`tanggal_selesai` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`diapprove_oleh` integer,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime')),
	FOREIGN KEY (`diapprove_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stok_opname_no_opname_unique` ON `stok_opname` (`no_opname`);--> statement-breakpoint
CREATE TABLE `stok_opname_detail` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`opname_id` integer NOT NULL,
	`barang_id` integer NOT NULL,
	`stok_sistem` real NOT NULL,
	`stok_fisik` real,
	`selisih` real,
	`alasan_selisih` text,
	`dihitung_oleh` integer,
	FOREIGN KEY (`opname_id`) REFERENCES `stok_opname`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dihitung_oleh`) REFERENCES `karyawan`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `supplier` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kode_supplier` text NOT NULL,
	`nama_supplier` text NOT NULL,
	`kontak` text,
	`alamat` text,
	`terms_bayar` integer DEFAULT 0 NOT NULL,
	`limit_hutang` real DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')),
	`updated_at` text DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `supplier_kode_supplier_unique` ON `supplier` (`kode_supplier`);--> statement-breakpoint
CREATE TABLE `wa_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kode` text NOT NULL,
	`teks` text NOT NULL,
	`aktif` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wa_templates_kode_unique` ON `wa_templates` (`kode`);