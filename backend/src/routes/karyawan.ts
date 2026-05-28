import { Hono } from 'hono'
import { eq, like, and, gte, lte, ne, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.ts'
import { karyawan, shift_kasir, penjualan, absensi } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import type { JWTPayload } from './auth.ts'
import { Jimp, JimpMime } from 'jimp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const karyawanRouter = new Hono<{ Variables: { user: JWTPayload } }>()

karyawanRouter.use('*', authMiddleware)

karyawanRouter.get('/', requirePermission('karyawan.lihat'), async (c) => {
  const q = c.req.query('q')
  const aktif = c.req.query('aktif') !== '0'

  const rows = db
    .select({
      id: karyawan.id,
      kode_karyawan: karyawan.kode_karyawan,
      nama: karyawan.nama,
      role: karyawan.role,
      username: karyawan.username,
      gaji_pokok: karyawan.gaji_pokok,
      tipe_gaji: karyawan.tipe_gaji,
      kontak: karyawan.kontak,
      foto_path: karyawan.foto_path,
      is_active: karyawan.is_active,
      created_at: karyawan.created_at,
    })
    .from(karyawan)
    .where(
      and(
        aktif ? eq(karyawan.is_active, true) : undefined,
        q ? like(karyawan.nama, `%${q}%`) : undefined,
      )
    )
    .all()

  return c.json({ success: true, data: rows })
})

// ── GET /karyawan/performa — ringkasan performa semua kasir bulan ini ────────
// Route statis HARUS sebelum /:id

karyawanRouter.get('/performa', requirePermission('karyawan.lihat'), async (c) => {
  const sekarang = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' })
  const bulan = c.req.query('bulan') ?? sekarang.slice(0, 7)
  const dari = `${bulan}-01`
  const sampai = `${bulan}-31`

  const kasirList = db
    .select({ id: karyawan.id, nama: karyawan.nama })
    .from(karyawan)
    .where(and(eq(karyawan.is_active, true), eq(karyawan.role, 'kasir')))
    .all()

  const shiftRows = db
    .select({
      karyawan_id: shift_kasir.karyawan_id,
      total_shift: sql<number>`COUNT(*)`,
      shift_ditutup: sql<number>`SUM(CASE WHEN ${shift_kasir.status} = 'tutup' THEN 1 ELSE 0 END)`,
      total_transaksi: sql<number>`COALESCE(SUM(${shift_kasir.jumlah_transaksi}), 0)`,
      total_penjualan: sql<number>`COALESCE(SUM(${shift_kasir.total_penjualan}), 0)`,
      avg_selisih_kas: sql<number>`AVG(${shift_kasir.selisih_kas})`,
      avg_durasi_menit: sql<number>`AVG(CASE WHEN ${shift_kasir.jam_tutup} IS NOT NULL THEN
        (strftime('%s', ${shift_kasir.tanggal} || ' ' || ${shift_kasir.jam_tutup}) -
         strftime('%s', ${shift_kasir.tanggal} || ' ' || ${shift_kasir.jam_buka})) / 60
        ELSE NULL END)`,
    })
    .from(shift_kasir)
    .where(and(gte(shift_kasir.tanggal, dari), lte(shift_kasir.tanggal, sampai)))
    .groupBy(shift_kasir.karyawan_id)
    .all()

  const voidRows = db
    .select({
      kasir_id: penjualan.kasir_id,
      total_void: sql<number>`COUNT(*)`,
    })
    .from(penjualan)
    .where(and(
      eq(penjualan.status, 'void'),
      gte(penjualan.tanggal, dari),
      lte(penjualan.tanggal, sampai + ' 23:59:59'),
    ))
    .groupBy(penjualan.kasir_id)
    .all()

  const absensiRows = db
    .select({
      karyawan_id: absensi.karyawan_id,
      hadir: sql<number>`SUM(CASE WHEN ${absensi.status} = 'hadir' THEN 1 ELSE 0 END)`,
      alpa: sql<number>`SUM(CASE WHEN ${absensi.status} = 'alpa' THEN 1 ELSE 0 END)`,
    })
    .from(absensi)
    .where(and(gte(absensi.tanggal, dari), lte(absensi.tanggal, sampai)))
    .groupBy(absensi.karyawan_id)
    .all()

  const shiftMap = new Map(shiftRows.map(r => [r.karyawan_id, r]))
  const voidMap = new Map(voidRows.map(r => [r.kasir_id, r.total_void]))
  const absensiMap = new Map(absensiRows.map(r => [r.karyawan_id, r]))

  const hasil = kasirList.map(k => {
    const s = shiftMap.get(k.id)
    const voidCount = voidMap.get(k.id) ?? 0
    const ab = absensiMap.get(k.id)

    const totalTrx = s?.total_transaksi ?? 0
    const totalPenjualan = s?.total_penjualan ?? 0
    const totalShift = s?.total_shift ?? 0
    const avgDurasi = s?.avg_durasi_menit ?? 0

    const rata_per_trx = totalTrx > 0 ? Math.round(totalPenjualan / totalTrx) : 0
    const trx_per_jam = avgDurasi > 0 && totalShift > 0
      ? Math.round(((totalTrx / totalShift) / (avgDurasi / 60)) * 10) / 10
      : 0
    const void_rate_pct = totalTrx + voidCount > 0
      ? Math.round((voidCount / (totalTrx + voidCount)) * 1000) / 10
      : 0

    return {
      id: k.id,
      nama: k.nama,
      total_shift: totalShift,
      shift_ditutup: s?.shift_ditutup ?? 0,
      total_transaksi: totalTrx,
      total_penjualan: totalPenjualan,
      avg_penjualan_per_shift: totalShift > 0 ? Math.round(totalPenjualan / totalShift) : 0,
      avg_transaksi_per_shift: totalShift > 0 ? Math.round((totalTrx / totalShift) * 10) / 10 : 0,
      rata_per_trx,
      trx_per_jam,
      avg_durasi_menit: Math.round(avgDurasi),
      total_void: voidCount,
      void_rate_pct,
      avg_selisih_kas: Math.round(s?.avg_selisih_kas ?? 0),
      absensi: { hadir: ab?.hadir ?? 0, alpa: ab?.alpa ?? 0 },
    }
  })

  return c.json({ success: true, data: { bulan, hasil } })
})

// ── GET /karyawan/:id/performa — detail per-shift satu karyawan ──────────────

karyawanRouter.get('/:id/performa', requirePermission('karyawan.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const sekarang = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' })
  const bulan = c.req.query('bulan') ?? sekarang.slice(0, 7)
  const dari = `${bulan}-01`
  const sampai = `${bulan}-31`

  const k = db.select({ id: karyawan.id, nama: karyawan.nama, role: karyawan.role })
    .from(karyawan).where(eq(karyawan.id, id)).get()
  if (!k) throw new HTTPException(404, { message: 'Karyawan tidak ditemukan' })

  const shifts = db
    .select()
    .from(shift_kasir)
    .where(and(
      eq(shift_kasir.karyawan_id, id),
      gte(shift_kasir.tanggal, dari),
      lte(shift_kasir.tanggal, sampai),
    ))
    .orderBy(shift_kasir.tanggal)
    .all()

  const perShift = shifts.map(s => {
    let durasi_menit = 0
    if (s.jam_tutup) {
      const bParts = s.jam_buka.split(':').map(Number)
      const tParts = s.jam_tutup.split(':').map(Number)
      const bMin = (bParts[0] ?? 0) * 60 + (bParts[1] ?? 0)
      const tMin = (tParts[0] ?? 0) * 60 + (tParts[1] ?? 0)
      durasi_menit = tMin - bMin
      if (durasi_menit < 0) durasi_menit += 24 * 60
    }
    const trx_per_jam = durasi_menit > 0 && s.jumlah_transaksi > 0
      ? Math.round((s.jumlah_transaksi / (durasi_menit / 60)) * 10) / 10
      : null
    return {
      id: s.id,
      tanggal: s.tanggal,
      jam_buka: s.jam_buka,
      jam_tutup: s.jam_tutup,
      durasi_menit,
      jumlah_transaksi: s.jumlah_transaksi,
      total_penjualan: s.total_penjualan,
      trx_per_jam,
      rata_per_trx: s.jumlah_transaksi > 0 ? Math.round(s.total_penjualan / s.jumlah_transaksi) : 0,
      selisih_kas: s.selisih_kas,
      status: s.status,
    }
  })

  const voidRow = db.select({ total: sql<number>`COUNT(*)` })
    .from(penjualan)
    .where(and(
      eq(penjualan.kasir_id, id),
      eq(penjualan.status, 'void'),
      gte(penjualan.tanggal, dari),
      lte(penjualan.tanggal, sampai + ' 23:59:59'),
    ))
    .get()

  const absensiData = db.select()
    .from(absensi)
    .where(and(eq(absensi.karyawan_id, id), gte(absensi.tanggal, dari), lte(absensi.tanggal, sampai)))
    .all()

  const totalTrx = perShift.reduce((s, r) => s + r.jumlah_transaksi, 0)
  const totalPenjualan = perShift.reduce((s, r) => s + r.total_penjualan, 0)
  const selesai = perShift.filter(s => s.status === 'tutup')
  const avgDurasi = selesai.length > 0
    ? selesai.reduce((s, r) => s + r.durasi_menit, 0) / selesai.length : 0
  const totalVoid = voidRow?.total ?? 0

  return c.json({
    success: true,
    data: {
      karyawan: k,
      bulan,
      ringkasan: {
        total_shift: perShift.length,
        shift_ditutup: selesai.length,
        total_transaksi: totalTrx,
        total_penjualan: totalPenjualan,
        avg_penjualan_per_shift: perShift.length > 0 ? Math.round(totalPenjualan / perShift.length) : 0,
        avg_transaksi_per_shift: perShift.length > 0 ? Math.round((totalTrx / perShift.length) * 10) / 10 : 0,
        rata_per_trx: totalTrx > 0 ? Math.round(totalPenjualan / totalTrx) : 0,
        avg_durasi_menit: Math.round(avgDurasi),
        total_void: totalVoid,
        void_rate_pct: totalTrx + totalVoid > 0 ? Math.round((totalVoid / (totalTrx + totalVoid)) * 1000) / 10 : 0,
      },
      per_shift: perShift,
      absensi: {
        hadir: absensiData.filter(a => a.status === 'hadir').length,
        izin: absensiData.filter(a => a.status === 'izin').length,
        sakit: absensiData.filter(a => a.status === 'sakit').length,
        alpa: absensiData.filter(a => a.status === 'alpa').length,
      },
    },
  })
})

karyawanRouter.get('/:id', requirePermission('karyawan.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const row = db
    .select({
      id: karyawan.id,
      kode_karyawan: karyawan.kode_karyawan,
      nama: karyawan.nama,
      role: karyawan.role,
      username: karyawan.username,
      gaji_pokok: karyawan.gaji_pokok,
      tipe_gaji: karyawan.tipe_gaji,
      kontak: karyawan.kontak,
      foto_path: karyawan.foto_path,
      is_active: karyawan.is_active,
    })
    .from(karyawan)
    .where(eq(karyawan.id, id))
    .get()

  if (!row) throw new HTTPException(404, { message: 'Karyawan tidak ditemukan' })
  return c.json({ success: true, data: row })
})

karyawanRouter.post('/', requirePermission('karyawan.edit'), async (c) => {
  const body = await c.req.json<{
    kode_karyawan: string
    nama: string
    role: 'pemilik' | 'manajer' | 'kasir' | 'gudang'
    username: string
    password: string
    gaji_pokok?: number
    tipe_gaji?: 'harian' | 'bulanan'
    kontak?: string
  }>()

  if (!body.kode_karyawan?.trim() || !body.nama?.trim() || !body.username?.trim() || !body.password) {
    throw new HTTPException(400, { message: 'Kode, nama, username, dan password wajib diisi' })
  }

  const hash = await Bun.password.hash(body.password)

  let row
  try {
    row = db.insert(karyawan).values({
      kode_karyawan: body.kode_karyawan.trim(),
      nama: body.nama.trim(),
      role: body.role,
      username: body.username.trim(),
      password_hash: hash,
      gaji_pokok: body.gaji_pokok ?? 0,
      tipe_gaji: body.tipe_gaji ?? 'bulanan',
      kontak: body.kontak,
    }).returning({
      id: karyawan.id,
      kode_karyawan: karyawan.kode_karyawan,
      nama: karyawan.nama,
      role: karyawan.role,
      username: karyawan.username,
    }).get()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('UNIQUE constraint failed: karyawan.kode_karyawan')) {
      throw new HTTPException(409, { message: 'Kode karyawan sudah digunakan' })
    }
    if (msg.includes('UNIQUE constraint failed: karyawan.username')) {
      throw new HTTPException(409, { message: 'Username sudah digunakan' })
    }
    throw e
  }

  return c.json({ success: true, data: row }, 201)
})

karyawanRouter.put('/:id', requirePermission('karyawan.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{
    nama?: string
    role?: 'pemilik' | 'manajer' | 'kasir' | 'gudang'
    username?: string
    password?: string
    gaji_pokok?: number
    tipe_gaji?: 'harian' | 'bulanan'
    kontak?: string
  }>()

  const existing = db.select().from(karyawan).where(eq(karyawan.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Karyawan tidak ditemukan' })

  const updates: Partial<typeof karyawan.$inferInsert> = {
    ...body,
    updated_at: sql`(datetime('now','localtime'))` as unknown as string,
  }

  if (body.password) {
    updates.password_hash = await Bun.password.hash(body.password)
    delete (updates as Record<string, unknown>).password
  }

  let row
  try {
    row = db.update(karyawan).set(updates).where(eq(karyawan.id, id)).returning({
      id: karyawan.id,
      kode_karyawan: karyawan.kode_karyawan,
      nama: karyawan.nama,
      role: karyawan.role,
      username: karyawan.username,
    }).get()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('UNIQUE constraint failed: karyawan.kode_karyawan')) {
      throw new HTTPException(409, { message: 'Kode karyawan sudah digunakan' })
    }
    if (msg.includes('UNIQUE constraint failed: karyawan.username')) {
      throw new HTTPException(409, { message: 'Username sudah digunakan' })
    }
    throw e
  }

  return c.json({ success: true, data: row })
})

karyawanRouter.post('/:id/foto', requirePermission('karyawan.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = db.select().from(karyawan).where(eq(karyawan.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Karyawan tidak ditemukan' })

  const formData = await c.req.formData()
  const file = formData.get('foto') as File | null
  if (!file || !file.size) throw new HTTPException(400, { message: 'File foto wajib diisi' })
  if (!file.type.startsWith('image/')) throw new HTTPException(400, { message: 'File harus berupa gambar' })

  const uploadDir = process.env.UPLOAD_DIR ?? join(import.meta.dir, '../../uploads')
  const karyawanDir = join(uploadDir, 'karyawan')
  mkdirSync(karyawanDir, { recursive: true })

  const filename = `${id}_${Date.now()}.jpg`
  const buf = Buffer.from(await file.arrayBuffer())

  let fotoPath: string
  try {
    const imgMed = await Jimp.fromBuffer(buf)
    imgMed.cover({ w: 300, h: 300 })
    writeFileSync(join(karyawanDir, `med_${filename}`), await imgMed.getBuffer(JimpMime.jpeg, { quality: 85 }))

    const imgThumb = await Jimp.fromBuffer(buf)
    imgThumb.cover({ w: 60, h: 60 })
    writeFileSync(join(karyawanDir, `thumb_${filename}`), await imgThumb.getBuffer(JimpMime.jpeg, { quality: 80 }))

    fotoPath = `karyawan/med_${filename}`
  } catch {
    throw new HTTPException(422, { message: 'Gagal memproses gambar. Pastikan file gambar valid.' })
  }

  db.update(karyawan)
    .set({ foto_path: fotoPath, updated_at: sql`(datetime('now','localtime'))` })
    .where(eq(karyawan.id, id))
    .run()

  return c.json({ success: true, data: { foto_path: fotoPath } })
})

karyawanRouter.delete('/:id', requirePermission('karyawan.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const user = c.get('user') as JWTPayload

  if (user.id === id) throw new HTTPException(400, { message: 'Tidak bisa menonaktifkan diri sendiri' })

  const existing = db.select().from(karyawan).where(eq(karyawan.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Karyawan tidak ditemukan' })

  db.update(karyawan)
    .set({ is_active: false, updated_at: sql`(datetime('now','localtime'))` })
    .where(eq(karyawan.id, id))
    .run()

  return c.json({ success: true, data: null })
})
