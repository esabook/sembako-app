import { sql } from 'drizzle-orm'
import {
  integer,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core'

// ─── Helper timestamp ──────────────────────────────────────────────────────
const timestamps = {
  created_at: text('created_at').default(sql`(datetime('now','localtime'))`),
  updated_at: text('updated_at').default(sql`(datetime('now','localtime'))`),
}

// ═══════════════════════════════════════════════════════════════════════════
// TABEL SISTEM
// ═══════════════════════════════════════════════════════════════════════════

export const karyawan = sqliteTable('karyawan', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kode_karyawan: text('kode_karyawan').notNull().unique(),
  nama: text('nama').notNull(),
  role: text('role', { enum: ['pemilik', 'manajer', 'kasir', 'gudang'] }).notNull(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  gaji_pokok: real('gaji_pokok').notNull().default(0),
  tipe_gaji: text('tipe_gaji', { enum: ['harian', 'bulanan'] }).notNull().default('bulanan'),
  kontak: text('kontak'),
  foto_path: text('foto_path'),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
})

export const log_aktivitas = sqliteTable('log_aktivitas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  karyawan_id: integer('karyawan_id').references(() => karyawan.id),
  aksi: text('aksi').notNull(),
  modul: text('modul').notNull(),
  referensi_id: integer('referensi_id'),
  detail_json: text('detail_json', { mode: 'json' }),
  waktu: text('waktu').default(sql`(datetime('now','localtime'))`),
  ip_address: text('ip_address'),
})

export const wa_templates = sqliteTable('wa_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kode: text('kode').notNull().unique(),
  teks: text('teks').notNull(),
  aktif: integer('aktif', { mode: 'boolean' }).notNull().default(true),
})

export const periode_laporan = sqliteTable('periode_laporan', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  periode_mulai: text('periode_mulai').notNull(),
  periode_selesai: text('periode_selesai').notNull(),
  tipe_laporan: text('tipe_laporan', { enum: ['laba_rugi', 'arus_kas', 'neraca'] }).notNull(),
  status: text('status', { enum: ['draft', 'final', 'approved'] }).notNull().default('draft'),
  data_json: text('data_json', { mode: 'json' }),
  dibuat_oleh: integer('dibuat_oleh').references(() => karyawan.id),
  diapprove_oleh: integer('diapprove_oleh').references(() => karyawan.id),
  ...timestamps,
})

// ═══════════════════════════════════════════════════════════════════════════
// MASTER DATA
// ═══════════════════════════════════════════════════════════════════════════

export const kategori = sqliteTable('kategori', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nama: text('nama').notNull().unique(),
  contoh: text('contoh'),
  is_preset: integer('is_preset', { mode: 'boolean' }).notNull().default(false),
})

export const satuan = sqliteTable('satuan', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nama: text('nama').notNull().unique(),
  singkatan: text('singkatan').notNull(),
  contoh: text('contoh'),
  is_preset: integer('is_preset', { mode: 'boolean' }).notNull().default(false),
})

export const barang = sqliteTable('barang', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kode_barang: text('kode_barang').notNull().unique(),
  nama_barang: text('nama_barang').notNull(),
  kategori_id: integer('kategori_id').references(() => kategori.id),
  satuan_dasar_id: integer('satuan_dasar_id').references(() => satuan.id),
  // JSON: [{ satuan_id, faktor }] misal 1 karton = 24 pcs
  konversi_satuan: text('konversi_satuan', { mode: 'json' }),
  harga_beli_terakhir: real('harga_beli_terakhir').notNull().default(0),
  harga_jual_eceran: real('harga_jual_eceran').notNull().default(0),
  harga_jual_grosir: real('harga_jual_grosir').notNull().default(0),
  stok_minimum: real('stok_minimum').notNull().default(0),
  stok_sekarang: real('stok_sekarang').notNull().default(0),
  lokasi_rak: text('lokasi_rak'),
  foto_path: text('foto_path'),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
})

export const supplier = sqliteTable('supplier', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kode_supplier: text('kode_supplier').notNull().unique(),
  nama_supplier: text('nama_supplier').notNull(),
  kontak: text('kontak'),
  alamat: text('alamat'),
  terms_bayar: integer('terms_bayar').notNull().default(0),
  limit_hutang: real('limit_hutang').notNull().default(0),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
})

export const pelanggan = sqliteTable('pelanggan', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kode_pelanggan: text('kode_pelanggan').notNull().unique(),
  nama: text('nama').notNull(),
  gender: text('gender', { enum: ['pria', 'wanita'] }),
  tipe: text('tipe', { enum: ['eceran', 'grosir', 'langganan'] }).notNull().default('eceran'),
  kontak: text('kontak'),
  alamat: text('alamat'),
  limit_piutang: real('limit_piutang').notNull().default(0),
  saldo_piutang: real('saldo_piutang').notNull().default(0),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
})

export const kartu_anggota = sqliteTable('kartu_anggota', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  no_kartu: text('no_kartu').notNull().unique(), // 10 digit
  tier: text('tier', { enum: ['reguler', 'silver', 'gold'] }).notNull().default('reguler'),
  diskon_member: real('diskon_member').notNull().default(0), // persen
  poin: integer('poin').notNull().default(0),
  pelanggan_id: integer('pelanggan_id').references(() => pelanggan.id), // null = belum di-assign
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
})

// ═══════════════════════════════════════════════════════════════════════════
// HISTORI HARGA
// ═══════════════════════════════════════════════════════════════════════════

export const histori_harga_beli = sqliteTable('histori_harga_beli', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  barang_id: integer('barang_id').notNull().references(() => barang.id),
  supplier_id: integer('supplier_id').references(() => supplier.id),
  barang_masuk_id: integer('barang_masuk_id'),
  harga_beli: real('harga_beli').notNull(),
  tanggal_berlaku: text('tanggal_berlaku').notNull(),
})

export const histori_harga_jual = sqliteTable('histori_harga_jual', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  barang_id: integer('barang_id').notNull().references(() => barang.id),
  harga_eceran: real('harga_eceran').notNull(),
  harga_grosir: real('harga_grosir').notNull(),
  tanggal_berlaku: text('tanggal_berlaku').notNull(),
  tanggal_berakhir: text('tanggal_berakhir'),
  diubah_oleh: integer('diubah_oleh').references(() => karyawan.id),
})

// ═══════════════════════════════════════════════════════════════════════════
// MODUL PEMBELIAN
// ═══════════════════════════════════════════════════════════════════════════

export const purchase_order = sqliteTable('purchase_order', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  no_po: text('no_po').notNull().unique(),
  supplier_id: integer('supplier_id').notNull().references(() => supplier.id),
  tanggal_po: text('tanggal_po').notNull(),
  tanggal_estimasi_datang: text('tanggal_estimasi_datang'),
  status: text('status', {
    enum: ['draft', 'dikirim', 'sebagian', 'lunas', 'batal'],
  }).notNull().default('draft'),
  total_nilai: real('total_nilai').notNull().default(0),
  dibuat_oleh: integer('dibuat_oleh').references(() => karyawan.id),
  ...timestamps,
})

export const po_detail = sqliteTable('po_detail', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  po_id: integer('po_id').notNull().references(() => purchase_order.id),
  barang_id: integer('barang_id').notNull().references(() => barang.id),
  satuan_id: integer('satuan_id').references(() => satuan.id),
  jumlah_pesan: real('jumlah_pesan').notNull(),
  jumlah_diterima: real('jumlah_diterima').notNull().default(0),
  harga_beli_estimasi: real('harga_beli_estimasi').notNull().default(0),
})

export const barang_masuk = sqliteTable('barang_masuk', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  no_penerimaan: text('no_penerimaan').notNull().unique(),
  po_id: integer('po_id').references(() => purchase_order.id),
  supplier_id: integer('supplier_id').notNull().references(() => supplier.id),
  tanggal_terima: text('tanggal_terima').notNull(),
  no_faktur_supplier: text('no_faktur_supplier'),
  foto_faktur_path: text('foto_faktur_path'),
  total_nilai: real('total_nilai').notNull().default(0),
  diterima_oleh: integer('diterima_oleh').references(() => karyawan.id),
  ...timestamps,
})

export const barang_masuk_detail = sqliteTable('barang_masuk_detail', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  penerimaan_id: integer('penerimaan_id').notNull().references(() => barang_masuk.id),
  barang_id: integer('barang_id').notNull().references(() => barang.id),
  satuan_id: integer('satuan_id').references(() => satuan.id),
  jumlah_terima: real('jumlah_terima').notNull(),
  harga_beli: real('harga_beli').notNull(),
  tgl_kadaluarsa: text('tgl_kadaluarsa'),
})

// ═══════════════════════════════════════════════════════════════════════════
// MODUL PENJUALAN
// ═══════════════════════════════════════════════════════════════════════════

export const penjualan = sqliteTable('penjualan', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  no_transaksi: text('no_transaksi').notNull().unique(),
  pelanggan_id: integer('pelanggan_id').references(() => pelanggan.id),
  tanggal: text('tanggal').notNull(),
  tipe: text('tipe', { enum: ['eceran', 'grosir'] }).notNull().default('eceran'),
  kasir_id: integer('kasir_id').references(() => karyawan.id),
  subtotal: real('subtotal').notNull().default(0),
  diskon_total: real('diskon_total').notNull().default(0),
  total: real('total').notNull().default(0),
  metode_bayar: text('metode_bayar', {
    enum: ['tunai', 'transfer', 'qris', 'hutang'],
  }).notNull(),
  bayar: real('bayar').notNull().default(0),
  kembalian: real('kembalian').notNull().default(0),
  status: text('status', { enum: ['lunas', 'hutang', 'void'] }).notNull().default('lunas'),
  ...timestamps,
})

export const penjualan_detail = sqliteTable('penjualan_detail', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  penjualan_id: integer('penjualan_id').notNull().references(() => penjualan.id),
  barang_id: integer('barang_id').notNull().references(() => barang.id),
  satuan_id: integer('satuan_id').references(() => satuan.id),
  jumlah: real('jumlah').notNull(),
  harga_jual: real('harga_jual').notNull(), // snapshot — jangan ambil dari master
  diskon_item: real('diskon_item').notNull().default(0),
  subtotal: real('subtotal').notNull(),
})

// ═══════════════════════════════════════════════════════════════════════════
// MODUL STOK
// ═══════════════════════════════════════════════════════════════════════════

export const mutasi_stok = sqliteTable('mutasi_stok', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  barang_id: integer('barang_id').notNull().references(() => barang.id),
  tanggal: text('tanggal').notNull(),
  jenis: text('jenis', { enum: ['masuk', 'keluar', 'koreksi', 'opname'] }).notNull(),
  referensi_tipe: text('referensi_tipe'),
  referensi_id: integer('referensi_id'),
  jumlah_sebelum: real('jumlah_sebelum').notNull(),
  jumlah_perubahan: real('jumlah_perubahan').notNull(),
  jumlah_sesudah: real('jumlah_sesudah').notNull(),
  dicatat_oleh: integer('dicatat_oleh').references(() => karyawan.id),
})

export const stok_opname = sqliteTable('stok_opname', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  no_opname: text('no_opname').notNull().unique(),
  tanggal_mulai: text('tanggal_mulai').notNull(),
  tanggal_selesai: text('tanggal_selesai'),
  status: text('status', {
    enum: ['draft', 'proses', 'selesai', 'approved'],
  }).notNull().default('draft'),
  diapprove_oleh: integer('diapprove_oleh').references(() => karyawan.id),
  ...timestamps,
})

export const stok_opname_detail = sqliteTable('stok_opname_detail', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  opname_id: integer('opname_id').notNull().references(() => stok_opname.id),
  barang_id: integer('barang_id').notNull().references(() => barang.id),
  stok_sistem: real('stok_sistem').notNull(),
  stok_fisik: real('stok_fisik'),
  selisih: real('selisih'),
  alasan_selisih: text('alasan_selisih'),
  dihitung_oleh: integer('dihitung_oleh').references(() => karyawan.id),
})

// ═══════════════════════════════════════════════════════════════════════════
// MODUL KEUANGAN
// ═══════════════════════════════════════════════════════════════════════════

export const kas_bank = sqliteTable('kas_bank', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nama: text('nama').notNull(),
  tipe: text('tipe', { enum: ['kas', 'bank'] }).notNull(),
  saldo_awal: real('saldo_awal').notNull().default(0),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
})

export const jurnal_kas = sqliteTable('jurnal_kas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tanggal: text('tanggal').notNull(),
  kas_bank_id: integer('kas_bank_id').notNull().references(() => kas_bank.id),
  jenis: text('jenis', { enum: ['masuk', 'keluar'] }).notNull(),
  kategori: text('kategori').notNull(),
  referensi_tipe: text('referensi_tipe'),
  referensi_id: integer('referensi_id'),
  keterangan: text('keterangan'),
  jumlah: real('jumlah').notNull(),
  dicatat_oleh: integer('dicatat_oleh').references(() => karyawan.id),
  ...timestamps,
})

export const hutang_supplier = sqliteTable('hutang_supplier', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  supplier_id: integer('supplier_id').notNull().references(() => supplier.id),
  barang_masuk_id: integer('barang_masuk_id').notNull().references(() => barang_masuk.id),
  tanggal_hutang: text('tanggal_hutang').notNull(),
  tanggal_jatuh_tempo: text('tanggal_jatuh_tempo'),
  total_hutang: real('total_hutang').notNull(),
  sisa_hutang: real('sisa_hutang').notNull(),
  status: text('status', { enum: ['belum', 'sebagian', 'lunas'] }).notNull().default('belum'),
  ...timestamps,
})

export const pembayaran_hutang = sqliteTable('pembayaran_hutang', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  hutang_id: integer('hutang_id').notNull().references(() => hutang_supplier.id),
  tanggal_bayar: text('tanggal_bayar').notNull(),
  jumlah_bayar: real('jumlah_bayar').notNull(),
  kas_bank_id: integer('kas_bank_id').notNull().references(() => kas_bank.id),
  dibayar_oleh: integer('dibayar_oleh').references(() => karyawan.id),
  ...timestamps,
})

export const piutang_pelanggan = sqliteTable('piutang_pelanggan', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pelanggan_id: integer('pelanggan_id').notNull().references(() => pelanggan.id),
  penjualan_id: integer('penjualan_id').notNull().references(() => penjualan.id),
  tanggal_piutang: text('tanggal_piutang').notNull(),
  tanggal_jatuh_tempo: text('tanggal_jatuh_tempo'),
  total_piutang: real('total_piutang').notNull(),
  sisa_piutang: real('sisa_piutang').notNull(),
  status: text('status', { enum: ['belum', 'sebagian', 'lunas'] }).notNull().default('belum'),
  ...timestamps,
})

export const pembayaran_piutang = sqliteTable('pembayaran_piutang', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  piutang_id: integer('piutang_id').notNull().references(() => piutang_pelanggan.id),
  tanggal_bayar: text('tanggal_bayar').notNull(),
  jumlah_bayar: real('jumlah_bayar').notNull(),
  kas_bank_id: integer('kas_bank_id').notNull().references(() => kas_bank.id),
  diterima_oleh: integer('diterima_oleh').references(() => karyawan.id),
  ...timestamps,
})

// ═══════════════════════════════════════════════════════════════════════════
// MODUL KARYAWAN & PENGGAJIAN
// ═══════════════════════════════════════════════════════════════════════════

export const absensi = sqliteTable('absensi', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  karyawan_id: integer('karyawan_id').notNull().references(() => karyawan.id),
  tanggal: text('tanggal').notNull(),
  jam_masuk: text('jam_masuk'),
  jam_keluar: text('jam_keluar'),
  shift: text('shift'),
  status: text('status', {
    enum: ['hadir', 'izin', 'sakit', 'alpa'],
  }).notNull().default('hadir'),
  dicatat_oleh: integer('dicatat_oleh').references(() => karyawan.id),
})

export const penggajian = sqliteTable('penggajian', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  karyawan_id: integer('karyawan_id').notNull().references(() => karyawan.id),
  periode_bulan: text('periode_bulan').notNull(),
  hari_kerja: integer('hari_kerja').notNull().default(0),
  hari_hadir: integer('hari_hadir').notNull().default(0),
  gaji_pokok: real('gaji_pokok').notNull(),
  tunjangan: real('tunjangan').notNull().default(0),
  potongan_kasbon: real('potongan_kasbon').notNull().default(0),
  potongan_lain: real('potongan_lain').notNull().default(0),
  total_gaji: real('total_gaji').notNull(),
  status: text('status', { enum: ['draft', 'approved', 'dibayar'] }).notNull().default('draft'),
  ...timestamps,
})

export const kasbon = sqliteTable('kasbon', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  karyawan_id: integer('karyawan_id').notNull().references(() => karyawan.id),
  tanggal_pinjam: text('tanggal_pinjam').notNull(),
  jumlah: real('jumlah').notNull(),
  cicilan_per_bulan: real('cicilan_per_bulan').notNull().default(0),
  sisa_kasbon: real('sisa_kasbon').notNull(),
  status: text('status', { enum: ['aktif', 'lunas'] }).notNull().default('aktif'),
  ...timestamps,
})
