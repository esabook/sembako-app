import { Hono } from 'hono'
import { eq, and, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import { sop_rule, sop_instance, karyawan } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import type { JWTPayload } from './auth.ts'

export const sopRouter = new Hono<{ Variables: { user: JWTPayload } }>()
sopRouter.use('*', authMiddleware)
sopRouter.use('*', tenantMiddleware)

// ── GET /sop/rule — list semua rule ──────────────────────────────────────
sopRouter.get('/rule', requirePermission('*'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const rows = await query.findAll(db.select().from(sop_rule).where(eq(sop_rule.tenant_id, tenantId)).orderBy(sop_rule.event_name, sop_rule.urutan))
  return c.json({ success: true, data: rows })
})

// ── POST /sop/rule — buat rule baru ──────────────────────────────────────
sopRouter.post('/rule', requirePermission('*'), async (c) => {
  const body = await c.req.json<{
    nama: string
    event_name: string
    tipe?: 'checklist' | 'notif' | 'blokir'
    deskripsi?: string
    config_json?: unknown
    urutan?: number
  }>()

  if (!body.nama?.trim()) throw new HTTPException(400, { message: 'nama wajib' })
  if (!body.event_name?.trim()) throw new HTTPException(400, { message: 'event_name wajib' })

  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1

  const row = await query.ret(db.insert(sop_rule).values({
    nama: body.nama,
    event_name: body.event_name,
    tipe: body.tipe ?? 'checklist',
    deskripsi: body.deskripsi,
    config_json: body.config_json ?? [],
    urutan: body.urutan ?? 0,
    tenant_id: tenantId,
  }).returning())

  return c.json({ success: true, data: row }, 201)
})

// ── PUT /sop/rule/:id — update rule ──────────────────────────────────────
sopRouter.put('/rule/:id', requirePermission('*'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const existing = await query.find(db.select().from(sop_rule).where(and(eq(sop_rule.id, id), eq(sop_rule.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Rule tidak ditemukan' })

  const body = await c.req.json<Partial<{
    nama: string
    deskripsi: string
    config_json: unknown
    is_active: boolean
    urutan: number
  }>>()

  const row = await query.ret(db.update(sop_rule).set({
    nama: body.nama ?? existing.nama,
    deskripsi: body.deskripsi !== undefined ? body.deskripsi : existing.deskripsi,
    config_json: body.config_json !== undefined ? body.config_json : existing.config_json,
    is_active: body.is_active !== undefined ? body.is_active : existing.is_active,
    urutan: body.urutan ?? existing.urutan,
  }).where(and(eq(sop_rule.id, id), eq(sop_rule.tenant_id, tenantId))).returning())

  return c.json({ success: true, data: row })
})

// ── DELETE /sop/rule/:id — nonaktifkan rule (soft) ────────────────────────
sopRouter.delete('/rule/:id', requirePermission('*'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const existing = await query.find(db.select({ id: sop_rule.id }).from(sop_rule).where(and(eq(sop_rule.id, id), eq(sop_rule.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Rule tidak ditemukan' })
  await query.exec(db.update(sop_rule).set({ is_active: false }).where(and(eq(sop_rule.id, id), eq(sop_rule.tenant_id, tenantId))))
  return c.json({ success: true, data: null })
})

// ── GET /sop/checklist-hari-ini — checklist pending untuk user ini ────────
// Dipanggil oleh kiosk setelah mendapat 428 dari /absensi-kiosk/masuk
sopRouter.get('/checklist-hari-ini', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const tanggal = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)

  const rows = await query.findAll(db
    .select({
      instance_id: sop_instance.id,
      status: sop_instance.status,
      hasil_json: sop_instance.hasil_json,
      rule_id: sop_rule.id,
      nama: sop_rule.nama,
      deskripsi: sop_rule.deskripsi,
      config_json: sop_rule.config_json,
    })
    .from(sop_instance)
    .innerJoin(sop_rule, eq(sop_instance.rule_id, sop_rule.id))
    .where(
      and(
        eq(sop_instance.karyawan_id, user.id),
        eq(sop_rule.tenant_id, tenantId),
        sql`date(${sop_instance.dibuat_at}) = ${tanggal}`,
      ),
    )
    )

  return c.json({ success: true, data: rows })
})

// ── POST /sop/checklist/:instance_id/selesai — tandai checklist selesai ──
// Body: { hasil: [{ id, checked, catatan? }] }
sopRouter.post('/checklist/:instance_id/selesai', async (c) => {
  const user = c.get('user') as JWTPayload
  const instanceId = Number(c.req.param('instance_id'))
  const body = await c.req.json<{ hasil: unknown }>()

  const instance = await query.find(db
    .select()
    .from(sop_instance)
    .where(eq(sop_instance.id, instanceId))
    )

  if (!instance) throw new HTTPException(404, { message: 'Instance tidak ditemukan' })
  if (instance.karyawan_id !== user.id) throw new HTTPException(403, { message: 'Bukan milik Anda' })
  if (instance.status !== 'pending') {
    throw new HTTPException(409, { message: `Instance sudah ${instance.status}` })
  }

  const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 19)
  const row = await query.find(db
    .update(sop_instance)
    .set({ status: 'selesai', hasil_json: body.hasil, diselesaikan_at: now })
    .where(eq(sop_instance.id, instanceId))
    .returning()
    )

  return c.json({ success: true, data: row })
})

// ── GET /sop/instance — riwayat instance (manajer/pemilik) ───────────────
sopRouter.get('/instance', requirePermission('*'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const karyawanId = c.req.query('karyawan_id') ? Number(c.req.query('karyawan_id')) : undefined
  const tanggal = c.req.query('tanggal')
  const limit = Math.min(Number(c.req.query('limit') ?? 100), 500)

  const conds = [eq(sop_rule.tenant_id, tenantId)]
  if (karyawanId) conds.push(eq(sop_instance.karyawan_id, karyawanId))
  if (tanggal) conds.push(sql`date(${sop_instance.dibuat_at}) = ${tanggal}`)

  const rows = await query.findAll(db
    .select({
      id: sop_instance.id,
      rule_nama: sop_rule.nama,
      event_name: sop_rule.event_name,
      karyawan_nama: karyawan.nama,
      status: sop_instance.status,
      hasil_json: sop_instance.hasil_json,
      dibuat_at: sop_instance.dibuat_at,
      diselesaikan_at: sop_instance.diselesaikan_at,
    })
    .from(sop_instance)
    .innerJoin(sop_rule, eq(sop_instance.rule_id, sop_rule.id))
    .innerJoin(karyawan, eq(sop_instance.karyawan_id, karyawan.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(sop_instance.dibuat_at)
    .limit(limit)
    )

  return c.json({ success: true, data: rows })
})
