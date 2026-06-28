import { Hono } from 'hono'
import { eq, desc, sql, and, gte, ne } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, isoNow } from '../db/index.ts'
import {
  purchase_order, po_detail,
  barang, supplier, satuan,
  penjualan, penjualan_detail,
} from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import type { JWTPayload } from './auth.ts'

export const purchaseOrderRouter = new Hono<{ Variables: { user: JWTPayload } }>()

purchaseOrderRouter.use('*', authMiddleware)
purchaseOrderRouter.use('*', tenantMiddleware)

function noPO(): string {
  const d = new Date()
  const tgl = d.toISOString().slice(0, 10).replace(/-/g, '')
  const rnd = Math.floor(Math.random() * 9000 + 1000)
  return `PO-${tgl}-${rnd}`
}

// ── GET /purchase-order ───────────────────────────────────────────────────

purchaseOrderRouter.get('/', requirePermission('pembelian.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const rows = await query.findAll(db
    .select({
      id: purchase_order.id,
      no_po: purchase_order.no_po,
      tanggal_po: purchase_order.tanggal_po,
      supplier_id: purchase_order.supplier_id,
      nama_supplier: supplier.nama_supplier,
      kontak_supplier: supplier.kontak,
      status: purchase_order.status,
      total_nilai: purchase_order.total_nilai,
    })
    .from(purchase_order)
    .leftJoin(supplier, eq(purchase_order.supplier_id, supplier.id))
    .where(eq(purchase_order.tenant_id, tenantId))
    .orderBy(desc(purchase_order.tanggal_po))
    .limit(100)
    )

  return c.json({ success: true, data: rows })
})

// ── GET /purchase-order/:id ───────────────────────────────────────────────

purchaseOrderRouter.get('/:id', requirePermission('pembelian.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const po = await query.find<typeof purchase_order.$inferSelect>(db.select().from(purchase_order).where(and(eq(purchase_order.id, id), eq(purchase_order.tenant_id, tenantId))))
  if (!po) throw new HTTPException(404, { message: 'PO tidak ditemukan' })

  const items = await query.findAll(db
    .select({
      id: po_detail.id,
      barang_id: po_detail.barang_id,
      nama_barang: barang.nama_barang,
      kode_barang: barang.kode_barang,
      satuan_id: po_detail.satuan_id,
      nama_satuan: satuan.nama,
      singkatan_satuan: satuan.singkatan,
      jumlah_pesan: po_detail.jumlah_pesan,
      jumlah_diterima: po_detail.jumlah_diterima,
      harga_beli_estimasi: po_detail.harga_beli_estimasi,
    })
    .from(po_detail)
    .leftJoin(barang, eq(po_detail.barang_id, barang.id))
    .leftJoin(satuan, eq(po_detail.satuan_id, satuan.id))
    .where(and(eq(po_detail.po_id, id), eq(po_detail.tenant_id, tenantId)))
    )

  const sup = await query.find(db.select().from(supplier).where(eq(supplier.id, po.supplier_id)))

  return c.json({ success: true, data: { ...po, supplier: sup, items } })
})

// ── GET /purchase-order/suggest — auto-suggest dari stok kritis + rata penjualan ──

purchaseOrderRouter.get('/suggest/items', requirePermission('pembelian.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  // Barang stok di bawah minimum
  const kritisRows = (await query.findAll<{ id: number; kode_barang: string; nama_barang: string; stok_sekarang: number; stok_minimum: number; harga_beli_terakhir: number; satuan_dasar_id: number | null }>(db
    .select({
      id: barang.id,
      kode_barang: barang.kode_barang,
      nama_barang: barang.nama_barang,
      stok_sekarang: barang.stok_sekarang,
      stok_minimum: barang.stok_minimum,
      harga_beli_terakhir: barang.harga_beli_terakhir,
      satuan_dasar_id: barang.satuan_dasar_id,
    })
    .from(barang)
    .where(and(eq(barang.is_active, true), eq(barang.tenant_id, tenantId)))
    ))
    .filter((b) => b.stok_sekarang <= b.stok_minimum)

  // Rata penjualan 7 hari — hitung dari penjualan_detail
  const tgl7HariLalu = new Date(Date.now() - 7 * 86400000)
    .toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)

  const penjualanRecent = await query.findAll<{ barang_id: number; total_jumlah: number }>(db
    .select({
      barang_id: penjualan_detail.barang_id,
      total_jumlah: sql<number>`sum(${penjualan_detail.jumlah})`,
    })
    .from(penjualan_detail)
    .innerJoin(penjualan, eq(penjualan_detail.penjualan_id, penjualan.id))
    .where(and(
      gte(penjualan.tanggal, tgl7HariLalu),
      ne(penjualan.status, 'void'),
      eq(penjualan.tenant_id, tenantId),
    ))
    .groupBy(penjualan_detail.barang_id)
    )

  const rataMap = new Map(penjualanRecent.map((r) => [r.barang_id, r.total_jumlah / 7]))

  const suggestions = kritisRows.map((b) => ({
    ...b,
    rata_penjualan_harian: Math.ceil(rataMap.get(b.id) ?? 0),
    saran_pesan: Math.max(
      b.stok_minimum * 2 - b.stok_sekarang,
      Math.ceil((rataMap.get(b.id) ?? 0) * 14)
    ),
  }))

  return c.json({ success: true, data: suggestions })
})

// ── POST /purchase-order ──────────────────────────────────────────────────

purchaseOrderRouter.post('/', requirePermission('pembelian.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const body = await c.req.json<{
    supplier_id: number
    tanggal_estimasi_datang?: string
    items: { barang_id: number; satuan_id?: number; jumlah_pesan: number; harga_beli_estimasi?: number }[]
  }>()

  if (!body.supplier_id) throw new HTTPException(400, { message: 'Supplier wajib dipilih' })
  if (!body.items?.length) throw new HTTPException(400, { message: 'Item PO kosong' })

  const totalNilai = body.items.reduce(
    (s, i) => s + Math.round((i.harga_beli_estimasi ?? 0) * i.jumlah_pesan), 0
  )

  const tgl = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)

  const po = (await query.ret<{ id: number }>(db.insert(purchase_order).values({
    no_po: noPO(),
    supplier_id: body.supplier_id,
    tanggal_po: tgl,
    tanggal_estimasi_datang: body.tanggal_estimasi_datang,
    status: 'draft',
    total_nilai: totalNilai,
    dibuat_oleh: user.id,
    tenant_id: tenantId,
  }).returning()))!

  for (const item of body.items) {
    await query.exec(db.insert(po_detail).values({
      po_id: po.id,
      barang_id: item.barang_id,
      satuan_id: item.satuan_id,
      jumlah_pesan: item.jumlah_pesan,
      jumlah_diterima: 0,
      harga_beli_estimasi: item.harga_beli_estimasi ?? 0,
      tenant_id: tenantId,
    }))
  }

  return c.json({ success: true, data: po }, 201)
})

// ── PUT /purchase-order/:id/status ────────────────────────────────────────

purchaseOrderRouter.put('/:id/status', requirePermission('pembelian.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ status: 'draft' | 'dikirim' | 'sebagian' | 'lunas' | 'batal' }>()

  const po = await query.find<typeof purchase_order.$inferSelect>(db.select().from(purchase_order).where(and(eq(purchase_order.id, id), eq(purchase_order.tenant_id, tenantId))))
  if (!po) throw new HTTPException(404, { message: 'PO tidak ditemukan' })

  await query.exec(db.update(purchase_order)
    .set({ status: body.status, updated_at: isoNow() })
    .where(and(eq(purchase_order.id, id), eq(purchase_order.tenant_id, tenantId)))
  )

  return c.json({ success: true, data: { status: body.status } })
})
