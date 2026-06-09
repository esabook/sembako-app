ALTER TABLE `absensi` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `barang_masuk_detail` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `budget_operasional` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `harga_jadwal` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `histori_harga_beli` ADD `dicatat_oleh` integer REFERENCES karyawan(id);--> statement-breakpoint
ALTER TABLE `histori_harga_beli` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `histori_harga_jual` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `jadwal_kerja` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `kartu_anggota` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `notifikasi_config` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `notifikasi_log` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `pembayaran_hutang` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `pembayaran_piutang` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `penjualan_detail` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `po_detail` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `promo` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `promo_target` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `retur_penjualan_detail` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `retur_penjualan_tukar` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `retur_supplier_detail` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `shift_kasir` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `shift_kasir` ADD `created_by` integer;--> statement-breakpoint
ALTER TABLE `shift_kasir` ADD `updated_by` integer;--> statement-breakpoint
ALTER TABLE `stok_opname_detail` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `target_penjualan` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `tipe_shift` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `tipe_shift` ADD `created_by` integer;--> statement-breakpoint
ALTER TABLE `tipe_shift` ADD `updated_by` integer;--> statement-breakpoint
ALTER TABLE `tukar_shift` ADD `tenant_id` integer DEFAULT 1 NOT NULL;