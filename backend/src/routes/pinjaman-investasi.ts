import { Hono } from 'hono'
import { eq, and, desc, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import { pinjaman_investasi } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { getAuditBy, getUpdatedBy } from '../utils/audit.ts'
import type { JWTPayload } from './auth.ts'

export const pinjamanInvestasiRouter = new Hono<{ Variables: { user: JWTPayload } }>()
pinjamanInvestasiRouter.use('*', authMiddleware)

// GET / — list (filter: tipe, status)
pinjamanInvestasiRouter.get('/', requirePermission('laporan.lihat'), async (c) => {
  const tipe = c.req.query('tipe') as 'pinjaman' | 'investasi' | undefined
  const status = c.req.query('status') as 'aktif' | 'lunas' | 'macet' | undefined

  const conds = []
  if (tipe) conds.push(eq(pinjaman_investasi.tipe, tipe))
  if (status) conds.push(eq(pinjaman_investasi.status, status))

  const rows = db
    .select()
    .from(pinjaman_investasi)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(pinjaman_investasi.tanggal_mulai))
    .all()

  return c.json({ success: true, data: rows })
})

// POST / — tambah
pinjamanInvestasiRouter.post('/', requirePermission('laporan.lihat'), async (c) => {
  const body = await c.req.json<{
    tipe: 'pinjaman' | 'investasi'
    nama: string
    jumlah_pokok: number
    bunga_persen?: number
    cicilan_per_bulan?: number
    tanggal_mulai: string
    jatuh_tempo?: string
    catatan?: string
  }>()

  if (!body.tipe) throw new HTTPException(400, { message: 'tipe wajib' })
  if (!body.nama?.trim()) throw new HTTPException(400, { message: 'nama wajib' })
  if (!body.jumlah_pokok || body.jumlah_pokok <= 0) throw new HTTPException(400, { message: 'jumlah_pokok harus > 0' })
  if (!body.tanggal_mulai) throw new HTTPException(400, { message: 'tanggal_mulai wajib' })

  const row = db.insert(pinjaman_investasi).values({
    tipe: body.tipe,
    nama: body.nama.trim(),
    jumlah_pokok: body.jumlah_pokok,
    bunga_persen: body.bunga_persen ?? 0,
    cicilan_per_bulan: body.cicilan_per_bulan ?? 0,
    tanggal_mulai: body.tanggal_mulai,
    jatuh_tempo: body.jatuh_tempo,
    sisa_pokok: body.jumlah_pokok,
    catatan: body.catatan,
    ...getAuditBy(c),
  }).returning().get()

  return c.json({ success: true, data: row }, 201)
})

// PUT /:id — update info atau status
pinjamanInvestasiRouter.put('/:id', requirePermission('laporan.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{
    nama?: string
    bunga_persen?: number
    cicilan_per_bulan?: number
    jatuh_tempo?: string
    status?: 'aktif' | 'lunas' | 'macet'
    catatan?: string
  }>()

  const existing = await query.find(db.select().from(pinjaman_investasi).where(eq(pinjaman_investasi.id, id)))
  if (!existing) throw new HTTPException(404, { message: 'Data tidak ditemukan' })

  const row = db.update(pinjaman_investasi).set({
    ...(body.nama !== undefined && { nama: body.nama.trim() }),
    ...(body.bunga_persen !== undefined && { bunga_persen: body.bunga_persen }),
    ...(body.cicilan_per_bulan !== undefined && { cicilan_per_bulan: body.cicilan_per_bulan }),
    ...(body.jatuh_tempo !== undefined && { jatuh_tempo: body.jatuh_tempo }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.catatan !== undefined && { catatan: body.catatan }),
    ...getUpdatedBy(c),
  }).where(eq(pinjaman_investasi.id, id)).returning().get()

  return c.json({ success: true, data: row })
})

// POST /:id/cicil — bayar cicilan, kurangi sisa_pokok
pinjamanInvestasiRouter.post('/:id/cicil', requirePermission('laporan.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ jumlah: number }>()

  if (!body.jumlah || body.jumlah <= 0) throw new HTTPException(400, { message: 'jumlah harus > 0' })

  const existing = await query.find(db.select().from(pinjaman_investasi).where(eq(pinjaman_investasi.id, id)))
  if (!existing) throw new HTTPException(404, { message: 'Data tidak ditemukan' })
  if (existing.status !== 'aktif') throw new HTTPException(400, { message: 'Hanya status aktif yang bisa dicicil' })

  const sisa = Math.max(0, existing.sisa_pokok - body.jumlah)
  const row = db.update(pinjaman_investasi).set({
    sisa_pokok: sisa,
    status: sisa <= 0 ? 'lunas' : 'aktif',
    ...getUpdatedBy(c),
  }).where(eq(pinjaman_investasi.id, id)).returning().get()

  return c.json({ success: true, data: row })
})

// DELETE /:id — hapus (hanya jika lunas/macet)
pinjamanInvestasiRouter.delete('/:id', requirePermission('laporan.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = await query.find(db.select({ id: pinjaman_investasi.id }).from(pinjaman_investasi).where(eq(pinjaman_investasi.id, id)))
  if (!existing) throw new HTTPException(404, { message: 'Data tidak ditemukan' })
  await query.exec(db.delete(pinjaman_investasi).where(eq(pinjaman_investasi.id, id)))
  return c.json({ success: true, data: null })
})
