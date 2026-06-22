ALTER TABLE `retur_supplier` ADD `cabang_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_retur_sup_cabang` ON `retur_supplier` (`cabang_id`);--> statement-breakpoint
ALTER TABLE `retur_supplier_detail` ADD `cabang_id` integer DEFAULT 1 NOT NULL;