import { Hono } from 'hono'
import { eq, and, isNotNull } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import { karyawan, absensi, jadwal_kerja, tipe_shift } from '../db/schema.ts'
import { bus } from '../lib/event-bus.ts'

export const absensiKioskRouter = new Hono()

function getWaktuJakarta(): { tanggal: string; jam: string } {
  const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' })
  return { tanggal: now.slice(0, 10), jam: now.slice(11, 16) }
}

function diffMenit(jamA: string, jamB: string): number {
  const [ha = 0, ma = 0] = jamA.split(':').map(Number)
  const [hb = 0, mb = 0] = jamB.split(':').map(Number)
  return (hb * 60 + mb) - (ha * 60 + ma)
}

// GET /absensi-kiosk/karyawan — daftar karyawan aktif yang sudah punya PIN (publik)
absensiKioskRouter.get('/karyawan', async (c) => {
  const tokoId = c.req.query('toko_id') ? Number(c.req.query('toko_id')) : null
  const list = await query.findAll(db
    .select({ id: karyawan.id, nama: karyawan.nama })
    .from(karyawan)
    .where(and(
      eq(karyawan.is_active, true),
      isNotNull(karyawan.pin_absensi),
      tokoId ? eq(karyawan.toko_id, tokoId) : undefined,
    ))
    .orderBy(karyawan.nama)
    )
  return c.json({ success: true, data: list })
})

// POST /absensi-kiosk/check-pin — verifikasi PIN untuk karyawan tertentu
absensiKioskRouter.post('/check-pin', async (c) => {
  const body = await c.req.json<{ karyawan_id?: number; pin?: string }>()
  const pin = body.pin ?? ''
  if (!body.karyawan_id) throw new HTTPException(400, { message: 'karyawan_id wajib' })
  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    throw new HTTPException(400, { message: 'PIN harus 4 digit angka' })
  }

  const k = await query.find(db
    .select({ id: karyawan.id, nama: karyawan.nama, role: karyawan.role, pin_absensi: karyawan.pin_absensi, toko_id: karyawan.toko_id })
    .from(karyawan)
    .where(and(eq(karyawan.id, body.karyawan_id), eq(karyawan.is_active, true)))
    )

  if (!k || !k.pin_absensi) throw new HTTPException(401, { message: 'PIN tidak valid' })
  if (!await Bun.password.verify(pin, k.pin_absensi)) throw new HTTPException(401, { message: 'PIN salah' })

  const { tanggal } = getWaktuJakarta()
  const tenantId = k.toko_id ?? 1
  const existing = await query.find(db
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
  const body = await c.req.json<{ karyawan_id?: number }>()
  if (!body.karyawan_id) throw new HTTPException(400, { message: 'karyawan_id wajib' })

  const { tanggal, jam } = getWaktuJakarta()

  // B4 POC — cek SOP checklist sebelum clock-in
  const beforeResult = await bus.emitBefore('absensi.masuk', { karyawan_id: body.karyawan_id, tanggal })
  if (!beforeResult.ok) {
    return c.json({ success: false, error: beforeResult.reason, data: beforeResult.data }, 428)
  }

  const k2 = await query.find(db
    .select({ toko_id: karyawan.toko_id })
    .from(karyawan)
    .where(eq(karyawan.id, body.karyawan_id))
    )
  const tenantId = k2?.toko_id ?? 1

  const existing = await query.find(db
    .select({ id: absensi.id })
    .from(absensi)
    .where(and(eq(absensi.karyawan_id, body.karyawan_id), eq(absensi.tanggal, tanggal), eq(absensi.tenant_id, tenantId)))
    )
  if (existing) throw new HTTPException(409, { message: 'Sudah clock in hari ini' })

  const jadwal = await query.find(db
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
  const body = await c.req.json<{ karyawan_id?: number }>()
  if (!body.karyawan_id) throw new HTTPException(400, { message: 'karyawan_id wajib' })

  const { tanggal, jam } = getWaktuJakarta()

  const kp = await query.find(db.select({ toko_id: karyawan.toko_id }).from(karyawan).where(eq(karyawan.id, body.karyawan_id)))
  const tenantId = kp?.toko_id ?? 1

  const existing = await query.find(db
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
