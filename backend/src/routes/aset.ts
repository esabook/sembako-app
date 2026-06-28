import { Hono } from 'hono'
import { eq, and, desc } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, } from '../db/index.ts'
import { aset_tetap } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import { getAuditBy, getUpdatedBy } from '../utils/audit.ts'
import type { JWTPayload } from './auth.ts'

export const asetRouter = new Hono<{ Variables: { user: JWTPayload } }>()
asetRouter.use('*', authMiddleware)
asetRouter.use('*', tenantMiddleware)

// GET / — list aset (filter: kondisi, kategori)
asetRouter.get('/', requirePermission('stok.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const kondisi = c.req.query('kondisi')
  const kategori = c.req.query('kategori')
  const tampilSemua = c.req.query('semua') === '1'

  const conds = [eq(aset_tetap.tenant_id, tenantId)]
  if (!tampilSemua) conds.push(eq(aset_tetap.is_active, true))
  if (kondisi) conds.push(eq(aset_tetap.kondisi, kondisi as any))
  if (kategori) conds.push(eq(aset_tetap.kategori, kategori))

  const rows = await query.findAll(db
    .select()
    .from(aset_tetap)
    .where(and(...conds))
    .orderBy(desc(aset_tetap.created_at))
    )

  return c.json({ success: true, data: rows })
})

// POST / — tambah aset
asetRouter.post('/', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const body = await c.req.json<{
    nama: string
    kategori?: string
    nilai_beli?: number
    nilai_sekarang?: number
    tanggal_beli?: string
    kondisi?: string
    lokasi?: string
    catatan?: string
  }>()

  if (!body.nama?.trim()) throw new HTTPException(400, { message: 'nama wajib' })

  const row = await query.ret(db.insert(aset_tetap).values({
    tenant_id: tenantId,
    nama: body.nama.trim(),
    kategori: body.kategori ?? 'Lainnya',
    nilai_beli: body.nilai_beli ?? 0,
    nilai_sekarang: body.nilai_sekarang ?? body.nilai_beli ?? 0,
    tanggal_beli: body.tanggal_beli,
    kondisi: (body.kondisi as any) ?? 'baik',
    lokasi: body.lokasi,
    catatan: body.catatan,
    ...getAuditBy(c),
  }).returning())

  return c.json({ success: true, data: row }, 201)
})

// PUT /:id — update aset
asetRouter.put('/:id', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{
    nama?: string
    kategori?: string
    nilai_beli?: number
    nilai_sekarang?: number
    tanggal_beli?: string
    kondisi?: string
    lokasi?: string
    catatan?: string
    is_active?: boolean
  }>()

  const existing = await query.find(db.select({ id: aset_tetap.id }).from(aset_tetap).where(and(eq(aset_tetap.id, id), eq(aset_tetap.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Aset tidak ditemukan' })

  const row = await query.ret(db.update(aset_tetap).set({
    ...(body.nama !== undefined && { nama: body.nama.trim() }),
    ...(body.kategori !== undefined && { kategori: body.kategori }),
    ...(body.nilai_beli !== undefined && { nilai_beli: body.nilai_beli }),
    ...(body.nilai_sekarang !== undefined && { nilai_sekarang: body.nilai_sekarang }),
    ...(body.tanggal_beli !== undefined && { tanggal_beli: body.tanggal_beli }),
    ...(body.kondisi !== undefined && { kondisi: body.kondisi as any }),
    ...(body.lokasi !== undefined && { lokasi: body.lokasi }),
    ...(body.catatan !== undefined && { catatan: body.catatan }),
    ...(body.is_active !== undefined && { is_active: body.is_active }),
    ...getUpdatedBy(c),
  }).where(and(eq(aset_tetap.id, id), eq(aset_tetap.tenant_id, tenantId))).returning())

  return c.json({ success: true, data: row })
})

// DELETE /:id — soft delete
asetRouter.delete('/:id', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const existing = await query.find(db.select({ id: aset_tetap.id }).from(aset_tetap).where(and(eq(aset_tetap.id, id), eq(aset_tetap.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Aset tidak ditemukan' })

  await query.exec(db.update(aset_tetap).set({ is_active: false, ...getUpdatedBy(c) }).where(and(eq(aset_tetap.id, id), eq(aset_tetap.tenant_id, tenantId))))
  return c.json({ success: true, data: null })
})
