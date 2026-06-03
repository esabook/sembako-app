// C5: Acara / Hajatan Besar
import { Hono } from 'hono'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.ts'
import { acara_hajatan } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { getAuditBy, getUpdatedBy } from '../utils/audit.ts'
import type { JWTPayload } from './auth.ts'

export const hajatanRouter = new Hono<{ Variables: { user: JWTPayload } }>()
hajatanRouter.use('*', authMiddleware)

hajatanRouter.get('/', requirePermission('penjualan.lihat'), async (c) => {
  const dari = c.req.query('dari')
  const sampai = c.req.query('sampai')
  const status = c.req.query('status')

  const conds = []
  if (dari) conds.push(gte(acara_hajatan.tanggal_acara, dari))
  if (sampai) conds.push(lte(acara_hajatan.tanggal_acara, sampai))
  if (status) conds.push(eq(acara_hajatan.status, status as any))

  const rows = db
    .select()
    .from(acara_hajatan)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(acara_hajatan.tanggal_acara))
    .all()

  return c.json({ success: true, data: rows })
})

hajatanRouter.post('/', requirePermission('penjualan.lihat'), async (c) => {
  const body = await c.req.json<{
    nama_acara: string; nama_penyelenggara: string
    pelanggan_id?: number; tanggal_acara: string
    alamat?: string; estimasi_tamu?: number; catatan?: string
  }>()

  if (!body.nama_acara?.trim()) throw new HTTPException(400, { message: 'nama_acara wajib' })
  if (!body.nama_penyelenggara?.trim()) throw new HTTPException(400, { message: 'nama_penyelenggara wajib' })
  if (!body.tanggal_acara) throw new HTTPException(400, { message: 'tanggal_acara wajib' })

  const row = db.insert(acara_hajatan).values({
    nama_acara: body.nama_acara.trim(),
    nama_penyelenggara: body.nama_penyelenggara.trim(),
    pelanggan_id: body.pelanggan_id,
    tanggal_acara: body.tanggal_acara,
    alamat: body.alamat,
    estimasi_tamu: body.estimasi_tamu,
    catatan: body.catatan,
    ...getAuditBy(c),
  }).returning().get()

  return c.json({ success: true, data: row }, 201)
})

hajatanRouter.put('/:id', requirePermission('penjualan.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<{
    nama_acara: string; nama_penyelenggara: string; tanggal_acara: string
    alamat: string; estimasi_tamu: number; catatan: string
    status: string; total_order: number
  }>>()

  const existing = db.select({ id: acara_hajatan.id }).from(acara_hajatan).where(eq(acara_hajatan.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Acara tidak ditemukan' })

  const row = db.update(acara_hajatan).set({
    ...(body.nama_acara !== undefined && { nama_acara: body.nama_acara }),
    ...(body.nama_penyelenggara !== undefined && { nama_penyelenggara: body.nama_penyelenggara }),
    ...(body.tanggal_acara !== undefined && { tanggal_acara: body.tanggal_acara }),
    ...(body.alamat !== undefined && { alamat: body.alamat }),
    ...(body.estimasi_tamu !== undefined && { estimasi_tamu: body.estimasi_tamu }),
    ...(body.catatan !== undefined && { catatan: body.catatan }),
    ...(body.status !== undefined && { status: body.status as any }),
    ...(body.total_order !== undefined && { total_order: body.total_order }),
    ...getUpdatedBy(c),
  }).where(eq(acara_hajatan.id, id)).returning().get()

  return c.json({ success: true, data: row })
})

hajatanRouter.delete('/:id', requirePermission('penjualan.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = db.select({ id: acara_hajatan.id }).from(acara_hajatan).where(eq(acara_hajatan.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Acara tidak ditemukan' })
  db.delete(acara_hajatan).where(eq(acara_hajatan.id, id)).run()
  return c.json({ success: true, data: null })
})
