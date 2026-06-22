CREATE TABLE "bahan_baku" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode_bahan" text NOT NULL,
	"nama" text NOT NULL,
	"satuan_id" integer,
	"stok_sekarang" double precision DEFAULT 0 NOT NULL,
	"stok_minimum" double precision DEFAULT 0 NOT NULL,
	"harga_beli_rata" bigint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "bahan_baku_kode_bahan_unique" UNIQUE("kode_bahan"),
	CONSTRAINT "chk_bahan_baku_stok" CHECK ("bahan_baku"."stok_sekarang" >= 0)
);
--> statement-breakpoint
CREATE TABLE "barang_modifier_grup" (
	"id" serial PRIMARY KEY NOT NULL,
	"barang_id" integer NOT NULL,
	"grup_modifier_id" integer NOT NULL,
	"urutan" integer DEFAULT 0 NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking" (
	"id" serial PRIMARY KEY NOT NULL,
	"no_booking" text NOT NULL,
	"pelanggan_id" integer,
	"karyawan_id" integer,
	"barang_id" integer NOT NULL,
	"waktu_mulai" text NOT NULL,
	"waktu_selesai" text,
	"status" text DEFAULT 'booked' NOT NULL,
	"penjualan_id" integer,
	"kredit_id" integer,
	"catatan" text,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"cabang_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "booking_no_booking_unique" UNIQUE("no_booking")
);
--> statement-breakpoint
CREATE TABLE "detail_layanan" (
	"id" serial PRIMARY KEY NOT NULL,
	"barang_id" integer NOT NULL,
	"durasi_menit" integer DEFAULT 30 NOT NULL,
	"buffer_menit" integer DEFAULT 0 NOT NULL,
	"dapat_dibooking" boolean DEFAULT true NOT NULL,
	"komisi_persen" double precision DEFAULT 0 NOT NULL,
	"komisi_nominal" bigint DEFAULT 0 NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grup_modifier" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"wajib" boolean DEFAULT false NOT NULL,
	"min_pilih" integer DEFAULT 0 NOT NULL,
	"max_pilih" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "jadwal_staf" (
	"id" serial PRIMARY KEY NOT NULL,
	"karyawan_id" integer NOT NULL,
	"hari" integer NOT NULL,
	"jam_mulai" text NOT NULL,
	"jam_selesai" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"cabang_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "komisi_staf" (
	"id" serial PRIMARY KEY NOT NULL,
	"karyawan_id" integer NOT NULL,
	"penjualan_id" integer,
	"penjualan_detail_id" integer,
	"barang_id" integer,
	"nilai_komisi" bigint DEFAULT 0 NOT NULL,
	"persen" double precision DEFAULT 0 NOT NULL,
	"tanggal" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "chk_komisi_nilai" CHECK ("komisi_staf"."nilai_komisi" >= 0)
);
--> statement-breakpoint
CREATE TABLE "kredit_membership" (
	"id" serial PRIMARY KEY NOT NULL,
	"pelanggan_id" integer NOT NULL,
	"paket_id" integer NOT NULL,
	"sisa_kuota" integer NOT NULL,
	"tanggal_mulai" text NOT NULL,
	"tanggal_expired" text,
	"penjualan_id" integer,
	"status" text DEFAULT 'aktif' NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "chk_kredit_kuota" CHECK ("kredit_membership"."sisa_kuota" >= 0)
);
--> statement-breakpoint
CREATE TABLE "meja" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode_meja" text NOT NULL,
	"nama" text,
	"kapasitas" integer DEFAULT 2 NOT NULL,
	"status" text DEFAULT 'kosong' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"cabang_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "modifier" (
	"id" serial PRIMARY KEY NOT NULL,
	"grup_modifier_id" integer NOT NULL,
	"nama" text NOT NULL,
	"harga_tambahan" bigint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "chk_modifier_harga" CHECK ("modifier"."harga_tambahan" >= 0)
);
--> statement-breakpoint
CREATE TABLE "paket_membership" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode_paket" text NOT NULL,
	"nama" text NOT NULL,
	"barang_id" integer,
	"jumlah_sesi" integer NOT NULL,
	"harga" bigint DEFAULT 0 NOT NULL,
	"masa_berlaku_hari" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "paket_membership_kode_paket_unique" UNIQUE("kode_paket"),
	CONSTRAINT "chk_paket_sesi" CHECK ("paket_membership"."jumlah_sesi" > 0),
	CONSTRAINT "chk_paket_harga" CHECK ("paket_membership"."harga" >= 0)
);
--> statement-breakpoint
CREATE TABLE "pembayaran_langganan" (
	"id" serial PRIMARY KEY NOT NULL,
	"toko_id" integer NOT NULL,
	"periode_bulan" integer DEFAULT 1 NOT NULL,
	"nominal" bigint DEFAULT 0 NOT NULL,
	"bukti_path" text,
	"status" text DEFAULT 'menunggu' NOT NULL,
	"catatan_admin" text,
	"diverifikasi_oleh" integer,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "penjualan_detail_modifier" (
	"id" serial PRIMARY KEY NOT NULL,
	"penjualan_detail_id" integer NOT NULL,
	"modifier_id" integer NOT NULL,
	"nama_snapshot" text NOT NULL,
	"harga_snapshot" bigint DEFAULT 0 NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_admin" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"nama" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "platform_admin_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "resep" (
	"id" serial PRIMARY KEY NOT NULL,
	"barang_id" integer NOT NULL,
	"bahan_baku_id" integer NOT NULL,
	"jumlah" double precision NOT NULL,
	"satuan_id" integer,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "chk_resep_jumlah" CHECK ("resep"."jumlah" > 0)
);
--> statement-breakpoint
ALTER TABLE "draft_keranjang" DROP CONSTRAINT "draft_keranjang_kasir_id_unique";--> statement-breakpoint
ALTER TABLE "barang" ADD COLUMN "tipe_produk" text DEFAULT 'physical_good' NOT NULL;--> statement-breakpoint
ALTER TABLE "draft_keranjang" ADD COLUMN "label" text;--> statement-breakpoint
ALTER TABLE "draft_keranjang" ADD COLUMN "nomor_bill" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "draft_keranjang" ADD COLUMN "subtotal" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "draft_keranjang" ADD COLUMN "jumlah_item" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "draft_keranjang" ADD COLUMN "meja_id" integer;--> statement-breakpoint
ALTER TABLE "penjualan" ADD COLUMN "tipe_layanan" text DEFAULT 'retail' NOT NULL;--> statement-breakpoint
ALTER TABLE "penjualan" ADD COLUMN "meja_id" integer;--> statement-breakpoint
ALTER TABLE "penjualan_detail" ADD COLUMN "status_kds" text;--> statement-breakpoint
ALTER TABLE "penjualan_detail" ADD COLUMN "dilayani_oleh" integer;--> statement-breakpoint
ALTER TABLE "penjualan_detail" ADD COLUMN "booking_id" integer;--> statement-breakpoint
ALTER TABLE "penjualan_detail" ADD COLUMN "catatan" text;--> statement-breakpoint
ALTER TABLE "toko" ADD COLUMN "status_langganan" text DEFAULT 'trial' NOT NULL;--> statement-breakpoint
ALTER TABLE "toko" ADD COLUMN "trial_berakhir" text;--> statement-breakpoint
ALTER TABLE "toko" ADD COLUMN "aktif_sampai" text;--> statement-breakpoint
ALTER TABLE "toko" ADD COLUMN "email_pemilik" text;--> statement-breakpoint
ALTER TABLE "toko" ADD COLUMN "wa_pemilik" text;--> statement-breakpoint
ALTER TABLE "bahan_baku" ADD CONSTRAINT "bahan_baku_satuan_id_satuan_id_fk" FOREIGN KEY ("satuan_id") REFERENCES "public"."satuan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barang_modifier_grup" ADD CONSTRAINT "barang_modifier_grup_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barang_modifier_grup" ADD CONSTRAINT "barang_modifier_grup_grup_modifier_id_grup_modifier_id_fk" FOREIGN KEY ("grup_modifier_id") REFERENCES "public"."grup_modifier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_pelanggan_id_pelanggan_id_fk" FOREIGN KEY ("pelanggan_id") REFERENCES "public"."pelanggan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_karyawan_id_karyawan_id_fk" FOREIGN KEY ("karyawan_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_penjualan_id_penjualan_id_fk" FOREIGN KEY ("penjualan_id") REFERENCES "public"."penjualan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_kredit_id_kredit_membership_id_fk" FOREIGN KEY ("kredit_id") REFERENCES "public"."kredit_membership"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detail_layanan" ADD CONSTRAINT "detail_layanan_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jadwal_staf" ADD CONSTRAINT "jadwal_staf_karyawan_id_karyawan_id_fk" FOREIGN KEY ("karyawan_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "komisi_staf" ADD CONSTRAINT "komisi_staf_karyawan_id_karyawan_id_fk" FOREIGN KEY ("karyawan_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "komisi_staf" ADD CONSTRAINT "komisi_staf_penjualan_id_penjualan_id_fk" FOREIGN KEY ("penjualan_id") REFERENCES "public"."penjualan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "komisi_staf" ADD CONSTRAINT "komisi_staf_penjualan_detail_id_penjualan_detail_id_fk" FOREIGN KEY ("penjualan_detail_id") REFERENCES "public"."penjualan_detail"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "komisi_staf" ADD CONSTRAINT "komisi_staf_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kredit_membership" ADD CONSTRAINT "kredit_membership_pelanggan_id_pelanggan_id_fk" FOREIGN KEY ("pelanggan_id") REFERENCES "public"."pelanggan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kredit_membership" ADD CONSTRAINT "kredit_membership_paket_id_paket_membership_id_fk" FOREIGN KEY ("paket_id") REFERENCES "public"."paket_membership"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kredit_membership" ADD CONSTRAINT "kredit_membership_penjualan_id_penjualan_id_fk" FOREIGN KEY ("penjualan_id") REFERENCES "public"."penjualan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier" ADD CONSTRAINT "modifier_grup_modifier_id_grup_modifier_id_fk" FOREIGN KEY ("grup_modifier_id") REFERENCES "public"."grup_modifier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paket_membership" ADD CONSTRAINT "paket_membership_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembayaran_langganan" ADD CONSTRAINT "pembayaran_langganan_toko_id_toko_id_fk" FOREIGN KEY ("toko_id") REFERENCES "public"."toko"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembayaran_langganan" ADD CONSTRAINT "pembayaran_langganan_diverifikasi_oleh_platform_admin_id_fk" FOREIGN KEY ("diverifikasi_oleh") REFERENCES "public"."platform_admin"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penjualan_detail_modifier" ADD CONSTRAINT "penjualan_detail_modifier_penjualan_detail_id_penjualan_detail_id_fk" FOREIGN KEY ("penjualan_detail_id") REFERENCES "public"."penjualan_detail"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penjualan_detail_modifier" ADD CONSTRAINT "penjualan_detail_modifier_modifier_id_modifier_id_fk" FOREIGN KEY ("modifier_id") REFERENCES "public"."modifier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resep" ADD CONSTRAINT "resep_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resep" ADD CONSTRAINT "resep_bahan_baku_id_bahan_baku_id_fk" FOREIGN KEY ("bahan_baku_id") REFERENCES "public"."bahan_baku"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resep" ADD CONSTRAINT "resep_satuan_id_satuan_id_fk" FOREIGN KEY ("satuan_id") REFERENCES "public"."satuan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bahan_baku_active" ON "bahan_baku" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_barang_modifier" ON "barang_modifier_grup" USING btree ("barang_id","grup_modifier_id");--> statement-breakpoint
CREATE INDEX "idx_booking_waktu" ON "booking" USING btree ("waktu_mulai");--> statement-breakpoint
CREATE INDEX "idx_booking_status" ON "booking" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_booking_karyawan" ON "booking" USING btree ("karyawan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_detail_layanan_barang" ON "detail_layanan" USING btree ("barang_id");--> statement-breakpoint
CREATE INDEX "idx_jadwal_staf_karyawan" ON "jadwal_staf" USING btree ("karyawan_id");--> statement-breakpoint
CREATE INDEX "idx_komisi_karyawan" ON "komisi_staf" USING btree ("karyawan_id");--> statement-breakpoint
CREATE INDEX "idx_komisi_status" ON "komisi_staf" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_kredit_pelanggan" ON "kredit_membership" USING btree ("pelanggan_id");--> statement-breakpoint
CREATE INDEX "idx_kredit_status" ON "kredit_membership" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_meja_kode" ON "meja" USING btree ("tenant_id","cabang_id","kode_meja");--> statement-breakpoint
CREATE INDEX "idx_meja_status" ON "meja" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_modifier_grup" ON "modifier" USING btree ("grup_modifier_id");--> statement-breakpoint
CREATE INDEX "idx_pembayaran_toko" ON "pembayaran_langganan" USING btree ("toko_id");--> statement-breakpoint
CREATE INDEX "idx_pembayaran_status" ON "pembayaran_langganan" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pdm_detail" ON "penjualan_detail_modifier" USING btree ("penjualan_detail_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_resep_menu_bahan" ON "resep" USING btree ("barang_id","bahan_baku_id");--> statement-breakpoint
CREATE INDEX "idx_resep_barang" ON "resep" USING btree ("barang_id");--> statement-breakpoint
ALTER TABLE "draft_keranjang" ADD CONSTRAINT "draft_keranjang_meja_id_meja_id_fk" FOREIGN KEY ("meja_id") REFERENCES "public"."meja"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penjualan" ADD CONSTRAINT "penjualan_meja_id_meja_id_fk" FOREIGN KEY ("meja_id") REFERENCES "public"."meja"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penjualan_detail" ADD CONSTRAINT "penjualan_detail_dilayani_oleh_karyawan_id_fk" FOREIGN KEY ("dilayani_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penjualan_detail" ADD CONSTRAINT "penjualan_detail_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_draft_kasir" ON "draft_keranjang" USING btree ("kasir_id");--> statement-breakpoint
CREATE INDEX "idx_penjualan_meja" ON "penjualan" USING btree ("meja_id");--> statement-breakpoint
CREATE INDEX "idx_pd_kds" ON "penjualan_detail" USING btree ("status_kds");