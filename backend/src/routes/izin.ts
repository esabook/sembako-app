// ── C1: Pengajuan Izin / Cuti / Sakit ────────────────────────────────────
// GET  /izin                         — list (filter: karyawan_id, status, bulan)
// GET  /izin/:id                     — detail
// POST /izin                         — ajukan izin (karyawan sendiri)
// POST /izin/:id/setujui             — setujui (manajer/pemilik)
// POST /izin/:id/tolak               — tolak   (manajer/pemilik)

import { Hono } from 'hono'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import { pengajuan_izin, absensi, karyawan } from '../db/schema.ts'
import { authMiddleware } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import type { JWTPayload } from './auth.ts'

export const izinRouter = new Hono<{ Variables: { user: JWTPayload } }>()

izinRouter.use('*', authMiddleware)
izinRouter.use('*', tenantMiddleware)

function tglSekarang(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 19)
}

// Enumerate semua tanggal dalam range (inklusif)
function rangeTanggal(mulai: string, selesai: string): string[] {
  const hasil: string[] = []
  const cur = new Date(mulai)
  const end = new Date(selesai)
  while (cur <= end) {
    hasil.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return hasil
}

// ── GET / ─────────────────────────────────────────────────────────────────

izinRouter.get('/', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const karyawanId = c.req.query('karyawan_id') ? Number(c.req.query('karyawan_id')) : undefined
  const status = c.req.query('status') as typeof pengajuan_izin.$inferSelect['status'] | undefined
  const dari = c.req.query('dari')
  const sampai = c.req.query('sampai')

  // Kasir/gudang hanya bisa lihat data sendiri
  const isManager = ['pemilik', 'manajer'].includes(user.role)
  const targetId = isManager ? karyawanId : user.id

  const conds = []
  conds.push(eq(pengajuan_izin.tenant_id, tenantId))
  if (targetId) conds.push(eq(pengajuan_izin.karyawan_id, targetId))
  if (status) conds.push(eq(pengajuan_izin.status, status))
  if (dari) conds.push(gte(pengajuan_izin.tanggal_mulai, dari))
  if (sampai) conds.push(lte(pengajuan_izin.tanggal_mulai, sampai))

  const rows = await query.findAll(db
    .select({
      id: pengajuan_izin.id,
      karyawan_id: pengajuan_izin.karyawan_id,
      nama_karyawan: karyawan.nama,
      jenis: pengajuan_izin.jenis,
      tanggal_mulai: pengajuan_izin.tanggal_mulai,
      tanggal_selesai: pengajuan_izin.tanggal_selesai,
      alasan: pengajuan_izin.alasan,
      status: pengajuan_izin.status,
      catatan_proses: pengajuan_izin.catatan_proses,
      created_at: pengajuan_izin.created_at,
    })
    .from(pengajuan_izin)
    .leftJoin(karyawan, eq(pengajuan_izin.karyawan_id, karyawan.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(pengajuan_izin.created_at))
    )

  return c.json({ success: true, data: rows })
})

// ── GET /:id ──────────────────────────────────────────────────────────────

izinRouter.get('/:id', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))

  const row = await query.find(db
    .select({
      id: pengajuan_izin.id,
      karyawan_id: pengajuan_izin.karyawan_id,
      nama_karyawan: karyawan.nama,
      jenis: pengajuan_izin.jenis,
      tanggal_mulai: pengajuan_izin.tanggal_mulai,
      tanggal_selesai: pengajuan_izin.tanggal_selesai,
      alasan: pengajuan_izin.alasan,
      bukti_path: pengajuan_izin.bukti_path,
      status: pengajuan_izin.status,
      diproses_oleh: pengajuan_izin.diproses_oleh,
      catatan_proses: pengajuan_izin.catatan_proses,
      created_at: pengajuan_izin.created_at,
    })
    .from(pengajuan_izin)
    .leftJoin(karyawan, eq(pengajuan_izin.karyawan_id, karyawan.id))
    .where(and(eq(pengajuan_izin.id, id), eq(pengajuan_izin.tenant_id, tenantId)))
    )

  if (!row) throw new HTTPException(404, { message: 'Pengajuan tidak ditemukan' })

  const isManager = ['pemilik', 'manajer'].includes(user.role)
  if (!isManager && row.karyawan_id !== user.id) {
    throw new HTTPException(403, { message: 'Tidak boleh melihat pengajuan orang lain' })
  }

  return c.json({ success: true, data: row })
})

// ── POST / — ajukan izin ──────────────────────────────────────────────────

izinRouter.post('/', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const body = await c.req.json<{
    karyawan_id?: number   // manajer bisa ajukan untuk orang lain
    jenis: 'cuti' | 'izin' | 'sakit'
    tanggal_mulai: string
    tanggal_selesai: string
    alasan?: string
  }>()

  const isManager = ['pemilik', 'manajer'].includes(user.role)
  const targetId = isManager && body.karyawan_id ? body.karyawan_id : user.id

  if (!body.jenis) throw new HTTPException(400, { message: 'jenis wajib' })
  if (!body.tanggal_mulai || !body.tanggal_selesai) {
    throw new HTTPException(400, { message: 'tanggal_mulai dan tanggal_selesai wajib' })
  }
  if (body.tanggal_selesai < body.tanggal_mulai) {
    throw new HTTPException(400, { message: 'tanggal_selesai tidak boleh sebelum tanggal_mulai' })
  }

  const row = await query.ret(db.insert(pengajuan_izin).values({
    karyawan_id: targetId,
    jenis: body.jenis,
    tanggal_mulai: body.tanggal_mulai,
    tanggal_selesai: body.tanggal_selesai,
    alasan: body.alasan,
    status: 'menunggu',
    tenant_id: tenantId,
  }).returning())

  return c.json({ success: true, data: row }, 201)
})

// ── POST /:id/setujui ─────────────────────────────────────────────────────

izinRouter.post('/:id/setujui', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  if (!['pemilik', 'manajer'].includes(user.role)) {
    throw new HTTPException(403, { message: 'Hanya manajer atau pemilik yang dapat menyetujui' })
  }

  const id = Number(c.req.param('id'))
  let catatan: string | undefined
  try { catatan = (await c.req.json<{ catatan?: string }>()).catatan } catch { /* opsional */ }

  const row = await query.find(db.select().from(pengajuan_izin).where(and(eq(pengajuan_izin.id, id), eq(pengajuan_izin.tenant_id, tenantId))))
  if (!row) throw new HTTPException(404, { message: 'Pengajuan tidak ditemukan' })
  if (row.status !== 'menunggu') {
    throw new HTTPException(409, { message: `Pengajuan sudah ${row.status}` })
  }

  const now = tglSekarang()
  await query.exec(db.update(pengajuan_izin)
    .set({ status: 'disetujui', diproses_oleh: user.id, catatan_proses: catatan, updated_at: now })
    .where(eq(pengajuan_izin.id, id))
  )

  // Insert baris absensi untuk setiap hari dalam range
  const statusAbsensi = row.jenis === 'sakit' ? 'sakit' : 'izin'
  for (const tgl of rangeTanggal(row.tanggal_mulai, row.tanggal_selesai)) {
    const sudahAda = await query.find(db
      .select({ id: absensi.id })
      .from(absensi)
      .where(and(eq(absensi.karyawan_id, row.karyawan_id), eq(absensi.tanggal, tgl), eq(absensi.tenant_id, tenantId)))
      )

    if (!sudahAda) {
      await query.exec(db.insert(absensi).values({
        karyawan_id: row.karyawan_id,
        tanggal: tgl,
        status: statusAbsensi,
        dicatat_oleh: user.id,
        tenant_id: tenantId,
      }))
    }
  }

  const updated = await query.find(db.select().from(pengajuan_izin).where(and(eq(pengajuan_izin.id, id), eq(pengajuan_izin.tenant_id, tenantId))))
  return c.json({ success: true, data: updated })
})

// ── POST /:id/tolak ───────────────────────────────────────────────────────

izinRouter.post('/:id/tolak', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  if (!['pemilik', 'manajer'].includes(user.role)) {
    throw new HTTPException(403, { message: 'Hanya manajer atau pemilik yang dapat menolak' })
  }

  const id = Number(c.req.param('id'))
  let catatan: string | undefined
  try { catatan = (await c.req.json<{ catatan?: string }>()).catatan } catch { /* opsional */ }

  const row = await query.find(db.select().from(pengajuan_izin).where(and(eq(pengajuan_izin.id, id), eq(pengajuan_izin.tenant_id, tenantId))))
  if (!row) throw new HTTPException(404, { message: 'Pengajuan tidak ditemukan' })
  if (row.status !== 'menunggu') {
    throw new HTTPException(409, { message: `Pengajuan sudah ${row.status}` })
  }

  const now = tglSekarang()
  const updated = await query.ret(db.update(pengajuan_izin)
    .set({ status: 'ditolak', diproses_oleh: user.id, catatan_proses: catatan, updated_at: now })
    .where(eq(pengajuan_izin.id, id))
    .returning())

  return c.json({ success: true, data: updated })
})
