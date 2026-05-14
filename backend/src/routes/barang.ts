import { Hono } from 'hono'
import { eq, like, and, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.ts'
import { barang, kategori, satuan } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'

export const barangRouter = new Hono()

barangRouter.use('*', authMiddleware)

// ── Kategori ──────────────────────────────────────────────────────────────

barangRouter.get('/kategori', async (c) => {
  const rows = db.select().from(kategori).all()
  return c.json({ success: true, data: rows })
})

barangRouter.post('/kategori', requirePermission('stok.edit'), async (c) => {
  const body = await c.req.json<{ nama: string }>()
  if (!body.nama?.trim()) throw new HTTPException(400, { message: 'Nama kategori wajib diisi' })

  const row = db.insert(kategori).values({ nama: body.nama.trim() }).returning().get()
  return c.json({ success: true, data: row }, 201)
})

barangRouter.put('/kategori/:id', requirePermission('stok.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ nama: string }>()
  if (!body.nama?.trim()) throw new HTTPException(400, { message: 'Nama wajib diisi' })

  const row = db.update(kategori).set({ nama: body.nama.trim() }).where(eq(kategori.id, id)).returning().get()
  if (!row) throw new HTTPException(404, { message: 'Kategori tidak ditemukan' })
  return c.json({ success: true, data: row })
})

barangRouter.delete('/kategori/:id', requirePermission('stok.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const dipakai = db.select({ id: barang.id }).from(barang).where(eq(barang.kategori_id, id)).get()
  if (dipakai) throw new HTTPException(400, { message: 'Kategori masih dipakai oleh barang' })
  db.delete(kategori).where(eq(kategori.id, id)).run()
  return c.json({ success: true, data: null })
})

// ── Satuan ────────────────────────────────────────────────────────────────

barangRouter.get('/satuan', async (c) => {
  const rows = db.select().from(satuan).all()
  return c.json({ success: true, data: rows })
})

barangRouter.post('/satuan', requirePermission('stok.edit'), async (c) => {
  const body = await c.req.json<{ nama: string; singkatan: string }>()
  if (!body.nama?.trim() || !body.singkatan?.trim()) {
    throw new HTTPException(400, { message: 'Nama dan singkatan satuan wajib diisi' })
  }

  const row = db.insert(satuan).values({
    nama: body.nama.trim(),
    singkatan: body.singkatan.trim(),
  }).returning().get()
  return c.json({ success: true, data: row }, 201)
})

barangRouter.put('/satuan/:id', requirePermission('stok.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ nama: string; singkatan: string }>()
  if (!body.nama?.trim() || !body.singkatan?.trim()) {
    throw new HTTPException(400, { message: 'Nama dan singkatan wajib diisi' })
  }

  const row = db.update(satuan).set({ nama: body.nama.trim(), singkatan: body.singkatan.trim() })
    .where(eq(satuan.id, id)).returning().get()
  if (!row) throw new HTTPException(404, { message: 'Satuan tidak ditemukan' })
  return c.json({ success: true, data: row })
})

barangRouter.delete('/satuan/:id', requirePermission('stok.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const dipakai = db.select({ id: barang.id }).from(barang).where(eq(barang.satuan_dasar_id, id)).get()
  if (dipakai) throw new HTTPException(400, { message: 'Satuan masih dipakai oleh barang' })
  db.delete(satuan).where(eq(satuan.id, id)).run()
  return c.json({ success: true, data: null })
})

// ── Barang ────────────────────────────────────────────────────────────────

barangRouter.get('/', async (c) => {
  const q = c.req.query('q')
  const aktif = c.req.query('aktif') !== '0'

  const rows = db
    .select({
      id: barang.id,
      kode_barang: barang.kode_barang,
      nama_barang: barang.nama_barang,
      harga_jual_eceran: barang.harga_jual_eceran,
      harga_jual_grosir: barang.harga_jual_grosir,
      harga_beli_terakhir: barang.harga_beli_terakhir,
      stok_sekarang: barang.stok_sekarang,
      stok_minimum: barang.stok_minimum,
      lokasi_rak: barang.lokasi_rak,
      foto_path: barang.foto_path,
      is_active: barang.is_active,
      kategori_id: barang.kategori_id,
      satuan_dasar_id: barang.satuan_dasar_id,
      nama_kategori: kategori.nama,
      nama_satuan: satuan.nama,
      singkatan_satuan: satuan.singkatan,
    })
    .from(barang)
    .leftJoin(kategori, eq(barang.kategori_id, kategori.id))
    .leftJoin(satuan, eq(barang.satuan_dasar_id, satuan.id))
    .where(
      and(
        aktif ? eq(barang.is_active, true) : undefined,
        q ? like(barang.nama_barang, `%${q}%`) : undefined,
      )
    )
    .all()

  return c.json({ success: true, data: rows })
})

barangRouter.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const row = db.select().from(barang).where(eq(barang.id, id)).get()
  if (!row) throw new HTTPException(404, { message: 'Barang tidak ditemukan' })
  return c.json({ success: true, data: row })
})

barangRouter.post('/', requirePermission('stok.edit'), async (c) => {
  const body = await c.req.json<{
    kode_barang: string
    nama_barang: string
    kategori_id?: number
    satuan_dasar_id?: number
    harga_beli_terakhir?: number
    harga_jual_eceran?: number
    harga_jual_grosir?: number
    stok_minimum?: number
    lokasi_rak?: string
  }>()

  if (!body.kode_barang?.trim() || !body.nama_barang?.trim()) {
    throw new HTTPException(400, { message: 'Kode dan nama barang wajib diisi' })
  }

  const row = db.insert(barang).values({
    kode_barang: body.kode_barang.trim(),
    nama_barang: body.nama_barang.trim(),
    kategori_id: body.kategori_id,
    satuan_dasar_id: body.satuan_dasar_id,
    harga_beli_terakhir: body.harga_beli_terakhir ?? 0,
    harga_jual_eceran: body.harga_jual_eceran ?? 0,
    harga_jual_grosir: body.harga_jual_grosir ?? 0,
    stok_minimum: body.stok_minimum ?? 0,
    lokasi_rak: body.lokasi_rak,
  }).returning().get()

  return c.json({ success: true, data: row }, 201)
})

barangRouter.put('/:id', requirePermission('stok.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<typeof barang.$inferInsert>>()

  const existing = db.select().from(barang).where(eq(barang.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Barang tidak ditemukan' })

  const row = db
    .update(barang)
    .set({ ...body, updated_at: sql`(datetime('now','localtime'))` })
    .where(eq(barang.id, id))
    .returning()
    .get()

  return c.json({ success: true, data: row })
})

barangRouter.delete('/:id', requirePermission('stok.hapus'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = db.select().from(barang).where(eq(barang.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Barang tidak ditemukan' })

  db.update(barang)
    .set({ is_active: false, updated_at: sql`(datetime('now','localtime'))` })
    .where(eq(barang.id, id))
    .run()

  return c.json({ success: true, data: null })
})
