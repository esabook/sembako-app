import { table, pkInt, int, txt, bool, flt, jsonText, timestamps, idx, uidx, chk, sql, isoNow } from './builders.ts'

// ─── A1: tenant_id — siap multi-tenant, DEFAULT 1, belum dienforce ──────────
// Pasang sekarang di semua tabel transaksional; RLS aktif di Fase D (Postgres).
const tenantField = {
  tenant_id: int('tenant_id').notNull().default(1),
}

// ─── A2: audit fields — siap tracking siapa buat/ubah ───────────────────────
// Nullable: tabel lama tidak kehilangan data; isi otomatis di route via getAuditBy().
// Tabel yang sudah punya dibuat_oleh/dicatat_oleh tetap dipertahankan — migrasi
// ke pola seragam ini dilakukan bertahap saat menyentuh route terkait.
const auditFields = {
  created_by: int('created_by'),
  updated_by: int('updated_by'),
}

// ═══════════════════════════════════════════════════════════════════════════
// TABEL SISTEM
// ═══════════════════════════════════════════════════════════════════════════

export const karyawan = table('karyawan', {
  id: pkInt('id'),
  kode_karyawan: txt('kode_karyawan').notNull().unique(),
  nama: txt('nama').notNull(),
  role: txt('role', { enum: ['pemilik', 'manajer', 'kasir', 'gudang'] }).notNull(),
  username: txt('username').notNull().unique(),
  password_hash: txt('password_hash').notNull(),
  gaji_pokok: flt('gaji_pokok').notNull().default(0),
  tipe_gaji: txt('tipe_gaji', { enum: ['harian', 'bulanan'] }).notNull().default('bulanan'),
  kontak: txt('kontak'),
  foto_path: txt('foto_path'),
  pin_absensi: txt('pin_absensi'),
  is_active: bool('is_active').notNull().default(true),
  ...timestamps,
}, (t) => [
  idx('idx_karyawan_active').on(t.is_active),
])

export const log_aktivitas = table('log_aktivitas', {
  id: pkInt('id'),
  karyawan_id: int('karyawan_id').references(() => karyawan.id),
  aksi: txt('aksi').notNull(),
  modul: txt('modul').notNull(),
  referensi_id: int('referensi_id'),
  detail_json: jsonText('detail_json'),
  waktu: txt('waktu').$defaultFn(isoNow),
  ip_address: txt('ip_address'),
})

export const wa_templates = table('wa_templates', {
  id: pkInt('id'),
  kode: txt('kode').notNull().unique(),
  teks: txt('teks').notNull(),
  aktif: bool('aktif').notNull().default(true),
})

export const periode_laporan = table('periode_laporan', {
  id: pkInt('id'),
  periode_mulai: txt('periode_mulai').notNull(),
  periode_selesai: txt('periode_selesai').notNull(),
  tipe_laporan: txt('tipe_laporan', { enum: ['laba_rugi', 'arus_kas', 'neraca'] }).notNull(),
  status: txt('status', { enum: ['draft', 'final', 'approved'] }).notNull().default('draft'),
  data_json: jsonText('data_json'),
  dibuat_oleh: int('dibuat_oleh').references(() => karyawan.id),
  diapprove_oleh: int('diapprove_oleh').references(() => karyawan.id),
  ...timestamps,
})

// ═══════════════════════════════════════════════════════════════════════════
// MASTER DATA
// ═══════════════════════════════════════════════════════════════════════════

export const kategori = table('kategori', {
  id: pkInt('id'),
  nama: txt('nama').notNull().unique(),
  kode: txt('kode'),
  contoh: txt('contoh'),
  is_preset: bool('is_preset').notNull().default(false),
  ...auditFields,
})

export const satuan = table('satuan', {
  id: pkInt('id'),
  nama: txt('nama').notNull().unique(),
  singkatan: txt('singkatan').notNull(),
  contoh: txt('contoh'),
  is_preset: bool('is_preset').notNull().default(false),
  ...auditFields,
})

export const barang = table('barang', {
  id: pkInt('id'),
  kode_barang: txt('kode_barang').notNull().unique(),
  nama_barang: txt('nama_barang').notNull(),
  kategori_id: int('kategori_id').references(() => kategori.id),
  satuan_dasar_id: int('satuan_dasar_id').references(() => satuan.id),
  // JSON: [{ satuan_id, faktor }] misal 1 karton = 24 pcs
  konversi_satuan: jsonText('konversi_satuan'),
  harga_beli_terakhir: flt('harga_beli_terakhir').notNull().default(0),
  harga_beli_rata: flt('harga_beli_rata').notNull().default(0),
  harga_jual_eceran: flt('harga_jual_eceran').notNull().default(0),
  harga_jual_grosir: flt('harga_jual_grosir').notNull().default(0),
  stok_minimum: flt('stok_minimum').notNull().default(0),
  stok_sekarang: flt('stok_sekarang').notNull().default(0),
  lokasi_rak: txt('lokasi_rak'),
  foto_path: txt('foto_path'),
  is_active: bool('is_active').notNull().default(true),
  ...tenantField,
  ...auditFields,
  ...timestamps,
}, (t) => [
  chk('chk_barang_harga_jual_eceran', sql`harga_jual_eceran >= 0`),
  chk('chk_barang_harga_jual_grosir', sql`harga_jual_grosir >= 0`),
  chk('chk_barang_stok', sql`stok_sekarang >= 0`),
  idx('idx_barang_active').on(t.is_active),
])

export const supplier = table('supplier', {
  id: pkInt('id'),
  kode_supplier: txt('kode_supplier').notNull().unique(),
  nama_supplier: txt('nama_supplier').notNull(),
  kontak: txt('kontak'),
  alamat: txt('alamat'),
  terms_bayar: int('terms_bayar').notNull().default(0),
  limit_hutang: flt('limit_hutang').notNull().default(0),
  is_active: bool('is_active').notNull().default(true),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

export const pelanggan = table('pelanggan', {
  id: pkInt('id'),
  kode_pelanggan: txt('kode_pelanggan').notNull().unique(),
  nama: txt('nama').notNull(),
  gender: txt('gender', { enum: ['pria', 'wanita'] }),
  tipe: txt('tipe', { enum: ['eceran', 'grosir', 'langganan'] }).notNull().default('eceran'),
  kontak: txt('kontak'),
  alamat: txt('alamat'),
  limit_piutang: flt('limit_piutang').notNull().default(0),
  saldo_piutang: flt('saldo_piutang').notNull().default(0),
  is_active: bool('is_active').notNull().default(true),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

export const kartu_anggota = table('kartu_anggota', {
  id: pkInt('id'),
  no_kartu: txt('no_kartu').notNull().unique(), // 10 digit
  tier: txt('tier', { enum: ['reguler', 'silver', 'gold'] }).notNull().default('reguler'),
  diskon_member: flt('diskon_member').notNull().default(0), // persen
  poin: int('poin').notNull().default(0),
  pelanggan_id: int('pelanggan_id').references(() => pelanggan.id), // null = belum di-assign
  is_active: bool('is_active').notNull().default(true),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

// ═══════════════════════════════════════════════════════════════════════════
// HISTORI HARGA
// ═══════════════════════════════════════════════════════════════════════════

export const histori_harga_beli = table('histori_harga_beli', {
  id: pkInt('id'),
  barang_id: int('barang_id').notNull().references(() => barang.id),
  supplier_id: int('supplier_id').references(() => supplier.id),
  barang_masuk_id: int('barang_masuk_id'),
  harga_beli: flt('harga_beli').notNull(),
  tanggal_berlaku: txt('tanggal_berlaku').notNull(),
  dicatat_oleh: int('dicatat_oleh').references(() => karyawan.id),
  ...tenantField,
})

export const histori_harga_jual = table('histori_harga_jual', {
  id: pkInt('id'),
  barang_id: int('barang_id').notNull().references(() => barang.id),
  harga_eceran: flt('harga_eceran').notNull(),
  harga_grosir: flt('harga_grosir').notNull(),
  tanggal_berlaku: txt('tanggal_berlaku').notNull(),
  tanggal_berakhir: txt('tanggal_berakhir'),
  diubah_oleh: int('diubah_oleh').references(() => karyawan.id),
  ...tenantField,
})

// ═══════════════════════════════════════════════════════════════════════════
// MODUL PEMBELIAN
// ═══════════════════════════════════════════════════════════════════════════

export const purchase_order = table('purchase_order', {
  id: pkInt('id'),
  no_po: txt('no_po').notNull().unique(),
  supplier_id: int('supplier_id').notNull().references(() => supplier.id),
  tanggal_po: txt('tanggal_po').notNull(),
  tanggal_estimasi_datang: txt('tanggal_estimasi_datang'),
  status: txt('status', {
    enum: ['draft', 'dikirim', 'sebagian', 'lunas', 'batal'],
  }).notNull().default('draft'),
  total_nilai: flt('total_nilai').notNull().default(0),
  dibuat_oleh: int('dibuat_oleh').references(() => karyawan.id),
  ...tenantField,
  ...timestamps,
})

export const po_detail = table('po_detail', {
  id: pkInt('id'),
  po_id: int('po_id').notNull().references(() => purchase_order.id),
  barang_id: int('barang_id').notNull().references(() => barang.id),
  satuan_id: int('satuan_id').references(() => satuan.id),
  jumlah_pesan: flt('jumlah_pesan').notNull(),
  jumlah_diterima: flt('jumlah_diterima').notNull().default(0),
  harga_beli_estimasi: flt('harga_beli_estimasi').notNull().default(0),
  ...tenantField,
})

export const barang_masuk = table('barang_masuk', {
  id: pkInt('id'),
  no_penerimaan: txt('no_penerimaan').notNull().unique(),
  po_id: int('po_id').references(() => purchase_order.id),
  supplier_id: int('supplier_id').notNull().references(() => supplier.id),
  tanggal_terima: txt('tanggal_terima').notNull(),
  no_faktur_supplier: txt('no_faktur_supplier'),
  foto_faktur_path: txt('foto_faktur_path'),
  total_nilai: flt('total_nilai').notNull().default(0),
  diterima_oleh: int('diterima_oleh').references(() => karyawan.id),
  ...tenantField,
  ...timestamps,
})

export const barang_masuk_detail = table('barang_masuk_detail', {
  id: pkInt('id'),
  penerimaan_id: int('penerimaan_id').notNull().references(() => barang_masuk.id),
  barang_id: int('barang_id').notNull().references(() => barang.id),
  satuan_id: int('satuan_id').references(() => satuan.id),
  jumlah_terima: flt('jumlah_terima').notNull(),
  harga_beli: flt('harga_beli').notNull(),
  tgl_kadaluarsa: txt('tgl_kadaluarsa'),
  ...tenantField,
}, (t) => [
  idx('idx_bmd_kadaluarsa').on(t.tgl_kadaluarsa),
])

// ═══════════════════════════════════════════════════════════════════════════
// MODUL PENJUALAN
// ═══════════════════════════════════════════════════════════════════════════

export const penjualan = table('penjualan', {
  id: pkInt('id'),
  no_transaksi: txt('no_transaksi').notNull().unique(),
  pelanggan_id: int('pelanggan_id').references(() => pelanggan.id),
  tanggal: txt('tanggal').notNull(),
  tipe: txt('tipe', { enum: ['eceran', 'grosir'] }).notNull().default('eceran'),
  kasir_id: int('kasir_id').references(() => karyawan.id),
  subtotal: flt('subtotal').notNull().default(0),
  diskon_total: flt('diskon_total').notNull().default(0),
  total: flt('total').notNull().default(0),
  metode_bayar: txt('metode_bayar', {
    enum: ['tunai', 'transfer', 'qris', 'hutang'],
  }).notNull(),
  bayar: flt('bayar').notNull().default(0),
  kembalian: flt('kembalian').notNull().default(0),
  status: txt('status', { enum: ['lunas', 'hutang', 'void'] }).notNull().default('lunas'),
  ...tenantField,
  ...timestamps,
}, (t) => [
  idx('idx_penjualan_tanggal').on(t.tanggal),
  idx('idx_penjualan_status').on(t.status),
  idx('idx_penjualan_kasir').on(t.kasir_id),
  chk('chk_penjualan_subtotal', sql`${t.subtotal} >= 0`),
  chk('chk_penjualan_total', sql`${t.total} >= 0`),
  chk('chk_penjualan_diskon', sql`${t.diskon_total} >= 0`),
  chk('chk_penjualan_bayar', sql`${t.bayar} >= 0`),
  chk('chk_penjualan_kembalian', sql`${t.kembalian} >= 0`),
])

export const penjualan_detail = table('penjualan_detail', {
  id: pkInt('id'),
  penjualan_id: int('penjualan_id').notNull().references(() => penjualan.id),
  barang_id: int('barang_id').notNull().references(() => barang.id),
  satuan_id: int('satuan_id').references(() => satuan.id),
  jumlah: flt('jumlah').notNull(),
  harga_jual: flt('harga_jual').notNull(), // snapshot — jangan ambil dari master
  diskon_item: flt('diskon_item').notNull().default(0),
  subtotal: flt('subtotal').notNull(),
  ...tenantField,
}, (t) => [
  idx('idx_penjualan_detail_trx').on(t.penjualan_id),
  chk('chk_detail_jumlah_pos', sql`${t.jumlah} > 0`),
  chk('chk_detail_harga_pos', sql`${t.harga_jual} >= 0`),
  chk('chk_detail_diskon_pos', sql`${t.diskon_item} >= 0`),
  chk('chk_detail_subtotal_pos', sql`${t.subtotal} >= 0`),
])

// ═══════════════════════════════════════════════════════════════════════════
// MODUL STOK
// ═══════════════════════════════════════════════════════════════════════════

export const mutasi_stok = table('mutasi_stok', {
  id: pkInt('id'),
  barang_id: int('barang_id').notNull().references(() => barang.id),
  tanggal: txt('tanggal').notNull(),
  jenis: txt('jenis', { enum: ['masuk', 'keluar', 'koreksi', 'opname'] }).notNull(),
  referensi_tipe: txt('referensi_tipe'),
  referensi_id: int('referensi_id'),
  jumlah_sebelum: flt('jumlah_sebelum').notNull(),
  jumlah_perubahan: flt('jumlah_perubahan').notNull(),
  jumlah_sesudah: flt('jumlah_sesudah').notNull(),
  dicatat_oleh: int('dicatat_oleh').references(() => karyawan.id),
  ...tenantField,
}, (t) => [
  idx('idx_mutasi_stok_barang').on(t.barang_id),
  idx('idx_mutasi_stok_tanggal').on(t.tanggal),
])

export const stok_opname = table('stok_opname', {
  id: pkInt('id'),
  no_opname: txt('no_opname').notNull().unique(),
  tanggal_mulai: txt('tanggal_mulai').notNull(),
  tanggal_selesai: txt('tanggal_selesai'),
  status: txt('status', {
    enum: ['draft', 'proses', 'selesai', 'approved'],
  }).notNull().default('draft'),
  diapprove_oleh: int('diapprove_oleh').references(() => karyawan.id),
  ...tenantField,
  ...timestamps,
})

export const stok_opname_detail = table('stok_opname_detail', {
  id: pkInt('id'),
  opname_id: int('opname_id').notNull().references(() => stok_opname.id),
  barang_id: int('barang_id').notNull().references(() => barang.id),
  stok_sistem: flt('stok_sistem').notNull(),
  stok_fisik: flt('stok_fisik'),
  selisih: flt('selisih'),
  alasan_selisih: txt('alasan_selisih'),
  dihitung_oleh: int('dihitung_oleh').references(() => karyawan.id),
  ...tenantField,
})

// ═══════════════════════════════════════════════════════════════════════════
// MODUL KEUANGAN
// ═══════════════════════════════════════════════════════════════════════════

export const kas_bank = table('kas_bank', {
  id: pkInt('id'),
  nama: txt('nama').notNull(),
  tipe: txt('tipe', { enum: ['kas', 'bank'] }).notNull(),
  saldo_awal: flt('saldo_awal').notNull().default(0),
  is_active: bool('is_active').notNull().default(true),
  ...tenantField,
  ...auditFields,
})

export const jurnal_kas = table('jurnal_kas', {
  id: pkInt('id'),
  tanggal: txt('tanggal').notNull(),
  kas_bank_id: int('kas_bank_id').notNull().references(() => kas_bank.id),
  jenis: txt('jenis', { enum: ['masuk', 'keluar'] }).notNull(),
  kategori: txt('kategori').notNull(),
  referensi_tipe: txt('referensi_tipe'),
  referensi_id: int('referensi_id'),
  keterangan: txt('keterangan'),
  jumlah: flt('jumlah').notNull(),
  dicatat_oleh: int('dicatat_oleh').references(() => karyawan.id),
  ...tenantField,
  ...timestamps,
}, (t) => [
  idx('idx_jurnal_kas_tanggal').on(t.tanggal),
  idx('idx_jurnal_kas_akun').on(t.kas_bank_id),
])

export const hutang_supplier = table('hutang_supplier', {
  id: pkInt('id'),
  supplier_id: int('supplier_id').notNull().references(() => supplier.id),
  barang_masuk_id: int('barang_masuk_id').notNull().references(() => barang_masuk.id),
  tanggal_hutang: txt('tanggal_hutang').notNull(),
  tanggal_jatuh_tempo: txt('tanggal_jatuh_tempo'),
  total_hutang: flt('total_hutang').notNull(),
  sisa_hutang: flt('sisa_hutang').notNull(),
  status: txt('status', { enum: ['belum', 'sebagian', 'lunas'] }).notNull().default('belum'),
  ...tenantField,
  ...auditFields,
  ...timestamps,
}, (t) => [
  idx('idx_hutang_status').on(t.status),
  idx('idx_hutang_jatuh').on(t.tanggal_jatuh_tempo),
])

export const pembayaran_hutang = table('pembayaran_hutang', {
  id: pkInt('id'),
  hutang_id: int('hutang_id').notNull().references(() => hutang_supplier.id),
  tanggal_bayar: txt('tanggal_bayar').notNull(),
  jumlah_bayar: flt('jumlah_bayar').notNull(),
  kas_bank_id: int('kas_bank_id').notNull().references(() => kas_bank.id),
  dibayar_oleh: int('dibayar_oleh').references(() => karyawan.id),
  ...tenantField,
  ...timestamps,
})

export const piutang_pelanggan = table('piutang_pelanggan', {
  id: pkInt('id'),
  pelanggan_id: int('pelanggan_id').notNull().references(() => pelanggan.id),
  penjualan_id: int('penjualan_id').notNull().references(() => penjualan.id),
  tanggal_piutang: txt('tanggal_piutang').notNull(),
  tanggal_jatuh_tempo: txt('tanggal_jatuh_tempo'),
  total_piutang: flt('total_piutang').notNull(),
  sisa_piutang: flt('sisa_piutang').notNull(),
  status: txt('status', { enum: ['belum', 'sebagian', 'lunas'] }).notNull().default('belum'),
  ...tenantField,
  ...auditFields,
  ...timestamps,
}, (t) => [
  idx('idx_piutang_status').on(t.status),
  idx('idx_piutang_jatuh').on(t.tanggal_jatuh_tempo),
  chk('chk_piutang_total_pos', sql`${t.total_piutang} > 0`),
  chk('chk_piutang_sisa_pos', sql`${t.sisa_piutang} >= 0`),
  chk('chk_piutang_sisa_lte_total', sql`${t.sisa_piutang} <= ${t.total_piutang}`),
])

export const pembayaran_piutang = table('pembayaran_piutang', {
  id: pkInt('id'),
  piutang_id: int('piutang_id').notNull().references(() => piutang_pelanggan.id),
  tanggal_bayar: txt('tanggal_bayar').notNull(),
  jumlah_bayar: flt('jumlah_bayar').notNull(),
  kas_bank_id: int('kas_bank_id').notNull().references(() => kas_bank.id),
  diterima_oleh: int('diterima_oleh').references(() => karyawan.id),
  ...tenantField,
  ...timestamps,
})

// ═══════════════════════════════════════════════════════════════════════════
// MODUL KARYAWAN & PENGGAJIAN
// ═══════════════════════════════════════════════════════════════════════════

export const absensi = table('absensi', {
  id: pkInt('id'),
  karyawan_id: int('karyawan_id').notNull().references(() => karyawan.id),
  tanggal: txt('tanggal').notNull(),
  jam_masuk: txt('jam_masuk'),
  jam_keluar: txt('jam_keluar'),
  shift: txt('shift'),
  status: txt('status', {
    enum: ['hadir', 'izin', 'sakit', 'alpa'],
  }).notNull().default('hadir'),
  terlambat_menit: int('terlambat_menit'),
  dicatat_oleh: int('dicatat_oleh').references(() => karyawan.id),
  ...tenantField,
}, (t) => [
  idx('idx_absensi_tanggal').on(t.tanggal),
  idx('idx_absensi_karyawan').on(t.karyawan_id),
])

export const penggajian = table('penggajian', {
  id: pkInt('id'),
  karyawan_id: int('karyawan_id').notNull().references(() => karyawan.id),
  periode_bulan: txt('periode_bulan').notNull(),
  hari_kerja: int('hari_kerja').notNull().default(0),
  hari_hadir: int('hari_hadir').notNull().default(0),
  gaji_pokok: flt('gaji_pokok').notNull(),
  tunjangan: flt('tunjangan').notNull().default(0),
  potongan_kasbon: flt('potongan_kasbon').notNull().default(0),
  potongan_lain: flt('potongan_lain').notNull().default(0),
  total_gaji: flt('total_gaji').notNull(),
  status: txt('status', { enum: ['draft', 'approved', 'dibayar'] }).notNull().default('draft'),
  ...tenantField,
  ...timestamps,
}, (t) => [
  idx('idx_penggajian_karyawan_bulan').on(t.karyawan_id, t.periode_bulan),
])

export const kasbon = table('kasbon', {
  id: pkInt('id'),
  karyawan_id: int('karyawan_id').notNull().references(() => karyawan.id),
  tanggal_pinjam: txt('tanggal_pinjam').notNull(),
  jumlah: flt('jumlah').notNull(),
  cicilan_per_bulan: flt('cicilan_per_bulan').notNull().default(0),
  sisa_kasbon: flt('sisa_kasbon').notNull(),
  status: txt('status', {
    enum: ['pengajuan', 'disetujui', 'ditolak', 'aktif', 'lunas'],
  }).notNull().default('pengajuan'),
  disetujui_oleh: int('disetujui_oleh').references(() => karyawan.id),
  tanggal_cair: txt('tanggal_cair'),
  catatan: txt('catatan'),
  ...tenantField,
  ...timestamps,
}, (t) => [
  chk('chk_kasbon_jumlah_pos', sql`${t.jumlah} > 0`),
  chk('chk_kasbon_sisa_pos', sql`${t.sisa_kasbon} >= 0`),
  chk('chk_kasbon_cicilan_pos', sql`${t.cicilan_per_bulan} >= 0`),
  idx('idx_kasbon_karyawan_status').on(t.karyawan_id, t.status),
])

// ═══════════════════════════════════════════════════════════════════════════
// HR LANJUTAN (Fase C1)
// ═══════════════════════════════════════════════════════════════════════════

// Pengajuan izin/cuti/sakit — approval via primitif B5.
// Setelah disetujui, hook akan insert baris absensi otomatis.
export const pengajuan_izin = table('pengajuan_izin', {
  id: pkInt('id'),
  karyawan_id: int('karyawan_id').notNull().references(() => karyawan.id),
  jenis: txt('jenis', { enum: ['cuti', 'izin', 'sakit'] }).notNull(),
  tanggal_mulai: txt('tanggal_mulai').notNull(),
  tanggal_selesai: txt('tanggal_selesai').notNull(),
  alasan: txt('alasan'),
  bukti_path: txt('bukti_path'),         // opsional foto dokter/surat
  status: txt('status', {
    enum: ['menunggu', 'disetujui', 'ditolak'],
  }).notNull().default('menunggu'),
  diproses_oleh: int('diproses_oleh').references(() => karyawan.id),
  catatan_proses: txt('catatan_proses'),
  ...tenantField,
  ...timestamps,
}, (t) => [
  idx('idx_izin_karyawan').on(t.karyawan_id),
  idx('idx_izin_status').on(t.status),
])

// Evaluasi berkala karyawan — penilaian performa oleh manajer/pemilik.
export const evaluasi_karyawan = table('evaluasi_karyawan', {
  id: pkInt('id'),
  karyawan_id: int('karyawan_id').notNull().references(() => karyawan.id),
  periode: txt('periode').notNull(),        // YYYY-MM atau YYYY-Q1 dst
  nilai: int('nilai').notNull(),         // 1–5
  catatan: txt('catatan'),
  dinilai_oleh: int('dinilai_oleh').notNull().references(() => karyawan.id),
  tanggal: txt('tanggal').notNull(),
  ...tenantField,
  ...timestamps,
}, (t) => [
  idx('idx_eval_karyawan').on(t.karyawan_id),
])

// Sanksi dan insentif — berdampak ke total penggajian bulan tersebut.
export const sanksi_insentif = table('sanksi_insentif', {
  id: pkInt('id'),
  karyawan_id: int('karyawan_id').notNull().references(() => karyawan.id),
  tipe: txt('tipe', { enum: ['sanksi', 'insentif'] }).notNull(),
  jenis: txt('jenis').notNull(),            // 'terlambat' | 'lembur' | 'bonus' | 'potongan' | dst
  jumlah: flt('jumlah').notNull(),          // nominal rupiah, selalu positif
  tanggal: txt('tanggal').notNull(),
  keterangan: txt('keterangan'),
  periode_bulan: txt('periode_bulan').notNull(), // YYYY-MM — untuk grouping penggajian
  dicatat_oleh: int('dicatat_oleh').references(() => karyawan.id),
  ...tenantField,
  ...timestamps,
}, (t) => [
  idx('idx_si_karyawan_bulan').on(t.karyawan_id, t.periode_bulan),
])

// ─── Shift Kasir ────────────────────────────────────────────────────────────

export const shift_kasir = table('shift_kasir', {
  id: pkInt('id'),
  karyawan_id: int('karyawan_id').notNull().references(() => karyawan.id),
  tanggal: txt('tanggal').notNull(),
  jam_buka: txt('jam_buka').notNull(),
  jam_tutup: txt('jam_tutup'),
  kas_awal: flt('kas_awal').notNull().default(0),
  kas_fisik: flt('kas_fisik'),
  kas_sistem: flt('kas_sistem'),    // dihitung: kas_awal + penjualan_tunai
  selisih_kas: flt('selisih_kas'),  // kas_fisik - kas_sistem
  jumlah_transaksi: int('jumlah_transaksi').notNull().default(0),
  total_penjualan: flt('total_penjualan').notNull().default(0),
  catatan: txt('catatan'),
  status: txt('status', { enum: ['buka', 'tutup'] }).notNull().default('buka'),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

// ─── Manajemen Harga ─────────────────────────────────────────────────────────

export const harga_jadwal = table('harga_jadwal', {
  id: pkInt('id'),
  barang_id: int('barang_id').notNull().references(() => barang.id),
  harga_eceran_baru: flt('harga_eceran_baru').notNull(),
  harga_grosir_baru: flt('harga_grosir_baru').notNull(),
  berlaku_mulai: txt('berlaku_mulai').notNull(),
  berlaku_sampai: txt('berlaku_sampai'),
  status: txt('status', { enum: ['draft', 'aktif', 'selesai', 'batal'] }).notNull().default('draft'),
  dibuat_oleh: int('dibuat_oleh').references(() => karyawan.id),
  ...tenantField,
  ...timestamps,
})

// ─── Pengaturan Toko ─────────────────────────────────────────────────────────

export const toko_settings = table('toko_settings', {
  id: pkInt('id'),
  key: txt('key').notNull().unique(),
  value: txt('value'),
  updated_at: txt('updated_at').$defaultFn(isoNow),
})

// ─── Retur Penjualan ──────────────────────────────────────────────────────────

export const retur_penjualan = table('retur_penjualan', {
  id: pkInt('id'),
  no_retur: txt('no_retur').notNull().unique(),
  penjualan_id: int('penjualan_id').notNull().references(() => penjualan.id),
  tanggal: txt('tanggal').notNull(),
  kasir_id: int('kasir_id').references(() => karyawan.id),
  total_retur: flt('total_retur').notNull().default(0),
  alasan: txt('alasan'),
  // tunai = uang kembali ke pelanggan, kurang_piutang = kurangi piutang, tukar_barang = stok saja
  metode_refund: txt('metode_refund', {
    enum: ['tunai', 'kurang_piutang', 'tukar_barang'],
  }).notNull().default('tunai'),
  kas_bank_id: int('kas_bank_id').references(() => kas_bank.id),
  catatan: txt('catatan'),
  ...tenantField,
  ...timestamps,
})

export const retur_penjualan_detail = table('retur_penjualan_detail', {
  id: pkInt('id'),
  retur_id: int('retur_id').notNull().references(() => retur_penjualan.id),
  barang_id: int('barang_id').notNull().references(() => barang.id),
  satuan_id: int('satuan_id').references(() => satuan.id),
  jumlah_retur: flt('jumlah_retur').notNull(),
  harga_jual: flt('harga_jual').notNull(), // harga efektif per unit (sudah dipotong diskon proporsional)
  subtotal: flt('subtotal').notNull(),
  ...tenantField,
})

// Barang pengganti untuk retur dengan metode tukar_barang
export const retur_penjualan_tukar = table('retur_penjualan_tukar', {
  id: pkInt('id'),
  retur_id: int('retur_id').notNull().references(() => retur_penjualan.id),
  barang_id: int('barang_id').notNull().references(() => barang.id),
  satuan_id: int('satuan_id').references(() => satuan.id),
  jumlah: flt('jumlah').notNull(),
  harga_jual: flt('harga_jual').notNull(), // snapshot harga saat retur
  subtotal: flt('subtotal').notNull(),
  ...tenantField,
})

// ═══════════════════════════════════════════════════════════════════════════
// RETUR SUPPLIER (Fase C6)
// ═══════════════════════════════════════════════════════════════════════════

// Kebalikan dari barang_masuk: barang dikembalikan ke supplier.
// Stok dikurangi (mutasi keluar). Hutang dikurangi (kurang_hutang)
// atau kas masuk dari supplier (tunai).
export const retur_supplier = table('retur_supplier', {
  id: pkInt('id'),
  no_retur: txt('no_retur').notNull().unique(),
  barang_masuk_id: int('barang_masuk_id').notNull().references(() => barang_masuk.id),
  supplier_id: int('supplier_id').notNull().references(() => supplier.id),
  tanggal: txt('tanggal').notNull(),
  dicatat_oleh: int('dicatat_oleh').references(() => karyawan.id),
  total_retur: flt('total_retur').notNull().default(0),
  alasan: txt('alasan'),
  // kurang_hutang = kurangi sisa hutang, tunai = terima uang balik
  metode_refund: txt('metode_refund', {
    enum: ['kurang_hutang', 'tunai'],
  }).notNull().default('kurang_hutang'),
  hutang_id: int('hutang_id').references(() => hutang_supplier.id),
  kas_bank_id: int('kas_bank_id').references(() => kas_bank.id),
  catatan: txt('catatan'),
  ...tenantField,
  ...timestamps,
}, (t) => [
  idx('idx_retur_sup_bm').on(t.barang_masuk_id),
  idx('idx_retur_sup_supplier').on(t.supplier_id),
])

export const retur_supplier_detail = table('retur_supplier_detail', {
  id: pkInt('id'),
  retur_id: int('retur_id').notNull().references(() => retur_supplier.id),
  barang_id: int('barang_id').notNull().references(() => barang.id),
  jumlah_retur: flt('jumlah_retur').notNull(),
  harga_beli: flt('harga_beli').notNull(), // snapshot harga dari penerimaan asal
  subtotal: flt('subtotal').notNull(),
  ...tenantField,
})

// ─── Notifikasi Terpusat ──────────────────────────────────────────────────────

export const notifikasi_config = table('notifikasi_config', {
  id: pkInt('id'),
  jenis: txt('jenis', {
    enum: [
      'stok_habis', 'stok_kritis', 'barang_kadaluarsa',
      'hutang_jatuh_tempo', 'piutang_macet',
      'void_transaksi', 'diskon_tinggi', 'selisih_kas',
      'ringkasan_harian', 'ringkasan_mingguan',
    ],
  }).notNull().unique(),
  aktif: bool('aktif').notNull().default(false),
  channel: txt('channel', { enum: ['wa', 'dashboard', 'keduanya'] }).notNull().default('dashboard'),
  threshold: flt('threshold'),          // hari / % / unit sesuai jenis
  jam_kirim: txt('jam_kirim'),          // HH:MM — untuk scheduled
  hari_kirim: int('hari_kirim'),     // 1-7 (Senin-Minggu) — untuk weekly
  penerima_wa: txt('penerima_wa'),      // nomor HP tujuan
  terakhir_dikirim: txt('terakhir_dikirim'),
  updated_at: txt('updated_at').$defaultFn(isoNow),
  ...tenantField,
})

export const notifikasi_log = table('notifikasi_log', {
  id: pkInt('id'),
  jenis: txt('jenis').notNull(),
  channel: txt('channel', { enum: ['wa', 'dashboard'] }).notNull().default('dashboard'),
  pesan: txt('pesan').notNull(),
  penerima: txt('penerima'),
  status: txt('status', { enum: ['terkirim', 'gagal', 'pending'] }).notNull().default('pending'),
  ...tenantField,
  waktu: txt('waktu').notNull().$defaultFn(isoNow),
  referensi_tipe: txt('referensi_tipe'),
  referensi_id: int('referensi_id'),
}, (t) => [
  idx('idx_notif_log_ref').on(t.referensi_tipe, t.referensi_id, t.waktu),
])

// ─── Budget & Target ──────────────────────────────────────────────────────────

export const target_penjualan = table('target_penjualan', {
  id: pkInt('id'),
  periode_bulan: txt('periode_bulan').notNull().unique(), // format YYYY-MM
  target_omzet: flt('target_omzet').notNull().default(0),
  target_transaksi: int('target_transaksi').notNull().default(0),
  target_margin_pct: flt('target_margin_pct').notNull().default(0), // persen, misal 15.0
  catatan: txt('catatan'),
  dibuat_oleh: int('dibuat_oleh').references(() => karyawan.id),
  ...tenantField,
  ...timestamps,
})

// kategori harus match dengan nilai field kategori di jurnal_kas
export const budget_operasional = table('budget_operasional', {
  id: pkInt('id'),
  periode_bulan: txt('periode_bulan').notNull(), // format YYYY-MM
  kategori: txt('kategori', {
    enum: ['gaji', 'sewa', 'listrik', 'kemasan', 'operasional', 'lain'],
  }).notNull(),
  nilai_budget: flt('nilai_budget').notNull().default(0),
  catatan: txt('catatan'),
  dibuat_oleh: int('dibuat_oleh').references(() => karyawan.id),
  ...tenantField,
  ...timestamps,
})

// ─── Promo & Diskon ───────────────────────────────────────────────────────────

export const promo = table('promo', {
  id: pkInt('id'),
  nama: txt('nama').notNull(),
  deskripsi: txt('deskripsi'),
  tipe: txt('tipe', { enum: ['item', 'kategori', 'total'] }).notNull(),
  nilai: flt('nilai').notNull(),
  tipe_nilai: txt('tipe_nilai', { enum: ['persen', 'rupiah'] }).notNull().default('persen'),
  min_qty: int('min_qty').notNull().default(1),
  min_total: flt('min_total').notNull().default(0),
  berlaku_mulai: txt('berlaku_mulai'),
  berlaku_sampai: txt('berlaku_sampai'),
  max_penggunaan: int('max_penggunaan'),
  jumlah_dipakai: int('jumlah_dipakai').notNull().default(0),
  aktif: bool('aktif').notNull().default(true),
  dibuat_oleh: int('dibuat_oleh').references(() => karyawan.id),
  ...tenantField,
  ...timestamps,
})

export const promo_target = table('promo_target', {
  id: pkInt('id'),
  promo_id: int('promo_id').notNull().references(() => promo.id),
  target_tipe: txt('target_tipe', { enum: ['barang', 'kategori'] }).notNull(),
  target_id: int('target_id').notNull(),
  ...tenantField,
})

// ─── Jadwal & Shift Kerja ─────────────────────────────────────────────────────

export const tipe_shift = table('tipe_shift', {
  id: pkInt('id'),
  nama: txt('nama').notNull(),
  jam_mulai: txt('jam_mulai').notNull(),   // HH:MM
  jam_selesai: txt('jam_selesai').notNull(), // HH:MM
  warna: txt('warna').notNull().default('#00e676'), // hex color for UI badge
  is_active: bool('is_active').notNull().default(true),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

export const jadwal_kerja = table('jadwal_kerja', {
  id: pkInt('id'),
  karyawan_id: int('karyawan_id').notNull().references(() => karyawan.id),
  tipe_shift_id: int('tipe_shift_id').notNull().references(() => tipe_shift.id),
  tanggal: txt('tanggal').notNull(),       // YYYY-MM-DD
  catatan: txt('catatan'),
  dibuat_oleh: int('dibuat_oleh').references(() => karyawan.id),
  ...tenantField,
  ...timestamps,
})

export const tukar_shift = table('tukar_shift', {
  id: pkInt('id'),
  pengaju_id: int('pengaju_id').notNull().references(() => karyawan.id),
  jadwal_id: int('jadwal_id').notNull().references(() => jadwal_kerja.id),
  penerima_id: int('penerima_id').notNull().references(() => karyawan.id),
  jadwal_penerima_id: int('jadwal_penerima_id').references(() => jadwal_kerja.id),
  alasan: txt('alasan'),
  status: txt('status', { enum: ['menunggu', 'disetujui', 'ditolak'] }).notNull().default('menunggu'),
  diproses_oleh: int('diproses_oleh').references(() => karyawan.id),
  catatan_proses: txt('catatan_proses'),
  ...tenantField,
  ...timestamps,
})

// ═══════════════════════════════════════════════════════════════════════════
// DRAFT KERANJANG KASIR
// ═══════════════════════════════════════════════════════════════════════════

export const draft_keranjang = table('draft_keranjang', {
  id: pkInt('id'),
  kasir_id: int('kasir_id').notNull().unique().references(() => karyawan.id),
  pelanggan_id: int('pelanggan_id').references(() => pelanggan.id),
  tipe: txt('tipe', { enum: ['eceran', 'grosir'] }).notNull().default('eceran'),
  ...timestamps,
})

// ═══════════════════════════════════════════════════════════════════════════
// PREFERENSI PENGGUNA (tab order, favorit, dll per karyawan)
// ═══════════════════════════════════════════════════════════════════════════

export const preferensi_pengguna = table('preferensi_pengguna', {
  id: pkInt('id'),
  karyawan_id: int('karyawan_id').notNull().references(() => karyawan.id),
  modul: txt('modul').notNull(),
  nilai_json: txt('nilai_json').notNull().default('{}'),
  updated_at: txt('updated_at').$defaultFn(isoNow),
}, (t) => [
  uidx('uq_preferensi_pengguna').on(t.karyawan_id, t.modul),
])

export const draft_keranjang_item = table('draft_keranjang_item', {
  id: pkInt('id'),
  draft_id: int('draft_id').notNull().references(() => draft_keranjang.id),
  barang_id: int('barang_id').notNull().references(() => barang.id),
  tipe_harga: txt('tipe_harga', { enum: ['eceran', 'grosir'] }).notNull().default('eceran'),
  satuan_id: int('satuan_id').references(() => satuan.id),
  jumlah: flt('jumlah').notNull(),
  harga_jual: flt('harga_jual').notNull(),
  diskon_item: flt('diskon_item').notNull().default(0),
})

// ═══════════════════════════════════════════════════════════════════════════
// SOP ENGINE (Fase B)
// ═══════════════════════════════════════════════════════════════════════════

// Aturan SOP disimpan sebagai data — bukan dikoding di route.
// tipe: checklist = harus diselesaikan sebelum event berlanjut (blocking)
//       notif     = kirim notifikasi saat event terjadi (non-blocking)
//       blokir    = tolak event tanpa syarat tambahan
export const sop_rule = table('sop_rule', {
  id: pkInt('id'),
  nama: txt('nama').notNull(),
  event_name: txt('event_name').notNull(), // misal: 'before:absensi.masuk'
  tipe: txt('tipe', { enum: ['checklist', 'notif', 'blokir'] }).notNull().default('checklist'),
  deskripsi: txt('deskripsi'),
  // JSON: untuk checklist → [{ id, label, wajib }]; untuk notif → { pesan }
  config_json: jsonText('config_json'),
  is_active: bool('is_active').notNull().default(true),
  urutan: int('urutan').notNull().default(0),
  ...tenantField,
  ...timestamps,
}, (t) => [
  idx('idx_sop_rule_event').on(t.event_name),
])

// ═══════════════════════════════════════════════════════════════════════════
// LAMPIRAN / ATTACHMENT (Fase B6)
// ═══════════════════════════════════════════════════════════════════════════

// Tabel generik untuk menyimpan file terlampir ke dokumen apapun.
// Modul baru cukup POST /lampiran dengan referensi_tipe + referensi_id.
// Modul lama (barang/karyawan/barang_masuk) tetap simpan path di kolom sendiri
// tapi pakai saveUpload() dari utils/upload.ts agar logika tidak duplikat.
export const lampiran = table('lampiran', {
  id: pkInt('id'),
  referensi_tipe: txt('referensi_tipe').notNull(), // 'kasbon' | 'sop_instance' | dst
  referensi_id: int('referensi_id').notNull(),
  tipe: txt('tipe', { enum: ['gambar', 'pdf', 'dokumen'] }).notNull().default('gambar'),
  path: txt('path').notNull(),        // relatif dari uploads/
  thumb_path: txt('thumb_path'),      // opsional, thumbnail untuk gambar
  nama_asli: txt('nama_asli'),        // nama file asli dari user
  ukuran: int('ukuran'),           // bytes
  uploaded_by: int('uploaded_by').notNull().references(() => karyawan.id),
  dibuat_at: txt('dibuat_at').notNull().$defaultFn(isoNow),
  ...tenantField,
}, (t) => [
  idx('idx_lampiran_ref').on(t.referensi_tipe, t.referensi_id),
])

// ═══════════════════════════════════════════════════════════════════════════
// APPROVAL GATE (Fase B5)
// ═══════════════════════════════════════════════════════════════════════════

// Primitif approval lintas modul — kasbon, pengeluaran, purchase order, dst.
// Module yang butuh approval: insert satu baris ke sini via mintaApproval().
// Manajer/pemilik setujui/tolak via POST /approval/:id/setujui|tolak.
export const approval = table('approval', {
  id: pkInt('id'),
  referensi_tipe: txt('referensi_tipe').notNull(), // 'kasbon' | 'purchase_order' | dst
  referensi_id: int('referensi_id').notNull(),
  status: txt('status', {
    enum: ['menunggu', 'disetujui', 'ditolak'],
  }).notNull().default('menunggu'),
  diminta_oleh: int('diminta_oleh').notNull().references(() => karyawan.id),
  diproses_oleh: int('diproses_oleh').references(() => karyawan.id),
  catatan_pengaju: txt('catatan_pengaju'),
  catatan_proses: txt('catatan_proses'),
  dibuat_at: txt('dibuat_at').notNull().$defaultFn(isoNow),
  diproses_at: txt('diproses_at'),
  ...tenantField,
}, (t) => [
  idx('idx_approval_ref').on(t.referensi_tipe, t.referensi_id),
  idx('idx_approval_status').on(t.status),
])

// ─── C2: Kunjungan Sales ke Warung ───────────────────────────────────────────
export const kunjungan_sales = table('kunjungan_sales', {
  id: pkInt('id'),
  pelanggan_id: int('pelanggan_id').references(() => pelanggan.id),
  nama_warung: txt('nama_warung').notNull(),
  alamat: txt('alamat'),
  petugas_id: int('petugas_id').references(() => karyawan.id),
  tanggal: txt('tanggal').notNull(),
  tujuan: txt('tujuan', {
    enum: ['prospek', 'follow_up', 'pengiriman', 'lainnya'],
  }).notNull().default('prospek'),
  hasil: txt('hasil'),
  catatan: txt('catatan'),
  status_tindak_lanjut: txt('status_tindak_lanjut', {
    enum: ['open', 'selesai', 'pending'],
  }).notNull().default('open'),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

// ─── C2: Agenda Supplier ──────────────────────────────────────────────────────
export const agenda_supplier = table('agenda_supplier', {
  id: pkInt('id'),
  supplier_id: int('supplier_id').references(() => supplier.id),
  nama_supplier: txt('nama_supplier').notNull(),
  tipe: txt('tipe', {
    enum: ['kunjungan', 'negosiasi', 'pengiriman', 'lainnya'],
  }).notNull().default('kunjungan'),
  tanggal: txt('tanggal').notNull(),
  jam: txt('jam'),
  lokasi: txt('lokasi'),
  petugas_id: int('petugas_id').references(() => karyawan.id),
  hasil: txt('hasil'),
  catatan: txt('catatan'),
  status: txt('status', {
    enum: ['dijadwalkan', 'selesai', 'dibatalkan'],
  }).notNull().default('dijadwalkan'),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

// ─── C3: Permintaan Pelanggan ─────────────────────────────────────────────────
export const permintaan_pelanggan = table('permintaan_pelanggan', {
  id: pkInt('id'),
  pelanggan_id: int('pelanggan_id').references(() => pelanggan.id),
  nama_pelanggan: txt('nama_pelanggan'),
  nama_barang: txt('nama_barang').notNull(),
  barang_id: int('barang_id').references(() => barang.id),
  qty_minta: int('qty_minta'),
  catatan: txt('catatan'),
  status: txt('status', {
    enum: ['menunggu', 'tersedia', 'tidak_tersedia'],
  }).notNull().default('menunggu'),
  tanggal: txt('tanggal').notNull(),
  ditangani_oleh: int('ditangani_oleh').references(() => karyawan.id),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

// ─── C3: Komplain Pelanggan ───────────────────────────────────────────────────
export const komplain_pelanggan = table('komplain_pelanggan', {
  id: pkInt('id'),
  pelanggan_id: int('pelanggan_id').references(() => pelanggan.id),
  nama_pelanggan: txt('nama_pelanggan'),
  kategori: txt('kategori', {
    enum: ['kualitas_barang', 'pelayanan', 'harga', 'pengiriman', 'lainnya'],
  }).notNull().default('lainnya'),
  deskripsi: txt('deskripsi').notNull(),
  tanggal: txt('tanggal').notNull(),
  status: txt('status', {
    enum: ['masuk', 'diproses', 'selesai', 'ditolak'],
  }).notNull().default('masuk'),
  resolusi: txt('resolusi'),
  ditangani_oleh: int('ditangani_oleh').references(() => karyawan.id),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

// ─── C5: Pinjaman & Investasi ─────────────────────────────────────────────────
export const pinjaman_investasi = table('pinjaman_investasi', {
  id: pkInt('id'),
  tipe: txt('tipe', { enum: ['pinjaman', 'investasi'] }).notNull(),
  nama: txt('nama').notNull(),
  jumlah_pokok: int('jumlah_pokok').notNull(),
  bunga_persen: flt('bunga_persen').notNull().default(0),
  cicilan_per_bulan: int('cicilan_per_bulan').notNull().default(0),
  tanggal_mulai: txt('tanggal_mulai').notNull(),
  jatuh_tempo: txt('jatuh_tempo'),
  sisa_pokok: int('sisa_pokok').notNull(),
  status: txt('status', { enum: ['aktif', 'lunas', 'macet'] }).notNull().default('aktif'),
  catatan: txt('catatan'),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

// ─── C5: Tamu Birokrasi ───────────────────────────────────────────────────────
export const tamu_birokrasi = table('tamu_birokrasi', {
  id: pkInt('id'),
  nama_tamu: txt('nama_tamu').notNull(),
  instansi: txt('instansi'),
  keperluan: txt('keperluan').notNull(),
  tanggal: txt('tanggal').notNull(),
  jam_masuk: txt('jam_masuk'),
  jam_keluar: txt('jam_keluar'),
  keterangan: txt('keterangan'),
  dicatat_oleh: int('dicatat_oleh').references(() => karyawan.id),
  ...tenantField,
  ...timestamps,
})

// ─── C4: Inventaris Aset Tetap ───────────────────────────────────────────────
export const aset_tetap = table('aset_tetap', {
  id: pkInt('id'),
  nama: txt('nama').notNull(),
  kategori: txt('kategori').notNull().default('Lainnya'),
  nilai_beli: int('nilai_beli').notNull().default(0),
  nilai_sekarang: int('nilai_sekarang').notNull().default(0),
  tanggal_beli: txt('tanggal_beli'),
  kondisi: txt('kondisi', {
    enum: ['baik', 'rusak_ringan', 'rusak_berat', 'dijual', 'dibuang'],
  }).notNull().default('baik'),
  lokasi: txt('lokasi'),
  catatan: txt('catatan'),
  is_active: bool('is_active').notNull().default(true),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

// ─── C4: Tagihan Utilitas (Listrik, Air, Internet, dll) ──────────────────────
export const tagihan_utilitas = table('tagihan_utilitas', {
  id: pkInt('id'),
  jenis: txt('jenis', {
    enum: ['listrik', 'air', 'internet', 'lainnya'],
  }).notNull().default('listrik'),
  periode_bulan: txt('periode_bulan').notNull(),
  jumlah: int('jumlah').notNull().default(0),
  tanggal_bayar: txt('tanggal_bayar'),
  meter_awal: int('meter_awal'),
  meter_akhir: int('meter_akhir'),
  catatan: txt('catatan'),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

// ─── C5: Checklist Tugas Harian (Kebersihan, dll) ────────────────────────────
export const checklist_item = table('checklist_item', {
  id: pkInt('id'),
  nama: txt('nama').notNull(),
  kategori: txt('kategori').notNull().default('kebersihan'),
  urutan: int('urutan').notNull().default(0),
  is_active: bool('is_active').notNull().default(true),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

export const checklist_log = table('checklist_log', {
  id: pkInt('id'),
  item_id: int('item_id').notNull().references(() => checklist_item.id),
  tanggal: txt('tanggal').notNull(),
  karyawan_id: int('karyawan_id').references(() => karyawan.id),
  selesai: bool('selesai').notNull().default(false),
  catatan: txt('catatan'),
  ...tenantField,
  ...timestamps,
}, (t) => [
  idx('idx_checklist_log_tanggal').on(t.tanggal),
  idx('idx_checklist_log_item').on(t.item_id),
])

// ─── C2: Pipeline Grosir ─────────────────────────────────────────────────────
export const pipeline_grosir = table('pipeline_grosir', {
  id: pkInt('id'),
  nama_pelanggan: txt('nama_pelanggan').notNull(),
  pelanggan_id: int('pelanggan_id').references(() => pelanggan.id),
  nilai_estimasi: int('nilai_estimasi').notNull().default(0),
  tahap: txt('tahap', {
    enum: ['prospek', 'dikunjungi', 'penawaran', 'negosiasi', 'deal', 'batal'],
  }).notNull().default('prospek'),
  petugas_id: int('petugas_id').references(() => karyawan.id),
  produk_minat: txt('produk_minat'),
  catatan: txt('catatan'),
  tanggal_masuk: txt('tanggal_masuk').notNull(),
  tanggal_update: txt('tanggal_update'),
  ...tenantField,
  ...auditFields,
  ...timestamps,
}, (t) => [
  idx('idx_pipeline_tahap').on(t.tahap),
])

// ─── C5: Acara / Hajatan Besar ───────────────────────────────────────────────
export const acara_hajatan = table('acara_hajatan', {
  id: pkInt('id'),
  nama_acara: txt('nama_acara').notNull(),
  nama_penyelenggara: txt('nama_penyelenggara').notNull(),
  pelanggan_id: int('pelanggan_id').references(() => pelanggan.id),
  tanggal_acara: txt('tanggal_acara').notNull(),
  alamat: txt('alamat'),
  estimasi_tamu: int('estimasi_tamu'),
  catatan: txt('catatan'),
  status: txt('status', {
    enum: ['persiapan', 'konfirmasi', 'selesai', 'batal'],
  }).notNull().default('persiapan'),
  total_order: int('total_order').notNull().default(0),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

// ─── C5: Inspeksi Toko ───────────────────────────────────────────────────────
export const inspeksi_toko = table('inspeksi_toko', {
  id: pkInt('id'),
  tanggal: txt('tanggal').notNull(),
  jenis: txt('jenis', {
    enum: ['rutin', 'mendadak', 'bulanan', 'tahunan'],
  }).notNull().default('rutin'),
  petugas_id: int('petugas_id').references(() => karyawan.id),
  area: txt('area'),
  temuan: txt('temuan'),
  tindakan: txt('tindakan'),
  nilai: int('nilai'),
  status: txt('status', {
    enum: ['draft', 'selesai'],
  }).notNull().default('draft'),
  catatan: txt('catatan'),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

// Jejak eksekusi tiap rule per transaksi/karyawan
export const sop_instance = table('sop_instance', {
  id: pkInt('id'),
  rule_id: int('rule_id').notNull().references(() => sop_rule.id),
  karyawan_id: int('karyawan_id').references(() => karyawan.id),
  status: txt('status', {
    enum: ['pending', 'selesai', 'timeout', 'dibatalkan'],
  }).notNull().default('pending'),
  payload_json: jsonText('payload_json'), // event payload
  hasil_json: jsonText('hasil_json'),     // hasil checklist / bukti
  dibuat_at: txt('dibuat_at').notNull().$defaultFn(isoNow),
  diselesaikan_at: txt('diselesaikan_at'),
}, (t) => [
  idx('idx_sop_instance_rule').on(t.rule_id),
  idx('idx_sop_instance_karyawan').on(t.karyawan_id),
  idx('idx_sop_instance_status').on(t.status),
])
