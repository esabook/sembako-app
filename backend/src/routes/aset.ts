import { Hono } from 'hono'
import { eq, and, desc } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.ts'
import { aset_tetap } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { getAuditBy, getUpdatedBy } from '../utils/audit.ts'
import type { JWTPayload } from './auth.ts'

export const asetRouter = new Hono<{ Variables: { user: JWTPayload } }>()
asetRouter.use('*', authMiddleware)

// GET / — list aset (filter: kondisi, kategori)
asetRouter.get('/', requirePermission('stok.lihat'), async (c) => {
  const kondisi = c.req.query('kondisi')
  const kategori = c.req.query('kategori')
  const tampilSemua = c.req.query('semua') === '1'

  const conds = []
  if (!tampilSemua) conds.push(eq(aset_tetap.is_active, true))
  if (kondisi) conds.push(eq(aset_tetap.kondisi, kondisi as any))
  if (kategori) conds.push(eq(aset_tetap.kategori, kategori))

  const rows = db
    .select()
    .from(aset_tetap)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(aset_tetap.created_at))
    .all()

  return c.json({ success: true, data: rows })
})

// POST / — tambah aset
asetRouter.post('/', requirePermission('stok.edit'), async (c) => {
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

  const row = db.insert(aset_tetap).values({
    nama: body.nama.trim(),
    kategori: body.kategori ?? 'Lainnya',
    nilai_beli: body.nilai_beli ?? 0,
    nilai_sekarang: body.nilai_sekarang ?? body.nilai_beli ?? 0,
    tanggal_beli: body.tanggal_beli,
    kondisi: (body.kondisi as any) ?? 'baik',
    lokasi: body.lokasi,
    catatan: body.catatan,
    ...getAuditBy(c),
  }).returning().get()

  return c.json({ success: true, data: row }, 201)
})

// PUT /:id — update aset
asetRouter.put('/:id', requirePermission('stok.edit'), async (c) => {
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

  const existing = db.select({ id: aset_tetap.id }).from(aset_tetap).where(eq(aset_tetap.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Aset tidak ditemukan' })

  const row = db.update(aset_tetap).set({
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
  }).where(eq(aset_tetap.id, id)).returning().get()

  return c.json({ success: true, data: row })
})

// DELETE /:id — soft delete
asetRouter.delete('/:id', requirePermission('stok.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = db.select({ id: aset_tetap.id }).from(aset_tetap).where(eq(aset_tetap.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Aset tidak ditemukan' })

  db.update(aset_tetap).set({ is_active: false, ...getUpdatedBy(c) }).where(eq(aset_tetap.id, id)).run()
  return c.json({ success: true, data: null })
})
