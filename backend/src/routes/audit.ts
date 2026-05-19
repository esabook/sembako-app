import type { JWTPayload } from './auth.ts'
import { Hono } from 'hono'
import { and, desc, eq, gte, like, lte, sql } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { log_aktivitas, karyawan } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'

export const auditRouter = new Hono<{ Variables: { user: JWTPayload } }>()

auditRouter.use('*', authMiddleware)
auditRouter.use('*', requirePermission('laporan.lihat'))

// ── GET /audit ─────────────────────────────────────────────────────────────

auditRouter.get('/', async (c) => {
  const q = c.req.query()
  const page = Math.max(1, Number(q.page) || 1)
  const perPage = Math.min(100, Math.max(10, Number(q.per_page) || 50))
  const offset = (page - 1) * perPage

  const conditions = []
  if (q.karyawan_id) conditions.push(eq(log_aktivitas.karyawan_id, Number(q.karyawan_id)))
  if (q.modul)       conditions.push(eq(log_aktivitas.modul, q.modul))
  if (q.aksi)        conditions.push(like(log_aktivitas.aksi, `%${q.aksi}%`))
  if (q.dari)        conditions.push(gte(log_aktivitas.waktu, q.dari))
  if (q.sampai)      conditions.push(lte(log_aktivitas.waktu, q.sampai + ' 23:59:59'))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const rows = db.select({
    id:            log_aktivitas.id,
    aksi:          log_aktivitas.aksi,
    modul:         log_aktivitas.modul,
    referensi_id:  log_aktivitas.referensi_id,
    detail_json:   log_aktivitas.detail_json,
    waktu:         log_aktivitas.waktu,
    ip_address:    log_aktivitas.ip_address,
    nama_karyawan: karyawan.nama,
    role_karyawan: karyawan.role,
  })
    .from(log_aktivitas)
    .leftJoin(karyawan, eq(log_aktivitas.karyawan_id, karyawan.id))
    .where(where)
    .orderBy(desc(log_aktivitas.id))
    .limit(perPage)
    .offset(offset)
    .all()

  const total = (db.select({ n: sql<number>`count(*)` })
    .from(log_aktivitas)
    .where(where)
    .get())?.n ?? 0

  return c.json({
    success: true,
    data: { rows, total, page, per_page: perPage },
  })
})

// ── GET /audit/export ──────────────────────────────────────────────────────

auditRouter.get('/export', async (c) => {
  const q = c.req.query()
  const conditions = []
  if (q.karyawan_id) conditions.push(eq(log_aktivitas.karyawan_id, Number(q.karyawan_id)))
  if (q.modul)       conditions.push(eq(log_aktivitas.modul, q.modul))
  if (q.aksi)        conditions.push(like(log_aktivitas.aksi, `%${q.aksi}%`))
  if (q.dari)        conditions.push(gte(log_aktivitas.waktu, q.dari))
  if (q.sampai)      conditions.push(lte(log_aktivitas.waktu, q.sampai + ' 23:59:59'))
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const rows = db.select({
    id:            log_aktivitas.id,
    waktu:         log_aktivitas.waktu,
    aksi:          log_aktivitas.aksi,
    modul:         log_aktivitas.modul,
    referensi_id:  log_aktivitas.referensi_id,
    detail_json:   log_aktivitas.detail_json,
    nama_karyawan: karyawan.nama,
    role_karyawan: karyawan.role,
    ip_address:    log_aktivitas.ip_address,
  })
    .from(log_aktivitas)
    .leftJoin(karyawan, eq(log_aktivitas.karyawan_id, karyawan.id))
    .where(where)
    .orderBy(desc(log_aktivitas.id))
    .limit(5000)
    .all()

  const header = 'ID,Waktu,Aksi,Modul,Referensi ID,Karyawan,Role,Detail,IP\n'
  const csvEsc = (s: unknown) => `"${String(s ?? '').replace(/"/g, '""')}"`
  const body = rows.map(r =>
    [r.id, r.waktu, r.aksi, r.modul, r.referensi_id ?? '',
     r.nama_karyawan ?? '', r.role_karyawan ?? '',
     typeof r.detail_json === 'object' ? JSON.stringify(r.detail_json) : (r.detail_json ?? ''),
     r.ip_address ?? ''].map(csvEsc).join(',')
  ).join('\n')

  return new Response(header + body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
})

// ── GET /audit/karyawan-list ───────────────────────────────────────────────
// untuk dropdown filter

auditRouter.get('/karyawan-list', async (c) => {
  const rows = db.select({ id: karyawan.id, nama: karyawan.nama, role: karyawan.role })
    .from(karyawan)
    .orderBy(karyawan.nama)
    .all()
  return c.json({ success: true, data: rows })
})

// ── GET /audit/modul-list ──────────────────────────────────────────────────
// distinct modul yang sudah ada di log

auditRouter.get('/modul-list', async (c) => {
  const rows = db.selectDistinct({ modul: log_aktivitas.modul })
    .from(log_aktivitas)
    .orderBy(log_aktivitas.modul)
    .all()
  return c.json({ success: true, data: rows.map(r => r.modul) })
})
