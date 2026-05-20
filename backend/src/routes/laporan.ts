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
  barang_masuk_detail,
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

// ── POST /laporan/rekonsiliasi-diskon — terapkan fix ke semua transaksi afected ──

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
