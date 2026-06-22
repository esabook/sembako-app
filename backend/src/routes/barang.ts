import { Hono } from 'hono'
import { eq, like, and, or, sql, max } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import { barang, kategori, satuan } from '../db/schema.ts'
import { catatLog } from '../utils/log.ts'
import type { JWTPayload } from './auth.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import { saveUpload } from '../utils/upload.ts'
import { getAuditBy } from '../utils/audit.ts'

export const barangRouter = new Hono<{ Variables: { user: JWTPayload } }>()

barangRouter.use('*', authMiddleware)
barangRouter.use('*', tenantMiddleware)

// ── Kategori ──────────────────────────────────────────────────────────────

barangRouter.get('/kategori', async (c) => {
  const rows = await query.findAll(db.select().from(kategori))
  return c.json({ success: true, data: rows })
})

barangRouter.post('/kategori', requirePermission('stok.edit'), async (c) => {
  const body = await c.req.json<{ nama: string; kode?: string; contoh?: string }>()
  if (!body.nama?.trim()) throw new HTTPException(400, { message: 'Nama kategori wajib diisi' })

  const row = await query.ret(db.insert(kategori).values({ nama: body.nama.trim(), kode: body.kode?.trim().toUpperCase() || null, contoh: body.contoh?.trim() || null }).returning())
  return c.json({ success: true, data: row }, 201)
})

barangRouter.put('/kategori/:id', requirePermission('stok.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ nama: string; kode?: string; contoh?: string }>()
  if (!body.nama?.trim()) throw new HTTPException(400, { message: 'Nama wajib diisi' })

  const row = await query.ret(db.update(kategori).set({ nama: body.nama.trim(), kode: body.kode?.trim().toUpperCase() || null, contoh: body.contoh?.trim() || null }).where(eq(kategori.id, id)).returning())
  if (!row) throw new HTTPException(404, { message: 'Kategori tidak ditemukan' })
  return c.json({ success: true, data: row })
})

barangRouter.delete('/kategori/:id', requirePermission('stok.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const item = await query.find<typeof kategori.$inferSelect>(db.select().from(kategori).where(eq(kategori.id, id)))
  if (!item) throw new HTTPException(404, { message: 'Kategori tidak ditemukan' })
  if (item.is_preset) throw new HTTPException(400, { message: 'Kategori bawaan tidak bisa dihapus' })
  const dipakai = await query.find(db.select({ id: barang.id }).from(barang).where(eq(barang.kategori_id, id)))
  if (dipakai) throw new HTTPException(400, { message: 'Kategori masih dipakai oleh barang' })
  await query.exec(db.delete(kategori).where(eq(kategori.id, id)))
  return c.json({ success: true, data: null })
})

barangRouter.post('/kategori/import-preset', requirePermission('stok.edit'), async (c) => {
  const body = await c.req.json<{ items: { nama: string; kode?: string; contoh?: string }[] }>()
  let inserted = 0
  let updated = 0
  for (const item of body.items) {
    const kode = item.kode?.trim().toUpperCase() || null
    const existing = await query.find<{ id: number }>(db.select({ id: kategori.id }).from(kategori).where(eq(kategori.nama, item.nama)))
    if (!existing) {
      await query.exec(db.insert(kategori).values({ nama: item.nama, kode, contoh: item.contoh ?? null, is_preset: true }))
      inserted++
    } else {
      await query.exec(db.update(kategori).set({ kode, contoh: item.contoh ?? null, is_preset: true }).where(eq(kategori.id, existing.id)))
      updated++
    }
  }
  return c.json({ success: true, data: { inserted, updated } })
})

// ── Satuan ────────────────────────────────────────────────────────────────

barangRouter.get('/satuan', async (c) => {
  const rows = await query.findAll(db.select().from(satuan))
  return c.json({ success: true, data: rows })
})

barangRouter.post('/satuan', requirePermission('stok.edit'), async (c) => {
  const body = await c.req.json<{ nama: string; singkatan: string; contoh?: string }>()
  if (!body.nama?.trim() || !body.singkatan?.trim()) {
    throw new HTTPException(400, { message: 'Nama dan singkatan satuan wajib diisi' })
  }

  const row = await query.ret(db.insert(satuan).values({
    nama: body.nama.trim(),
    singkatan: body.singkatan.trim(),
    contoh: body.contoh?.trim() || null,
  }).returning())
  return c.json({ success: true, data: row }, 201)
})

barangRouter.put('/satuan/:id', requirePermission('stok.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ nama: string; singkatan: string; contoh?: string }>()
  if (!body.nama?.trim() || !body.singkatan?.trim()) {
    throw new HTTPException(400, { message: 'Nama dan singkatan wajib diisi' })
  }

  const row = await query.ret(db.update(satuan).set({ nama: body.nama.trim(), singkatan: body.singkatan.trim(), contoh: body.contoh?.trim() || null })
    .where(eq(satuan.id, id)).returning())
  if (!row) throw new HTTPException(404, { message: 'Satuan tidak ditemukan' })
  return c.json({ success: true, data: row })
})

barangRouter.delete('/satuan/:id', requirePermission('stok.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const item = await query.find<typeof satuan.$inferSelect>(db.select().from(satuan).where(eq(satuan.id, id)))
  if (!item) throw new HTTPException(404, { message: 'Satuan tidak ditemukan' })
  if (item.is_preset) throw new HTTPException(400, { message: 'Satuan bawaan tidak bisa dihapus' })
  const dipakai = await query.find(db.select({ id: barang.id }).from(barang).where(eq(barang.satuan_dasar_id, id)))
  if (dipakai) throw new HTTPException(400, { message: 'Satuan masih dipakai oleh barang' })
  await query.exec(db.delete(satuan).where(eq(satuan.id, id)))
  return c.json({ success: true, data: null })
})

barangRouter.post('/satuan/import-preset', requirePermission('stok.edit'), async (c) => {
  const body = await c.req.json<{ items: { nama: string; singkatan: string; contoh?: string }[] }>()
  let inserted = 0
  let updated = 0
  for (const item of body.items) {
    const existing = await query.find<{ id: number }>(db.select({ id: satuan.id }).from(satuan).where(eq(satuan.nama, item.nama)))
    if (!existing) {
      await query.exec(db.insert(satuan).values({ nama: item.nama, singkatan: item.singkatan, contoh: item.contoh ?? null, is_preset: true }))
      inserted++
    } else {
      await query.exec(db.update(satuan).set({ singkatan: item.singkatan, contoh: item.contoh ?? null, is_preset: true }).where(eq(satuan.id, existing.id)))
      updated++
    }
  }
  return c.json({ success: true, data: { inserted, updated } })
})

// ── Barang ────────────────────────────────────────────────────────────────

barangRouter.get('/', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const q = c.req.query('q')
  const aktif = c.req.query('aktif') !== '0'

  const rows = await query.findAll(db
    .select({
      id: barang.id,
      kode_barang: barang.kode_barang,
      nama_barang: barang.nama_barang,
      tipe_produk: barang.tipe_produk,
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
        eq(barang.tenant_id, tenantId),
        aktif ? eq(barang.is_active, true) : undefined,
        q ? or(like(barang.nama_barang, `%${q}%`), like(barang.kode_barang, `%${q}%`)) : undefined,
      )
    )
    )

  return c.json({ success: true, data: rows })
})

barangRouter.get('/stok-menipis', requirePermission('stok.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const rows = await query.findAll(db
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
        eq(barang.tenant_id, tenantId),
        eq(barang.is_active, true),
        sql`${barang.stok_minimum} > 0 AND ${barang.stok_sekarang} <= ${barang.stok_minimum}`
      )
    )
    .orderBy(barang.nama_barang)
    )

  return c.json({ success: true, data: rows })
})

barangRouter.get('/:id', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const row = await query.find(db.select().from(barang).where(and(eq(barang.id, id), eq(barang.tenant_id, tenantId))))
  if (!row) throw new HTTPException(404, { message: 'Barang tidak ditemukan' })
  return c.json({ success: true, data: row })
})

barangRouter.post('/', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const body = await c.req.json<{
    kode_barang: string
    nama_barang: string
    tipe_produk?: 'physical_good' | 'menu_item' | 'service'
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
  if ((body.harga_beli_terakhir ?? 0) < 0 || (body.harga_jual_eceran ?? 0) < 0 ||
      (body.harga_jual_grosir ?? 0) < 0 || (body.stok_minimum ?? 0) < 0) {
    throw new HTTPException(400, { message: 'Harga dan stok minimum tidak boleh negatif' })
  }

  const row = await query.ret(db.insert(barang).values({
    kode_barang: body.kode_barang.trim(),
    nama_barang: body.nama_barang.trim(),
    tipe_produk: body.tipe_produk ?? 'physical_good',
    kategori_id: body.kategori_id,
    satuan_dasar_id: body.satuan_dasar_id,
    harga_beli_terakhir: body.harga_beli_terakhir ?? 0,
    harga_jual_eceran: body.harga_jual_eceran ?? 0,
    harga_jual_grosir: body.harga_jual_grosir ?? 0,
    stok_minimum: body.stok_minimum ?? 0,
    lokasi_rak: body.lokasi_rak,
    tenant_id: tenantId,
  }).returning())

  return c.json({ success: true, data: row }, 201)
})

barangRouter.put('/:id', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<typeof barang.$inferInsert>>()

  const existing = await query.find(db.select().from(barang).where(and(eq(barang.id, id), eq(barang.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Barang tidak ditemukan' })
  if ((body.harga_beli_terakhir !== undefined && body.harga_beli_terakhir < 0) ||
      (body.harga_jual_eceran !== undefined && body.harga_jual_eceran < 0) ||
      (body.harga_jual_grosir !== undefined && body.harga_jual_grosir < 0) ||
      (body.stok_minimum !== undefined && body.stok_minimum < 0)) {
    throw new HTTPException(400, { message: 'Harga dan stok minimum tidak boleh negatif' })
  }

  const row = await query.find(db
    .update(barang)
    .set({ ...body, updated_at: isoNow() })
    .where(and(eq(barang.id, id), eq(barang.tenant_id, tenantId)))
    .returning()
    )

  return c.json({ success: true, data: row })
})

barangRouter.delete('/:id', requirePermission('stok.hapus'), async (c) => {
  const id = Number(c.req.param('id'))
  const user = c.get('user') as JWTPayload
  const existing = await query.find<typeof barang.$inferSelect>(db.select().from(barang).where(eq(barang.id, id)))
  if (!existing) throw new HTTPException(404, { message: 'Barang tidak ditemukan' })
  if ((existing.stok_sekarang ?? 0) > 0) {
    throw new HTTPException(400, {
      message: `Tidak bisa nonaktifkan "${existing.nama_barang}" — masih ada ${existing.stok_sekarang} unit stok. Lakukan stok opname dulu.`,
    })
  }

  await query.exec(db.update(barang)
    .set({ is_active: false, updated_at: isoNow() })
    .where(eq(barang.id, id))
  )

  catatLog(user.id, 'nonaktifkan', 'barang', id, { nama_barang: existing.nama_barang, kode: existing.kode_barang })
  return c.json({ success: true, data: null })
})

// ── Upload Foto ───────────────────────────────────────────────────────────

barangRouter.post('/:id/foto', requirePermission('stok.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = await query.find<typeof barang.$inferSelect>(db.select().from(barang).where(eq(barang.id, id)))
  if (!existing) throw new HTTPException(404, { message: 'Barang tidak ditemukan' })

  const formData = await c.req.formData()
  const file = formData.get('foto') as File | null
  if (!file || !file.size) throw new HTTPException(400, { message: 'File foto wajib diisi' })

  const { path: fotoPath } = await saveUpload(file, {
    subdir: 'produk',
    prefix: id,
    mode: { type: 'contain', w: 300, h: 300 },
    quality: 85,
    thumbnail: { w: 60, h: 60, quality: 80 },
  })

  await query.exec(db.update(barang)
    .set({ foto_path: fotoPath, updated_at: isoNow() })
    .where(eq(barang.id, id))
  )

  return c.json({ success: true, data: { foto_path: fotoPath } })
})

// ── Import CSV ────────────────────────────────────────────────────────────
// Terima array row yang sudah diparsing & dipetakan di frontend.
// Backend bertanggung jawab: resolve kategori/satuan, generate kode, upsert.

type ImportRow = {
  nama_barang: string
  kode_barang?: string
  kategori_nama?: string
  satuan_nama?: string
  harga_beli?: number
  harga_jual_eceran?: number
  harga_jual_grosir?: number
  stok_minimum?: number
  stok_sekarang?: number
  lokasi_rak?: string
}

type ImportSettings = {
  duplikat: 'skip' | 'update' | 'generate'
  kategori_auto: boolean
  satuan_auto: boolean
  kategori_default_id?: number
  satuan_default_id?: number
}

barangRouter.post('/import-csv', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const body = await c.req.json<{ rows: ImportRow[]; settings: ImportSettings }>()

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    throw new HTTPException(400, { message: 'Tidak ada baris untuk diimport' })
  }

  type FailedRow = { index: number; nama: string; alasan: string }
  const berhasil: number[] = []
  const dilewati: number[] = []
  const gagal: FailedRow[] = []
  const kategoriDibuat: string[] = []
  const satuanDibuat: string[] = []

  // Cache lookup agar tidak query berulang per baris
  const katCache = new Map<string, number>()
  const satCache = new Map<string, number>()

  // Seed cache dengan data yang sudah ada
  for (const k of await query.findAll<{ id: number; nama: string }>(db.select({ id: kategori.id, nama: kategori.nama }).from(kategori))) {
    katCache.set(k.nama.toLowerCase(), k.id)
  }
  for (const s of await query.findAll<{ id: number; nama: string }>(db.select({ id: satuan.id, nama: satuan.nama }).from(satuan))) {
    satCache.set(s.nama.toLowerCase(), s.id)
  }

  // Ambil counter kode otomatis terakhir
  const lastKodeRows = await query.findAll<{ kode: string }>(db.select({ kode: barang.kode_barang }).from(barang)
    .where(like(barang.kode_barang, 'BRG-%')))
  const lastKode = lastKodeRows.map(r => parseInt(r.kode.replace('BRG-', '')) || 0)
  let kodeCounter = lastKode.length > 0 ? Math.max(...lastKode) : 0

  function nextKode(): string {
    kodeCounter++
    return `BRG-${String(kodeCounter).padStart(4, '0')}`
  }

  await withTransaction(async (tx) => {
    for (let i = 0; i < body.rows.length; i++) {
      const row = body.rows[i]!
      const nama = row.nama_barang?.trim()
      if (!nama) {
        gagal.push({ index: i + 1, nama: '', alasan: 'nama_barang kosong' })
        continue
      }

      // Resolve kategori
      let kategoriId: number | undefined
      if (row.kategori_nama?.trim()) {
        const key = row.kategori_nama.trim().toLowerCase()
        if (katCache.has(key)) {
          kategoriId = katCache.get(key)
        } else if (body.settings.kategori_auto) {
          const newKat = (await query.ret<{ id: number }>(db.insert(kategori).values({ nama: row.kategori_nama.trim() }).returning()))!
          katCache.set(key, newKat.id)
          kategoriDibuat.push(row.kategori_nama.trim())
          kategoriId = newKat.id
        } else {
          kategoriId = body.settings.kategori_default_id
        }
      }

      // Resolve satuan
      let satuanId: number | undefined
      if (row.satuan_nama?.trim()) {
        const key = row.satuan_nama.trim().toLowerCase()
        if (satCache.has(key)) {
          satuanId = satCache.get(key)
        } else if (body.settings.satuan_auto) {
          const newSat = (await query.ret<{ id: number }>(db.insert(satuan).values({ nama: row.satuan_nama.trim(), singkatan: row.satuan_nama.trim().slice(0, 10) }).returning()))!
          satCache.set(key, newSat.id)
          satuanDibuat.push(row.satuan_nama.trim())
          satuanId = newSat.id
        } else {
          satuanId = body.settings.satuan_default_id
        }
      }

      // Resolve kode
      let kode = row.kode_barang?.trim()
      if (!kode) kode = nextKode()

      // Cek duplikat
      const existing = await query.find<{ id: number; kode_barang: string }>(db.select({ id: barang.id, kode_barang: barang.kode_barang })
        .from(barang).where(eq(barang.kode_barang, kode)))

      if (existing) {
        if (body.settings.duplikat === 'skip') {
          dilewati.push(i + 1)
          continue
        } else if (body.settings.duplikat === 'generate') {
          kode = nextKode()
        } else {
          // update
          await query.exec(db.update(barang).set({
            nama_barang: nama,
            kategori_id: kategoriId,
            satuan_dasar_id: satuanId,
            harga_beli_terakhir: row.harga_beli ?? 0,
            harga_beli_rata: row.harga_beli ?? 0,
            harga_jual_eceran: row.harga_jual_eceran ?? 0,
            harga_jual_grosir: row.harga_jual_grosir ?? 0,
            stok_minimum: row.stok_minimum ?? 0,
            stok_sekarang: row.stok_sekarang ?? 0,
            lokasi_rak: row.lokasi_rak || null,
            ...{ updated_by: user.id },
            updated_at: isoNow(),
          }).where(eq(barang.id, existing.id)))
          berhasil.push(existing.id)
          continue
        }
      }

      try {
        const inserted = (await query.find<{ id: number }>(db.insert(barang).values({
          kode_barang: kode,
          nama_barang: nama,
          kategori_id: kategoriId,
          satuan_dasar_id: satuanId,
          harga_beli_terakhir: row.harga_beli ?? 0,
          harga_beli_rata: row.harga_beli ?? 0,
          harga_jual_eceran: row.harga_jual_eceran ?? 0,
          harga_jual_grosir: row.harga_jual_grosir ?? 0,
          stok_minimum: row.stok_minimum ?? 0,
          stok_sekarang: row.stok_sekarang ?? 0,
          lokasi_rak: row.lokasi_rak || null,
          ...getAuditBy(c),
        }).returning({ id: barang.id })))!
        berhasil.push(inserted.id)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        gagal.push({ index: i + 1, nama, alasan: msg.includes('UNIQUE') ? 'Kode sudah ada' : 'Gagal simpan' })
      }
    }
  })

  return c.json({
    success: true,
    data: {
      berhasil: berhasil.length,
      dilewati: dilewati.length,
      gagal,
      kategori_dibuat: [...new Set(kategoriDibuat)],
      satuan_dibuat: [...new Set(satuanDibuat)],
    },
  })
})
