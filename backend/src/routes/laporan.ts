import type { JWTPayload } from './auth.ts'
import { Hono } from 'hono'
import { eq, and, gte, lte, ne, sql } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { sqlite } from '../db/index.ts'
import {
  penjualan, penjualan_detail,
  jurnal_kas, kas_bank,
  hutang_supplier, piutang_pelanggan,
  barang, pelanggan, supplier,
  barang_masuk_detail, barang_masuk,
  kategori, karyawan, penggajian,
} from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'

export const laporanRouter = new Hono<{ Variables: { user: JWTPayload } }>()

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

  // HPP — Weighted Average Cost (WAC): pakai harga_beli_rata, fallback ke harga_beli_terakhir
  const hppRows = db
    .select({
      hpp: sql<number>`sum(${penjualan_detail.jumlah} * CASE WHEN ${barang.harga_beli_rata} > 0 THEN ${barang.harga_beli_rata} ELSE ${barang.harga_beli_terakhir} END)`,
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

  // Saldo awal per akun: GROUP BY — tidak load seluruh tabel
  const sebelumPerAkun = db.select({
    kas_bank_id: jurnal_kas.kas_bank_id,
    masuk:  sql<number>`COALESCE(SUM(CASE WHEN ${jurnal_kas.jenis}='masuk' THEN ${jurnal_kas.jumlah} ELSE 0 END),0)`,
    keluar: sql<number>`COALESCE(SUM(CASE WHEN ${jurnal_kas.jenis}='keluar' THEN ${jurnal_kas.jumlah} ELSE 0 END),0)`,
  }).from(jurnal_kas).where(sql`${jurnal_kas.tanggal} < ${dari}`).groupBy(jurnal_kas.kas_bank_id).all()
  const sebelumMap = new Map(sebelumPerAkun.map((r) => [r.kas_bank_id, r]))

  // Mutasi periode per akun: GROUP BY
  const mutasiPerAkun = db.select({
    kas_bank_id: jurnal_kas.kas_bank_id,
    masuk:  sql<number>`COALESCE(SUM(CASE WHEN ${jurnal_kas.jenis}='masuk' THEN ${jurnal_kas.jumlah} ELSE 0 END),0)`,
    keluar: sql<number>`COALESCE(SUM(CASE WHEN ${jurnal_kas.jenis}='keluar' THEN ${jurnal_kas.jumlah} ELSE 0 END),0)`,
  }).from(jurnal_kas).where(and(gte(jurnal_kas.tanggal, dari), lte(jurnal_kas.tanggal, sampai))).groupBy(jurnal_kas.kas_bank_id).all()
  const mutasiMap = new Map(mutasiPerAkun.map((r) => [r.kas_bank_id, r]))

  // Ringkasan per kategori: GROUP BY
  const kategoriRows = db.select({
    kategori: jurnal_kas.kategori,
    jenis: jurnal_kas.jenis,
    jumlah: sql<number>`COALESCE(SUM(${jurnal_kas.jumlah}),0)`,
  }).from(jurnal_kas).where(and(gte(jurnal_kas.tanggal, dari), lte(jurnal_kas.tanggal, sampai))).groupBy(jurnal_kas.kategori, jurnal_kas.jenis).all()
  const kategoriMap: Record<string, { masuk: number; keluar: number }> = {}
  for (const r of kategoriRows) {
    const entry = kategoriMap[r.kategori] ?? { masuk: 0, keluar: 0 }
    kategoriMap[r.kategori] = r.jenis === 'masuk'
      ? { ...entry, masuk: r.jumlah }
      : { ...entry, keluar: r.jumlah }
  }

  // Hitung per akun dari maps
  const perAkun = akunList.map((akun) => {
    const sbl  = sebelumMap.get(akun.id) ?? { masuk: 0, keluar: 0 }
    const mut  = mutasiMap.get(akun.id)  ?? { masuk: 0, keluar: 0 }
    const saldo_awal  = akun.saldo_awal + sbl.masuk - sbl.keluar
    const saldo_akhir = saldo_awal + mut.masuk - mut.keluar
    return { id: akun.id, nama: akun.nama, tipe: akun.tipe, saldo_awal, masuk: mut.masuk, keluar: mut.keluar, net: mut.masuk - mut.keluar, saldo_akhir }
  })

  const totalMasuk  = perAkun.reduce((s, a) => s + a.masuk, 0)
  const totalKeluar = perAkun.reduce((s, a) => s + a.keluar, 0)
  const saldoAwal   = perAkun.reduce((s, a) => s + a.saldo_awal, 0)

  return c.json({
    success: true,
    data: {
      periode: { dari, sampai },
      per_akun: perAkun,
      per_kategori: kategoriMap,
      saldo_awal: saldoAwal,
      total_masuk: totalMasuk,
      total_keluar: totalKeluar,
      net: totalMasuk - totalKeluar,
      saldo_akhir: saldoAwal + totalMasuk - totalKeluar,
    },
  })
})

// ── GET /laporan/neraca ───────────────────────────────────────────────────

laporanRouter.get('/neraca', requirePermission('laporan.lihat'), async (c) => {
  const perTanggal = c.req.query('per_tanggal') || hariIni()
  const batasTgl = perTanggal + ' 23:59:59'

  // ASET
  // 1. Kas & Bank — filter jurnal sampai per_tanggal
  const akunList = db.select().from(kas_bank).where(eq(kas_bank.is_active, true)).all()

  const jurnalPerAkun = db.select({
    kas_bank_id: jurnal_kas.kas_bank_id,
    masuk:  sql<number>`COALESCE(SUM(CASE WHEN ${jurnal_kas.jenis}='masuk' THEN ${jurnal_kas.jumlah} ELSE 0 END),0)`,
    keluar: sql<number>`COALESCE(SUM(CASE WHEN ${jurnal_kas.jenis}='keluar' THEN ${jurnal_kas.jumlah} ELSE 0 END),0)`,
  }).from(jurnal_kas)
    .where(lte(jurnal_kas.tanggal, batasTgl))
    .groupBy(jurnal_kas.kas_bank_id).all()
  const jurnalAkunMap = new Map(jurnalPerAkun.map((r) => [r.kas_bank_id, r]))

  const kasBank = akunList.map((akun) => {
    const j = jurnalAkunMap.get(akun.id) ?? { masuk: 0, keluar: 0 }
    const saldo = akun.saldo_awal + j.masuk - j.keluar
    return { id: akun.id, nama: akun.nama, tipe: akun.tipe, saldo }
  })
  const totalKasBank = kasBank.reduce((s, a) => s + a.saldo, 0)

  // 2. Piutang — dibuat sebelum per_tanggal dan belum lunas
  const piutangRows = db
    .select({ sisa: piutang_pelanggan.sisa_piutang })
    .from(piutang_pelanggan)
    .where(and(
      ne(piutang_pelanggan.status, 'lunas'),
      lte(piutang_pelanggan.created_at, batasTgl),
    ))
    .all()
  const totalPiutang = piutangRows.reduce((s, r) => s + r.sisa, 0)

  // 3. Nilai stok — gunakan WAC (harga_beli_rata), fallback ke harga_beli_terakhir
  const nilaiStokRow = db
    .select({
      total: sql<number>`sum(${barang.stok_sekarang} * CASE WHEN ${barang.harga_beli_rata} > 0 THEN ${barang.harga_beli_rata} ELSE ${barang.harga_beli_terakhir} END)`,
    })
    .from(barang)
    .where(eq(barang.is_active, true))
    .get()
  const totalNilaiStok = nilaiStokRow?.total ?? 0

  const totalAset = totalKasBank + totalPiutang + totalNilaiStok

  // LIABILITAS — hutang dibuat sebelum per_tanggal dan belum lunas
  const hutangRows = db
    .select({ sisa: hutang_supplier.sisa_hutang })
    .from(hutang_supplier)
    .where(and(
      ne(hutang_supplier.status, 'lunas'),
      lte(hutang_supplier.created_at, batasTgl),
    ))
    .all()
  const totalHutang = hutangRows.reduce((s, r) => s + r.sisa, 0)

  // MODAL (residual)
  const modal = totalAset - totalHutang

  return c.json({
    success: true,
    data: {
      per_tanggal: perTanggal,
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

// ── GET /laporan/aging ────────────────────────────────────────────────────
// Analisis umur piutang pelanggan & hutang supplier per bucket waktu

laporanRouter.get('/aging', requirePermission('laporan.lihat'), async (c) => {
  const today = hariIni()

  function hitungHari(jatuhTempo: string | null): number {
    if (!jatuhTempo) return 0
    const diff = new Date(today).getTime() - new Date(jatuhTempo).getTime()
    return Math.floor(diff / 86400000)
  }

  function bucket(hari: number): string {
    if (hari < 0) return 'belum_jatuh'
    if (hari <= 30) return '0_30'
    if (hari <= 60) return '31_60'
    if (hari <= 90) return '61_90'
    return 'lebih_90'
  }

  const LABELS: Record<string, string> = {
    belum_jatuh: 'Belum Jatuh Tempo',
    '0_30': '1–30 Hari',
    '31_60': '31–60 Hari',
    '61_90': '61–90 Hari',
    lebih_90: '>90 Hari',
  }
  const BUCKET_ORDER = ['belum_jatuh', '0_30', '31_60', '61_90', 'lebih_90']

  type AgingItem = { nama: string; sisa: number; hari: number; jatuh_tempo: string }
  type AgingBucket = { label: string; jumlah: number; total: number; items: AgingItem[] }

  // Piutang pelanggan
  const piutangRows = db
    .select({
      id: piutang_pelanggan.id,
      sisa_piutang: piutang_pelanggan.sisa_piutang,
      tanggal_jatuh_tempo: piutang_pelanggan.tanggal_jatuh_tempo,
      nama: pelanggan.nama,
    })
    .from(piutang_pelanggan)
    .leftJoin(pelanggan, eq(piutang_pelanggan.pelanggan_id, pelanggan.id))
    .where(ne(piutang_pelanggan.status, 'lunas'))
    .all()

  const piutangBuckets: Record<string, AgingBucket> = {}
  for (const key of BUCKET_ORDER) {
    piutangBuckets[key] = { label: LABELS[key]!, jumlah: 0, total: 0, items: [] }
  }
  let totalPiutang = 0
  for (const r of piutangRows) {
    const hari = hitungHari(r.tanggal_jatuh_tempo)
    const key = bucket(hari)
    piutangBuckets[key]!.jumlah++
    piutangBuckets[key]!.total += r.sisa_piutang ?? 0
    piutangBuckets[key]!.items.push({
      nama: r.nama ?? '(tanpa pelanggan)',
      sisa: r.sisa_piutang ?? 0,
      hari,
      jatuh_tempo: r.tanggal_jatuh_tempo ?? '',
    })
    totalPiutang += r.sisa_piutang ?? 0
  }

  // Hutang supplier
  const hutangRows = db
    .select({
      id: hutang_supplier.id,
      sisa_hutang: hutang_supplier.sisa_hutang,
      tanggal_jatuh_tempo: hutang_supplier.tanggal_jatuh_tempo,
      nama: supplier.nama_supplier,
    })
    .from(hutang_supplier)
    .leftJoin(supplier, eq(hutang_supplier.supplier_id, supplier.id))
    .where(ne(hutang_supplier.status, 'lunas'))
    .all()

  const hutangBuckets: Record<string, AgingBucket> = {}
  for (const key of BUCKET_ORDER) {
    hutangBuckets[key] = { label: LABELS[key]!, jumlah: 0, total: 0, items: [] }
  }
  let totalHutangAging = 0
  for (const r of hutangRows) {
    const hari = hitungHari(r.tanggal_jatuh_tempo)
    const key = bucket(hari)
    hutangBuckets[key]!.jumlah++
    hutangBuckets[key]!.total += r.sisa_hutang ?? 0
    hutangBuckets[key]!.items.push({
      nama: r.nama ?? '(tanpa supplier)',
      sisa: r.sisa_hutang ?? 0,
      hari,
      jatuh_tempo: r.tanggal_jatuh_tempo ?? '',
    })
    totalHutangAging += r.sisa_hutang ?? 0
  }

  return c.json({
    success: true,
    data: {
      per_tanggal: today,
      piutang: BUCKET_ORDER.map(k => piutangBuckets[k]),
      hutang: BUCKET_ORDER.map(k => hutangBuckets[k]),
      total_piutang: totalPiutang,
      total_hutang: totalHutangAging,
    },
  })
})

// ── POST /laporan/init-harga-rata — hitung WAC awal dari histori barang_masuk ──

laporanRouter.post('/init-harga-rata', requirePermission('*'), async (c) => {
  // Ambil semua histori penerimaan barang diurutkan dari terlama
  const histori = db
    .select({
      barang_id: barang_masuk_detail.barang_id,
      jumlah: barang_masuk_detail.jumlah_terima,
      harga: barang_masuk_detail.harga_beli,
    })
    .from(barang_masuk_detail)
    .orderBy(barang_masuk_detail.id)
    .all()

  // Hitung WAC per barang secara kronologis
  const wacMap = new Map<number, { rata: number; stok: number }>()
  for (const h of histori) {
    const cur = wacMap.get(h.barang_id) ?? { rata: 0, stok: 0 }
    const stokBaru = cur.stok + h.jumlah
    const rataBaru = stokBaru > 0
      ? (cur.stok * cur.rata + h.jumlah * h.harga) / stokBaru
      : h.harga
    wacMap.set(h.barang_id, { rata: rataBaru, stok: stokBaru })
  }

  // Update harga_beli_rata untuk semua barang yang punya histori
  let updated = 0
  sqlite.transaction(() => {
    for (const [barangId, { rata }] of wacMap) {
      if (rata <= 0) continue
      db.update(barang)
        .set({ harga_beli_rata: Math.round(rata) })
        .where(eq(barang.id, barangId))
        .run()
      updated++
    }
  })()

  return c.json({ success: true, data: { barang_diupdate: updated } })
})

// ── GET /laporan/rekonsiliasi-diskon — preview transaksi yang totalnya salah ──

laporanRouter.get('/rekonsiliasi-diskon', requirePermission('*'), async (c) => {
  // Transaksi non-hutang, non-void, kembalian=0, tapi bayar < total
  // → diskon member/promo tidak tercatat karena bug lama
  const affected = db
    .select({
      id: penjualan.id,
      no_transaksi: penjualan.no_transaksi,
      tanggal: penjualan.tanggal,
      subtotal: penjualan.subtotal,
      diskon_total_lama: penjualan.diskon_total,
      total_lama: penjualan.total,
      bayar: penjualan.bayar,
      selisih: sql<number>`${penjualan.total} - ${penjualan.bayar}`,
    })
    .from(penjualan)
    .where(
      and(
        ne(penjualan.status, 'void'),
        ne(penjualan.metode_bayar, 'hutang'),
        sql`${penjualan.bayar} > 0`,
        sql`${penjualan.bayar} < ${penjualan.total}`,
        sql`${penjualan.kembalian} = 0`,
      )
    )
    .orderBy(penjualan.tanggal)
    .all()

  const totalSelisih = affected.reduce((s, r) => s + r.selisih, 0)

  return c.json({
    success: true,
    data: {
      jumlah_transaksi: affected.length,
      total_selisih: Math.round(totalSelisih),
      keterangan: 'Selisih = diskon yang diberikan ke pelanggan tapi tidak tercatat di database',
      transaksi: affected,
    },
  })
})

// ── GET /laporan/margin-produk — margin per SKU dalam periode ────────────────

laporanRouter.get('/margin-produk', requirePermission('laporan.lihat'), async (c) => {
  const { dari, sampai } = {
    dari: c.req.query('dari') ?? bulanIni().dari,
    sampai: c.req.query('sampai') ?? bulanIni().sampai,
  }

  const rows = db
    .select({
      barang_id: barang.id,
      nama_barang: barang.nama_barang,
      kategori_nama: kategori.nama,
      qty_terjual: sql<number>`COALESCE(SUM(${penjualan_detail.jumlah}), 0)`,
      jumlah_transaksi: sql<number>`COUNT(DISTINCT ${penjualan.id})`,
      omset: sql<number>`COALESCE(SUM(${penjualan_detail.jumlah} * ${penjualan_detail.harga_jual}), 0)`,
      hpp: sql<number>`COALESCE(SUM(${penjualan_detail.jumlah} * CASE WHEN ${barang.harga_beli_rata} > 0 THEN ${barang.harga_beli_rata} ELSE ${barang.harga_beli_terakhir} END), 0)`,
    })
    .from(penjualan_detail)
    .innerJoin(penjualan, eq(penjualan_detail.penjualan_id, penjualan.id))
    .innerJoin(barang, eq(penjualan_detail.barang_id, barang.id))
    .leftJoin(kategori, eq(barang.kategori_id, kategori.id))
    .where(
      and(
        ne(penjualan.status, 'void'),
        gte(penjualan.tanggal, dari),
        lte(penjualan.tanggal, sampai + ' 23:59:59'),
      )
    )
    .groupBy(barang.id)
    .orderBy(sql`omset DESC`)
    .all()

  const produk = rows.map((r) => {
    const margin = r.omset - r.hpp
    const margin_pct = r.omset > 0 ? (margin / r.omset) * 100 : 0
    return {
      barang_id: r.barang_id,
      nama_barang: r.nama_barang,
      kategori: r.kategori_nama ?? '—',
      qty_terjual: r.qty_terjual,
      jumlah_transaksi: r.jumlah_transaksi,
      omset: Math.round(r.omset),
      hpp: Math.round(r.hpp),
      margin: Math.round(margin),
      margin_pct: Math.round(margin_pct * 100) / 100,
    }
  })

  const total_omset = produk.reduce((s, p) => s + p.omset, 0)
  const total_hpp = produk.reduce((s, p) => s + p.hpp, 0)
  const total_margin = total_omset - total_hpp
  const margin_pct_rata = total_omset > 0 ? Math.round((total_margin / total_omset) * 10000) / 100 : 0

  return c.json({
    success: true,
    data: { periode: { dari, sampai }, produk, total_omset, total_hpp, total_margin, margin_pct_rata },
  })
})

// ── GET /laporan/pajak-umkm — estimasi PPh Final 0.5% per bulan (PP 23/2018) ───

laporanRouter.get('/pajak-umkm', requirePermission('laporan.lihat'), async (c) => {
  const now = new Date()
  const tahun = c.req.query('tahun') ?? String(now.getFullYear())

  if (!/^\d{4}$/.test(tahun)) {
    return c.json({ success: false, error: 'Format tahun tidak valid. Gunakan YYYY' }, 400)
  }

  const rows = db
    .select({
      periode: sql<string>`strftime('%Y-%m', tanggal)`,
      omset: sql<number>`COALESCE(SUM(total), 0)`,
      jumlah_transaksi: sql<number>`COUNT(*)`,
    })
    .from(penjualan)
    .where(
      and(
        ne(penjualan.status, 'void'),
        sql`strftime('%Y', ${penjualan.tanggal}) = ${tahun}`,
      )
    )
    .groupBy(sql`strftime('%Y-%m', tanggal)`)
    .orderBy(sql`strftime('%Y-%m', tanggal)`)
    .all()

  // Pastikan semua 12 bulan muncul (bulan tanpa penjualan = 0)
  const bulanMap = new Map<string, { omset: number; jumlah_transaksi: number }>()
  for (const r of rows) {
    bulanMap.set(r.periode, { omset: r.omset, jumlah_transaksi: r.jumlah_transaksi })
  }

  const bulan = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0')
    const periode = `${tahun}-${m}`
    const data = bulanMap.get(periode) ?? { omset: 0, jumlah_transaksi: 0 }
    return {
      periode,
      omset: data.omset,
      pajak: Math.round(data.omset * 0.005),
      jumlah_transaksi: data.jumlah_transaksi,
    }
  })

  const total_omset = bulan.reduce((s, b) => s + b.omset, 0)
  const total_pajak = Math.round(total_omset * 0.005)

  return c.json({
    success: true,
    data: { tahun, bulan, total_omset, total_pajak },
  })
})

// ── GET /laporan/persediaan — nilai stok saat ini per produk ─────────────────

laporanRouter.get('/persediaan', requirePermission('laporan.lihat'), async (c) => {
  const rows = db
    .select({
      barang_id: barang.id,
      nama_barang: barang.nama_barang,
      kategori_nama: kategori.nama,
      stok: barang.stok_sekarang,
      harga_beli_rata: barang.harga_beli_rata,
      harga_beli_terakhir: barang.harga_beli_terakhir,
    })
    .from(barang)
    .leftJoin(kategori, eq(barang.kategori_id, kategori.id))
    .where(eq(barang.is_active, true))
    .orderBy(sql`nilai_stok DESC`)
    .all()

  const produk = rows.map((r) => {
    const hpp = r.harga_beli_rata > 0 ? r.harga_beli_rata : r.harga_beli_terakhir
    const nilai_stok = Math.round(r.stok * hpp)
    return {
      barang_id: r.barang_id,
      nama_barang: r.nama_barang,
      kategori: r.kategori_nama ?? '—',
      stok: r.stok,
      hpp,
      nilai_stok,
    }
  }).sort((a, b) => b.nilai_stok - a.nilai_stok)

  const total_nilai = produk.reduce((s, p) => s + p.nilai_stok, 0)
  const jumlah_sku = produk.length
  const sku_tanpa_stok = produk.filter((p) => p.stok <= 0).length

  return c.json({
    success: true,
    data: {
      per_tanggal: hariIni(),
      produk,
      total_nilai,
      jumlah_sku,
      sku_tanpa_stok,
    },
  })
})

// ── GET /laporan/top-pelanggan — omset & transaksi per pelanggan ──────────────

laporanRouter.get('/top-pelanggan', requirePermission('laporan.lihat'), async (c) => {
  const { dari, sampai } = {
    dari: c.req.query('dari') ?? bulanIni().dari,
    sampai: c.req.query('sampai') ?? bulanIni().sampai,
  }
  const limit = Math.min(Number(c.req.query('limit') ?? 20), 100)

  const rows = db
    .select({
      pelanggan_id: pelanggan.id,
      nama: pelanggan.nama,
      tipe: pelanggan.tipe,
      kontak: pelanggan.kontak,
      jumlah_transaksi: sql<number>`COUNT(DISTINCT ${penjualan.id})`,
      total_omset: sql<number>`COALESCE(SUM(${penjualan.total}), 0)`,
      total_diskon: sql<number>`COALESCE(SUM(${penjualan.diskon_total}), 0)`,
    })
    .from(penjualan)
    .innerJoin(pelanggan, eq(penjualan.pelanggan_id, pelanggan.id))
    .where(
      and(
        ne(penjualan.status, 'void'),
        gte(penjualan.tanggal, dari),
        lte(penjualan.tanggal, sampai + ' 23:59:59'),
      )
    )
    .groupBy(pelanggan.id)
    .orderBy(sql`total_omset DESC`)
    .limit(limit)
    .all()

  const total_omset_semua = rows.reduce((s, r) => s + r.total_omset, 0)

  return c.json({
    success: true,
    data: {
      periode: { dari, sampai },
      pelanggan: rows.map((r) => ({
        ...r,
        total_omset: Math.round(r.total_omset),
        total_diskon: Math.round(r.total_diskon),
        pct_omset: total_omset_semua > 0 ? Math.round((r.total_omset / total_omset_semua) * 1000) / 10 : 0,
      })),
      total_omset: Math.round(total_omset_semua),
    },
  })
})

// ── GET /laporan/pembelian-supplier — rekapitulasi pembelian per supplier ─────

laporanRouter.get('/pembelian-supplier', requirePermission('laporan.lihat'), async (c) => {
  const { dari, sampai } = {
    dari: c.req.query('dari') ?? bulanIni().dari,
    sampai: c.req.query('sampai') ?? bulanIni().sampai,
  }

  const rows = db
    .select({
      supplier_id: supplier.id,
      nama_supplier: supplier.nama_supplier,
      kontak: supplier.kontak,
      jumlah_penerimaan: sql<number>`COUNT(DISTINCT ${barang_masuk.id})`,
      total_pembelian: sql<number>`COALESCE(SUM(${barang_masuk.total_nilai}), 0)`,
    })
    .from(barang_masuk)
    .innerJoin(supplier, eq(barang_masuk.supplier_id, supplier.id))
    .where(
      and(
        gte(barang_masuk.tanggal_terima, dari),
        lte(barang_masuk.tanggal_terima, sampai),
      )
    )
    .groupBy(supplier.id)
    .orderBy(sql`total_pembelian DESC`)
    .all()

  const total_semua = rows.reduce((s, r) => s + r.total_pembelian, 0)

  return c.json({
    success: true,
    data: {
      periode: { dari, sampai },
      supplier: rows.map((r) => ({
        ...r,
        total_pembelian: Math.round(r.total_pembelian),
        pct_pembelian: total_semua > 0 ? Math.round((r.total_pembelian / total_semua) * 1000) / 10 : 0,
      })),
      total_pembelian: Math.round(total_semua),
    },
  })
})

// ── GET /laporan/rekap-penggajian — ringkasan biaya SDM per bulan ─────────────

laporanRouter.get('/rekap-penggajian', requirePermission('laporan.lihat'), async (c) => {
  const now = new Date()
  const tahun = c.req.query('tahun') ?? String(now.getFullYear())

  if (!/^\d{4}$/.test(tahun)) {
    return c.json({ success: false, error: 'Format tahun tidak valid. Gunakan YYYY' }, 400)
  }

  const rows = db
    .select({
      periode_bulan: penggajian.periode_bulan,
      jumlah_karyawan: sql<number>`COUNT(DISTINCT ${penggajian.karyawan_id})`,
      total_gaji_pokok: sql<number>`COALESCE(SUM(${penggajian.gaji_pokok}), 0)`,
      total_tunjangan: sql<number>`COALESCE(SUM(${penggajian.tunjangan}), 0)`,
      total_potongan_kasbon: sql<number>`COALESCE(SUM(${penggajian.potongan_kasbon}), 0)`,
      total_potongan_lain: sql<number>`COALESCE(SUM(${penggajian.potongan_lain}), 0)`,
      total_gaji: sql<number>`COALESCE(SUM(${penggajian.total_gaji}), 0)`,
    })
    .from(penggajian)
    .where(
      and(
        sql`substr(${penggajian.periode_bulan}, 1, 4) = ${tahun}`,
        ne(penggajian.status, 'draft'),
      )
    )
    .groupBy(penggajian.periode_bulan)
    .orderBy(penggajian.periode_bulan)
    .all()

  // Pastikan semua 12 bulan muncul
  const bulanMap = new Map(rows.map((r) => [r.periode_bulan, r]))
  const bulan = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0')
    const periode = `${tahun}-${m}`
    const d = bulanMap.get(periode)
    return {
      periode_bulan: periode,
      jumlah_karyawan: d?.jumlah_karyawan ?? 0,
      total_gaji_pokok: Math.round(d?.total_gaji_pokok ?? 0),
      total_tunjangan: Math.round(d?.total_tunjangan ?? 0),
      total_potongan: Math.round((d?.total_potongan_kasbon ?? 0) + (d?.total_potongan_lain ?? 0)),
      total_gaji: Math.round(d?.total_gaji ?? 0),
    }
  })

  const total_gaji_tahun = bulan.reduce((s, b) => s + b.total_gaji, 0)

  return c.json({
    success: true,
    data: { tahun, bulan, total_gaji_tahun },
  })
})

// ── POST /laporan/rekonsiliasi-diskon — terapkan fix ke semua transaksi afected ──

// ── GET /laporan/analitik-jam — distribusi transaksi per jam ──────────────
// Bantu pemilik melihat "jam sibuk" untuk atur jadwal shift

laporanRouter.get('/analitik-jam', requirePermission('laporan.lihat'), async (c) => {
  const sekarang = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' })
  const hariIni = sekarang.slice(0, 10)
  const tigaPuluhHariLalu = new Date(Date.now() - 30 * 86400000)
    .toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)

  const dari = c.req.query('dari') ?? tigaPuluhHariLalu
  const sampai = c.req.query('sampai') ?? hariIni

  const rows = db
    .select({
      jam: sql<string>`strftime('%H', ${penjualan.tanggal})`,
      jumlah_transaksi: sql<number>`COUNT(*)`,
      omzet: sql<number>`COALESCE(SUM(${penjualan.total}), 0)`,
      rata_per_trx: sql<number>`COALESCE(AVG(${penjualan.total}), 0)`,
    })
    .from(penjualan)
    .where(and(
      gte(penjualan.tanggal, dari),
      lte(penjualan.tanggal, sampai + ' 23:59:59'),
      ne(penjualan.status, 'void'),
    ))
    .groupBy(sql`strftime('%H', ${penjualan.tanggal})`)
    .orderBy(sql`strftime('%H', ${penjualan.tanggal})`)
    .all()

  const byJam = new Map(rows.map(r => [r.jam, r]))
  const per_jam = Array.from({ length: 24 }, (_, i) => {
    const jam = String(i).padStart(2, '0')
    return byJam.get(jam) ?? { jam, jumlah_transaksi: 0, omzet: 0, rata_per_trx: 0 }
  })

  const maxTrx = Math.max(...per_jam.map(r => r.jumlah_transaksi), 1)
  const jam_sibuk = per_jam.filter(r => r.jumlah_transaksi >= maxTrx * 0.7).map(r => r.jam)

  const total_transaksi = per_jam.reduce((s, r) => s + r.jumlah_transaksi, 0)
  const total_omzet = per_jam.reduce((s, r) => s + r.omzet, 0)

  return c.json({
    success: true,
    data: { dari, sampai, per_jam, jam_sibuk, total_transaksi, total_omzet },
  })
})

laporanRouter.post('/rekonsiliasi-diskon', requirePermission('*'), async (c) => {
  const affected = db
    .select({
      id: penjualan.id,
      total: penjualan.total,
      bayar: penjualan.bayar,
    })
    .from(penjualan)
    .where(
      and(
        ne(penjualan.status, 'void'),
        ne(penjualan.metode_bayar, 'hutang'),
        sql`${penjualan.bayar} > 0`,
        sql`${penjualan.bayar} < ${penjualan.total}`,
        sql`${penjualan.kembalian} = 0`,
      )
    )
    .all()

  let fixed = 0
  sqlite.transaction(() => {
    for (const trx of affected) {
      const diskonBaru = trx.total - trx.bayar   // selisih = diskon yang hilang
      db.update(penjualan)
        .set({
          diskon_total: diskonBaru,
          total: trx.bayar,                       // total = bayar (yang benar)
        })
        .where(eq(penjualan.id, trx.id))
        .run()
      fixed++
    }
  })()

  return c.json({
    success: true,
    data: {
      transaksi_diperbaiki: fixed,
      keterangan: 'diskon_total dan total telah diperbarui sesuai bayar aktual',
    },
  })
})
