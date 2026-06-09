import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import {
  draft_keranjang, draft_keranjang_item,
  barang, satuan,
} from '../db/schema.ts'
import { authMiddleware } from '../middleware/auth.ts'
import type { JWTPayload } from './auth.ts'

export const draftRouter = new Hono<{ Variables: { user: JWTPayload } }>()

draftRouter.use('*', authMiddleware)

// ── GET /draft/keranjang — ambil draft kasir ini ──────────────────────────

draftRouter.get('/keranjang', async (c) => {
  const kasirId = c.get('user').id

  const draft = db
    .select()
    .from(draft_keranjang)
    .where(eq(draft_keranjang.kasir_id, kasirId))
    .get()

  if (!draft) return c.json({ success: true, data: null })

  const items = db
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
      singkatan_satuan: satuan.singkatan,
    })
    .from(draft_keranjang_item)
    .leftJoin(barang, eq(draft_keranjang_item.barang_id, barang.id))
    .leftJoin(satuan, eq(draft_keranjang_item.satuan_id, satuan.id))
    .where(eq(draft_keranjang_item.draft_id, draft.id))
    .all()

  return c.json({
    success: true,
    data: {
      tipe: draft.tipe,
      pelanggan_id: draft.pelanggan_id,
      items,
    },
  })
})

// ── PUT /draft/keranjang — upsert seluruh keranjang (atomic) ──────────────

draftRouter.put('/keranjang', async (c) => {
  const kasirId = c.get('user').id
  const body = await c.req.json<{
    tipe: 'eceran' | 'grosir'
    pelanggan_id?: number | null
    items: {
      barang_id: number
      tipe_harga: 'eceran' | 'grosir'
      satuan_id: number | null
      jumlah: number
      harga_jual: number
      diskon_item: number
    }[]
  }>()

  await withTransaction(async (tx) => {
    // Upsert draft header
    const existing = db
      .select({ id: draft_keranjang.id })
      .from(draft_keranjang)
      .where(eq(draft_keranjang.kasir_id, kasirId))
      .get()

    let draftId: number

    if (existing) {
      db.update(draft_keranjang)
        .set({
          tipe: body.tipe,
          pelanggan_id: body.pelanggan_id ?? null,
          updated_at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 19),
        })
        .where(eq(draft_keranjang.kasir_id, kasirId))
        .run()
      draftId = existing.id
    } else {
      const ins = db
        .insert(draft_keranjang)
        .values({
          kasir_id: kasirId,
          tipe: body.tipe,
          pelanggan_id: body.pelanggan_id ?? null,
        })
        .returning({ id: draft_keranjang.id })
        .get()
      draftId = ins.id
    }

    // Replace semua item
    await query.exec(db.delete(draft_keranjang_item)
      .where(eq(draft_keranjang_item.draft_id, draftId))
    )

    if (body.items.length > 0) {
      db.insert(draft_keranjang_item)
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
        .run()
    }
  })

  return c.json({ success: true })
})

// ── DELETE /draft/keranjang — hapus draft kasir ini ──────────────────────

draftRouter.delete('/keranjang', async (c) => {
  const kasirId = c.get('user').id

  const draft = db
    .select({ id: draft_keranjang.id })
    .from(draft_keranjang)
    .where(eq(draft_keranjang.kasir_id, kasirId))
    .get()

  if (draft) {
    await withTransaction(async (tx) => {
      await query.exec(db.delete(draft_keranjang_item)
        .where(eq(draft_keranjang_item.draft_id, draft.id))
      )
      await query.exec(db.delete(draft_keranjang)
        .where(eq(draft_keranjang.id, draft.id))
      )
    })
  }

  return c.json({ success: true })
})
