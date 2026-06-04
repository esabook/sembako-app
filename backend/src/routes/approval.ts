// ── B5: Approval Route ────────────────────────────────────────────────────
// GET  /approval            — list (filter: referensi_tipe, status)
// POST /approval/:id/setujui — manajer/pemilik setujui
// POST /approval/:id/tolak   — manajer/pemilik tolak

import { Hono } from 'hono'
import { eq, and, desc } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.ts'
import { approval } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import type { JWTPayload } from './auth.ts'
import { bus } from '../lib/event-bus.ts'

export const approvalRouter = new Hono<{ Variables: { user: JWTPayload } }>()

approvalRouter.use('*', authMiddleware)

// ── GET / — list approval dengan filter ──────────────────────────────────

approvalRouter.get('/', requirePermission('*'), async (c) => {
  const referensiTipe = c.req.query('referensi_tipe')
  const status = c.req.query('status') as 'menunggu' | 'disetujui' | 'ditolak' | undefined
  const limit = Math.min(Number(c.req.query('limit') ?? 100), 500)

  const conds = []
  if (referensiTipe) conds.push(eq(approval.referensi_tipe, referensiTipe))
  if (status) conds.push(eq(approval.status, status))

  const rows = db
    .select({
      id: approval.id,
      referensi_tipe: approval.referensi_tipe,
      referensi_id: approval.referensi_id,
      status: approval.status,
      catatan_pengaju: approval.catatan_pengaju,
      catatan_proses: approval.catatan_proses,
      dibuat_at: approval.dibuat_at,
      diproses_at: approval.diproses_at,
      diminta_oleh: approval.diminta_oleh,
      diproses_oleh: approval.diproses_oleh,
    })
    .from(approval)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(approval.dibuat_at))
    .limit(limit)
    .all()

  return c.json({ success: true, data: rows })
})

// ── POST /:id/setujui ─────────────────────────────────────────────────────

approvalRouter.post('/:id/setujui', requirePermission('*'), async (c) => {
  const user = c.get('user') as JWTPayload
  if (!['pemilik', 'manajer'].includes(user.role)) {
    throw new HTTPException(403, { message: 'Hanya manajer atau pemilik yang dapat menyetujui' })
  }

  const id = Number(c.req.param('id'))
  let catatan: string | undefined
  try {
    const body = await c.req.json<{ catatan?: string }>()
    catatan = body.catatan
  } catch { /* body opsional */ }

  const row = db.select().from(approval).where(eq(approval.id, id)).get()
  if (!row) throw new HTTPException(404, { message: 'Approval tidak ditemukan' })
  if (row.status !== 'menunggu') {
    throw new HTTPException(409, { message: `Approval sudah ${row.status}` })
  }

  const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 19)
  const updated = db
    .update(approval)
    .set({ status: 'disetujui', diproses_oleh: user.id, catatan_proses: catatan, diproses_at: now })
    .where(eq(approval.id, id))
    .returning()
    .get()

  bus.emit('approval.disetujui', {
    approval_id: id,
    referensi_tipe: row.referensi_tipe,
    referensi_id: row.referensi_id,
    diproses_oleh: user.id,
  })

  return c.json({ success: true, data: updated })
})

// ── POST /:id/tolak ───────────────────────────────────────────────────────

approvalRouter.post('/:id/tolak', requirePermission('*'), async (c) => {
  const user = c.get('user') as JWTPayload
  if (!['pemilik', 'manajer'].includes(user.role)) {
    throw new HTTPException(403, { message: 'Hanya manajer atau pemilik yang dapat menolak' })
  }

  const id = Number(c.req.param('id'))
  let catatan: string | undefined
  try {
    const body = await c.req.json<{ catatan?: string }>()
    catatan = body.catatan
  } catch { /* body opsional */ }

  const row = db.select().from(approval).where(eq(approval.id, id)).get()
  if (!row) throw new HTTPException(404, { message: 'Approval tidak ditemukan' })
  if (row.status !== 'menunggu') {
    throw new HTTPException(409, { message: `Approval sudah ${row.status}` })
  }

  const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 19)
  const updated = db
    .update(approval)
    .set({ status: 'ditolak', diproses_oleh: user.id, catatan_proses: catatan, diproses_at: now })
    .where(eq(approval.id, id))
    .returning()
    .get()

  bus.emit('approval.ditolak', {
    approval_id: id,
    referensi_tipe: row.referensi_tipe,
    referensi_id: row.referensi_id,
    diproses_oleh: user.id,
  })

  return c.json({ success: true, data: updated })
})
