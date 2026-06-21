import { Hono } from 'hono'
import { eq, and, like, or, inArray } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, isoNow } from '../db/index.ts'
import { bahan_baku, resep, satuan, barang } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import type { JWTPayload } from './auth.ts'

export const bomRouter = new Hono<{ Variables: { user: JWTPayload } }>()

bomRouter.use('*', authMiddleware)
bomRouter.use('*', tenantMiddleware)

// ═══════════════════════════════════════════════════════════════════════════
// BAHAN BAKU (raw materials)
// ═══════════════════════════════════════════════════════════════════════════

bomRouter.get('/bahan', requirePermission('stok.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const q = c.req.query('q')
  const all = c.req.query('all') === '1'

  const rows = await query.findAll(db
    .select({
      id: bahan_baku.id,
      kode_bahan: bahan_baku.kode_bahan,
      nama: bahan_baku.nama,
      satuan_id: bahan_baku.satuan_id,
      satuan_singkatan: satuan.singkatan,
      stok_sekarang: bahan_baku.stok_sekarang,
      stok_minimum: bahan_baku.stok_minimum,
      harga_beli_rata: bahan_baku.harga_beli_rata,
      is_active: bahan_baku.is_active,
    })
    .from(bahan_baku)
    .leftJoin(satuan, eq(satuan.id, bahan_baku.satuan_id))
    .where(and(
      eq(bahan_baku.tenant_id, tenantId),
      all ? undefined : eq(bahan_baku.is_active, true),
      q ? or(like(bahan_baku.nama, `%${q}%`), like(bahan_baku.kode_bahan, `%${q}%`)) : undefined,
    ))
    .orderBy(bahan_baku.nama)
  )

  return c.json({ success: true, data: rows })
})

bomRouter.post('/bahan', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const body = await c.req.json<{
    kode_bahan?: string; nama: string; satuan_id?: number | null
    stok_sekarang?: number; stok_minimum?: number; harga_beli_rata?: number
  }>()
  if (!body.nama?.trim()) throw new HTTPException(400, { message: 'Nama bahan wajib diisi' })

  const kode = body.kode_bahan?.trim() || `BHN-${Date.now().toString().slice(-6)}`
  const [row] = await db.insert(bahan_baku).values({
    kode_bahan: kode,
    nama: body.nama.trim(),
    satuan_id: body.satuan_id ?? null,
    stok_sekarang: body.stok_sekarang ?? 0,
    stok_minimum: body.stok_minimum ?? 0,
    harga_beli_rata: body.harga_beli_rata ?? 0,
    created_by: user.id,
    tenant_id: tenantId,
  }).returning({ id: bahan_baku.id })

  return c.json({ success: true, data: { id: row.id } }, 201)
})

bomRouter.put('/bahan/:id', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<{
    nama: string; satuan_id: number | null; stok_sekarang: number
    stok_minimum: number; harga_beli_rata: number; is_active: boolean
  }>>()

  const set: Record<string, unknown> = { updated_at: isoNow() }
  if (body.nama !== undefined) set.nama = body.nama.trim()
  if (body.satuan_id !== undefined) set.satuan_id = body.satuan_id
  if (body.stok_sekarang !== undefined) set.stok_sekarang = body.stok_sekarang
  if (body.stok_minimum !== undefined) set.stok_minimum = body.stok_minimum
  if (body.harga_beli_rata !== undefined) set.harga_beli_rata = body.harga_beli_rata
  if (body.is_active !== undefined) set.is_active = body.is_active

  await db.update(bahan_baku).set(set).where(and(eq(bahan_baku.id, id), eq(bahan_baku.tenant_id, tenantId)))
  return c.json({ success: true })
})

bomRouter.delete('/bahan/:id', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  await db.update(bahan_baku).set({ is_active: false, updated_at: isoNow() })
    .where(and(eq(bahan_baku.id, id), eq(bahan_baku.tenant_id, tenantId)))
  return c.json({ success: true })
})

// ═══════════════════════════════════════════════════════════════════════════
// RESEP / BILL OF MATERIALS (per menu_item)
// ═══════════════════════════════════════════════════════════════════════════

bomRouter.get('/resep/:barang_id', requirePermission('stok.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const barangId = Number(c.req.param('barang_id'))

  const rows = await query.findAll(db
    .select({
      id: resep.id,
      bahan_baku_id: resep.bahan_baku_id,
      bahan_nama: bahan_baku.nama,
      jumlah: resep.jumlah,
      satuan_id: resep.satuan_id,
      satuan_singkatan: satuan.singkatan,
      harga_beli_rata: bahan_baku.harga_beli_rata,
    })
    .from(resep)
    .innerJoin(bahan_baku, eq(bahan_baku.id, resep.bahan_baku_id))
    .leftJoin(satuan, eq(satuan.id, resep.satuan_id))
    .where(and(eq(resep.barang_id, barangId), eq(resep.tenant_id, tenantId)))
    .orderBy(bahan_baku.nama)
  )

  // HPP per porsi = Σ (jumlah × harga_beli_rata)
  const hpp = rows.reduce((s, r) => s + r.jumlah * r.harga_beli_rata, 0)
  return c.json({ success: true, data: { lines: rows, hpp } })
})

// Replace seluruh resep menu (atomic)
bomRouter.put('/resep/:barang_id', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const barangId = Number(c.req.param('barang_id'))
  const body = await c.req.json<{ lines: { bahan_baku_id: number; jumlah: number; satuan_id?: number | null }[] }>()
  const lines = (body.lines ?? []).filter((l) => l.bahan_baku_id && l.jumlah > 0)

  await db.delete(resep).where(and(eq(resep.barang_id, barangId), eq(resep.tenant_id, tenantId)))
  if (lines.length) {
    await db.insert(resep).values(lines.map((l) => ({
      barang_id: barangId,
      bahan_baku_id: l.bahan_baku_id,
      jumlah: l.jumlah,
      satuan_id: l.satuan_id ?? null,
      tenant_id: tenantId,
    })))
  }
  return c.json({ success: true })
})

// ── GET /bom/hpp — rekap HPP semua menu (laporan) ─────────────────────────────

bomRouter.get('/hpp', requirePermission('stok.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1

  const menus = await query.findAll(db
    .select({ id: barang.id, nama_barang: barang.nama_barang, harga_jual_eceran: barang.harga_jual_eceran })
    .from(barang)
    .where(and(eq(barang.tenant_id, tenantId), eq(barang.tipe_produk, 'menu_item'), eq(barang.is_active, true)))
    .orderBy(barang.nama_barang)
  )
  if (!menus.length) return c.json({ success: true, data: [] })

  const menuIds = menus.map((m) => m.id)
  const reseps = await query.findAll(db
    .select({ barang_id: resep.barang_id, jumlah: resep.jumlah, harga_beli_rata: bahan_baku.harga_beli_rata })
    .from(resep)
    .innerJoin(bahan_baku, eq(bahan_baku.id, resep.bahan_baku_id))
    .where(and(inArray(resep.barang_id, menuIds), eq(resep.tenant_id, tenantId)))
  )

  const data = menus.map((m) => {
    const hpp = reseps.filter((r) => r.barang_id === m.id).reduce((s, r) => s + r.jumlah * r.harga_beli_rata, 0)
    const margin = m.harga_jual_eceran - hpp
    const marginPersen = m.harga_jual_eceran > 0 ? Math.round((margin / m.harga_jual_eceran) * 100) : 0
    return { id: m.id, nama_barang: m.nama_barang, harga_jual: m.harga_jual_eceran, hpp, margin, margin_persen: marginPersen }
  })

  return c.json({ success: true, data })
})
