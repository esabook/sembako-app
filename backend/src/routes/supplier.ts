import type { JWTPayload } from './auth.ts'
import { Hono } from 'hono'
import { eq, like, and, } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, isoNow } from '../db/index.ts'
import { supplier } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'

export const supplierRouter = new Hono<{ Variables: { user: JWTPayload } }>()

supplierRouter.use('*', authMiddleware)
supplierRouter.use('*', tenantMiddleware)

supplierRouter.get('/', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const q = c.req.query('q')
  const aktif = c.req.query('aktif') !== '0'

  const rows = await query.findAll(db
    .select()
    .from(supplier)
    .where(
      and(
        eq(supplier.tenant_id, tenantId),
        aktif ? eq(supplier.is_active, true) : undefined,
        q ? like(supplier.nama_supplier, `%${q}%`) : undefined,
      )
    )
    )

  return c.json({ success: true, data: rows })
})

supplierRouter.get('/:id', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const row = await query.find(db.select().from(supplier).where(and(eq(supplier.id, id), eq(supplier.tenant_id, tenantId))))
  if (!row) throw new HTTPException(404, { message: 'Supplier tidak ditemukan' })
  return c.json({ success: true, data: row })
})

supplierRouter.post('/', requirePermission('pembelian.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
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

  const row = await query.ret(db.insert(supplier).values({
    kode_supplier: body.kode_supplier.trim(),
    nama_supplier: body.nama_supplier.trim(),
    kontak: body.kontak,
    alamat: body.alamat,
    terms_bayar: body.terms_bayar ?? 0,
    limit_hutang: body.limit_hutang ?? 0,
    tenant_id: tenantId,
  }).returning())

  return c.json({ success: true, data: row }, 201)
})

supplierRouter.put('/:id', requirePermission('pembelian.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<typeof supplier.$inferInsert>>()

  const existing = await query.find(db.select().from(supplier).where(and(eq(supplier.id, id), eq(supplier.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Supplier tidak ditemukan' })

  const row = await query.find(db
    .update(supplier)
    .set({ ...body, updated_at: isoNow() })
    .where(and(eq(supplier.id, id), eq(supplier.tenant_id, tenantId)))
    .returning()
    )

  return c.json({ success: true, data: row })
})

supplierRouter.delete('/:id', requirePermission('pembelian.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const existing = await query.find(db.select().from(supplier).where(and(eq(supplier.id, id), eq(supplier.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Supplier tidak ditemukan' })

  await query.exec(db.update(supplier)
    .set({ is_active: false, updated_at: isoNow() })
    .where(and(eq(supplier.id, id), eq(supplier.tenant_id, tenantId)))
  )

  return c.json({ success: true, data: null })
})
