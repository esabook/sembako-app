// C3: Permintaan Pelanggan + Komplain Pelanggan
import { Hono } from 'hono'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import { permintaan_pelanggan, komplain_pelanggan, karyawan } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import { getAuditBy, getUpdatedBy } from '../utils/audit.ts'
import type { JWTPayload } from './auth.ts'

export const crmRouter = new Hono<{ Variables: { user: JWTPayload } }>()
crmRouter.use('*', authMiddleware)
crmRouter.use('*', tenantMiddleware)

// ── Permintaan Pelanggan ──────────────────────────────────────────────────────

crmRouter.get('/permintaan', requirePermission('pelanggan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const dari = c.req.query('dari')
  const sampai = c.req.query('sampai')
  const status = c.req.query('status')

  const conds = [eq(permintaan_pelanggan.tenant_id, tenantId)]
  if (dari) conds.push(gte(permintaan_pelanggan.tanggal, dari))
  if (sampai) conds.push(lte(permintaan_pelanggan.tanggal, sampai))
  if (status) conds.push(eq(permintaan_pelanggan.status, status as any))

  const rows = await query.findAll(db
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
    .where(and(...conds))
    .orderBy(desc(permintaan_pelanggan.tanggal))
    )

  return c.json({ success: true, data: rows })
})

crmRouter.post('/permintaan', requirePermission('pelanggan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const body = await c.req.json<{
    pelanggan_id?: number; nama_pelanggan?: string
    nama_barang: string; barang_id?: number; qty_minta?: number
    catatan?: string; tanggal: string
  }>()

  if (!body.nama_barang?.trim()) throw new HTTPException(400, { message: 'nama_barang wajib' })
  if (!body.tanggal) throw new HTTPException(400, { message: 'tanggal wajib' })

  const row = await query.ret(db.insert(permintaan_pelanggan).values({
    tenant_id: tenantId,
    pelanggan_id: body.pelanggan_id,
    nama_pelanggan: body.nama_pelanggan?.trim(),
    nama_barang: body.nama_barang.trim(),
    barang_id: body.barang_id,
    qty_minta: body.qty_minta,
    catatan: body.catatan,
    tanggal: body.tanggal,
    ditangani_oleh: user.id,
    ...getAuditBy(c),
  }).returning())

  return c.json({ success: true, data: row }, 201)
})

crmRouter.put('/permintaan/:id', requirePermission('pelanggan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<{ status: string; catatan: string; barang_id: number }>>()

  const existing = await query.find(db.select({ id: permintaan_pelanggan.id }).from(permintaan_pelanggan).where(and(eq(permintaan_pelanggan.id, id), eq(permintaan_pelanggan.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Data tidak ditemukan' })

  const row = await query.ret(db.update(permintaan_pelanggan).set({
    ...(body.status !== undefined && { status: body.status as any }),
    ...(body.catatan !== undefined && { catatan: body.catatan }),
    ...(body.barang_id !== undefined && { barang_id: body.barang_id }),
    ...getUpdatedBy(c),
  }).where(and(eq(permintaan_pelanggan.id, id), eq(permintaan_pelanggan.tenant_id, tenantId))).returning())

  return c.json({ success: true, data: row })
})

crmRouter.delete('/permintaan/:id', requirePermission('pelanggan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const existing = await query.find(db.select({ id: permintaan_pelanggan.id }).from(permintaan_pelanggan).where(and(eq(permintaan_pelanggan.id, id), eq(permintaan_pelanggan.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Data tidak ditemukan' })
  await query.exec(db.delete(permintaan_pelanggan).where(and(eq(permintaan_pelanggan.id, id), eq(permintaan_pelanggan.tenant_id, tenantId))))
  return c.json({ success: true, data: null })
})

// ── Komplain Pelanggan ────────────────────────────────────────────────────────

crmRouter.get('/komplain', requirePermission('pelanggan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const dari = c.req.query('dari')
  const sampai = c.req.query('sampai')
  const status = c.req.query('status')
  const kategori = c.req.query('kategori')

  const conds = [eq(komplain_pelanggan.tenant_id, tenantId)]
  if (dari) conds.push(gte(komplain_pelanggan.tanggal, dari))
  if (sampai) conds.push(lte(komplain_pelanggan.tanggal, sampai))
  if (status) conds.push(eq(komplain_pelanggan.status, status as any))
  if (kategori) conds.push(eq(komplain_pelanggan.kategori, kategori as any))

  const rows = await query.findAll(db
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
    .where(and(...conds))
    .orderBy(desc(komplain_pelanggan.tanggal))
    )

  return c.json({ success: true, data: rows })
})

crmRouter.post('/komplain', requirePermission('pelanggan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const body = await c.req.json<{
    pelanggan_id?: number; nama_pelanggan?: string
    kategori: 'kualitas_barang'|'pelayanan'|'harga'|'pengiriman'|'lainnya'
    deskripsi: string; tanggal: string
  }>()

  if (!body.kategori) throw new HTTPException(400, { message: 'kategori wajib' })
  if (!body.deskripsi?.trim()) throw new HTTPException(400, { message: 'deskripsi wajib' })
  if (!body.tanggal) throw new HTTPException(400, { message: 'tanggal wajib' })

  const row = await query.ret(db.insert(komplain_pelanggan).values({
    tenant_id: tenantId,
    pelanggan_id: body.pelanggan_id,
    nama_pelanggan: body.nama_pelanggan?.trim(),
    kategori: body.kategori,
    deskripsi: body.deskripsi.trim(),
    tanggal: body.tanggal,
    ditangani_oleh: user.id,
    ...getAuditBy(c),
  }).returning())

  return c.json({ success: true, data: row }, 201)
})

crmRouter.put('/komplain/:id', requirePermission('pelanggan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<{ status: string; resolusi: string }>>()

  const existing = await query.find(db.select({ id: komplain_pelanggan.id }).from(komplain_pelanggan).where(and(eq(komplain_pelanggan.id, id), eq(komplain_pelanggan.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Komplain tidak ditemukan' })

  const row = await query.ret(db.update(komplain_pelanggan).set({
    ...(body.status !== undefined && { status: body.status as any }),
    ...(body.resolusi !== undefined && { resolusi: body.resolusi }),
    ...getUpdatedBy(c),
  }).where(and(eq(komplain_pelanggan.id, id), eq(komplain_pelanggan.tenant_id, tenantId))).returning())

  return c.json({ success: true, data: row })
})

crmRouter.delete('/komplain/:id', requirePermission('pelanggan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const existing = await query.find(db.select({ id: komplain_pelanggan.id }).from(komplain_pelanggan).where(and(eq(komplain_pelanggan.id, id), eq(komplain_pelanggan.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Komplain tidak ditemukan' })
  await query.exec(db.delete(komplain_pelanggan).where(and(eq(komplain_pelanggan.id, id), eq(komplain_pelanggan.tenant_id, tenantId))))
  return c.json({ success: true, data: null })
})
