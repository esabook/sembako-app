import { Hono } from 'hono'
import { eq, desc, and, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import {
  stok_opname, stok_opname_detail,
  barang, mutasi_stok, kategori, satuan,
} from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import type { JWTPayload } from './auth.ts'

export const stokOpnameRouter = new Hono<{ Variables: { user: JWTPayload } }>()

stokOpnameRouter.use('*', authMiddleware)
stokOpnameRouter.use('*', tenantMiddleware)

function noOpname(): string {
  const d = new Date()
  const tgl = d.toISOString().slice(0, 10).replace(/-/g, '')
  const rnd = Math.floor(Math.random() * 9000 + 1000)
  return `OP-${tgl}-${rnd}`
}

function tglSekarang(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 19)
}

// ── GET /stok-opname ──────────────────────────────────────────────────────

stokOpnameRouter.get('/', requirePermission('stok.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? null
  const rows = await query.findAll(db
    .select()
    .from(stok_opname)
    .where(and(
      eq(stok_opname.tenant_id, tenantId),
      cabangId ? eq(stok_opname.cabang_id, cabangId) : undefined,
    ))
    .orderBy(desc(stok_opname.tanggal_mulai))
    )

  return c.json({ success: true, data: rows })
})

// ── GET /stok-opname/:id ──────────────────────────────────────────────────

stokOpnameRouter.get('/:id', requirePermission('stok.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? null
  const id = Number(c.req.param('id'))
  const op = await query.find(db.select().from(stok_opname).where(and(
    eq(stok_opname.id, id),
    eq(stok_opname.tenant_id, tenantId),
    cabangId ? eq(stok_opname.cabang_id, cabangId) : undefined,
  )))
  if (!op) throw new HTTPException(404, { message: 'Opname tidak ditemukan' })

  const items = await query.findAll(db
    .select({
      id: stok_opname_detail.id,
      barang_id: stok_opname_detail.barang_id,
      kode_barang: barang.kode_barang,
      nama_barang: barang.nama_barang,
      nama_kategori: kategori.nama,
      nama_satuan: satuan.nama,
      singkatan_satuan: satuan.singkatan,
      lokasi_rak: barang.lokasi_rak,
      stok_sistem: stok_opname_detail.stok_sistem,
      stok_fisik: stok_opname_detail.stok_fisik,
      selisih: stok_opname_detail.selisih,
      alasan_selisih: stok_opname_detail.alasan_selisih,
    })
    .from(stok_opname_detail)
    .leftJoin(barang, eq(stok_opname_detail.barang_id, barang.id))
    .leftJoin(kategori, eq(barang.kategori_id, kategori.id))
    .leftJoin(satuan, eq(barang.satuan_dasar_id, satuan.id))
    .where(eq(stok_opname_detail.opname_id, id))
    )

  const sudahDihitung = items.filter((i) => i.stok_fisik !== null).length
  const progress = items.length > 0 ? Math.round((sudahDihitung / items.length) * 100) : 0

  return c.json({ success: true, data: { ...op, items, progress, sudah_dihitung: sudahDihitung } })
})

// ── POST /stok-opname — buat opname baru, snapshot stok sistem ────────────

stokOpnameRouter.post('/', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? 1

  // Cek tidak ada opname aktif (draft/proses) di cabang ini
  const aktif = await query.find(db
    .select()
    .from(stok_opname)
    .where(and(
      eq(stok_opname.status, 'draft'),
      eq(stok_opname.tenant_id, tenantId),
      eq(stok_opname.cabang_id, cabangId),
    ))
    )
    ?? await query.find(db.select().from(stok_opname).where(and(
      eq(stok_opname.status, 'proses'),
      eq(stok_opname.tenant_id, tenantId),
      eq(stok_opname.cabang_id, cabangId),
    )))

  if (aktif) {
    throw new HTTPException(400, {
      message: `Masih ada opname aktif (${aktif.no_opname}). Selesaikan atau batalkan dulu.`,
    })
  }

  const tgl = tglSekarang()

  const opname = await withTransaction(async (tx) => {
    const op = await query.ret(db.insert(stok_opname).values({
      no_opname: noOpname(),
      tanggal_mulai: tgl,
      status: 'proses',
      tenant_id: tenantId,
      cabang_id: cabangId,
    }).returning())

    // Snapshot semua barang aktif milik toko ini
    const semuaBarang = await query.findAll(db
      .select({ id: barang.id, stok_sekarang: barang.stok_sekarang })
      .from(barang)
      .where(and(eq(barang.is_active, true), eq(barang.tenant_id, tenantId)))
      )

    for (const br of semuaBarang) {
      await query.exec(db.insert(stok_opname_detail).values({
        opname_id: op.id,
        barang_id: br.id,
        stok_sistem: br.stok_sekarang,
        stok_fisik: null,
        selisih: null,
        tenant_id: tenantId,
        cabang_id: cabangId,
      }))
    }

    return op
  })

  return c.json({ success: true, data: opname }, 201)
})

// ── PUT /stok-opname/:id/item/:itemId — input stok fisik ─────────────────

stokOpnameRouter.put('/:id/item/:itemId', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const opId = Number(c.req.param('id'))
  const itemId = Number(c.req.param('itemId'))
  const body = await c.req.json<{ stok_fisik: number; alasan_selisih?: string }>()

  if (body.stok_fisik === undefined || body.stok_fisik < 0)
    throw new HTTPException(400, { message: 'Stok fisik tidak valid' })

  // Verify opname belongs to tenant
  const op = await query.find(db.select({ id: stok_opname.id }).from(stok_opname).where(and(
    eq(stok_opname.id, opId),
    eq(stok_opname.tenant_id, tenantId),
  )))
  if (!op) throw new HTTPException(404, { message: 'Opname tidak ditemukan' })

  const item = await query.find(db
    .select()
    .from(stok_opname_detail)
    .where(eq(stok_opname_detail.id, itemId))
    )
  if (!item || item.opname_id !== opId)
    throw new HTTPException(404, { message: 'Item tidak ditemukan' })

  const selisih = body.stok_fisik - item.stok_sistem

  await query.exec(db.update(stok_opname_detail)
    .set({
      stok_fisik: body.stok_fisik,
      selisih,
      alasan_selisih: body.alasan_selisih,
      dihitung_oleh: user.id,
    })
    .where(eq(stok_opname_detail.id, itemId))
    )

  return c.json({ success: true, data: { selisih } })
})

// ── POST /stok-opname/:id/approve — approve & update stok ────────────────

stokOpnameRouter.post('/:id/approve', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? 1
  const id = Number(c.req.param('id'))

  const op = await query.find(db.select().from(stok_opname).where(and(
    eq(stok_opname.id, id),
    eq(stok_opname.tenant_id, tenantId),
  )))
  if (!op) throw new HTTPException(404, { message: 'Opname tidak ditemukan' })
  if (op.status === 'approved') throw new HTTPException(400, { message: 'Opname sudah diapprove' })

  const items = await query.findAll(db
    .select()
    .from(stok_opname_detail)
    .where(eq(stok_opname_detail.opname_id, id))
    )

  const belumDihitung = items.filter((i) => i.stok_fisik === null).length
  if (belumDihitung > 0)
    throw new HTTPException(400, { message: `Masih ada ${belumDihitung} item belum dihitung` })

  const tgl = tglSekarang()

  await withTransaction(async (tx) => {
    for (const item of items) {
      if (item.selisih === null || item.selisih === 0) continue

      const br = await query.find(db.select().from(barang).where(eq(barang.id, item.barang_id)))
      if (!br) continue

      await query.exec(db.insert(mutasi_stok).values({
        barang_id: item.barang_id,
        tanggal: tgl,
        jenis: 'opname',
        referensi_tipe: 'stok_opname',
        referensi_id: id,
        jumlah_sebelum: br.stok_sekarang,
        jumlah_perubahan: item.selisih!,
        jumlah_sesudah: item.stok_fisik!,
        dicatat_oleh: user.id,
        tenant_id: tenantId,
        cabang_id: cabangId,
      }))

      await query.exec(db.update(barang)
        .set({ stok_sekarang: item.stok_fisik! })
        .where(eq(barang.id, item.barang_id))
      )
    }

    await query.exec(db.update(stok_opname)
      .set({
        status: 'approved',
        tanggal_selesai: tgl,
        diapprove_oleh: user.id,
        updated_at: isoNow(),
      })
      .where(eq(stok_opname.id, id))
      )
  })

  const totalSelisih = items.filter((i) => i.selisih !== 0).length
  return c.json({ success: true, data: { total_penyesuaian: totalSelisih } })
})

// ── DELETE /stok-opname/:id — batalkan opname (hanya draft/proses) ────────

stokOpnameRouter.delete('/:id', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const op = await query.find(db.select().from(stok_opname).where(and(
    eq(stok_opname.id, id),
    eq(stok_opname.tenant_id, tenantId),
  )))
  if (!op) throw new HTTPException(404, { message: 'Opname tidak ditemukan' })
  if (op.status === 'approved') throw new HTTPException(400, { message: 'Opname approved tidak bisa dibatalkan' })

  await withTransaction(async (tx) => {
    await query.exec(db.delete(stok_opname_detail).where(eq(stok_opname_detail.opname_id, id)))
    await query.exec(db.delete(stok_opname).where(eq(stok_opname.id, id)))
  })

  return c.json({ success: true, data: null })
})
