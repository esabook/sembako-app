import { Hono } from 'hono'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, withTransaction, } from '../db/index.ts'
import {
  retur_supplier, retur_supplier_detail,
  barang_masuk, barang_masuk_detail,
  barang, mutasi_stok,
  hutang_supplier, jurnal_kas, 
  supplier, karyawan,
} from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import type { JWTPayload } from './auth.ts'

export const returSupplierRouter = new Hono<{ Variables: { user: JWTPayload } }>()

returSupplierRouter.use('*', authMiddleware)
returSupplierRouter.use('*', tenantMiddleware)

function noRetur(): string {
  const d = new Date()
  const tgl = d.toISOString().slice(0, 10).replace(/-/g, '')
  const rnd = Math.floor(Math.random() * 90000 + 10000)
  return `RS-${tgl}-${rnd}`
}

function tglSekarang(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 19)
}

// ── GET / — list retur supplier ───────────────────────────────────────────

returSupplierRouter.get('/', requirePermission('pembelian.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? null

  const dari = c.req.query('dari')
  const sampai = c.req.query('sampai')
  const supplierId = c.req.query('supplier_id')

  const rows = await query.findAll(db
    .select({
      id: retur_supplier.id,
      no_retur: retur_supplier.no_retur,
      tanggal: retur_supplier.tanggal,
      supplier_id: retur_supplier.supplier_id,
      nama_supplier: supplier.nama_supplier,
      total_retur: retur_supplier.total_retur,
      alasan: retur_supplier.alasan,
      metode_refund: retur_supplier.metode_refund,
      dicatat_oleh: retur_supplier.dicatat_oleh,
      pencatat_nama: karyawan.nama,
    })
    .from(retur_supplier)
    .leftJoin(supplier, eq(retur_supplier.supplier_id, supplier.id))
    .leftJoin(karyawan, eq(retur_supplier.dicatat_oleh, karyawan.id))
    .where(
      and(
        eq(retur_supplier.tenant_id, tenantId),
        cabangId ? eq(retur_supplier.cabang_id, cabangId) : undefined,
        dari ? gte(retur_supplier.tanggal, dari) : undefined,
        sampai ? lte(retur_supplier.tanggal, `${sampai} 23:59:59`) : undefined,
        supplierId ? eq(retur_supplier.supplier_id, Number(supplierId)) : undefined,
      ),
    )
    .orderBy(desc(retur_supplier.tanggal))
    )

  return c.json({ success: true, data: rows })
})

// ── GET /:id — detail + items ─────────────────────────────────────────────

returSupplierRouter.get('/:id', requirePermission('pembelian.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))

  const header = await query.find(db
    .select({
      id: retur_supplier.id,
      no_retur: retur_supplier.no_retur,
      barang_masuk_id: retur_supplier.barang_masuk_id,
      no_penerimaan: barang_masuk.no_penerimaan,
      supplier_id: retur_supplier.supplier_id,
      nama_supplier: supplier.nama_supplier,
      tanggal: retur_supplier.tanggal,
      total_retur: retur_supplier.total_retur,
      alasan: retur_supplier.alasan,
      metode_refund: retur_supplier.metode_refund,
      hutang_id: retur_supplier.hutang_id,
      catatan: retur_supplier.catatan,
    })
    .from(retur_supplier)
    .leftJoin(barang_masuk, eq(retur_supplier.barang_masuk_id, barang_masuk.id))
    .leftJoin(supplier, eq(retur_supplier.supplier_id, supplier.id))
    .where(and(eq(retur_supplier.id, id), eq(retur_supplier.tenant_id, tenantId)))
    )

  if (!header) throw new HTTPException(404, { message: 'Retur tidak ditemukan' })

  const items = await query.findAll(db
    .select({
      id: retur_supplier_detail.id,
      barang_id: retur_supplier_detail.barang_id,
      nama_barang: barang.nama_barang,
      kode_barang: barang.kode_barang,
      jumlah_retur: retur_supplier_detail.jumlah_retur,
      harga_beli: retur_supplier_detail.harga_beli,
      subtotal: retur_supplier_detail.subtotal,
    })
    .from(retur_supplier_detail)
    .leftJoin(barang, eq(retur_supplier_detail.barang_id, barang.id))
    .where(eq(retur_supplier_detail.retur_id, id))
    )

  return c.json({ success: true, data: { ...header, items } })
})

// ── GET /sisa/:barang_masuk_id — qty yang masih bisa diretur ─────────────
// Harus di atas /:id agar Hono tidak salah match.

returSupplierRouter.get('/sisa/:barang_masuk_id', requirePermission('pembelian.lihat'), async (c) => {
  const bmId = Number(c.req.param('barang_masuk_id'))

  const diterima = await query.findAll<{ barang_id: number; nama_barang: string | null; kode_barang: string | null; jumlah_terima: number; harga_beli: number }>(db
    .select({
      barang_id: barang_masuk_detail.barang_id,
      nama_barang: barang.nama_barang,
      kode_barang: barang.kode_barang,
      jumlah_terima: barang_masuk_detail.jumlah_terima,
      harga_beli: barang_masuk_detail.harga_beli,
    })
    .from(barang_masuk_detail)
    .leftJoin(barang, eq(barang_masuk_detail.barang_id, barang.id))
    .where(eq(barang_masuk_detail.penerimaan_id, bmId))
    )

  // Jumlah yang sudah diretur sebelumnya dari dokumen ini
  const sudahRetur = await query.findAll<{ barang_id: number; jumlah_retur: number }>(db
    .select({
      barang_id: retur_supplier_detail.barang_id,
      jumlah_retur: retur_supplier_detail.jumlah_retur,
    })
    .from(retur_supplier_detail)
    .innerJoin(retur_supplier, eq(retur_supplier_detail.retur_id, retur_supplier.id))
    .where(eq(retur_supplier.barang_masuk_id, bmId))
    )

  const sudahByBarang: Record<number, number> = {}
  for (const r of sudahRetur) {
    sudahByBarang[r.barang_id] = (sudahByBarang[r.barang_id] ?? 0) + r.jumlah_retur
  }

  const sisa = diterima
    .map((d) => ({
      barang_id: d.barang_id,
      nama_barang: d.nama_barang,
      kode_barang: d.kode_barang,
      jumlah_terima: d.jumlah_terima,
      harga_beli: d.harga_beli,
      sudah_retur: sudahByBarang[d.barang_id!] ?? 0,
      sisa_retur: d.jumlah_terima - (sudahByBarang[d.barang_id!] ?? 0),
    }))
    .filter((d) => d.sisa_retur > 0)

  return c.json({ success: true, data: sisa })
})

// ── POST / — buat retur baru ──────────────────────────────────────────────

type ItemInput = {
  barang_id: number
  jumlah_retur: number
  harga_beli: number
}

returSupplierRouter.post('/', requirePermission('pembelian.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? 1
  const body = await c.req.json<{
    barang_masuk_id: number
    metode_refund: 'kurang_hutang' | 'tunai'
    hutang_id?: number
    kas_bank_id?: number
    alasan?: string
    catatan?: string
    items: ItemInput[]
  }>()

  if (!body.barang_masuk_id) throw new HTTPException(400, { message: 'barang_masuk_id wajib' })
  if (!body.items?.length) throw new HTTPException(400, { message: 'Minimal satu item' })

  const bm = await query.find<typeof barang_masuk.$inferSelect>(db.select().from(barang_masuk).where(and(eq(barang_masuk.id, body.barang_masuk_id), eq(barang_masuk.tenant_id, tenantId))))
  if (!bm) throw new HTTPException(404, { message: 'Dokumen penerimaan tidak ditemukan' })

  // Validasi qty sisa per barang
  for (const item of body.items) {
    if (item.jumlah_retur <= 0) throw new HTTPException(400, { message: 'Jumlah retur harus > 0' })

    const diterima = await query.find<{ jumlah_terima: number }>(db
      .select({ jumlah_terima: barang_masuk_detail.jumlah_terima })
      .from(barang_masuk_detail)
      .where(and(
        eq(barang_masuk_detail.penerimaan_id, body.barang_masuk_id),
        eq(barang_masuk_detail.barang_id, item.barang_id),
      ))
      )

    if (!diterima) throw new HTTPException(400, { message: `Barang ${item.barang_id} tidak ada di penerimaan ini` })

    const sudahReturRows = await query.findAll<{ total: number }>(db
      .select({ total: retur_supplier_detail.jumlah_retur })
      .from(retur_supplier_detail)
      .innerJoin(retur_supplier, eq(retur_supplier_detail.retur_id, retur_supplier.id))
      .where(and(
        eq(retur_supplier.barang_masuk_id, body.barang_masuk_id),
        eq(retur_supplier_detail.barang_id, item.barang_id),
      ))
      )
    const sudahRetur = sudahReturRows.reduce((s, r) => s + r.total, 0)

    const sisa = diterima.jumlah_terima - sudahRetur
    if (item.jumlah_retur > sisa) {
      throw new HTTPException(400, {
        message: `Jumlah retur (${item.jumlah_retur}) melebihi sisa yang bisa diretur (${sisa})`,
      })
    }
  }

  const total = body.items.reduce((s, i) => s + Math.round(i.harga_beli * i.jumlah_retur), 0)
  const tgl = tglSekarang()
  const noRet = noRetur()

  const created = await withTransaction(async (_tx) => {
    // 1. Header retur
    const ret = await query.ret<typeof retur_supplier.$inferSelect>(db.insert(retur_supplier).values({
      no_retur: noRet,
      barang_masuk_id: body.barang_masuk_id,
      supplier_id: bm.supplier_id,
      tanggal: tgl,
      dicatat_oleh: user.id,
      total_retur: total,
      alasan: body.alasan,
      metode_refund: body.metode_refund,
      hutang_id: body.hutang_id,
      kas_bank_id: body.kas_bank_id,
      catatan: body.catatan,
      tenant_id: tenantId,
      cabang_id: cabangId,
    }).returning())

    // 2. Detail + mutasi stok keluar
    for (const item of body.items) {
      const subtotal = Math.round(item.harga_beli * item.jumlah_retur)
      await query.exec(db.insert(retur_supplier_detail).values({
        retur_id: ret!.id!,
        barang_id: item.barang_id,
        jumlah_retur: item.jumlah_retur,
        harga_beli: item.harga_beli,
        subtotal,
        tenant_id: tenantId,
        cabang_id: cabangId,
      }))

      const br = await query.find<{ stok: number }>(db.select({ stok: barang.stok_sekarang }).from(barang).where(eq(barang.id, item.barang_id)))
      if (!br) throw new HTTPException(400, { message: `Barang ID ${item.barang_id} tidak ditemukan` })
      await query.exec(db.insert(mutasi_stok).values({
        barang_id: item.barang_id,
        tanggal: tgl,
        jenis: 'keluar',
        referensi_tipe: 'retur_supplier',
        referensi_id: ret!.id,
        jumlah_sebelum: br.stok,
        jumlah_perubahan: -item.jumlah_retur,
        jumlah_sesudah: br.stok - item.jumlah_retur,
        dicatat_oleh: user.id,
        tenant_id: tenantId,
        cabang_id: cabangId,
      }))

      await query.exec(db.update(barang)
        .set({ stok_sekarang: br.stok - item.jumlah_retur })
        .where(eq(barang.id, item.barang_id))
      )
    }

    // 3. Kurangi hutang supplier
    if (body.metode_refund === 'kurang_hutang' && body.hutang_id) {
      const hutang = await query.find<typeof hutang_supplier.$inferSelect>(db.select().from(hutang_supplier).where(eq(hutang_supplier.id, body.hutang_id)))
      if (hutang && hutang.status !== 'lunas') {
        const sisaBaru = Math.max(0, hutang.sisa_hutang - total)
        const statusBaru = sisaBaru === 0 ? 'lunas' : sisaBaru < hutang.total_hutang ? 'sebagian' : 'belum'
        await query.exec(db.update(hutang_supplier)
          .set({ sisa_hutang: sisaBaru, status: statusBaru })
          .where(eq(hutang_supplier.id, body.hutang_id))
        )
      }
    }

    // 4. Jurnal kas masuk jika metode tunai
    if (body.metode_refund === 'tunai' && body.kas_bank_id) {
      await query.exec(db.insert(jurnal_kas).values({
        tanggal: tgl,
        kas_bank_id: body.kas_bank_id,
        jenis: 'masuk',
        kategori: 'retur_supplier',
        referensi_tipe: 'retur_supplier',
        referensi_id: ret!.id,
        keterangan: `Retur supplier ${noRet}`,
        jumlah: total,
        dicatat_oleh: user.id,
        tenant_id: tenantId,
        cabang_id: cabangId,
      }))
    }

    return ret
  })

  return c.json({ success: true, data: created }, 201)
})
