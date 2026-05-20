import { Hono } from 'hono'
import { eq, and, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.ts'
import { kasbon, karyawan } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import type { JWTPayload } from './auth.ts'

export const kasbonRouter = new Hono<{ Variables: { user: JWTPayload } }>()
kasbonRouter.use('*', authMiddleware)

function tglHariIni(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)
}

// ── GET / — list kasbon ────────────────────────────────────────────────────

kasbonRouter.get('/', requirePermission('karyawan.lihat'), async (c) => {
  const karyawanId = c.req.query('karyawan_id') ? Number(c.req.query('karyawan_id')) : undefined
  const status = c.req.query('status') as string | undefined

  const conds: ReturnType<typeof eq>[] = []
  if (karyawanId) conds.push(eq(kasbon.karyawan_id, karyawanId))
  if (status) conds.push(eq(kasbon.status, status as never))

  const rows = db
    .select({
      id: kasbon.id,
      karyawan_id: kasbon.karyawan_id,
      nama_karyawan: karyawan.nama,
      tanggal_pinjam: kasbon.tanggal_pinjam,
      tanggal_cair: kasbon.tanggal_cair,
      jumlah: kasbon.jumlah,
      cicilan_per_bulan: kasbon.cicilan_per_bulan,
      sisa_kasbon: kasbon.sisa_kasbon,
      status: kasbon.status,
      disetujui_oleh: kasbon.disetujui_oleh,
      catatan: kasbon.catatan,
    })
    .from(kasbon)
    .leftJoin(karyawan, eq(kasbon.karyawan_id, karyawan.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(
      sql`CASE ${kasbon.status}
        WHEN 'pengajuan' THEN 0
        WHEN 'disetujui' THEN 1
        WHEN 'aktif'     THEN 2
        WHEN 'ditolak'   THEN 3
        WHEN 'lunas'     THEN 4 END`,
      sql`${kasbon.tanggal_pinjam} DESC`
    )
    .all()

  return c.json({ success: true, data: rows })
})

// ── POST / — ajukan kasbon (status: pengajuan) ────────────────────────────

kasbonRouter.post('/', requirePermission('karyawan.edit'), async (c) => {
  const body = await c.req.json<{
    karyawan_id: number
    tanggal_pinjam: string
    jumlah: number
    cicilan_per_bulan?: number
    catatan?: string
  }>()

  if (!body.karyawan_id || !body.tanggal_pinjam || !body.jumlah)
    throw new HTTPException(400, { message: 'karyawan_id, tanggal_pinjam, jumlah wajib' })
  if (body.cicilan_per_bulan !== undefined && body.cicilan_per_bulan <= 0)
    throw new HTTPException(400, { message: 'cicilan_per_bulan harus lebih dari 0' })
  if (body.jumlah <= 0)
    throw new HTTPException(400, { message: 'Jumlah kasbon harus > 0' })

  const karyw = db.select({ id: karyawan.id }).from(karyawan).where(eq(karyawan.id, body.karyawan_id)).get()
  if (!karyw) throw new HTTPException(404, { message: 'Karyawan tidak ditemukan' })

  // Cek apakah ada kasbon aktif/pengajuan/disetujui yang belum lunas
  const kasbonAktif = db.select({ id: kasbon.id, sisa: kasbon.sisa_kasbon }).from(kasbon)
    .where(and(
      eq(kasbon.karyawan_id, body.karyawan_id),
      sql`${kasbon.status} IN ('pengajuan','disetujui','aktif')`
    )).all()

  const totalSisa = kasbonAktif.reduce((s, r) => s + r.sisa, 0)
  const MAX_KASBON = 5_000_000
  if (totalSisa + body.jumlah > MAX_KASBON)
    throw new HTTPException(400, { message: `Total kasbon melebihi batas maksimal Rp ${MAX_KASBON.toLocaleString('id-ID')}` })

  const row = db.insert(kasbon).values({
    karyawan_id: body.karyawan_id,
    tanggal_pinjam: body.tanggal_pinjam,
    jumlah: body.jumlah,
    cicilan_per_bulan: body.cicilan_per_bulan ?? 0,
    sisa_kasbon: body.jumlah,
    status: 'pengajuan',
    catatan: body.catatan,
  }).returning().get()

  return c.json({ success: true, data: row }, 201)
})

// ── PUT /:id/setujui — approve kasbon ─────────────────────────────────────

kasbonRouter.put('/:id/setujui', requirePermission('karyawan.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const id = Number(c.req.param('id'))
  const existing = db.select().from(kasbon).where(eq(kasbon.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Kasbon tidak ditemukan' })
  if (existing.status !== 'pengajuan')
    throw new HTTPException(400, { message: `Kasbon status '${existing.status}', bukan pengajuan` })

  db.update(kasbon).set({
    status: 'disetujui',
    disetujui_oleh: user.id,
    updated_at: sql`(datetime('now','localtime'))`,
  }).where(eq(kasbon.id, id)).run()

  return c.json({ success: true, data: null })
})

// ── PUT /:id/tolak — reject kasbon ────────────────────────────────────────

kasbonRouter.put('/:id/tolak', requirePermission('karyawan.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ catatan?: string }>()
  const existing = db.select().from(kasbon).where(eq(kasbon.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Kasbon tidak ditemukan' })
  if (!['pengajuan', 'disetujui'].includes(existing.status))
    throw new HTTPException(400, { message: 'Hanya bisa tolak kasbon yang belum cair' })

  db.update(kasbon).set({
    status: 'ditolak',
    catatan: body.catatan ?? existing.catatan,
    updated_at: sql`(datetime('now','localtime'))`,
  }).where(eq(kasbon.id, id)).run()

  return c.json({ success: true, data: null })
})

// ── PUT /:id/cair — cairkan kasbon (disetujui → aktif) ────────────────────

kasbonRouter.put('/:id/cair', requirePermission('karyawan.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = db.select().from(kasbon).where(eq(kasbon.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Kasbon tidak ditemukan' })
  if (existing.status !== 'disetujui')
    throw new HTTPException(400, { message: 'Kasbon harus berstatus disetujui sebelum dicairkan' })

  db.update(kasbon).set({
    status: 'aktif',
    tanggal_cair: tglHariIni(),
    updated_at: sql`(datetime('now','localtime'))`,
  }).where(eq(kasbon.id, id)).run()

  return c.json({ success: true, data: null })
})

// ── PUT /:id/cicil — bayar cicilan manual ─────────────────────────────────

kasbonRouter.put('/:id/cicil', requirePermission('karyawan.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ jumlah_cicil: number }>()

  if (!body.jumlah_cicil || body.jumlah_cicil <= 0)
    throw new HTTPException(400, { message: 'jumlah_cicil harus > 0' })

  const existing = db.select().from(kasbon).where(eq(kasbon.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Kasbon tidak ditemukan' })
  if (existing.status !== 'aktif')
    throw new HTTPException(400, { message: 'Hanya kasbon berstatus aktif yang bisa dicicil' })

  const sisa = Math.max(0, existing.sisa_kasbon - body.jumlah_cicil)
  const row = db.update(kasbon).set({
    sisa_kasbon: sisa,
    status: sisa <= 0 ? 'lunas' : 'aktif',
    updated_at: sql`(datetime('now','localtime'))`,
  }).where(eq(kasbon.id, id)).returning().get()

  return c.json({ success: true, data: row })
})

// ── GET /:id/jadwal — jadwal cicilan (computed) ───────────────────────────

kasbonRouter.get('/:id/jadwal', requirePermission('karyawan.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const kb = db.select().from(kasbon).where(eq(kasbon.id, id)).get()
  if (!kb) throw new HTTPException(404, { message: 'Kasbon tidak ditemukan' })

  if (!kb.cicilan_per_bulan || kb.cicilan_per_bulan <= 0)
    return c.json({ success: true, data: [] })

  const startDate = new Date(kb.tanggal_cair ?? kb.tanggal_pinjam)
  const totalBulan = Math.ceil(kb.jumlah / kb.cicilan_per_bulan)
  const sudahDibayar = kb.jumlah - kb.sisa_kasbon

  const jadwal = []
  let kumulatif = 0
  for (let i = 0; i < totalBulan; i++) {
    const d = new Date(startDate)
    d.setMonth(d.getMonth() + i + 1)
    const cicilan = Math.min(kb.cicilan_per_bulan, kb.jumlah - kumulatif)
    kumulatif += cicilan
    jadwal.push({
      bulan_ke: i + 1,
      bulan: d.toISOString().slice(0, 7),
      jumlah_cicil: cicilan,
      sudah_lunas: kumulatif <= sudahDibayar,
    })
  }

  return c.json({ success: true, data: jadwal })
})

// ── DELETE /:id — hapus kasbon ────────────────────────────────────────────

kasbonRouter.delete('/:id', requirePermission('karyawan.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = db.select({ id: kasbon.id, status: kasbon.status }).from(kasbon).where(eq(kasbon.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Kasbon tidak ditemukan' })
  if (existing.status === 'aktif' || existing.status === 'disetujui')
    throw new HTTPException(400, { message: 'Kasbon yang sudah disetujui atau aktif tidak bisa dihapus' })

  db.delete(kasbon).where(eq(kasbon.id, id)).run()
  return c.json({ success: true, data: null })
})
