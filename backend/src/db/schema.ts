import { sql } from 'drizzle-orm'
import {
  check,
  index,
  uniqueIndex,
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

// ─── A1: tenant_id — siap multi-tenant, DEFAULT 1, belum dienforce ──────────
// Pasang sekarang di semua tabel transaksional; RLS aktif di Fase D (Postgres).
const tenantField = {
  tenant_id: integer('tenant_id').notNull().default(1),
}

// ─── A2: audit fields — siap tracking siapa buat/ubah ───────────────────────
// Nullable: tabel lama tidak kehilangan data; isi otomatis di route via getAuditBy().
// Tabel yang sudah punya dibuat_oleh/dicatat_oleh tetap dipertahankan — migrasi
// ke pola seragam ini dilakukan bertahap saat menyentuh route terkait.
const auditFields = {
  created_by: integer('created_by'),
  updated_by: integer('updated_by'),
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
  pin_absensi: text('pin_absensi'),
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
  kode: text('kode'),
  contoh: text('contoh'),
  is_preset: integer('is_preset', { mode: 'boolean' }).notNull().default(false),
  ...auditFields,
})

export const satuan = sqliteTable('satuan', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nama: text('nama').notNull().unique(),
  singkatan: text('singkatan').notNull(),
  contoh: text('contoh'),
  is_preset: integer('is_preset', { mode: 'boolean' }).notNull().default(false),
  ...auditFields,
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
  harga_beli_rata: real('harga_beli_rata').notNull().default(0),
  harga_jual_eceran: real('harga_jual_eceran').notNull().default(0),
  harga_jual_grosir: real('harga_jual_grosir').notNull().default(0),
  stok_minimum: real('stok_minimum').notNull().default(0),
  stok_sekarang: real('stok_sekarang').notNull().default(0),
  lokasi_rak: text('lokasi_rak'),
  foto_path: text('foto_path'),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  ...tenantField,
  ...auditFields,
  ...timestamps,
}, () => [
  check('chk_barang_harga_jual_eceran', sql`harga_jual_eceran >= 0`),
  check('chk_barang_harga_jual_grosir', sql`harga_jual_grosir >= 0`),
  check('chk_barang_stok', sql`stok_sekarang >= 0`),
])

export const supplier = sqliteTable('supplier', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kode_supplier: text('kode_supplier').notNull().unique(),
  nama_supplier: text('nama_supplier').notNull(),
  kontak: text('kontak'),
  alamat: text('alamat'),
  terms_bayar: integer('terms_bayar').notNull().default(0),
  limit_hutang: real('limit_hutang').notNull().default(0),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  ...tenantField,
  ...auditFields,
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
  ...tenantField,
  ...auditFields,
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
  ...tenantField,
  ...auditFields,
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
  dicatat_oleh: integer('dicatat_oleh').references(() => karyawan.id),
  ...tenantField,
})

export const histori_harga_jual = sqliteTable('histori_harga_jual', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  barang_id: integer('barang_id').notNull().references(() => barang.id),
  harga_eceran: real('harga_eceran').notNull(),
  harga_grosir: real('harga_grosir').notNull(),
  tanggal_berlaku: text('tanggal_berlaku').notNull(),
  tanggal_berakhir: text('tanggal_berakhir'),
  diubah_oleh: integer('diubah_oleh').references(() => karyawan.id),
  ...tenantField,
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
  ...tenantField,
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
  ...tenantField,
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
  ...tenantField,
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
  ...tenantField,
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
  ...tenantField,
  ...timestamps,
}, (t) => [
  index('idx_penjualan_tanggal').on(t.tanggal),
  index('idx_penjualan_status').on(t.status),
  index('idx_penjualan_kasir').on(t.kasir_id),
  check('chk_penjualan_subtotal', sql`${t.subtotal} >= 0`),
  check('chk_penjualan_total', sql`${t.total} >= 0`),
  check('chk_penjualan_diskon', sql`${t.diskon_total} >= 0`),
  check('chk_penjualan_bayar', sql`${t.bayar} >= 0`),
  check('chk_penjualan_kembalian', sql`${t.kembalian} >= 0`),
])

export const penjualan_detail = sqliteTable('penjualan_detail', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  penjualan_id: integer('penjualan_id').notNull().references(() => penjualan.id),
  barang_id: integer('barang_id').notNull().references(() => barang.id),
  satuan_id: integer('satuan_id').references(() => satuan.id),
  jumlah: real('jumlah').notNull(),
  harga_jual: real('harga_jual').notNull(), // snapshot — jangan ambil dari master
  diskon_item: real('diskon_item').notNull().default(0),
  subtotal: real('subtotal').notNull(),
  ...tenantField,
}, (t) => [
  index('idx_penjualan_detail_trx').on(t.penjualan_id),
  check('chk_detail_jumlah_pos', sql`${t.jumlah} > 0`),
  check('chk_detail_harga_pos', sql`${t.harga_jual} >= 0`),
  check('chk_detail_diskon_pos', sql`${t.diskon_item} >= 0`),
  check('chk_detail_subtotal_pos', sql`${t.subtotal} >= 0`),
])

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
  ...tenantField,
}, (t) => [
  index('idx_mutasi_stok_barang').on(t.barang_id),
  index('idx_mutasi_stok_tanggal').on(t.tanggal),
])

export const stok_opname = sqliteTable('stok_opname', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  no_opname: text('no_opname').notNull().unique(),
  tanggal_mulai: text('tanggal_mulai').notNull(),
  tanggal_selesai: text('tanggal_selesai'),
  status: text('status', {
    enum: ['draft', 'proses', 'selesai', 'approved'],
  }).notNull().default('draft'),
  diapprove_oleh: integer('diapprove_oleh').references(() => karyawan.id),
  ...tenantField,
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
  ...tenantField,
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
  ...tenantField,
  ...auditFields,
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
  ...tenantField,
  ...timestamps,
}, (t) => [
  index('idx_jurnal_kas_tanggal').on(t.tanggal),
  index('idx_jurnal_kas_akun').on(t.kas_bank_id),
])

export const hutang_supplier = sqliteTable('hutang_supplier', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  supplier_id: integer('supplier_id').notNull().references(() => supplier.id),
  barang_masuk_id: integer('barang_masuk_id').notNull().references(() => barang_masuk.id),
  tanggal_hutang: text('tanggal_hutang').notNull(),
  tanggal_jatuh_tempo: text('tanggal_jatuh_tempo'),
  total_hutang: real('total_hutang').notNull(),
  sisa_hutang: real('sisa_hutang').notNull(),
  status: text('status', { enum: ['belum', 'sebagian', 'lunas'] }).notNull().default('belum'),
  ...tenantField,
  ...auditFields,
  ...timestamps,
}, (t) => [
  index('idx_hutang_status').on(t.status),
  index('idx_hutang_jatuh').on(t.tanggal_jatuh_tempo),
])

export const pembayaran_hutang = sqliteTable('pembayaran_hutang', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  hutang_id: integer('hutang_id').notNull().references(() => hutang_supplier.id),
  tanggal_bayar: text('tanggal_bayar').notNull(),
  jumlah_bayar: real('jumlah_bayar').notNull(),
  kas_bank_id: integer('kas_bank_id').notNull().references(() => kas_bank.id),
  dibayar_oleh: integer('dibayar_oleh').references(() => karyawan.id),
  ...tenantField,
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
  ...tenantField,
  ...auditFields,
  ...timestamps,
}, (t) => [
  index('idx_piutang_status').on(t.status),
  index('idx_piutang_jatuh').on(t.tanggal_jatuh_tempo),
  check('chk_piutang_total_pos', sql`${t.total_piutang} > 0`),
  check('chk_piutang_sisa_pos', sql`${t.sisa_piutang} >= 0`),
  check('chk_piutang_sisa_lte_total', sql`${t.sisa_piutang} <= ${t.total_piutang}`),
])

export const pembayaran_piutang = sqliteTable('pembayaran_piutang', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  piutang_id: integer('piutang_id').notNull().references(() => piutang_pelanggan.id),
  tanggal_bayar: text('tanggal_bayar').notNull(),
  jumlah_bayar: real('jumlah_bayar').notNull(),
  kas_bank_id: integer('kas_bank_id').notNull().references(() => kas_bank.id),
  diterima_oleh: integer('diterima_oleh').references(() => karyawan.id),
  ...tenantField,
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
  terlambat_menit: integer('terlambat_menit'),
  dicatat_oleh: integer('dicatat_oleh').references(() => karyawan.id),
  ...tenantField,
}, (t) => [
  index('idx_absensi_tanggal').on(t.tanggal),
  index('idx_absensi_karyawan').on(t.karyawan_id),
])

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
  ...tenantField,
  ...timestamps,
})

export const kasbon = sqliteTable('kasbon', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  karyawan_id: integer('karyawan_id').notNull().references(() => karyawan.id),
  tanggal_pinjam: text('tanggal_pinjam').notNull(),
  jumlah: real('jumlah').notNull(),
  cicilan_per_bulan: real('cicilan_per_bulan').notNull().default(0),
  sisa_kasbon: real('sisa_kasbon').notNull(),
  status: text('status', {
    enum: ['pengajuan', 'disetujui', 'ditolak', 'aktif', 'lunas'],
  }).notNull().default('pengajuan'),
  disetujui_oleh: integer('disetujui_oleh').references(() => karyawan.id),
  tanggal_cair: text('tanggal_cair'),
  catatan: text('catatan'),
  ...tenantField,
  ...timestamps,
}, (t) => [
  check('chk_kasbon_jumlah_pos', sql`${t.jumlah} > 0`),
  check('chk_kasbon_sisa_pos', sql`${t.sisa_kasbon} >= 0`),
  check('chk_kasbon_cicilan_pos', sql`${t.cicilan_per_bulan} >= 0`),
])

// ═══════════════════════════════════════════════════════════════════════════
// HR LANJUTAN (Fase C1)
// ═══════════════════════════════════════════════════════════════════════════

// Pengajuan izin/cuti/sakit — approval via primitif B5.
// Setelah disetujui, hook akan insert baris absensi otomatis.
export const pengajuan_izin = sqliteTable('pengajuan_izin', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  karyawan_id: integer('karyawan_id').notNull().references(() => karyawan.id),
  jenis: text('jenis', { enum: ['cuti', 'izin', 'sakit'] }).notNull(),
  tanggal_mulai: text('tanggal_mulai').notNull(),
  tanggal_selesai: text('tanggal_selesai').notNull(),
  alasan: text('alasan'),
  bukti_path: text('bukti_path'),         // opsional foto dokter/surat
  status: text('status', {
    enum: ['menunggu', 'disetujui', 'ditolak'],
  }).notNull().default('menunggu'),
  diproses_oleh: integer('diproses_oleh').references(() => karyawan.id),
  catatan_proses: text('catatan_proses'),
  ...tenantField,
  ...timestamps,
}, (t) => [
  index('idx_izin_karyawan').on(t.karyawan_id),
  index('idx_izin_status').on(t.status),
])

// Evaluasi berkala karyawan — penilaian performa oleh manajer/pemilik.
export const evaluasi_karyawan = sqliteTable('evaluasi_karyawan', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  karyawan_id: integer('karyawan_id').notNull().references(() => karyawan.id),
  periode: text('periode').notNull(),        // YYYY-MM atau YYYY-Q1 dst
  nilai: integer('nilai').notNull(),         // 1–5
  catatan: text('catatan'),
  dinilai_oleh: integer('dinilai_oleh').notNull().references(() => karyawan.id),
  tanggal: text('tanggal').notNull(),
  ...tenantField,
  ...timestamps,
}, (t) => [
  index('idx_eval_karyawan').on(t.karyawan_id),
])

// Sanksi dan insentif — berdampak ke total penggajian bulan tersebut.
export const sanksi_insentif = sqliteTable('sanksi_insentif', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  karyawan_id: integer('karyawan_id').notNull().references(() => karyawan.id),
  tipe: text('tipe', { enum: ['sanksi', 'insentif'] }).notNull(),
  jenis: text('jenis').notNull(),            // 'terlambat' | 'lembur' | 'bonus' | 'potongan' | dst
  jumlah: real('jumlah').notNull(),          // nominal rupiah, selalu positif
  tanggal: text('tanggal').notNull(),
  keterangan: text('keterangan'),
  periode_bulan: text('periode_bulan').notNull(), // YYYY-MM — untuk grouping penggajian
  dicatat_oleh: integer('dicatat_oleh').references(() => karyawan.id),
  ...tenantField,
  ...timestamps,
}, (t) => [
  index('idx_si_karyawan_bulan').on(t.karyawan_id, t.periode_bulan),
])

// ─── Shift Kasir ────────────────────────────────────────────────────────────

export const shift_kasir = sqliteTable('shift_kasir', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  karyawan_id: integer('karyawan_id').notNull().references(() => karyawan.id),
  tanggal: text('tanggal').notNull(),
  jam_buka: text('jam_buka').notNull(),
  jam_tutup: text('jam_tutup'),
  kas_awal: real('kas_awal').notNull().default(0),
  kas_fisik: real('kas_fisik'),
  kas_sistem: real('kas_sistem'),    // dihitung: kas_awal + penjualan_tunai
  selisih_kas: real('selisih_kas'),  // kas_fisik - kas_sistem
  jumlah_transaksi: integer('jumlah_transaksi').notNull().default(0),
  total_penjualan: real('total_penjualan').notNull().default(0),
  catatan: text('catatan'),
  status: text('status', { enum: ['buka', 'tutup'] }).notNull().default('buka'),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

// ─── Manajemen Harga ─────────────────────────────────────────────────────────

export const harga_jadwal = sqliteTable('harga_jadwal', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  barang_id: integer('barang_id').notNull().references(() => barang.id),
  harga_eceran_baru: real('harga_eceran_baru').notNull(),
  harga_grosir_baru: real('harga_grosir_baru').notNull(),
  berlaku_mulai: text('berlaku_mulai').notNull(),
  berlaku_sampai: text('berlaku_sampai'),
  status: text('status', { enum: ['draft', 'aktif', 'selesai', 'batal'] }).notNull().default('draft'),
  dibuat_oleh: integer('dibuat_oleh').references(() => karyawan.id),
  ...tenantField,
  ...timestamps,
})

// ─── Pengaturan Toko ─────────────────────────────────────────────────────────

export const toko_settings = sqliteTable('toko_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value'),
  updated_at: text('updated_at').default(sql`(datetime('now','localtime'))`),
})

// ─── Retur Penjualan ──────────────────────────────────────────────────────────

export const retur_penjualan = sqliteTable('retur_penjualan', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  no_retur: text('no_retur').notNull().unique(),
  penjualan_id: integer('penjualan_id').notNull().references(() => penjualan.id),
  tanggal: text('tanggal').notNull(),
  kasir_id: integer('kasir_id').references(() => karyawan.id),
  total_retur: real('total_retur').notNull().default(0),
  alasan: text('alasan'),
  // tunai = uang kembali ke pelanggan, kurang_piutang = kurangi piutang, tukar_barang = stok saja
  metode_refund: text('metode_refund', {
    enum: ['tunai', 'kurang_piutang', 'tukar_barang'],
  }).notNull().default('tunai'),
  kas_bank_id: integer('kas_bank_id').references(() => kas_bank.id),
  catatan: text('catatan'),
  ...tenantField,
  ...timestamps,
})

export const retur_penjualan_detail = sqliteTable('retur_penjualan_detail', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  retur_id: integer('retur_id').notNull().references(() => retur_penjualan.id),
  barang_id: integer('barang_id').notNull().references(() => barang.id),
  satuan_id: integer('satuan_id').references(() => satuan.id),
  jumlah_retur: real('jumlah_retur').notNull(),
  harga_jual: real('harga_jual').notNull(), // harga efektif per unit (sudah dipotong diskon proporsional)
  subtotal: real('subtotal').notNull(),
  ...tenantField,
})

// Barang pengganti untuk retur dengan metode tukar_barang
export const retur_penjualan_tukar = sqliteTable('retur_penjualan_tukar', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  retur_id: integer('retur_id').notNull().references(() => retur_penjualan.id),
  barang_id: integer('barang_id').notNull().references(() => barang.id),
  satuan_id: integer('satuan_id').references(() => satuan.id),
  jumlah: real('jumlah').notNull(),
  harga_jual: real('harga_jual').notNull(), // snapshot harga saat retur
  subtotal: real('subtotal').notNull(),
  ...tenantField,
})

// ═══════════════════════════════════════════════════════════════════════════
// RETUR SUPPLIER (Fase C6)
// ═══════════════════════════════════════════════════════════════════════════

// Kebalikan dari barang_masuk: barang dikembalikan ke supplier.
// Stok dikurangi (mutasi keluar). Hutang dikurangi (kurang_hutang)
// atau kas masuk dari supplier (tunai).
export const retur_supplier = sqliteTable('retur_supplier', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  no_retur: text('no_retur').notNull().unique(),
  barang_masuk_id: integer('barang_masuk_id').notNull().references(() => barang_masuk.id),
  supplier_id: integer('supplier_id').notNull().references(() => supplier.id),
  tanggal: text('tanggal').notNull(),
  dicatat_oleh: integer('dicatat_oleh').references(() => karyawan.id),
  total_retur: real('total_retur').notNull().default(0),
  alasan: text('alasan'),
  // kurang_hutang = kurangi sisa hutang, tunai = terima uang balik
  metode_refund: text('metode_refund', {
    enum: ['kurang_hutang', 'tunai'],
  }).notNull().default('kurang_hutang'),
  hutang_id: integer('hutang_id').references(() => hutang_supplier.id),
  kas_bank_id: integer('kas_bank_id').references(() => kas_bank.id),
  catatan: text('catatan'),
  ...tenantField,
  ...timestamps,
}, (t) => [
  index('idx_retur_sup_bm').on(t.barang_masuk_id),
  index('idx_retur_sup_supplier').on(t.supplier_id),
])

export const retur_supplier_detail = sqliteTable('retur_supplier_detail', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  retur_id: integer('retur_id').notNull().references(() => retur_supplier.id),
  barang_id: integer('barang_id').notNull().references(() => barang.id),
  jumlah_retur: real('jumlah_retur').notNull(),
  harga_beli: real('harga_beli').notNull(), // snapshot harga dari penerimaan asal
  subtotal: real('subtotal').notNull(),
  ...tenantField,
})

// ─── Notifikasi Terpusat ──────────────────────────────────────────────────────

export const notifikasi_config = sqliteTable('notifikasi_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jenis: text('jenis', {
    enum: [
      'stok_habis', 'stok_kritis', 'barang_kadaluarsa',
      'hutang_jatuh_tempo', 'piutang_macet',
      'void_transaksi', 'diskon_tinggi', 'selisih_kas',
      'ringkasan_harian', 'ringkasan_mingguan',
    ],
  }).notNull().unique(),
  aktif: integer('aktif', { mode: 'boolean' }).notNull().default(false),
  channel: text('channel', { enum: ['wa', 'dashboard', 'keduanya'] }).notNull().default('dashboard'),
  threshold: real('threshold'),          // hari / % / unit sesuai jenis
  jam_kirim: text('jam_kirim'),          // HH:MM — untuk scheduled
  hari_kirim: integer('hari_kirim'),     // 1-7 (Senin-Minggu) — untuk weekly
  penerima_wa: text('penerima_wa'),      // nomor HP tujuan
  terakhir_dikirim: text('terakhir_dikirim'),
  updated_at: text('updated_at').default(sql`(datetime('now','localtime'))`),
  ...tenantField,
})

export const notifikasi_log = sqliteTable('notifikasi_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jenis: text('jenis').notNull(),
  channel: text('channel', { enum: ['wa', 'dashboard'] }).notNull().default('dashboard'),
  pesan: text('pesan').notNull(),
  penerima: text('penerima'),
  status: text('status', { enum: ['terkirim', 'gagal', 'pending'] }).notNull().default('pending'),
  ...tenantField,
  waktu: text('waktu').notNull().default(sql`(datetime('now','localtime'))`),
  referensi_tipe: text('referensi_tipe'),
  referensi_id: integer('referensi_id'),
})

// ─── Budget & Target ──────────────────────────────────────────────────────────

export const target_penjualan = sqliteTable('target_penjualan', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  periode_bulan: text('periode_bulan').notNull().unique(), // format YYYY-MM
  target_omzet: real('target_omzet').notNull().default(0),
  target_transaksi: integer('target_transaksi').notNull().default(0),
  target_margin_pct: real('target_margin_pct').notNull().default(0), // persen, misal 15.0
  catatan: text('catatan'),
  dibuat_oleh: integer('dibuat_oleh').references(() => karyawan.id),
  ...tenantField,
  ...timestamps,
})

// kategori harus match dengan nilai field kategori di jurnal_kas
export const budget_operasional = sqliteTable('budget_operasional', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  periode_bulan: text('periode_bulan').notNull(), // format YYYY-MM
  kategori: text('kategori', {
    enum: ['gaji', 'sewa', 'listrik', 'kemasan', 'operasional', 'lain'],
  }).notNull(),
  nilai_budget: real('nilai_budget').notNull().default(0),
  catatan: text('catatan'),
  dibuat_oleh: integer('dibuat_oleh').references(() => karyawan.id),
  ...tenantField,
  ...timestamps,
})

// ─── Promo & Diskon ───────────────────────────────────────────────────────────

export const promo = sqliteTable('promo', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nama: text('nama').notNull(),
  deskripsi: text('deskripsi'),
  tipe: text('tipe', { enum: ['item', 'kategori', 'total'] }).notNull(),
  nilai: real('nilai').notNull(),
  tipe_nilai: text('tipe_nilai', { enum: ['persen', 'rupiah'] }).notNull().default('persen'),
  min_qty: integer('min_qty').notNull().default(1),
  min_total: real('min_total').notNull().default(0),
  berlaku_mulai: text('berlaku_mulai'),
  berlaku_sampai: text('berlaku_sampai'),
  max_penggunaan: integer('max_penggunaan'),
  jumlah_dipakai: integer('jumlah_dipakai').notNull().default(0),
  aktif: integer('aktif', { mode: 'boolean' }).notNull().default(true),
  dibuat_oleh: integer('dibuat_oleh').references(() => karyawan.id),
  ...tenantField,
  ...timestamps,
})

export const promo_target = sqliteTable('promo_target', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  promo_id: integer('promo_id').notNull().references(() => promo.id),
  target_tipe: text('target_tipe', { enum: ['barang', 'kategori'] }).notNull(),
  target_id: integer('target_id').notNull(),
  ...tenantField,
})

// ─── Jadwal & Shift Kerja ─────────────────────────────────────────────────────

export const tipe_shift = sqliteTable('tipe_shift', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nama: text('nama').notNull(),
  jam_mulai: text('jam_mulai').notNull(),   // HH:MM
  jam_selesai: text('jam_selesai').notNull(), // HH:MM
  warna: text('warna').notNull().default('#00e676'), // hex color for UI badge
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

export const jadwal_kerja = sqliteTable('jadwal_kerja', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  karyawan_id: integer('karyawan_id').notNull().references(() => karyawan.id),
  tipe_shift_id: integer('tipe_shift_id').notNull().references(() => tipe_shift.id),
  tanggal: text('tanggal').notNull(),       // YYYY-MM-DD
  catatan: text('catatan'),
  dibuat_oleh: integer('dibuat_oleh').references(() => karyawan.id),
  ...tenantField,
  ...timestamps,
})

export const tukar_shift = sqliteTable('tukar_shift', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pengaju_id: integer('pengaju_id').notNull().references(() => karyawan.id),
  jadwal_id: integer('jadwal_id').notNull().references(() => jadwal_kerja.id),
  penerima_id: integer('penerima_id').notNull().references(() => karyawan.id),
  jadwal_penerima_id: integer('jadwal_penerima_id').references(() => jadwal_kerja.id),
  alasan: text('alasan'),
  status: text('status', { enum: ['menunggu', 'disetujui', 'ditolak'] }).notNull().default('menunggu'),
  diproses_oleh: integer('diproses_oleh').references(() => karyawan.id),
  catatan_proses: text('catatan_proses'),
  ...tenantField,
  ...timestamps,
})

// ═══════════════════════════════════════════════════════════════════════════
// DRAFT KERANJANG KASIR
// ═══════════════════════════════════════════════════════════════════════════

export const draft_keranjang = sqliteTable('draft_keranjang', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kasir_id: integer('kasir_id').notNull().unique().references(() => karyawan.id),
  pelanggan_id: integer('pelanggan_id').references(() => pelanggan.id),
  tipe: text('tipe', { enum: ['eceran', 'grosir'] }).notNull().default('eceran'),
  ...timestamps,
})

// ═══════════════════════════════════════════════════════════════════════════
// PREFERENSI PENGGUNA (tab order, favorit, dll per karyawan)
// ═══════════════════════════════════════════════════════════════════════════

export const preferensi_pengguna = sqliteTable('preferensi_pengguna', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  karyawan_id: integer('karyawan_id').notNull().references(() => karyawan.id),
  modul: text('modul').notNull(),
  nilai_json: text('nilai_json').notNull().default('{}'),
  updated_at: text('updated_at').default(sql`(datetime('now','localtime'))`),
}, (t) => [
  uniqueIndex('uq_preferensi_pengguna').on(t.karyawan_id, t.modul),
])

export const draft_keranjang_item = sqliteTable('draft_keranjang_item', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  draft_id: integer('draft_id').notNull().references(() => draft_keranjang.id),
  barang_id: integer('barang_id').notNull().references(() => barang.id),
  tipe_harga: text('tipe_harga', { enum: ['eceran', 'grosir'] }).notNull().default('eceran'),
  satuan_id: integer('satuan_id').references(() => satuan.id),
  jumlah: real('jumlah').notNull(),
  harga_jual: real('harga_jual').notNull(),
  diskon_item: real('diskon_item').notNull().default(0),
})

// ═══════════════════════════════════════════════════════════════════════════
// SOP ENGINE (Fase B)
// ═══════════════════════════════════════════════════════════════════════════

// Aturan SOP disimpan sebagai data — bukan dikoding di route.
// tipe: checklist = harus diselesaikan sebelum event berlanjut (blocking)
//       notif     = kirim notifikasi saat event terjadi (non-blocking)
//       blokir    = tolak event tanpa syarat tambahan
export const sop_rule = sqliteTable('sop_rule', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nama: text('nama').notNull(),
  event_name: text('event_name').notNull(), // misal: 'before:absensi.masuk'
  tipe: text('tipe', { enum: ['checklist', 'notif', 'blokir'] }).notNull().default('checklist'),
  deskripsi: text('deskripsi'),
  // JSON: untuk checklist → [{ id, label, wajib }]; untuk notif → { pesan }
  config_json: text('config_json', { mode: 'json' }),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  urutan: integer('urutan').notNull().default(0),
  ...tenantField,
  ...timestamps,
}, (t) => [
  index('idx_sop_rule_event').on(t.event_name),
])

// ═══════════════════════════════════════════════════════════════════════════
// LAMPIRAN / ATTACHMENT (Fase B6)
// ═══════════════════════════════════════════════════════════════════════════

// Tabel generik untuk menyimpan file terlampir ke dokumen apapun.
// Modul baru cukup POST /lampiran dengan referensi_tipe + referensi_id.
// Modul lama (barang/karyawan/barang_masuk) tetap simpan path di kolom sendiri
// tapi pakai saveUpload() dari utils/upload.ts agar logika tidak duplikat.
export const lampiran = sqliteTable('lampiran', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  referensi_tipe: text('referensi_tipe').notNull(), // 'kasbon' | 'sop_instance' | dst
  referensi_id: integer('referensi_id').notNull(),
  tipe: text('tipe', { enum: ['gambar', 'pdf', 'dokumen'] }).notNull().default('gambar'),
  path: text('path').notNull(),        // relatif dari uploads/
  thumb_path: text('thumb_path'),      // opsional, thumbnail untuk gambar
  nama_asli: text('nama_asli'),        // nama file asli dari user
  ukuran: integer('ukuran'),           // bytes
  uploaded_by: integer('uploaded_by').notNull().references(() => karyawan.id),
  dibuat_at: text('dibuat_at').notNull().default(sql`(datetime('now','localtime'))`),
  ...tenantField,
}, (t) => [
  index('idx_lampiran_ref').on(t.referensi_tipe, t.referensi_id),
])

// ═══════════════════════════════════════════════════════════════════════════
// APPROVAL GATE (Fase B5)
// ═══════════════════════════════════════════════════════════════════════════

// Primitif approval lintas modul — kasbon, pengeluaran, purchase order, dst.
// Module yang butuh approval: insert satu baris ke sini via mintaApproval().
// Manajer/pemilik setujui/tolak via POST /approval/:id/setujui|tolak.
export const approval = sqliteTable('approval', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  referensi_tipe: text('referensi_tipe').notNull(), // 'kasbon' | 'purchase_order' | dst
  referensi_id: integer('referensi_id').notNull(),
  status: text('status', {
    enum: ['menunggu', 'disetujui', 'ditolak'],
  }).notNull().default('menunggu'),
  diminta_oleh: integer('diminta_oleh').notNull().references(() => karyawan.id),
  diproses_oleh: integer('diproses_oleh').references(() => karyawan.id),
  catatan_pengaju: text('catatan_pengaju'),
  catatan_proses: text('catatan_proses'),
  dibuat_at: text('dibuat_at').notNull().default(sql`(datetime('now','localtime'))`),
  diproses_at: text('diproses_at'),
  ...tenantField,
}, (t) => [
  index('idx_approval_ref').on(t.referensi_tipe, t.referensi_id),
  index('idx_approval_status').on(t.status),
])

// ─── C2: Kunjungan Sales ke Warung ───────────────────────────────────────────
export const kunjungan_sales = sqliteTable('kunjungan_sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pelanggan_id: integer('pelanggan_id').references(() => pelanggan.id),
  nama_warung: text('nama_warung').notNull(),
  alamat: text('alamat'),
  petugas_id: integer('petugas_id').references(() => karyawan.id),
  tanggal: text('tanggal').notNull(),
  tujuan: text('tujuan', {
    enum: ['prospek', 'follow_up', 'pengiriman', 'lainnya'],
  }).notNull().default('prospek'),
  hasil: text('hasil'),
  catatan: text('catatan'),
  status_tindak_lanjut: text('status_tindak_lanjut', {
    enum: ['open', 'selesai', 'pending'],
  }).notNull().default('open'),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

// ─── C2: Agenda Supplier ──────────────────────────────────────────────────────
export const agenda_supplier = sqliteTable('agenda_supplier', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  supplier_id: integer('supplier_id').references(() => supplier.id),
  nama_supplier: text('nama_supplier').notNull(),
  tipe: text('tipe', {
    enum: ['kunjungan', 'negosiasi', 'pengiriman', 'lainnya'],
  }).notNull().default('kunjungan'),
  tanggal: text('tanggal').notNull(),
  jam: text('jam'),
  lokasi: text('lokasi'),
  petugas_id: integer('petugas_id').references(() => karyawan.id),
  hasil: text('hasil'),
  catatan: text('catatan'),
  status: text('status', {
    enum: ['dijadwalkan', 'selesai', 'dibatalkan'],
  }).notNull().default('dijadwalkan'),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

// ─── C3: Permintaan Pelanggan ─────────────────────────────────────────────────
export const permintaan_pelanggan = sqliteTable('permintaan_pelanggan', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pelanggan_id: integer('pelanggan_id').references(() => pelanggan.id),
  nama_pelanggan: text('nama_pelanggan'),
  nama_barang: text('nama_barang').notNull(),
  barang_id: integer('barang_id').references(() => barang.id),
  qty_minta: integer('qty_minta'),
  catatan: text('catatan'),
  status: text('status', {
    enum: ['menunggu', 'tersedia', 'tidak_tersedia'],
  }).notNull().default('menunggu'),
  tanggal: text('tanggal').notNull(),
  ditangani_oleh: integer('ditangani_oleh').references(() => karyawan.id),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

// ─── C3: Komplain Pelanggan ───────────────────────────────────────────────────
export const komplain_pelanggan = sqliteTable('komplain_pelanggan', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pelanggan_id: integer('pelanggan_id').references(() => pelanggan.id),
  nama_pelanggan: text('nama_pelanggan'),
  kategori: text('kategori', {
    enum: ['kualitas_barang', 'pelayanan', 'harga', 'pengiriman', 'lainnya'],
  }).notNull().default('lainnya'),
  deskripsi: text('deskripsi').notNull(),
  tanggal: text('tanggal').notNull(),
  status: text('status', {
    enum: ['masuk', 'diproses', 'selesai', 'ditolak'],
  }).notNull().default('masuk'),
  resolusi: text('resolusi'),
  ditangani_oleh: integer('ditangani_oleh').references(() => karyawan.id),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

// ─── C5: Pinjaman & Investasi ─────────────────────────────────────────────────
export const pinjaman_investasi = sqliteTable('pinjaman_investasi', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tipe: text('tipe', { enum: ['pinjaman', 'investasi'] }).notNull(),
  nama: text('nama').notNull(),
  jumlah_pokok: integer('jumlah_pokok').notNull(),
  bunga_persen: real('bunga_persen').notNull().default(0),
  cicilan_per_bulan: integer('cicilan_per_bulan').notNull().default(0),
  tanggal_mulai: text('tanggal_mulai').notNull(),
  jatuh_tempo: text('jatuh_tempo'),
  sisa_pokok: integer('sisa_pokok').notNull(),
  status: text('status', { enum: ['aktif', 'lunas', 'macet'] }).notNull().default('aktif'),
  catatan: text('catatan'),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

// ─── C5: Tamu Birokrasi ───────────────────────────────────────────────────────
export const tamu_birokrasi = sqliteTable('tamu_birokrasi', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nama_tamu: text('nama_tamu').notNull(),
  instansi: text('instansi'),
  keperluan: text('keperluan').notNull(),
  tanggal: text('tanggal').notNull(),
  jam_masuk: text('jam_masuk'),
  jam_keluar: text('jam_keluar'),
  keterangan: text('keterangan'),
  dicatat_oleh: integer('dicatat_oleh').references(() => karyawan.id),
  ...tenantField,
  ...timestamps,
})

// ─── C4: Inventaris Aset Tetap ───────────────────────────────────────────────
export const aset_tetap = sqliteTable('aset_tetap', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nama: text('nama').notNull(),
  kategori: text('kategori').notNull().default('Lainnya'),
  nilai_beli: integer('nilai_beli').notNull().default(0),
  nilai_sekarang: integer('nilai_sekarang').notNull().default(0),
  tanggal_beli: text('tanggal_beli'),
  kondisi: text('kondisi', {
    enum: ['baik', 'rusak_ringan', 'rusak_berat', 'dijual', 'dibuang'],
  }).notNull().default('baik'),
  lokasi: text('lokasi'),
  catatan: text('catatan'),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

// ─── C4: Tagihan Utilitas (Listrik, Air, Internet, dll) ──────────────────────
export const tagihan_utilitas = sqliteTable('tagihan_utilitas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jenis: text('jenis', {
    enum: ['listrik', 'air', 'internet', 'lainnya'],
  }).notNull().default('listrik'),
  periode_bulan: text('periode_bulan').notNull(),
  jumlah: integer('jumlah').notNull().default(0),
  tanggal_bayar: text('tanggal_bayar'),
  meter_awal: integer('meter_awal'),
  meter_akhir: integer('meter_akhir'),
  catatan: text('catatan'),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

// ─── C5: Checklist Tugas Harian (Kebersihan, dll) ────────────────────────────
export const checklist_item = sqliteTable('checklist_item', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nama: text('nama').notNull(),
  kategori: text('kategori').notNull().default('kebersihan'),
  urutan: integer('urutan').notNull().default(0),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

export const checklist_log = sqliteTable('checklist_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  item_id: integer('item_id').notNull().references(() => checklist_item.id),
  tanggal: text('tanggal').notNull(),
  karyawan_id: integer('karyawan_id').references(() => karyawan.id),
  selesai: integer('selesai', { mode: 'boolean' }).notNull().default(false),
  catatan: text('catatan'),
  ...tenantField,
  ...timestamps,
}, (t) => [
  index('idx_checklist_log_tanggal').on(t.tanggal),
  index('idx_checklist_log_item').on(t.item_id),
])

// ─── C2: Pipeline Grosir ─────────────────────────────────────────────────────
export const pipeline_grosir = sqliteTable('pipeline_grosir', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nama_pelanggan: text('nama_pelanggan').notNull(),
  pelanggan_id: integer('pelanggan_id').references(() => pelanggan.id),
  nilai_estimasi: integer('nilai_estimasi').notNull().default(0),
  tahap: text('tahap', {
    enum: ['prospek', 'dikunjungi', 'penawaran', 'negosiasi', 'deal', 'batal'],
  }).notNull().default('prospek'),
  petugas_id: integer('petugas_id').references(() => karyawan.id),
  produk_minat: text('produk_minat'),
  catatan: text('catatan'),
  tanggal_masuk: text('tanggal_masuk').notNull(),
  tanggal_update: text('tanggal_update'),
  ...tenantField,
  ...auditFields,
  ...timestamps,
}, (t) => [
  index('idx_pipeline_tahap').on(t.tahap),
])

// ─── C5: Acara / Hajatan Besar ───────────────────────────────────────────────
export const acara_hajatan = sqliteTable('acara_hajatan', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nama_acara: text('nama_acara').notNull(),
  nama_penyelenggara: text('nama_penyelenggara').notNull(),
  pelanggan_id: integer('pelanggan_id').references(() => pelanggan.id),
  tanggal_acara: text('tanggal_acara').notNull(),
  alamat: text('alamat'),
  estimasi_tamu: integer('estimasi_tamu'),
  catatan: text('catatan'),
  status: text('status', {
    enum: ['persiapan', 'konfirmasi', 'selesai', 'batal'],
  }).notNull().default('persiapan'),
  total_order: integer('total_order').notNull().default(0),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

// ─── C5: Inspeksi Toko ───────────────────────────────────────────────────────
export const inspeksi_toko = sqliteTable('inspeksi_toko', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tanggal: text('tanggal').notNull(),
  jenis: text('jenis', {
    enum: ['rutin', 'mendadak', 'bulanan', 'tahunan'],
  }).notNull().default('rutin'),
  petugas_id: integer('petugas_id').references(() => karyawan.id),
  area: text('area'),
  temuan: text('temuan'),
  tindakan: text('tindakan'),
  nilai: integer('nilai'),
  status: text('status', {
    enum: ['draft', 'selesai'],
  }).notNull().default('draft'),
  catatan: text('catatan'),
  ...tenantField,
  ...auditFields,
  ...timestamps,
})

// Jejak eksekusi tiap rule per transaksi/karyawan
export const sop_instance = sqliteTable('sop_instance', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  rule_id: integer('rule_id').notNull().references(() => sop_rule.id),
  karyawan_id: integer('karyawan_id').references(() => karyawan.id),
  status: text('status', {
    enum: ['pending', 'selesai', 'timeout', 'dibatalkan'],
  }).notNull().default('pending'),
  payload_json: text('payload_json', { mode: 'json' }), // event payload
  hasil_json: text('hasil_json', { mode: 'json' }),     // hasil checklist / bukti
  dibuat_at: text('dibuat_at').notNull().default(sql`(datetime('now','localtime'))`),
  diselesaikan_at: text('diselesaikan_at'),
}, (t) => [
  index('idx_sop_instance_rule').on(t.rule_id),
  index('idx_sop_instance_karyawan').on(t.karyawan_id),
  index('idx_sop_instance_status').on(t.status),
])
