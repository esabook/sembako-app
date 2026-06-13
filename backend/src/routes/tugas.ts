// C5: Checklist Tugas Harian (Kebersihan, dll)
import { Hono } from 'hono'
import { eq, and, desc } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import { checklist_item, checklist_log, karyawan } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import { getAuditBy, getUpdatedBy } from '../utils/audit.ts'
import type { JWTPayload } from './auth.ts'

export const tugasRouter = new Hono<{ Variables: { user: JWTPayload } }>()
tugasRouter.use('*', authMiddleware)
tugasRouter.use('*', tenantMiddleware)

// ── Template Checklist Item ───────────────────────────────────────────────────

tugasRouter.get('/item', requirePermission('pelanggan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const rows = await query.findAll(db
    .select()
    .from(checklist_item)
    .where(and(eq(checklist_item.is_active, true), eq(checklist_item.tenant_id, tenantId)))
    .orderBy(checklist_item.kategori, checklist_item.urutan)
    )
  return c.json({ success: true, data: rows })
})

tugasRouter.post('/item', requirePermission('absensi.diri'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const body = await c.req.json<{
    nama: string; kategori?: string; urutan?: number
  }>()
  if (!body.nama?.trim()) throw new HTTPException(400, { message: 'nama wajib' })

  const row = await query.ret(db.insert(checklist_item).values({
    nama: body.nama.trim(),
    kategori: body.kategori?.trim() ?? 'kebersihan',
    urutan: body.urutan ?? 0,
    tenant_id: tenantId,
    ...getAuditBy(c),
  }).returning())

  return c.json({ success: true, data: row }, 201)
})

tugasRouter.put('/item/:id', requirePermission('absensi.diri'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<{ nama: string; kategori: string; urutan: number; is_active: boolean }>>()
  const existing = await query.find(db.select({ id: checklist_item.id }).from(checklist_item).where(and(eq(checklist_item.id, id), eq(checklist_item.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Item tidak ditemukan' })

  const row = await query.ret(db.update(checklist_item).set({
    ...(body.nama !== undefined && { nama: body.nama }),
    ...(body.kategori !== undefined && { kategori: body.kategori }),
    ...(body.urutan !== undefined && { urutan: body.urutan }),
    ...(body.is_active !== undefined && { is_active: body.is_active }),
    ...getUpdatedBy(c),
  }).where(and(eq(checklist_item.id, id), eq(checklist_item.tenant_id, tenantId))).returning())

  return c.json({ success: true, data: row })
})

tugasRouter.delete('/item/:id', requirePermission('absensi.diri'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const existing = await query.find(db.select({ id: checklist_item.id }).from(checklist_item).where(and(eq(checklist_item.id, id), eq(checklist_item.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Item tidak ditemukan' })
  await query.exec(db.update(checklist_item).set({ is_active: false }).where(and(eq(checklist_item.id, id), eq(checklist_item.tenant_id, tenantId))))
  return c.json({ success: true, data: null })
})

// ── Log Harian ────────────────────────────────────────────────────────────────

tugasRouter.get('/log', requirePermission('pelanggan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const tanggal = c.req.query('tanggal') ?? new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)

  const rows = await query.findAll(db
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
      and(eq(checklist_log.item_id, checklist_item.id), eq(checklist_log.tanggal, tanggal), eq(checklist_log.tenant_id, tenantId)),
    )
    .leftJoin(karyawan, eq(checklist_log.karyawan_id, karyawan.id))
    .where(eq(checklist_item.is_active, true))
    .orderBy(checklist_item.kategori, checklist_item.urutan)
    )

  return c.json({ success: true, data: rows })
})

tugasRouter.post('/log/tandai', requirePermission('pelanggan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const body = await c.req.json<{ item_id: number; selesai: boolean; catatan?: string; tanggal?: string }>()

  if (!body.item_id) throw new HTTPException(400, { message: 'item_id wajib' })
  const tanggal = body.tanggal ?? new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)

  const existing = await query.find(db.select({ id: checklist_log.id })
    .from(checklist_log)
    .where(and(eq(checklist_log.item_id, body.item_id), eq(checklist_log.tanggal, tanggal), eq(checklist_log.tenant_id, tenantId)))
  )

  let row
  if (existing) {
    row = await query.ret(db.update(checklist_log).set({
      selesai: body.selesai,
      catatan: body.catatan,
      karyawan_id: user.id,
    }).where(eq(checklist_log.id, existing.id)).returning())
  } else {
    row = await query.ret(db.insert(checklist_log).values({
      item_id: body.item_id,
      tanggal,
      karyawan_id: user.id,
      selesai: body.selesai,
      catatan: body.catatan,
      tenant_id: tenantId,
    }).returning())
  }

  return c.json({ success: true, data: row })
})

tugasRouter.get('/ringkasan', requirePermission('karyawan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const dari = c.req.query('dari')
  const sampai = c.req.query('sampai')

  if (!dari || !sampai) throw new HTTPException(400, { message: 'dari dan sampai wajib' })

  const rows = await query.findAll(db
    .select({
      tanggal: checklist_log.tanggal,
      total_item: checklist_item.id,
      selesai: checklist_log.selesai,
    })
    .from(checklist_log)
    .innerJoin(checklist_item, eq(checklist_log.item_id, checklist_item.id))
    .where(and(
      eq(checklist_item.is_active, true),
      eq(checklist_log.tenant_id, tenantId),
    ))
    )

  const byDate: Record<string, { total: number; selesai: number }> = {}
  for (const r of rows) {
    if (r.tanggal < dari || r.tanggal > sampai) continue
    if (!byDate[r.tanggal]) byDate[r.tanggal] = { total: 0, selesai: 0 }
    byDate[r.tanggal]!.total++
    if (r.selesai) byDate[r.tanggal]!.selesai++
  }

  return c.json({ success: true, data: byDate })
})
