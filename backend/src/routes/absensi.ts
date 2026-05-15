import { Hono } from 'hono'
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import type { Context, Next } from 'hono'
import { db } from '../db/index.ts'
import { absensi, karyawan } from '../db/schema.ts'
import { authMiddleware, hasPermission, requirePermission } from '../middleware/auth.ts'
import type { JWTPayload } from './auth.ts'
import type { Role } from '../middleware/auth.ts'

export const absensiRouter = new Hono()
absensiRouter.use('*', authMiddleware)

function requireAbsensiAkses() {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as JWTPayload
    if (
      !hasPermission(user.role as Role, 'absensi.semua') &&
      !hasPermission(user.role as Role, 'absensi.diri')
    ) {
      throw new HTTPException(403, { message: 'Akses ditolak' })
    }
    await next()
  }
}

// GET / — list absensi (filter: bulan, karyawan_id, tgl_mulai, tgl_selesai)
absensiRouter.get('/', requireAbsensiAkses(), async (c) => {
  const user = c.get('user') as JWTPayload
  const canSemua = hasPermission(user.role as Role, 'absensi.semua')

  const bulan = c.req.query('bulan')
  const tglMulai = c.req.query('tgl_mulai')
  const tglSelesai = c.req.query('tgl_selesai')
  const karyawanIdParam = c.req.query('karyawan_id') ? Number(c.req.query('karyawan_id')) : undefined
  const filterKaryawanId = canSemua ? karyawanIdParam : user.id

  const conds: ReturnType<typeof eq>[] = []
  if (filterKaryawanId) conds.push(eq(absensi.karyawan_id, filterKaryawanId))
  if (bulan) {
    conds.push(gte(absensi.tanggal, `${bulan}-01`))
    conds.push(lte(absensi.tanggal, `${bulan}-31`))
  } else if (tglMulai) {
    conds.push(gte(absensi.tanggal, tglMulai))
    if (tglSelesai) conds.push(lte(absensi.tanggal, tglSelesai))
  }

  const rows = db
    .select({
      id: absensi.id,
      karyawan_id: absensi.karyawan_id,
      nama_karyawan: karyawan.nama,
      tanggal: absensi.tanggal,
      jam_masuk: absensi.jam_masuk,
      jam_keluar: absensi.jam_keluar,
      shift: absensi.shift,
      status: absensi.status,
    })
    .from(absensi)
    .leftJoin(karyawan, eq(absensi.karyawan_id, karyawan.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(absensi.tanggal), karyawan.nama)
    .all()

  return c.json({ success: true, data: rows })
})

// GET /rekap — rekap kehadiran per karyawan untuk satu bulan
absensiRouter.get('/rekap', requirePermission('absensi.semua'), async (c) => {
  const bulan = c.req.query('bulan')
  if (!bulan) throw new HTTPException(400, { message: 'bulan wajib (YYYY-MM)' })

  const rows = db
    .select({
      karyawan_id: absensi.karyawan_id,
      nama_karyawan: karyawan.nama,
      hadir: sql<number>`SUM(CASE WHEN ${absensi.status} = 'hadir' THEN 1 ELSE 0 END)`,
      izin: sql<number>`SUM(CASE WHEN ${absensi.status} = 'izin' THEN 1 ELSE 0 END)`,
      sakit: sql<number>`SUM(CASE WHEN ${absensi.status} = 'sakit' THEN 1 ELSE 0 END)`,
      alpa: sql<number>`SUM(CASE WHEN ${absensi.status} = 'alpa' THEN 1 ELSE 0 END)`,
      total: sql<number>`COUNT(*)`,
    })
    .from(absensi)
    .leftJoin(karyawan, eq(absensi.karyawan_id, karyawan.id))
    .where(and(gte(absensi.tanggal, `${bulan}-01`), lte(absensi.tanggal, `${bulan}-31`)))
    .groupBy(absensi.karyawan_id, karyawan.nama)
    .all()

  return c.json({ success: true, data: rows })
})

// POST / — tambah absensi
absensiRouter.post('/', requireAbsensiAkses(), async (c) => {
  const user = c.get('user') as JWTPayload
  const canSemua = hasPermission(user.role as Role, 'absensi.semua')
  const body = await c.req.json<{
    karyawan_id: number
    tanggal: string
    jam_masuk?: string
    jam_keluar?: string
    shift?: string
    status: 'hadir' | 'izin' | 'sakit' | 'alpa'
  }>()

  if (!body.karyawan_id || !body.tanggal || !body.status) {
    throw new HTTPException(400, { message: 'karyawan_id, tanggal, status wajib' })
  }
  if (!canSemua && body.karyawan_id !== user.id) {
    throw new HTTPException(403, { message: 'Hanya bisa mencatat absensi diri sendiri' })
  }

  const existing = db
    .select({ id: absensi.id })
    .from(absensi)
    .where(and(eq(absensi.karyawan_id, body.karyawan_id), eq(absensi.tanggal, body.tanggal)))
    .get()
  if (existing) throw new HTTPException(409, { message: 'Absensi tanggal ini sudah ada' })

  const row = db
    .insert(absensi)
    .values({
      karyawan_id: body.karyawan_id,
      tanggal: body.tanggal,
      jam_masuk: body.jam_masuk,
      jam_keluar: body.jam_keluar,
      shift: body.shift,
      status: body.status,
      dicatat_oleh: user.id,
    })
    .returning()
    .get()

  return c.json({ success: true, data: row }, 201)
})

// PUT /:id — update (clock out, ubah status)
absensiRouter.put('/:id', requireAbsensiAkses(), async (c) => {
  const user = c.get('user') as JWTPayload
  const canSemua = hasPermission(user.role as Role, 'absensi.semua')
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{
    jam_masuk?: string
    jam_keluar?: string
    shift?: string
    status?: 'hadir' | 'izin' | 'sakit' | 'alpa'
  }>()

  const existing = db.select().from(absensi).where(eq(absensi.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Absensi tidak ditemukan' })
  if (!canSemua && existing.karyawan_id !== user.id) {
    throw new HTTPException(403, { message: 'Hanya bisa edit absensi diri sendiri' })
  }

  const row = db
    .update(absensi)
    .set({
      jam_masuk: body.jam_masuk !== undefined ? body.jam_masuk : existing.jam_masuk,
      jam_keluar: body.jam_keluar !== undefined ? body.jam_keluar : existing.jam_keluar,
      shift: body.shift !== undefined ? body.shift : existing.shift,
      status: body.status ?? existing.status,
    })
    .where(eq(absensi.id, id))
    .returning()
    .get()

  return c.json({ success: true, data: row })
})

// DELETE /:id — hapus (hanya manajer/pemilik)
absensiRouter.delete('/:id', requirePermission('absensi.semua'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = db.select({ id: absensi.id }).from(absensi).where(eq(absensi.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Absensi tidak ditemukan' })
  db.delete(absensi).where(eq(absensi.id, id)).run()
  return c.json({ success: true, data: null })
})
