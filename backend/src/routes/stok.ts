import { Hono } from 'hono'
import { eq, desc, and, gte, lte, ne, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import { barang, mutasi_stok, kategori, satuan, karyawan, penjualan, penjualan_detail } from '../db/schema.ts'
import { catatLog } from '../utils/log.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import type { JWTPayload } from './auth.ts'

export const stokRouter = new Hono<{ Variables: { user: JWTPayload } }>()

stokRouter.use('*', authMiddleware)

// ── GET /stok — list semua barang + status stok ───────────────────────────

stokRouter.get('/', requirePermission('stok.lihat'), async (c) => {
  const rows = await query.findAll(db
    .select({
      id: barang.id,
      kode_barang: barang.kode_barang,
      nama_barang: barang.nama_barang,
      stok_sekarang: barang.stok_sekarang,
      stok_minimum: barang.stok_minimum,
      lokasi_rak: barang.lokasi_rak,
      nama_kategori: kategori.nama,
      nama_satuan: satuan.nama,
      singkatan_satuan: satuan.singkatan,
    })
    .from(barang)
    .leftJoin(kategori, eq(barang.kategori_id, kategori.id))
    .leftJoin(satuan, eq(barang.satuan_dasar_id, satuan.id))
    .where(eq(barang.is_active, true))
    )

  return c.json({ success: true, data: rows })
})

// ── GET /stok/alert-prediktif — prediksi barang yang akan habis ──────────
// Hitung rata-rata penjualan 7 hari terakhir → estimasi hari tersisa

stokRouter.get('/alert-prediktif', requirePermission('stok.lihat'), async (c) => {
  const hariPrediksi = Number(c.req.query('hari') ?? 7)

  const tujuhHariLalu = new Date(Date.now() - 7 * 86400000)
    .toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)

  const velRows = await query.findAll(db
    .select({
      barang_id: penjualan_detail.barang_id,
      total_qty: sql<number>`SUM(${penjualan_detail.jumlah})`,
    })
    .from(penjualan_detail)
    .leftJoin(penjualan, eq(penjualan_detail.penjualan_id, penjualan.id))
    .where(and(
      ne(penjualan.status, 'void'),
      gte(penjualan.tanggal, tujuhHariLalu),
    ))
    .groupBy(penjualan_detail.barang_id)
    )

  const velMap = new Map(velRows.map(r => [r.barang_id, r.total_qty / 7]))

  const barangList = await query.findAll(db
    .select({
      id: barang.id,
      kode_barang: barang.kode_barang,
      nama_barang: barang.nama_barang,
      stok_sekarang: barang.stok_sekarang,
      stok_minimum: barang.stok_minimum,
      satuan: satuan.singkatan,
    })
    .from(barang)
    .leftJoin(satuan, eq(barang.satuan_dasar_id, satuan.id))
    .where(eq(barang.is_active, true))
    )

  const hasil = barangList
    .map(b => {
      const avg = velMap.get(b.id) ?? 0
      const hari_tersisa = avg > 0 ? Math.floor(b.stok_sekarang / avg) : null
      return { ...b, avg_harian: Math.round(avg * 100) / 100, hari_tersisa }
    })
    .filter(b => b.avg_harian > 0 && b.hari_tersisa !== null && b.hari_tersisa <= hariPrediksi)
    .sort((a, b) => (a.hari_tersisa ?? 999) - (b.hari_tersisa ?? 999))

  return c.json({ success: true, data: hasil })
})

// ── GET /stok/:id/mutasi — riwayat mutasi per barang ─────────────────────

stokRouter.get('/:id/mutasi', requirePermission('stok.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const dari = c.req.query('dari')
  const sampai = c.req.query('sampai')
  const limit = Math.min(Number(c.req.query('limit') ?? 200), 500)

  const conditions = [eq(mutasi_stok.barang_id, id)]
  if (dari) conditions.push(gte(mutasi_stok.tanggal, dari))
  if (sampai) conditions.push(lte(mutasi_stok.tanggal, sampai + ' 23:59:59'))

  const rows = await query.findAll(db
    .select({
      id: mutasi_stok.id,
      tanggal: mutasi_stok.tanggal,
      jenis: mutasi_stok.jenis,
      referensi_tipe: mutasi_stok.referensi_tipe,
      referensi_id: mutasi_stok.referensi_id,
      jumlah_sebelum: mutasi_stok.jumlah_sebelum,
      jumlah_perubahan: mutasi_stok.jumlah_perubahan,
      jumlah_sesudah: mutasi_stok.jumlah_sesudah,
      dicatat_oleh_nama: karyawan.nama,
    })
    .from(mutasi_stok)
    .leftJoin(karyawan, eq(mutasi_stok.dicatat_oleh, karyawan.id))
    .where(and(...conditions))
    .orderBy(desc(mutasi_stok.tanggal))
    .limit(limit)
    )

  return c.json({ success: true, data: rows })
})

// ── POST /stok/koreksi — koreksi manual ──────────────────────────────────

stokRouter.post('/koreksi', requirePermission('stok.edit'), async (c) => {
  const user = c.get('user') as JWTPayload
  const body = await c.req.json<{
    barang_id: number
    stok_baru: number
    alasan: string
  }>()

  if (body.stok_baru < 0) throw new HTTPException(400, { message: 'Stok tidak boleh negatif' })
  if (!body.alasan?.trim()) throw new HTTPException(400, { message: 'Alasan koreksi wajib diisi' })

  const br = await query.find(db.select().from(barang).where(eq(barang.id, body.barang_id)))
  if (!br) throw new HTTPException(404, { message: 'Barang tidak ditemukan' })

  const selisih = body.stok_baru - br.stok_sekarang

  const tgl = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 19)

  await withTransaction(async (tx) => {
    await query.exec(db.insert(mutasi_stok).values({
      barang_id: body.barang_id,
      tanggal: tgl,
      jenis: 'koreksi',
      referensi_tipe: 'koreksi_manual',
      referensi_id: user.id,
      jumlah_sebelum: br.stok_sekarang,
      jumlah_perubahan: selisih,
      jumlah_sesudah: body.stok_baru,
      dicatat_oleh: user.id,
    }))

    await query.exec(db.update(barang)
      .set({ stok_sekarang: body.stok_baru })
      .where(eq(barang.id, body.barang_id))
    )
  })

  catatLog(user.id, 'koreksi_stok', 'stok', body.barang_id, {
    nama_barang: br.nama_barang,
    stok_sebelum: br.stok_sekarang,
    stok_sesudah: body.stok_baru,
    selisih,
    alasan: body.alasan,
  })
  return c.json({ success: true, data: { selisih } })
})

// ── GET /stok/rekonsiliasi — deteksi drift stok_sekarang vs mutasi terakhir ──

stokRouter.get('/rekonsiliasi', requirePermission('stok.edit'), async (c) => {
  // Ambil jumlah_sesudah dari mutasi terakhir tiap barang
  const mutasiTerakhir = await query.findAll(db
    .select({
      barang_id: mutasi_stok.barang_id,
      jumlah_sesudah: mutasi_stok.jumlah_sesudah,
      tanggal: mutasi_stok.tanggal,
      id: mutasi_stok.id,
    })
    .from(mutasi_stok)
    .where(sql`${mutasi_stok.id} = (
      SELECT id FROM mutasi_stok m2
      WHERE m2.barang_id = ${mutasi_stok.barang_id}
      ORDER BY m2.id DESC LIMIT 1
    )`)
    )

  const mutasiMap = new Map(mutasiTerakhir.map((m) => [m.barang_id, m]))

  const semuaBarang = await query.findAll(db
    .select({
      id: barang.id,
      kode_barang: barang.kode_barang,
      nama_barang: barang.nama_barang,
      stok_sekarang: barang.stok_sekarang,
    })
    .from(barang)
    .where(eq(barang.is_active, true))
    )

  const drift = []
  const tanpaMutasi = []

  for (const b of semuaBarang) {
    const m = mutasiMap.get(b.id)
    if (!m) {
      // Barang aktif tapi belum pernah ada mutasi
      if (b.stok_sekarang !== 0) {
        tanpaMutasi.push({ id: b.id, kode_barang: b.kode_barang, nama_barang: b.nama_barang, stok_sekarang: b.stok_sekarang })
      }
      continue
    }
    const selisih = b.stok_sekarang - m.jumlah_sesudah
    if (Math.abs(selisih) > 0.001) {
      drift.push({
        id: b.id,
        kode_barang: b.kode_barang,
        nama_barang: b.nama_barang,
        stok_sekarang: b.stok_sekarang,
        stok_dari_mutasi: m.jumlah_sesudah,
        selisih,
        mutasi_terakhir_id: m.id,
        mutasi_terakhir_tgl: m.tanggal,
      })
    }
  }

  return c.json({
    success: true,
    data: {
      total_barang_aktif: semuaBarang.length,
      barang_drift: drift.length,
      barang_tanpa_mutasi: tanpaMutasi.length,
      drift,
      tanpa_mutasi: tanpaMutasi,
      keterangan: drift.length === 0 && tanpaMutasi.length === 0
        ? 'Semua stok konsisten ✓'
        : 'Ada ketidaksesuaian stok — gunakan koreksi manual untuk menyamakan',
    },
  })
})
