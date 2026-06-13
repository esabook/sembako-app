import { Hono } from 'hono'
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import { penggajian, karyawan, absensi, kasbon, jurnal_kas, sanksi_insentif } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import type { JWTPayload } from './auth.ts'

export const penggajianRouter = new Hono<{ Variables: { user: JWTPayload } }>()
penggajianRouter.use('*', authMiddleware)
penggajianRouter.use('*', tenantMiddleware)

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
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const bulan = c.req.query('bulan')
  const karyawanId = c.req.query('karyawan_id') ? Number(c.req.query('karyawan_id')) : undefined
  const status = c.req.query('status') as 'draft' | 'approved' | 'dibayar' | undefined

  const conds: ReturnType<typeof eq>[] = []
  conds.push(eq(penggajian.tenant_id, tenantId))
  if (bulan) conds.push(eq(penggajian.periode_bulan, bulan))
  if (karyawanId) conds.push(eq(penggajian.karyawan_id, karyawanId))
  if (status) conds.push(eq(penggajian.status, status))

  const rows = await query.findAll(db
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
    )

  return c.json({ success: true, data: rows })
})

// POST /generate — generate penggajian untuk semua karyawan aktif pada bulan tertentu
penggajianRouter.post('/generate', requirePermission('gaji.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const body = await c.req.json<{ bulan: string; hari_kerja?: number }>()

  if (!body.bulan || !/^\d{4}-\d{2}$/.test(body.bulan)) {
    throw new HTTPException(400, { message: 'bulan wajib format YYYY-MM' })
  }

  const [tahun, bln] = body.bulan.split('-').map(Number) as [number, number]
  const hariKerja = body.hari_kerja ?? hitungHariKerja(tahun, bln)

  const semua_karyawan = await query.findAll(db
    .select({
      id: karyawan.id,
      nama: karyawan.nama,
      gaji_pokok: karyawan.gaji_pokok,
      tipe_gaji: karyawan.tipe_gaji,
    })
    .from(karyawan)
    .where(and(eq(karyawan.is_active, true), eq(karyawan.toko_id, tenantId)))
    )

  // Batch-load semua data yang dibutuhkan sebelum loop — hindari N+1
  const karyawanIds = semua_karyawan.map((k) => k.id)

  const existingSet = new Set(
    await query.findAll(db.select({ karyawan_id: penggajian.karyawan_id })
      .from(penggajian)
      .where(and(eq(penggajian.tenant_id, tenantId), eq(penggajian.periode_bulan, body.bulan)))
    )
      .map((r) => r.karyawan_id)
  )

  const absensiRows = karyawanIds.length
    ? await query.findAll(db.select({ karyawan_id: absensi.karyawan_id, hadir: sql<number>`COUNT(*)` })
        .from(absensi)
        .where(and(
          inArray(absensi.karyawan_id, karyawanIds),
          eq(absensi.status, 'hadir'),
          gte(absensi.tanggal, `${body.bulan}-01`),
          lte(absensi.tanggal, `${body.bulan}-31`),
        ))
        .groupBy(absensi.karyawan_id)
        )
    : []
  const absensiMap = new Map(absensiRows.map((r) => [r.karyawan_id, r.hadir]))

  const kasbonAll = karyawanIds.length
    ? await query.findAll(db.select({ karyawan_id: kasbon.karyawan_id, cicilan: kasbon.cicilan_per_bulan })
        .from(kasbon)
        .where(and(inArray(kasbon.karyawan_id, karyawanIds), eq(kasbon.status, 'aktif')))
    )
    : []
  const kasbonMap = new Map<number, number>()
  for (const r of kasbonAll) {
    kasbonMap.set(r.karyawan_id, (kasbonMap.get(r.karyawan_id) ?? 0) + r.cicilan)
  }

  const siAll = karyawanIds.length
    ? await query.findAll(db.select({ karyawan_id: sanksi_insentif.karyawan_id, tipe: sanksi_insentif.tipe, jumlah: sanksi_insentif.jumlah })
        .from(sanksi_insentif)
        .where(and(
          inArray(sanksi_insentif.karyawan_id, karyawanIds),
          eq(sanksi_insentif.periode_bulan, body.bulan),
        ))
        )
    : []
  const insentifMap = new Map<number, number>()
  const sanksiMap = new Map<number, number>()
  for (const r of siAll) {
    if (r.tipe === 'insentif') insentifMap.set(r.karyawan_id, (insentifMap.get(r.karyawan_id) ?? 0) + r.jumlah)
    else sanksiMap.set(r.karyawan_id, (sanksiMap.get(r.karyawan_id) ?? 0) + r.jumlah)
  }

  const generated: (typeof penggajian.$inferSelect)[] = []
  const skipped: number[] = []

  for (const k of semua_karyawan) {
    if (existingSet.has(k.id)) { skipped.push(k.id); continue }

    const hariHadir = absensiMap.get(k.id) ?? 0
    const potonganKasbon = kasbonMap.get(k.id) ?? 0
    const totalInsentif = insentifMap.get(k.id) ?? 0
    const totalSanksi = sanksiMap.get(k.id) ?? 0

    const gajiBase =
      k.tipe_gaji === 'harian' ? k.gaji_pokok * hariHadir : k.gaji_pokok
    const tunjangan = totalInsentif
    const potonganLain = totalSanksi
    const total = Math.max(0, gajiBase + tunjangan - potonganKasbon - potonganLain)

    const row = await query.find(db
      .insert(penggajian)
      .values({
        tenant_id: tenantId,
        karyawan_id: k.id,
        periode_bulan: body.bulan,
        hari_kerja: hariKerja,
        hari_hadir: hariHadir,
        gaji_pokok: k.gaji_pokok,
        tunjangan,
        potongan_kasbon: potonganKasbon,
        potongan_lain: potonganLain,
        total_gaji: total,
        status: 'draft',
      })
      .returning()
      )

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
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{
    tunjangan?: number
    potongan_lain?: number
    status?: 'draft' | 'approved' | 'dibayar'
    kas_bank_id?: number
  }>()

  const existing = await query.find(db
    .select()
    .from(penggajian)
    .where(and(eq(penggajian.id, id), eq(penggajian.tenant_id, tenantId)))
    )
  if (!existing) throw new HTTPException(404, { message: 'Data penggajian tidak ditemukan' })

  // Recalculate total jika ada perubahan tunjangan/potongan
  const tunjangan = body.tunjangan ?? existing.tunjangan
  const potonganLain = body.potongan_lain ?? existing.potongan_lain
  const karyw = await query.find(db.select({ tipe_gaji: karyawan.tipe_gaji }).from(karyawan).where(eq(karyawan.id, existing.karyawan_id)))
  const gajiBase =
    karyw?.tipe_gaji === 'harian'
      ? existing.gaji_pokok * existing.hari_hadir
      : existing.gaji_pokok
  const total = Math.max(0, gajiBase + tunjangan - existing.potongan_kasbon - potonganLain)

  const row = await withTransaction(async (tx) => {
    const updated = await query.find(db
      .update(penggajian)
      .set({
        tunjangan,
        potongan_lain: potonganLain,
        total_gaji: total,
        status: body.status ?? existing.status,
        updated_at: isoNow(),
      })
      .where(eq(penggajian.id, id))
      .returning()
      )

    if (!updated) throw new HTTPException(500, { message: 'Update penggajian gagal' })

    // Jika status dibayar: potong kasbon aktif dan catat jurnal kas
    if (body.status === 'dibayar' && existing.status !== 'dibayar') {
      const kasbonAktif = await query.findAll(db
        .select()
        .from(kasbon)
        .where(and(eq(kasbon.karyawan_id, existing.karyawan_id), eq(kasbon.status, 'aktif')))
        )

      for (const kb of kasbonAktif) {
        const sisa = Math.max(0, kb.sisa_kasbon - kb.cicilan_per_bulan)
        await query.exec(db.update(kasbon)
          .set({
            sisa_kasbon: sisa,
            status: sisa <= 0 ? 'lunas' : 'aktif',
            updated_at: isoNow(),
          })
          .where(eq(kasbon.id, kb.id))
          )
      }

      if (body.kas_bank_id) {
        await query.exec(db.insert(jurnal_kas).values({
          tanggal: new Date().toISOString().slice(0, 10),
          kas_bank_id: body.kas_bank_id,
          jenis: 'keluar',
          kategori: 'gaji',
          referensi_tipe: 'penggajian',
          referensi_id: id,
          keterangan: `Gaji ${existing.periode_bulan}`,
          jumlah: updated.total_gaji,
          dicatat_oleh: user.id,
        }))
      }
    }

    return updated
  })

  return c.json({ success: true, data: row })
})

// DELETE /:id — hapus draft
penggajianRouter.delete('/:id', requirePermission('gaji.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const id = Number(c.req.param('id'))
  const existing = await query.find(db.select({ id: penggajian.id, status: penggajian.status }).from(penggajian).where(and(eq(penggajian.id, id), eq(penggajian.tenant_id, tenantId))))
  if (!existing) throw new HTTPException(404, { message: 'Data penggajian tidak ditemukan' })
  if (existing.status !== 'draft') throw new HTTPException(400, { message: 'Hanya draft yang bisa dihapus' })
  await query.exec(db.delete(penggajian).where(and(eq(penggajian.id, id), eq(penggajian.tenant_id, tenantId))))
  return c.json({ success: true, data: null })
})
