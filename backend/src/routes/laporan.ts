import { Hono } from 'hono'
import { eq, and, gte, lte, ne, sql } from 'drizzle-orm'
import { db } from '../db/index.ts'
import {
  penjualan, penjualan_detail,
  jurnal_kas, kas_bank,
  hutang_supplier, piutang_pelanggan,
  barang,
} from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'

export const laporanRouter = new Hono()

laporanRouter.use('*', authMiddleware)

function hariIni(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)
}

function bulanIni(): { dari: string; sampai: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
  return { dari: `${y}-${m}-01`, sampai: `${y}-${m}-${lastDay}` }
}

// ── GET /laporan/laba-rugi ────────────────────────────────────────────────

laporanRouter.get('/laba-rugi', requirePermission('laporan.lihat'), async (c) => {
  const { dari, sampai } = {
    dari: c.req.query('dari') ?? bulanIni().dari,
    sampai: c.req.query('sampai') ?? bulanIni().sampai,
  }

  // Penjualan bersih (tidak termasuk void)
  const penjualanRows = db
    .select({ total: penjualan.total, diskon_total: penjualan.diskon_total })
    .from(penjualan)
    .where(
      and(
        ne(penjualan.status, 'void'),
        gte(penjualan.tanggal, dari),
        lte(penjualan.tanggal, sampai + ' 23:59:59')
      )
    )
    .all()

  const totalPenjualan = penjualanRows.reduce((s, r) => s + r.total, 0)
  const totalDiskon = penjualanRows.reduce((s, r) => s + r.diskon_total, 0)
  const jumlahTransaksi = penjualanRows.length

  // HPP — estimasi dari harga_beli_terakhir barang × jumlah terjual
  const hppRows = db
    .select({
      hpp: sql<number>`sum(${penjualan_detail.jumlah} * ${barang.harga_beli_terakhir})`,
    })
    .from(penjualan_detail)
    .innerJoin(penjualan, eq(penjualan_detail.penjualan_id, penjualan.id))
    .innerJoin(barang, eq(penjualan_detail.barang_id, barang.id))
    .where(
      and(
        ne(penjualan.status, 'void'),
        gte(penjualan.tanggal, dari),
        lte(penjualan.tanggal, sampai + ' 23:59:59')
      )
    )
    .get()

  const totalHpp = hppRows?.hpp ?? 0
  const labaKotor = totalPenjualan - totalHpp

  // Biaya operasional (jurnal keluar, kecuali pembayaran hutang)
  const biayaRows = db
    .select({ kategori: jurnal_kas.kategori, jumlah: jurnal_kas.jumlah })
    .from(jurnal_kas)
    .where(
      and(
        eq(jurnal_kas.jenis, 'keluar'),
        ne(jurnal_kas.kategori, 'pembayaran_hutang'),
        gte(jurnal_kas.tanggal, dari),
        lte(jurnal_kas.tanggal, sampai)
      )
    )
    .all()

  const biayaPerKategori: Record<string, number> = {}
  let totalBiaya = 0
  for (const b of biayaRows) {
    biayaPerKategori[b.kategori] = (biayaPerKategori[b.kategori] ?? 0) + b.jumlah
    totalBiaya += b.jumlah
  }

  const labaBersih = labaKotor - totalBiaya

  return c.json({
    success: true,
    data: {
      periode: { dari, sampai },
      penjualan: {
        bruto: totalPenjualan + totalDiskon,
        diskon: totalDiskon,
        bersih: totalPenjualan,
        jumlah_transaksi: jumlahTransaksi,
      },
      hpp: totalHpp,
      laba_kotor: labaKotor,
      margin_kotor_persen: totalPenjualan > 0
        ? Math.round((labaKotor / totalPenjualan) * 10000) / 100
        : 0,
      biaya_operasional: {
        total: totalBiaya,
        per_kategori: biayaPerKategori,
      },
      laba_bersih: labaBersih,
      margin_bersih_persen: totalPenjualan > 0
        ? Math.round((labaBersih / totalPenjualan) * 10000) / 100
        : 0,
    },
  })
})

// ── GET /laporan/arus-kas ─────────────────────────────────────────────────

laporanRouter.get('/arus-kas', requirePermission('laporan.lihat'), async (c) => {
  const { dari, sampai } = {
    dari: c.req.query('dari') ?? bulanIni().dari,
    sampai: c.req.query('sampai') ?? bulanIni().sampai,
  }

  const akunList = db.select().from(kas_bank).where(eq(kas_bank.is_active, true)).all()

  const jurnalRows = db
    .select({
      kas_bank_id: jurnal_kas.kas_bank_id,
      jenis: jurnal_kas.jenis,
      kategori: jurnal_kas.kategori,
      jumlah: jurnal_kas.jumlah,
    })
    .from(jurnal_kas)
    .where(
      and(
        gte(jurnal_kas.tanggal, dari),
        lte(jurnal_kas.tanggal, sampai)
      )
    )
    .all()

  // Per akun kas/bank
  const perAkun = akunList.map((akun) => {
    const rows = jurnalRows.filter((r) => r.kas_bank_id === akun.id)
    const masuk = rows.filter((r) => r.jenis === 'masuk').reduce((s, r) => s + r.jumlah, 0)
    const keluar = rows.filter((r) => r.jenis === 'keluar').reduce((s, r) => s + r.jumlah, 0)
    return { id: akun.id, nama: akun.nama, tipe: akun.tipe, masuk, keluar, net: masuk - keluar }
  })

  // Ringkasan per kategori
  const kategoriMap: Record<string, { masuk: number; keluar: number }> = {}
  for (const r of jurnalRows) {
    if (!kategoriMap[r.kategori]) kategoriMap[r.kategori] = { masuk: 0, keluar: 0 }
    if (r.jenis === 'masuk') kategoriMap[r.kategori].masuk += r.jumlah
    else kategoriMap[r.kategori].keluar += r.jumlah
  }

  const totalMasuk = jurnalRows.filter((r) => r.jenis === 'masuk').reduce((s, r) => s + r.jumlah, 0)
  const totalKeluar = jurnalRows.filter((r) => r.jenis === 'keluar').reduce((s, r) => s + r.jumlah, 0)

  return c.json({
    success: true,
    data: {
      periode: { dari, sampai },
      per_akun: perAkun,
      per_kategori: kategoriMap,
      total_masuk: totalMasuk,
      total_keluar: totalKeluar,
      net: totalMasuk - totalKeluar,
    },
  })
})

// ── GET /laporan/neraca ───────────────────────────────────────────────────

laporanRouter.get('/neraca', requirePermission('laporan.lihat'), async (c) => {
  // ASET
  // 1. Kas & Bank (saldo_awal + total masuk - total keluar dari jurnal)
  const akunList = db.select().from(kas_bank).where(eq(kas_bank.is_active, true)).all()

  const jurnalSemua = db
    .select({ kas_bank_id: jurnal_kas.kas_bank_id, jenis: jurnal_kas.jenis, jumlah: jurnal_kas.jumlah })
    .from(jurnal_kas)
    .all()

  const kasBank = akunList.map((akun) => {
    const rows = jurnalSemua.filter((r) => r.kas_bank_id === akun.id)
    const masuk = rows.filter((r) => r.jenis === 'masuk').reduce((s, r) => s + r.jumlah, 0)
    const keluar = rows.filter((r) => r.jenis === 'keluar').reduce((s, r) => s + r.jumlah, 0)
    const saldo = akun.saldo_awal + masuk - keluar
    return { id: akun.id, nama: akun.nama, tipe: akun.tipe, saldo }
  })
  const totalKasBank = kasBank.reduce((s, a) => s + a.saldo, 0)

  // 2. Piutang belum lunas
  const piutangRows = db
    .select({ sisa: piutang_pelanggan.sisa_piutang })
    .from(piutang_pelanggan)
    .where(ne(piutang_pelanggan.status, 'lunas'))
    .all()
  const totalPiutang = piutangRows.reduce((s, r) => s + r.sisa, 0)

  // 3. Nilai stok (harga_beli_terakhir × stok_sekarang)
  const nilaiStokRow = db
    .select({ total: sql<number>`sum(${barang.stok_sekarang} * ${barang.harga_beli_terakhir})` })
    .from(barang)
    .where(eq(barang.is_active, true))
    .get()
  const totalNilaiStok = nilaiStokRow?.total ?? 0

  const totalAset = totalKasBank + totalPiutang + totalNilaiStok

  // LIABILITAS
  const hutangRows = db
    .select({ sisa: hutang_supplier.sisa_hutang })
    .from(hutang_supplier)
    .where(ne(hutang_supplier.status, 'lunas'))
    .all()
  const totalHutang = hutangRows.reduce((s, r) => s + r.sisa, 0)

  // MODAL (residual)
  const modal = totalAset - totalHutang

  return c.json({
    success: true,
    data: {
      per_tanggal: hariIni(),
      aset: {
        kas_bank: kasBank,
        total_kas_bank: totalKasBank,
        piutang_pelanggan: totalPiutang,
        nilai_persediaan: totalNilaiStok,
        total: totalAset,
      },
      liabilitas: {
        hutang_supplier: totalHutang,
        total: totalHutang,
      },
      modal: {
        total: modal,
      },
      check: {
        aset: totalAset,
        liabilitas_plus_modal: totalHutang + modal,
        balanced: Math.abs(totalAset - (totalHutang + modal)) < 1,
      },
    },
  })
})
