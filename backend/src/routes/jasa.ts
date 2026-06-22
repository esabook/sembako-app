import { Hono } from 'hono'
import { eq, and, gte, lte, inArray, desc } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, isoNow } from '../db/index.ts'
import {
  booking, jadwal_staf, paket_membership, kredit_membership, komisi_staf,
  detail_layanan, barang, karyawan, pelanggan,
  penjualan, penjualan_detail, jurnal_kas, kas_bank,
} from '../db/schema.ts'
import { withTransaction } from '../db/index.ts'
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
  // hanya yg sudah dikonfigurasi & dapat dibooking? param opsional
  const bookableOnly = c.req.query('dapat_dibooking') === '1'

  const rows = await query.findAll<{ id: number; nama_barang: string; harga_jual: number; diatur: number | null; durasi_menit: number | null; buffer_menit: number | null; dapat_dibooking: boolean | null; komisi_persen: number | null; komisi_nominal: number | null }>(db
    .select({
      id: barang.id,
      nama_barang: barang.nama_barang,
      harga_jual: barang.harga_jual_eceran,
      diatur: detail_layanan.id,
      durasi_menit: detail_layanan.durasi_menit,
      buffer_menit: detail_layanan.buffer_menit,
      dapat_dibooking: detail_layanan.dapat_dibooking,
      komisi_persen: detail_layanan.komisi_persen,
      komisi_nominal: detail_layanan.komisi_nominal,
    })
    .from(barang)
    .leftJoin(detail_layanan, and(
      eq(detail_layanan.barang_id, barang.id),
      eq(detail_layanan.tenant_id, tenantId),
    ))
    .where(
      and(
        eq(barang.tenant_id, tenantId),
        eq(barang.tipe_produk, 'service'),
        eq(barang.is_active, true),
      )
    )
    .orderBy(barang.nama_barang)
  )

  // Coalesce default utk layanan yg belum diatur; flag `diatur` jadi boolean
  const data = rows
    .map((r) => ({
      id: r.id,
      nama_barang: r.nama_barang,
      harga_jual: r.harga_jual,
      diatur: r.diatur != null,
      durasi_menit: r.durasi_menit ?? 30,
      buffer_menit: r.buffer_menit ?? 0,
      dapat_dibooking: r.dapat_dibooking ?? true,
      komisi_persen: r.komisi_persen ?? 0,
      komisi_nominal: r.komisi_nominal ?? 0,
    }))
    .filter((r) => (bookableOnly ? r.dapat_dibooking : true))

  return c.json({ success: true, data })
})

// ── PUT /jasa/layanan/:barang_id (upsert detail_layanan) ──────────────────────

jasaRouter.put('/layanan/:barang_id', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const barangId = Number(c.req.param('barang_id'))
  const body = await c.req.json<{
    durasi_menit?: number
    buffer_menit?: number
    dapat_dibooking?: boolean
    komisi_persen?: number
    komisi_nominal?: number
  }>()

  // Pastikan barang ini milik tenant & tipe service
  const brg = await query.find<{ id: number; tipe: 'physical_good' | 'menu_item' | 'service' }>(db.select({ id: barang.id, tipe: barang.tipe_produk })
    .from(barang).where(and(eq(barang.id, barangId), eq(barang.tenant_id, tenantId))))
  if (!brg) throw new HTTPException(404, { message: 'Layanan tidak ditemukan' })
  if (brg.tipe !== 'service') throw new HTTPException(400, { message: 'Barang ini bukan tipe layanan' })

  const nilai = {
    durasi_menit: body.durasi_menit ?? 30,
    buffer_menit: body.buffer_menit ?? 0,
    dapat_dibooking: body.dapat_dibooking ?? true,
    komisi_persen: body.komisi_persen ?? 0,
    komisi_nominal: body.komisi_nominal ?? 0,
  }

  const existing = await query.find<{ id: number }>(db.select({ id: detail_layanan.id })
    .from(detail_layanan).where(and(eq(detail_layanan.barang_id, barangId), eq(detail_layanan.tenant_id, tenantId))))

  if (existing) {
    await db.update(detail_layanan).set(nilai).where(eq(detail_layanan.id, existing.id))
  } else {
    await db.insert(detail_layanan).values({ barang_id: barangId, tenant_id: tenantId, ...nilai })
  }

  return c.json({ success: true })
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

  return c.json({ success: true, data: { id: row!.id } }, 201)
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

// ── POST /jasa/booking/:id/checkout (selesai → buat penjualan + komisi) ────────

jasaRouter.post('/booking/:id/checkout', requirePermission('penjualan.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ metode_bayar?: 'tunai' | 'transfer' | 'qris'; pakai_kuota?: boolean; kas_bank_id?: number }>()
    .catch(() => ({} as { metode_bayar?: 'tunai' | 'transfer' | 'qris'; pakai_kuota?: boolean; kas_bank_id?: number }))

  const bk = await query.find<typeof booking.$inferSelect>(db.select().from(booking).where(and(eq(booking.id, id), eq(booking.tenant_id, tenantId))))
  if (!bk) throw new HTTPException(404, { message: 'Booking tidak ditemukan' })
  if (bk.penjualan_id) throw new HTTPException(400, { message: 'Booking ini sudah dibayar' })

  const brg = await query.find<{ nama: string; harga: number }>(db.select({ nama: barang.nama_barang, harga: barang.harga_jual_eceran })
    .from(barang).where(eq(barang.id, bk.barang_id)))
  if (!brg) throw new HTTPException(400, { message: 'Layanan tidak ditemukan' })

  const dl = await query.find<{ komisi_persen: number; komisi_nominal: number }>(db.select({ komisi_persen: detail_layanan.komisi_persen, komisi_nominal: detail_layanan.komisi_nominal })
    .from(detail_layanan).where(and(eq(detail_layanan.barang_id, bk.barang_id), eq(detail_layanan.tenant_id, tenantId))))

  // Pakai kuota membership? cari kredit aktif (dari booking.kredit_id atau kredit aktif pelanggan utk paket layanan ini)
  let kreditDipakai: { id: number; sisa_kuota: number } | null = null
  if (body.pakai_kuota) {
    if (bk.kredit_id) {
      kreditDipakai = await query.find<{ id: number; sisa_kuota: number }>(db.select({ id: kredit_membership.id, sisa_kuota: kredit_membership.sisa_kuota })
        .from(kredit_membership).where(and(eq(kredit_membership.id, bk.kredit_id), eq(kredit_membership.tenant_id, tenantId)))) ?? null
    } else if (bk.pelanggan_id) {
      kreditDipakai = await query.find<{ id: number; sisa_kuota: number }>(db.select({ id: kredit_membership.id, sisa_kuota: kredit_membership.sisa_kuota })
        .from(kredit_membership)
        .innerJoin(paket_membership, eq(paket_membership.id, kredit_membership.paket_id))
        .where(and(
          eq(kredit_membership.pelanggan_id, bk.pelanggan_id),
          eq(kredit_membership.tenant_id, tenantId),
          eq(kredit_membership.status, 'aktif'),
        ))) ?? null
    }
    if (!kreditDipakai || kreditDipakai.sisa_kuota <= 0) {
      throw new HTTPException(400, { message: 'Kuota membership tidak tersedia' })
    }
  }

  const pakaiKuota = !!kreditDipakai
  const total = pakaiKuota ? 0 : brg.harga
  const metode = body.metode_bayar ?? 'tunai'
  const tgl = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 19)
  const noTrx = `TRX-${tgl.slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 90000 + 10000)}`

  const result = await withTransaction(async () => {
    const trx = await query.ret<typeof penjualan.$inferSelect>(db.insert(penjualan).values({
      no_transaksi: noTrx,
      pelanggan_id: bk.pelanggan_id ?? undefined,
      tanggal: tgl,
      tipe: 'eceran',
      tipe_layanan: 'jasa',
      kasir_id: user.id,
      subtotal: total,
      diskon_total: 0,
      total,
      metode_bayar: metode,
      bayar: total,
      kembalian: 0,
      status: 'lunas',
      tenant_id: tenantId,
      cabang_id: cabangId,
    }).returning())

    const det = await query.ret<typeof penjualan_detail.$inferSelect>(db.insert(penjualan_detail).values({
      penjualan_id: trx!.id!,
      barang_id: bk.barang_id,
      jumlah: 1,
      harga_jual: total,
      diskon_item: 0,
      subtotal: total,
      dilayani_oleh: bk.karyawan_id ?? null,
      booking_id: bk.id,
      tenant_id: tenantId,
      cabang_id: cabangId,
    }).returning())

    // Komisi staf (dihitung dari harga normal layanan, bukan total setelah kuota)
    if (bk.karyawan_id) {
      const bruto = brg.harga
      const nilaiKomisi = dl && dl.komisi_nominal > 0
        ? dl.komisi_nominal
        : Math.round(bruto * ((dl?.komisi_persen ?? 0) / 100))
      if (nilaiKomisi > 0) {
        await query.exec(db.insert(komisi_staf).values({
          karyawan_id: bk.karyawan_id,
          penjualan_id: trx!.id!,
          penjualan_detail_id: det!.id!,
          barang_id: bk.barang_id,
          nilai_komisi: nilaiKomisi,
          persen: dl?.komisi_persen ?? 0,
          tanggal: tgl.slice(0, 10),
          status: 'pending',
          tenant_id: tenantId,
        }))
      }
    }

    // Potong kuota atau catat kas
    if (pakaiKuota && kreditDipakai) {
      const sisa = kreditDipakai.sisa_kuota - 1
      await query.exec(db.update(kredit_membership)
        .set({ sisa_kuota: sisa, status: sisa <= 0 ? 'habis' : 'aktif', updated_at: isoNow() })
        .where(eq(kredit_membership.id, kreditDipakai.id)))
    } else if (total > 0) {
      const kas = body.kas_bank_id
        ? await query.find<typeof kas_bank.$inferSelect>(db.select().from(kas_bank).where(and(eq(kas_bank.id, body.kas_bank_id), eq(kas_bank.tenant_id, tenantId), eq(kas_bank.cabang_id, cabangId))))
        : await query.find<typeof kas_bank.$inferSelect>(db.select().from(kas_bank).where(and(eq(kas_bank.tipe, 'kas'), eq(kas_bank.tenant_id, tenantId), eq(kas_bank.cabang_id, cabangId))))
      if (kas) {
        await query.exec(db.insert(jurnal_kas).values({
          tanggal: tgl, kas_bank_id: kas.id!, jenis: 'masuk', kategori: 'penjualan',
          referensi_tipe: 'penjualan', referensi_id: trx!.id!, keterangan: `Jasa ${noTrx}`,
          jumlah: total, dicatat_oleh: user.id, tenant_id: tenantId, cabang_id: cabangId,
        }))
      }
    }

    await query.exec(db.update(booking)
      .set({ penjualan_id: trx!.id!, kredit_id: kreditDipakai?.id ?? bk.kredit_id ?? null, status: 'selesai', updated_at: isoNow() })
      .where(eq(booking.id, id)))

    return trx
  })

  return c.json({ success: true, data: { penjualan_id: result.id, no_transaksi: noTrx, total } }, 201)
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

  return c.json({ success: true, data: { id: row!.id } }, 201)
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

// ── POST /jasa/paket-membership ───────────────────────────────────────────────

jasaRouter.post('/paket-membership', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const body = await c.req.json<{
    kode_paket?: string
    nama: string
    barang_id?: number | null
    jumlah_sesi: number
    harga?: number
    masa_berlaku_hari?: number
  }>()

  if (!body.nama?.trim()) throw new HTTPException(400, { message: 'Nama paket wajib diisi' })
  if (!body.jumlah_sesi || body.jumlah_sesi < 1) throw new HTTPException(400, { message: 'Jumlah sesi minimal 1' })

  const kode = body.kode_paket?.trim() || `PKT-${Date.now().toString().slice(-6)}`
  const [row] = await db.insert(paket_membership).values({
    kode_paket: kode,
    nama: body.nama.trim(),
    barang_id: body.barang_id ?? null,
    jumlah_sesi: body.jumlah_sesi,
    harga: body.harga ?? 0,
    masa_berlaku_hari: body.masa_berlaku_hari ?? 0,
    created_by: user.id,
    tenant_id: tenantId,
  }).returning({ id: paket_membership.id })

  return c.json({ success: true, data: { id: row!.id } }, 201)
})

// ── PUT /jasa/paket-membership/:id ────────────────────────────────────────────

jasaRouter.put('/paket-membership/:id', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<{
    nama: string; barang_id: number | null; jumlah_sesi: number; harga: number; masa_berlaku_hari: number; is_active: boolean
  }>>()

  const set: Record<string, unknown> = { updated_at: isoNow() }
  if (body.nama !== undefined) set.nama = body.nama.trim()
  if (body.barang_id !== undefined) set.barang_id = body.barang_id
  if (body.jumlah_sesi !== undefined) set.jumlah_sesi = body.jumlah_sesi
  if (body.harga !== undefined) set.harga = body.harga
  if (body.masa_berlaku_hari !== undefined) set.masa_berlaku_hari = body.masa_berlaku_hari
  if (body.is_active !== undefined) set.is_active = body.is_active

  await db.update(paket_membership).set(set).where(and(eq(paket_membership.id, id), eq(paket_membership.tenant_id, tenantId)))
  return c.json({ success: true })
})

// ── POST /jasa/kredit-membership (jual paket ke pelanggan) ────────────────────

jasaRouter.post('/kredit-membership', requirePermission('penjualan.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const body = await c.req.json<{ pelanggan_id: number; paket_id: number; penjualan_id?: number | null }>()

  if (!body.pelanggan_id || !body.paket_id) {
    throw new HTTPException(400, { message: 'pelanggan_id dan paket_id wajib diisi' })
  }

  const paket = await query.find<{ jumlah_sesi: number; masa_berlaku_hari: number }>(db.select({
    jumlah_sesi: paket_membership.jumlah_sesi,
    masa_berlaku_hari: paket_membership.masa_berlaku_hari,
  }).from(paket_membership).where(and(eq(paket_membership.id, body.paket_id), eq(paket_membership.tenant_id, tenantId))))
  if (!paket) throw new HTTPException(404, { message: 'Paket tidak ditemukan' })

  const now = new Date()
  const tanggalMulai = now.toISOString().slice(0, 10)
  const tanggalExpired = paket.masa_berlaku_hari > 0
    ? new Date(now.getTime() + paket.masa_berlaku_hari * 86_400_000).toISOString().slice(0, 10)
    : null

  const [row] = await db.insert(kredit_membership).values({
    pelanggan_id: body.pelanggan_id,
    paket_id: body.paket_id,
    sisa_kuota: paket.jumlah_sesi,
    tanggal_mulai: tanggalMulai,
    tanggal_expired: tanggalExpired,
    penjualan_id: body.penjualan_id ?? null,
    status: 'aktif',
    tenant_id: tenantId,
  }).returning({ id: kredit_membership.id })

  return c.json({ success: true, data: { id: row!.id } }, 201)
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
