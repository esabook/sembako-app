import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
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

// ── GET /draft/keranjang — ambil draft kasir ini ──────────────────────────

draftRouter.get('/keranjang', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const kasirId = user.id

  const draft = await query.find<typeof draft_keranjang.$inferSelect>(db
    .select()
    .from(draft_keranjang)
    .where(eq(draft_keranjang.kasir_id, kasirId))
    )

  if (!draft) return c.json({ success: true, data: null })

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
    .where(eq(draft_keranjang_item.draft_id, draft.id!))
    )

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
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const kasirId = user.id
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
    const existing = await query.find<{ id: number }>(db
      .select({ id: draft_keranjang.id })
      .from(draft_keranjang)
      .where(eq(draft_keranjang.kasir_id, kasirId))
      )

    let draftId: number

    if (existing) {
      await query.exec(db.update(draft_keranjang)
        .set({
          tipe: body.tipe,
          pelanggan_id: body.pelanggan_id ?? null,
          updated_at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 19),
        })
        .where(eq(draft_keranjang.kasir_id, kasirId))
        )
      draftId = existing.id
    } else {
      const ins = await query.find<{ id: number }>(db
        .insert(draft_keranjang)
        .values({
          kasir_id: kasirId,
          tipe: body.tipe,
          pelanggan_id: body.pelanggan_id ?? null,
        })
        .returning({ id: draft_keranjang.id })
        )
      draftId = ins!.id
    }

    // Replace semua item
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

// ── DELETE /draft/keranjang — hapus draft kasir ini ──────────────────────

draftRouter.delete('/keranjang', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const kasirId = user.id

  const draft = await query.find<{ id: number }>(db
    .select({ id: draft_keranjang.id })
    .from(draft_keranjang)
    .where(eq(draft_keranjang.kasir_id, kasirId))
    )

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
