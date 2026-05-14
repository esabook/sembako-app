import { Hono } from 'hono'
import { eq, like, and, or, sql, getTableColumns } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.ts'
import { kartu_anggota, pelanggan } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'

export const kartuAnggotaRouter = new Hono()

kartuAnggotaRouter.use('*', authMiddleware)

// List semua kartu, opsional filter status (assigned/available) dan query
kartuAnggotaRouter.get('/', async (c) => {
  const q      = c.req.query('q')
  const status = c.req.query('status') // 'assigned' | 'available'
  const aktif  = c.req.query('aktif') !== '0'

  const rows = db
    .select({
      ...getTableColumns(kartu_anggota),
      pelanggan_nama: pelanggan.nama,
      pelanggan_kode: pelanggan.kode_pelanggan,
    })
    .from(kartu_anggota)
    .leftJoin(pelanggan, eq(kartu_anggota.pelanggan_id, pelanggan.id))
    .where(and(
      aktif ? eq(kartu_anggota.is_active, true) : undefined,
      status === 'assigned'  ? sql`${kartu_anggota.pelanggan_id} IS NOT NULL` : undefined,
      status === 'available' ? sql`${kartu_anggota.pelanggan_id} IS NULL`     : undefined,
      q ? like(kartu_anggota.no_kartu, `%${q}%`) : undefined,
    ))
    .all()

  return c.json({ success: true, data: rows })
})

// Generate kartu baru (no_kartu 10 digit, unik)
kartuAnggotaRouter.post('/generate', requirePermission('penjualan.buat'), async (c) => {
  const body = await c.req.json<{
    tier?: 'reguler' | 'silver' | 'gold'
    diskon_member?: number
    jumlah?: number  // batch generate, max 50
  }>()

  const jumlah = Math.min(body.jumlah ?? 1, 50)
  const tier   = body.tier ?? 'reguler'
  const diskon = body.diskon_member ?? 0

  const hasil: typeof kartu_anggota.$inferSelect[] = []

  for (let i = 0; i < jumlah; i++) {
    let no_kartu: string
    let dupCheck: unknown

    // Cari nomor 10 digit yang belum dipakai
    do {
      const angka = Math.floor(Math.random() * 9_000_000_000) + 1_000_000_000
      no_kartu = String(angka)
      dupCheck = db.select({ id: kartu_anggota.id })
        .from(kartu_anggota)
        .where(eq(kartu_anggota.no_kartu, no_kartu))
        .get()
    } while (dupCheck)

    const row = db.insert(kartu_anggota).values({ no_kartu, tier, diskon_member: diskon }).returning().get()
    hasil.push(row)
  }

  return c.json({ success: true, data: hasil }, 201)
})

kartuAnggotaRouter.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const row = db
    .select({
      ...getTableColumns(kartu_anggota),
      pelanggan_nama: pelanggan.nama,
      pelanggan_kode: pelanggan.kode_pelanggan,
    })
    .from(kartu_anggota)
    .leftJoin(pelanggan, eq(kartu_anggota.pelanggan_id, pelanggan.id))
    .where(eq(kartu_anggota.id, id))
    .get()
  if (!row) throw new HTTPException(404, { message: 'Kartu tidak ditemukan' })
  return c.json({ success: true, data: row })
})

// Update tier / diskon kartu
kartuAnggotaRouter.put('/:id', requirePermission('penjualan.buat'), async (c) => {
  const id   = Number(c.req.param('id'))
  const body = await c.req.json<{ tier?: 'reguler' | 'silver' | 'gold'; diskon_member?: number }>()

  const existing = db.select().from(kartu_anggota).where(eq(kartu_anggota.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Kartu tidak ditemukan' })

  const row = db
    .update(kartu_anggota)
    .set({ ...body, updated_at: sql`(datetime('now','localtime'))` })
    .where(eq(kartu_anggota.id, id))
    .returning()
    .get()

  return c.json({ success: true, data: row })
})

// Update poin kartu
kartuAnggotaRouter.patch('/:id/poin', requirePermission('penjualan.buat'), async (c) => {
  const id   = Number(c.req.param('id'))
  const body = await c.req.json<{ delta: number }>()

  const existing = db.select().from(kartu_anggota).where(eq(kartu_anggota.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Kartu tidak ditemukan' })

  const poin_baru = Math.max(0, existing.poin + body.delta)
  const row = db
    .update(kartu_anggota)
    .set({ poin: poin_baru, updated_at: sql`(datetime('now','localtime'))` })
    .where(eq(kartu_anggota.id, id))
    .returning()
    .get()

  return c.json({ success: true, data: row })
})

// Assign kartu ke pelanggan
kartuAnggotaRouter.post('/:id/assign', requirePermission('penjualan.buat'), async (c) => {
  const id   = Number(c.req.param('id'))
  const body = await c.req.json<{ pelanggan_id: number }>()

  const kartu = db.select().from(kartu_anggota).where(eq(kartu_anggota.id, id)).get()
  if (!kartu) throw new HTTPException(404, { message: 'Kartu tidak ditemukan' })
  if (!kartu.is_active) throw new HTTPException(400, { message: 'Kartu sudah tidak aktif' })
  if (kartu.pelanggan_id) throw new HTTPException(400, { message: 'Kartu sudah di-assign ke pelanggan lain' })

  const plg = db.select().from(pelanggan).where(eq(pelanggan.id, body.pelanggan_id)).get()
  if (!plg) throw new HTTPException(404, { message: 'Pelanggan tidak ditemukan' })

  // Pastikan pelanggan belum punya kartu aktif lain
  const kartuLain = db.select().from(kartu_anggota)
    .where(and(eq(kartu_anggota.pelanggan_id, body.pelanggan_id), eq(kartu_anggota.is_active, true)))
    .get()
  if (kartuLain) throw new HTTPException(400, { message: 'Pelanggan sudah memiliki kartu anggota aktif' })

  const row = db
    .update(kartu_anggota)
    .set({ pelanggan_id: body.pelanggan_id, updated_at: sql`(datetime('now','localtime'))` })
    .where(eq(kartu_anggota.id, id))
    .returning()
    .get()

  return c.json({ success: true, data: row })
})

// Unassign kartu dari pelanggan
kartuAnggotaRouter.delete('/:id/assign', requirePermission('penjualan.buat'), async (c) => {
  const id = Number(c.req.param('id'))
  const kartu = db.select().from(kartu_anggota).where(eq(kartu_anggota.id, id)).get()
  if (!kartu) throw new HTTPException(404, { message: 'Kartu tidak ditemukan' })

  db.update(kartu_anggota)
    .set({ pelanggan_id: null, updated_at: sql`(datetime('now','localtime'))` })
    .where(eq(kartu_anggota.id, id))
    .run()

  return c.json({ success: true, data: null })
})

// Nonaktifkan kartu
kartuAnggotaRouter.delete('/:id', requirePermission('penjualan.buat'), async (c) => {
  const id = Number(c.req.param('id'))
  const kartu = db.select().from(kartu_anggota).where(eq(kartu_anggota.id, id)).get()
  if (!kartu) throw new HTTPException(404, { message: 'Kartu tidak ditemukan' })

  db.update(kartu_anggota)
    .set({ pelanggan_id: null, is_active: false, updated_at: sql`(datetime('now','localtime'))` })
    .where(eq(kartu_anggota.id, id))
    .run()

  return c.json({ success: true, data: null })
})
