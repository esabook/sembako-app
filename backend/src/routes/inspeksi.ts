// C5: Inspeksi Toko
import { Hono } from 'hono'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import { inspeksi_toko, karyawan } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import { getAuditBy, getUpdatedBy } from '../utils/audit.ts'
import type { JWTPayload } from './auth.ts'

export const inspeksiRouter = new Hono<{ Variables: { user: JWTPayload } }>()
inspeksiRouter.use('*', authMiddleware)
inspeksiRouter.use('*', tenantMiddleware)

inspeksiRouter.get('/', requirePermission('*'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const dari = c.req.query('dari')
  const sampai = c.req.query('sampai')
  const jenis = c.req.query('jenis')
  const status = c.req.query('status')

  const conds = [eq(inspeksi_toko.tenant_id, tenantId)]
  if (dari) conds.push(gte(inspeksi_toko.tanggal, dari))
  if (sampai) conds.push(lte(inspeksi_toko.tanggal, sampai))
  if (jenis) conds.push(eq(inspeksi_toko.jenis, jenis as any))
  if (status) conds.push(eq(inspeksi_toko.status, status as any))

  const rows = await query.findAll(db
    .select({
      id: inspeksi_toko.id,
      tanggal: inspeksi_toko.tanggal,
      jenis: inspeksi_toko.jenis,
      area: inspeksi_toko.area,
      temuan: inspeksi_toko.temuan,
      tindakan: inspeksi_toko.tindakan,
      nilai: inspeksi_toko.nilai,
      status: inspeksi_toko.status,
      catatan: inspeksi_toko.catatan,
      nama_petugas: karyawan.nama,
    })
    .from(inspeksi_toko)
    .leftJoin(karyawan, eq(inspeksi_toko.petugas_id, karyawan.id))
    .where(and(...conds))
    .orderBy(desc(inspeksi_toko.tanggal))
    )

  return c.json({ success: true, data: rows })
})

inspeksiRouter.post('/', requirePermission('*'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const body = await c.req.json<{
    tanggal: string
    jenis?: 'rutin' | 'mendadak' | 'bulanan' | 'tahunan'
    area?: string; temuan?: string; tindakan?: string
    nilai?: number; catatan?: string
  }>()

  if (!body.tanggal) throw new HTTPException(400, { message: 'tanggal wajib' })
  if (body.nilai !== undefined && (body.nilai < 1 || body.nilai > 100)) {
    throw new HTTPException(400, { message: 'nilai harus antara 1–100' })
  }

  const row = await query.ret(db.insert(inspeksi_toko).values({
    tenant_id: tenantId,
    tanggal: body.tanggal,
    jenis: body.jenis ?? 'rutin',
    petugas_id: user.id,
    area: body.area,
    temuan: body.temuan,
    tindakan: body.tindakan,
    nilai: body.nilai,
    catatan: body.catatan,
    ...getAuditBy(c),
  }).returning())

  return c.json({ success: true, data: row }, 201)
})

inspeksiRouter.put('/:id', requirePermission('*'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<{
    tanggal: string; jenis: string; area: string
    temuan: string; tindakan: string; nilai: number
    status: string; catatan: string
  }>>()

  const existing = await query.find(db.select({ id: inspeksi_toko.id }).from(inspeksi_toko).where(and(eq(inspeksi_toko.id, id), eq(inspeksi_toko.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Inspeksi tidak ditemukan' })

  const row = await query.ret(db.update(inspeksi_toko).set({
    ...(body.tanggal !== undefined && { tanggal: body.tanggal }),
    ...(body.jenis !== undefined && { jenis: body.jenis as any }),
    ...(body.area !== undefined && { area: body.area }),
    ...(body.temuan !== undefined && { temuan: body.temuan }),
    ...(body.tindakan !== undefined && { tindakan: body.tindakan }),
    ...(body.nilai !== undefined && { nilai: body.nilai }),
    ...(body.status !== undefined && { status: body.status as any }),
    ...(body.catatan !== undefined && { catatan: body.catatan }),
    ...getUpdatedBy(c),
  }).where(and(eq(inspeksi_toko.id, id), eq(inspeksi_toko.tenant_id, tenantId))).returning())

  return c.json({ success: true, data: row })
})

inspeksiRouter.delete('/:id', requirePermission('*'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const existing = await query.find(db.select({ id: inspeksi_toko.id }).from(inspeksi_toko).where(and(eq(inspeksi_toko.id, id), eq(inspeksi_toko.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Inspeksi tidak ditemukan' })
  await query.exec(db.delete(inspeksi_toko).where(and(eq(inspeksi_toko.id, id), eq(inspeksi_toko.tenant_id, tenantId))))
  return c.json({ success: true, data: null })
})
