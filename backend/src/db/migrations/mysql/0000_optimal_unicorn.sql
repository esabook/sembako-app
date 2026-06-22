CREATE TABLE `absensi` (
	`id` int AUTO_INCREMENT NOT NULL,
	`karyawan_id` int NOT NULL,
	`tanggal` text NOT NULL,
	`jam_masuk` text,
	`jam_keluar` text,
	`shift` text,
	`status` text NOT NULL DEFAULT ('hadir'),
	`terlambat_menit` int,
	`dicatat_oleh` int,
	`tenant_id` int NOT NULL DEFAULT 1,
	CONSTRAINT `absensi_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `acara_hajatan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama_acara` text NOT NULL,
	`nama_penyelenggara` text NOT NULL,
	`pelanggan_id` int,
	`tanggal_acara` text NOT NULL,
	`alamat` text,
	`estimasi_tamu` int,
	`catatan` text,
	`status` text NOT NULL DEFAULT ('persiapan'),
	`total_order` int NOT NULL DEFAULT 0,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `acara_hajatan_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agenda_supplier` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplier_id` int,
	`nama_supplier` text NOT NULL,
	`tipe` text NOT NULL DEFAULT ('kunjungan'),
	`tanggal` text NOT NULL,
	`jam` text,
	`lokasi` text,
	`petugas_id` int,
	`hasil` text,
	`catatan` text,
	`status` text NOT NULL DEFAULT ('dijadwalkan'),
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `agenda_supplier_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `approval` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referensi_tipe` text NOT NULL,
	`referensi_id` int NOT NULL,
	`status` text NOT NULL DEFAULT ('menunggu'),
	`diminta_oleh` int NOT NULL,
	`diproses_oleh` int,
	`catatan_pengaju` text,
	`catatan_proses` text,
	`dibuat_at` text NOT NULL,
	`diproses_at` text,
	`tenant_id` int NOT NULL DEFAULT 1,
	CONSTRAINT `approval_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aset_tetap` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama` text NOT NULL,
	`kategori` text NOT NULL DEFAULT ('Lainnya'),
	`nilai_beli` int NOT NULL DEFAULT 0,
	`nilai_sekarang` int NOT NULL DEFAULT 0,
	`tanggal_beli` text,
	`kondisi` text NOT NULL DEFAULT ('baik'),
	`lokasi` text,
	`catatan` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `aset_tetap_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bahan_baku` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kode_bahan` text NOT NULL,
	`nama` text NOT NULL,
	`satuan_id` int,
	`stok_sekarang` double NOT NULL DEFAULT 0,
	`stok_minimum` double NOT NULL DEFAULT 0,
	`harga_beli_rata` bigint NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `bahan_baku_id` PRIMARY KEY(`id`),
	CONSTRAINT `bahan_baku_kode_bahan_unique` UNIQUE(`kode_bahan`),
	CONSTRAINT `chk_bahan_baku_stok` CHECK(`bahan_baku`.`stok_sekarang` >= 0)
);
--> statement-breakpoint
CREATE TABLE `barang` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kode_barang` text NOT NULL,
	`nama_barang` text NOT NULL,
	`tipe_produk` text NOT NULL DEFAULT ('physical_good'),
	`kategori_id` int,
	`satuan_dasar_id` int,
	`konversi_satuan` text,
	`harga_beli_terakhir` bigint NOT NULL DEFAULT 0,
	`harga_beli_rata` bigint NOT NULL DEFAULT 0,
	`harga_jual_eceran` bigint NOT NULL DEFAULT 0,
	`harga_jual_grosir` bigint NOT NULL DEFAULT 0,
	`stok_minimum` double NOT NULL DEFAULT 0,
	`stok_sekarang` double NOT NULL DEFAULT 0,
	`lokasi_rak` text,
	`foto_path` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `barang_id` PRIMARY KEY(`id`),
	CONSTRAINT `barang_kode_barang_unique` UNIQUE(`kode_barang`),
	CONSTRAINT `chk_barang_harga_jual_eceran` CHECK(harga_jual_eceran >= 0),
	CONSTRAINT `chk_barang_harga_jual_grosir` CHECK(harga_jual_grosir >= 0),
	CONSTRAINT `chk_barang_stok` CHECK(stok_sekarang >= 0)
);
--> statement-breakpoint
CREATE TABLE `barang_masuk` (
	`id` int AUTO_INCREMENT NOT NULL,
	`no_penerimaan` text NOT NULL,
	`po_id` int,
	`supplier_id` int NOT NULL,
	`tanggal_terima` text NOT NULL,
	`no_faktur_supplier` text,
	`foto_faktur_path` text,
	`total_nilai` bigint NOT NULL DEFAULT 0,
	`diterima_oleh` int,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `barang_masuk_id` PRIMARY KEY(`id`),
	CONSTRAINT `barang_masuk_no_penerimaan_unique` UNIQUE(`no_penerimaan`)
);
--> statement-breakpoint
CREATE TABLE `barang_masuk_detail` (
	`id` int AUTO_INCREMENT NOT NULL,
	`penerimaan_id` int NOT NULL,
	`barang_id` int NOT NULL,
	`satuan_id` int,
	`jumlah_terima` double NOT NULL,
	`harga_beli` bigint NOT NULL,
	`tgl_kadaluarsa` text,
	`tenant_id` int NOT NULL DEFAULT 1,
	CONSTRAINT `barang_masuk_detail_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `barang_modifier_grup` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barang_id` int NOT NULL,
	`grup_modifier_id` int NOT NULL,
	`urutan` int NOT NULL DEFAULT 0,
	`tenant_id` int NOT NULL DEFAULT 1,
	CONSTRAINT `barang_modifier_grup_id` PRIMARY KEY(`id`),
	CONSTRAINT `uidx_barang_modifier` UNIQUE(`barang_id`,`grup_modifier_id`)
);
--> statement-breakpoint
CREATE TABLE `booking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`no_booking` text NOT NULL,
	`pelanggan_id` int,
	`karyawan_id` int,
	`barang_id` int NOT NULL,
	`waktu_mulai` text NOT NULL,
	`waktu_selesai` text,
	`status` text NOT NULL DEFAULT ('booked'),
	`penjualan_id` int,
	`kredit_id` int,
	`catatan` text,
	`tenant_id` int NOT NULL DEFAULT 1,
	`cabang_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `booking_id` PRIMARY KEY(`id`),
	CONSTRAINT `booking_no_booking_unique` UNIQUE(`no_booking`)
);
--> statement-breakpoint
CREATE TABLE `budget_operasional` (
	`id` int AUTO_INCREMENT NOT NULL,
	`periode_bulan` text NOT NULL,
	`kategori` text NOT NULL,
	`nilai_budget` bigint NOT NULL DEFAULT 0,
	`catatan` text,
	`dibuat_oleh` int,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `budget_operasional_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cabang` (
	`id` int AUTO_INCREMENT NOT NULL,
	`toko_id` int NOT NULL,
	`kode_cabang` text NOT NULL,
	`nama` text NOT NULL,
	`alamat` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `cabang_id` PRIMARY KEY(`id`),
	CONSTRAINT `uidx_cabang_toko_kode` UNIQUE(`toko_id`,`kode_cabang`)
);
--> statement-breakpoint
CREATE TABLE `checklist_item` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama` text NOT NULL,
	`kategori` text NOT NULL DEFAULT ('kebersihan'),
	`urutan` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `checklist_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checklist_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_id` int NOT NULL,
	`tanggal` text NOT NULL,
	`karyawan_id` int,
	`selesai` boolean NOT NULL DEFAULT false,
	`catatan` text,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `checklist_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `detail_layanan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barang_id` int NOT NULL,
	`durasi_menit` int NOT NULL DEFAULT 30,
	`buffer_menit` int NOT NULL DEFAULT 0,
	`dapat_dibooking` boolean NOT NULL DEFAULT true,
	`komisi_persen` double NOT NULL DEFAULT 0,
	`komisi_nominal` bigint NOT NULL DEFAULT 0,
	`tenant_id` int NOT NULL DEFAULT 1,
	CONSTRAINT `detail_layanan_id` PRIMARY KEY(`id`),
	CONSTRAINT `uidx_detail_layanan_barang` UNIQUE(`barang_id`)
);
--> statement-breakpoint
CREATE TABLE `draft_keranjang` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kasir_id` int NOT NULL,
	`pelanggan_id` int,
	`tipe` text NOT NULL DEFAULT ('eceran'),
	`label` text,
	`nomor_bill` int NOT NULL DEFAULT 1,
	`subtotal` bigint NOT NULL DEFAULT 0,
	`jumlah_item` int NOT NULL DEFAULT 0,
	`meja_id` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `draft_keranjang_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `draft_keranjang_item` (
	`id` int AUTO_INCREMENT NOT NULL,
	`draft_id` int NOT NULL,
	`barang_id` int NOT NULL,
	`tipe_harga` text NOT NULL DEFAULT ('eceran'),
	`satuan_id` int,
	`jumlah` double NOT NULL,
	`harga_jual` bigint NOT NULL,
	`diskon_item` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `draft_keranjang_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluasi_karyawan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`karyawan_id` int NOT NULL,
	`periode` text NOT NULL,
	`nilai` int NOT NULL,
	`catatan` text,
	`dinilai_oleh` int NOT NULL,
	`tanggal` text NOT NULL,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `evaluasi_karyawan_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `grup_modifier` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama` text NOT NULL,
	`wajib` boolean NOT NULL DEFAULT false,
	`min_pilih` int NOT NULL DEFAULT 0,
	`max_pilih` int NOT NULL DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	CONSTRAINT `grup_modifier_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `harga_jadwal` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barang_id` int NOT NULL,
	`harga_eceran_baru` bigint NOT NULL,
	`harga_grosir_baru` bigint NOT NULL,
	`berlaku_mulai` text NOT NULL,
	`berlaku_sampai` text,
	`status` text NOT NULL DEFAULT ('draft'),
	`dibuat_oleh` int,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `harga_jadwal_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `histori_harga_beli` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barang_id` int NOT NULL,
	`supplier_id` int,
	`barang_masuk_id` int,
	`harga_beli` bigint NOT NULL,
	`tanggal_berlaku` text NOT NULL,
	`dicatat_oleh` int,
	`tenant_id` int NOT NULL DEFAULT 1,
	CONSTRAINT `histori_harga_beli_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `histori_harga_jual` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barang_id` int NOT NULL,
	`harga_eceran` bigint NOT NULL,
	`harga_grosir` bigint NOT NULL,
	`tanggal_berlaku` text NOT NULL,
	`tanggal_berakhir` text,
	`diubah_oleh` int,
	`tenant_id` int NOT NULL DEFAULT 1,
	CONSTRAINT `histori_harga_jual_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hutang_supplier` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplier_id` int NOT NULL,
	`barang_masuk_id` int NOT NULL,
	`tanggal_hutang` text NOT NULL,
	`tanggal_jatuh_tempo` text,
	`total_hutang` bigint NOT NULL,
	`sisa_hutang` bigint NOT NULL,
	`status` text NOT NULL DEFAULT ('belum'),
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `hutang_supplier_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inspeksi_toko` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tanggal` text NOT NULL,
	`jenis` text NOT NULL DEFAULT ('rutin'),
	`petugas_id` int,
	`area` text,
	`temuan` text,
	`tindakan` text,
	`nilai` int,
	`status` text NOT NULL DEFAULT ('draft'),
	`catatan` text,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `inspeksi_toko_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jadwal_kerja` (
	`id` int AUTO_INCREMENT NOT NULL,
	`karyawan_id` int NOT NULL,
	`tipe_shift_id` int NOT NULL,
	`tanggal` text NOT NULL,
	`catatan` text,
	`dibuat_oleh` int,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `jadwal_kerja_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jadwal_staf` (
	`id` int AUTO_INCREMENT NOT NULL,
	`karyawan_id` int NOT NULL,
	`hari` int NOT NULL,
	`jam_mulai` text NOT NULL,
	`jam_selesai` text NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`tenant_id` int NOT NULL DEFAULT 1,
	`cabang_id` int NOT NULL DEFAULT 1,
	CONSTRAINT `jadwal_staf_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jurnal_kas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tanggal` text NOT NULL,
	`kas_bank_id` int NOT NULL,
	`jenis` text NOT NULL,
	`kategori` text NOT NULL,
	`referensi_tipe` text,
	`referensi_id` int,
	`keterangan` text,
	`jumlah` bigint NOT NULL,
	`dicatat_oleh` int,
	`tenant_id` int NOT NULL DEFAULT 1,
	`cabang_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `jurnal_kas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kartu_anggota` (
	`id` int AUTO_INCREMENT NOT NULL,
	`no_kartu` text NOT NULL,
	`tier` text NOT NULL DEFAULT ('reguler'),
	`diskon_member` double NOT NULL DEFAULT 0,
	`poin` int NOT NULL DEFAULT 0,
	`pelanggan_id` int,
	`is_active` boolean NOT NULL DEFAULT true,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `kartu_anggota_id` PRIMARY KEY(`id`),
	CONSTRAINT `kartu_anggota_no_kartu_unique` UNIQUE(`no_kartu`)
);
--> statement-breakpoint
CREATE TABLE `karyawan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kode_karyawan` text NOT NULL,
	`nama` text NOT NULL,
	`role` text NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`gaji_pokok` bigint NOT NULL DEFAULT 0,
	`tipe_gaji` text NOT NULL DEFAULT ('bulanan'),
	`kontak` text,
	`foto_path` text,
	`pin_absensi` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`toko_id` int DEFAULT 1,
	`cabang_id` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `karyawan_id` PRIMARY KEY(`id`),
	CONSTRAINT `karyawan_kode_karyawan_unique` UNIQUE(`kode_karyawan`),
	CONSTRAINT `karyawan_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `kas_bank` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama` text NOT NULL,
	`tipe` text NOT NULL,
	`saldo_awal` bigint NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`tenant_id` int NOT NULL DEFAULT 1,
	`cabang_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	CONSTRAINT `kas_bank_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kasbon` (
	`id` int AUTO_INCREMENT NOT NULL,
	`karyawan_id` int NOT NULL,
	`tanggal_pinjam` text NOT NULL,
	`jumlah` bigint NOT NULL,
	`cicilan_per_bulan` bigint NOT NULL DEFAULT 0,
	`sisa_kasbon` bigint NOT NULL,
	`status` text NOT NULL DEFAULT ('pengajuan'),
	`disetujui_oleh` int,
	`tanggal_cair` text,
	`catatan` text,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `kasbon_id` PRIMARY KEY(`id`),
	CONSTRAINT `chk_kasbon_jumlah_pos` CHECK(`kasbon`.`jumlah` > 0),
	CONSTRAINT `chk_kasbon_sisa_pos` CHECK(`kasbon`.`sisa_kasbon` >= 0),
	CONSTRAINT `chk_kasbon_cicilan_pos` CHECK(`kasbon`.`cicilan_per_bulan` >= 0)
);
--> statement-breakpoint
CREATE TABLE `kategori` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama` text NOT NULL,
	`kode` text,
	`contoh` text,
	`is_preset` boolean NOT NULL DEFAULT false,
	`created_by` int,
	`updated_by` int,
	CONSTRAINT `kategori_id` PRIMARY KEY(`id`),
	CONSTRAINT `kategori_nama_unique` UNIQUE(`nama`)
);
--> statement-breakpoint
CREATE TABLE `komisi_staf` (
	`id` int AUTO_INCREMENT NOT NULL,
	`karyawan_id` int NOT NULL,
	`penjualan_id` int,
	`penjualan_detail_id` int,
	`barang_id` int,
	`nilai_komisi` bigint NOT NULL DEFAULT 0,
	`persen` double NOT NULL DEFAULT 0,
	`tanggal` text NOT NULL,
	`status` text NOT NULL DEFAULT ('pending'),
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `komisi_staf_id` PRIMARY KEY(`id`),
	CONSTRAINT `chk_komisi_nilai` CHECK(`komisi_staf`.`nilai_komisi` >= 0)
);
--> statement-breakpoint
CREATE TABLE `komplain_pelanggan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pelanggan_id` int,
	`nama_pelanggan` text,
	`kategori` text NOT NULL DEFAULT ('lainnya'),
	`deskripsi` text NOT NULL,
	`tanggal` text NOT NULL,
	`status` text NOT NULL DEFAULT ('masuk'),
	`resolusi` text,
	`ditangani_oleh` int,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `komplain_pelanggan_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kredit_membership` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pelanggan_id` int NOT NULL,
	`paket_id` int NOT NULL,
	`sisa_kuota` int NOT NULL,
	`tanggal_mulai` text NOT NULL,
	`tanggal_expired` text,
	`penjualan_id` int,
	`status` text NOT NULL DEFAULT ('aktif'),
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `kredit_membership_id` PRIMARY KEY(`id`),
	CONSTRAINT `chk_kredit_kuota` CHECK(`kredit_membership`.`sisa_kuota` >= 0)
);
--> statement-breakpoint
CREATE TABLE `kunjungan_sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pelanggan_id` int,
	`nama_warung` text NOT NULL,
	`alamat` text,
	`petugas_id` int,
	`tanggal` text NOT NULL,
	`tujuan` text NOT NULL DEFAULT ('prospek'),
	`hasil` text,
	`catatan` text,
	`status_tindak_lanjut` text NOT NULL DEFAULT ('open'),
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `kunjungan_sales_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lampiran` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referensi_tipe` text NOT NULL,
	`referensi_id` int NOT NULL,
	`tipe` text NOT NULL DEFAULT ('gambar'),
	`path` text NOT NULL,
	`thumb_path` text,
	`nama_asli` text,
	`ukuran` int,
	`uploaded_by` int NOT NULL,
	`dibuat_at` text NOT NULL,
	`tenant_id` int NOT NULL DEFAULT 1,
	CONSTRAINT `lampiran_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `log_aktivitas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`karyawan_id` int,
	`aksi` text NOT NULL,
	`modul` text NOT NULL,
	`referensi_id` int,
	`detail_json` text,
	`waktu` text,
	`ip_address` text,
	CONSTRAINT `log_aktivitas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meja` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kode_meja` text NOT NULL,
	`nama` text,
	`kapasitas` int NOT NULL DEFAULT 2,
	`status` text NOT NULL DEFAULT ('kosong'),
	`is_active` boolean NOT NULL DEFAULT true,
	`tenant_id` int NOT NULL DEFAULT 1,
	`cabang_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `meja_id` PRIMARY KEY(`id`),
	CONSTRAINT `uidx_meja_kode` UNIQUE(`tenant_id`,`cabang_id`,`kode_meja`)
);
--> statement-breakpoint
CREATE TABLE `modifier` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grup_modifier_id` int NOT NULL,
	`nama` text NOT NULL,
	`harga_tambahan` bigint NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`tenant_id` int NOT NULL DEFAULT 1,
	CONSTRAINT `modifier_id` PRIMARY KEY(`id`),
	CONSTRAINT `chk_modifier_harga` CHECK(`modifier`.`harga_tambahan` >= 0)
);
--> statement-breakpoint
CREATE TABLE `mutasi_stok` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barang_id` int NOT NULL,
	`tanggal` text NOT NULL,
	`jenis` text NOT NULL,
	`referensi_tipe` text,
	`referensi_id` int,
	`jumlah_sebelum` double NOT NULL,
	`jumlah_perubahan` double NOT NULL,
	`jumlah_sesudah` double NOT NULL,
	`dicatat_oleh` int,
	`tenant_id` int NOT NULL DEFAULT 1,
	`cabang_id` int NOT NULL DEFAULT 1,
	CONSTRAINT `mutasi_stok_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifikasi_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jenis` text NOT NULL,
	`aktif` boolean NOT NULL DEFAULT false,
	`channel` text NOT NULL DEFAULT ('dashboard'),
	`threshold` double,
	`jam_kirim` text,
	`hari_kirim` int,
	`penerima_wa` text,
	`terakhir_dikirim` text,
	`updated_at` text,
	`tenant_id` int NOT NULL DEFAULT 1,
	CONSTRAINT `notifikasi_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `notifikasi_config_jenis_unique` UNIQUE(`jenis`)
);
--> statement-breakpoint
CREATE TABLE `notifikasi_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jenis` text NOT NULL,
	`channel` text NOT NULL DEFAULT ('dashboard'),
	`pesan` text NOT NULL,
	`penerima` text,
	`status` text NOT NULL DEFAULT ('pending'),
	`tenant_id` int NOT NULL DEFAULT 1,
	`waktu` text NOT NULL,
	`referensi_tipe` text,
	`referensi_id` int,
	CONSTRAINT `notifikasi_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paket_membership` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kode_paket` text NOT NULL,
	`nama` text NOT NULL,
	`barang_id` int,
	`jumlah_sesi` int NOT NULL,
	`harga` bigint NOT NULL DEFAULT 0,
	`masa_berlaku_hari` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `paket_membership_id` PRIMARY KEY(`id`),
	CONSTRAINT `paket_membership_kode_paket_unique` UNIQUE(`kode_paket`),
	CONSTRAINT `chk_paket_sesi` CHECK(`paket_membership`.`jumlah_sesi` > 0),
	CONSTRAINT `chk_paket_harga` CHECK(`paket_membership`.`harga` >= 0)
);
--> statement-breakpoint
CREATE TABLE `pelanggan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kode_pelanggan` text NOT NULL,
	`nama` text NOT NULL,
	`gender` text,
	`tipe` text NOT NULL DEFAULT ('eceran'),
	`kontak` text,
	`alamat` text,
	`limit_piutang` bigint NOT NULL DEFAULT 0,
	`saldo_piutang` bigint NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `pelanggan_id` PRIMARY KEY(`id`),
	CONSTRAINT `pelanggan_kode_pelanggan_unique` UNIQUE(`kode_pelanggan`)
);
--> statement-breakpoint
CREATE TABLE `pembayaran_hutang` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hutang_id` int NOT NULL,
	`tanggal_bayar` text NOT NULL,
	`jumlah_bayar` bigint NOT NULL,
	`kas_bank_id` int NOT NULL,
	`dibayar_oleh` int,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `pembayaran_hutang_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pembayaran_langganan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`toko_id` int NOT NULL,
	`periode_bulan` int NOT NULL DEFAULT 1,
	`nominal` bigint NOT NULL DEFAULT 0,
	`bukti_path` text,
	`status` text NOT NULL DEFAULT ('menunggu'),
	`catatan_admin` text,
	`diverifikasi_oleh` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `pembayaran_langganan_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pembayaran_piutang` (
	`id` int AUTO_INCREMENT NOT NULL,
	`piutang_id` int NOT NULL,
	`tanggal_bayar` text NOT NULL,
	`jumlah_bayar` bigint NOT NULL,
	`kas_bank_id` int NOT NULL,
	`diterima_oleh` int,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `pembayaran_piutang_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pengajuan_izin` (
	`id` int AUTO_INCREMENT NOT NULL,
	`karyawan_id` int NOT NULL,
	`jenis` text NOT NULL,
	`tanggal_mulai` text NOT NULL,
	`tanggal_selesai` text NOT NULL,
	`alasan` text,
	`bukti_path` text,
	`status` text NOT NULL DEFAULT ('menunggu'),
	`diproses_oleh` int,
	`catatan_proses` text,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `pengajuan_izin_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `penggajian` (
	`id` int AUTO_INCREMENT NOT NULL,
	`karyawan_id` int NOT NULL,
	`periode_bulan` text NOT NULL,
	`hari_kerja` int NOT NULL DEFAULT 0,
	`hari_hadir` int NOT NULL DEFAULT 0,
	`gaji_pokok` bigint NOT NULL,
	`tunjangan` bigint NOT NULL DEFAULT 0,
	`potongan_kasbon` bigint NOT NULL DEFAULT 0,
	`potongan_lain` bigint NOT NULL DEFAULT 0,
	`total_gaji` bigint NOT NULL,
	`status` text NOT NULL DEFAULT ('draft'),
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `penggajian_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `penjualan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`no_transaksi` text NOT NULL,
	`pelanggan_id` int,
	`tanggal` text NOT NULL,
	`tipe` text NOT NULL DEFAULT ('eceran'),
	`kasir_id` int,
	`subtotal` bigint NOT NULL DEFAULT 0,
	`diskon_total` bigint NOT NULL DEFAULT 0,
	`total` bigint NOT NULL DEFAULT 0,
	`metode_bayar` text NOT NULL,
	`bayar` bigint NOT NULL DEFAULT 0,
	`kembalian` bigint NOT NULL DEFAULT 0,
	`status` text NOT NULL DEFAULT ('lunas'),
	`tipe_layanan` text NOT NULL DEFAULT ('retail'),
	`meja_id` int,
	`tenant_id` int NOT NULL DEFAULT 1,
	`cabang_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `penjualan_id` PRIMARY KEY(`id`),
	CONSTRAINT `penjualan_no_transaksi_unique` UNIQUE(`no_transaksi`),
	CONSTRAINT `chk_penjualan_subtotal` CHECK(`penjualan`.`subtotal` >= 0),
	CONSTRAINT `chk_penjualan_total` CHECK(`penjualan`.`total` >= 0),
	CONSTRAINT `chk_penjualan_diskon` CHECK(`penjualan`.`diskon_total` >= 0),
	CONSTRAINT `chk_penjualan_bayar` CHECK(`penjualan`.`bayar` >= 0),
	CONSTRAINT `chk_penjualan_kembalian` CHECK(`penjualan`.`kembalian` >= 0)
);
--> statement-breakpoint
CREATE TABLE `penjualan_detail` (
	`id` int AUTO_INCREMENT NOT NULL,
	`penjualan_id` int NOT NULL,
	`barang_id` int NOT NULL,
	`satuan_id` int,
	`jumlah` double NOT NULL,
	`harga_jual` bigint NOT NULL,
	`diskon_item` bigint NOT NULL DEFAULT 0,
	`subtotal` bigint NOT NULL,
	`status_kds` text,
	`dilayani_oleh` int,
	`booking_id` int,
	`catatan` text,
	`tenant_id` int NOT NULL DEFAULT 1,
	`cabang_id` int NOT NULL DEFAULT 1,
	CONSTRAINT `penjualan_detail_id` PRIMARY KEY(`id`),
	CONSTRAINT `chk_detail_jumlah_pos` CHECK(`penjualan_detail`.`jumlah` > 0),
	CONSTRAINT `chk_detail_harga_pos` CHECK(`penjualan_detail`.`harga_jual` >= 0),
	CONSTRAINT `chk_detail_diskon_pos` CHECK(`penjualan_detail`.`diskon_item` >= 0),
	CONSTRAINT `chk_detail_subtotal_pos` CHECK(`penjualan_detail`.`subtotal` >= 0)
);
--> statement-breakpoint
CREATE TABLE `penjualan_detail_modifier` (
	`id` int AUTO_INCREMENT NOT NULL,
	`penjualan_detail_id` int NOT NULL,
	`modifier_id` int NOT NULL,
	`nama_snapshot` text NOT NULL,
	`harga_snapshot` bigint NOT NULL DEFAULT 0,
	`tenant_id` int NOT NULL DEFAULT 1,
	CONSTRAINT `penjualan_detail_modifier_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `periode_laporan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`periode_mulai` text NOT NULL,
	`periode_selesai` text NOT NULL,
	`tipe_laporan` text NOT NULL,
	`status` text NOT NULL DEFAULT ('draft'),
	`data_json` text,
	`dibuat_oleh` int,
	`diapprove_oleh` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `periode_laporan_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `permintaan_pelanggan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pelanggan_id` int,
	`nama_pelanggan` text,
	`nama_barang` text NOT NULL,
	`barang_id` int,
	`qty_minta` int,
	`catatan` text,
	`status` text NOT NULL DEFAULT ('menunggu'),
	`tanggal` text NOT NULL,
	`ditangani_oleh` int,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `permintaan_pelanggan_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pinjaman_investasi` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tipe` text NOT NULL,
	`nama` text NOT NULL,
	`jumlah_pokok` int NOT NULL,
	`bunga_persen` double NOT NULL DEFAULT 0,
	`cicilan_per_bulan` int NOT NULL DEFAULT 0,
	`tanggal_mulai` text NOT NULL,
	`jatuh_tempo` text,
	`sisa_pokok` int NOT NULL,
	`status` text NOT NULL DEFAULT ('aktif'),
	`catatan` text,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `pinjaman_investasi_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pipeline_grosir` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama_pelanggan` text NOT NULL,
	`pelanggan_id` int,
	`nilai_estimasi` int NOT NULL DEFAULT 0,
	`tahap` text NOT NULL DEFAULT ('prospek'),
	`petugas_id` int,
	`produk_minat` text,
	`catatan` text,
	`tanggal_masuk` text NOT NULL,
	`tanggal_update` text,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `pipeline_grosir_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `piutang_pelanggan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pelanggan_id` int NOT NULL,
	`penjualan_id` int NOT NULL,
	`tanggal_piutang` text NOT NULL,
	`tanggal_jatuh_tempo` text,
	`total_piutang` bigint NOT NULL,
	`sisa_piutang` bigint NOT NULL,
	`status` text NOT NULL DEFAULT ('belum'),
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `piutang_pelanggan_id` PRIMARY KEY(`id`),
	CONSTRAINT `chk_piutang_total_pos` CHECK(`piutang_pelanggan`.`total_piutang` > 0),
	CONSTRAINT `chk_piutang_sisa_pos` CHECK(`piutang_pelanggan`.`sisa_piutang` >= 0),
	CONSTRAINT `chk_piutang_sisa_lte_total` CHECK(`piutang_pelanggan`.`sisa_piutang` <= `piutang_pelanggan`.`total_piutang`)
);
--> statement-breakpoint
CREATE TABLE `platform_admin` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`nama` text NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `platform_admin_id` PRIMARY KEY(`id`),
	CONSTRAINT `platform_admin_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `po_detail` (
	`id` int AUTO_INCREMENT NOT NULL,
	`po_id` int NOT NULL,
	`barang_id` int NOT NULL,
	`satuan_id` int,
	`jumlah_pesan` double NOT NULL,
	`jumlah_diterima` double NOT NULL DEFAULT 0,
	`harga_beli_estimasi` bigint NOT NULL DEFAULT 0,
	`tenant_id` int NOT NULL DEFAULT 1,
	CONSTRAINT `po_detail_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `preferensi_pengguna` (
	`id` int AUTO_INCREMENT NOT NULL,
	`karyawan_id` int NOT NULL,
	`modul` text NOT NULL,
	`nilai_json` text NOT NULL DEFAULT ('{}'),
	`updated_at` text,
	CONSTRAINT `preferensi_pengguna_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_preferensi_pengguna` UNIQUE(`karyawan_id`,`modul`)
);
--> statement-breakpoint
CREATE TABLE `promo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama` text NOT NULL,
	`deskripsi` text,
	`tipe` text NOT NULL,
	`nilai` double NOT NULL,
	`tipe_nilai` text NOT NULL DEFAULT ('persen'),
	`min_qty` int NOT NULL DEFAULT 1,
	`min_total` bigint NOT NULL DEFAULT 0,
	`berlaku_mulai` text,
	`berlaku_sampai` text,
	`max_penggunaan` int,
	`jumlah_dipakai` int NOT NULL DEFAULT 0,
	`aktif` boolean NOT NULL DEFAULT true,
	`dibuat_oleh` int,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `promo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promo_target` (
	`id` int AUTO_INCREMENT NOT NULL,
	`promo_id` int NOT NULL,
	`target_tipe` text NOT NULL,
	`target_id` int NOT NULL,
	`tenant_id` int NOT NULL DEFAULT 1,
	CONSTRAINT `promo_target_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_order` (
	`id` int AUTO_INCREMENT NOT NULL,
	`no_po` text NOT NULL,
	`supplier_id` int NOT NULL,
	`tanggal_po` text NOT NULL,
	`tanggal_estimasi_datang` text,
	`status` text NOT NULL DEFAULT ('draft'),
	`total_nilai` bigint NOT NULL DEFAULT 0,
	`dibuat_oleh` int,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `purchase_order_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_order_no_po_unique` UNIQUE(`no_po`)
);
--> statement-breakpoint
CREATE TABLE `resep` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barang_id` int NOT NULL,
	`bahan_baku_id` int NOT NULL,
	`jumlah` double NOT NULL,
	`satuan_id` int,
	`tenant_id` int NOT NULL DEFAULT 1,
	CONSTRAINT `resep_id` PRIMARY KEY(`id`),
	CONSTRAINT `uidx_resep_menu_bahan` UNIQUE(`barang_id`,`bahan_baku_id`),
	CONSTRAINT `chk_resep_jumlah` CHECK(`resep`.`jumlah` > 0)
);
--> statement-breakpoint
CREATE TABLE `retur_penjualan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`no_retur` text NOT NULL,
	`penjualan_id` int NOT NULL,
	`tanggal` text NOT NULL,
	`kasir_id` int,
	`total_retur` bigint NOT NULL DEFAULT 0,
	`alasan` text,
	`metode_refund` text NOT NULL DEFAULT ('tunai'),
	`kas_bank_id` int,
	`catatan` text,
	`tenant_id` int NOT NULL DEFAULT 1,
	`cabang_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `retur_penjualan_id` PRIMARY KEY(`id`),
	CONSTRAINT `retur_penjualan_no_retur_unique` UNIQUE(`no_retur`)
);
--> statement-breakpoint
CREATE TABLE `retur_penjualan_detail` (
	`id` int AUTO_INCREMENT NOT NULL,
	`retur_id` int NOT NULL,
	`barang_id` int NOT NULL,
	`satuan_id` int,
	`jumlah_retur` double NOT NULL,
	`harga_jual` bigint NOT NULL,
	`subtotal` bigint NOT NULL,
	`tenant_id` int NOT NULL DEFAULT 1,
	`cabang_id` int NOT NULL DEFAULT 1,
	CONSTRAINT `retur_penjualan_detail_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `retur_penjualan_tukar` (
	`id` int AUTO_INCREMENT NOT NULL,
	`retur_id` int NOT NULL,
	`barang_id` int NOT NULL,
	`satuan_id` int,
	`jumlah` double NOT NULL,
	`harga_jual` bigint NOT NULL,
	`subtotal` bigint NOT NULL,
	`tenant_id` int NOT NULL DEFAULT 1,
	`cabang_id` int NOT NULL DEFAULT 1,
	CONSTRAINT `retur_penjualan_tukar_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `retur_supplier` (
	`id` int AUTO_INCREMENT NOT NULL,
	`no_retur` text NOT NULL,
	`barang_masuk_id` int NOT NULL,
	`supplier_id` int NOT NULL,
	`tanggal` text NOT NULL,
	`dicatat_oleh` int,
	`total_retur` bigint NOT NULL DEFAULT 0,
	`alasan` text,
	`metode_refund` text NOT NULL DEFAULT ('kurang_hutang'),
	`hutang_id` int,
	`kas_bank_id` int,
	`catatan` text,
	`tenant_id` int NOT NULL DEFAULT 1,
	`cabang_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `retur_supplier_id` PRIMARY KEY(`id`),
	CONSTRAINT `retur_supplier_no_retur_unique` UNIQUE(`no_retur`)
);
--> statement-breakpoint
CREATE TABLE `retur_supplier_detail` (
	`id` int AUTO_INCREMENT NOT NULL,
	`retur_id` int NOT NULL,
	`barang_id` int NOT NULL,
	`jumlah_retur` double NOT NULL,
	`harga_beli` bigint NOT NULL,
	`subtotal` bigint NOT NULL,
	`tenant_id` int NOT NULL DEFAULT 1,
	`cabang_id` int NOT NULL DEFAULT 1,
	CONSTRAINT `retur_supplier_detail_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sanksi_insentif` (
	`id` int AUTO_INCREMENT NOT NULL,
	`karyawan_id` int NOT NULL,
	`tipe` text NOT NULL,
	`jenis` text NOT NULL,
	`jumlah` bigint NOT NULL,
	`tanggal` text NOT NULL,
	`keterangan` text,
	`periode_bulan` text NOT NULL,
	`dicatat_oleh` int,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `sanksi_insentif_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `satuan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama` text NOT NULL,
	`singkatan` text NOT NULL,
	`contoh` text,
	`is_preset` boolean NOT NULL DEFAULT false,
	`created_by` int,
	`updated_by` int,
	CONSTRAINT `satuan_id` PRIMARY KEY(`id`),
	CONSTRAINT `satuan_nama_unique` UNIQUE(`nama`)
);
--> statement-breakpoint
CREATE TABLE `shift_kasir` (
	`id` int AUTO_INCREMENT NOT NULL,
	`karyawan_id` int NOT NULL,
	`tanggal` text NOT NULL,
	`jam_buka` text NOT NULL,
	`jam_tutup` text,
	`kas_awal` bigint NOT NULL DEFAULT 0,
	`kas_fisik` bigint,
	`kas_sistem` bigint,
	`selisih_kas` bigint,
	`jumlah_transaksi` int NOT NULL DEFAULT 0,
	`total_penjualan` bigint NOT NULL DEFAULT 0,
	`catatan` text,
	`status` text NOT NULL DEFAULT ('buka'),
	`tenant_id` int NOT NULL DEFAULT 1,
	`cabang_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `shift_kasir_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sop_instance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rule_id` int NOT NULL,
	`karyawan_id` int,
	`status` text NOT NULL DEFAULT ('pending'),
	`payload_json` text,
	`hasil_json` text,
	`dibuat_at` text NOT NULL,
	`diselesaikan_at` text,
	CONSTRAINT `sop_instance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sop_rule` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama` text NOT NULL,
	`event_name` text NOT NULL,
	`tipe` text NOT NULL DEFAULT ('checklist'),
	`deskripsi` text,
	`config_json` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`urutan` int NOT NULL DEFAULT 0,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `sop_rule_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stok_opname` (
	`id` int AUTO_INCREMENT NOT NULL,
	`no_opname` text NOT NULL,
	`tanggal_mulai` text NOT NULL,
	`tanggal_selesai` text,
	`status` text NOT NULL DEFAULT ('draft'),
	`diapprove_oleh` int,
	`tenant_id` int NOT NULL DEFAULT 1,
	`cabang_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `stok_opname_id` PRIMARY KEY(`id`),
	CONSTRAINT `stok_opname_no_opname_unique` UNIQUE(`no_opname`)
);
--> statement-breakpoint
CREATE TABLE `stok_opname_detail` (
	`id` int AUTO_INCREMENT NOT NULL,
	`opname_id` int NOT NULL,
	`barang_id` int NOT NULL,
	`stok_sistem` double NOT NULL,
	`stok_fisik` double,
	`selisih` double,
	`alasan_selisih` text,
	`dihitung_oleh` int,
	`tenant_id` int NOT NULL DEFAULT 1,
	`cabang_id` int NOT NULL DEFAULT 1,
	CONSTRAINT `stok_opname_detail_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kode_supplier` text NOT NULL,
	`nama_supplier` text NOT NULL,
	`kontak` text,
	`alamat` text,
	`terms_bayar` int NOT NULL DEFAULT 0,
	`limit_hutang` bigint NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `supplier_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplier_kode_supplier_unique` UNIQUE(`kode_supplier`)
);
--> statement-breakpoint
CREATE TABLE `tagihan_utilitas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jenis` text NOT NULL DEFAULT ('listrik'),
	`periode_bulan` text NOT NULL,
	`jumlah` int NOT NULL DEFAULT 0,
	`tanggal_bayar` text,
	`meter_awal` int,
	`meter_akhir` int,
	`catatan` text,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `tagihan_utilitas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tamu_birokrasi` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama_tamu` text NOT NULL,
	`instansi` text,
	`keperluan` text NOT NULL,
	`tanggal` text NOT NULL,
	`jam_masuk` text,
	`jam_keluar` text,
	`keterangan` text,
	`dicatat_oleh` int,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `tamu_birokrasi_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `target_penjualan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`periode_bulan` text NOT NULL,
	`target_omzet` bigint NOT NULL DEFAULT 0,
	`target_transaksi` int NOT NULL DEFAULT 0,
	`target_margin_pct` double NOT NULL DEFAULT 0,
	`catatan` text,
	`dibuat_oleh` int,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `target_penjualan_id` PRIMARY KEY(`id`),
	CONSTRAINT `target_penjualan_periode_bulan_unique` UNIQUE(`periode_bulan`)
);
--> statement-breakpoint
CREATE TABLE `tipe_shift` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama` text NOT NULL,
	`jam_mulai` text NOT NULL,
	`jam_selesai` text NOT NULL,
	`warna` text NOT NULL DEFAULT ('#00e676'),
	`is_active` boolean NOT NULL DEFAULT true,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `tipe_shift_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `toko` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kode_toko` text NOT NULL,
	`nama` text NOT NULL,
	`alamat` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`status_langganan` text NOT NULL DEFAULT ('trial'),
	`trial_berakhir` text,
	`aktif_sampai` text,
	`email_pemilik` text,
	`wa_pemilik` text,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `toko_id` PRIMARY KEY(`id`),
	CONSTRAINT `toko_kode_toko_unique` UNIQUE(`kode_toko`)
);
--> statement-breakpoint
CREATE TABLE `toko_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`toko_id` int NOT NULL DEFAULT 1,
	`key` text NOT NULL,
	`value` text,
	`updated_at` text,
	CONSTRAINT `toko_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `uidx_toko_settings_key` UNIQUE(`toko_id`,`key`)
);
--> statement-breakpoint
CREATE TABLE `tukar_shift` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pengaju_id` int NOT NULL,
	`jadwal_id` int NOT NULL,
	`penerima_id` int NOT NULL,
	`jadwal_penerima_id` int,
	`alasan` text,
	`status` text NOT NULL DEFAULT ('menunggu'),
	`diproses_oleh` int,
	`catatan_proses` text,
	`tenant_id` int NOT NULL DEFAULT 1,
	`created_at` text,
	`updated_at` text,
	CONSTRAINT `tukar_shift_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wa_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kode` text NOT NULL,
	`teks` text NOT NULL,
	`aktif` boolean NOT NULL DEFAULT true,
	CONSTRAINT `wa_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `wa_templates_kode_unique` UNIQUE(`kode`)
);
--> statement-breakpoint
ALTER TABLE `absensi` ADD CONSTRAINT `absensi_karyawan_id_karyawan_id_fk` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `absensi` ADD CONSTRAINT `absensi_dicatat_oleh_karyawan_id_fk` FOREIGN KEY (`dicatat_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `acara_hajatan` ADD CONSTRAINT `acara_hajatan_pelanggan_id_pelanggan_id_fk` FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agenda_supplier` ADD CONSTRAINT `agenda_supplier_supplier_id_supplier_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agenda_supplier` ADD CONSTRAINT `agenda_supplier_petugas_id_karyawan_id_fk` FOREIGN KEY (`petugas_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `approval` ADD CONSTRAINT `approval_diminta_oleh_karyawan_id_fk` FOREIGN KEY (`diminta_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `approval` ADD CONSTRAINT `approval_diproses_oleh_karyawan_id_fk` FOREIGN KEY (`diproses_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bahan_baku` ADD CONSTRAINT `bahan_baku_satuan_id_satuan_id_fk` FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `barang` ADD CONSTRAINT `barang_kategori_id_kategori_id_fk` FOREIGN KEY (`kategori_id`) REFERENCES `kategori`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `barang` ADD CONSTRAINT `barang_satuan_dasar_id_satuan_id_fk` FOREIGN KEY (`satuan_dasar_id`) REFERENCES `satuan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `barang_masuk` ADD CONSTRAINT `barang_masuk_po_id_purchase_order_id_fk` FOREIGN KEY (`po_id`) REFERENCES `purchase_order`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `barang_masuk` ADD CONSTRAINT `barang_masuk_supplier_id_supplier_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `barang_masuk` ADD CONSTRAINT `barang_masuk_diterima_oleh_karyawan_id_fk` FOREIGN KEY (`diterima_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `barang_masuk_detail` ADD CONSTRAINT `barang_masuk_detail_penerimaan_id_barang_masuk_id_fk` FOREIGN KEY (`penerimaan_id`) REFERENCES `barang_masuk`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `barang_masuk_detail` ADD CONSTRAINT `barang_masuk_detail_barang_id_barang_id_fk` FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `barang_masuk_detail` ADD CONSTRAINT `barang_masuk_detail_satuan_id_satuan_id_fk` FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `barang_modifier_grup` ADD CONSTRAINT `barang_modifier_grup_barang_id_barang_id_fk` FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `barang_modifier_grup` ADD CONSTRAINT `barang_modifier_grup_grup_modifier_id_grup_modifier_id_fk` FOREIGN KEY (`grup_modifier_id`) REFERENCES `grup_modifier`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking` ADD CONSTRAINT `booking_pelanggan_id_pelanggan_id_fk` FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking` ADD CONSTRAINT `booking_karyawan_id_karyawan_id_fk` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking` ADD CONSTRAINT `booking_barang_id_barang_id_fk` FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking` ADD CONSTRAINT `booking_penjualan_id_penjualan_id_fk` FOREIGN KEY (`penjualan_id`) REFERENCES `penjualan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking` ADD CONSTRAINT `booking_kredit_id_kredit_membership_id_fk` FOREIGN KEY (`kredit_id`) REFERENCES `kredit_membership`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_operasional` ADD CONSTRAINT `budget_operasional_dibuat_oleh_karyawan_id_fk` FOREIGN KEY (`dibuat_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cabang` ADD CONSTRAINT `cabang_toko_id_toko_id_fk` FOREIGN KEY (`toko_id`) REFERENCES `toko`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `checklist_log` ADD CONSTRAINT `checklist_log_item_id_checklist_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `checklist_item`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `checklist_log` ADD CONSTRAINT `checklist_log_karyawan_id_karyawan_id_fk` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `detail_layanan` ADD CONSTRAINT `detail_layanan_barang_id_barang_id_fk` FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `draft_keranjang` ADD CONSTRAINT `draft_keranjang_kasir_id_karyawan_id_fk` FOREIGN KEY (`kasir_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `draft_keranjang` ADD CONSTRAINT `draft_keranjang_pelanggan_id_pelanggan_id_fk` FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `draft_keranjang` ADD CONSTRAINT `draft_keranjang_meja_id_meja_id_fk` FOREIGN KEY (`meja_id`) REFERENCES `meja`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `draft_keranjang_item` ADD CONSTRAINT `draft_keranjang_item_draft_id_draft_keranjang_id_fk` FOREIGN KEY (`draft_id`) REFERENCES `draft_keranjang`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `draft_keranjang_item` ADD CONSTRAINT `draft_keranjang_item_barang_id_barang_id_fk` FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `draft_keranjang_item` ADD CONSTRAINT `draft_keranjang_item_satuan_id_satuan_id_fk` FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `evaluasi_karyawan` ADD CONSTRAINT `evaluasi_karyawan_karyawan_id_karyawan_id_fk` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `evaluasi_karyawan` ADD CONSTRAINT `evaluasi_karyawan_dinilai_oleh_karyawan_id_fk` FOREIGN KEY (`dinilai_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `harga_jadwal` ADD CONSTRAINT `harga_jadwal_barang_id_barang_id_fk` FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `harga_jadwal` ADD CONSTRAINT `harga_jadwal_dibuat_oleh_karyawan_id_fk` FOREIGN KEY (`dibuat_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `histori_harga_beli` ADD CONSTRAINT `histori_harga_beli_barang_id_barang_id_fk` FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `histori_harga_beli` ADD CONSTRAINT `histori_harga_beli_supplier_id_supplier_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `histori_harga_beli` ADD CONSTRAINT `histori_harga_beli_dicatat_oleh_karyawan_id_fk` FOREIGN KEY (`dicatat_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `histori_harga_jual` ADD CONSTRAINT `histori_harga_jual_barang_id_barang_id_fk` FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `histori_harga_jual` ADD CONSTRAINT `histori_harga_jual_diubah_oleh_karyawan_id_fk` FOREIGN KEY (`diubah_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hutang_supplier` ADD CONSTRAINT `hutang_supplier_supplier_id_supplier_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hutang_supplier` ADD CONSTRAINT `hutang_supplier_barang_masuk_id_barang_masuk_id_fk` FOREIGN KEY (`barang_masuk_id`) REFERENCES `barang_masuk`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspeksi_toko` ADD CONSTRAINT `inspeksi_toko_petugas_id_karyawan_id_fk` FOREIGN KEY (`petugas_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jadwal_kerja` ADD CONSTRAINT `jadwal_kerja_karyawan_id_karyawan_id_fk` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jadwal_kerja` ADD CONSTRAINT `jadwal_kerja_tipe_shift_id_tipe_shift_id_fk` FOREIGN KEY (`tipe_shift_id`) REFERENCES `tipe_shift`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jadwal_kerja` ADD CONSTRAINT `jadwal_kerja_dibuat_oleh_karyawan_id_fk` FOREIGN KEY (`dibuat_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jadwal_staf` ADD CONSTRAINT `jadwal_staf_karyawan_id_karyawan_id_fk` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jurnal_kas` ADD CONSTRAINT `jurnal_kas_kas_bank_id_kas_bank_id_fk` FOREIGN KEY (`kas_bank_id`) REFERENCES `kas_bank`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jurnal_kas` ADD CONSTRAINT `jurnal_kas_dicatat_oleh_karyawan_id_fk` FOREIGN KEY (`dicatat_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kartu_anggota` ADD CONSTRAINT `kartu_anggota_pelanggan_id_pelanggan_id_fk` FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `karyawan` ADD CONSTRAINT `karyawan_toko_id_toko_id_fk` FOREIGN KEY (`toko_id`) REFERENCES `toko`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `karyawan` ADD CONSTRAINT `karyawan_cabang_id_cabang_id_fk` FOREIGN KEY (`cabang_id`) REFERENCES `cabang`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kasbon` ADD CONSTRAINT `kasbon_karyawan_id_karyawan_id_fk` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kasbon` ADD CONSTRAINT `kasbon_disetujui_oleh_karyawan_id_fk` FOREIGN KEY (`disetujui_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `komisi_staf` ADD CONSTRAINT `komisi_staf_karyawan_id_karyawan_id_fk` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `komisi_staf` ADD CONSTRAINT `komisi_staf_penjualan_id_penjualan_id_fk` FOREIGN KEY (`penjualan_id`) REFERENCES `penjualan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `komisi_staf` ADD CONSTRAINT `komisi_staf_penjualan_detail_id_penjualan_detail_id_fk` FOREIGN KEY (`penjualan_detail_id`) REFERENCES `penjualan_detail`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `komisi_staf` ADD CONSTRAINT `komisi_staf_barang_id_barang_id_fk` FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `komplain_pelanggan` ADD CONSTRAINT `komplain_pelanggan_pelanggan_id_pelanggan_id_fk` FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `komplain_pelanggan` ADD CONSTRAINT `komplain_pelanggan_ditangani_oleh_karyawan_id_fk` FOREIGN KEY (`ditangani_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kredit_membership` ADD CONSTRAINT `kredit_membership_pelanggan_id_pelanggan_id_fk` FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kredit_membership` ADD CONSTRAINT `kredit_membership_paket_id_paket_membership_id_fk` FOREIGN KEY (`paket_id`) REFERENCES `paket_membership`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kredit_membership` ADD CONSTRAINT `kredit_membership_penjualan_id_penjualan_id_fk` FOREIGN KEY (`penjualan_id`) REFERENCES `penjualan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kunjungan_sales` ADD CONSTRAINT `kunjungan_sales_pelanggan_id_pelanggan_id_fk` FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kunjungan_sales` ADD CONSTRAINT `kunjungan_sales_petugas_id_karyawan_id_fk` FOREIGN KEY (`petugas_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lampiran` ADD CONSTRAINT `lampiran_uploaded_by_karyawan_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `log_aktivitas` ADD CONSTRAINT `log_aktivitas_karyawan_id_karyawan_id_fk` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `modifier` ADD CONSTRAINT `modifier_grup_modifier_id_grup_modifier_id_fk` FOREIGN KEY (`grup_modifier_id`) REFERENCES `grup_modifier`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mutasi_stok` ADD CONSTRAINT `mutasi_stok_barang_id_barang_id_fk` FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mutasi_stok` ADD CONSTRAINT `mutasi_stok_dicatat_oleh_karyawan_id_fk` FOREIGN KEY (`dicatat_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `paket_membership` ADD CONSTRAINT `paket_membership_barang_id_barang_id_fk` FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pembayaran_hutang` ADD CONSTRAINT `pembayaran_hutang_hutang_id_hutang_supplier_id_fk` FOREIGN KEY (`hutang_id`) REFERENCES `hutang_supplier`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pembayaran_hutang` ADD CONSTRAINT `pembayaran_hutang_kas_bank_id_kas_bank_id_fk` FOREIGN KEY (`kas_bank_id`) REFERENCES `kas_bank`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pembayaran_hutang` ADD CONSTRAINT `pembayaran_hutang_dibayar_oleh_karyawan_id_fk` FOREIGN KEY (`dibayar_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pembayaran_langganan` ADD CONSTRAINT `pembayaran_langganan_toko_id_toko_id_fk` FOREIGN KEY (`toko_id`) REFERENCES `toko`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pembayaran_langganan` ADD CONSTRAINT `pembayaran_langganan_diverifikasi_oleh_platform_admin_id_fk` FOREIGN KEY (`diverifikasi_oleh`) REFERENCES `platform_admin`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pembayaran_piutang` ADD CONSTRAINT `pembayaran_piutang_piutang_id_piutang_pelanggan_id_fk` FOREIGN KEY (`piutang_id`) REFERENCES `piutang_pelanggan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pembayaran_piutang` ADD CONSTRAINT `pembayaran_piutang_kas_bank_id_kas_bank_id_fk` FOREIGN KEY (`kas_bank_id`) REFERENCES `kas_bank`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pembayaran_piutang` ADD CONSTRAINT `pembayaran_piutang_diterima_oleh_karyawan_id_fk` FOREIGN KEY (`diterima_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pengajuan_izin` ADD CONSTRAINT `pengajuan_izin_karyawan_id_karyawan_id_fk` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pengajuan_izin` ADD CONSTRAINT `pengajuan_izin_diproses_oleh_karyawan_id_fk` FOREIGN KEY (`diproses_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `penggajian` ADD CONSTRAINT `penggajian_karyawan_id_karyawan_id_fk` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `penjualan` ADD CONSTRAINT `penjualan_pelanggan_id_pelanggan_id_fk` FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `penjualan` ADD CONSTRAINT `penjualan_kasir_id_karyawan_id_fk` FOREIGN KEY (`kasir_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `penjualan` ADD CONSTRAINT `penjualan_meja_id_meja_id_fk` FOREIGN KEY (`meja_id`) REFERENCES `meja`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `penjualan_detail` ADD CONSTRAINT `penjualan_detail_penjualan_id_penjualan_id_fk` FOREIGN KEY (`penjualan_id`) REFERENCES `penjualan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `penjualan_detail` ADD CONSTRAINT `penjualan_detail_barang_id_barang_id_fk` FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `penjualan_detail` ADD CONSTRAINT `penjualan_detail_satuan_id_satuan_id_fk` FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `penjualan_detail` ADD CONSTRAINT `penjualan_detail_dilayani_oleh_karyawan_id_fk` FOREIGN KEY (`dilayani_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `penjualan_detail` ADD CONSTRAINT `penjualan_detail_booking_id_booking_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `booking`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `penjualan_detail_modifier` ADD CONSTRAINT `penjualan_detail_modifier_penjualan_detail_id_penjualan_detail_id_fk` FOREIGN KEY (`penjualan_detail_id`) REFERENCES `penjualan_detail`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `penjualan_detail_modifier` ADD CONSTRAINT `penjualan_detail_modifier_modifier_id_modifier_id_fk` FOREIGN KEY (`modifier_id`) REFERENCES `modifier`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `periode_laporan` ADD CONSTRAINT `periode_laporan_dibuat_oleh_karyawan_id_fk` FOREIGN KEY (`dibuat_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `periode_laporan` ADD CONSTRAINT `periode_laporan_diapprove_oleh_karyawan_id_fk` FOREIGN KEY (`diapprove_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permintaan_pelanggan` ADD CONSTRAINT `permintaan_pelanggan_pelanggan_id_pelanggan_id_fk` FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permintaan_pelanggan` ADD CONSTRAINT `permintaan_pelanggan_barang_id_barang_id_fk` FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permintaan_pelanggan` ADD CONSTRAINT `permintaan_pelanggan_ditangani_oleh_karyawan_id_fk` FOREIGN KEY (`ditangani_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pipeline_grosir` ADD CONSTRAINT `pipeline_grosir_pelanggan_id_pelanggan_id_fk` FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pipeline_grosir` ADD CONSTRAINT `pipeline_grosir_petugas_id_karyawan_id_fk` FOREIGN KEY (`petugas_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `piutang_pelanggan` ADD CONSTRAINT `piutang_pelanggan_pelanggan_id_pelanggan_id_fk` FOREIGN KEY (`pelanggan_id`) REFERENCES `pelanggan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `piutang_pelanggan` ADD CONSTRAINT `piutang_pelanggan_penjualan_id_penjualan_id_fk` FOREIGN KEY (`penjualan_id`) REFERENCES `penjualan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `po_detail` ADD CONSTRAINT `po_detail_po_id_purchase_order_id_fk` FOREIGN KEY (`po_id`) REFERENCES `purchase_order`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `po_detail` ADD CONSTRAINT `po_detail_barang_id_barang_id_fk` FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `po_detail` ADD CONSTRAINT `po_detail_satuan_id_satuan_id_fk` FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `preferensi_pengguna` ADD CONSTRAINT `preferensi_pengguna_karyawan_id_karyawan_id_fk` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promo` ADD CONSTRAINT `promo_dibuat_oleh_karyawan_id_fk` FOREIGN KEY (`dibuat_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promo_target` ADD CONSTRAINT `promo_target_promo_id_promo_id_fk` FOREIGN KEY (`promo_id`) REFERENCES `promo`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order` ADD CONSTRAINT `purchase_order_supplier_id_supplier_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order` ADD CONSTRAINT `purchase_order_dibuat_oleh_karyawan_id_fk` FOREIGN KEY (`dibuat_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resep` ADD CONSTRAINT `resep_barang_id_barang_id_fk` FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resep` ADD CONSTRAINT `resep_bahan_baku_id_bahan_baku_id_fk` FOREIGN KEY (`bahan_baku_id`) REFERENCES `bahan_baku`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resep` ADD CONSTRAINT `resep_satuan_id_satuan_id_fk` FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retur_penjualan` ADD CONSTRAINT `retur_penjualan_penjualan_id_penjualan_id_fk` FOREIGN KEY (`penjualan_id`) REFERENCES `penjualan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retur_penjualan` ADD CONSTRAINT `retur_penjualan_kasir_id_karyawan_id_fk` FOREIGN KEY (`kasir_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retur_penjualan` ADD CONSTRAINT `retur_penjualan_kas_bank_id_kas_bank_id_fk` FOREIGN KEY (`kas_bank_id`) REFERENCES `kas_bank`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retur_penjualan_detail` ADD CONSTRAINT `retur_penjualan_detail_retur_id_retur_penjualan_id_fk` FOREIGN KEY (`retur_id`) REFERENCES `retur_penjualan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retur_penjualan_detail` ADD CONSTRAINT `retur_penjualan_detail_barang_id_barang_id_fk` FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retur_penjualan_detail` ADD CONSTRAINT `retur_penjualan_detail_satuan_id_satuan_id_fk` FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retur_penjualan_tukar` ADD CONSTRAINT `retur_penjualan_tukar_retur_id_retur_penjualan_id_fk` FOREIGN KEY (`retur_id`) REFERENCES `retur_penjualan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retur_penjualan_tukar` ADD CONSTRAINT `retur_penjualan_tukar_barang_id_barang_id_fk` FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retur_penjualan_tukar` ADD CONSTRAINT `retur_penjualan_tukar_satuan_id_satuan_id_fk` FOREIGN KEY (`satuan_id`) REFERENCES `satuan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retur_supplier` ADD CONSTRAINT `retur_supplier_barang_masuk_id_barang_masuk_id_fk` FOREIGN KEY (`barang_masuk_id`) REFERENCES `barang_masuk`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retur_supplier` ADD CONSTRAINT `retur_supplier_supplier_id_supplier_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retur_supplier` ADD CONSTRAINT `retur_supplier_dicatat_oleh_karyawan_id_fk` FOREIGN KEY (`dicatat_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retur_supplier` ADD CONSTRAINT `retur_supplier_hutang_id_hutang_supplier_id_fk` FOREIGN KEY (`hutang_id`) REFERENCES `hutang_supplier`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retur_supplier` ADD CONSTRAINT `retur_supplier_kas_bank_id_kas_bank_id_fk` FOREIGN KEY (`kas_bank_id`) REFERENCES `kas_bank`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retur_supplier_detail` ADD CONSTRAINT `retur_supplier_detail_retur_id_retur_supplier_id_fk` FOREIGN KEY (`retur_id`) REFERENCES `retur_supplier`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retur_supplier_detail` ADD CONSTRAINT `retur_supplier_detail_barang_id_barang_id_fk` FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sanksi_insentif` ADD CONSTRAINT `sanksi_insentif_karyawan_id_karyawan_id_fk` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sanksi_insentif` ADD CONSTRAINT `sanksi_insentif_dicatat_oleh_karyawan_id_fk` FOREIGN KEY (`dicatat_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shift_kasir` ADD CONSTRAINT `shift_kasir_karyawan_id_karyawan_id_fk` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sop_instance` ADD CONSTRAINT `sop_instance_rule_id_sop_rule_id_fk` FOREIGN KEY (`rule_id`) REFERENCES `sop_rule`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sop_instance` ADD CONSTRAINT `sop_instance_karyawan_id_karyawan_id_fk` FOREIGN KEY (`karyawan_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stok_opname` ADD CONSTRAINT `stok_opname_diapprove_oleh_karyawan_id_fk` FOREIGN KEY (`diapprove_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stok_opname_detail` ADD CONSTRAINT `stok_opname_detail_opname_id_stok_opname_id_fk` FOREIGN KEY (`opname_id`) REFERENCES `stok_opname`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stok_opname_detail` ADD CONSTRAINT `stok_opname_detail_barang_id_barang_id_fk` FOREIGN KEY (`barang_id`) REFERENCES `barang`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stok_opname_detail` ADD CONSTRAINT `stok_opname_detail_dihitung_oleh_karyawan_id_fk` FOREIGN KEY (`dihitung_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tamu_birokrasi` ADD CONSTRAINT `tamu_birokrasi_dicatat_oleh_karyawan_id_fk` FOREIGN KEY (`dicatat_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `target_penjualan` ADD CONSTRAINT `target_penjualan_dibuat_oleh_karyawan_id_fk` FOREIGN KEY (`dibuat_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `toko_settings` ADD CONSTRAINT `toko_settings_toko_id_toko_id_fk` FOREIGN KEY (`toko_id`) REFERENCES `toko`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tukar_shift` ADD CONSTRAINT `tukar_shift_pengaju_id_karyawan_id_fk` FOREIGN KEY (`pengaju_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tukar_shift` ADD CONSTRAINT `tukar_shift_jadwal_id_jadwal_kerja_id_fk` FOREIGN KEY (`jadwal_id`) REFERENCES `jadwal_kerja`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tukar_shift` ADD CONSTRAINT `tukar_shift_penerima_id_karyawan_id_fk` FOREIGN KEY (`penerima_id`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tukar_shift` ADD CONSTRAINT `tukar_shift_jadwal_penerima_id_jadwal_kerja_id_fk` FOREIGN KEY (`jadwal_penerima_id`) REFERENCES `jadwal_kerja`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tukar_shift` ADD CONSTRAINT `tukar_shift_diproses_oleh_karyawan_id_fk` FOREIGN KEY (`diproses_oleh`) REFERENCES `karyawan`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_absensi_tanggal` ON `absensi` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_absensi_karyawan` ON `absensi` (`karyawan_id`);--> statement-breakpoint
CREATE INDEX `idx_approval_ref` ON `approval` (`referensi_tipe`,`referensi_id`);--> statement-breakpoint
CREATE INDEX `idx_approval_status` ON `approval` (`status`);--> statement-breakpoint
CREATE INDEX `idx_bahan_baku_active` ON `bahan_baku` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_barang_active` ON `barang` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_bmd_kadaluarsa` ON `barang_masuk_detail` (`tgl_kadaluarsa`);--> statement-breakpoint
CREATE INDEX `idx_booking_waktu` ON `booking` (`waktu_mulai`);--> statement-breakpoint
CREATE INDEX `idx_booking_status` ON `booking` (`status`);--> statement-breakpoint
CREATE INDEX `idx_booking_karyawan` ON `booking` (`karyawan_id`);--> statement-breakpoint
CREATE INDEX `idx_cabang_toko` ON `cabang` (`toko_id`);--> statement-breakpoint
CREATE INDEX `idx_checklist_log_tanggal` ON `checklist_log` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_checklist_log_item` ON `checklist_log` (`item_id`);--> statement-breakpoint
CREATE INDEX `idx_draft_kasir` ON `draft_keranjang` (`kasir_id`);--> statement-breakpoint
CREATE INDEX `idx_eval_karyawan` ON `evaluasi_karyawan` (`karyawan_id`);--> statement-breakpoint
CREATE INDEX `idx_hutang_status` ON `hutang_supplier` (`status`);--> statement-breakpoint
CREATE INDEX `idx_hutang_jatuh` ON `hutang_supplier` (`tanggal_jatuh_tempo`);--> statement-breakpoint
CREATE INDEX `idx_jadwal_staf_karyawan` ON `jadwal_staf` (`karyawan_id`);--> statement-breakpoint
CREATE INDEX `idx_jurnal_kas_tanggal` ON `jurnal_kas` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_jurnal_kas_akun` ON `jurnal_kas` (`kas_bank_id`);--> statement-breakpoint
CREATE INDEX `idx_karyawan_active` ON `karyawan` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_karyawan_toko` ON `karyawan` (`toko_id`);--> statement-breakpoint
CREATE INDEX `idx_kasbon_karyawan_status` ON `kasbon` (`karyawan_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_komisi_karyawan` ON `komisi_staf` (`karyawan_id`);--> statement-breakpoint
CREATE INDEX `idx_komisi_status` ON `komisi_staf` (`status`);--> statement-breakpoint
CREATE INDEX `idx_kredit_pelanggan` ON `kredit_membership` (`pelanggan_id`);--> statement-breakpoint
CREATE INDEX `idx_kredit_status` ON `kredit_membership` (`status`);--> statement-breakpoint
CREATE INDEX `idx_lampiran_ref` ON `lampiran` (`referensi_tipe`,`referensi_id`);--> statement-breakpoint
CREATE INDEX `idx_meja_status` ON `meja` (`status`);--> statement-breakpoint
CREATE INDEX `idx_modifier_grup` ON `modifier` (`grup_modifier_id`);--> statement-breakpoint
CREATE INDEX `idx_mutasi_stok_barang` ON `mutasi_stok` (`barang_id`);--> statement-breakpoint
CREATE INDEX `idx_mutasi_stok_tanggal` ON `mutasi_stok` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_mutasi_stok_cabang` ON `mutasi_stok` (`cabang_id`);--> statement-breakpoint
CREATE INDEX `idx_notif_log_ref` ON `notifikasi_log` (`referensi_tipe`,`referensi_id`,`waktu`);--> statement-breakpoint
CREATE INDEX `idx_pembayaran_toko` ON `pembayaran_langganan` (`toko_id`);--> statement-breakpoint
CREATE INDEX `idx_pembayaran_status` ON `pembayaran_langganan` (`status`);--> statement-breakpoint
CREATE INDEX `idx_izin_karyawan` ON `pengajuan_izin` (`karyawan_id`);--> statement-breakpoint
CREATE INDEX `idx_izin_status` ON `pengajuan_izin` (`status`);--> statement-breakpoint
CREATE INDEX `idx_penggajian_karyawan_bulan` ON `penggajian` (`karyawan_id`,`periode_bulan`);--> statement-breakpoint
CREATE INDEX `idx_penjualan_tanggal` ON `penjualan` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_penjualan_status` ON `penjualan` (`status`);--> statement-breakpoint
CREATE INDEX `idx_penjualan_kasir` ON `penjualan` (`kasir_id`);--> statement-breakpoint
CREATE INDEX `idx_penjualan_cabang` ON `penjualan` (`cabang_id`);--> statement-breakpoint
CREATE INDEX `idx_penjualan_meja` ON `penjualan` (`meja_id`);--> statement-breakpoint
CREATE INDEX `idx_penjualan_detail_trx` ON `penjualan_detail` (`penjualan_id`);--> statement-breakpoint
CREATE INDEX `idx_pd_kds` ON `penjualan_detail` (`status_kds`);--> statement-breakpoint
CREATE INDEX `idx_pdm_detail` ON `penjualan_detail_modifier` (`penjualan_detail_id`);--> statement-breakpoint
CREATE INDEX `idx_pipeline_tahap` ON `pipeline_grosir` (`tahap`);--> statement-breakpoint
CREATE INDEX `idx_piutang_status` ON `piutang_pelanggan` (`status`);--> statement-breakpoint
CREATE INDEX `idx_piutang_jatuh` ON `piutang_pelanggan` (`tanggal_jatuh_tempo`);--> statement-breakpoint
CREATE INDEX `idx_resep_barang` ON `resep` (`barang_id`);--> statement-breakpoint
CREATE INDEX `idx_retur_sup_bm` ON `retur_supplier` (`barang_masuk_id`);--> statement-breakpoint
CREATE INDEX `idx_retur_sup_supplier` ON `retur_supplier` (`supplier_id`);--> statement-breakpoint
CREATE INDEX `idx_retur_sup_cabang` ON `retur_supplier` (`cabang_id`);--> statement-breakpoint
CREATE INDEX `idx_si_karyawan_bulan` ON `sanksi_insentif` (`karyawan_id`,`periode_bulan`);--> statement-breakpoint
CREATE INDEX `idx_sop_instance_rule` ON `sop_instance` (`rule_id`);--> statement-breakpoint
CREATE INDEX `idx_sop_instance_karyawan` ON `sop_instance` (`karyawan_id`);--> statement-breakpoint
CREATE INDEX `idx_sop_instance_status` ON `sop_instance` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sop_rule_event` ON `sop_rule` (`event_name`);