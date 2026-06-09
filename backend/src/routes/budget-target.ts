import { Hono } from 'hono'
import { eq, and, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import { target_penjualan, budget_operasional, jurnal_kas, penjualan, penjualan_detail, barang } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import type { JWTPayload } from './auth.ts'

export const budgetTargetRouter = new Hono<{ Variables: { user: JWTPayload } }>()

budgetTargetRouter.use('*', authMiddleware)

// Kategori pengeluaran yang bisa dianggarkan — harus match nilai jurnal_kas.kategori
const KATEGORI_BUDGET = ['gaji', 'sewa', 'listrik', 'kemasan', 'operasional', 'lain'] as const
type KategoriBudget = typeof KATEGORI_BUDGET[number]

// ── GET /budget-target/histori/ringkasan ─────────────────────────────────────
// HARUS didaftarkan sebelum /:periode agar tidak tertutup oleh dynamic route
// Riwayat target + ringkasan realisasi 6 bulan terakhir

budgetTargetRouter.get('/histori/ringkasan', requirePermission('laporan.lihat'), async (c) => {
  const periodeList: string[] = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const p = d.toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 7)
    periodeList.push(p)
  }

  const targets = await query.findAll(db.select().from(target_penjualan)
    .where(sql`periode_bulan IN (${sql.join(periodeList.map(p => sql`${p}`), sql`, `)})`)
  )

  const realisasiRows = await query.findAll(db.select({
    periode: sql<string>`strftime('%Y-%m', tanggal)`,
    omzet: sql<number>`COALESCE(SUM(total), 0)`,
    transaksi: sql<number>`COUNT(*)`,
  })
    .from(penjualan)
    .where(and(
      sql`strftime('%Y-%m', tanggal) >= ${periodeList[periodeList.length - 1]}`,
      eq(penjualan.status, 'lunas'),
    ))
    .groupBy(sql`strftime('%Y-%m', tanggal)`)
    )

  const realisasiMap = Object.fromEntries(
    realisasiRows.map(r => [r.periode, { omzet: r.omzet, transaksi: r.transaksi }])
  )

  const histori = periodeList.map(p => ({
    periode: p,
    target: targets.find(t => t.periode_bulan === p) ?? null,
    realisasi: realisasiMap[p] ?? { omzet: 0, transaksi: 0 },
  }))

  return c.json({ success: true, data: histori })
})

// ── GET /budget-target/:periode ───────────────────────────────────────────────
// Ambil target penjualan + semua budget operasional untuk satu bulan

budgetTargetRouter.get('/:periode', requirePermission('laporan.lihat'), async (c) => {
  const periode = c.req.param('periode') ?? ''
  if (!/^\d{4}-\d{2}$/.test(periode)) {
    throw new HTTPException(400, { message: 'Format periode tidak valid. Gunakan YYYY-MM' })
  }

  const target = await query.find(db.select().from(target_penjualan)
    .where(eq(target_penjualan.periode_bulan, periode))
  ) ?? null

  const budgets = await query.findAll(db.select().from(budget_operasional)
    .where(eq(budget_operasional.periode_bulan, periode))
  )

  return c.json({ success: true, data: { target, budgets } })
})

// ── POST /budget-target/target ────────────────────────────────────────────────
// Set atau update target penjualan (upsert by periode_bulan)

budgetTargetRouter.post('/target', requirePermission('laporan.lihat'), async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{
    periode_bulan: string
    target_omzet?: number
    target_transaksi?: number
    target_margin_pct?: number
    catatan?: string
  }>()

  if (!body.periode_bulan || !/^\d{4}-\d{2}$/.test(body.periode_bulan)) {
    throw new HTTPException(400, { message: 'periode_bulan wajib diisi (format YYYY-MM)' })
  }

  const existing = await query.find(db.select().from(target_penjualan)
    .where(eq(target_penjualan.periode_bulan, body.periode_bulan))
  )

  if (existing) {
    const updated = await query.find(db.update(target_penjualan)
      .set({
        target_omzet: body.target_omzet ?? existing.target_omzet,
        target_transaksi: body.target_transaksi ?? existing.target_transaksi,
        target_margin_pct: body.target_margin_pct ?? existing.target_margin_pct,
        catatan: body.catatan ?? existing.catatan,
        updated_at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }),
      })
      .where(eq(target_penjualan.id, existing.id))
      .returning()
      )
    return c.json({ success: true, data: updated })
  }

  const created = await query.ret(db.insert(target_penjualan).values({
    periode_bulan: body.periode_bulan,
    target_omzet: body.target_omzet ?? 0,
    target_transaksi: body.target_transaksi ?? 0,
    target_margin_pct: body.target_margin_pct ?? 0,
    catatan: body.catatan,
    dibuat_oleh: Number(user.sub),
  }).returning())

  return c.json({ success: true, data: created }, 201)
})

// ── POST /budget-target/budget ────────────────────────────────────────────────
// Set atau update budget satu kategori (upsert by periode_bulan + kategori)

budgetTargetRouter.post('/budget', requirePermission('laporan.lihat'), async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{
    periode_bulan: string
    kategori: KategoriBudget
    nilai_budget: number
    catatan?: string
  }>()

  if (!body.periode_bulan || !/^\d{4}-\d{2}$/.test(body.periode_bulan)) {
    throw new HTTPException(400, { message: 'periode_bulan wajib diisi (format YYYY-MM)' })
  }
  if (!KATEGORI_BUDGET.includes(body.kategori)) {
    throw new HTTPException(400, { message: `Kategori tidak valid. Pilih: ${KATEGORI_BUDGET.join(', ')}` })
  }
  if (typeof body.nilai_budget !== 'number' || body.nilai_budget < 0) {
    throw new HTTPException(400, { message: 'nilai_budget harus angka >= 0' })
  }

  const existing = await query.find(db.select().from(budget_operasional)
    .where(and(
      eq(budget_operasional.periode_bulan, body.periode_bulan),
      eq(budget_operasional.kategori, body.kategori),
    ))
    )

  if (existing) {
    const updated = await query.find(db.update(budget_operasional)
      .set({
        nilai_budget: body.nilai_budget,
        catatan: body.catatan ?? existing.catatan,
        updated_at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }),
      })
      .where(eq(budget_operasional.id, existing.id))
      .returning()
      )
    return c.json({ success: true, data: updated })
  }

  const created = await query.ret(db.insert(budget_operasional).values({
    periode_bulan: body.periode_bulan,
    kategori: body.kategori,
    nilai_budget: body.nilai_budget,
    catatan: body.catatan,
    dibuat_oleh: Number(user.sub),
  }).returning())

  return c.json({ success: true, data: created }, 201)
})

// ── GET /budget-target/:periode/realisasi ─────────────────────────────────────
// Bandingkan target + budget vs realisasi aktual dari data transaksi

budgetTargetRouter.get('/:periode/realisasi', requirePermission('laporan.lihat'), async (c) => {
  const periode = c.req.param('periode') ?? ''
  if (!/^\d{4}-\d{2}$/.test(periode)) {
    throw new HTTPException(400, { message: 'Format periode tidak valid. Gunakan YYYY-MM' })
  }

  // Realisasi omzet dari penjualan lunas
  const omzetRow = await query.find(db.select({
    total: sql<number>`COALESCE(SUM(total), 0)`,
    jumlah_transaksi: sql<number>`COUNT(*)`,
  })
    .from(penjualan)
    .where(and(
      sql`strftime('%Y-%m', tanggal) = ${periode}`,
      eq(penjualan.status, 'lunas'),
    ))
    )

  // Realisasi HPP: estimasi dari harga_beli_terakhir × jumlah terjual
  const hppRow = await query.find(db.select({
    hpp: sql<number>`COALESCE(SUM(${penjualan_detail.jumlah} * ${barang.harga_beli_terakhir}), 0)`,
  })
    .from(penjualan_detail)
    .innerJoin(penjualan, eq(penjualan_detail.penjualan_id, penjualan.id))
    .innerJoin(barang, eq(penjualan_detail.barang_id, barang.id))
    .where(and(
      sql`strftime('%Y-%m', ${penjualan.tanggal}) = ${periode}`,
      eq(penjualan.status, 'lunas'),
    ))
    )

  const omzet = omzetRow?.total ?? 0
  const hpp = hppRow?.hpp ?? 0
  const labaKotor = omzet - hpp
  const marginPct = omzet > 0 ? (labaKotor / omzet) * 100 : 0

  // Realisasi pengeluaran per kategori dari jurnal_kas
  const pengeluaranRows = await query.findAll(db.select({
    kategori: jurnal_kas.kategori,
    total: sql<number>`COALESCE(SUM(jumlah), 0)`,
  })
    .from(jurnal_kas)
    .where(and(
      sql`strftime('%Y-%m', tanggal) = ${periode}`,
      eq(jurnal_kas.jenis, 'keluar'),
    ))
    .groupBy(jurnal_kas.kategori)
    )

  // Map ke objek kategori → total untuk memudahkan frontend
  const pengeluaran: Record<string, number> = {}
  for (const row of pengeluaranRows) {
    pengeluaran[row.kategori] = row.total
  }

  // Realisasi khusus per KATEGORI_BUDGET (0 jika tidak ada jurnal)
  const realisasiBudget = KATEGORI_BUDGET.reduce<Record<string, number>>((acc, kat) => {
    acc[kat] = pengeluaran[kat] ?? 0
    return acc
  }, {})

  return c.json({
    success: true,
    data: {
      periode,
      realisasi_omzet: omzet,
      realisasi_transaksi: omzetRow?.jumlah_transaksi ?? 0,
      realisasi_margin_pct: Math.round(marginPct * 100) / 100,
      realisasi_hpp: hpp,
      realisasi_budget: realisasiBudget,
    },
  })
})

// ── GET /budget-target/:periode/proyeksi ──────────────────────────────────────
// Proyeksi akhir bulan berdasarkan tren linear hari berjalan

budgetTargetRouter.get('/:periode/proyeksi', requirePermission('laporan.lihat'), async (c) => {
  const periode = c.req.param('periode') ?? ''
  if (!/^\d{4}-\d{2}$/.test(periode)) {
    throw new HTTPException(400, { message: 'Format periode tidak valid. Gunakan YYYY-MM' })
  }

  const parts = periode.split('-')
  const tahun = Number(parts[0])
  const bulan = Number(parts[1])
  const hariDalamBulan = new Date(tahun, bulan, 0).getDate()
  const hariIni = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)
  const hariSekarang = hariIni.startsWith(periode)
    ? Number(hariIni.slice(8, 10))
    : hariDalamBulan // periode lampau → anggap sudah selesai

  const omzetRow = await query.find(db.select({
    total: sql<number>`COALESCE(SUM(total), 0)`,
  })
    .from(penjualan)
    .where(and(
      sql`strftime('%Y-%m', tanggal) = ${periode}`,
      eq(penjualan.status, 'lunas'),
    ))
    )

  const omzetSaatIni = omzetRow?.total ?? 0
  const proyeksi = hariSekarang > 0
    ? Math.round((omzetSaatIni / hariSekarang) * hariDalamBulan)
    : 0

  return c.json({
    success: true,
    data: {
      periode,
      hari_sekarang: hariSekarang,
      hari_dalam_bulan: hariDalamBulan,
      omzet_saat_ini: omzetSaatIni,
      proyeksi_omzet: proyeksi,
    },
  })
})

// ── POST /budget-target/salin ─────────────────────────────────────────────────
// Salin target & budget dari bulan sumber ke bulan tujuan

budgetTargetRouter.post('/salin', requirePermission('laporan.lihat'), async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{ dari: string; ke: string }>()

  if (!/^\d{4}-\d{2}$/.test(body.dari) || !/^\d{4}-\d{2}$/.test(body.ke)) {
    throw new HTTPException(400, { message: 'Format periode tidak valid. Gunakan YYYY-MM' })
  }
  if (body.dari === body.ke) {
    throw new HTTPException(400, { message: 'Periode sumber dan tujuan tidak boleh sama' })
  }

  const sumberTarget = await query.find(db.select().from(target_penjualan)
    .where(eq(target_penjualan.periode_bulan, body.dari))
  )

  const sumberBudgets = await query.findAll(db.select().from(budget_operasional)
    .where(eq(budget_operasional.periode_bulan, body.dari))
  )

  if (!sumberTarget && sumberBudgets.length === 0) {
    throw new HTTPException(404, { message: `Tidak ada data di periode ${body.dari}` })
  }

  // Upsert target
  let targetBaru = null
  if (sumberTarget) {
    const existingTarget = await query.find(db.select().from(target_penjualan)
      .where(eq(target_penjualan.periode_bulan, body.ke))
    )

    if (existingTarget) {
      targetBaru = await query.find(db.update(target_penjualan)
        .set({
          target_omzet: sumberTarget.target_omzet,
          target_transaksi: sumberTarget.target_transaksi,
          target_margin_pct: sumberTarget.target_margin_pct,
          updated_at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }),
        })
        .where(eq(target_penjualan.id, existingTarget.id))
        .returning()
        )
    } else {
      targetBaru = await query.ret(db.insert(target_penjualan).values({
        periode_bulan: body.ke,
        target_omzet: sumberTarget.target_omzet,
        target_transaksi: sumberTarget.target_transaksi,
        target_margin_pct: sumberTarget.target_margin_pct,
        dibuat_oleh: Number(user.sub),
      }).returning())
    }
  }

  // Upsert budgets
  const budgetBaru = []
  for (const src of sumberBudgets) {
    const existing = await query.find(db.select().from(budget_operasional)
      .where(and(
        eq(budget_operasional.periode_bulan, body.ke),
        eq(budget_operasional.kategori, src.kategori),
      ))
      )

    if (existing) {
      const updated = await query.ret(db.update(budget_operasional)
        .set({ nilai_budget: src.nilai_budget, updated_at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }) })
        .where(eq(budget_operasional.id, existing.id))
        .returning()
      )
      budgetBaru.push(updated)
    } else {
      const created = await query.ret(db.insert(budget_operasional).values({
        periode_bulan: body.ke,
        kategori: src.kategori,
        nilai_budget: src.nilai_budget,
        dibuat_oleh: Number(user.sub),
      }).returning())
      budgetBaru.push(created)
    }
  }

  return c.json({ success: true, data: { target: targetBaru, budgets: budgetBaru } })
})
