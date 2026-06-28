CREATE INDEX "idx_absensi_karyawan_tanggal" ON "absensi" USING btree ("karyawan_id","tanggal");--> statement-breakpoint
CREATE INDEX "idx_log_modul_waktu" ON "log_aktivitas" USING btree ("modul","waktu");--> statement-breakpoint
CREATE INDEX "idx_log_karyawan_waktu" ON "log_aktivitas" USING btree ("karyawan_id","waktu");--> statement-breakpoint
CREATE INDEX "idx_mutasi_stok_tenant_tanggal" ON "mutasi_stok" USING btree ("tenant_id","tanggal");--> statement-breakpoint
CREATE INDEX "idx_penjualan_tenant_tanggal" ON "penjualan" USING btree ("tenant_id","tanggal");