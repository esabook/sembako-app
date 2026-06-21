import { Hono } from 'hono'
import { eq, and, gte, lte, inArray, desc } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, isoNow } from '../db/index.ts'
import {
  booking, jadwal_staf, paket_membership, kredit_membership, komisi_staf,
  detail_layanan, barang, karyawan, pelanggan,
} from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import type { JWTPayload } from './auth.ts'

export const jasaRouter = new Hono<{ Variables: { user: JWTPayload } }>()

jasaRouter.use('*', authMiddleware)
jasaRouter.use('*', tenantMiddleware)

function noBooking(): string {
  const d = new Date()
  const tgl = d.toISOString().slice(0, 10).replace(/-/g, '')
  const rnd = Math.floor(Math.random() * 9000 + 1000)
  return `BK-${tgl}-${rnd}`
}

// ── GET /jasa/layanan ─────────────────────────────────────────────────────────

jasaRouter.get('/layanan', requirePermission('penjualan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1

  const rows = await query.findAll(db
    .select({
      id: barang.id,
      nama_barang: barang.nama_barang,
      harga_jual: barang.harga_jual,
      durasi_menit: detail_layanan.durasi_menit,
      buffer_menit: detail_layanan.buffer_menit,
      dapat_dibooking: detail_layanan.dapat_dibooking,
      komisi_persen: detail_layanan.komisi_persen,
      komisi_nominal: detail_layanan.komisi_nominal,
    })
    .from(barang)
    .innerJoin(detail_layanan, eq(detail_layanan.barang_id, barang.id))
    .where(
      and(
        eq(barang.tenant_id, tenantId),
        eq(barang.tipe_produk, 'service'),
        eq(barang.is_active, true),
      )
    )
    .orderBy(barang.nama_barang)
  )

  return c.json({ success: true, data: rows })
})

// ── GET /jasa/booking ─────────────────────────────────────────────────────────

jasaRouter.get('/booking', requirePermission('penjualan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? null
  const dari = c.req.query('dari')
  const sampai = c.req.query('sampai')
  const statusQ = c.req.query('status')

  const rows = await query.findAll(db
    .select({
      id: booking.id,
      no_booking: booking.no_booking,
      pelanggan_id: booking.pelanggan_id,
      pelanggan_nama: pelanggan.nama,
      karyawan_id: booking.karyawan_id,
      karyawan_nama: karyawan.nama,
      barang_id: booking.barang_id,
      layanan_nama: barang.nama_barang,
      waktu_mulai: booking.waktu_mulai,
      waktu_selesai: booking.waktu_selesai,
      status: booking.status,
      penjualan_id: booking.penjualan_id,
      kredit_id: booking.kredit_id,
      catatan: booking.catatan,
      created_at: booking.created_at,
    })
    .from(booking)
    .leftJoin(pelanggan, eq(pelanggan.id, booking.pelanggan_id))
    .leftJoin(karyawan, eq(karyawan.id, booking.karyawan_id))
    .innerJoin(barang, eq(barang.id, booking.barang_id))
    .where(
      and(
        eq(booking.tenant_id, tenantId),
        cabangId ? eq(booking.cabang_id, cabangId) : undefined,
        dari ? gte(booking.waktu_mulai, dari) : undefined,
        sampai ? lte(booking.waktu_mulai, sampai + 'T23:59:59') : undefined,
        statusQ ? eq(booking.status, statusQ as 'booked' | 'confirmed' | 'in_progress' | 'selesai' | 'batal' | 'no_show') : undefined,
      )
    )
    .orderBy(desc(booking.waktu_mulai))
  )

  return c.json({ success: true, data: rows })
})

// ── POST /jasa/booking ────────────────────────────────────────────────────────

jasaRouter.post('/booking', requirePermission('penjualan.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? 1
  const body = await c.req.json<{
    pelanggan_id?: number | null
    karyawan_id?: number | null
    barang_id: number
    waktu_mulai: string
    kredit_id?: number | null
    catatan?: string | null
  }>()

  if (!body.barang_id || !body.waktu_mulai) {
    throw new HTTPException(400, { message: 'barang_id dan waktu_mulai wajib diisi' })
  }

  const now = isoNow()
  const [row] = await db.insert(booking).values({
    no_booking: noBooking(),
    pelanggan_id: body.pelanggan_id ?? null,
    karyawan_id: body.karyawan_id ?? null,
    barang_id: body.barang_id,
    waktu_mulai: body.waktu_mulai,
    kredit_id: body.kredit_id ?? null,
    catatan: body.catatan ?? null,
    status: 'booked',
    created_by: user.id,
    tenant_id: tenantId,
    cabang_id: cabangId,
    created_at: now,
    updated_at: now,
  }).returning({ id: booking.id })

  return c.json({ success: true, data: { id: row.id } }, 201)
})

// ── PUT /jasa/booking/:id ─────────────────────────────────────────────────────

jasaRouter.put('/booking/:id', requirePermission('penjualan.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<{
    pelanggan_id: number | null
    karyawan_id: number | null
    barang_id: number
    waktu_mulai: string
    waktu_selesai: string | null
    status: 'booked' | 'confirmed' | 'in_progress' | 'selesai' | 'batal' | 'no_show'
    kredit_id: number | null
    catatan: string | null
  }>>()

  await db
    .update(booking)
    .set({ ...body, updated_at: isoNow() })
    .where(and(eq(booking.id, id), eq(booking.tenant_id, tenantId)))

  return c.json({ success: true })
})

// ── DELETE /jasa/booking/:id ──────────────────────────────────────────────────

jasaRouter.delete('/booking/:id', requirePermission('penjualan.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))

  await db.delete(booking).where(and(eq(booking.id, id), eq(booking.tenant_id, tenantId)))

  return c.json({ success: true })
})

// ── GET /jasa/jadwal-staf ─────────────────────────────────────────────────────

jasaRouter.get('/jadwal-staf', requirePermission('karyawan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? null

  const rows = await query.findAll(db
    .select({
      id: jadwal_staf.id,
      karyawan_id: jadwal_staf.karyawan_id,
      karyawan_nama: karyawan.nama,
      hari: jadwal_staf.hari,
      jam_mulai: jadwal_staf.jam_mulai,
      jam_selesai: jadwal_staf.jam_selesai,
      is_active: jadwal_staf.is_active,
    })
    .from(jadwal_staf)
    .innerJoin(karyawan, eq(karyawan.id, jadwal_staf.karyawan_id))
    .where(
      and(
        eq(jadwal_staf.tenant_id, tenantId),
        cabangId ? eq(jadwal_staf.cabang_id, cabangId) : undefined,
        eq(jadwal_staf.is_active, true),
      )
    )
    .orderBy(jadwal_staf.karyawan_id, jadwal_staf.hari, jadwal_staf.jam_mulai)
  )

  return c.json({ success: true, data: rows })
})

// ── POST /jasa/jadwal-staf ────────────────────────────────────────────────────

jasaRouter.post('/jadwal-staf', requirePermission('karyawan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? 1
  const body = await c.req.json<{
    karyawan_id: number
    hari: number
    jam_mulai: string
    jam_selesai: string
  }>()

  if (!body.karyawan_id || body.hari === undefined) {
    throw new HTTPException(400, { message: 'karyawan_id dan hari wajib diisi' })
  }

  const [row] = await db.insert(jadwal_staf).values({
    karyawan_id: body.karyawan_id,
    hari: body.hari,
    jam_mulai: body.jam_mulai,
    jam_selesai: body.jam_selesai,
    is_active: true,
    tenant_id: tenantId,
    cabang_id: cabangId,
  }).returning({ id: jadwal_staf.id })

  return c.json({ success: true, data: { id: row.id } }, 201)
})

// ── DELETE /jasa/jadwal-staf/:id ──────────────────────────────────────────────

jasaRouter.delete('/jadwal-staf/:id', requirePermission('karyawan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))

  await db.delete(jadwal_staf).where(and(eq(jadwal_staf.id, id), eq(jadwal_staf.tenant_id, tenantId)))

  return c.json({ success: true })
})

// ── GET /jasa/paket-membership ────────────────────────────────────────────────

jasaRouter.get('/paket-membership', requirePermission('penjualan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1

  const rows = await query.findAll(db
    .select({
      id: paket_membership.id,
      kode_paket: paket_membership.kode_paket,
      nama: paket_membership.nama,
      barang_id: paket_membership.barang_id,
      layanan_nama: barang.nama_barang,
      jumlah_sesi: paket_membership.jumlah_sesi,
      harga: paket_membership.harga,
      masa_berlaku_hari: paket_membership.masa_berlaku_hari,
      is_active: paket_membership.is_active,
    })
    .from(paket_membership)
    .leftJoin(barang, eq(barang.id, paket_membership.barang_id))
    .where(
      and(
        eq(paket_membership.tenant_id, tenantId),
        eq(paket_membership.is_active, true),
      )
    )
    .orderBy(paket_membership.nama)
  )

  return c.json({ success: true, data: rows })
})

// ── GET /jasa/kredit-membership ───────────────────────────────────────────────

jasaRouter.get('/kredit-membership', requirePermission('penjualan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const pelangganIdQ = c.req.query('pelanggan_id')

  const rows = await query.findAll(db
    .select({
      id: kredit_membership.id,
      pelanggan_id: kredit_membership.pelanggan_id,
      pelanggan_nama: pelanggan.nama,
      paket_id: kredit_membership.paket_id,
      paket_nama: paket_membership.nama,
      sisa_kuota: kredit_membership.sisa_kuota,
      tanggal_mulai: kredit_membership.tanggal_mulai,
      tanggal_expired: kredit_membership.tanggal_expired,
      status: kredit_membership.status,
    })
    .from(kredit_membership)
    .innerJoin(pelanggan, eq(pelanggan.id, kredit_membership.pelanggan_id))
    .innerJoin(paket_membership, eq(paket_membership.id, kredit_membership.paket_id))
    .where(
      and(
        eq(kredit_membership.tenant_id, tenantId),
        pelangganIdQ ? eq(kredit_membership.pelanggan_id, Number(pelangganIdQ)) : undefined,
      )
    )
    .orderBy(desc(kredit_membership.created_at))
  )

  return c.json({ success: true, data: rows })
})

// ── GET /jasa/komisi ──────────────────────────────────────────────────────────

jasaRouter.get('/komisi', requirePermission('penjualan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const dari = c.req.query('dari')
  const sampai = c.req.query('sampai')

  const rows = await query.findAll(db
    .select({
      id: komisi_staf.id,
      karyawan_id: komisi_staf.karyawan_id,
      karyawan_nama: karyawan.nama,
      barang_id: komisi_staf.barang_id,
      layanan_nama: barang.nama_barang,
      nilai_komisi: komisi_staf.nilai_komisi,
      persen: komisi_staf.persen,
      tanggal: komisi_staf.tanggal,
      status: komisi_staf.status,
    })
    .from(komisi_staf)
    .innerJoin(karyawan, eq(karyawan.id, komisi_staf.karyawan_id))
    .leftJoin(barang, eq(barang.id, komisi_staf.barang_id))
    .where(
      and(
        eq(komisi_staf.tenant_id, tenantId),
        dari ? gte(komisi_staf.tanggal, dari) : undefined,
        sampai ? lte(komisi_staf.tanggal, sampai) : undefined,
      )
    )
    .orderBy(desc(komisi_staf.tanggal))
  )

  return c.json({ success: true, data: rows })
})

// ── PUT /jasa/komisi/bayar ────────────────────────────────────────────────────

jasaRouter.put('/komisi/bayar', requirePermission('penjualan.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const body = await c.req.json<{ ids: number[] }>()

  if (!Array.isArray(body.ids) || !body.ids.length) {
    throw new HTTPException(400, { message: 'ids wajib diisi' })
  }

  await db
    .update(komisi_staf)
    .set({ status: 'dibayar', updated_at: isoNow() })
    .where(
      and(
        inArray(komisi_staf.id, body.ids),
        eq(komisi_staf.tenant_id, tenantId),
      )
    )

  return c.json({ success: true })
})
