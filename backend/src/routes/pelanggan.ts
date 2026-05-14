import { Hono } from 'hono'
import { eq, like, and, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.ts'
import { pelanggan } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'

export const pelangganRouter = new Hono()

pelangganRouter.use('*', authMiddleware)

pelangganRouter.get('/', async (c) => {
  const q = c.req.query('q')
  const aktif = c.req.query('aktif') !== '0'

  const rows = db
    .select()
    .from(pelanggan)
    .where(
      and(
        aktif ? eq(pelanggan.is_active, true) : undefined,
        q ? like(pelanggan.nama, `%${q}%`) : undefined,
      )
    )
    .all()

  return c.json({ success: true, data: rows })
})

pelangganRouter.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const row = db.select().from(pelanggan).where(eq(pelanggan.id, id)).get()
  if (!row) throw new HTTPException(404, { message: 'Pelanggan tidak ditemukan' })
  return c.json({ success: true, data: row })
})

pelangganRouter.post('/', requirePermission('penjualan.buat'), async (c) => {
  const body = await c.req.json<{
    kode_pelanggan: string
    nama: string
    tipe?: 'eceran' | 'grosir' | 'langganan'
    kontak?: string
    alamat?: string
    limit_piutang?: number
  }>()

  if (!body.kode_pelanggan?.trim() || !body.nama?.trim()) {
    throw new HTTPException(400, { message: 'Kode dan nama pelanggan wajib diisi' })
  }

  const row = db.insert(pelanggan).values({
    kode_pelanggan: body.kode_pelanggan.trim(),
    nama: body.nama.trim(),
    tipe: body.tipe ?? 'eceran',
    kontak: body.kontak,
    alamat: body.alamat,
    limit_piutang: body.limit_piutang ?? 0,
  }).returning().get()

  return c.json({ success: true, data: row }, 201)
})

pelangganRouter.put('/:id', requirePermission('penjualan.buat'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<typeof pelanggan.$inferInsert>>()

  const existing = db.select().from(pelanggan).where(eq(pelanggan.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Pelanggan tidak ditemukan' })

  const row = db
    .update(pelanggan)
    .set({ ...body, updated_at: sql`(datetime('now','localtime'))` })
    .where(eq(pelanggan.id, id))
    .returning()
    .get()

  return c.json({ success: true, data: row })
})

pelangganRouter.delete('/:id', requirePermission('penjualan.buat'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = db.select().from(pelanggan).where(eq(pelanggan.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Pelanggan tidak ditemukan' })

  db.update(pelanggan)
    .set({ is_active: false, updated_at: sql`(datetime('now','localtime'))` })
    .where(eq(pelanggan.id, id))
    .run()

  return c.json({ success: true, data: null })
})
