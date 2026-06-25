import { Hono } from 'hono'
import { eq, and, desc } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import { tagihan_utilitas } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import { getAuditBy, getUpdatedBy } from '../utils/audit.ts'
import type { JWTPayload } from './auth.ts'

export const utilitasRouter = new Hono<{ Variables: { user: JWTPayload } }>()
utilitasRouter.use('*', authMiddleware)
utilitasRouter.use('*', tenantMiddleware)

// GET / — list tagihan (filter: jenis, periode_bulan)
utilitasRouter.get('/', requirePermission('laporan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const jenis = c.req.query('jenis')
  const periode = c.req.query('periode_bulan')

  const conds = [eq(tagihan_utilitas.tenant_id, tenantId)]
  if (jenis) conds.push(eq(tagihan_utilitas.jenis, jenis as any))
  if (periode) conds.push(eq(tagihan_utilitas.periode_bulan, periode))

  const rows = await query.findAll(db
    .select()
    .from(tagihan_utilitas)
    .where(and(...conds))
    .orderBy(desc(tagihan_utilitas.periode_bulan))
    )

  return c.json({ success: true, data: rows })
})

// POST / — catat tagihan baru
utilitasRouter.post('/', requirePermission('laporan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const body = await c.req.json<{
    jenis: 'listrik' | 'air' | 'internet' | 'lainnya'
    periode_bulan: string
    jumlah: number
    tanggal_bayar?: string
    meter_awal?: number
    meter_akhir?: number
    catatan?: string
  }>()

  if (!body.jenis) throw new HTTPException(400, { message: 'jenis wajib' })
  if (!body.periode_bulan || !/^\d{4}-\d{2}$/.test(body.periode_bulan)) {
    throw new HTTPException(400, { message: 'periode_bulan wajib format YYYY-MM' })
  }
  if (!body.jumlah || body.jumlah <= 0) throw new HTTPException(400, { message: 'jumlah harus > 0' })

  const row = await query.ret(db.insert(tagihan_utilitas).values({
    tenant_id: tenantId,
    jenis: body.jenis,
    periode_bulan: body.periode_bulan,
    jumlah: body.jumlah,
    tanggal_bayar: body.tanggal_bayar,
    meter_awal: body.meter_awal,
    meter_akhir: body.meter_akhir,
    catatan: body.catatan,
    ...getAuditBy(c),
  }).returning())

  return c.json({ success: true, data: row }, 201)
})

// PUT /:id — update tagihan
utilitasRouter.put('/:id', requirePermission('laporan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{
    jenis?: string
    periode_bulan?: string
    jumlah?: number
    tanggal_bayar?: string
    meter_awal?: number
    meter_akhir?: number
    catatan?: string
  }>()

  const existing = await query.find(db.select({ id: tagihan_utilitas.id }).from(tagihan_utilitas).where(and(eq(tagihan_utilitas.id, id), eq(tagihan_utilitas.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Tagihan tidak ditemukan' })

  const row = await query.ret(db.update(tagihan_utilitas).set({
    ...(body.jenis !== undefined && { jenis: body.jenis as any }),
    ...(body.periode_bulan !== undefined && { periode_bulan: body.periode_bulan }),
    ...(body.jumlah !== undefined && { jumlah: body.jumlah }),
    ...(body.tanggal_bayar !== undefined && { tanggal_bayar: body.tanggal_bayar }),
    ...(body.meter_awal !== undefined && { meter_awal: body.meter_awal }),
    ...(body.meter_akhir !== undefined && { meter_akhir: body.meter_akhir }),
    ...(body.catatan !== undefined && { catatan: body.catatan }),
    ...getUpdatedBy(c),
  }).where(and(eq(tagihan_utilitas.id, id), eq(tagihan_utilitas.tenant_id, tenantId))).returning())

  return c.json({ success: true, data: row })
})

// DELETE /:id — hapus tagihan
utilitasRouter.delete('/:id', requirePermission('laporan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const existing = await query.find(db.select({ id: tagihan_utilitas.id }).from(tagihan_utilitas).where(and(eq(tagihan_utilitas.id, id), eq(tagihan_utilitas.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Tagihan tidak ditemukan' })

  await query.exec(db.delete(tagihan_utilitas).where(and(eq(tagihan_utilitas.id, id), eq(tagihan_utilitas.tenant_id, tenantId))))
  return c.json({ success: true, data: null })
})
