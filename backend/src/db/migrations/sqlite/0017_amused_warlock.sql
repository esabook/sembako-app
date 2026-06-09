CREATE INDEX `idx_absensi_tanggal` ON `absensi` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_absensi_karyawan` ON `absensi` (`karyawan_id`);--> statement-breakpoint
CREATE INDEX `idx_hutang_status` ON `hutang_supplier` (`status`);--> statement-breakpoint
CREATE INDEX `idx_hutang_jatuh` ON `hutang_supplier` (`tanggal_jatuh_tempo`);--> statement-breakpoint
CREATE INDEX `idx_jurnal_kas_tanggal` ON `jurnal_kas` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_jurnal_kas_akun` ON `jurnal_kas` (`kas_bank_id`);--> statement-breakpoint
CREATE INDEX `idx_mutasi_stok_barang` ON `mutasi_stok` (`barang_id`);--> statement-breakpoint
CREATE INDEX `idx_mutasi_stok_tanggal` ON `mutasi_stok` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_penjualan_tanggal` ON `penjualan` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_penjualan_status` ON `penjualan` (`status`);--> statement-breakpoint
CREATE INDEX `idx_penjualan_kasir` ON `penjualan` (`kasir_id`);--> statement-breakpoint
CREATE INDEX `idx_penjualan_detail_trx` ON `penjualan_detail` (`penjualan_id`);--> statement-breakpoint
CREATE INDEX `idx_piutang_status` ON `piutang_pelanggan` (`status`);--> statement-breakpoint
CREATE INDEX `idx_piutang_jatuh` ON `piutang_pelanggan` (`tanggal_jatuh_tempo`);