CREATE INDEX `idx_barang_active` ON `barang` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_bmd_kadaluarsa` ON `barang_masuk_detail` (`tgl_kadaluarsa`);--> statement-breakpoint
CREATE INDEX `idx_karyawan_active` ON `karyawan` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_kasbon_karyawan_status` ON `kasbon` (`karyawan_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_notif_log_ref` ON `notifikasi_log` (`referensi_tipe`,`referensi_id`,`waktu`);--> statement-breakpoint
CREATE INDEX `idx_penggajian_karyawan_bulan` ON `penggajian` (`karyawan_id`,`periode_bulan`);