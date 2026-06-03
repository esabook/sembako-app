// C3: Permintaan Pelanggan + Komplain Pelanggan
import { Hono } from 'hono'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.ts'
import { permintaan_pelanggan, komplain_pelanggan, karyawan } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { getAuditBy, getUpdatedBy } from '../utils/audit.ts'
import type { JWTPayload } from './auth.ts'

export const crmRouter = new Hono<{ Variables: { user: JWTPayload } }>()
crmRouter.use('*', authMiddleware)

// ── Permintaan Pelanggan ──────────────────────────────────────────────────────

crmRouter.get('/permintaan', requirePermission('pelanggan.lihat'), async (c) => {
  const dari = c.req.query('dari')
  const sampai = c.req.query('sampai')
  const status = c.req.query('status')

  const conds = []
  if (dari) conds.push(gte(permintaan_pelanggan.tanggal, dari))
  if (sampai) conds.push(lte(permintaan_pelanggan.tanggal, sampai))
  if (status) conds.push(eq(permintaan_pelanggan.status, status as any))

  const rows = db
    .select({
      id: permintaan_pelanggan.id,
      pelanggan_id: permintaan_pelanggan.pelanggan_id,
      nama_pelanggan: permintaan_pelanggan.nama_pelanggan,
      nama_barang: permintaan_pelanggan.nama_barang,
      barang_id: permintaan_pelanggan.barang_id,
      qty_minta: permintaan_pelanggan.qty_minta,
      catatan: permintaan_pelanggan.catatan,
      status: permintaan_pelanggan.status,
      tanggal: permintaan_pelanggan.tanggal,
      nama_petugas: karyawan.nama,
    })
    .from(permintaan_pelanggan)
    .leftJoin(karyawan, eq(permintaan_pelanggan.ditangani_oleh, karyawan.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(permintaan_pelanggan.tanggal))
    .all()

  return c.json({ success: true, data: rows })
})

crmRouter.post('/permintaan', requirePermission('pelanggan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const body = await c.req.json<{
    pelanggan_id?: number; nama_pelanggan?: string
    nama_barang: string; barang_id?: number; qty_minta?: number
    catatan?: string; tanggal: string
  }>()

  if (!body.nama_barang?.trim()) throw new HTTPException(400, { message: 'nama_barang wajib' })
  if (!body.tanggal) throw new HTTPException(400, { message: 'tanggal wajib' })

  const row = db.insert(permintaan_pelanggan).values({
    pelanggan_id: body.pelanggan_id,
    nama_pelanggan: body.nama_pelanggan?.trim(),
    nama_barang: body.nama_barang.trim(),
    barang_id: body.barang_id,
    qty_minta: body.qty_minta,
    catatan: body.catatan,
    tanggal: body.tanggal,
    ditangani_oleh: user.id,
    ...getAuditBy(c),
  }).returning().get()

  return c.json({ success: true, data: row }, 201)
})

crmRouter.put('/permintaan/:id', requirePermission('pelanggan.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<{ status: string; catatan: string; barang_id: number }>>()

  const existing = db.select({ id: permintaan_pelanggan.id }).from(permintaan_pelanggan).where(eq(permintaan_pelanggan.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Data tidak ditemukan' })

  const row = db.update(permintaan_pelanggan).set({
    ...(body.status !== undefined && { status: body.status as any }),
    ...(body.catatan !== undefined && { catatan: body.catatan }),
    ...(body.barang_id !== undefined && { barang_id: body.barang_id }),
    ...getUpdatedBy(c),
  }).where(eq(permintaan_pelanggan.id, id)).returning().get()

  return c.json({ success: true, data: row })
})

crmRouter.delete('/permintaan/:id', requirePermission('pelanggan.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = db.select({ id: permintaan_pelanggan.id }).from(permintaan_pelanggan).where(eq(permintaan_pelanggan.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Data tidak ditemukan' })
  db.delete(permintaan_pelanggan).where(eq(permintaan_pelanggan.id, id)).run()
  return c.json({ success: true, data: null })
})

// ── Komplain Pelanggan ────────────────────────────────────────────────────────

crmRouter.get('/komplain', requirePermission('pelanggan.lihat'), async (c) => {
  const dari = c.req.query('dari')
  const sampai = c.req.query('sampai')
  const status = c.req.query('status')
  const kategori = c.req.query('kategori')

  const conds = []
  if (dari) conds.push(gte(komplain_pelanggan.tanggal, dari))
  if (sampai) conds.push(lte(komplain_pelanggan.tanggal, sampai))
  if (status) conds.push(eq(komplain_pelanggan.status, status as any))
  if (kategori) conds.push(eq(komplain_pelanggan.kategori, kategori as any))

  const rows = db
    .select({
      id: komplain_pelanggan.id,
      pelanggan_id: komplain_pelanggan.pelanggan_id,
      nama_pelanggan: komplain_pelanggan.nama_pelanggan,
      kategori: komplain_pelanggan.kategori,
      deskripsi: komplain_pelanggan.deskripsi,
      tanggal: komplain_pelanggan.tanggal,
      status: komplain_pelanggan.status,
      resolusi: komplain_pelanggan.resolusi,
      nama_petugas: karyawan.nama,
    })
    .from(komplain_pelanggan)
    .leftJoin(karyawan, eq(komplain_pelanggan.ditangani_oleh, karyawan.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(komplain_pelanggan.tanggal))
    .all()

  return c.json({ success: true, data: rows })
})

crmRouter.post('/komplain', requirePermission('pelanggan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const body = await c.req.json<{
    pelanggan_id?: number; nama_pelanggan?: string
    kategori: 'kualitas_barang'|'pelayanan'|'harga'|'pengiriman'|'lainnya'
    deskripsi: string; tanggal: string
  }>()

  if (!body.kategori) throw new HTTPException(400, { message: 'kategori wajib' })
  if (!body.deskripsi?.trim()) throw new HTTPException(400, { message: 'deskripsi wajib' })
  if (!body.tanggal) throw new HTTPException(400, { message: 'tanggal wajib' })

  const row = db.insert(komplain_pelanggan).values({
    pelanggan_id: body.pelanggan_id,
    nama_pelanggan: body.nama_pelanggan?.trim(),
    kategori: body.kategori,
    deskripsi: body.deskripsi.trim(),
    tanggal: body.tanggal,
    ditangani_oleh: user.id,
    ...getAuditBy(c),
  }).returning().get()

  return c.json({ success: true, data: row }, 201)
})

crmRouter.put('/komplain/:id', requirePermission('pelanggan.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<{ status: string; resolusi: string }>>()

  const existing = db.select({ id: komplain_pelanggan.id }).from(komplain_pelanggan).where(eq(komplain_pelanggan.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Komplain tidak ditemukan' })

  const row = db.update(komplain_pelanggan).set({
    ...(body.status !== undefined && { status: body.status as any }),
    ...(body.resolusi !== undefined && { resolusi: body.resolusi }),
    ...getUpdatedBy(c),
  }).where(eq(komplain_pelanggan.id, id)).returning().get()

  return c.json({ success: true, data: row })
})

crmRouter.delete('/komplain/:id', requirePermission('pelanggan.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = db.select({ id: komplain_pelanggan.id }).from(komplain_pelanggan).where(eq(komplain_pelanggan.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Komplain tidak ditemukan' })
  db.delete(komplain_pelanggan).where(eq(komplain_pelanggan.id, id)).run()
  return c.json({ success: true, data: null })
})
