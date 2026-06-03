ALTER TABLE `barang` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `barang` ADD `created_by` integer;--> statement-breakpoint
ALTER TABLE `barang` ADD `updated_by` integer;--> statement-breakpoint
ALTER TABLE `barang_masuk` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `hutang_supplier` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `hutang_supplier` ADD `created_by` integer;--> statement-breakpoint
ALTER TABLE `hutang_supplier` ADD `updated_by` integer;--> statement-breakpoint
ALTER TABLE `jurnal_kas` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `kartu_anggota` ADD `created_by` integer;--> statement-breakpoint
ALTER TABLE `kartu_anggota` ADD `updated_by` integer;--> statement-breakpoint
ALTER TABLE `kas_bank` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `kas_bank` ADD `created_by` integer;--> statement-breakpoint
ALTER TABLE `kas_bank` ADD `updated_by` integer;--> statement-breakpoint
ALTER TABLE `kasbon` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `kategori` ADD `created_by` integer;--> statement-breakpoint
ALTER TABLE `kategori` ADD `updated_by` integer;--> statement-breakpoint
ALTER TABLE `mutasi_stok` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `pelanggan` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `pelanggan` ADD `created_by` integer;--> statement-breakpoint
ALTER TABLE `pelanggan` ADD `updated_by` integer;--> statement-breakpoint
ALTER TABLE `penggajian` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `penjualan` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `piutang_pelanggan` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `piutang_pelanggan` ADD `created_by` integer;--> statement-breakpoint
ALTER TABLE `piutang_pelanggan` ADD `updated_by` integer;--> statement-breakpoint
ALTER TABLE `purchase_order` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `retur_penjualan` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `satuan` ADD `created_by` integer;--> statement-breakpoint
ALTER TABLE `satuan` ADD `updated_by` integer;--> statement-breakpoint
ALTER TABLE `stok_opname` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `supplier` ADD `tenant_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `supplier` ADD `created_by` integer;--> statement-breakpoint
ALTER TABLE `supplier` ADD `updated_by` integer;