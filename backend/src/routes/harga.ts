import { Hono } from 'hono'
import { eq, desc, and, like, or, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import {
  barang,
  kategori,
  satuan,
  histori_harga_jual,
  karyawan,
} from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import type { JWTPayload } from './auth.ts'

export const hargaRouter = new Hono<{ Variables: { user: JWTPayload } }>()

hargaRouter.use('*', authMiddleware)
hargaRouter.use('*', tenantMiddleware)

function tglSekarang(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)
}

// ── GET /harga ────────────────────────────────────────────────────────────
// List semua barang dengan harga + kalkulasi margin

hargaRouter.get('/', requirePermission('harga_jual.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const q = c.req.query('q')
  const kategori_id = c.req.query('kategori_id')

  const rows = await query.findAll(db
    .select({
      id: barang.id,
      kode_barang: barang.kode_barang,
      nama_barang: barang.nama_barang,
      harga_beli_terakhir: barang.harga_beli_terakhir,
      harga_jual_eceran: barang.harga_jual_eceran,
      harga_jual_grosir: barang.harga_jual_grosir,
      stok_sekarang: barang.stok_sekarang,
      kategori_id: barang.kategori_id,
      nama_kategori: kategori.nama,
      nama_satuan: satuan.nama,
      singkatan_satuan: satuan.singkatan,
    })
    .from(barang)
    .leftJoin(kategori, eq(barang.kategori_id, kategori.id))
    .leftJoin(satuan, eq(barang.satuan_dasar_id, satuan.id))
    .where(
      and(
        eq(barang.tenant_id, tenantId),
        eq(barang.is_active, true),
        q ? or(like(barang.nama_barang, `%${q}%`), like(barang.kode_barang, `%${q}%`)) : undefined,
        kategori_id ? eq(barang.kategori_id, Number(kategori_id)) : undefined,
      )
    )
    )

  const data = rows.map((r) => {
    const harga_beli = r.harga_beli_terakhir
    const margin_eceran = harga_beli > 0
      ? ((r.harga_jual_eceran - harga_beli) / harga_beli) * 100
      : null
    const margin_grosir = harga_beli > 0
      ? ((r.harga_jual_grosir - harga_beli) / harga_beli) * 100
      : null

    return { ...r, margin_eceran, margin_grosir }
  })

  return c.json({ success: true, data })
})

// ── GET /harga/:id/histori ────────────────────────────────────────────────

hargaRouter.get('/:id/histori', requirePermission('harga_jual.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))

  const histori = await query.findAll(db
    .select({
      id: histori_harga_jual.id,
      harga_eceran: histori_harga_jual.harga_eceran,
      harga_grosir: histori_harga_jual.harga_grosir,
      tanggal_berlaku: histori_harga_jual.tanggal_berlaku,
      tanggal_berakhir: histori_harga_jual.tanggal_berakhir,
      nama_ubah: karyawan.nama,
    })
    .from(histori_harga_jual)
    .leftJoin(karyawan, eq(histori_harga_jual.diubah_oleh, karyawan.id))
    .where(and(eq(histori_harga_jual.barang_id, id), eq(histori_harga_jual.tenant_id, tenantId)))
    .orderBy(desc(histori_harga_jual.tanggal_berlaku))
    .limit(20)
    )

  return c.json({ success: true, data: histori })
})

// ── PUT /harga/:id ────────────────────────────────────────────────────────
// Update harga single barang + catat ke histori

hargaRouter.put('/:id', requirePermission('harga_jual.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const payload = c.get('user') as JWTPayload
  const tenantId = payload.tenant_id ?? 1
  const body = await c.req.json<{
    harga_jual_eceran: number
    harga_jual_grosir: number
  }>()

  const existing = await query.find(db.select().from(barang).where(and(eq(barang.id, id), eq(barang.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Barang tidak ditemukan' })

  const tgl = tglSekarang()

  // Tutup histori terakhir yang masih aktif
  await query.exec(db.update(histori_harga_jual)
    .set({ tanggal_berakhir: tgl })
    .where(
      and(
        eq(histori_harga_jual.barang_id, id),
        sql`tanggal_berakhir IS NULL`,
      )
    )
    )

  // Update master
  await query.exec(db.update(barang)
    .set({
      harga_jual_eceran: body.harga_jual_eceran,
      harga_jual_grosir: body.harga_jual_grosir,
      updated_at: isoNow(),
    })
    .where(eq(barang.id, id))
    )

  // Catat histori baru
  await query.exec(db.insert(histori_harga_jual).values({
    barang_id: id,
    harga_eceran: body.harga_jual_eceran,
    harga_grosir: body.harga_jual_grosir,
    tanggal_berlaku: tgl,
    diubah_oleh: payload.id,
    tenant_id: tenantId,
  }))

  return c.json({ success: true, data: { id, ...body } })
})

// ── POST /harga/simulasi ──────────────────────────────────────────────────
// Preview kenaikan/penurunan harga massal tanpa menyimpan

hargaRouter.post('/simulasi', requirePermission('harga_jual.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const body = await c.req.json<{
    barang_ids: number[]
    tipe: 'persen' | 'rupiah'
    nilai_eceran: number
    nilai_grosir: number
  }>()

  if (!body.barang_ids?.length) {
    return c.json({ success: false, error: 'Pilih minimal 1 barang' }, 400)
  }

  const rows = await query.findAll(db
    .select({
      id: barang.id,
      nama_barang: barang.nama_barang,
      kode_barang: barang.kode_barang,
      harga_jual_eceran: barang.harga_jual_eceran,
      harga_jual_grosir: barang.harga_jual_grosir,
      harga_beli_terakhir: barang.harga_beli_terakhir,
    })
    .from(barang)
    .where(and(eq(barang.tenant_id, tenantId), eq(barang.is_active, true)))
    )
    .filter((r) => body.barang_ids.includes(r.id))

  const preview = rows.map((r) => {
    let eceran_baru: number
    let grosir_baru: number

    if (body.tipe === 'persen') {
      eceran_baru = Math.round(r.harga_jual_eceran * (1 + body.nilai_eceran / 100))
      grosir_baru = Math.round(r.harga_jual_grosir * (1 + body.nilai_grosir / 100))
    } else {
      eceran_baru = r.harga_jual_eceran + body.nilai_eceran
      grosir_baru = r.harga_jual_grosir + body.nilai_grosir
    }

    const harga_beli = r.harga_beli_terakhir
    const margin_eceran_baru = harga_beli > 0
      ? ((eceran_baru - harga_beli) / harga_beli) * 100
      : null

    return {
      id: r.id,
      kode_barang: r.kode_barang,
      nama_barang: r.nama_barang,
      harga_eceran_lama: r.harga_jual_eceran,
      harga_grosir_lama: r.harga_jual_grosir,
      harga_eceran_baru: eceran_baru,
      harga_grosir_baru: grosir_baru,
      margin_eceran_baru,
    }
  })

  return c.json({ success: true, data: preview })
})

// ── POST /harga/massal ────────────────────────────────────────────────────
// Apply kenaikan/penurunan harga ke banyak barang sekaligus

hargaRouter.post('/massal', requirePermission('harga_jual.edit'), async (c) => {
  const payload = c.get('user') as JWTPayload
  const tenantId = payload.tenant_id ?? 1
  const body = await c.req.json<{
    barang_ids: number[]
    tipe: 'persen' | 'rupiah'
    nilai_eceran: number
    nilai_grosir: number
  }>()

  if (!body.barang_ids?.length) {
    return c.json({ success: false, error: 'Pilih minimal 1 barang' }, 400)
  }

  const tgl = tglSekarang()
  let updated = 0

  for (const id of body.barang_ids) {
    const b = await query.find(db.select().from(barang).where(and(eq(barang.id, id), eq(barang.tenant_id, tenantId))))
    if (!b) continue

    let eceran_baru: number
    let grosir_baru: number

    if (body.tipe === 'persen') {
      eceran_baru = Math.round(b.harga_jual_eceran * (1 + body.nilai_eceran / 100))
      grosir_baru = Math.round(b.harga_jual_grosir * (1 + body.nilai_grosir / 100))
    } else {
      eceran_baru = b.harga_jual_eceran + body.nilai_eceran
      grosir_baru = b.harga_jual_grosir + body.nilai_grosir
    }

    // Tutup histori lama
    await query.exec(db.update(histori_harga_jual)
      .set({ tanggal_berakhir: tgl })
      .where(and(eq(histori_harga_jual.barang_id, id), sql`tanggal_berakhir IS NULL`))
    )

    // Update master
    await query.exec(db.update(barang)
      .set({
        harga_jual_eceran: eceran_baru,
        harga_jual_grosir: grosir_baru,
        updated_at: isoNow(),
      })
      .where(eq(barang.id, id))
      )

    // Catat histori baru
    await query.exec(db.insert(histori_harga_jual).values({
      barang_id: id,
      harga_eceran: eceran_baru,
      harga_grosir: grosir_baru,
      tanggal_berlaku: tgl,
      diubah_oleh: payload.id,
      tenant_id: tenantId,
    }))

    updated++
  }

  return c.json({ success: true, data: { updated } })
})
