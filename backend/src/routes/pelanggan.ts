import type { JWTPayload } from './auth.ts'
import { Hono } from 'hono'
import { eq, like, and, or, ne, desc, gte, lte, sql, getTableColumns } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import { pelanggan, kartu_anggota, penjualan, penjualan_detail, barang } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'

export const pelangganRouter = new Hono<{ Variables: { user: JWTPayload } }>()

pelangganRouter.use('*', authMiddleware)
pelangganRouter.use('*', tenantMiddleware)

pelangganRouter.get('/', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const q    = c.req.query('q')
  const aktif = c.req.query('aktif') !== '0'

  const rows = await query.findAll(db
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
      eq(pelanggan.tenant_id, tenantId),
      aktif ? eq(pelanggan.is_active, true) : undefined,
      q ? or(
        like(pelanggan.nama, `%${q}%`),
        like(pelanggan.kode_pelanggan, `%${q}%`),
        like(pelanggan.kontak, `%${q}%`),
        like(kartu_anggota.no_kartu, `%${q}%`),
      ) : undefined,
    ))
    )

  return c.json({ success: true, data: rows })
})

pelangganRouter.get('/:id', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const row = await query.find(db
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
    .where(and(eq(pelanggan.id, id), eq(pelanggan.tenant_id, tenantId)))
    )
  if (!row) throw new HTTPException(404, { message: 'Pelanggan tidak ditemukan' })
  return c.json({ success: true, data: row })
})

pelangganRouter.post('/', requirePermission('penjualan.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
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

  const row = await query.ret(db.insert(pelanggan).values({
    kode_pelanggan: body.kode_pelanggan.trim(),
    nama: body.nama.trim(),
    gender: body.gender ?? null,
    tipe: body.tipe ?? 'eceran',
    kontak: body.kontak,
    alamat: body.alamat,
    limit_piutang: body.limit_piutang ?? 0,
    tenant_id: tenantId,
  }).returning())

  return c.json({ success: true, data: row }, 201)
})

pelangganRouter.put('/:id', requirePermission('penjualan.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<typeof pelanggan.$inferInsert>>()

  const existing = await query.find(db.select().from(pelanggan).where(and(eq(pelanggan.id, id), eq(pelanggan.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Pelanggan tidak ditemukan' })

  const row = await query.find(db
    .update(pelanggan)
    .set({ ...body, updated_at: isoNow() })
    .where(and(eq(pelanggan.id, id), eq(pelanggan.tenant_id, tenantId)))
    .returning()
    )

  return c.json({ success: true, data: row })
})

pelangganRouter.delete('/:id', requirePermission('penjualan.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const existing = await query.find(db.select().from(pelanggan).where(and(eq(pelanggan.id, id), eq(pelanggan.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Pelanggan tidak ditemukan' })

  await query.exec(db.update(pelanggan)
    .set({ is_active: false, updated_at: isoNow() })
    .where(and(eq(pelanggan.id, id), eq(pelanggan.tenant_id, tenantId)))
  )

  return c.json({ success: true, data: null })
})

// Assign kartu anggota ke pelanggan ini (shortcut dari sisi pelanggan)
pelangganRouter.post('/:id/assign-kartu', requirePermission('penjualan.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const pelanggan_id = Number(c.req.param('id'))
  const body = await c.req.json<{ kartu_id: number }>()

  const plg = await query.find(db.select().from(pelanggan).where(and(eq(pelanggan.id, pelanggan_id), eq(pelanggan.tenant_id, tenantId))))
  if (!plg) throw new HTTPException(404, { message: 'Pelanggan tidak ditemukan' })

  const kartu = await query.find(db.select().from(kartu_anggota).where(eq(kartu_anggota.id, body.kartu_id)))
  if (!kartu) throw new HTTPException(404, { message: 'Kartu tidak ditemukan' })
  if (!kartu.is_active) throw new HTTPException(400, { message: 'Kartu sudah tidak aktif' })
  if (kartu.pelanggan_id) throw new HTTPException(400, { message: 'Kartu sudah di-assign ke pelanggan lain' })

  const kartuLain = await query.find(db.select().from(kartu_anggota)
    .where(and(eq(kartu_anggota.pelanggan_id, pelanggan_id), eq(kartu_anggota.is_active, true)))
  )
  if (kartuLain) throw new HTTPException(400, { message: 'Pelanggan sudah memiliki kartu anggota aktif' })

  const row = await query.find(db
    .update(kartu_anggota)
    .set({ pelanggan_id, updated_at: isoNow() })
    .where(eq(kartu_anggota.id, body.kartu_id))
    .returning()
    )

  return c.json({ success: true, data: row })
})

// ── GET /pelanggan/:id/riwayat — riwayat transaksi pelanggan ────────────────

pelangganRouter.get('/:id/riwayat', requirePermission('penjualan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const dari = c.req.query('dari')
  const sampai = c.req.query('sampai')
  const limit = Math.min(Number(c.req.query('limit') ?? 20), 100)
  const offset = Number(c.req.query('offset') ?? 0)

  const conds: ReturnType<typeof eq>[] = [
    eq(penjualan.pelanggan_id, id) as any,
    ne(penjualan.status, 'void') as any,
    eq(penjualan.tenant_id, tenantId) as any,
  ]
  if (dari) conds.push(gte(penjualan.tanggal, dari) as any)
  if (sampai) conds.push(lte(penjualan.tanggal, sampai + ' 23:59:59') as any)

  const rows = await query.findAll(db
    .select({
      id: penjualan.id,
      no_transaksi: penjualan.no_transaksi,
      tanggal: penjualan.tanggal,
      tipe: penjualan.tipe,
      total: penjualan.total,
      diskon_total: penjualan.diskon_total,
      metode_bayar: penjualan.metode_bayar,
      status: penjualan.status,
    })
    .from(penjualan)
    .where(and(...conds))
    .orderBy(desc(penjualan.tanggal))
    .limit(limit)
    .offset(offset)
    )

  const totalRow = await query.find(db
    .select({ count: sql<number>`COUNT(*)` })
    .from(penjualan)
    .where(and(...conds))
    )

  const summary = await query.find(db
    .select({
      total_transaksi: sql<number>`COUNT(*)`,
      total_belanja: sql<number>`COALESCE(SUM(${penjualan.total}), 0)`,
      rata_per_trx: sql<number>`COALESCE(AVG(${penjualan.total}), 0)`,
      terakhir_belanja: sql<string>`MAX(${penjualan.tanggal})`,
    })
    .from(penjualan)
    .where(and(
      eq(penjualan.pelanggan_id, id),
      ne(penjualan.status, 'void'),
      eq(penjualan.tenant_id, tenantId),
    ))
    )

  return c.json({ success: true, data: { rows, total: totalRow?.count ?? 0, summary } })
})

// ── GET /pelanggan/:id/riwayat/:trx_id/detail — item detail satu transaksi ──

pelangganRouter.get('/:id/riwayat/:trx_id/detail', requirePermission('penjualan.lihat'), async (c) => {
  const trxId = Number(c.req.param('trx_id'))

  const items = await query.findAll(db
    .select({
      id: penjualan_detail.id,
      nama_barang: barang.nama_barang,
      jumlah: penjualan_detail.jumlah,
      harga_jual: penjualan_detail.harga_jual,
      diskon_item: penjualan_detail.diskon_item,
      subtotal: penjualan_detail.subtotal,
    })
    .from(penjualan_detail)
    .leftJoin(barang, eq(penjualan_detail.barang_id, barang.id))
    .where(eq(penjualan_detail.penjualan_id, trxId))
    )

  return c.json({ success: true, data: items })
})

// Unassign kartu dari pelanggan ini
pelangganRouter.delete('/:id/assign-kartu', requirePermission('penjualan.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const pelanggan_id = Number(c.req.param('id'))

  const plgCheck = await query.find(db.select().from(pelanggan).where(and(eq(pelanggan.id, pelanggan_id), eq(pelanggan.tenant_id, tenantId))))
  if (!plgCheck) throw new HTTPException(404, { message: 'Pelanggan tidak ditemukan' })

  const kartu = await query.find(db.select().from(kartu_anggota)
    .where(and(eq(kartu_anggota.pelanggan_id, pelanggan_id), eq(kartu_anggota.is_active, true)))
  )
  if (!kartu) throw new HTTPException(404, { message: 'Pelanggan tidak memiliki kartu aktif' })

  await query.exec(db.update(kartu_anggota)
    .set({ pelanggan_id: null, updated_at: isoNow() })
    .where(eq(kartu_anggota.id, kartu.id))
  )

  return c.json({ success: true, data: null })
})
