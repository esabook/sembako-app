// ── C1: Sanksi & Insentif ─────────────────────────────────────────────────
// GET  /sanksi-insentif              — list (filter: karyawan_id, periode_bulan, tipe)
// POST /sanksi-insentif              — catat sanksi atau insentif
// DELETE /sanksi-insentif/:id        — hapus

import { Hono } from 'hono'
import { eq, and, desc } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.ts'
import { sanksi_insentif, karyawan } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import type { JWTPayload } from './auth.ts'

export const sanksiInsentifRouter = new Hono<{ Variables: { user: JWTPayload } }>()

sanksiInsentifRouter.use('*', authMiddleware)

// ── GET / ─────────────────────────────────────────────────────────────────

sanksiInsentifRouter.get('/', requirePermission('gaji.lihat'), async (c) => {
  const karyawanId = c.req.query('karyawan_id') ? Number(c.req.query('karyawan_id')) : undefined
  const bulan = c.req.query('periode_bulan')
  const tipe = c.req.query('tipe') as 'sanksi' | 'insentif' | undefined

  const conds = []
  if (karyawanId) conds.push(eq(sanksi_insentif.karyawan_id, karyawanId))
  if (bulan) conds.push(eq(sanksi_insentif.periode_bulan, bulan))
  if (tipe) conds.push(eq(sanksi_insentif.tipe, tipe))

  const rows = db
    .select({
      id: sanksi_insentif.id,
      karyawan_id: sanksi_insentif.karyawan_id,
      nama_karyawan: karyawan.nama,
      tipe: sanksi_insentif.tipe,
      jenis: sanksi_insentif.jenis,
      jumlah: sanksi_insentif.jumlah,
      tanggal: sanksi_insentif.tanggal,
      periode_bulan: sanksi_insentif.periode_bulan,
      keterangan: sanksi_insentif.keterangan,
      created_at: sanksi_insentif.created_at,
    })
    .from(sanksi_insentif)
    .leftJoin(karyawan, eq(sanksi_insentif.karyawan_id, karyawan.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(sanksi_insentif.tanggal))
    .all()

  return c.json({ success: true, data: rows })
})

// ── POST / ────────────────────────────────────────────────────────────────

sanksiInsentifRouter.post('/', requirePermission('gaji.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  if (!['pemilik', 'manajer'].includes(user.role)) {
    throw new HTTPException(403, { message: 'Hanya manajer atau pemilik yang dapat mencatat' })
  }

  const body = await c.req.json<{
    karyawan_id: number
    tipe: 'sanksi' | 'insentif'
    jenis: string
    jumlah: number
    tanggal: string
    periode_bulan: string
    keterangan?: string
  }>()

  if (!body.karyawan_id) throw new HTTPException(400, { message: 'karyawan_id wajib' })
  if (!body.tipe) throw new HTTPException(400, { message: 'tipe wajib (sanksi/insentif)' })
  if (!body.jenis?.trim()) throw new HTTPException(400, { message: 'jenis wajib' })
  if (!body.jumlah || body.jumlah <= 0) throw new HTTPException(400, { message: 'jumlah harus > 0' })
  if (!body.tanggal) throw new HTTPException(400, { message: 'tanggal wajib' })
  if (!body.periode_bulan || !/^\d{4}-\d{2}$/.test(body.periode_bulan)) {
    throw new HTTPException(400, { message: 'periode_bulan wajib format YYYY-MM' })
  }

  const row = db.insert(sanksi_insentif).values({
    karyawan_id: body.karyawan_id,
    tipe: body.tipe,
    jenis: body.jenis,
    jumlah: body.jumlah,
    tanggal: body.tanggal,
    periode_bulan: body.periode_bulan,
    keterangan: body.keterangan,
    dicatat_oleh: user.id,
  }).returning().get()

  return c.json({ success: true, data: row }, 201)
})

// ── DELETE /:id ───────────────────────────────────────────────────────────

sanksiInsentifRouter.delete('/:id', requirePermission('gaji.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  if (!['pemilik', 'manajer'].includes(user.role)) {
    throw new HTTPException(403, { message: 'Hanya manajer atau pemilik yang dapat menghapus' })
  }

  const id = Number(c.req.param('id'))
  const existing = db.select({ id: sanksi_insentif.id }).from(sanksi_insentif).where(eq(sanksi_insentif.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Data tidak ditemukan' })

  db.delete(sanksi_insentif).where(eq(sanksi_insentif.id, id)).run()
  return c.json({ success: true, data: null })
})
