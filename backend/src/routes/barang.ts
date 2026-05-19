import { Hono } from 'hono'
import { eq, like, and, or, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.ts'
import { barang, kategori, satuan } from '../db/schema.ts'
import { catatLog } from '../utils/log.ts'
import type { JWTPayload } from './auth.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

export const barangRouter = new Hono<{ Variables: { user: JWTPayload } }>()

barangRouter.use('*', authMiddleware)

// ── Kategori ──────────────────────────────────────────────────────────────

barangRouter.get('/kategori', async (c) => {
  const rows = db.select().from(kategori).all()
  return c.json({ success: true, data: rows })
})

barangRouter.post('/kategori', requirePermission('stok.edit'), async (c) => {
  const body = await c.req.json<{ nama: string; kode?: string; contoh?: string }>()
  if (!body.nama?.trim()) throw new HTTPException(400, { message: 'Nama kategori wajib diisi' })

  const row = db.insert(kategori).values({ nama: body.nama.trim(), kode: body.kode?.trim().toUpperCase() || null, contoh: body.contoh?.trim() || null }).returning().get()
  return c.json({ success: true, data: row }, 201)
})

barangRouter.put('/kategori/:id', requirePermission('stok.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ nama: string; kode?: string; contoh?: string }>()
  if (!body.nama?.trim()) throw new HTTPException(400, { message: 'Nama wajib diisi' })

  const row = db.update(kategori).set({ nama: body.nama.trim(), kode: body.kode?.trim().toUpperCase() || null, contoh: body.contoh?.trim() || null }).where(eq(kategori.id, id)).returning().get()
  if (!row) throw new HTTPException(404, { message: 'Kategori tidak ditemukan' })
  return c.json({ success: true, data: row })
})

barangRouter.delete('/kategori/:id', requirePermission('stok.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const item = db.select().from(kategori).where(eq(kategori.id, id)).get()
  if (!item) throw new HTTPException(404, { message: 'Kategori tidak ditemukan' })
  if (item.is_preset) throw new HTTPException(400, { message: 'Kategori bawaan tidak bisa dihapus' })
  const dipakai = db.select({ id: barang.id }).from(barang).where(eq(barang.kategori_id, id)).get()
  if (dipakai) throw new HTTPException(400, { message: 'Kategori masih dipakai oleh barang' })
  db.delete(kategori).where(eq(kategori.id, id)).run()
  return c.json({ success: true, data: null })
})

barangRouter.post('/kategori/import-preset', requirePermission('stok.edit'), async (c) => {
  const body = await c.req.json<{ items: { nama: string; kode?: string; contoh?: string }[] }>()
  let inserted = 0
  let updated = 0
  for (const item of body.items) {
    const kode = item.kode?.trim().toUpperCase() || null
    const existing = db.select({ id: kategori.id }).from(kategori).where(eq(kategori.nama, item.nama)).get()
    if (!existing) {
      db.insert(kategori).values({ nama: item.nama, kode, contoh: item.contoh ?? null, is_preset: true }).run()
      inserted++
    } else {
      db.update(kategori).set({ kode, contoh: item.contoh ?? null, is_preset: true }).where(eq(kategori.id, existing.id)).run()
      updated++
    }
  }
  return c.json({ success: true, data: { inserted, updated } })
})

// ── Satuan ────────────────────────────────────────────────────────────────

barangRouter.get('/satuan', async (c) => {
  const rows = db.select().from(satuan).all()
  return c.json({ success: true, data: rows })
})

barangRouter.post('/satuan', requirePermission('stok.edit'), async (c) => {
  const body = await c.req.json<{ nama: string; singkatan: string; contoh?: string }>()
  if (!body.nama?.trim() || !body.singkatan?.trim()) {
    throw new HTTPException(400, { message: 'Nama dan singkatan satuan wajib diisi' })
  }

  const row = db.insert(satuan).values({
    nama: body.nama.trim(),
    singkatan: body.singkatan.trim(),
    contoh: body.contoh?.trim() || null,
  }).returning().get()
  return c.json({ success: true, data: row }, 201)
})

barangRouter.put('/satuan/:id', requirePermission('stok.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ nama: string; singkatan: string; contoh?: string }>()
  if (!body.nama?.trim() || !body.singkatan?.trim()) {
    throw new HTTPException(400, { message: 'Nama dan singkatan wajib diisi' })
  }

  const row = db.update(satuan).set({ nama: body.nama.trim(), singkatan: body.singkatan.trim(), contoh: body.contoh?.trim() || null })
    .where(eq(satuan.id, id)).returning().get()
  if (!row) throw new HTTPException(404, { message: 'Satuan tidak ditemukan' })
  return c.json({ success: true, data: row })
})

barangRouter.delete('/satuan/:id', requirePermission('stok.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const item = db.select().from(satuan).where(eq(satuan.id, id)).get()
  if (!item) throw new HTTPException(404, { message: 'Satuan tidak ditemukan' })
  if (item.is_preset) throw new HTTPException(400, { message: 'Satuan bawaan tidak bisa dihapus' })
  const dipakai = db.select({ id: barang.id }).from(barang).where(eq(barang.satuan_dasar_id, id)).get()
  if (dipakai) throw new HTTPException(400, { message: 'Satuan masih dipakai oleh barang' })
  db.delete(satuan).where(eq(satuan.id, id)).run()
  return c.json({ success: true, data: null })
})

barangRouter.post('/satuan/import-preset', requirePermission('stok.edit'), async (c) => {
  const body = await c.req.json<{ items: { nama: string; singkatan: string; contoh?: string }[] }>()
  let inserted = 0
  let updated = 0
  for (const item of body.items) {
    const existing = db.select({ id: satuan.id }).from(satuan).where(eq(satuan.nama, item.nama)).get()
    if (!existing) {
      db.insert(satuan).values({ nama: item.nama, singkatan: item.singkatan, contoh: item.contoh ?? null, is_preset: true }).run()
      inserted++
    } else {
      db.update(satuan).set({ singkatan: item.singkatan, contoh: item.contoh ?? null, is_preset: true }).where(eq(satuan.id, existing.id)).run()
      updated++
    }
  }
  return c.json({ success: true, data: { inserted, updated } })
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
        q ? or(like(barang.nama_barang, `%${q}%`), like(barang.kode_barang, `%${q}%`)) : undefined,
      )
    )
    .all()

  return c.json({ success: true, data: rows })
})

barangRouter.get('/stok-menipis', requirePermission('stok.lihat'), async (c) => {
  const rows = db
    .select({
      id: barang.id,
      kode_barang: barang.kode_barang,
      nama_barang: barang.nama_barang,
      stok_sekarang: barang.stok_sekarang,
      stok_minimum: barang.stok_minimum,
      satuan: satuan.singkatan,
    })
    .from(barang)
    .leftJoin(satuan, eq(barang.satuan_dasar_id, satuan.id))
    .where(
      and(
        eq(barang.is_active, true),
        sql`${barang.stok_minimum} > 0 AND ${barang.stok_sekarang} <= ${barang.stok_minimum}`
      )
    )
    .orderBy(barang.nama_barang)
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
  const user = c.get('user') as JWTPayload
  const existing = db.select().from(barang).where(eq(barang.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Barang tidak ditemukan' })

  db.update(barang)
    .set({ is_active: false, updated_at: sql`(datetime('now','localtime'))` })
    .where(eq(barang.id, id))
    .run()

  catatLog(user.id, 'nonaktifkan', 'barang', id, { nama_barang: existing.nama_barang, kode: existing.kode_barang })
  return c.json({ success: true, data: null })
})

// ── Upload Foto ───────────────────────────────────────────────────────────

barangRouter.post('/:id/foto', requirePermission('stok.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = db.select().from(barang).where(eq(barang.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Barang tidak ditemukan' })

  const formData = await c.req.formData()
  const file = formData.get('foto') as File | null
  if (!file || !file.size) throw new HTTPException(400, { message: 'File foto wajib diisi' })

  if (!file.type.startsWith('image/')) throw new HTTPException(400, { message: 'File harus berupa gambar' })

  const uploadDir = process.env.UPLOAD_DIR ?? join(import.meta.dir, '../../uploads')
  const produkDir = join(uploadDir, 'produk')
  mkdirSync(produkDir, { recursive: true })

  const filename = `${id}_${Date.now()}.jpg`
  const buf = Buffer.from(await file.arrayBuffer())

  await sharp(buf).resize(300, 300, { fit: 'inside' }).jpeg({ quality: 85 }).toFile(join(produkDir, `med_${filename}`))
  await sharp(buf).resize(60, 60, { fit: 'cover' }).jpeg({ quality: 80 }).toFile(join(produkDir, `thumb_${filename}`))

  const fotoPath = `produk/med_${filename}`
  db.update(barang)
    .set({ foto_path: fotoPath, updated_at: sql`(datetime('now','localtime'))` })
    .where(eq(barang.id, id))
    .run()

  return c.json({ success: true, data: { foto_path: fotoPath } })
})
