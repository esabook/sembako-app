import { Hono } from 'hono'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import { tamu_birokrasi } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import type { JWTPayload } from './auth.ts'

export const tamuRouter = new Hono<{ Variables: { user: JWTPayload } }>()
tamuRouter.use('*', authMiddleware)

// GET / — list (filter: dari, sampai)
tamuRouter.get('/', requirePermission('karyawan.lihat'), async (c) => {
  const dari = c.req.query('dari')
  const sampai = c.req.query('sampai')

  const conds = []
  if (dari) conds.push(gte(tamu_birokrasi.tanggal, dari))
  if (sampai) conds.push(lte(tamu_birokrasi.tanggal, sampai))

  const rows = await query.findAll(db
    .select()
    .from(tamu_birokrasi)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(tamu_birokrasi.tanggal))
    )

  return c.json({ success: true, data: rows })
})

// POST / — catat tamu baru
tamuRouter.post('/', requirePermission('karyawan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const body = await c.req.json<{
    nama_tamu: string
    instansi?: string
    keperluan: string
    tanggal: string
    jam_masuk?: string
    jam_keluar?: string
    keterangan?: string
  }>()

  if (!body.nama_tamu?.trim()) throw new HTTPException(400, { message: 'nama_tamu wajib' })
  if (!body.keperluan?.trim()) throw new HTTPException(400, { message: 'keperluan wajib' })
  if (!body.tanggal) throw new HTTPException(400, { message: 'tanggal wajib' })

  const row = await query.ret(db.insert(tamu_birokrasi).values({
    nama_tamu: body.nama_tamu.trim(),
    instansi: body.instansi?.trim(),
    keperluan: body.keperluan.trim(),
    tanggal: body.tanggal,
    jam_masuk: body.jam_masuk,
    jam_keluar: body.jam_keluar,
    keterangan: body.keterangan,
    dicatat_oleh: user.id,
  }).returning())

  return c.json({ success: true, data: row }, 201)
})

// DELETE /:id — hapus catatan tamu
tamuRouter.delete('/:id', requirePermission('karyawan.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = await query.find(db.select({ id: tamu_birokrasi.id }).from(tamu_birokrasi).where(eq(tamu_birokrasi.id, id)))
  if (!existing) throw new HTTPException(404, { message: 'Data tidak ditemukan' })
  await query.exec(db.delete(tamu_birokrasi).where(eq(tamu_birokrasi.id, id)))
  return c.json({ success: true, data: null })
})
