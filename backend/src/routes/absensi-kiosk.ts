import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query } from '../db/index.ts'
import { karyawan, absensi, jadwal_kerja, tipe_shift } from '../db/schema.ts'
import { bus } from '../lib/event-bus.ts'
import { authMiddleware } from '../middleware/auth.ts'
import type { JWTPayload } from './auth.ts'

export const absensiKioskRouter = new Hono<{ Variables: { user: JWTPayload } }>()

absensiKioskRouter.use('*', authMiddleware)

function getWaktuJakarta(): { tanggal: string; jam: string } {
  const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' })
  return { tanggal: now.slice(0, 10), jam: now.slice(11, 16) }
}

function diffMenit(jamA: string, jamB: string): number {
  const [ha = 0, ma = 0] = jamA.split(':').map(Number)
  const [hb = 0, mb = 0] = jamB.split(':').map(Number)
  return (hb * 60 + mb) - (ha * 60 + ma)
}

// GET /absensi-kiosk/karyawan — daftar karyawan aktif dalam tenant yang login
absensiKioskRouter.get('/karyawan', async (c) => {
  const user = c.get('user')
  const tenantId = user.tenant_id
  const list = await query.findAll<{ id: number; nama: string; pin_absensi: string | null }>(db
    .select({ id: karyawan.id, nama: karyawan.nama, pin_absensi: karyawan.pin_absensi })
    .from(karyawan)
    .where(and(
      eq(karyawan.is_active, true),
      eq(karyawan.toko_id, tenantId),
    ))
    .orderBy(karyawan.nama)
    )
  return c.json({ success: true, data: list.map(k => ({ id: k.id, nama: k.nama, has_pin: k.pin_absensi !== null })) })
})

// POST /absensi-kiosk/check-pin — verifikasi PIN untuk karyawan tertentu
absensiKioskRouter.post('/check-pin', async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{ karyawan_id?: number; pin?: string }>()
  const pin = body.pin ?? ''
  if (!body.karyawan_id) throw new HTTPException(400, { message: 'karyawan_id wajib' })
  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    throw new HTTPException(400, { message: 'PIN harus 4 digit angka' })
  }

  const k = await query.find<{ id: number; nama: string; role: string; pin_absensi: string | null; toko_id: number | null }>(db
    .select({ id: karyawan.id, nama: karyawan.nama, role: karyawan.role, pin_absensi: karyawan.pin_absensi, toko_id: karyawan.toko_id })
    .from(karyawan)
    .where(and(eq(karyawan.id, body.karyawan_id), eq(karyawan.is_active, true)))
    )

  if (!k || k.toko_id !== user.tenant_id) throw new HTTPException(403, { message: 'Akses tidak diizinkan' })
  if (!k.pin_absensi) throw new HTTPException(401, { message: 'PIN tidak valid' })
  if (!await Bun.password.verify(pin, k.pin_absensi)) throw new HTTPException(401, { message: 'PIN salah' })

  const { tanggal } = getWaktuJakarta()
  const tenantId = k.toko_id
  const existing = await query.find<{ jam_masuk: string | null; jam_keluar: string | null }>(db
    .select({ jam_masuk: absensi.jam_masuk, jam_keluar: absensi.jam_keluar })
    .from(absensi)
    .where(and(eq(absensi.karyawan_id, k.id), eq(absensi.tanggal, tanggal), eq(absensi.tenant_id, tenantId)))
    )

  let status_hari_ini: 'belum' | 'masuk' | 'selesai'
  if (!existing) status_hari_ini = 'belum'
  else if (!existing.jam_keluar) status_hari_ini = 'masuk'
  else status_hari_ini = 'selesai'

  return c.json({
    success: true,
    data: { id: k.id, nama: k.nama, role: k.role, status_hari_ini },
  })
})

// POST /absensi-kiosk/check-password — verifikasi password login untuk karyawan tertentu
absensiKioskRouter.post('/check-password', async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{ karyawan_id?: number; password?: string }>()
  if (!body.karyawan_id) throw new HTTPException(400, { message: 'karyawan_id wajib' })
  if (!body.password) throw new HTTPException(400, { message: 'password wajib' })

  const k = await query.find<{ id: number; nama: string; role: string; password_hash: string; toko_id: number | null }>(db
    .select({ id: karyawan.id, nama: karyawan.nama, role: karyawan.role, password_hash: karyawan.password_hash, toko_id: karyawan.toko_id })
    .from(karyawan)
    .where(and(eq(karyawan.id, body.karyawan_id), eq(karyawan.is_active, true)))
    )

  if (!k || k.toko_id !== user.tenant_id) throw new HTTPException(403, { message: 'Akses tidak diizinkan' })
  if (!await Bun.password.verify(body.password, k.password_hash)) throw new HTTPException(401, { message: 'Password salah' })

  const { tanggal } = getWaktuJakarta()
  const tenantId = k.toko_id
  const existing = await query.find<{ jam_masuk: string | null; jam_keluar: string | null }>(db
    .select({ jam_masuk: absensi.jam_masuk, jam_keluar: absensi.jam_keluar })
    .from(absensi)
    .where(and(eq(absensi.karyawan_id, k.id), eq(absensi.tanggal, tanggal), eq(absensi.tenant_id, tenantId)))
    )

  let status_hari_ini: 'belum' | 'masuk' | 'selesai'
  if (!existing) status_hari_ini = 'belum'
  else if (!existing.jam_keluar) status_hari_ini = 'masuk'
  else status_hari_ini = 'selesai'

  return c.json({
    success: true,
    data: { id: k.id, nama: k.nama, role: k.role, status_hari_ini },
  })
})

// POST /absensi-kiosk/masuk
absensiKioskRouter.post('/masuk', async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{ karyawan_id?: number }>()
  if (!body.karyawan_id) throw new HTTPException(400, { message: 'karyawan_id wajib' })

  const { tanggal, jam } = getWaktuJakarta()

  // B4 POC — cek SOP checklist sebelum clock-in
  const beforeResult = await bus.emitBefore('absensi.masuk', { karyawan_id: body.karyawan_id, tanggal })
  if (!beforeResult.ok) {
    return c.json({ success: false, error: beforeResult.reason, data: beforeResult.data }, 428)
  }

  const k2 = await query.find<{ toko_id: number | null }>(db
    .select({ toko_id: karyawan.toko_id })
    .from(karyawan)
    .where(eq(karyawan.id, body.karyawan_id))
    )

  if (!k2 || k2.toko_id !== user.tenant_id) throw new HTTPException(403, { message: 'Akses tidak diizinkan' })
  const tenantId = k2.toko_id

  const existing = await query.find(db
    .select({ id: absensi.id })
    .from(absensi)
    .where(and(eq(absensi.karyawan_id, body.karyawan_id), eq(absensi.tanggal, tanggal), eq(absensi.tenant_id, tenantId)))
    )
  if (existing) throw new HTTPException(409, { message: 'Sudah clock in hari ini' })

  const jadwal = await query.find<{ jam_mulai: string; nama: string }>(db
    .select({ jam_mulai: tipe_shift.jam_mulai, nama: tipe_shift.nama })
    .from(jadwal_kerja)
    .innerJoin(tipe_shift, eq(jadwal_kerja.tipe_shift_id, tipe_shift.id))
    .where(and(eq(jadwal_kerja.karyawan_id, body.karyawan_id), eq(jadwal_kerja.tanggal, tanggal), eq(jadwal_kerja.tenant_id, tenantId)))
    )

  let terlambat_menit: number | null = null
  let shift_nama: string | null = null
  if (jadwal) {
    shift_nama = jadwal.nama
    const diff = diffMenit(jadwal.jam_mulai, jam)
    if (diff > 0) terlambat_menit = diff
  }

  const row = await query.find(db
    .insert(absensi)
    .values({
      karyawan_id: body.karyawan_id,
      tanggal,
      jam_masuk: jam,
      shift: shift_nama,
      status: 'hadir',
      terlambat_menit,
      tenant_id: tenantId,
    })
    .returning()
    )

  bus.emit('absensi.masuk', { karyawan_id: body.karyawan_id, tanggal })
  return c.json({ success: true, data: row }, 201)
})

// POST /absensi-kiosk/pulang
absensiKioskRouter.post('/pulang', async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{ karyawan_id?: number }>()
  if (!body.karyawan_id) throw new HTTPException(400, { message: 'karyawan_id wajib' })

  const { tanggal, jam } = getWaktuJakarta()

  const kp = await query.find<{ toko_id: number | null }>(db
    .select({ toko_id: karyawan.toko_id })
    .from(karyawan)
    .where(eq(karyawan.id, body.karyawan_id))
    )

  if (!kp || kp.toko_id !== user.tenant_id) throw new HTTPException(403, { message: 'Akses tidak diizinkan' })
  const tenantId = kp.toko_id

  const existing = await query.find<{ id: number; jam_keluar: string | null }>(db
    .select({ id: absensi.id, jam_keluar: absensi.jam_keluar })
    .from(absensi)
    .where(and(eq(absensi.karyawan_id, body.karyawan_id), eq(absensi.tanggal, tanggal), eq(absensi.tenant_id, tenantId)))
    )

  if (!existing) throw new HTTPException(404, { message: 'Belum clock in hari ini' })
  if (existing.jam_keluar) throw new HTTPException(409, { message: 'Sudah clock out hari ini' })

  const row = await query.find(db
    .update(absensi)
    .set({ jam_keluar: jam })
    .where(eq(absensi.id, existing.id))
    .returning()
    )

  return c.json({ success: true, data: row })
})
