// ── C1: Evaluasi Karyawan ─────────────────────────────────────────────────
// GET  /evaluasi                     — list (filter: karyawan_id, periode)
// POST /evaluasi                     — buat evaluasi baru
// PUT  /evaluasi/:id                 — update evaluasi
// DELETE /evaluasi/:id               — hapus evaluasi

import { Hono } from 'hono'
import { eq, and, desc } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import { evaluasi_karyawan, karyawan } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import type { JWTPayload } from './auth.ts'

export const evaluasiRouter = new Hono<{ Variables: { user: JWTPayload } }>()

evaluasiRouter.use('*', authMiddleware)
evaluasiRouter.use('*', tenantMiddleware)

// ── GET / ─────────────────────────────────────────────────────────────────

evaluasiRouter.get('/', requirePermission('*'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const karyawanId = c.req.query('karyawan_id') ? Number(c.req.query('karyawan_id')) : undefined
  const periode = c.req.query('periode')

  const conds = [eq(evaluasi_karyawan.tenant_id, tenantId)]
  if (karyawanId) conds.push(eq(evaluasi_karyawan.karyawan_id, karyawanId))
  if (periode) conds.push(eq(evaluasi_karyawan.periode, periode))

  const rows = await query.findAll(db
    .select({
      id: evaluasi_karyawan.id,
      karyawan_id: evaluasi_karyawan.karyawan_id,
      nama_karyawan: karyawan.nama,
      periode: evaluasi_karyawan.periode,
      nilai: evaluasi_karyawan.nilai,
      catatan: evaluasi_karyawan.catatan,
      dinilai_oleh: evaluasi_karyawan.dinilai_oleh,
      tanggal: evaluasi_karyawan.tanggal,
      created_at: evaluasi_karyawan.created_at,
    })
    .from(evaluasi_karyawan)
    .leftJoin(karyawan, eq(evaluasi_karyawan.karyawan_id, karyawan.id))
    .where(and(...conds))
    .orderBy(desc(evaluasi_karyawan.tanggal))
    )

  return c.json({ success: true, data: rows })
})

// ── POST / ────────────────────────────────────────────────────────────────

evaluasiRouter.post('/', requirePermission('*'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  if (!['pemilik', 'manajer'].includes(user.role)) {
    throw new HTTPException(403, { message: 'Hanya manajer atau pemilik yang dapat menilai' })
  }

  const body = await c.req.json<{
    karyawan_id: number
    periode: string
    nilai: number
    catatan?: string
    tanggal?: string
  }>()

  if (!body.karyawan_id) throw new HTTPException(400, { message: 'karyawan_id wajib' })
  if (!body.periode?.trim()) throw new HTTPException(400, { message: 'periode wajib (mis. 2025-06)' })
  if (!body.nilai || body.nilai < 1 || body.nilai > 5) {
    throw new HTTPException(400, { message: 'nilai harus antara 1–5' })
  }

  const tgl = body.tanggal ?? new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)

  const row = await query.ret(db.insert(evaluasi_karyawan).values({
    karyawan_id: body.karyawan_id,
    periode: body.periode,
    nilai: body.nilai,
    catatan: body.catatan,
    dinilai_oleh: user.id,
    tanggal: tgl,
    tenant_id: tenantId,
  }).returning())

  return c.json({ success: true, data: row }, 201)
})

// ── PUT /:id ──────────────────────────────────────────────────────────────

evaluasiRouter.put('/:id', requirePermission('*'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  if (!['pemilik', 'manajer'].includes(user.role)) {
    throw new HTTPException(403, { message: 'Hanya manajer atau pemilik yang dapat mengubah' })
  }

  const id = Number(c.req.param('id'))
  const existing = await query.find(db.select().from(evaluasi_karyawan).where(and(eq(evaluasi_karyawan.id, id), eq(evaluasi_karyawan.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Evaluasi tidak ditemukan' })

  const body = await c.req.json<Partial<{ nilai: number; catatan: string; periode: string }>>()

  if (body.nilai !== undefined && (body.nilai < 1 || body.nilai > 5)) {
    throw new HTTPException(400, { message: 'nilai harus antara 1–5' })
  }

  const updated = await query.ret(db.update(evaluasi_karyawan).set({
    nilai: body.nilai ?? existing.nilai,
    catatan: body.catatan !== undefined ? body.catatan : existing.catatan,
    periode: body.periode ?? existing.periode,
  }).where(and(eq(evaluasi_karyawan.id, id), eq(evaluasi_karyawan.tenant_id, tenantId))).returning())

  return c.json({ success: true, data: updated })
})

// ── DELETE /:id ───────────────────────────────────────────────────────────

evaluasiRouter.delete('/:id', requirePermission('*'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  if (!['pemilik', 'manajer'].includes(user.role)) {
    throw new HTTPException(403, { message: 'Hanya manajer atau pemilik yang dapat menghapus' })
  }

  const id = Number(c.req.param('id'))
  const existing = await query.find(db.select({ id: evaluasi_karyawan.id }).from(evaluasi_karyawan).where(and(eq(evaluasi_karyawan.id, id), eq(evaluasi_karyawan.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Evaluasi tidak ditemukan' })

  await query.exec(db.delete(evaluasi_karyawan).where(and(eq(evaluasi_karyawan.id, id), eq(evaluasi_karyawan.tenant_id, tenantId))))
  return c.json({ success: true, data: null })
})
