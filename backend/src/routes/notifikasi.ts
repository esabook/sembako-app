import type { JWTPayload } from './auth.ts'
import { Hono } from 'hono'
import { eq, desc, ne, lte, gte, and } from 'drizzle-orm'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import { notifikasi_config, notifikasi_log, barang, hutang_supplier, piutang_pelanggan, pelanggan, penjualan } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'

export const notifikasiRouter = new Hono<{ Variables: { user: JWTPayload } }>()

notifikasiRouter.use('*', authMiddleware)

// Konfigurasi default semua jenis notifikasi
const JENIS_DEFAULT = [
  { jenis: 'stok_habis',         label: 'Stok Habis',              deskripsi: 'Saat stok barang mencapai 0' },
  { jenis: 'stok_kritis',        label: 'Stok Hampir Habis',       deskripsi: 'Saat stok di bawah minimum' },
  { jenis: 'barang_kadaluarsa',  label: 'Barang Mendekati Kadaluarsa', deskripsi: 'N hari sebelum kadaluarsa' },
  { jenis: 'hutang_jatuh_tempo', label: 'Hutang Jatuh Tempo',      deskripsi: 'N hari sebelum jatuh tempo hutang supplier' },
  { jenis: 'piutang_macet',      label: 'Piutang Macet',           deskripsi: 'Piutang belum lunas > N hari dari jatuh tempo' },
  { jenis: 'void_transaksi',     label: 'Void Transaksi',          deskripsi: 'Saat ada transaksi yang di-void' },
  { jenis: 'diskon_tinggi',      label: 'Diskon Tinggi',           deskripsi: 'Saat diskon melebihi N%' },
  { jenis: 'selisih_kas',        label: 'Selisih Kas Shift',       deskripsi: 'Saat tutup shift dengan selisih kas' },
  { jenis: 'ringkasan_harian',   label: 'Ringkasan Harian',        deskripsi: 'Laporan penjualan harian via WA' },
  { jenis: 'ringkasan_mingguan', label: 'Ringkasan Mingguan',      deskripsi: 'Laporan penjualan mingguan via WA' },
] as const

// ── GET /notifikasi/config ─────────────────────────────────────────────────

notifikasiRouter.get('/config', async (c) => {
  const rows = await query.findAll(db.select().from(notifikasi_config))
  const byJenis = Object.fromEntries(rows.map(r => [r.jenis, r]))

  const result = JENIS_DEFAULT.map(def => ({
    ...def,
    ...(byJenis[def.jenis] ?? {
      id: null,
      aktif: false,
      channel: 'dashboard' as const,
      threshold: null,
      jam_kirim: null,
      hari_kirim: null,
      penerima_wa: null,
      terakhir_dikirim: null,
    }),
  }))

  return c.json({ success: true, data: result })
})

// ── PUT /notifikasi/config/:jenis ──────────────────────────────────────────

notifikasiRouter.put('/config/:jenis', requirePermission('*'), async (c) => {
  const jenis = c.req.param('jenis')
  const body = await c.req.json<{
    aktif?: boolean
    channel?: 'wa' | 'dashboard' | 'keduanya'
    threshold?: number | null
    jam_kirim?: string | null
    hari_kirim?: number | null
    penerima_wa?: string | null
  }>()

  const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' })
  const existing = await query.find(db.select().from(notifikasi_config).where(eq(notifikasi_config.jenis, jenis as any)))

  if (existing) {
    await query.exec(db.update(notifikasi_config)
      .set({ ...body, updated_at: now })
      .where(eq(notifikasi_config.jenis, jenis as any))
    )
  } else {
    await query.exec(db.insert(notifikasi_config)
      .values({ jenis: jenis as any, updated_at: now, ...body })
    )
  }

  const updated = await query.find(db.select().from(notifikasi_config).where(eq(notifikasi_config.jenis, jenis as any)))
  return c.json({ success: true, data: updated })
})

// ── GET /notifikasi/log ────────────────────────────────────────────────────

notifikasiRouter.get('/log', async (c) => {
  const limit = Number(c.req.query('limit') ?? 50)
  const rows = await query.findAll(db.select().from(notifikasi_log).orderBy(desc(notifikasi_log.waktu)).limit(limit))
  return c.json({ success: true, data: rows })
})

// ── POST /notifikasi/log ───────────────────────────────────────────────────
// Dipanggil oleh backend saat event terjadi (stok habis, void, dll)

notifikasiRouter.post('/log', requirePermission('*'), async (c) => {
  const body = await c.req.json<{
    jenis: string
    channel: 'wa' | 'dashboard'
    pesan: string
    penerima?: string
    status: 'terkirim' | 'gagal' | 'pending'
    referensi_tipe?: string
    referensi_id?: number
  }>()

  const row = db.insert(notifikasi_log).values({
    jenis: body.jenis,
    channel: body.channel,
    pesan: body.pesan,
    penerima: body.penerima ?? null,
    status: body.status,
    referensi_tipe: body.referensi_tipe ?? null,
    referensi_id: body.referensi_id ?? null,
  }).returning().get()

  return c.json({ success: true, data: row })
})

// ── GET /notifikasi/check ──────────────────────────────────────────────────
// Cek kondisi terkini dan hasilkan daftar notif yang perlu dikirim

notifikasiRouter.get('/check', async (c) => {
  const configs = await query.findAll(db.select().from(notifikasi_config).where(eq(notifikasi_config.aktif, true)))
  const alerts: { jenis: string; pesan: string; referensi_tipe: string; referensi_id: number }[] = []

  for (const cfg of configs) {
    if (cfg.jenis === 'stok_habis') {
      const items = db.query.barang?.findMany?.({ where: (b: any, { eq: eq2 }: any) => eq2(b.is_active, 1) }) ?? []
      // Gunakan raw query karena relational query belum di-setup
      const stmt = db.select({
        id: barang.id,
        nama_barang: barang.nama_barang,
        stok_sekarang: barang.stok_sekarang,
      }).from(barang).where(eq(barang.is_active, true)).all()

      for (const item of stmt) {
        if ((item.stok_sekarang ?? 0) <= 0) {
          alerts.push({
            jenis: 'stok_habis',
            pesan: `Stok ${item.nama_barang} habis`,
            referensi_tipe: 'barang',
            referensi_id: item.id,
          })
        }
      }
    }

    if (cfg.jenis === 'stok_kritis') {
      const stmt = db.select({
        id: barang.id,
        nama_barang: barang.nama_barang,
        stok_sekarang: barang.stok_sekarang,
        stok_minimum: barang.stok_minimum,
      }).from(barang).where(eq(barang.is_active, true)).all()

      for (const item of stmt) {
        const min = item.stok_minimum ?? 0
        const stok = item.stok_sekarang ?? 0
        if (min > 0 && stok > 0 && stok <= min) {
          alerts.push({
            jenis: 'stok_kritis',
            pesan: `Stok ${item.nama_barang} hampir habis (${stok} tersisa, minimum ${min})`,
            referensi_tipe: 'barang',
            referensi_id: item.id,
          })
        }
      }
    }

    if (cfg.jenis === 'hutang_jatuh_tempo') {
      const threshold = cfg.threshold ?? 3
      const batas = new Date()
      batas.setDate(batas.getDate() + threshold)
      const batasStr = batas.toISOString().slice(0, 10)

      const rows = db.select({
        id: hutang_supplier.id,
        sisa_hutang: hutang_supplier.sisa_hutang,
        tanggal_jatuh_tempo: hutang_supplier.tanggal_jatuh_tempo,
      }).from(hutang_supplier).where(eq(hutang_supplier.status, 'belum')).all()

      for (const row of rows) {
        if (row.tanggal_jatuh_tempo && row.tanggal_jatuh_tempo <= batasStr) {
          alerts.push({
            jenis: 'hutang_jatuh_tempo',
            pesan: `Hutang supplier sisa Rp ${row.sisa_hutang?.toLocaleString('id-ID')} jatuh tempo ${row.tanggal_jatuh_tempo}`,
            referensi_tipe: 'hutang_supplier',
            referensi_id: row.id,
          })
        }
      }
    }

    if (cfg.jenis === 'piutang_macet') {
      const threshold = cfg.threshold ?? 7
      const batas = new Date()
      batas.setDate(batas.getDate() - threshold)
      const batasStr = batas.toISOString().slice(0, 10)

      const rows = db.select({
        id: piutang_pelanggan.id,
        sisa_piutang: piutang_pelanggan.sisa_piutang,
        tanggal_jatuh_tempo: piutang_pelanggan.tanggal_jatuh_tempo,
      }).from(piutang_pelanggan).where(eq(piutang_pelanggan.status, 'belum')).all()

      for (const row of rows) {
        if (row.tanggal_jatuh_tempo && row.tanggal_jatuh_tempo < batasStr) {
          alerts.push({
            jenis: 'piutang_macet',
            pesan: `Piutang pelanggan sisa Rp ${row.sisa_piutang?.toLocaleString('id-ID')} sudah melewati jatuh tempo lebih dari ${threshold} hari`,
            referensi_tipe: 'piutang_pelanggan',
            referensi_id: row.id,
          })
        }
      }
    }
  }

  return c.json({ success: true, data: alerts })
})

// ── GET /notifikasi/piutang-reminder — piutang jatuh tempo N hari ke depan ──

notifikasiRouter.get('/piutang-reminder', requirePermission('penjualan.lihat'), async (c) => {
  const hari = Number(c.req.query('hari') ?? 3)
  const hariIni = new Date().toISOString().slice(0, 10)
  const batas = new Date()
  batas.setDate(batas.getDate() + hari)
  const batasStr = batas.toISOString().slice(0, 10)

  const rows = db
    .select({
      id: piutang_pelanggan.id,
      no_transaksi: penjualan.no_transaksi,
      sisa_piutang: piutang_pelanggan.sisa_piutang,
      tanggal_jatuh_tempo: piutang_pelanggan.tanggal_jatuh_tempo,
      nama_pelanggan: pelanggan.nama,
      kontak: pelanggan.kontak,
    })
    .from(piutang_pelanggan)
    .leftJoin(pelanggan, eq(piutang_pelanggan.pelanggan_id, pelanggan.id))
    .leftJoin(penjualan, eq(piutang_pelanggan.penjualan_id, penjualan.id))
    .where(and(
      ne(piutang_pelanggan.status, 'lunas'),
      gte(piutang_pelanggan.tanggal_jatuh_tempo, hariIni),
      lte(piutang_pelanggan.tanggal_jatuh_tempo, batasStr),
    ))
    .orderBy(piutang_pelanggan.tanggal_jatuh_tempo)
    .all()

  return c.json({ success: true, data: rows })
})
