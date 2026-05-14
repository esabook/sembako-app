import { Hono } from 'hono'
import { eq, like, and, or, sql, getTableColumns } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.ts'
import { pelanggan, kartu_anggota } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'

export const pelangganRouter = new Hono()

pelangganRouter.use('*', authMiddleware)

pelangganRouter.get('/', async (c) => {
  const q    = c.req.query('q')
  const aktif = c.req.query('aktif') !== '0'

  const rows = db
    .select({
      ...getTableColumns(pelanggan),
      kartu_id:       kartu_anggota.id,
      no_kartu:       kartu_anggota.no_kartu,
      tier:           kartu_anggota.tier,
      poin:           kartu_anggota.poin,
      diskon_member:  kartu_anggota.diskon_member,
    })
    .from(pelanggan)
    .leftJoin(
      kartu_anggota,
      and(
        eq(kartu_anggota.pelanggan_id, pelanggan.id),
        eq(kartu_anggota.is_active, true),
      )
    )
    .where(and(
      aktif ? eq(pelanggan.is_active, true) : undefined,
      q ? or(
        like(pelanggan.nama, `%${q}%`),
        like(pelanggan.kode_pelanggan, `%${q}%`),
        like(pelanggan.kontak, `%${q}%`),
        like(kartu_anggota.no_kartu, `%${q}%`),
      ) : undefined,
    ))
    .all()

  return c.json({ success: true, data: rows })
})

pelangganRouter.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const row = db
    .select({
      ...getTableColumns(pelanggan),
      kartu_id:      kartu_anggota.id,
      no_kartu:      kartu_anggota.no_kartu,
      tier:          kartu_anggota.tier,
      poin:          kartu_anggota.poin,
      diskon_member: kartu_anggota.diskon_member,
    })
    .from(pelanggan)
    .leftJoin(
      kartu_anggota,
      and(eq(kartu_anggota.pelanggan_id, pelanggan.id), eq(kartu_anggota.is_active, true))
    )
    .where(eq(pelanggan.id, id))
    .get()
  if (!row) throw new HTTPException(404, { message: 'Pelanggan tidak ditemukan' })
  return c.json({ success: true, data: row })
})

pelangganRouter.post('/', requirePermission('penjualan.buat'), async (c) => {
  const body = await c.req.json<{
    kode_pelanggan: string
    nama: string
    gender?: 'pria' | 'wanita'
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
    gender: body.gender ?? null,
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

// Assign kartu anggota ke pelanggan ini (shortcut dari sisi pelanggan)
pelangganRouter.post('/:id/assign-kartu', requirePermission('penjualan.buat'), async (c) => {
  const pelanggan_id = Number(c.req.param('id'))
  const body = await c.req.json<{ kartu_id: number }>()

  const plg = db.select().from(pelanggan).where(eq(pelanggan.id, pelanggan_id)).get()
  if (!plg) throw new HTTPException(404, { message: 'Pelanggan tidak ditemukan' })

  const kartu = db.select().from(kartu_anggota).where(eq(kartu_anggota.id, body.kartu_id)).get()
  if (!kartu) throw new HTTPException(404, { message: 'Kartu tidak ditemukan' })
  if (!kartu.is_active) throw new HTTPException(400, { message: 'Kartu sudah tidak aktif' })
  if (kartu.pelanggan_id) throw new HTTPException(400, { message: 'Kartu sudah di-assign ke pelanggan lain' })

  const kartuLain = db.select().from(kartu_anggota)
    .where(and(eq(kartu_anggota.pelanggan_id, pelanggan_id), eq(kartu_anggota.is_active, true)))
    .get()
  if (kartuLain) throw new HTTPException(400, { message: 'Pelanggan sudah memiliki kartu anggota aktif' })

  const row = db
    .update(kartu_anggota)
    .set({ pelanggan_id, updated_at: sql`(datetime('now','localtime'))` })
    .where(eq(kartu_anggota.id, body.kartu_id))
    .returning()
    .get()

  return c.json({ success: true, data: row })
})

// Unassign kartu dari pelanggan ini
pelangganRouter.delete('/:id/assign-kartu', requirePermission('penjualan.buat'), async (c) => {
  const pelanggan_id = Number(c.req.param('id'))

  const kartu = db.select().from(kartu_anggota)
    .where(and(eq(kartu_anggota.pelanggan_id, pelanggan_id), eq(kartu_anggota.is_active, true)))
    .get()
  if (!kartu) throw new HTTPException(404, { message: 'Pelanggan tidak memiliki kartu aktif' })

  db.update(kartu_anggota)
    .set({ pelanggan_id: null, updated_at: sql`(datetime('now','localtime'))` })
    .where(eq(kartu_anggota.id, kartu.id))
    .run()

  return c.json({ success: true, data: null })
})
