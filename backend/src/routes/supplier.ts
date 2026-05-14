import { Hono } from 'hono'
import { eq, like, and, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.ts'
import { supplier } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'

export const supplierRouter = new Hono()

supplierRouter.use('*', authMiddleware)

supplierRouter.get('/', async (c) => {
  const q = c.req.query('q')
  const aktif = c.req.query('aktif') !== '0'

  const rows = db
    .select()
    .from(supplier)
    .where(
      and(
        aktif ? eq(supplier.is_active, true) : undefined,
        q ? like(supplier.nama_supplier, `%${q}%`) : undefined,
      )
    )
    .all()

  return c.json({ success: true, data: rows })
})

supplierRouter.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const row = db.select().from(supplier).where(eq(supplier.id, id)).get()
  if (!row) throw new HTTPException(404, { message: 'Supplier tidak ditemukan' })
  return c.json({ success: true, data: row })
})

supplierRouter.post('/', requirePermission('pembelian.buat'), async (c) => {
  const body = await c.req.json<{
    kode_supplier: string
    nama_supplier: string
    kontak?: string
    alamat?: string
    terms_bayar?: number
    limit_hutang?: number
  }>()

  if (!body.kode_supplier?.trim() || !body.nama_supplier?.trim()) {
    throw new HTTPException(400, { message: 'Kode dan nama supplier wajib diisi' })
  }

  const row = db.insert(supplier).values({
    kode_supplier: body.kode_supplier.trim(),
    nama_supplier: body.nama_supplier.trim(),
    kontak: body.kontak,
    alamat: body.alamat,
    terms_bayar: body.terms_bayar ?? 0,
    limit_hutang: body.limit_hutang ?? 0,
  }).returning().get()

  return c.json({ success: true, data: row }, 201)
})

supplierRouter.put('/:id', requirePermission('pembelian.buat'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<typeof supplier.$inferInsert>>()

  const existing = db.select().from(supplier).where(eq(supplier.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Supplier tidak ditemukan' })

  const row = db
    .update(supplier)
    .set({ ...body, updated_at: sql`(datetime('now','localtime'))` })
    .where(eq(supplier.id, id))
    .returning()
    .get()

  return c.json({ success: true, data: row })
})

supplierRouter.delete('/:id', requirePermission('pembelian.buat'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = db.select().from(supplier).where(eq(supplier.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Supplier tidak ditemukan' })

  db.update(supplier)
    .set({ is_active: false, updated_at: sql`(datetime('now','localtime'))` })
    .where(eq(supplier.id, id))
    .run()

  return c.json({ success: true, data: null })
})
