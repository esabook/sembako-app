DROP INDEX `draft_keranjang_kasir_id_unique`;--> statement-breakpoint
ALTER TABLE `draft_keranjang` ADD `label` text;--> statement-breakpoint
ALTER TABLE `draft_keranjang` ADD `nomor_bill` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `draft_keranjang` ADD `subtotal` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `draft_keranjang` ADD `jumlah_item` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_draft_kasir` ON `draft_keranjang` (`kasir_id`);