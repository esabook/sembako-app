import { Hono } from 'hono'
import { sql, eq, and, gte, lte, lt, desc, asc } from 'drizzle-orm'
import { db } from '../db/index.ts'
import {
  penjualan, penjualan_detail, barang,
  hutang_supplier, piutang_pelanggan, pelanggan, supplier,
  kas_bank, jurnal_kas, absensi, karyawan, mutasi_stok,
} from '../db/schema.ts'
import { authMiddleware } from '../middleware/auth.ts'

export const dashboardRouter = new Hono()
dashboardRouter.use('*', authMiddleware)

dashboardRouter.get('/', async (c) => {
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const day30ago = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const day7ago = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const day7later = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  // ── Penjualan hari ini ──────────────────────────────────────────────────────
  const penjualanHariIni = db.select({
    total: sql<number>`COALESCE(SUM(${penjualan.total}), 0)`,
    jumlah_trx: sql<number>`COUNT(*)`,
    rata_per_trx: sql<number>`COALESCE(AVG(${penjualan.total}), 0)`,
  })
  .from(penjualan)
  .where(and(gte(penjualan.tanggal, today), lte(penjualan.tanggal, today), eq(penjualan.status, 'lunas')))
  .get()

  const penjualanKemarin = db.select({
    total: sql<number>`COALESCE(SUM(${penjualan.total}), 0)`,
    jumlah_trx: sql<number>`COUNT(*)`,
  })
  .from(penjualan)
  .where(and(gte(penjualan.tanggal, yesterday), lte(penjualan.tanggal, yesterday), eq(penjualan.status, 'lunas')))
  .get()

  // ── Penjualan 30 hari (untuk grafik) ───────────────────────────────────────
  const penjualan30hari = db.select({
    tanggal: penjualan.tanggal,
    total: sql<number>`COALESCE(SUM(${penjualan.total}), 0)`,
    jumlah_trx: sql<number>`COUNT(*)`,
  })
  .from(penjualan)
  .where(and(gte(penjualan.tanggal, day30ago), eq(penjualan.status, 'lunas')))
  .groupBy(penjualan.tanggal)
  .orderBy(asc(penjualan.tanggal))
  .all()

  // ── Saldo kas/bank ──────────────────────────────────────────────────────────
  const akunKas = db.select({
    id: kas_bank.id,
    nama: kas_bank.nama,
    tipe: kas_bank.tipe,
    saldo_awal: kas_bank.saldo_awal,
    masuk: sql<number>`COALESCE(SUM(CASE WHEN ${jurnal_kas.jenis} = 'masuk' THEN ${jurnal_kas.jumlah} ELSE 0 END), 0)`,
    keluar: sql<number>`COALESCE(SUM(CASE WHEN ${jurnal_kas.jenis} = 'keluar' THEN ${jurnal_kas.jumlah} ELSE 0 END), 0)`,
  })
  .from(kas_bank)
  .leftJoin(jurnal_kas, eq(jurnal_kas.kas_bank_id, kas_bank.id))
  .where(eq(kas_bank.is_active, true))
  .groupBy(kas_bank.id)
  .all()
  .map(r => ({ ...r, saldo: r.saldo_awal + r.masuk - r.keluar }))

  const totalSaldo = akunKas.reduce((s, r) => s + r.saldo, 0)

  // ── Stok kritis (stok <= minimum) ──────────────────────────────────────────
  const stokKritis = db.select({
    id: barang.id,
    kode_barang: barang.kode_barang,
    nama_barang: barang.nama_barang,
    stok_sekarang: barang.stok_sekarang,
    stok_minimum: barang.stok_minimum,
  })
  .from(barang)
  .where(and(
    eq(barang.is_active, true),
    sql`${barang.stok_sekarang} <= ${barang.stok_minimum}`,
  ))
  .orderBy(asc(barang.stok_sekarang))
  .limit(10)
  .all()

  // ── Piutang lewat jatuh tempo ───────────────────────────────────────────────
  const piutangMacet = db.select({
    id: piutang_pelanggan.id,
    nama_pelanggan: pelanggan.nama,
    kontak: pelanggan.kontak,
    sisa_piutang: piutang_pelanggan.sisa_piutang,
    tanggal_jatuh_tempo: piutang_pelanggan.tanggal_jatuh_tempo,
  })
  .from(piutang_pelanggan)
  .leftJoin(pelanggan, eq(piutang_pelanggan.pelanggan_id, pelanggan.id))
  .where(and(
    sql`${piutang_pelanggan.status} != 'lunas'`,
    sql`${piutang_pelanggan.tanggal_jatuh_tempo} < ${today}`,
  ))
  .orderBy(asc(piutang_pelanggan.tanggal_jatuh_tempo))
  .limit(5)
  .all()

  const totalPiutangMacet = piutangMacet.reduce((s, r) => s + r.sisa_piutang, 0)

  // ── Hutang jatuh tempo 7 hari ke depan ─────────────────────────────────────
  const hutangJatuhTempo = db.select({
    id: hutang_supplier.id,
    nama_supplier: supplier.nama_supplier,
    sisa_hutang: hutang_supplier.sisa_hutang,
    tanggal_jatuh_tempo: hutang_supplier.tanggal_jatuh_tempo,
  })
  .from(hutang_supplier)
  .leftJoin(supplier, eq(hutang_supplier.supplier_id, supplier.id))
  .where(and(
    sql`${hutang_supplier.status} != 'lunas'`,
    sql`${hutang_supplier.tanggal_jatuh_tempo} BETWEEN ${today} AND ${day7later}`,
  ))
  .orderBy(asc(hutang_supplier.tanggal_jatuh_tempo))
  .limit(5)
  .all()

  const totalHutangJatuhTempo = hutangJatuhTempo.reduce((s, r) => s + r.sisa_hutang, 0)

  // ── Top 5 barang terlaris 30 hari ───────────────────────────────────────────
  const topBarang = db.select({
    barang_id: penjualan_detail.barang_id,
    nama_barang: barang.nama_barang,
    total_qty: sql<number>`SUM(${penjualan_detail.jumlah})`,
    total_omset: sql<number>`SUM(${penjualan_detail.subtotal})`,
  })
  .from(penjualan_detail)
  .leftJoin(penjualan, eq(penjualan_detail.penjualan_id, penjualan.id))
  .leftJoin(barang, eq(penjualan_detail.barang_id, barang.id))
  .where(and(
    gte(penjualan.tanggal, day30ago),
    eq(penjualan.status, 'lunas'),
  ))
  .groupBy(penjualan_detail.barang_id, barang.nama_barang)
  .orderBy(desc(sql`SUM(${penjualan_detail.subtotal})`))
  .limit(5)
  .all()

  // ── Karyawan belum absen hari ini ───────────────────────────────────────────
  const sudahAbsen = db.select({ karyawan_id: absensi.karyawan_id })
    .from(absensi)
    .where(eq(absensi.tanggal, today))
    .all()
    .map(r => r.karyawan_id)

  const belumAbsen = db.select({ id: karyawan.id, nama: karyawan.nama, role: karyawan.role })
    .from(karyawan)
    .where(eq(karyawan.is_active, true))
    .all()
    .filter(k => !sudahAbsen.includes(k.id))

  // ── Ringkasan piutang & hutang total ───────────────────────────────────────
  const totalPiutang = db.select({
    total: sql<number>`COALESCE(SUM(${piutang_pelanggan.sisa_piutang}), 0)`,
  })
  .from(piutang_pelanggan)
  .where(sql`${piutang_pelanggan.status} != 'lunas'`)
  .get()

  const totalHutang = db.select({
    total: sql<number>`COALESCE(SUM(${hutang_supplier.sisa_hutang}), 0)`,
  })
  .from(hutang_supplier)
  .where(sql`${hutang_supplier.status} != 'lunas'`)
  .get()

  return c.json({
    success: true,
    data: {
      today,
      penjualan_hari_ini: penjualanHariIni,
      penjualan_kemarin: penjualanKemarin,
      penjualan_30hari: penjualan30hari,
      saldo_kas: { akun: akunKas, total: totalSaldo },
      stok_kritis: stokKritis,
      piutang_macet: { list: piutangMacet, total: totalPiutangMacet },
      hutang_jatuh_tempo: { list: hutangJatuhTempo, total: totalHutangJatuhTempo },
      top_barang: topBarang,
      belum_absen: belumAbsen,
      ringkasan: {
        total_piutang: totalPiutang?.total ?? 0,
        total_hutang: totalHutang?.total ?? 0,
      },
    },
  })
})
