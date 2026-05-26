CREATE TABLE `retur_penjualan_tukar` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `retur_id` integer NOT NULL REFERENCES `retur_penjualan`(`id`),
  `barang_id` integer NOT NULL REFERENCES `barang`(`id`),
  `satuan_id` integer REFERENCES `satuan`(`id`),
  `jumlah` real NOT NULL,
  `harga_jual` real NOT NULL,
  `subtotal` real NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_retur_tukar_retur` ON `retur_penjualan_tukar` (`retur_id`);
