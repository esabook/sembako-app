import { Hono } from 'hono'
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, sqlite } from '../db/index.ts'
import {
  retur_penjualan, retur_penjualan_detail, retur_penjualan_tukar,
  penjualan, penjualan_detail,
  barang, mutasi_stok,
  jurnal_kas, kas_bank,
  piutang_pelanggan, pelanggan,
  karyawan, satuan,
} from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import type { JWTPayload } from './auth.ts'

export const returPenjualanRouter = new Hono<{ Variables: { user: JWTPayload } }>()

returPenjualanRouter.use('*', authMiddleware)

function noRetur(): string {
  const d = new Date()
  const tgl = d.toISOString().slice(0, 10).replace(/-/g, '')
  const rnd = Math.floor(Math.random() * 90000 + 10000)
  return `RTR-${tgl}-${rnd}`
}

function tglSekarang(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 19)
}

// ── GET /retur-penjualan ──────────────────────────────────────────────────────

returPenjualanRouter.get('/', requirePermission('penjualan.lihat'), async (c) => {
  const dari = c.req.query('dari')
  const sampai = c.req.query('sampai')

  const rows = db
    .select({
      id: retur_penjualan.id,
      no_retur: retur_penjualan.no_retur,
      penjualan_id: retur_penjualan.penjualan_id,
      no_transaksi: penjualan.no_transaksi,
      tanggal: retur_penjualan.tanggal,
      total_retur: retur_penjualan.total_retur,
      alasan: retur_penjualan.alasan,
      metode_refund: retur_penjualan.metode_refund,
      kasir_nama: karyawan.nama,
    })
    .from(retur_penjualan)
    .leftJoin(penjualan, eq(retur_penjualan.penjualan_id, penjualan.id))
    .leftJoin(karyawan, eq(retur_penjualan.kasir_id, karyawan.id))
    .where(
      and(
        dari ? gte(retur_penjualan.tanggal, dari) : undefined,
        sampai ? lte(retur_penjualan.tanggal, sampai + ' 23:59:59') : undefined,
      )
    )
    .orderBy(desc(retur_penjualan.tanggal))
    .all()

  return c.json({ success: true, data: rows })
})

// ── GET /retur-penjualan/sisa/:penjualan_id ───────────────────────────────────
// Kembalikan sisa qty yang masih bisa diretur per item dari suatu transaksi.
// Wajib di atas /:id agar Hono tidak salah match.

returPenjualanRouter.get('/sisa/:penjualan_id', requirePermission('penjualan.lihat'), async (c) => {
  const penjualanId = Number(c.req.param('penjualan_id'))
  if (!penjualanId) throw new HTTPException(400, { message: 'penjualan_id tidak valid' })

  // Ambil semua item dari transaksi asal
  const detailAsal = db
    .select({
      barang_id: penjualan_detail.barang_id,
      jumlah_asal: penjualan_detail.jumlah,
    })
    .from(penjualan_detail)
    .where(eq(penjualan_detail.penjualan_id, penjualanId))
    .all()

  if (!detailAsal.length) return c.json({ success: true, data: [] })

  // Hitung total sudah diretur per barang_id dari semua retur sebelumnya
  const sudahDireturRows = db
    .select({
      barang_id: retur_penjualan_detail.barang_id,
      sudah_diretur: sql<number>`SUM(${retur_penjualan_detail.jumlah_retur})`,
    })
    .from(retur_penjualan_detail)
    .innerJoin(retur_penjualan, eq(retur_penjualan_detail.retur_id, retur_penjualan.id))
    .where(eq(retur_penjualan.penjualan_id, penjualanId))
    .groupBy(retur_penjualan_detail.barang_id)
    .all()

  const sudahMap = new Map(sudahDireturRows.map(r => [r.barang_id, r.sudah_diretur ?? 0]))

  const result = detailAsal.map(d => ({
    barang_id: d.barang_id,
    jumlah_asal: d.jumlah_asal,
    sudah_diretur: sudahMap.get(d.barang_id) ?? 0,
    sisa: d.jumlah_asal - (sudahMap.get(d.barang_id) ?? 0),
  }))

  return c.json({ success: true, data: result })
})

// ── GET /retur-penjualan/:id ──────────────────────────────────────────────────

returPenjualanRouter.get('/:id', requirePermission('penjualan.lihat'), async (c) => {
  const id = Number(c.req.param('id'))

  const retur = db
    .select({
      id: retur_penjualan.id,
      no_retur: retur_penjualan.no_retur,
      penjualan_id: retur_penjualan.penjualan_id,
      no_transaksi: penjualan.no_transaksi,
      tanggal: retur_penjualan.tanggal,
      total_retur: retur_penjualan.total_retur,
      alasan: retur_penjualan.alasan,
      metode_refund: retur_penjualan.metode_refund,
      catatan: retur_penjualan.catatan,
      kas_bank_id: retur_penjualan.kas_bank_id,
      kasir_id: retur_penjualan.kasir_id,
      kasir_nama: karyawan.nama,
      created_at: retur_penjualan.created_at,
    })
    .from(retur_penjualan)
    .leftJoin(penjualan, eq(retur_penjualan.penjualan_id, penjualan.id))
    .leftJoin(karyawan, eq(retur_penjualan.kasir_id, karyawan.id))
    .where(eq(retur_penjualan.id, id))
    .get()

  if (!retur) throw new HTTPException(404, { message: 'Retur tidak ditemukan' })

  const items = db
    .select({
      id: retur_penjualan_detail.id,
      barang_id: retur_penjualan_detail.barang_id,
      nama_barang: barang.nama_barang,
      kode_barang: barang.kode_barang,
      satuan_id: retur_penjualan_detail.satuan_id,
      nama_satuan: satuan.nama,
      jumlah_retur: retur_penjualan_detail.jumlah_retur,
      harga_jual: retur_penjualan_detail.harga_jual,
      subtotal: retur_penjualan_detail.subtotal,
    })
    .from(retur_penjualan_detail)
    .leftJoin(barang, eq(retur_penjualan_detail.barang_id, barang.id))
    .leftJoin(satuan, eq(retur_penjualan_detail.satuan_id, satuan.id))
    .where(eq(retur_penjualan_detail.retur_id, id))
    .all()

  // Barang pengganti (hanya untuk metode tukar_barang)
  const tukarItems = db
    .select({
      id: retur_penjualan_tukar.id,
      barang_id: retur_penjualan_tukar.barang_id,
      nama_barang: barang.nama_barang,
      kode_barang: barang.kode_barang,
      satuan_id: retur_penjualan_tukar.satuan_id,
      nama_satuan: satuan.nama,
      jumlah: retur_penjualan_tukar.jumlah,
      harga_jual: retur_penjualan_tukar.harga_jual,
      subtotal: retur_penjualan_tukar.subtotal,
    })
    .from(retur_penjualan_tukar)
    .leftJoin(barang, eq(retur_penjualan_tukar.barang_id, barang.id))
    .leftJoin(satuan, eq(retur_penjualan_tukar.satuan_id, satuan.id))
    .where(eq(retur_penjualan_tukar.retur_id, id))
    .all()

  return c.json({ success: true, data: { ...retur, items, tukar_items: tukarItems } })
})

// ── POST /retur-penjualan ─────────────────────────────────────────────────────

type ItemRetur = {
  barang_id: number
  satuan_id?: number
  jumlah_retur: number
  // harga_jual TIDAK diterima dari client — diambil dari snapshot penjualan_detail
}

type ItemTukar = {
  barang_id: number
  satuan_id?: number
  jumlah: number
  harga_jual: number
}

returPenjualanRouter.post('/', requirePermission('penjualan.void'), async (c) => {
  const user = c.get('user') as JWTPayload
  const body = await c.req.json<{
    penjualan_id: number
    alasan?: string
    metode_refund: 'tunai' | 'kurang_piutang' | 'tukar_barang'
    kas_bank_id?: number  // wajib jika metode_refund = tunai
    catatan?: string
    items: ItemRetur[]
    tukar_items?: ItemTukar[]  // wajib untuk tukar_barang (opsional jika belum ditentukan)
  }>()

  if (!body.items?.length) throw new HTTPException(400, { message: 'Pilih minimal 1 item untuk diretur' })
  if (body.metode_refund === 'tunai' && !body.kas_bank_id) {
    throw new HTTPException(400, { message: 'Pilih akun kas/bank untuk refund tunai' })
  }

  // Validasi penjualan asal
  const trxAsal = db.select().from(penjualan).where(eq(penjualan.id, body.penjualan_id)).get()
  if (!trxAsal) throw new HTTPException(404, { message: 'Transaksi penjualan tidak ditemukan' })
  if (trxAsal.status === 'void') throw new HTTPException(400, { message: 'Transaksi sudah di-void, tidak bisa diretur' })

  if (body.metode_refund === 'kurang_piutang' && trxAsal.metode_bayar !== 'hutang') {
    throw new HTTPException(400, { message: 'Metode kurang_piutang hanya berlaku untuk transaksi hutang' })
  }

  // Ambil semua detail penjualan asal
  const detailAsal = db.select().from(penjualan_detail)
    .where(eq(penjualan_detail.penjualan_id, body.penjualan_id))
    .all()

  const detailMap = new Map(detailAsal.map(d => [d.barang_id, d]))

  let totalRetur = 0
  const itemsValidated: (ItemRetur & { harga_jual: number; subtotal: number })[] = []

  for (const item of body.items) {
    const detailAsli = detailMap.get(item.barang_id)
    if (!detailAsli) {
      throw new HTTPException(400, { message: `Barang ID ${item.barang_id} tidak ada di transaksi asal` })
    }
    if (item.jumlah_retur <= 0) {
      throw new HTTPException(400, { message: 'Jumlah retur harus lebih dari 0' })
    }

    // Fix 2: Cek qty kumulatif — jumlah yang sudah diretur sebelumnya
    const sudahDireturRow = db
      .select({ total: sql<number>`COALESCE(SUM(${retur_penjualan_detail.jumlah_retur}), 0)` })
      .from(retur_penjualan_detail)
      .innerJoin(retur_penjualan, eq(retur_penjualan_detail.retur_id, retur_penjualan.id))
      .where(and(
        eq(retur_penjualan.penjualan_id, body.penjualan_id),
        eq(retur_penjualan_detail.barang_id, item.barang_id),
      ))
      .get()
    const sudahDiretur = sudahDireturRow?.total ?? 0
    const sisaBolehRetur = detailAsli.jumlah - sudahDiretur

    if (item.jumlah_retur > sisaBolehRetur) {
      throw new HTTPException(400, {
        message: `Sisa qty yang bisa diretur: ${sisaBolehRetur} (sudah diretur ${sudahDiretur} dari ${detailAsli.jumlah})`,
      })
    }

    // Fix 1 + Fix 3: Gunakan harga dari snapshot, hitung net price proporsional (sudah potong diskon)
    // detailAsli.subtotal = harga_jual * jumlah - diskon_item → hargaNet = subtotal / jumlah
    const hargaNet = detailAsli.subtotal / detailAsli.jumlah
    const subtotal = hargaNet * item.jumlah_retur

    totalRetur += subtotal
    itemsValidated.push({ ...item, harga_jual: hargaNet, subtotal })
  }

  // Validasi barang pengganti (Fix 5)
  const tukarItemsValidated: (ItemTukar & { subtotal: number })[] = []
  if (body.tukar_items?.length) {
    for (const ti of body.tukar_items) {
      if (ti.jumlah <= 0) throw new HTTPException(400, { message: 'Jumlah barang pengganti harus lebih dari 0' })
      if (ti.harga_jual < 0) throw new HTTPException(400, { message: 'Harga barang pengganti tidak valid' })
      const br = db.select({ id: barang.id }).from(barang).where(eq(barang.id, ti.barang_id)).get()
      if (!br) throw new HTTPException(400, { message: `Barang pengganti ID ${ti.barang_id} tidak ditemukan` })
      tukarItemsValidated.push({ ...ti, subtotal: ti.harga_jual * ti.jumlah })
    }
  }

  const tgl = tglSekarang()
  const noRet = noRetur()

  const trxFn = sqlite.transaction(() => {
    // 1. Insert retur header
    const retur = db.insert(retur_penjualan).values({
      no_retur: noRet,
      penjualan_id: body.penjualan_id,
      tanggal: tgl,
      kasir_id: user.id,
      total_retur: totalRetur,
      alasan: body.alasan,
      metode_refund: body.metode_refund,
      kas_bank_id: body.kas_bank_id,
      catatan: body.catatan,
    }).returning().get()

    // 2. Detail item retur + kembalikan stok
    for (const item of itemsValidated) {
      db.insert(retur_penjualan_detail).values({
        retur_id: retur.id,
        barang_id: item.barang_id,
        satuan_id: item.satuan_id,
        jumlah_retur: item.jumlah_retur,
        harga_jual: item.harga_jual,
        subtotal: item.subtotal,
      }).run()

      const br = db.select({ stok: barang.stok_sekarang })
        .from(barang).where(eq(barang.id, item.barang_id)).get()
      if (!br) throw new HTTPException(400, { message: `Barang ID ${item.barang_id} tidak ditemukan` })

      db.insert(mutasi_stok).values({
        barang_id: item.barang_id,
        tanggal: tgl,
        jenis: 'masuk',
        referensi_tipe: 'retur_penjualan',
        referensi_id: retur.id,
        jumlah_sebelum: br.stok,
        jumlah_perubahan: item.jumlah_retur,
        jumlah_sesudah: br.stok + item.jumlah_retur,
        dicatat_oleh: user.id,
      }).run()

      db.update(barang)
        .set({ stok_sekarang: br.stok + item.jumlah_retur })
        .where(eq(barang.id, item.barang_id))
        .run()
    }

    // 3. Refund tunai → jurnal kas keluar
    if (body.metode_refund === 'tunai' && body.kas_bank_id) {
      db.insert(jurnal_kas).values({
        tanggal: tgl,
        kas_bank_id: body.kas_bank_id,
        jenis: 'keluar',
        kategori: 'retur_penjualan',
        referensi_tipe: 'retur_penjualan',
        referensi_id: retur.id,
        keterangan: `Refund retur ${noRet} dari ${trxAsal.no_transaksi}`,
        jumlah: totalRetur,
        dicatat_oleh: user.id,
      }).run()
    }

    // 4. Kurang piutang → kurangi sisa_piutang
    if (body.metode_refund === 'kurang_piutang') {
      const piutang = db.select().from(piutang_pelanggan)
        .where(eq(piutang_pelanggan.penjualan_id, body.penjualan_id))
        .get()

      if (piutang) {
        const sisaBaru = Math.max(0, piutang.sisa_piutang - totalRetur)
        const statusBaru = sisaBaru === 0 ? 'lunas' : 'sebagian'
        db.update(piutang_pelanggan)
          .set({ sisa_piutang: sisaBaru, status: statusBaru })
          .where(eq(piutang_pelanggan.id, piutang.id))
          .run()

        if (trxAsal.pelanggan_id) {
          const plg = db.select({ saldo: pelanggan.saldo_piutang })
            .from(pelanggan).where(eq(pelanggan.id, trxAsal.pelanggan_id)).get()
          if (plg) {
            db.update(pelanggan)
              .set({ saldo_piutang: Math.max(0, plg.saldo - totalRetur) })
              .where(eq(pelanggan.id, trxAsal.pelanggan_id!))
              .run()
          }
        }
      }
    }

    // 5. Tukar barang → catat barang pengganti + kurangi stok pengganti
    if (body.metode_refund === 'tukar_barang' && tukarItemsValidated.length) {
      for (const ti of tukarItemsValidated) {
        db.insert(retur_penjualan_tukar).values({
          retur_id: retur.id,
          barang_id: ti.barang_id,
          satuan_id: ti.satuan_id,
          jumlah: ti.jumlah,
          harga_jual: ti.harga_jual,
          subtotal: ti.subtotal,
        }).run()

        const brTukar = db.select({ stok: barang.stok_sekarang })
          .from(barang).where(eq(barang.id, ti.barang_id)).get()
        if (!brTukar) throw new HTTPException(400, { message: `Barang pengganti ID ${ti.barang_id} tidak ditemukan` })

        db.insert(mutasi_stok).values({
          barang_id: ti.barang_id,
          tanggal: tgl,
          jenis: 'keluar',
          referensi_tipe: 'retur_penjualan',
          referensi_id: retur.id,
          jumlah_sebelum: brTukar.stok,
          jumlah_perubahan: ti.jumlah,
          jumlah_sesudah: Math.max(0, brTukar.stok - ti.jumlah),
          dicatat_oleh: user.id,
        }).run()

        db.update(barang)
          .set({ stok_sekarang: Math.max(0, brTukar.stok - ti.jumlah) })
          .where(eq(barang.id, ti.barang_id))
          .run()
      }
    }

    return retur
  })

  const result = trxFn()
  return c.json({ success: true, data: result }, 201)
})
