import { Hono } from 'hono'
import { eq, and, desc, gte, lte, ne, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, isoNow } from '../db/index.ts'
import { shift_kasir, penjualan, karyawan } from '../db/schema.ts'
import { authMiddleware } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import type { JWTPayload } from './auth.ts'

export const shiftRouter = new Hono<{ Variables: { user: JWTPayload } }>()

shiftRouter.use('*', authMiddleware)
shiftRouter.use('*', tenantMiddleware)

function jamSekarang(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(11, 16)
}

function tglSekarang(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)
}

// ── GET /shift/rekap-aktif ────────────────────────────────────────────────
// Live penjualan stats untuk shift yang sedang buka (tanpa menutup shift)
// Digunakan oleh modal tutup shift agar kasir bisa lihat rekap sebelum tutup

shiftRouter.get('/rekap-aktif', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? null

  const shift = await query.find<typeof shift_kasir.$inferSelect>(db
    .select()
    .from(shift_kasir)
    .where(
      and(
        eq(shift_kasir.karyawan_id, user.id),
        eq(shift_kasir.status, 'buka'),
        eq(shift_kasir.tanggal, tglSekarang()),
        eq(shift_kasir.tenant_id, tenantId),
        cabangId ? eq(shift_kasir.cabang_id, cabangId) : undefined,
      )
    )
    )

  if (!shift) return c.json({ success: true, data: null })

  const rows = await query.findAll<{ metode: string | null; jumlah_trx: number; total: number }>(db
    .select({
      metode: penjualan.metode_bayar,
      jumlah_trx: sql<number>`count(*)`,
      total: sql<number>`COALESCE(sum(${penjualan.total}), 0)`,
    })
    .from(penjualan)
    .where(
      and(
        ne(penjualan.status, 'void'),
        eq(penjualan.kasir_id, user.id),
        eq(penjualan.tenant_id, tenantId),
        cabangId ? eq(penjualan.cabang_id, cabangId) : undefined,
        gte(penjualan.tanggal, `${shift.tanggal} ${shift.jam_buka}`),
      )
    )
    .groupBy(penjualan.metode_bayar)
    )

  let tunai = 0, transfer = 0, qris = 0, hutang = 0
  let total_trx = 0, total_semua = 0
  for (const r of rows) {
    total_trx += r.jumlah_trx
    total_semua += r.total
    if (r.metode === 'tunai') tunai = r.total
    else if (r.metode === 'transfer') transfer = r.total
    else if (r.metode === 'qris') qris = r.total
    else if (r.metode === 'hutang') hutang = r.total
  }

  return c.json({
    success: true,
    data: {
      shift_id: shift.id,
      jam_buka: shift.jam_buka,
      kas_awal: shift.kas_awal,
      kas_sistem: shift.kas_awal + tunai,
      jumlah_transaksi: total_trx,
      total_semua,
      tunai,
      transfer,
      qris,
      hutang,
    },
  })
})

// ── GET /shift/aktif ──────────────────────────────────────────────────────
// Cek apakah user punya shift yang sedang buka hari ini

shiftRouter.get('/aktif', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? null

  const shift = await query.find(db
    .select({
      id: shift_kasir.id,
      tanggal: shift_kasir.tanggal,
      jam_buka: shift_kasir.jam_buka,
      kas_awal: shift_kasir.kas_awal,
      jumlah_transaksi: shift_kasir.jumlah_transaksi,
      total_penjualan: shift_kasir.total_penjualan,
      status: shift_kasir.status,
    })
    .from(shift_kasir)
    .where(
      and(
        eq(shift_kasir.karyawan_id, user.id),
        eq(shift_kasir.status, 'buka'),
        eq(shift_kasir.tanggal, tglSekarang()),
        eq(shift_kasir.tenant_id, tenantId),
        cabangId ? eq(shift_kasir.cabang_id, cabangId) : undefined,
      )
    )
    )

  return c.json({ success: true, data: shift ?? null })
})

// ── GET /shift ─────────────────────────────────────────────────────────────
// Riwayat shift user (bisa semua role, hanya milik sendiri kecuali pemilik/manajer)

shiftRouter.get('/', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? null
  const { dari, sampai } = c.req.query()

  const conditions = [
    eq(shift_kasir.tenant_id, tenantId),
    cabangId ? eq(shift_kasir.cabang_id, cabangId) : undefined,
    !['pemilik', 'manajer'].includes(user.role) ? eq(shift_kasir.karyawan_id, user.id) : undefined,
    dari ? gte(shift_kasir.tanggal, dari) : undefined,
    sampai ? lte(shift_kasir.tanggal, sampai) : undefined,
  ].filter(Boolean) as Parameters<typeof and>

  const rows = await query.findAll(db
    .select({
      id: shift_kasir.id,
      nama_kasir: karyawan.nama,
      tanggal: shift_kasir.tanggal,
      jam_buka: shift_kasir.jam_buka,
      jam_tutup: shift_kasir.jam_tutup,
      kas_awal: shift_kasir.kas_awal,
      kas_fisik: shift_kasir.kas_fisik,
      kas_sistem: shift_kasir.kas_sistem,
      selisih_kas: shift_kasir.selisih_kas,
      jumlah_transaksi: shift_kasir.jumlah_transaksi,
      total_penjualan: shift_kasir.total_penjualan,
      catatan: shift_kasir.catatan,
      status: shift_kasir.status,
    })
    .from(shift_kasir)
    .leftJoin(karyawan, eq(shift_kasir.karyawan_id, karyawan.id))
    .where(and(...conditions))
    .orderBy(desc(shift_kasir.tanggal))
    .limit(100)
    )

  return c.json({ success: true, data: rows })
})

// ── POST /shift/buka ──────────────────────────────────────────────────────

shiftRouter.post('/buka', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? 1
  const body = await c.req.json<{ kas_awal: number; catatan?: string }>()

  if (body.kas_awal == null || body.kas_awal < 0)
    throw new HTTPException(400, { message: 'Kas awal tidak valid' })

  // Cek sudah ada shift buka hari ini
  const existing = await query.find(db
    .select({ id: shift_kasir.id })
    .from(shift_kasir)
    .where(
      and(
        eq(shift_kasir.karyawan_id, user.id),
        eq(shift_kasir.status, 'buka'),
        eq(shift_kasir.tanggal, tglSekarang()),
        eq(shift_kasir.tenant_id, tenantId),
        eq(shift_kasir.cabang_id, cabangId),
      )
    )
    )

  if (existing) throw new HTTPException(400, { message: 'Shift hari ini sudah dibuka' })

  const row = await query.ret(db.insert(shift_kasir).values({
    karyawan_id: user.id,
    tanggal: tglSekarang(),
    jam_buka: jamSekarang(),
    kas_awal: body.kas_awal,
    catatan: body.catatan,
    status: 'buka',
    tenant_id: tenantId,
    cabang_id: cabangId,
  }).returning())

  return c.json({ success: true, data: row }, 201)
})

// ── POST /shift/tutup ─────────────────────────────────────────────────────

shiftRouter.post('/tutup', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? null
  const body = await c.req.json<{ kas_fisik: number; catatan?: string }>()

  if (body.kas_fisik == null || body.kas_fisik < 0)
    throw new HTTPException(400, { message: 'Kas fisik tidak valid' })

  const shift = await query.find<typeof shift_kasir.$inferSelect>(db
    .select()
    .from(shift_kasir)
    .where(
      and(
        eq(shift_kasir.karyawan_id, user.id),
        eq(shift_kasir.status, 'buka'),
        eq(shift_kasir.tanggal, tglSekarang()),
        eq(shift_kasir.tenant_id, tenantId),
        cabangId ? eq(shift_kasir.cabang_id, cabangId) : undefined,
      )
    )
    )

  if (!shift) throw new HTTPException(404, { message: 'Tidak ada shift yang sedang buka hari ini' })

  // Hitung rekap penjualan tunai shift ini
  const rekapRows = await query.find<{ jumlah_trx: number; total: number; tunai: number }>(db
    .select({
      jumlah_trx: sql<number>`count(*)`,
      total: sql<number>`COALESCE(sum(total), 0)`,
      tunai: sql<number>`COALESCE(sum(CASE WHEN metode_bayar = 'tunai' THEN total ELSE 0 END), 0)`,
    })
    .from(penjualan)
    .where(
      and(
        ne(penjualan.status, 'void'),
        eq(penjualan.kasir_id, user.id),
        eq(penjualan.tenant_id, tenantId),
        cabangId ? eq(penjualan.cabang_id, cabangId) : undefined,
        gte(penjualan.tanggal, `${shift.tanggal} ${shift.jam_buka}`),
      )
    )
    )

  const kasSistem = shift.kas_awal + (rekapRows?.tunai ?? 0)
  const selisih = body.kas_fisik - kasSistem

  const row = await query.find(db
    .update(shift_kasir)
    .set({
      jam_tutup: jamSekarang(),
      kas_fisik: body.kas_fisik,
      kas_sistem: kasSistem,
      selisih_kas: selisih,
      jumlah_transaksi: rekapRows?.jumlah_trx ?? 0,
      total_penjualan: rekapRows?.total ?? 0,
      catatan: body.catatan ?? shift.catatan,
      status: 'tutup',
      updated_at: isoNow(),
    })
    .where(eq(shift_kasir.id, shift.id!))
    .returning()
    )

  return c.json({ success: true, data: row })
})
