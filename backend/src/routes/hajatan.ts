// C5: Acara / Hajatan Besar
import { Hono } from 'hono'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, } from '../db/index.ts'
import { acara_hajatan } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import { getAuditBy, getUpdatedBy } from '../utils/audit.ts'
import type { JWTPayload } from './auth.ts'

export const hajatanRouter = new Hono<{ Variables: { user: JWTPayload } }>()
hajatanRouter.use('*', authMiddleware)
hajatanRouter.use('*', tenantMiddleware)

hajatanRouter.get('/', requirePermission('penjualan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const dari = c.req.query('dari')
  const sampai = c.req.query('sampai')
  const status = c.req.query('status')

  const conds = [eq(acara_hajatan.tenant_id, tenantId)]
  if (dari) conds.push(gte(acara_hajatan.tanggal_acara, dari))
  if (sampai) conds.push(lte(acara_hajatan.tanggal_acara, sampai))
  if (status) conds.push(eq(acara_hajatan.status, status as any))

  const rows = await query.findAll(db
    .select()
    .from(acara_hajatan)
    .where(and(...conds))
    .orderBy(desc(acara_hajatan.tanggal_acara))
    )

  return c.json({ success: true, data: rows })
})

hajatanRouter.post('/', requirePermission('penjualan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const body = await c.req.json<{
    nama_acara: string; nama_penyelenggara: string
    pelanggan_id?: number; tanggal_acara: string
    alamat?: string; estimasi_tamu?: number; catatan?: string
  }>()

  if (!body.nama_acara?.trim()) throw new HTTPException(400, { message: 'nama_acara wajib' })
  if (!body.nama_penyelenggara?.trim()) throw new HTTPException(400, { message: 'nama_penyelenggara wajib' })
  if (!body.tanggal_acara) throw new HTTPException(400, { message: 'tanggal_acara wajib' })

  const row = await query.ret(db.insert(acara_hajatan).values({
    tenant_id: tenantId,
    nama_acara: body.nama_acara.trim(),
    nama_penyelenggara: body.nama_penyelenggara.trim(),
    pelanggan_id: body.pelanggan_id,
    tanggal_acara: body.tanggal_acara,
    alamat: body.alamat,
    estimasi_tamu: body.estimasi_tamu,
    catatan: body.catatan,
    ...getAuditBy(c),
  }).returning())

  return c.json({ success: true, data: row }, 201)
})

hajatanRouter.put('/:id', requirePermission('penjualan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<{
    nama_acara: string; nama_penyelenggara: string; tanggal_acara: string
    alamat: string; estimasi_tamu: number; catatan: string
    status: string; total_order: number
  }>>()

  const existing = await query.find(db.select({ id: acara_hajatan.id }).from(acara_hajatan).where(and(eq(acara_hajatan.id, id), eq(acara_hajatan.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Acara tidak ditemukan' })

  const row = await query.ret(db.update(acara_hajatan).set({
    ...(body.nama_acara !== undefined && { nama_acara: body.nama_acara }),
    ...(body.nama_penyelenggara !== undefined && { nama_penyelenggara: body.nama_penyelenggara }),
    ...(body.tanggal_acara !== undefined && { tanggal_acara: body.tanggal_acara }),
    ...(body.alamat !== undefined && { alamat: body.alamat }),
    ...(body.estimasi_tamu !== undefined && { estimasi_tamu: body.estimasi_tamu }),
    ...(body.catatan !== undefined && { catatan: body.catatan }),
    ...(body.status !== undefined && { status: body.status as any }),
    ...(body.total_order !== undefined && { total_order: body.total_order }),
    ...getUpdatedBy(c),
  }).where(and(eq(acara_hajatan.id, id), eq(acara_hajatan.tenant_id, tenantId))).returning())

  return c.json({ success: true, data: row })
})

hajatanRouter.delete('/:id', requirePermission('penjualan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const existing = await query.find(db.select({ id: acara_hajatan.id }).from(acara_hajatan).where(and(eq(acara_hajatan.id, id), eq(acara_hajatan.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Acara tidak ditemukan' })
  await query.exec(db.delete(acara_hajatan).where(and(eq(acara_hajatan.id, id), eq(acara_hajatan.tenant_id, tenantId))))
  return c.json({ success: true, data: null })
})
