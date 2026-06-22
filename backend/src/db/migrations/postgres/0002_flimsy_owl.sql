ALTER TABLE "retur_supplier" ADD COLUMN "cabang_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "retur_supplier_detail" ADD COLUMN "cabang_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_retur_sup_cabang" ON "retur_supplier" USING btree ("cabang_id");