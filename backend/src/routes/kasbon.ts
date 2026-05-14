import { Hono } from 'hono'
import { eq, and, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.ts'
import { kasbon, karyawan } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'

export const kasbonRouter = new Hono()
kasbonRouter.use('*', authMiddleware)

// GET / — list kasbon (filter: karyawan_id, status)
kasbonRouter.get('/', requirePermission('karyawan.lihat'), async (c) => {
  const karyawanId = c.req.query('karyawan_id') ? Number(c.req.query('karyawan_id')) : undefined
  const status = c.req.query('status') as 'aktif' | 'lunas' | undefined

  const conds: ReturnType<typeof eq>[] = []
  if (karyawanId) conds.push(eq(kasbon.karyawan_id, karyawanId))
  if (status) conds.push(eq(kasbon.status, status))

  const rows = db
    .select({
      id: kasbon.id,
      karyawan_id: kasbon.karyawan_id,
      nama_karyawan: karyawan.nama,
      tanggal_pinjam: kasbon.tanggal_pinjam,
      jumlah: kasbon.jumlah,
      cicilan_per_bulan: kasbon.cicilan_per_bulan,
      sisa_kasbon: kasbon.sisa_kasbon,
      status: kasbon.status,
    })
    .from(kasbon)
    .leftJoin(karyawan, eq(kasbon.karyawan_id, karyawan.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(sql`${kasbon.status} ASC`, sql`${kasbon.tanggal_pinjam} DESC`)
    .all()

  return c.json({ success: true, data: rows })
})

// POST / — tambah kasbon baru
kasbonRouter.post('/', requirePermission('karyawan.edit'), async (c) => {
  const body = await c.req.json<{
    karyawan_id: number
    tanggal_pinjam: string
    jumlah: number
    cicilan_per_bulan: number
  }>()

  if (!body.karyawan_id || !body.tanggal_pinjam || !body.jumlah) {
    throw new HTTPException(400, { message: 'karyawan_id, tanggal_pinjam, jumlah wajib' })
  }
  if (body.jumlah <= 0) throw new HTTPException(400, { message: 'Jumlah kasbon harus > 0' })

  const karyw = db.select({ id: karyawan.id }).from(karyawan).where(eq(karyawan.id, body.karyawan_id)).get()
  if (!karyw) throw new HTTPException(404, { message: 'Karyawan tidak ditemukan' })

  const row = db
    .insert(kasbon)
    .values({
      karyawan_id: body.karyawan_id,
      tanggal_pinjam: body.tanggal_pinjam,
      jumlah: body.jumlah,
      cicilan_per_bulan: body.cicilan_per_bulan ?? 0,
      sisa_kasbon: body.jumlah,
      status: 'aktif',
    })
    .returning()
    .get()

  return c.json({ success: true, data: row }, 201)
})

// PUT /:id/cicil — bayar cicilan manual
kasbonRouter.put('/:id/cicil', requirePermission('karyawan.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ jumlah_cicil: number }>()

  if (!body.jumlah_cicil || body.jumlah_cicil <= 0) {
    throw new HTTPException(400, { message: 'jumlah_cicil harus > 0' })
  }

  const existing = db.select().from(kasbon).where(eq(kasbon.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Kasbon tidak ditemukan' })
  if (existing.status === 'lunas') throw new HTTPException(400, { message: 'Kasbon sudah lunas' })

  const sisa = Math.max(0, existing.sisa_kasbon - body.jumlah_cicil)
  const row = db
    .update(kasbon)
    .set({
      sisa_kasbon: sisa,
      status: sisa <= 0 ? 'lunas' : 'aktif',
      updated_at: sql`(datetime('now','localtime'))`,
    })
    .where(eq(kasbon.id, id))
    .returning()
    .get()

  return c.json({ success: true, data: row })
})

// DELETE /:id — hapus kasbon
kasbonRouter.delete('/:id', requirePermission('karyawan.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = db.select({ id: kasbon.id }).from(kasbon).where(eq(kasbon.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Kasbon tidak ditemukan' })
  db.delete(kasbon).where(eq(kasbon.id, id)).run()
  return c.json({ success: true, data: null })
})
