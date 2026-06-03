// C5: Checklist Tugas Harian (Kebersihan, dll)
import { Hono } from 'hono'
import { eq, and, desc } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.ts'
import { checklist_item, checklist_log, karyawan } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { getAuditBy, getUpdatedBy } from '../utils/audit.ts'
import type { JWTPayload } from './auth.ts'

export const tugasRouter = new Hono<{ Variables: { user: JWTPayload } }>()
tugasRouter.use('*', authMiddleware)

// ── Template Checklist Item ───────────────────────────────────────────────────

tugasRouter.get('/item', requirePermission('pelanggan.lihat'), async (c) => {
  const rows = db
    .select()
    .from(checklist_item)
    .where(eq(checklist_item.is_active, true))
    .orderBy(checklist_item.kategori, checklist_item.urutan)
    .all()
  return c.json({ success: true, data: rows })
})

tugasRouter.post('/item', requirePermission('*'), async (c) => {
  const body = await c.req.json<{
    nama: string; kategori?: string; urutan?: number
  }>()
  if (!body.nama?.trim()) throw new HTTPException(400, { message: 'nama wajib' })

  const row = db.insert(checklist_item).values({
    nama: body.nama.trim(),
    kategori: body.kategori?.trim() ?? 'kebersihan',
    urutan: body.urutan ?? 0,
    ...getAuditBy(c),
  }).returning().get()

  return c.json({ success: true, data: row }, 201)
})

tugasRouter.put('/item/:id', requirePermission('*'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<{ nama: string; kategori: string; urutan: number; is_active: boolean }>>()
  const existing = db.select({ id: checklist_item.id }).from(checklist_item).where(eq(checklist_item.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Item tidak ditemukan' })

  const row = db.update(checklist_item).set({
    ...(body.nama !== undefined && { nama: body.nama }),
    ...(body.kategori !== undefined && { kategori: body.kategori }),
    ...(body.urutan !== undefined && { urutan: body.urutan }),
    ...(body.is_active !== undefined && { is_active: body.is_active }),
    ...getUpdatedBy(c),
  }).where(eq(checklist_item.id, id)).returning().get()

  return c.json({ success: true, data: row })
})

tugasRouter.delete('/item/:id', requirePermission('*'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = db.select({ id: checklist_item.id }).from(checklist_item).where(eq(checklist_item.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Item tidak ditemukan' })
  db.update(checklist_item).set({ is_active: false }).where(eq(checklist_item.id, id)).run()
  return c.json({ success: true, data: null })
})

// ── Log Harian ────────────────────────────────────────────────────────────────

tugasRouter.get('/log', requirePermission('pelanggan.lihat'), async (c) => {
  const tanggal = c.req.query('tanggal') ?? new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)

  const rows = db
    .select({
      log_id: checklist_log.id,
      item_id: checklist_item.id,
      nama: checklist_item.nama,
      kategori: checklist_item.kategori,
      urutan: checklist_item.urutan,
      selesai: checklist_log.selesai,
      catatan: checklist_log.catatan,
      nama_karyawan: karyawan.nama,
      tanggal: checklist_log.tanggal,
    })
    .from(checklist_item)
    .leftJoin(
      checklist_log,
      and(eq(checklist_log.item_id, checklist_item.id), eq(checklist_log.tanggal, tanggal)),
    )
    .leftJoin(karyawan, eq(checklist_log.karyawan_id, karyawan.id))
    .where(eq(checklist_item.is_active, true))
    .orderBy(checklist_item.kategori, checklist_item.urutan)
    .all()

  return c.json({ success: true, data: rows })
})

tugasRouter.post('/log/tandai', requirePermission('pelanggan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const body = await c.req.json<{ item_id: number; selesai: boolean; catatan?: string; tanggal?: string }>()

  if (!body.item_id) throw new HTTPException(400, { message: 'item_id wajib' })
  const tanggal = body.tanggal ?? new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)

  const existing = db.select({ id: checklist_log.id })
    .from(checklist_log)
    .where(and(eq(checklist_log.item_id, body.item_id), eq(checklist_log.tanggal, tanggal)))
    .get()

  let row
  if (existing) {
    row = db.update(checklist_log).set({
      selesai: body.selesai,
      catatan: body.catatan,
      karyawan_id: user.id,
    }).where(eq(checklist_log.id, existing.id)).returning().get()
  } else {
    row = db.insert(checklist_log).values({
      item_id: body.item_id,
      tanggal,
      karyawan_id: user.id,
      selesai: body.selesai,
      catatan: body.catatan,
    }).returning().get()
  }

  return c.json({ success: true, data: row })
})

tugasRouter.get('/ringkasan', requirePermission('*'), async (c) => {
  const dari = c.req.query('dari')
  const sampai = c.req.query('sampai')

  if (!dari || !sampai) throw new HTTPException(400, { message: 'dari dan sampai wajib' })

  const rows = db
    .select({
      tanggal: checklist_log.tanggal,
      total_item: checklist_item.id,
      selesai: checklist_log.selesai,
    })
    .from(checklist_log)
    .innerJoin(checklist_item, eq(checklist_log.item_id, checklist_item.id))
    .where(and(
      eq(checklist_item.is_active, true),
    ))
    .all()

  const byDate: Record<string, { total: number; selesai: number }> = {}
  for (const r of rows) {
    if (r.tanggal < dari || r.tanggal > sampai) continue
    if (!byDate[r.tanggal]) byDate[r.tanggal] = { total: 0, selesai: 0 }
    byDate[r.tanggal]!.total++
    if (r.selesai) byDate[r.tanggal]!.selesai++
  }

  return c.json({ success: true, data: byDate })
})
