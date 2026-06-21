import { Hono } from 'hono'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, isoNow } from '../db/index.ts'
import {
  meja,
  penjualan, penjualan_detail, penjualan_detail_modifier,
  barang, grup_modifier, modifier, barang_modifier_grup,
} from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import type { JWTPayload } from './auth.ts'

export const fnbRouter = new Hono<{ Variables: { user: JWTPayload } }>()

fnbRouter.use('*', authMiddleware)
fnbRouter.use('*', tenantMiddleware)

// ── GET /fnb/meja ─────────────────────────────────────────────────────────────

fnbRouter.get('/meja', requirePermission('penjualan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? null
  const all = c.req.query('all') === '1' // master: termasuk non-aktif

  const rows = await query.findAll(db
    .select({
      id: meja.id,
      kode_meja: meja.kode_meja,
      nama: meja.nama,
      kapasitas: meja.kapasitas,
      status: meja.status,
      is_active: meja.is_active,
      cabang_id: meja.cabang_id,
    })
    .from(meja)
    .where(
      and(
        eq(meja.tenant_id, tenantId),
        cabangId ? eq(meja.cabang_id, cabangId) : undefined,
        all ? undefined : eq(meja.is_active, true),
      )
    )
    .orderBy(meja.kode_meja)
  )

  return c.json({ success: true, data: rows })
})

// ── POST /fnb/meja (buat meja) ────────────────────────────────────────────────

fnbRouter.post('/meja', requirePermission('penjualan.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? 1
  const body = await c.req.json<{ kode_meja: string; nama?: string; kapasitas?: number }>()

  if (!body.kode_meja?.trim()) throw new HTTPException(400, { message: 'Kode meja wajib diisi' })

  const [row] = await db.insert(meja).values({
    kode_meja: body.kode_meja.trim(),
    nama: body.nama?.trim() || null,
    kapasitas: body.kapasitas ?? 2,
    tenant_id: tenantId,
    cabang_id: cabangId,
  }).returning({ id: meja.id })

  return c.json({ success: true, data: { id: row.id } }, 201)
})

// ── PUT /fnb/meja/:id (edit meja) ─────────────────────────────────────────────

fnbRouter.put('/meja/:id', requirePermission('penjualan.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ kode_meja?: string; nama?: string; kapasitas?: number; is_active?: boolean }>()

  const set: Record<string, unknown> = { updated_at: isoNow() }
  if (body.kode_meja !== undefined) set.kode_meja = body.kode_meja.trim()
  if (body.nama !== undefined) set.nama = body.nama?.trim() || null
  if (body.kapasitas !== undefined) set.kapasitas = body.kapasitas
  if (body.is_active !== undefined) set.is_active = body.is_active

  await db.update(meja).set(set).where(and(eq(meja.id, id), eq(meja.tenant_id, tenantId)))

  return c.json({ success: true })
})

// ── DELETE /fnb/meja/:id (nonaktifkan) ────────────────────────────────────────

fnbRouter.delete('/meja/:id', requirePermission('penjualan.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))

  await db.update(meja).set({ is_active: false, updated_at: isoNow() })
    .where(and(eq(meja.id, id), eq(meja.tenant_id, tenantId)))

  return c.json({ success: true })
})

// ── PUT /fnb/meja/:id/status ──────────────────────────────────────────────────

fnbRouter.put('/meja/:id/status', requirePermission('penjualan.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ status: string }>()

  const allowed = ['kosong', 'terisi', 'reserved', 'dibersihkan']
  if (!allowed.includes(body.status)) {
    throw new HTTPException(400, { message: 'Status tidak valid' })
  }

  await db
    .update(meja)
    .set({ status: body.status as 'kosong' | 'terisi' | 'reserved' | 'dibersihkan', updated_at: isoNow() })
    .where(and(eq(meja.id, id), eq(meja.tenant_id, tenantId)))

  return c.json({ success: true })
})

// ── GET /fnb/modifier-grup?barang_id= ────────────────────────────────────────

fnbRouter.get('/modifier-grup', requirePermission('penjualan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const barangId = Number(c.req.query('barang_id'))

  if (!barangId) return c.json({ success: true, data: [] })

  // Ambil grup_modifier_id yg terhubung ke barang ini
  const junctions = await query.findAll(db
    .select({ grup_modifier_id: barang_modifier_grup.grup_modifier_id, urutan: barang_modifier_grup.urutan })
    .from(barang_modifier_grup)
    .where(
      and(
        eq(barang_modifier_grup.barang_id, barangId),
        eq(barang_modifier_grup.tenant_id, tenantId),
      )
    )
    .orderBy(barang_modifier_grup.urutan)
  )

  if (!junctions.length) return c.json({ success: true, data: [] })

  const grupIds = junctions.map((j) => j.grup_modifier_id)

  const grups = await query.findAll(db
    .select({
      id: grup_modifier.id,
      nama: grup_modifier.nama,
      wajib: grup_modifier.wajib,
      min_pilih: grup_modifier.min_pilih,
      max_pilih: grup_modifier.max_pilih,
    })
    .from(grup_modifier)
    .where(
      and(
        inArray(grup_modifier.id, grupIds),
        eq(grup_modifier.is_active, true),
        eq(grup_modifier.tenant_id, tenantId),
      )
    )
  )

  const modifiers = await query.findAll(db
    .select({
      id: modifier.id,
      grup_modifier_id: modifier.grup_modifier_id,
      nama: modifier.nama,
      harga_tambahan: modifier.harga_tambahan,
      is_active: modifier.is_active,
    })
    .from(modifier)
    .where(
      and(
        inArray(modifier.grup_modifier_id, grupIds),
        eq(modifier.is_active, true),
        eq(modifier.tenant_id, tenantId),
      )
    )
    .orderBy(modifier.id)
  )

  const data = grups.map((g) => ({
    ...g,
    modifiers: modifiers.filter((m) => m.grup_modifier_id === g.id),
  }))

  return c.json({ success: true, data })
})

// ═══════════════════════════════════════════════════════════════════════════
// MASTER MODIFIER (grup + opsi + assign ke menu)
// ═══════════════════════════════════════════════════════════════════════════

// ── GET /fnb/grup-modifier (semua grup + opsi) ────────────────────────────────

fnbRouter.get('/grup-modifier', requirePermission('penjualan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1

  const grups = await query.findAll(db
    .select({
      id: grup_modifier.id,
      nama: grup_modifier.nama,
      wajib: grup_modifier.wajib,
      min_pilih: grup_modifier.min_pilih,
      max_pilih: grup_modifier.max_pilih,
      is_active: grup_modifier.is_active,
    })
    .from(grup_modifier)
    .where(eq(grup_modifier.tenant_id, tenantId))
    .orderBy(grup_modifier.nama)
  )

  if (!grups.length) return c.json({ success: true, data: [] })

  const grupIds = grups.map((g) => g.id)
  const mods = await query.findAll(db
    .select({
      id: modifier.id,
      grup_modifier_id: modifier.grup_modifier_id,
      nama: modifier.nama,
      harga_tambahan: modifier.harga_tambahan,
      is_active: modifier.is_active,
    })
    .from(modifier)
    .where(and(inArray(modifier.grup_modifier_id, grupIds), eq(modifier.tenant_id, tenantId)))
    .orderBy(modifier.id)
  )

  const data = grups.map((g) => ({ ...g, modifiers: mods.filter((m) => m.grup_modifier_id === g.id) }))
  return c.json({ success: true, data })
})

// ── POST/PUT/DELETE grup-modifier ─────────────────────────────────────────────

fnbRouter.post('/grup-modifier', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const body = await c.req.json<{ nama: string; wajib?: boolean; min_pilih?: number; max_pilih?: number }>()
  if (!body.nama?.trim()) throw new HTTPException(400, { message: 'Nama grup wajib diisi' })

  const [row] = await db.insert(grup_modifier).values({
    nama: body.nama.trim(),
    wajib: body.wajib ?? false,
    min_pilih: body.min_pilih ?? 0,
    max_pilih: body.max_pilih ?? 1,
    created_by: user.id,
    tenant_id: tenantId,
  }).returning({ id: grup_modifier.id })

  return c.json({ success: true, data: { id: row.id } }, 201)
})

fnbRouter.put('/grup-modifier/:id', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<{ nama: string; wajib: boolean; min_pilih: number; max_pilih: number; is_active: boolean }>>()

  const set: Record<string, unknown> = {}
  if (body.nama !== undefined) set.nama = body.nama.trim()
  if (body.wajib !== undefined) set.wajib = body.wajib
  if (body.min_pilih !== undefined) set.min_pilih = body.min_pilih
  if (body.max_pilih !== undefined) set.max_pilih = body.max_pilih
  if (body.is_active !== undefined) set.is_active = body.is_active

  await db.update(grup_modifier).set(set).where(and(eq(grup_modifier.id, id), eq(grup_modifier.tenant_id, tenantId)))
  return c.json({ success: true })
})

fnbRouter.delete('/grup-modifier/:id', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  await db.update(grup_modifier).set({ is_active: false }).where(and(eq(grup_modifier.id, id), eq(grup_modifier.tenant_id, tenantId)))
  return c.json({ success: true })
})

// ── POST/PUT/DELETE modifier (opsi) ───────────────────────────────────────────

fnbRouter.post('/modifier', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const body = await c.req.json<{ grup_modifier_id: number; nama: string; harga_tambahan?: number }>()
  if (!body.grup_modifier_id || !body.nama?.trim()) throw new HTTPException(400, { message: 'Grup & nama opsi wajib diisi' })

  const [row] = await db.insert(modifier).values({
    grup_modifier_id: body.grup_modifier_id,
    nama: body.nama.trim(),
    harga_tambahan: body.harga_tambahan ?? 0,
    tenant_id: tenantId,
  }).returning({ id: modifier.id })

  return c.json({ success: true, data: { id: row.id } }, 201)
})

fnbRouter.put('/modifier/:id', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<{ nama: string; harga_tambahan: number; is_active: boolean }>>()

  const set: Record<string, unknown> = {}
  if (body.nama !== undefined) set.nama = body.nama.trim()
  if (body.harga_tambahan !== undefined) set.harga_tambahan = body.harga_tambahan
  if (body.is_active !== undefined) set.is_active = body.is_active

  await db.update(modifier).set(set).where(and(eq(modifier.id, id), eq(modifier.tenant_id, tenantId)))
  return c.json({ success: true })
})

fnbRouter.delete('/modifier/:id', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  await db.update(modifier).set({ is_active: false }).where(and(eq(modifier.id, id), eq(modifier.tenant_id, tenantId)))
  return c.json({ success: true })
})

// ── Assign grup modifier ke menu (barang) ─────────────────────────────────────

fnbRouter.get('/barang/:barang_id/modifier-grup', requirePermission('penjualan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const barangId = Number(c.req.param('barang_id'))
  const rows = await query.findAll(db
    .select({ grup_modifier_id: barang_modifier_grup.grup_modifier_id })
    .from(barang_modifier_grup)
    .where(and(eq(barang_modifier_grup.barang_id, barangId), eq(barang_modifier_grup.tenant_id, tenantId)))
  )
  return c.json({ success: true, data: rows.map((r) => r.grup_modifier_id) })
})

fnbRouter.put('/barang/:barang_id/modifier-grup', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const barangId = Number(c.req.param('barang_id'))
  const body = await c.req.json<{ grup_ids: number[] }>()
  const ids = Array.isArray(body.grup_ids) ? body.grup_ids : []

  // Replace set: hapus semua junction lama, insert baru
  await db.delete(barang_modifier_grup).where(and(eq(barang_modifier_grup.barang_id, barangId), eq(barang_modifier_grup.tenant_id, tenantId)))
  if (ids.length) {
    await db.insert(barang_modifier_grup).values(ids.map((gid, i) => ({
      barang_id: barangId,
      grup_modifier_id: gid,
      urutan: i,
      tenant_id: tenantId,
    })))
  }
  return c.json({ success: true })
})

// ── GET /fnb/kds ──────────────────────────────────────────────────────────────

fnbRouter.get('/kds', requirePermission('penjualan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? null

  // Order items aktif (pending/cooking), join penjualan + barang
  const rows = await query.findAll(db
    .select({
      id: penjualan_detail.id,
      penjualan_id: penjualan_detail.penjualan_id,
      no_transaksi: penjualan.no_transaksi,
      meja_id: penjualan.meja_id,
      meja_kode: sql<string | null>`(SELECT kode_meja FROM meja WHERE id = ${penjualan.meja_id})`,
      barang_nama: barang.nama_barang,
      jumlah: penjualan_detail.jumlah,
      catatan: penjualan_detail.catatan,
      status_kds: penjualan_detail.status_kds,
      created_at: penjualan.created_at,
    })
    .from(penjualan_detail)
    .innerJoin(penjualan, eq(penjualan.id, penjualan_detail.penjualan_id))
    .innerJoin(barang, eq(barang.id, penjualan_detail.barang_id))
    .where(
      and(
        eq(penjualan_detail.tenant_id, tenantId),
        cabangId ? eq(penjualan_detail.cabang_id, cabangId) : undefined,
        inArray(penjualan_detail.status_kds, ['pending', 'cooking']),
      )
    )
    .orderBy(penjualan_detail.created_at)
  )

  if (!rows.length) return c.json({ success: true, data: [] })

  // Ambil modifier untuk semua detail ini
  const detailIds = rows.map((r) => r.id)
  const mods = await query.findAll(db
    .select({
      penjualan_detail_id: penjualan_detail_modifier.penjualan_detail_id,
      nama_snapshot: penjualan_detail_modifier.nama_snapshot,
    })
    .from(penjualan_detail_modifier)
    .where(inArray(penjualan_detail_modifier.penjualan_detail_id, detailIds))
  )

  const data = rows.map((r) => ({
    ...r,
    modifiers: mods.filter((m) => m.penjualan_detail_id === r.id).map((m) => m.nama_snapshot),
  }))

  return c.json({ success: true, data })
})

// ── PUT /fnb/kds/:id ──────────────────────────────────────────────────────────

fnbRouter.put('/kds/:id', requirePermission('penjualan.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ status_kds: string }>()

  const allowed = ['pending', 'cooking', 'served', 'cancelled']
  if (!allowed.includes(body.status_kds)) {
    throw new HTTPException(400, { message: 'status_kds tidak valid' })
  }

  await db
    .update(penjualan_detail)
    .set({ status_kds: body.status_kds as 'pending' | 'cooking' | 'served' | 'cancelled' })
    .where(and(eq(penjualan_detail.id, id), eq(penjualan_detail.tenant_id, tenantId)))

  return c.json({ success: true })
})
