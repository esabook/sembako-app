import { Hono } from 'hono'
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.ts'
import { penggajian, karyawan, absensi, kasbon, jurnal_kas } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import type { JWTPayload } from './auth.ts'

export const penggajianRouter = new Hono()
penggajianRouter.use('*', authMiddleware)

function hitungHariKerja(tahun: number, bulan: number): number {
  // Hitung hari Senin–Sabtu dalam bulan
  let count = 0
  const date = new Date(tahun, bulan - 1, 1)
  while (date.getMonth() === bulan - 1) {
    if (date.getDay() !== 0) count++ // 0 = Minggu
    date.setDate(date.getDate() + 1)
  }
  return count
}

// GET / — list penggajian (filter: bulan YYYY-MM, karyawan_id, status)
penggajianRouter.get('/', requirePermission('gaji.lihat'), async (c) => {
  const bulan = c.req.query('bulan')
  const karyawanId = c.req.query('karyawan_id') ? Number(c.req.query('karyawan_id')) : undefined
  const status = c.req.query('status') as 'draft' | 'approved' | 'dibayar' | undefined

  const conds: ReturnType<typeof eq>[] = []
  if (bulan) conds.push(eq(penggajian.periode_bulan, bulan))
  if (karyawanId) conds.push(eq(penggajian.karyawan_id, karyawanId))
  if (status) conds.push(eq(penggajian.status, status))

  const rows = db
    .select({
      id: penggajian.id,
      karyawan_id: penggajian.karyawan_id,
      nama_karyawan: karyawan.nama,
      tipe_gaji: karyawan.tipe_gaji,
      periode_bulan: penggajian.periode_bulan,
      hari_kerja: penggajian.hari_kerja,
      hari_hadir: penggajian.hari_hadir,
      gaji_pokok: penggajian.gaji_pokok,
      tunjangan: penggajian.tunjangan,
      potongan_kasbon: penggajian.potongan_kasbon,
      potongan_lain: penggajian.potongan_lain,
      total_gaji: penggajian.total_gaji,
      status: penggajian.status,
    })
    .from(penggajian)
    .leftJoin(karyawan, eq(penggajian.karyawan_id, karyawan.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(penggajian.periode_bulan, karyawan.nama)
    .all()

  return c.json({ success: true, data: rows })
})

// POST /generate — generate penggajian untuk semua karyawan aktif pada bulan tertentu
penggajianRouter.post('/generate', requirePermission('gaji.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const body = await c.req.json<{ bulan: string; hari_kerja?: number }>()

  if (!body.bulan || !/^\d{4}-\d{2}$/.test(body.bulan)) {
    throw new HTTPException(400, { message: 'bulan wajib format YYYY-MM' })
  }

  const [tahun, bln] = body.bulan.split('-').map(Number) as [number, number]
  const hariKerja = body.hari_kerja ?? hitungHariKerja(tahun, bln)

  const semua_karyawan = db
    .select({
      id: karyawan.id,
      nama: karyawan.nama,
      gaji_pokok: karyawan.gaji_pokok,
      tipe_gaji: karyawan.tipe_gaji,
    })
    .from(karyawan)
    .where(eq(karyawan.is_active, true))
    .all()

  const generated: (typeof penggajian.$inferSelect)[] = []
  const skipped: number[] = []

  for (const k of semua_karyawan) {
    // Cek sudah ada belum
    const sudahAda = db
      .select({ id: penggajian.id })
      .from(penggajian)
      .where(and(eq(penggajian.karyawan_id, k.id), eq(penggajian.periode_bulan, body.bulan)))
      .get()

    if (sudahAda) { skipped.push(k.id); continue }

    // Hitung hari hadir dari absensi
    const rekapRow = db
      .select({ hadir: sql<number>`COUNT(*)` })
      .from(absensi)
      .where(and(
        eq(absensi.karyawan_id, k.id),
        eq(absensi.status, 'hadir'),
        gte(absensi.tanggal, `${body.bulan}-01`),
        lte(absensi.tanggal, `${body.bulan}-31`),
      ))
      .get()
    const hariHadir = rekapRow?.hadir ?? 0

    // Total cicilan kasbon aktif bulan ini
    const kasbonRows = db
      .select({ cicilan: kasbon.cicilan_per_bulan })
      .from(kasbon)
      .where(and(eq(kasbon.karyawan_id, k.id), eq(kasbon.status, 'aktif')))
      .all()
    const potonganKasbon = kasbonRows.reduce((s, r) => s + r.cicilan, 0)

    // Hitung total gaji
    const gajiBase =
      k.tipe_gaji === 'harian' ? k.gaji_pokok * hariHadir : k.gaji_pokok
    const total = Math.max(0, gajiBase - potonganKasbon)

    const row = db
      .insert(penggajian)
      .values({
        karyawan_id: k.id,
        periode_bulan: body.bulan,
        hari_kerja: hariKerja,
        hari_hadir: hariHadir,
        gaji_pokok: k.gaji_pokok,
        tunjangan: 0,
        potongan_kasbon: potonganKasbon,
        potongan_lain: 0,
        total_gaji: total,
        status: 'draft',
      })
      .returning()
      .get()

    generated.push(row)
  }

  return c.json({
    success: true,
    data: { generated: generated.length, skipped: skipped.length, rows: generated },
  })
})

// PUT /:id — update tunjangan, potongan_lain, atau status
penggajianRouter.put('/:id', requirePermission('gaji.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{
    tunjangan?: number
    potongan_lain?: number
    status?: 'draft' | 'approved' | 'dibayar'
    kas_bank_id?: number
  }>()

  const existing = db
    .select()
    .from(penggajian)
    .where(eq(penggajian.id, id))
    .get()
  if (!existing) throw new HTTPException(404, { message: 'Data penggajian tidak ditemukan' })

  // Recalculate total jika ada perubahan tunjangan/potongan
  const tunjangan = body.tunjangan ?? existing.tunjangan
  const potonganLain = body.potongan_lain ?? existing.potongan_lain
  const karyw = db.select({ tipe_gaji: karyawan.tipe_gaji }).from(karyawan).where(eq(karyawan.id, existing.karyawan_id)).get()
  const gajiBase =
    karyw?.tipe_gaji === 'harian'
      ? existing.gaji_pokok * existing.hari_hadir
      : existing.gaji_pokok
  const total = Math.max(0, gajiBase + tunjangan - existing.potongan_kasbon - potonganLain)

  const row = db
    .update(penggajian)
    .set({
      tunjangan,
      potongan_lain: potonganLain,
      total_gaji: total,
      status: body.status ?? existing.status,
      updated_at: sql`(datetime('now','localtime'))`,
    })
    .where(eq(penggajian.id, id))
    .returning()
    .get()

  // Jika status dibayar: potong kasbon aktif dan catat jurnal kas
  if (body.status === 'dibayar' && existing.status !== 'dibayar') {
    // Potong sisa kasbon karyawan yang masih aktif
    const kasbonAktif = db
      .select()
      .from(kasbon)
      .where(and(eq(kasbon.karyawan_id, existing.karyawan_id), eq(kasbon.status, 'aktif')))
      .all()

    for (const kb of kasbonAktif) {
      const sisa = Math.max(0, kb.sisa_kasbon - kb.cicilan_per_bulan)
      db.update(kasbon)
        .set({
          sisa_kasbon: sisa,
          status: sisa <= 0 ? 'lunas' : 'aktif',
          updated_at: sql`(datetime('now','localtime'))`,
        })
        .where(eq(kasbon.id, kb.id))
        .run()
    }

    // Catat jurnal kas jika kas_bank_id disediakan
    if (body.kas_bank_id) {
      db.insert(jurnal_kas).values({
        tanggal: new Date().toISOString().slice(0, 10),
        kas_bank_id: body.kas_bank_id,
        jenis: 'keluar',
        kategori: 'gaji',
        referensi_tipe: 'penggajian',
        referensi_id: id,
        keterangan: `Gaji ${existing.periode_bulan}`,
        jumlah: row!.total_gaji,
        dicatat_oleh: user.id,
      }).run()
    }
  }

  return c.json({ success: true, data: row })
})

// DELETE /:id — hapus draft
penggajianRouter.delete('/:id', requirePermission('gaji.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = db.select({ id: penggajian.id, status: penggajian.status }).from(penggajian).where(eq(penggajian.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Data penggajian tidak ditemukan' })
  if (existing.status !== 'draft') throw new HTTPException(400, { message: 'Hanya draft yang bisa dihapus' })
  db.delete(penggajian).where(eq(penggajian.id, id)).run()
  return c.json({ success: true, data: null })
})
