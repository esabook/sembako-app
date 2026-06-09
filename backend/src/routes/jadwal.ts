import { Hono } from 'hono'
import { eq, and, gte, lte, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import { tipe_shift, jadwal_kerja, tukar_shift, karyawan } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import type { JWTPayload } from './auth.ts'

export const jadwalRouter = new Hono<{ Variables: { user: JWTPayload } }>()
jadwalRouter.use('*', authMiddleware)

// ── GET /jadwal/tipe — list tipe shift ───────────────────────────────────────

jadwalRouter.get('/tipe', requirePermission('karyawan.lihat'), async (c) => {
  const rows = await query.findAll(db.select().from(tipe_shift)
    .where(eq(tipe_shift.is_active, true))
    .orderBy(tipe_shift.jam_mulai)
  )
  return c.json({ success: true, data: rows })
})

// ── POST /jadwal/tipe — buat tipe shift ──────────────────────────────────────

jadwalRouter.post('/tipe', requirePermission('karyawan.edit'), async (c) => {
  const body = await c.req.json<{ nama: string; jam_mulai: string; jam_selesai: string; warna?: string }>()
  if (!body.nama || !body.jam_mulai || !body.jam_selesai)
    throw new HTTPException(400, { message: 'nama, jam_mulai, jam_selesai wajib' })

  const row = await query.ret(db.insert(tipe_shift).values({
    nama: body.nama,
    jam_mulai: body.jam_mulai,
    jam_selesai: body.jam_selesai,
    warna: body.warna ?? '#00e676',
  }).returning())
  return c.json({ success: true, data: row }, 201)
})

// ── PUT /jadwal/tipe/:id — update tipe shift ─────────────────────────────────

jadwalRouter.put('/tipe/:id', requirePermission('karyawan.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ nama?: string; jam_mulai?: string; jam_selesai?: string; warna?: string }>()
  const existing = await query.find(db.select({ id: tipe_shift.id }).from(tipe_shift).where(eq(tipe_shift.id, id)))
  if (!existing) throw new HTTPException(404, { message: 'Tipe shift tidak ditemukan' })

  await query.exec(db.update(tipe_shift).set({
    ...(body.nama && { nama: body.nama }),
    ...(body.jam_mulai && { jam_mulai: body.jam_mulai }),
    ...(body.jam_selesai && { jam_selesai: body.jam_selesai }),
    ...(body.warna && { warna: body.warna }),
    updated_at: isoNow(),
  }).where(eq(tipe_shift.id, id)))
  return c.json({ success: true, data: null })
})

// ── DELETE /jadwal/tipe/:id — nonaktifkan tipe shift ─────────────────────────

jadwalRouter.delete('/tipe/:id', requirePermission('karyawan.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  await query.exec(db.update(tipe_shift).set({ is_active: false, updated_at: isoNow() })
    .where(eq(tipe_shift.id, id)))
  return c.json({ success: true, data: null })
})

// ── GET /jadwal — jadwal mingguan ─────────────────────────────────────────────
// Query: dari=YYYY-MM-DD&sampai=YYYY-MM-DD

jadwalRouter.get('/', requirePermission('karyawan.lihat'), async (c) => {
  const { dari, sampai } = c.req.query()
  if (!dari || !sampai) throw new HTTPException(400, { message: 'dari dan sampai wajib' })

  const rows = await query.findAll(db
    .select({
      id: jadwal_kerja.id,
      karyawan_id: jadwal_kerja.karyawan_id,
      nama_karyawan: karyawan.nama,
      tipe_shift_id: jadwal_kerja.tipe_shift_id,
      nama_shift: tipe_shift.nama,
      jam_mulai: tipe_shift.jam_mulai,
      jam_selesai: tipe_shift.jam_selesai,
      warna: tipe_shift.warna,
      tanggal: jadwal_kerja.tanggal,
      catatan: jadwal_kerja.catatan,
    })
    .from(jadwal_kerja)
    .leftJoin(karyawan, eq(jadwal_kerja.karyawan_id, karyawan.id))
    .leftJoin(tipe_shift, eq(jadwal_kerja.tipe_shift_id, tipe_shift.id))
    .where(and(gte(jadwal_kerja.tanggal, dari), lte(jadwal_kerja.tanggal, sampai)))
    .orderBy(jadwal_kerja.tanggal, karyawan.nama)
    )

  return c.json({ success: true, data: rows })
})

// ── POST /jadwal — assign karyawan ke shift ───────────────────────────────────

jadwalRouter.post('/', requirePermission('karyawan.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const body = await c.req.json<{ karyawan_id: number; tipe_shift_id: number; tanggal: string; catatan?: string }>()
  if (!body.karyawan_id || !body.tipe_shift_id || !body.tanggal)
    throw new HTTPException(400, { message: 'karyawan_id, tipe_shift_id, tanggal wajib' })

  // Cek duplikat (1 karyawan 1 shift per hari)
  const existing = await query.find(db.select({ id: jadwal_kerja.id }).from(jadwal_kerja)
    .where(and(
      eq(jadwal_kerja.karyawan_id, body.karyawan_id),
      eq(jadwal_kerja.tanggal, body.tanggal),
      eq(jadwal_kerja.tipe_shift_id, body.tipe_shift_id),
    )))
  if (existing) throw new HTTPException(409, { message: 'Jadwal sudah ada untuk karyawan ini pada tanggal dan shift tersebut' })

  const row = await query.ret(db.insert(jadwal_kerja).values({
    karyawan_id: body.karyawan_id,
    tipe_shift_id: body.tipe_shift_id,
    tanggal: body.tanggal,
    catatan: body.catatan,
    dibuat_oleh: user.id,
  }).returning())
  return c.json({ success: true, data: row }, 201)
})

// ── GET /jadwal/tukar — list permintaan tukar shift ──────────────────────────

jadwalRouter.get('/tukar', requirePermission('karyawan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const isMgr = ['pemilik', 'manajer'].includes(user.role)

  const pengajuAlias = db.$with('pengaju').as(
    db.select({ id: karyawan.id, nama: karyawan.nama }).from(karyawan)
  )
  const penerimaAlias = db.$with('penerima').as(
    db.select({ id: karyawan.id, nama: karyawan.nama }).from(karyawan)
  )

  // Simple join approach without CTE for SQLite compat
  const rows = await query.findAll(db
    .select({
      id: tukar_shift.id,
      pengaju_id: tukar_shift.pengaju_id,
      jadwal_id: tukar_shift.jadwal_id,
      penerima_id: tukar_shift.penerima_id,
      jadwal_penerima_id: tukar_shift.jadwal_penerima_id,
      alasan: tukar_shift.alasan,
      status: tukar_shift.status,
      diproses_oleh: tukar_shift.diproses_oleh,
      catatan_proses: tukar_shift.catatan_proses,
      created_at: tukar_shift.created_at,
      // denormalized via raw sql for two karyawan joins
      nama_pengaju: sql<string>`(SELECT nama FROM karyawan WHERE id = ${tukar_shift.pengaju_id})`,
      nama_penerima: sql<string>`(SELECT nama FROM karyawan WHERE id = ${tukar_shift.penerima_id})`,
      tanggal_jadwal: sql<string>`(SELECT tanggal FROM jadwal_kerja WHERE id = ${tukar_shift.jadwal_id})`,
      nama_shift: sql<string>`(SELECT ts.nama FROM jadwal_kerja jk JOIN tipe_shift ts ON ts.id = jk.tipe_shift_id WHERE jk.id = ${tukar_shift.jadwal_id})`,
    })
    .from(tukar_shift)
    .where(isMgr ? undefined : sql`${tukar_shift.pengaju_id} = ${user.id} OR ${tukar_shift.penerima_id} = ${user.id}`)
    .orderBy(sql`${tukar_shift.created_at} DESC`)
    )

  return c.json({ success: true, data: rows })
})

// ── POST /jadwal/tukar — ajukan tukar shift ───────────────────────────────────

jadwalRouter.post('/tukar', requirePermission('karyawan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const body = await c.req.json<{
    jadwal_id: number; penerima_id: number; jadwal_penerima_id?: number; alasan?: string
  }>()
  if (!body.jadwal_id || !body.penerima_id)
    throw new HTTPException(400, { message: 'jadwal_id dan penerima_id wajib' })

  // Validasi jadwal milik pengaju
  const jadwal = await query.find(db.select({ id: jadwal_kerja.id, karyawan_id: jadwal_kerja.karyawan_id })
    .from(jadwal_kerja).where(eq(jadwal_kerja.id, body.jadwal_id)))
  if (!jadwal) throw new HTTPException(404, { message: 'Jadwal tidak ditemukan' })
  if (jadwal.karyawan_id !== user.id && !['pemilik', 'manajer'].includes(user.role))
    throw new HTTPException(403, { message: 'Hanya bisa tukar jadwal milik sendiri' })

  const row = await query.ret(db.insert(tukar_shift).values({
    pengaju_id: user.id,
    jadwal_id: body.jadwal_id,
    penerima_id: body.penerima_id,
    jadwal_penerima_id: body.jadwal_penerima_id,
    alasan: body.alasan,
  }).returning())
  return c.json({ success: true, data: row }, 201)
})

// ── PUT /jadwal/tukar/:id/setujui — approve tukar shift ──────────────────────

jadwalRouter.put('/tukar/:id/setujui', requirePermission('karyawan.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ catatan?: string }>().catch(() => ({}))
  const req = await query.find(db.select().from(tukar_shift).where(eq(tukar_shift.id, id)))
  if (!req) throw new HTTPException(404, { message: 'Permintaan tukar shift tidak ditemukan' })
  if (req.status !== 'menunggu') throw new HTTPException(400, { message: 'Permintaan sudah diproses' })

  // Validasi jadwal penerima benar-benar milik penerima_id
  if (req.jadwal_penerima_id) {
    const jp = await query.find(db.select({ karyawan_id: jadwal_kerja.karyawan_id })
      .from(jadwal_kerja).where(eq(jadwal_kerja.id, req.jadwal_penerima_id)))
    if (!jp || jp.karyawan_id !== req.penerima_id)
      throw new HTTPException(400, { message: 'Jadwal penerima tidak valid' })
  }

  // Swap karyawan_id pada kedua jadwal
  await withTransaction(async (tx) => {
    await query.exec(tx.update(jadwal_kerja).set({ karyawan_id: req.penerima_id }).where(eq(jadwal_kerja.id, req.jadwal_id)))
    if (req.jadwal_penerima_id) {
      await query.exec(tx.update(jadwal_kerja).set({ karyawan_id: req.pengaju_id }).where(eq(jadwal_kerja.id, req.jadwal_penerima_id)))
    }
    await query.exec(tx.update(tukar_shift).set({
      status: 'disetujui',
      diproses_oleh: user.id,
      catatan_proses: (body as { catatan?: string }).catatan,
      updated_at: isoNow(),
    }).where(eq(tukar_shift.id, id)))
  })

  return c.json({ success: true, data: null })
})

// ── PUT /jadwal/tukar/:id/tolak — reject tukar shift ─────────────────────────

jadwalRouter.put('/tukar/:id/tolak', requirePermission('karyawan.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ catatan?: string }>().catch(() => ({}))
  const req = await query.find(db.select({ id: tukar_shift.id, status: tukar_shift.status })
    .from(tukar_shift).where(eq(tukar_shift.id, id)))
  if (!req) throw new HTTPException(404, { message: 'Permintaan tukar shift tidak ditemukan' })
  if (req.status !== 'menunggu') throw new HTTPException(400, { message: 'Permintaan sudah diproses' })

  await query.exec(db.update(tukar_shift).set({
    status: 'ditolak',
    diproses_oleh: user.id,
    catatan_proses: (body as { catatan?: string }).catatan,
    updated_at: isoNow(),
  }).where(eq(tukar_shift.id, id)))
  return c.json({ success: true, data: null })
})

// ── DELETE /jadwal/:id — hapus jadwal ─────────────────────────────────────────
// Didaftarkan TERAKHIR agar route statis /tukar* tidak tertangkap /:id

jadwalRouter.delete('/:id', requirePermission('karyawan.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = await query.find(db.select({ id: jadwal_kerja.id }).from(jadwal_kerja).where(eq(jadwal_kerja.id, id)))
  if (!existing) throw new HTTPException(404, { message: 'Jadwal tidak ditemukan' })
  await query.exec(db.delete(jadwal_kerja).where(eq(jadwal_kerja.id, id)))
  return c.json({ success: true, data: null })
})
