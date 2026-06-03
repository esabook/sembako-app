// C2: Kunjungan Sales + Agenda Supplier + Pipeline Grosir
import { Hono } from 'hono'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.ts'
import { kunjungan_sales, agenda_supplier, pipeline_grosir, pelanggan, karyawan, supplier } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { getAuditBy, getUpdatedBy } from '../utils/audit.ts'
import type { JWTPayload } from './auth.ts'

export const salesRouter = new Hono<{ Variables: { user: JWTPayload } }>()
salesRouter.use('*', authMiddleware)

// ── Kunjungan Sales ───────────────────────────────────────────────────────────

salesRouter.get('/kunjungan', requirePermission('pelanggan.lihat'), async (c) => {
  const dari = c.req.query('dari')
  const sampai = c.req.query('sampai')
  const status = c.req.query('status')

  const conds = []
  if (dari) conds.push(gte(kunjungan_sales.tanggal, dari))
  if (sampai) conds.push(lte(kunjungan_sales.tanggal, sampai))
  if (status) conds.push(eq(kunjungan_sales.status_tindak_lanjut, status as any))

  const rows = db
    .select({
      id: kunjungan_sales.id,
      pelanggan_id: kunjungan_sales.pelanggan_id,
      nama_warung: kunjungan_sales.nama_warung,
      alamat: kunjungan_sales.alamat,
      petugas_id: kunjungan_sales.petugas_id,
      nama_petugas: karyawan.nama,
      tanggal: kunjungan_sales.tanggal,
      tujuan: kunjungan_sales.tujuan,
      hasil: kunjungan_sales.hasil,
      catatan: kunjungan_sales.catatan,
      status_tindak_lanjut: kunjungan_sales.status_tindak_lanjut,
      created_at: kunjungan_sales.created_at,
    })
    .from(kunjungan_sales)
    .leftJoin(karyawan, eq(kunjungan_sales.petugas_id, karyawan.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(kunjungan_sales.tanggal))
    .all()

  return c.json({ success: true, data: rows })
})

salesRouter.post('/kunjungan', requirePermission('pelanggan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const body = await c.req.json<{
    nama_warung: string; alamat?: string; pelanggan_id?: number
    petugas_id?: number; tanggal: string
    tujuan?: 'prospek'|'follow_up'|'pengiriman'|'lainnya'
    hasil?: string; catatan?: string
    status_tindak_lanjut?: 'open'|'selesai'|'pending'
  }>()

  if (!body.nama_warung?.trim()) throw new HTTPException(400, { message: 'nama_warung wajib' })
  if (!body.tanggal) throw new HTTPException(400, { message: 'tanggal wajib' })

  const row = db.insert(kunjungan_sales).values({
    nama_warung: body.nama_warung.trim(),
    alamat: body.alamat,
    pelanggan_id: body.pelanggan_id,
    petugas_id: body.petugas_id ?? user.id,
    tanggal: body.tanggal,
    tujuan: body.tujuan ?? 'prospek',
    hasil: body.hasil,
    catatan: body.catatan,
    status_tindak_lanjut: body.status_tindak_lanjut ?? 'open',
    ...getAuditBy(c),
  }).returning().get()

  return c.json({ success: true, data: row }, 201)
})

salesRouter.put('/kunjungan/:id', requirePermission('pelanggan.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<{
    nama_warung: string; alamat: string; tujuan: string
    hasil: string; catatan: string; status_tindak_lanjut: string
  }>>()

  const existing = db.select({ id: kunjungan_sales.id }).from(kunjungan_sales).where(eq(kunjungan_sales.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Data tidak ditemukan' })

  const row = db.update(kunjungan_sales).set({
    ...(body.nama_warung !== undefined && { nama_warung: body.nama_warung }),
    ...(body.alamat !== undefined && { alamat: body.alamat }),
    ...(body.tujuan !== undefined && { tujuan: body.tujuan as any }),
    ...(body.hasil !== undefined && { hasil: body.hasil }),
    ...(body.catatan !== undefined && { catatan: body.catatan }),
    ...(body.status_tindak_lanjut !== undefined && { status_tindak_lanjut: body.status_tindak_lanjut as any }),
    ...getUpdatedBy(c),
  }).where(eq(kunjungan_sales.id, id)).returning().get()

  return c.json({ success: true, data: row })
})

salesRouter.delete('/kunjungan/:id', requirePermission('pelanggan.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = db.select({ id: kunjungan_sales.id }).from(kunjungan_sales).where(eq(kunjungan_sales.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Data tidak ditemukan' })
  db.delete(kunjungan_sales).where(eq(kunjungan_sales.id, id)).run()
  return c.json({ success: true, data: null })
})

// ── Agenda Supplier ───────────────────────────────────────────────────────────

salesRouter.get('/agenda-supplier', requirePermission('pembelian.lihat'), async (c) => {
  const dari = c.req.query('dari')
  const sampai = c.req.query('sampai')
  const status = c.req.query('status')

  const conds = []
  if (dari) conds.push(gte(agenda_supplier.tanggal, dari))
  if (sampai) conds.push(lte(agenda_supplier.tanggal, sampai))
  if (status) conds.push(eq(agenda_supplier.status, status as any))

  const rows = db
    .select({
      id: agenda_supplier.id,
      supplier_id: agenda_supplier.supplier_id,
      nama_supplier: agenda_supplier.nama_supplier,
      tipe: agenda_supplier.tipe,
      tanggal: agenda_supplier.tanggal,
      jam: agenda_supplier.jam,
      lokasi: agenda_supplier.lokasi,
      petugas_id: agenda_supplier.petugas_id,
      nama_petugas: karyawan.nama,
      hasil: agenda_supplier.hasil,
      catatan: agenda_supplier.catatan,
      status: agenda_supplier.status,
    })
    .from(agenda_supplier)
    .leftJoin(karyawan, eq(agenda_supplier.petugas_id, karyawan.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(agenda_supplier.tanggal))
    .all()

  return c.json({ success: true, data: rows })
})

salesRouter.post('/agenda-supplier', requirePermission('pembelian.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const body = await c.req.json<{
    supplier_id?: number; nama_supplier: string
    tipe?: 'kunjungan'|'negosiasi'|'pengiriman'|'lainnya'
    tanggal: string; jam?: string; lokasi?: string
    petugas_id?: number; catatan?: string
  }>()

  if (!body.nama_supplier?.trim()) throw new HTTPException(400, { message: 'nama_supplier wajib' })
  if (!body.tanggal) throw new HTTPException(400, { message: 'tanggal wajib' })

  const row = db.insert(agenda_supplier).values({
    supplier_id: body.supplier_id,
    nama_supplier: body.nama_supplier.trim(),
    tipe: body.tipe ?? 'kunjungan',
    tanggal: body.tanggal,
    jam: body.jam,
    lokasi: body.lokasi,
    petugas_id: body.petugas_id ?? user.id,
    catatan: body.catatan,
    ...getAuditBy(c),
  }).returning().get()

  return c.json({ success: true, data: row }, 201)
})

salesRouter.put('/agenda-supplier/:id', requirePermission('pembelian.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<{
    tipe: string; tanggal: string; jam: string; lokasi: string
    hasil: string; catatan: string; status: string
  }>>()

  const existing = db.select({ id: agenda_supplier.id }).from(agenda_supplier).where(eq(agenda_supplier.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Agenda tidak ditemukan' })

  const row = db.update(agenda_supplier).set({
    ...(body.tipe !== undefined && { tipe: body.tipe as any }),
    ...(body.tanggal !== undefined && { tanggal: body.tanggal }),
    ...(body.jam !== undefined && { jam: body.jam }),
    ...(body.lokasi !== undefined && { lokasi: body.lokasi }),
    ...(body.hasil !== undefined && { hasil: body.hasil }),
    ...(body.catatan !== undefined && { catatan: body.catatan }),
    ...(body.status !== undefined && { status: body.status as any }),
    ...getUpdatedBy(c),
  }).where(eq(agenda_supplier.id, id)).returning().get()

  return c.json({ success: true, data: row })
})

salesRouter.delete('/agenda-supplier/:id', requirePermission('pembelian.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = db.select({ id: agenda_supplier.id }).from(agenda_supplier).where(eq(agenda_supplier.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Agenda tidak ditemukan' })
  db.delete(agenda_supplier).where(eq(agenda_supplier.id, id)).run()
  return c.json({ success: true, data: null })
})

// ── Pipeline Grosir ───────────────────────────────────────────────────────────

salesRouter.get('/pipeline', requirePermission('pelanggan.lihat'), async (c) => {
  const tahap = c.req.query('tahap')

  const conds = []
  if (tahap) conds.push(eq(pipeline_grosir.tahap, tahap as any))

  const rows = db
    .select({
      id: pipeline_grosir.id,
      nama_pelanggan: pipeline_grosir.nama_pelanggan,
      pelanggan_id: pipeline_grosir.pelanggan_id,
      nilai_estimasi: pipeline_grosir.nilai_estimasi,
      tahap: pipeline_grosir.tahap,
      produk_minat: pipeline_grosir.produk_minat,
      catatan: pipeline_grosir.catatan,
      tanggal_masuk: pipeline_grosir.tanggal_masuk,
      tanggal_update: pipeline_grosir.tanggal_update,
      nama_petugas: karyawan.nama,
    })
    .from(pipeline_grosir)
    .leftJoin(karyawan, eq(pipeline_grosir.petugas_id, karyawan.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(pipeline_grosir.tahap, desc(pipeline_grosir.tanggal_masuk))
    .all()

  return c.json({ success: true, data: rows })
})

salesRouter.post('/pipeline', requirePermission('pelanggan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const body = await c.req.json<{
    nama_pelanggan: string; pelanggan_id?: number
    nilai_estimasi?: number
    tahap?: 'prospek' | 'dikunjungi' | 'penawaran' | 'negosiasi' | 'deal' | 'batal'
    produk_minat?: string; catatan?: string; tanggal_masuk: string
  }>()

  if (!body.nama_pelanggan?.trim()) throw new HTTPException(400, { message: 'nama_pelanggan wajib' })
  if (!body.tanggal_masuk) throw new HTTPException(400, { message: 'tanggal_masuk wajib' })

  const row = db.insert(pipeline_grosir).values({
    nama_pelanggan: body.nama_pelanggan.trim(),
    pelanggan_id: body.pelanggan_id,
    nilai_estimasi: body.nilai_estimasi ?? 0,
    tahap: body.tahap ?? 'prospek',
    petugas_id: user.id,
    produk_minat: body.produk_minat,
    catatan: body.catatan,
    tanggal_masuk: body.tanggal_masuk,
    tanggal_update: body.tanggal_masuk,
    ...getAuditBy(c),
  }).returning().get()

  return c.json({ success: true, data: row }, 201)
})

salesRouter.put('/pipeline/:id', requirePermission('pelanggan.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<{
    nama_pelanggan: string; nilai_estimasi: number; tahap: string
    produk_minat: string; catatan: string
  }>>()

  const existing = db.select({ id: pipeline_grosir.id }).from(pipeline_grosir).where(eq(pipeline_grosir.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Pipeline tidak ditemukan' })

  const tanggal_update = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)
  const row = db.update(pipeline_grosir).set({
    ...(body.nama_pelanggan !== undefined && { nama_pelanggan: body.nama_pelanggan }),
    ...(body.nilai_estimasi !== undefined && { nilai_estimasi: body.nilai_estimasi }),
    ...(body.tahap !== undefined && { tahap: body.tahap as any }),
    ...(body.produk_minat !== undefined && { produk_minat: body.produk_minat }),
    ...(body.catatan !== undefined && { catatan: body.catatan }),
    tanggal_update,
    ...getUpdatedBy(c),
  }).where(eq(pipeline_grosir.id, id)).returning().get()

  return c.json({ success: true, data: row })
})

salesRouter.delete('/pipeline/:id', requirePermission('pelanggan.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = db.select({ id: pipeline_grosir.id }).from(pipeline_grosir).where(eq(pipeline_grosir.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Pipeline tidak ditemukan' })
  db.delete(pipeline_grosir).where(eq(pipeline_grosir.id, id)).run()
  return c.json({ success: true, data: null })
})
