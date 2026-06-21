import { Hono } from 'hono'
import { eq, sql } from 'drizzle-orm'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import {
  draft_keranjang, draft_keranjang_item,
  barang, satuan,
} from '../db/schema.ts'
import { authMiddleware } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import type { JWTPayload } from './auth.ts'

export const draftRouter = new Hono<{ Variables: { user: JWTPayload } }>()

draftRouter.use('*', authMiddleware)
draftRouter.use('*', tenantMiddleware)

// ── GET /draft/keranjang — list semua bill kasir ini (tanpa items) ────────

draftRouter.get('/keranjang', async (c) => {
  const user = c.get('user') as JWTPayload
  const kasirId = user.id

  const bills = await query.findAll(db
    .select({
      id: draft_keranjang.id,
      nomor_bill: draft_keranjang.nomor_bill,
      label: draft_keranjang.label,
      tipe: draft_keranjang.tipe,
      pelanggan_id: draft_keranjang.pelanggan_id,
      subtotal: draft_keranjang.subtotal,
      jumlah_item: draft_keranjang.jumlah_item,
      created_at: draft_keranjang.created_at,
      updated_at: draft_keranjang.updated_at,
    })
    .from(draft_keranjang)
    .where(eq(draft_keranjang.kasir_id, kasirId))
  )

  return c.json({ success: true, data: bills })
})

// ── GET /draft/keranjang/:id — 1 bill lengkap dengan items ───────────────

draftRouter.get('/keranjang/:id', async (c) => {
  const user = c.get('user') as JWTPayload
  const kasirId = user.id
  const draftId = Number(c.req.param('id'))

  const draft = await query.find<typeof draft_keranjang.$inferSelect>(db
    .select()
    .from(draft_keranjang)
    .where(eq(draft_keranjang.id, draftId))
  )

  if (!draft || draft.kasir_id !== kasirId) return c.json({ success: true, data: null })

  const items = await query.findAll(db
    .select({
      barang_id: draft_keranjang_item.barang_id,
      tipe_harga: draft_keranjang_item.tipe_harga,
      satuan_id: draft_keranjang_item.satuan_id,
      jumlah: draft_keranjang_item.jumlah,
      harga_jual: draft_keranjang_item.harga_jual,
      diskon_item: draft_keranjang_item.diskon_item,
      kode_barang: barang.kode_barang,
      nama_barang: barang.nama_barang,
      stok_sekarang: barang.stok_sekarang,
      harga_eceran: barang.harga_jual_eceran,
      harga_grosir: barang.harga_jual_grosir,
      singkatan_satuan: satuan.singkatan,
    })
    .from(draft_keranjang_item)
    .leftJoin(barang, eq(draft_keranjang_item.barang_id, barang.id))
    .leftJoin(satuan, eq(draft_keranjang_item.satuan_id, satuan.id))
    .where(eq(draft_keranjang_item.draft_id, draftId))
  )

  return c.json({
    success: true,
    data: {
      id: draft.id,
      nomor_bill: draft.nomor_bill,
      label: draft.label,
      tipe: draft.tipe,
      pelanggan_id: draft.pelanggan_id,
      subtotal: draft.subtotal,
      jumlah_item: draft.jumlah_item,
      items,
    },
  })
})

// ── POST /draft/keranjang — buat bill baru kosong ────────────────────────

draftRouter.post('/keranjang', async (c) => {
  const user = c.get('user') as JWTPayload
  const kasirId = user.id

  const maxRow = await query.find<{ max_nomor: number | null }>(db
    .select({ max_nomor: sql<number>`MAX(${draft_keranjang.nomor_bill})` })
    .from(draft_keranjang)
    .where(eq(draft_keranjang.kasir_id, kasirId))
  )

  const nomorBill = (maxRow?.max_nomor ?? 0) + 1

  const ins = await query.find<{ id: number }>(db
    .insert(draft_keranjang)
    .values({
      kasir_id: kasirId,
      tipe: 'eceran',
      nomor_bill: nomorBill,
    })
    .returning({ id: draft_keranjang.id })
  )

  return c.json({ success: true, data: { id: ins!.id, nomor_bill: nomorBill } })
})

// ── PUT /draft/keranjang/:id — simpan items ke bill tertentu (atomic) ────

draftRouter.put('/keranjang/:id', async (c) => {
  const user = c.get('user') as JWTPayload
  const kasirId = user.id
  const draftId = Number(c.req.param('id'))
  const body = await c.req.json<{
    tipe: 'eceran' | 'grosir'
    pelanggan_id?: number | null
    label?: string | null
    items: {
      barang_id: number
      tipe_harga: 'eceran' | 'grosir'
      satuan_id: number | null
      jumlah: number
      harga_jual: number
      diskon_item: number
    }[]
  }>()

  // Verify ownership
  const draft = await query.find<{ id: number; kasir_id: number }>(db
    .select({ id: draft_keranjang.id, kasir_id: draft_keranjang.kasir_id })
    .from(draft_keranjang)
    .where(eq(draft_keranjang.id, draftId))
  )

  if (!draft || draft.kasir_id !== kasirId) {
    return c.json({ success: false, error: 'Bill tidak ditemukan' }, 404)
  }

  const subtotal = body.items.reduce((sum, i) => sum + i.harga_jual * i.jumlah - i.diskon_item, 0)

  await withTransaction(async (_tx) => {
    await query.exec(db.update(draft_keranjang)
      .set({
        tipe: body.tipe,
        pelanggan_id: body.pelanggan_id ?? null,
        label: body.label ?? null,
        subtotal,
        jumlah_item: body.items.length,
        updated_at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 19),
      })
      .where(eq(draft_keranjang.id, draftId))
    )

    await query.exec(db.delete(draft_keranjang_item)
      .where(eq(draft_keranjang_item.draft_id, draftId))
    )

    if (body.items.length > 0) {
      await query.exec(db.insert(draft_keranjang_item)
        .values(
          body.items.map((i) => ({
            draft_id: draftId,
            barang_id: i.barang_id,
            tipe_harga: i.tipe_harga,
            satuan_id: i.satuan_id ?? null,
            jumlah: i.jumlah,
            harga_jual: i.harga_jual,
            diskon_item: i.diskon_item,
          }))
        )
      )
    }
  })

  return c.json({ success: true })
})

// ── DELETE /draft/keranjang/:id — hapus 1 bill ────────────────────────────

draftRouter.delete('/keranjang/:id', async (c) => {
  const user = c.get('user') as JWTPayload
  const kasirId = user.id
  const draftId = Number(c.req.param('id'))

  const draft = await query.find<{ id: number; kasir_id: number }>(db
    .select({ id: draft_keranjang.id, kasir_id: draft_keranjang.kasir_id })
    .from(draft_keranjang)
    .where(eq(draft_keranjang.id, draftId))
  )

  if (!draft || draft.kasir_id !== kasirId) {
    return c.json({ success: true }) // idempotent
  }

  await withTransaction(async (_tx) => {
    await query.exec(db.delete(draft_keranjang_item)
      .where(eq(draft_keranjang_item.draft_id, draft.id))
    )
    await query.exec(db.delete(draft_keranjang)
      .where(eq(draft_keranjang.id, draft.id))
    )
  })

  return c.json({ success: true })
})
