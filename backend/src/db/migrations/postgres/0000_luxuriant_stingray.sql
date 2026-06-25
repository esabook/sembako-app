CREATE TABLE "absensi" (
	"id" serial PRIMARY KEY NOT NULL,
	"karyawan_id" integer NOT NULL,
	"tanggal" text NOT NULL,
	"jam_masuk" text,
	"jam_keluar" text,
	"shift" text,
	"status" text DEFAULT 'hadir' NOT NULL,
	"terlambat_menit" integer,
	"dicatat_oleh" integer,
	"tenant_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "acara_hajatan" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama_acara" text NOT NULL,
	"nama_penyelenggara" text NOT NULL,
	"pelanggan_id" integer,
	"tanggal_acara" text NOT NULL,
	"alamat" text,
	"estimasi_tamu" integer,
	"catatan" text,
	"status" text DEFAULT 'persiapan' NOT NULL,
	"total_order" integer DEFAULT 0 NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "agenda_supplier" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer,
	"nama_supplier" text NOT NULL,
	"tipe" text DEFAULT 'kunjungan' NOT NULL,
	"tanggal" text NOT NULL,
	"jam" text,
	"lokasi" text,
	"petugas_id" integer,
	"hasil" text,
	"catatan" text,
	"status" text DEFAULT 'dijadwalkan' NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "approval" (
	"id" serial PRIMARY KEY NOT NULL,
	"referensi_tipe" text NOT NULL,
	"referensi_id" integer NOT NULL,
	"status" text DEFAULT 'menunggu' NOT NULL,
	"diminta_oleh" integer NOT NULL,
	"diproses_oleh" integer,
	"catatan_pengaju" text,
	"catatan_proses" text,
	"dibuat_at" text NOT NULL,
	"diproses_at" text,
	"tenant_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aset_tetap" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"kategori" text DEFAULT 'Lainnya' NOT NULL,
	"nilai_beli" integer DEFAULT 0 NOT NULL,
	"nilai_sekarang" integer DEFAULT 0 NOT NULL,
	"tanggal_beli" text,
	"kondisi" text DEFAULT 'baik' NOT NULL,
	"lokasi" text,
	"catatan" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
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
CREATE TABLE "barang" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode_barang" text NOT NULL,
	"nama_barang" text NOT NULL,
	"tipe_produk" text DEFAULT 'physical_good' NOT NULL,
	"kategori_id" integer,
	"satuan_dasar_id" integer,
	"konversi_satuan" text,
	"harga_beli_terakhir" bigint DEFAULT 0 NOT NULL,
	"harga_beli_rata" bigint DEFAULT 0 NOT NULL,
	"harga_jual_eceran" bigint DEFAULT 0 NOT NULL,
	"harga_jual_grosir" bigint DEFAULT 0 NOT NULL,
	"stok_minimum" double precision DEFAULT 0 NOT NULL,
	"stok_sekarang" double precision DEFAULT 0 NOT NULL,
	"lokasi_rak" text,
	"foto_path" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "barang_kode_barang_unique" UNIQUE("kode_barang"),
	CONSTRAINT "chk_barang_harga_jual_eceran" CHECK (harga_jual_eceran >= 0),
	CONSTRAINT "chk_barang_harga_jual_grosir" CHECK (harga_jual_grosir >= 0),
	CONSTRAINT "chk_barang_stok" CHECK (stok_sekarang >= 0)
);
--> statement-breakpoint
CREATE TABLE "barang_masuk" (
	"id" serial PRIMARY KEY NOT NULL,
	"no_penerimaan" text NOT NULL,
	"po_id" integer,
	"supplier_id" integer NOT NULL,
	"tanggal_terima" text NOT NULL,
	"no_faktur_supplier" text,
	"foto_faktur_path" text,
	"total_nilai" bigint DEFAULT 0 NOT NULL,
	"diterima_oleh" integer,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "barang_masuk_no_penerimaan_unique" UNIQUE("no_penerimaan")
);
--> statement-breakpoint
CREATE TABLE "barang_masuk_detail" (
	"id" serial PRIMARY KEY NOT NULL,
	"penerimaan_id" integer NOT NULL,
	"barang_id" integer NOT NULL,
	"satuan_id" integer,
	"jumlah_terima" double precision NOT NULL,
	"harga_beli" bigint NOT NULL,
	"tgl_kadaluarsa" text,
	"tenant_id" integer DEFAULT 1 NOT NULL
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
CREATE TABLE "budget_operasional" (
	"id" serial PRIMARY KEY NOT NULL,
	"periode_bulan" text NOT NULL,
	"kategori" text NOT NULL,
	"nilai_budget" bigint DEFAULT 0 NOT NULL,
	"catatan" text,
	"dibuat_oleh" integer,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "cabang" (
	"id" serial PRIMARY KEY NOT NULL,
	"toko_id" integer NOT NULL,
	"kode_cabang" text NOT NULL,
	"nama" text NOT NULL,
	"alamat" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "checklist_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"kategori" text DEFAULT 'kebersihan' NOT NULL,
	"urutan" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "checklist_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"tanggal" text NOT NULL,
	"karyawan_id" integer,
	"selesai" boolean DEFAULT false NOT NULL,
	"catatan" text,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text
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
CREATE TABLE "draft_keranjang" (
	"id" serial PRIMARY KEY NOT NULL,
	"kasir_id" integer NOT NULL,
	"pelanggan_id" integer,
	"tipe" text DEFAULT 'eceran' NOT NULL,
	"label" text,
	"nomor_bill" integer DEFAULT 1 NOT NULL,
	"subtotal" bigint DEFAULT 0 NOT NULL,
	"jumlah_item" integer DEFAULT 0 NOT NULL,
	"meja_id" integer,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "draft_keranjang_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"draft_id" integer NOT NULL,
	"barang_id" integer NOT NULL,
	"tipe_harga" text DEFAULT 'eceran' NOT NULL,
	"satuan_id" integer,
	"jumlah" double precision NOT NULL,
	"harga_jual" bigint NOT NULL,
	"diskon_item" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluasi_karyawan" (
	"id" serial PRIMARY KEY NOT NULL,
	"karyawan_id" integer NOT NULL,
	"periode" text NOT NULL,
	"nilai" integer NOT NULL,
	"catatan" text,
	"dinilai_oleh" integer NOT NULL,
	"tanggal" text NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text
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
CREATE TABLE "harga_jadwal" (
	"id" serial PRIMARY KEY NOT NULL,
	"barang_id" integer NOT NULL,
	"harga_eceran_baru" bigint NOT NULL,
	"harga_grosir_baru" bigint NOT NULL,
	"berlaku_mulai" text NOT NULL,
	"berlaku_sampai" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"dibuat_oleh" integer,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "histori_harga_beli" (
	"id" serial PRIMARY KEY NOT NULL,
	"barang_id" integer NOT NULL,
	"supplier_id" integer,
	"barang_masuk_id" integer,
	"harga_beli" bigint NOT NULL,
	"tanggal_berlaku" text NOT NULL,
	"dicatat_oleh" integer,
	"tenant_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "histori_harga_jual" (
	"id" serial PRIMARY KEY NOT NULL,
	"barang_id" integer NOT NULL,
	"harga_eceran" bigint NOT NULL,
	"harga_grosir" bigint NOT NULL,
	"tanggal_berlaku" text NOT NULL,
	"tanggal_berakhir" text,
	"diubah_oleh" integer,
	"tenant_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hutang_supplier" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"barang_masuk_id" integer NOT NULL,
	"tanggal_hutang" text NOT NULL,
	"tanggal_jatuh_tempo" text,
	"total_hutang" bigint NOT NULL,
	"sisa_hutang" bigint NOT NULL,
	"status" text DEFAULT 'belum' NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "inspeksi_toko" (
	"id" serial PRIMARY KEY NOT NULL,
	"tanggal" text NOT NULL,
	"jenis" text DEFAULT 'rutin' NOT NULL,
	"petugas_id" integer,
	"area" text,
	"temuan" text,
	"tindakan" text,
	"nilai" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"catatan" text,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "jadwal_kerja" (
	"id" serial PRIMARY KEY NOT NULL,
	"karyawan_id" integer NOT NULL,
	"tipe_shift_id" integer NOT NULL,
	"tanggal" text NOT NULL,
	"catatan" text,
	"dibuat_oleh" integer,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text
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
CREATE TABLE "jurnal_kas" (
	"id" serial PRIMARY KEY NOT NULL,
	"tanggal" text NOT NULL,
	"kas_bank_id" integer NOT NULL,
	"jenis" text NOT NULL,
	"kategori" text NOT NULL,
	"referensi_tipe" text,
	"referensi_id" integer,
	"keterangan" text,
	"jumlah" bigint NOT NULL,
	"dicatat_oleh" integer,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"cabang_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "kartu_anggota" (
	"id" serial PRIMARY KEY NOT NULL,
	"no_kartu" text NOT NULL,
	"tier" text DEFAULT 'reguler' NOT NULL,
	"diskon_member" double precision DEFAULT 0 NOT NULL,
	"poin" integer DEFAULT 0 NOT NULL,
	"pelanggan_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "kartu_anggota_no_kartu_unique" UNIQUE("no_kartu")
);
--> statement-breakpoint
CREATE TABLE "karyawan" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode_karyawan" text NOT NULL,
	"nama" text NOT NULL,
	"role" text NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"gaji_pokok" bigint DEFAULT 0 NOT NULL,
	"tipe_gaji" text DEFAULT 'bulanan' NOT NULL,
	"kontak" text,
	"foto_path" text,
	"pin_absensi" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"toko_id" integer DEFAULT 1,
	"cabang_id" integer,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "karyawan_kode_karyawan_unique" UNIQUE("kode_karyawan"),
	CONSTRAINT "karyawan_username_unique" UNIQUE("username"),
	CONSTRAINT "karyawan_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "kas_bank" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"tipe" text NOT NULL,
	"saldo_awal" bigint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"cabang_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "kasbon" (
	"id" serial PRIMARY KEY NOT NULL,
	"karyawan_id" integer NOT NULL,
	"tanggal_pinjam" text NOT NULL,
	"jumlah" bigint NOT NULL,
	"cicilan_per_bulan" bigint DEFAULT 0 NOT NULL,
	"sisa_kasbon" bigint NOT NULL,
	"status" text DEFAULT 'pengajuan' NOT NULL,
	"disetujui_oleh" integer,
	"tanggal_cair" text,
	"catatan" text,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "chk_kasbon_jumlah_pos" CHECK ("kasbon"."jumlah" > 0),
	CONSTRAINT "chk_kasbon_sisa_pos" CHECK ("kasbon"."sisa_kasbon" >= 0),
	CONSTRAINT "chk_kasbon_cicilan_pos" CHECK ("kasbon"."cicilan_per_bulan" >= 0)
);
--> statement-breakpoint
CREATE TABLE "kategori" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"kode" text,
	"contoh" text,
	"is_preset" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	CONSTRAINT "kategori_nama_unique" UNIQUE("nama")
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
CREATE TABLE "komplain_pelanggan" (
	"id" serial PRIMARY KEY NOT NULL,
	"pelanggan_id" integer,
	"nama_pelanggan" text,
	"kategori" text DEFAULT 'lainnya' NOT NULL,
	"deskripsi" text NOT NULL,
	"tanggal" text NOT NULL,
	"status" text DEFAULT 'masuk' NOT NULL,
	"resolusi" text,
	"ditangani_oleh" integer,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" text,
	"updated_at" text
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
CREATE TABLE "kunjungan_sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"pelanggan_id" integer,
	"nama_warung" text NOT NULL,
	"alamat" text,
	"petugas_id" integer,
	"tanggal" text NOT NULL,
	"tujuan" text DEFAULT 'prospek' NOT NULL,
	"hasil" text,
	"catatan" text,
	"status_tindak_lanjut" text DEFAULT 'open' NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "lampiran" (
	"id" serial PRIMARY KEY NOT NULL,
	"referensi_tipe" text NOT NULL,
	"referensi_id" integer NOT NULL,
	"tipe" text DEFAULT 'gambar' NOT NULL,
	"path" text NOT NULL,
	"thumb_path" text,
	"nama_asli" text,
	"ukuran" integer,
	"uploaded_by" integer NOT NULL,
	"dibuat_at" text NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "log_aktivitas" (
	"id" serial PRIMARY KEY NOT NULL,
	"karyawan_id" integer,
	"aksi" text NOT NULL,
	"modul" text NOT NULL,
	"referensi_id" integer,
	"detail_json" text,
	"waktu" text,
	"ip_address" text
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
CREATE TABLE "mutasi_stok" (
	"id" serial PRIMARY KEY NOT NULL,
	"barang_id" integer NOT NULL,
	"tanggal" text NOT NULL,
	"jenis" text NOT NULL,
	"referensi_tipe" text,
	"referensi_id" integer,
	"jumlah_sebelum" double precision NOT NULL,
	"jumlah_perubahan" double precision NOT NULL,
	"jumlah_sesudah" double precision NOT NULL,
	"dicatat_oleh" integer,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"cabang_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifikasi_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"jenis" text NOT NULL,
	"aktif" boolean DEFAULT false NOT NULL,
	"channel" text DEFAULT 'dashboard' NOT NULL,
	"threshold" double precision,
	"jam_kirim" text,
	"hari_kirim" integer,
	"penerima_wa" text,
	"terakhir_dikirim" text,
	"updated_at" text,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "notifikasi_config_jenis_unique" UNIQUE("jenis")
);
--> statement-breakpoint
CREATE TABLE "notifikasi_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"jenis" text NOT NULL,
	"channel" text DEFAULT 'dashboard' NOT NULL,
	"pesan" text NOT NULL,
	"penerima" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"waktu" text NOT NULL,
	"referensi_tipe" text,
	"referensi_id" integer
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
CREATE TABLE "pelanggan" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode_pelanggan" text NOT NULL,
	"nama" text NOT NULL,
	"gender" text,
	"tipe" text DEFAULT 'eceran' NOT NULL,
	"kontak" text,
	"alamat" text,
	"limit_piutang" bigint DEFAULT 0 NOT NULL,
	"saldo_piutang" bigint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "pelanggan_kode_pelanggan_unique" UNIQUE("kode_pelanggan")
);
--> statement-breakpoint
CREATE TABLE "pembayaran_hutang" (
	"id" serial PRIMARY KEY NOT NULL,
	"hutang_id" integer NOT NULL,
	"tanggal_bayar" text NOT NULL,
	"jumlah_bayar" bigint NOT NULL,
	"kas_bank_id" integer NOT NULL,
	"dibayar_oleh" integer,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text
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
CREATE TABLE "pembayaran_piutang" (
	"id" serial PRIMARY KEY NOT NULL,
	"piutang_id" integer NOT NULL,
	"tanggal_bayar" text NOT NULL,
	"jumlah_bayar" bigint NOT NULL,
	"kas_bank_id" integer NOT NULL,
	"diterima_oleh" integer,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "pengajuan_izin" (
	"id" serial PRIMARY KEY NOT NULL,
	"karyawan_id" integer NOT NULL,
	"jenis" text NOT NULL,
	"tanggal_mulai" text NOT NULL,
	"tanggal_selesai" text NOT NULL,
	"alasan" text,
	"bukti_path" text,
	"status" text DEFAULT 'menunggu' NOT NULL,
	"diproses_oleh" integer,
	"catatan_proses" text,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "penggajian" (
	"id" serial PRIMARY KEY NOT NULL,
	"karyawan_id" integer NOT NULL,
	"periode_bulan" text NOT NULL,
	"hari_kerja" integer DEFAULT 0 NOT NULL,
	"hari_hadir" integer DEFAULT 0 NOT NULL,
	"gaji_pokok" bigint NOT NULL,
	"tunjangan" bigint DEFAULT 0 NOT NULL,
	"potongan_kasbon" bigint DEFAULT 0 NOT NULL,
	"potongan_lain" bigint DEFAULT 0 NOT NULL,
	"total_gaji" bigint NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "penjualan" (
	"id" serial PRIMARY KEY NOT NULL,
	"no_transaksi" text NOT NULL,
	"pelanggan_id" integer,
	"tanggal" text NOT NULL,
	"tipe" text DEFAULT 'eceran' NOT NULL,
	"kasir_id" integer,
	"subtotal" bigint DEFAULT 0 NOT NULL,
	"diskon_total" bigint DEFAULT 0 NOT NULL,
	"total" bigint DEFAULT 0 NOT NULL,
	"metode_bayar" text NOT NULL,
	"bayar" bigint DEFAULT 0 NOT NULL,
	"kembalian" bigint DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'lunas' NOT NULL,
	"tipe_layanan" text DEFAULT 'retail' NOT NULL,
	"meja_id" integer,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"cabang_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "penjualan_no_transaksi_unique" UNIQUE("no_transaksi"),
	CONSTRAINT "chk_penjualan_subtotal" CHECK ("penjualan"."subtotal" >= 0),
	CONSTRAINT "chk_penjualan_total" CHECK ("penjualan"."total" >= 0),
	CONSTRAINT "chk_penjualan_diskon" CHECK ("penjualan"."diskon_total" >= 0),
	CONSTRAINT "chk_penjualan_bayar" CHECK ("penjualan"."bayar" >= 0),
	CONSTRAINT "chk_penjualan_kembalian" CHECK ("penjualan"."kembalian" >= 0)
);
--> statement-breakpoint
CREATE TABLE "penjualan_detail" (
	"id" serial PRIMARY KEY NOT NULL,
	"penjualan_id" integer NOT NULL,
	"barang_id" integer NOT NULL,
	"satuan_id" integer,
	"jumlah" double precision NOT NULL,
	"harga_jual" bigint NOT NULL,
	"diskon_item" bigint DEFAULT 0 NOT NULL,
	"subtotal" bigint NOT NULL,
	"status_kds" text,
	"dilayani_oleh" integer,
	"booking_id" integer,
	"catatan" text,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"cabang_id" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "chk_detail_jumlah_pos" CHECK ("penjualan_detail"."jumlah" > 0),
	CONSTRAINT "chk_detail_harga_pos" CHECK ("penjualan_detail"."harga_jual" >= 0),
	CONSTRAINT "chk_detail_diskon_pos" CHECK ("penjualan_detail"."diskon_item" >= 0),
	CONSTRAINT "chk_detail_subtotal_pos" CHECK ("penjualan_detail"."subtotal" >= 0)
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
CREATE TABLE "periode_laporan" (
	"id" serial PRIMARY KEY NOT NULL,
	"periode_mulai" text NOT NULL,
	"periode_selesai" text NOT NULL,
	"tipe_laporan" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"data_json" text,
	"dibuat_oleh" integer,
	"diapprove_oleh" integer,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "permintaan_pelanggan" (
	"id" serial PRIMARY KEY NOT NULL,
	"pelanggan_id" integer,
	"nama_pelanggan" text,
	"nama_barang" text NOT NULL,
	"barang_id" integer,
	"qty_minta" integer,
	"catatan" text,
	"status" text DEFAULT 'menunggu' NOT NULL,
	"tanggal" text NOT NULL,
	"ditangani_oleh" integer,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "pinjaman_investasi" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipe" text NOT NULL,
	"nama" text NOT NULL,
	"jumlah_pokok" integer NOT NULL,
	"bunga_persen" double precision DEFAULT 0 NOT NULL,
	"cicilan_per_bulan" integer DEFAULT 0 NOT NULL,
	"tanggal_mulai" text NOT NULL,
	"jatuh_tempo" text,
	"sisa_pokok" integer NOT NULL,
	"status" text DEFAULT 'aktif' NOT NULL,
	"catatan" text,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "pipeline_grosir" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama_pelanggan" text NOT NULL,
	"pelanggan_id" integer,
	"nilai_estimasi" integer DEFAULT 0 NOT NULL,
	"tahap" text DEFAULT 'prospek' NOT NULL,
	"petugas_id" integer,
	"produk_minat" text,
	"catatan" text,
	"tanggal_masuk" text NOT NULL,
	"tanggal_update" text,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "piutang_pelanggan" (
	"id" serial PRIMARY KEY NOT NULL,
	"pelanggan_id" integer NOT NULL,
	"penjualan_id" integer NOT NULL,
	"tanggal_piutang" text NOT NULL,
	"tanggal_jatuh_tempo" text,
	"total_piutang" bigint NOT NULL,
	"sisa_piutang" bigint NOT NULL,
	"status" text DEFAULT 'belum' NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "chk_piutang_total_pos" CHECK ("piutang_pelanggan"."total_piutang" > 0),
	CONSTRAINT "chk_piutang_sisa_pos" CHECK ("piutang_pelanggan"."sisa_piutang" >= 0),
	CONSTRAINT "chk_piutang_sisa_lte_total" CHECK ("piutang_pelanggan"."sisa_piutang" <= "piutang_pelanggan"."total_piutang")
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
CREATE TABLE "po_detail" (
	"id" serial PRIMARY KEY NOT NULL,
	"po_id" integer NOT NULL,
	"barang_id" integer NOT NULL,
	"satuan_id" integer,
	"jumlah_pesan" double precision NOT NULL,
	"jumlah_diterima" double precision DEFAULT 0 NOT NULL,
	"harga_beli_estimasi" bigint DEFAULT 0 NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preferensi_pengguna" (
	"id" serial PRIMARY KEY NOT NULL,
	"karyawan_id" integer NOT NULL,
	"modul" text NOT NULL,
	"nilai_json" text DEFAULT '{}' NOT NULL,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "promo" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"deskripsi" text,
	"tipe" text NOT NULL,
	"nilai" double precision NOT NULL,
	"tipe_nilai" text DEFAULT 'persen' NOT NULL,
	"min_qty" integer DEFAULT 1 NOT NULL,
	"min_total" bigint DEFAULT 0 NOT NULL,
	"berlaku_mulai" text,
	"berlaku_sampai" text,
	"max_penggunaan" integer,
	"jumlah_dipakai" integer DEFAULT 0 NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"dibuat_oleh" integer,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "promo_target" (
	"id" serial PRIMARY KEY NOT NULL,
	"promo_id" integer NOT NULL,
	"target_tipe" text NOT NULL,
	"target_id" integer NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_order" (
	"id" serial PRIMARY KEY NOT NULL,
	"no_po" text NOT NULL,
	"supplier_id" integer NOT NULL,
	"tanggal_po" text NOT NULL,
	"tanggal_estimasi_datang" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_nilai" bigint DEFAULT 0 NOT NULL,
	"dibuat_oleh" integer,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "purchase_order_no_po_unique" UNIQUE("no_po")
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
CREATE TABLE "retur_penjualan" (
	"id" serial PRIMARY KEY NOT NULL,
	"no_retur" text NOT NULL,
	"penjualan_id" integer NOT NULL,
	"tanggal" text NOT NULL,
	"kasir_id" integer,
	"total_retur" bigint DEFAULT 0 NOT NULL,
	"alasan" text,
	"metode_refund" text DEFAULT 'tunai' NOT NULL,
	"kas_bank_id" integer,
	"catatan" text,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"cabang_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "retur_penjualan_no_retur_unique" UNIQUE("no_retur")
);
--> statement-breakpoint
CREATE TABLE "retur_penjualan_detail" (
	"id" serial PRIMARY KEY NOT NULL,
	"retur_id" integer NOT NULL,
	"barang_id" integer NOT NULL,
	"satuan_id" integer,
	"jumlah_retur" double precision NOT NULL,
	"harga_jual" bigint NOT NULL,
	"subtotal" bigint NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"cabang_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retur_penjualan_tukar" (
	"id" serial PRIMARY KEY NOT NULL,
	"retur_id" integer NOT NULL,
	"barang_id" integer NOT NULL,
	"satuan_id" integer,
	"jumlah" double precision NOT NULL,
	"harga_jual" bigint NOT NULL,
	"subtotal" bigint NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"cabang_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retur_supplier" (
	"id" serial PRIMARY KEY NOT NULL,
	"no_retur" text NOT NULL,
	"barang_masuk_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"tanggal" text NOT NULL,
	"dicatat_oleh" integer,
	"total_retur" bigint DEFAULT 0 NOT NULL,
	"alasan" text,
	"metode_refund" text DEFAULT 'kurang_hutang' NOT NULL,
	"hutang_id" integer,
	"kas_bank_id" integer,
	"catatan" text,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"cabang_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "retur_supplier_no_retur_unique" UNIQUE("no_retur")
);
--> statement-breakpoint
CREATE TABLE "retur_supplier_detail" (
	"id" serial PRIMARY KEY NOT NULL,
	"retur_id" integer NOT NULL,
	"barang_id" integer NOT NULL,
	"jumlah_retur" double precision NOT NULL,
	"harga_beli" bigint NOT NULL,
	"subtotal" bigint NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"cabang_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sanksi_insentif" (
	"id" serial PRIMARY KEY NOT NULL,
	"karyawan_id" integer NOT NULL,
	"tipe" text NOT NULL,
	"jenis" text NOT NULL,
	"jumlah" bigint NOT NULL,
	"tanggal" text NOT NULL,
	"keterangan" text,
	"periode_bulan" text NOT NULL,
	"dicatat_oleh" integer,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "satuan" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"singkatan" text NOT NULL,
	"contoh" text,
	"is_preset" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	CONSTRAINT "satuan_nama_unique" UNIQUE("nama")
);
--> statement-breakpoint
CREATE TABLE "shift_kasir" (
	"id" serial PRIMARY KEY NOT NULL,
	"karyawan_id" integer NOT NULL,
	"tanggal" text NOT NULL,
	"jam_buka" text NOT NULL,
	"jam_tutup" text,
	"kas_awal" bigint DEFAULT 0 NOT NULL,
	"kas_fisik" bigint,
	"kas_sistem" bigint,
	"selisih_kas" bigint,
	"jumlah_transaksi" integer DEFAULT 0 NOT NULL,
	"total_penjualan" bigint DEFAULT 0 NOT NULL,
	"catatan" text,
	"status" text DEFAULT 'buka' NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"cabang_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "sop_instance" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_id" integer NOT NULL,
	"karyawan_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"payload_json" text,
	"hasil_json" text,
	"dibuat_at" text NOT NULL,
	"diselesaikan_at" text
);
--> statement-breakpoint
CREATE TABLE "sop_rule" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"event_name" text NOT NULL,
	"tipe" text DEFAULT 'checklist' NOT NULL,
	"deskripsi" text,
	"config_json" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"urutan" integer DEFAULT 0 NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "stok_opname" (
	"id" serial PRIMARY KEY NOT NULL,
	"no_opname" text NOT NULL,
	"tanggal_mulai" text NOT NULL,
	"tanggal_selesai" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"diapprove_oleh" integer,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"cabang_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "stok_opname_no_opname_unique" UNIQUE("no_opname")
);
--> statement-breakpoint
CREATE TABLE "stok_opname_detail" (
	"id" serial PRIMARY KEY NOT NULL,
	"opname_id" integer NOT NULL,
	"barang_id" integer NOT NULL,
	"stok_sistem" double precision NOT NULL,
	"stok_fisik" double precision,
	"selisih" double precision,
	"alasan_selisih" text,
	"dihitung_oleh" integer,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"cabang_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode_supplier" text NOT NULL,
	"nama_supplier" text NOT NULL,
	"kontak" text,
	"alamat" text,
	"terms_bayar" integer DEFAULT 0 NOT NULL,
	"limit_hutang" bigint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "supplier_kode_supplier_unique" UNIQUE("kode_supplier")
);
--> statement-breakpoint
CREATE TABLE "tagihan_utilitas" (
	"id" serial PRIMARY KEY NOT NULL,
	"jenis" text DEFAULT 'listrik' NOT NULL,
	"periode_bulan" text NOT NULL,
	"jumlah" integer DEFAULT 0 NOT NULL,
	"tanggal_bayar" text,
	"meter_awal" integer,
	"meter_akhir" integer,
	"catatan" text,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "tamu_birokrasi" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama_tamu" text NOT NULL,
	"instansi" text,
	"keperluan" text NOT NULL,
	"tanggal" text NOT NULL,
	"jam_masuk" text,
	"jam_keluar" text,
	"keterangan" text,
	"dicatat_oleh" integer,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "target_penjualan" (
	"id" serial PRIMARY KEY NOT NULL,
	"periode_bulan" text NOT NULL,
	"target_omzet" bigint DEFAULT 0 NOT NULL,
	"target_transaksi" integer DEFAULT 0 NOT NULL,
	"target_margin_pct" double precision DEFAULT 0 NOT NULL,
	"catatan" text,
	"dibuat_oleh" integer,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "target_penjualan_periode_bulan_unique" UNIQUE("periode_bulan")
);
--> statement-breakpoint
CREATE TABLE "tipe_shift" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"jam_mulai" text NOT NULL,
	"jam_selesai" text NOT NULL,
	"warna" text DEFAULT '#00e676' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "toko" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode_toko" text NOT NULL,
	"nama" text NOT NULL,
	"alamat" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"status_langganan" text DEFAULT 'trial' NOT NULL,
	"trial_berakhir" text,
	"aktif_sampai" text,
	"hapus_terjadwal" text,
	"email_pemilik" text,
	"wa_pemilik" text,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "toko_kode_toko_unique" UNIQUE("kode_toko")
);
--> statement-breakpoint
CREATE TABLE "toko_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"toko_id" integer DEFAULT 1 NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "tukar_shift" (
	"id" serial PRIMARY KEY NOT NULL,
	"pengaju_id" integer NOT NULL,
	"jadwal_id" integer NOT NULL,
	"penerima_id" integer NOT NULL,
	"jadwal_penerima_id" integer,
	"alasan" text,
	"status" text DEFAULT 'menunggu' NOT NULL,
	"diproses_oleh" integer,
	"catatan_proses" text,
	"tenant_id" integer DEFAULT 1 NOT NULL,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "wa_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode" text NOT NULL,
	"teks" text NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	CONSTRAINT "wa_templates_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_karyawan_id_karyawan_id_fk" FOREIGN KEY ("karyawan_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_dicatat_oleh_karyawan_id_fk" FOREIGN KEY ("dicatat_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acara_hajatan" ADD CONSTRAINT "acara_hajatan_pelanggan_id_pelanggan_id_fk" FOREIGN KEY ("pelanggan_id") REFERENCES "public"."pelanggan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_supplier" ADD CONSTRAINT "agenda_supplier_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_supplier" ADD CONSTRAINT "agenda_supplier_petugas_id_karyawan_id_fk" FOREIGN KEY ("petugas_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval" ADD CONSTRAINT "approval_diminta_oleh_karyawan_id_fk" FOREIGN KEY ("diminta_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval" ADD CONSTRAINT "approval_diproses_oleh_karyawan_id_fk" FOREIGN KEY ("diproses_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bahan_baku" ADD CONSTRAINT "bahan_baku_satuan_id_satuan_id_fk" FOREIGN KEY ("satuan_id") REFERENCES "public"."satuan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barang" ADD CONSTRAINT "barang_kategori_id_kategori_id_fk" FOREIGN KEY ("kategori_id") REFERENCES "public"."kategori"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barang" ADD CONSTRAINT "barang_satuan_dasar_id_satuan_id_fk" FOREIGN KEY ("satuan_dasar_id") REFERENCES "public"."satuan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barang_masuk" ADD CONSTRAINT "barang_masuk_po_id_purchase_order_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barang_masuk" ADD CONSTRAINT "barang_masuk_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barang_masuk" ADD CONSTRAINT "barang_masuk_diterima_oleh_karyawan_id_fk" FOREIGN KEY ("diterima_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barang_masuk_detail" ADD CONSTRAINT "barang_masuk_detail_penerimaan_id_barang_masuk_id_fk" FOREIGN KEY ("penerimaan_id") REFERENCES "public"."barang_masuk"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barang_masuk_detail" ADD CONSTRAINT "barang_masuk_detail_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barang_masuk_detail" ADD CONSTRAINT "barang_masuk_detail_satuan_id_satuan_id_fk" FOREIGN KEY ("satuan_id") REFERENCES "public"."satuan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barang_modifier_grup" ADD CONSTRAINT "barang_modifier_grup_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barang_modifier_grup" ADD CONSTRAINT "barang_modifier_grup_grup_modifier_id_grup_modifier_id_fk" FOREIGN KEY ("grup_modifier_id") REFERENCES "public"."grup_modifier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_pelanggan_id_pelanggan_id_fk" FOREIGN KEY ("pelanggan_id") REFERENCES "public"."pelanggan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_karyawan_id_karyawan_id_fk" FOREIGN KEY ("karyawan_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_penjualan_id_penjualan_id_fk" FOREIGN KEY ("penjualan_id") REFERENCES "public"."penjualan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_kredit_id_kredit_membership_id_fk" FOREIGN KEY ("kredit_id") REFERENCES "public"."kredit_membership"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_operasional" ADD CONSTRAINT "budget_operasional_dibuat_oleh_karyawan_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cabang" ADD CONSTRAINT "cabang_toko_id_toko_id_fk" FOREIGN KEY ("toko_id") REFERENCES "public"."toko"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_log" ADD CONSTRAINT "checklist_log_item_id_checklist_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."checklist_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_log" ADD CONSTRAINT "checklist_log_karyawan_id_karyawan_id_fk" FOREIGN KEY ("karyawan_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detail_layanan" ADD CONSTRAINT "detail_layanan_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_keranjang" ADD CONSTRAINT "draft_keranjang_kasir_id_karyawan_id_fk" FOREIGN KEY ("kasir_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_keranjang" ADD CONSTRAINT "draft_keranjang_pelanggan_id_pelanggan_id_fk" FOREIGN KEY ("pelanggan_id") REFERENCES "public"."pelanggan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_keranjang" ADD CONSTRAINT "draft_keranjang_meja_id_meja_id_fk" FOREIGN KEY ("meja_id") REFERENCES "public"."meja"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_keranjang_item" ADD CONSTRAINT "draft_keranjang_item_draft_id_draft_keranjang_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."draft_keranjang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_keranjang_item" ADD CONSTRAINT "draft_keranjang_item_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_keranjang_item" ADD CONSTRAINT "draft_keranjang_item_satuan_id_satuan_id_fk" FOREIGN KEY ("satuan_id") REFERENCES "public"."satuan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluasi_karyawan" ADD CONSTRAINT "evaluasi_karyawan_karyawan_id_karyawan_id_fk" FOREIGN KEY ("karyawan_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluasi_karyawan" ADD CONSTRAINT "evaluasi_karyawan_dinilai_oleh_karyawan_id_fk" FOREIGN KEY ("dinilai_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harga_jadwal" ADD CONSTRAINT "harga_jadwal_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harga_jadwal" ADD CONSTRAINT "harga_jadwal_dibuat_oleh_karyawan_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "histori_harga_beli" ADD CONSTRAINT "histori_harga_beli_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "histori_harga_beli" ADD CONSTRAINT "histori_harga_beli_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "histori_harga_beli" ADD CONSTRAINT "histori_harga_beli_dicatat_oleh_karyawan_id_fk" FOREIGN KEY ("dicatat_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "histori_harga_jual" ADD CONSTRAINT "histori_harga_jual_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "histori_harga_jual" ADD CONSTRAINT "histori_harga_jual_diubah_oleh_karyawan_id_fk" FOREIGN KEY ("diubah_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hutang_supplier" ADD CONSTRAINT "hutang_supplier_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hutang_supplier" ADD CONSTRAINT "hutang_supplier_barang_masuk_id_barang_masuk_id_fk" FOREIGN KEY ("barang_masuk_id") REFERENCES "public"."barang_masuk"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspeksi_toko" ADD CONSTRAINT "inspeksi_toko_petugas_id_karyawan_id_fk" FOREIGN KEY ("petugas_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jadwal_kerja" ADD CONSTRAINT "jadwal_kerja_karyawan_id_karyawan_id_fk" FOREIGN KEY ("karyawan_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jadwal_kerja" ADD CONSTRAINT "jadwal_kerja_tipe_shift_id_tipe_shift_id_fk" FOREIGN KEY ("tipe_shift_id") REFERENCES "public"."tipe_shift"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jadwal_kerja" ADD CONSTRAINT "jadwal_kerja_dibuat_oleh_karyawan_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jadwal_staf" ADD CONSTRAINT "jadwal_staf_karyawan_id_karyawan_id_fk" FOREIGN KEY ("karyawan_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurnal_kas" ADD CONSTRAINT "jurnal_kas_kas_bank_id_kas_bank_id_fk" FOREIGN KEY ("kas_bank_id") REFERENCES "public"."kas_bank"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurnal_kas" ADD CONSTRAINT "jurnal_kas_dicatat_oleh_karyawan_id_fk" FOREIGN KEY ("dicatat_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kartu_anggota" ADD CONSTRAINT "kartu_anggota_pelanggan_id_pelanggan_id_fk" FOREIGN KEY ("pelanggan_id") REFERENCES "public"."pelanggan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "karyawan" ADD CONSTRAINT "karyawan_toko_id_toko_id_fk" FOREIGN KEY ("toko_id") REFERENCES "public"."toko"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "karyawan" ADD CONSTRAINT "karyawan_cabang_id_cabang_id_fk" FOREIGN KEY ("cabang_id") REFERENCES "public"."cabang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kasbon" ADD CONSTRAINT "kasbon_karyawan_id_karyawan_id_fk" FOREIGN KEY ("karyawan_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kasbon" ADD CONSTRAINT "kasbon_disetujui_oleh_karyawan_id_fk" FOREIGN KEY ("disetujui_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "komisi_staf" ADD CONSTRAINT "komisi_staf_karyawan_id_karyawan_id_fk" FOREIGN KEY ("karyawan_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "komisi_staf" ADD CONSTRAINT "komisi_staf_penjualan_id_penjualan_id_fk" FOREIGN KEY ("penjualan_id") REFERENCES "public"."penjualan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "komisi_staf" ADD CONSTRAINT "komisi_staf_penjualan_detail_id_penjualan_detail_id_fk" FOREIGN KEY ("penjualan_detail_id") REFERENCES "public"."penjualan_detail"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "komisi_staf" ADD CONSTRAINT "komisi_staf_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "komplain_pelanggan" ADD CONSTRAINT "komplain_pelanggan_pelanggan_id_pelanggan_id_fk" FOREIGN KEY ("pelanggan_id") REFERENCES "public"."pelanggan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "komplain_pelanggan" ADD CONSTRAINT "komplain_pelanggan_ditangani_oleh_karyawan_id_fk" FOREIGN KEY ("ditangani_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kredit_membership" ADD CONSTRAINT "kredit_membership_pelanggan_id_pelanggan_id_fk" FOREIGN KEY ("pelanggan_id") REFERENCES "public"."pelanggan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kredit_membership" ADD CONSTRAINT "kredit_membership_paket_id_paket_membership_id_fk" FOREIGN KEY ("paket_id") REFERENCES "public"."paket_membership"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kredit_membership" ADD CONSTRAINT "kredit_membership_penjualan_id_penjualan_id_fk" FOREIGN KEY ("penjualan_id") REFERENCES "public"."penjualan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kunjungan_sales" ADD CONSTRAINT "kunjungan_sales_pelanggan_id_pelanggan_id_fk" FOREIGN KEY ("pelanggan_id") REFERENCES "public"."pelanggan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kunjungan_sales" ADD CONSTRAINT "kunjungan_sales_petugas_id_karyawan_id_fk" FOREIGN KEY ("petugas_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lampiran" ADD CONSTRAINT "lampiran_uploaded_by_karyawan_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_aktivitas" ADD CONSTRAINT "log_aktivitas_karyawan_id_karyawan_id_fk" FOREIGN KEY ("karyawan_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier" ADD CONSTRAINT "modifier_grup_modifier_id_grup_modifier_id_fk" FOREIGN KEY ("grup_modifier_id") REFERENCES "public"."grup_modifier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutasi_stok" ADD CONSTRAINT "mutasi_stok_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutasi_stok" ADD CONSTRAINT "mutasi_stok_dicatat_oleh_karyawan_id_fk" FOREIGN KEY ("dicatat_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paket_membership" ADD CONSTRAINT "paket_membership_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembayaran_hutang" ADD CONSTRAINT "pembayaran_hutang_hutang_id_hutang_supplier_id_fk" FOREIGN KEY ("hutang_id") REFERENCES "public"."hutang_supplier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembayaran_hutang" ADD CONSTRAINT "pembayaran_hutang_kas_bank_id_kas_bank_id_fk" FOREIGN KEY ("kas_bank_id") REFERENCES "public"."kas_bank"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembayaran_hutang" ADD CONSTRAINT "pembayaran_hutang_dibayar_oleh_karyawan_id_fk" FOREIGN KEY ("dibayar_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembayaran_langganan" ADD CONSTRAINT "pembayaran_langganan_toko_id_toko_id_fk" FOREIGN KEY ("toko_id") REFERENCES "public"."toko"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembayaran_langganan" ADD CONSTRAINT "pembayaran_langganan_diverifikasi_oleh_platform_admin_id_fk" FOREIGN KEY ("diverifikasi_oleh") REFERENCES "public"."platform_admin"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembayaran_piutang" ADD CONSTRAINT "pembayaran_piutang_piutang_id_piutang_pelanggan_id_fk" FOREIGN KEY ("piutang_id") REFERENCES "public"."piutang_pelanggan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembayaran_piutang" ADD CONSTRAINT "pembayaran_piutang_kas_bank_id_kas_bank_id_fk" FOREIGN KEY ("kas_bank_id") REFERENCES "public"."kas_bank"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembayaran_piutang" ADD CONSTRAINT "pembayaran_piutang_diterima_oleh_karyawan_id_fk" FOREIGN KEY ("diterima_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengajuan_izin" ADD CONSTRAINT "pengajuan_izin_karyawan_id_karyawan_id_fk" FOREIGN KEY ("karyawan_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengajuan_izin" ADD CONSTRAINT "pengajuan_izin_diproses_oleh_karyawan_id_fk" FOREIGN KEY ("diproses_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penggajian" ADD CONSTRAINT "penggajian_karyawan_id_karyawan_id_fk" FOREIGN KEY ("karyawan_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penjualan" ADD CONSTRAINT "penjualan_pelanggan_id_pelanggan_id_fk" FOREIGN KEY ("pelanggan_id") REFERENCES "public"."pelanggan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penjualan" ADD CONSTRAINT "penjualan_kasir_id_karyawan_id_fk" FOREIGN KEY ("kasir_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penjualan" ADD CONSTRAINT "penjualan_meja_id_meja_id_fk" FOREIGN KEY ("meja_id") REFERENCES "public"."meja"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penjualan_detail" ADD CONSTRAINT "penjualan_detail_penjualan_id_penjualan_id_fk" FOREIGN KEY ("penjualan_id") REFERENCES "public"."penjualan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penjualan_detail" ADD CONSTRAINT "penjualan_detail_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penjualan_detail" ADD CONSTRAINT "penjualan_detail_satuan_id_satuan_id_fk" FOREIGN KEY ("satuan_id") REFERENCES "public"."satuan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penjualan_detail" ADD CONSTRAINT "penjualan_detail_dilayani_oleh_karyawan_id_fk" FOREIGN KEY ("dilayani_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penjualan_detail" ADD CONSTRAINT "penjualan_detail_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penjualan_detail_modifier" ADD CONSTRAINT "penjualan_detail_modifier_penjualan_detail_id_penjualan_detail_id_fk" FOREIGN KEY ("penjualan_detail_id") REFERENCES "public"."penjualan_detail"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penjualan_detail_modifier" ADD CONSTRAINT "penjualan_detail_modifier_modifier_id_modifier_id_fk" FOREIGN KEY ("modifier_id") REFERENCES "public"."modifier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "periode_laporan" ADD CONSTRAINT "periode_laporan_dibuat_oleh_karyawan_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "periode_laporan" ADD CONSTRAINT "periode_laporan_diapprove_oleh_karyawan_id_fk" FOREIGN KEY ("diapprove_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permintaan_pelanggan" ADD CONSTRAINT "permintaan_pelanggan_pelanggan_id_pelanggan_id_fk" FOREIGN KEY ("pelanggan_id") REFERENCES "public"."pelanggan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permintaan_pelanggan" ADD CONSTRAINT "permintaan_pelanggan_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permintaan_pelanggan" ADD CONSTRAINT "permintaan_pelanggan_ditangani_oleh_karyawan_id_fk" FOREIGN KEY ("ditangani_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_grosir" ADD CONSTRAINT "pipeline_grosir_pelanggan_id_pelanggan_id_fk" FOREIGN KEY ("pelanggan_id") REFERENCES "public"."pelanggan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_grosir" ADD CONSTRAINT "pipeline_grosir_petugas_id_karyawan_id_fk" FOREIGN KEY ("petugas_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piutang_pelanggan" ADD CONSTRAINT "piutang_pelanggan_pelanggan_id_pelanggan_id_fk" FOREIGN KEY ("pelanggan_id") REFERENCES "public"."pelanggan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piutang_pelanggan" ADD CONSTRAINT "piutang_pelanggan_penjualan_id_penjualan_id_fk" FOREIGN KEY ("penjualan_id") REFERENCES "public"."penjualan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_detail" ADD CONSTRAINT "po_detail_po_id_purchase_order_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_detail" ADD CONSTRAINT "po_detail_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_detail" ADD CONSTRAINT "po_detail_satuan_id_satuan_id_fk" FOREIGN KEY ("satuan_id") REFERENCES "public"."satuan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferensi_pengguna" ADD CONSTRAINT "preferensi_pengguna_karyawan_id_karyawan_id_fk" FOREIGN KEY ("karyawan_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo" ADD CONSTRAINT "promo_dibuat_oleh_karyawan_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_target" ADD CONSTRAINT "promo_target_promo_id_promo_id_fk" FOREIGN KEY ("promo_id") REFERENCES "public"."promo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_dibuat_oleh_karyawan_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resep" ADD CONSTRAINT "resep_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resep" ADD CONSTRAINT "resep_bahan_baku_id_bahan_baku_id_fk" FOREIGN KEY ("bahan_baku_id") REFERENCES "public"."bahan_baku"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resep" ADD CONSTRAINT "resep_satuan_id_satuan_id_fk" FOREIGN KEY ("satuan_id") REFERENCES "public"."satuan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retur_penjualan" ADD CONSTRAINT "retur_penjualan_penjualan_id_penjualan_id_fk" FOREIGN KEY ("penjualan_id") REFERENCES "public"."penjualan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retur_penjualan" ADD CONSTRAINT "retur_penjualan_kasir_id_karyawan_id_fk" FOREIGN KEY ("kasir_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retur_penjualan" ADD CONSTRAINT "retur_penjualan_kas_bank_id_kas_bank_id_fk" FOREIGN KEY ("kas_bank_id") REFERENCES "public"."kas_bank"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retur_penjualan_detail" ADD CONSTRAINT "retur_penjualan_detail_retur_id_retur_penjualan_id_fk" FOREIGN KEY ("retur_id") REFERENCES "public"."retur_penjualan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retur_penjualan_detail" ADD CONSTRAINT "retur_penjualan_detail_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retur_penjualan_detail" ADD CONSTRAINT "retur_penjualan_detail_satuan_id_satuan_id_fk" FOREIGN KEY ("satuan_id") REFERENCES "public"."satuan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retur_penjualan_tukar" ADD CONSTRAINT "retur_penjualan_tukar_retur_id_retur_penjualan_id_fk" FOREIGN KEY ("retur_id") REFERENCES "public"."retur_penjualan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retur_penjualan_tukar" ADD CONSTRAINT "retur_penjualan_tukar_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retur_penjualan_tukar" ADD CONSTRAINT "retur_penjualan_tukar_satuan_id_satuan_id_fk" FOREIGN KEY ("satuan_id") REFERENCES "public"."satuan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retur_supplier" ADD CONSTRAINT "retur_supplier_barang_masuk_id_barang_masuk_id_fk" FOREIGN KEY ("barang_masuk_id") REFERENCES "public"."barang_masuk"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retur_supplier" ADD CONSTRAINT "retur_supplier_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retur_supplier" ADD CONSTRAINT "retur_supplier_dicatat_oleh_karyawan_id_fk" FOREIGN KEY ("dicatat_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retur_supplier" ADD CONSTRAINT "retur_supplier_hutang_id_hutang_supplier_id_fk" FOREIGN KEY ("hutang_id") REFERENCES "public"."hutang_supplier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retur_supplier" ADD CONSTRAINT "retur_supplier_kas_bank_id_kas_bank_id_fk" FOREIGN KEY ("kas_bank_id") REFERENCES "public"."kas_bank"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retur_supplier_detail" ADD CONSTRAINT "retur_supplier_detail_retur_id_retur_supplier_id_fk" FOREIGN KEY ("retur_id") REFERENCES "public"."retur_supplier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retur_supplier_detail" ADD CONSTRAINT "retur_supplier_detail_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanksi_insentif" ADD CONSTRAINT "sanksi_insentif_karyawan_id_karyawan_id_fk" FOREIGN KEY ("karyawan_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanksi_insentif" ADD CONSTRAINT "sanksi_insentif_dicatat_oleh_karyawan_id_fk" FOREIGN KEY ("dicatat_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_kasir" ADD CONSTRAINT "shift_kasir_karyawan_id_karyawan_id_fk" FOREIGN KEY ("karyawan_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sop_instance" ADD CONSTRAINT "sop_instance_rule_id_sop_rule_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."sop_rule"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sop_instance" ADD CONSTRAINT "sop_instance_karyawan_id_karyawan_id_fk" FOREIGN KEY ("karyawan_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stok_opname" ADD CONSTRAINT "stok_opname_diapprove_oleh_karyawan_id_fk" FOREIGN KEY ("diapprove_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stok_opname_detail" ADD CONSTRAINT "stok_opname_detail_opname_id_stok_opname_id_fk" FOREIGN KEY ("opname_id") REFERENCES "public"."stok_opname"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stok_opname_detail" ADD CONSTRAINT "stok_opname_detail_barang_id_barang_id_fk" FOREIGN KEY ("barang_id") REFERENCES "public"."barang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stok_opname_detail" ADD CONSTRAINT "stok_opname_detail_dihitung_oleh_karyawan_id_fk" FOREIGN KEY ("dihitung_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tamu_birokrasi" ADD CONSTRAINT "tamu_birokrasi_dicatat_oleh_karyawan_id_fk" FOREIGN KEY ("dicatat_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_penjualan" ADD CONSTRAINT "target_penjualan_dibuat_oleh_karyawan_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "toko_settings" ADD CONSTRAINT "toko_settings_toko_id_toko_id_fk" FOREIGN KEY ("toko_id") REFERENCES "public"."toko"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tukar_shift" ADD CONSTRAINT "tukar_shift_pengaju_id_karyawan_id_fk" FOREIGN KEY ("pengaju_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tukar_shift" ADD CONSTRAINT "tukar_shift_jadwal_id_jadwal_kerja_id_fk" FOREIGN KEY ("jadwal_id") REFERENCES "public"."jadwal_kerja"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tukar_shift" ADD CONSTRAINT "tukar_shift_penerima_id_karyawan_id_fk" FOREIGN KEY ("penerima_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tukar_shift" ADD CONSTRAINT "tukar_shift_jadwal_penerima_id_jadwal_kerja_id_fk" FOREIGN KEY ("jadwal_penerima_id") REFERENCES "public"."jadwal_kerja"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tukar_shift" ADD CONSTRAINT "tukar_shift_diproses_oleh_karyawan_id_fk" FOREIGN KEY ("diproses_oleh") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_absensi_tanggal" ON "absensi" USING btree ("tanggal");--> statement-breakpoint
CREATE INDEX "idx_absensi_karyawan" ON "absensi" USING btree ("karyawan_id");--> statement-breakpoint
CREATE INDEX "idx_approval_ref" ON "approval" USING btree ("referensi_tipe","referensi_id");--> statement-breakpoint
CREATE INDEX "idx_approval_status" ON "approval" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_bahan_baku_active" ON "bahan_baku" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_barang_active" ON "barang" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_bmd_kadaluarsa" ON "barang_masuk_detail" USING btree ("tgl_kadaluarsa");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_barang_modifier" ON "barang_modifier_grup" USING btree ("barang_id","grup_modifier_id");--> statement-breakpoint
CREATE INDEX "idx_booking_waktu" ON "booking" USING btree ("waktu_mulai");--> statement-breakpoint
CREATE INDEX "idx_booking_status" ON "booking" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_booking_karyawan" ON "booking" USING btree ("karyawan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_cabang_toko_kode" ON "cabang" USING btree ("toko_id","kode_cabang");--> statement-breakpoint
CREATE INDEX "idx_cabang_toko" ON "cabang" USING btree ("toko_id");--> statement-breakpoint
CREATE INDEX "idx_checklist_log_tanggal" ON "checklist_log" USING btree ("tanggal");--> statement-breakpoint
CREATE INDEX "idx_checklist_log_item" ON "checklist_log" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_detail_layanan_barang" ON "detail_layanan" USING btree ("barang_id");--> statement-breakpoint
CREATE INDEX "idx_draft_kasir" ON "draft_keranjang" USING btree ("kasir_id");--> statement-breakpoint
CREATE INDEX "idx_eval_karyawan" ON "evaluasi_karyawan" USING btree ("karyawan_id");--> statement-breakpoint
CREATE INDEX "idx_hutang_status" ON "hutang_supplier" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_hutang_jatuh" ON "hutang_supplier" USING btree ("tanggal_jatuh_tempo");--> statement-breakpoint
CREATE INDEX "idx_jadwal_staf_karyawan" ON "jadwal_staf" USING btree ("karyawan_id");--> statement-breakpoint
CREATE INDEX "idx_jurnal_kas_tanggal" ON "jurnal_kas" USING btree ("tanggal");--> statement-breakpoint
CREATE INDEX "idx_jurnal_kas_akun" ON "jurnal_kas" USING btree ("kas_bank_id");--> statement-breakpoint
CREATE INDEX "idx_karyawan_active" ON "karyawan" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_karyawan_toko" ON "karyawan" USING btree ("toko_id");--> statement-breakpoint
CREATE INDEX "idx_kasbon_karyawan_status" ON "kasbon" USING btree ("karyawan_id","status");--> statement-breakpoint
CREATE INDEX "idx_komisi_karyawan" ON "komisi_staf" USING btree ("karyawan_id");--> statement-breakpoint
CREATE INDEX "idx_komisi_status" ON "komisi_staf" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_kredit_pelanggan" ON "kredit_membership" USING btree ("pelanggan_id");--> statement-breakpoint
CREATE INDEX "idx_kredit_status" ON "kredit_membership" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_lampiran_ref" ON "lampiran" USING btree ("referensi_tipe","referensi_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_meja_kode" ON "meja" USING btree ("tenant_id","cabang_id","kode_meja");--> statement-breakpoint
CREATE INDEX "idx_meja_status" ON "meja" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_modifier_grup" ON "modifier" USING btree ("grup_modifier_id");--> statement-breakpoint
CREATE INDEX "idx_mutasi_stok_barang" ON "mutasi_stok" USING btree ("barang_id");--> statement-breakpoint
CREATE INDEX "idx_mutasi_stok_tanggal" ON "mutasi_stok" USING btree ("tanggal");--> statement-breakpoint
CREATE INDEX "idx_mutasi_stok_cabang" ON "mutasi_stok" USING btree ("cabang_id");--> statement-breakpoint
CREATE INDEX "idx_notif_log_ref" ON "notifikasi_log" USING btree ("referensi_tipe","referensi_id","waktu");--> statement-breakpoint
CREATE INDEX "idx_pembayaran_toko" ON "pembayaran_langganan" USING btree ("toko_id");--> statement-breakpoint
CREATE INDEX "idx_pembayaran_status" ON "pembayaran_langganan" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_izin_karyawan" ON "pengajuan_izin" USING btree ("karyawan_id");--> statement-breakpoint
CREATE INDEX "idx_izin_status" ON "pengajuan_izin" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_penggajian_karyawan_bulan" ON "penggajian" USING btree ("karyawan_id","periode_bulan");--> statement-breakpoint
CREATE INDEX "idx_penjualan_tanggal" ON "penjualan" USING btree ("tanggal");--> statement-breakpoint
CREATE INDEX "idx_penjualan_status" ON "penjualan" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_penjualan_kasir" ON "penjualan" USING btree ("kasir_id");--> statement-breakpoint
CREATE INDEX "idx_penjualan_cabang" ON "penjualan" USING btree ("cabang_id");--> statement-breakpoint
CREATE INDEX "idx_penjualan_meja" ON "penjualan" USING btree ("meja_id");--> statement-breakpoint
CREATE INDEX "idx_penjualan_detail_trx" ON "penjualan_detail" USING btree ("penjualan_id");--> statement-breakpoint
CREATE INDEX "idx_pd_kds" ON "penjualan_detail" USING btree ("status_kds");--> statement-breakpoint
CREATE INDEX "idx_pdm_detail" ON "penjualan_detail_modifier" USING btree ("penjualan_detail_id");--> statement-breakpoint
CREATE INDEX "idx_pipeline_tahap" ON "pipeline_grosir" USING btree ("tahap");--> statement-breakpoint
CREATE INDEX "idx_piutang_status" ON "piutang_pelanggan" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_piutang_jatuh" ON "piutang_pelanggan" USING btree ("tanggal_jatuh_tempo");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_preferensi_pengguna" ON "preferensi_pengguna" USING btree ("karyawan_id","modul");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_resep_menu_bahan" ON "resep" USING btree ("barang_id","bahan_baku_id");--> statement-breakpoint
CREATE INDEX "idx_resep_barang" ON "resep" USING btree ("barang_id");--> statement-breakpoint
CREATE INDEX "idx_retur_sup_bm" ON "retur_supplier" USING btree ("barang_masuk_id");--> statement-breakpoint
CREATE INDEX "idx_retur_sup_supplier" ON "retur_supplier" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_retur_sup_cabang" ON "retur_supplier" USING btree ("cabang_id");--> statement-breakpoint
CREATE INDEX "idx_si_karyawan_bulan" ON "sanksi_insentif" USING btree ("karyawan_id","periode_bulan");--> statement-breakpoint
CREATE INDEX "idx_sop_instance_rule" ON "sop_instance" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "idx_sop_instance_karyawan" ON "sop_instance" USING btree ("karyawan_id");--> statement-breakpoint
CREATE INDEX "idx_sop_instance_status" ON "sop_instance" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sop_rule_event" ON "sop_rule" USING btree ("event_name");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_toko_settings_key" ON "toko_settings" USING btree ("toko_id","key");