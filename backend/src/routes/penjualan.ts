import { Hono } from 'hono'
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, sqlite } from '../db/index.ts'
import { catatLog } from '../utils/log.ts'
import {
  penjualan, penjualan_detail,
  barang, mutasi_stok,
  piutang_pelanggan, jurnal_kas, kas_bank,
  pelanggan, karyawan,
} from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import type { JWTPayload } from './auth.ts'
import { bus } from '../lib/event-bus.ts'

export const penjualanRouter = new Hono<{ Variables: { user: JWTPayload } }>()

penjualanRouter.use('*', authMiddleware)

// ── Helpers ───────────────────────────────────────────────────────────────

function noTransaksi(): string {
  const d = new Date()
  const tgl = d.toISOString().slice(0, 10).replace(/-/g, '')
  const rnd = Math.floor(Math.random() * 90000 + 10000)
  return `TRX-${tgl}-${rnd}`
}

function tglSekarang(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 19)
}

// ── GET /penjualan — list transaksi (filter tanggal) ──────────────────────

penjualanRouter.get('/', requirePermission('penjualan.lihat'), async (c) => {
  const dari = c.req.query('dari')
  const sampai = c.req.query('sampai')
  const kasirId = c.req.query('kasir_id')

  const rows = db
    .select({
      id: penjualan.id,
      no_transaksi: penjualan.no_transaksi,
      tanggal: penjualan.tanggal,
      tipe: penjualan.tipe,
      total: penjualan.total,
      metode_bayar: penjualan.metode_bayar,
      status: penjualan.status,
      kasir_id: penjualan.kasir_id,
      retur_id: sql<number | null>`(SELECT id FROM retur_penjualan WHERE penjualan_id = penjualan.id ORDER BY id DESC LIMIT 1)`,
    })
    .from(penjualan)
    .where(
      and(
        dari ? gte(penjualan.tanggal, dari) : undefined,
        sampai ? lte(penjualan.tanggal, sampai + ' 23:59:59') : undefined,
        kasirId ? eq(penjualan.kasir_id, Number(kasirId)) : undefined,
      )
    )
    .orderBy(desc(penjualan.tanggal))
    .all()

  return c.json({ success: true, data: rows })
})

// ── GET /penjualan/:id — detail + item ────────────────────────────────────

penjualanRouter.get('/:id', requirePermission('penjualan.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const trx = db
    .select({
      id: penjualan.id,
      no_transaksi: penjualan.no_transaksi,
      pelanggan_id: penjualan.pelanggan_id,
      nama_pelanggan: pelanggan.nama,
      tanggal: penjualan.tanggal,
      tipe: penjualan.tipe,
      kasir_id: penjualan.kasir_id,
      kasir_nama: karyawan.nama,
      kode_karyawan: karyawan.kode_karyawan,
      subtotal: penjualan.subtotal,
      diskon_total: penjualan.diskon_total,
      total: penjualan.total,
      metode_bayar: penjualan.metode_bayar,
      bayar: penjualan.bayar,
      kembalian: penjualan.kembalian,
      status: penjualan.status,
    })
    .from(penjualan)
    .leftJoin(pelanggan, eq(penjualan.pelanggan_id, pelanggan.id))
    .leftJoin(karyawan, eq(penjualan.kasir_id, karyawan.id))
    .where(eq(penjualan.id, id))
    .get()
  if (!trx) throw new HTTPException(404, { message: 'Transaksi tidak ditemukan' })

  const items = db
    .select({
      id: penjualan_detail.id,
      barang_id: penjualan_detail.barang_id,
      nama_barang: barang.nama_barang,
      kode_barang: barang.kode_barang,
      satuan_id: penjualan_detail.satuan_id,
      jumlah: penjualan_detail.jumlah,
      harga_jual: penjualan_detail.harga_jual,
      diskon_item: penjualan_detail.diskon_item,
      subtotal: penjualan_detail.subtotal,
    })
    .from(penjualan_detail)
    .leftJoin(barang, eq(penjualan_detail.barang_id, barang.id))
    .where(eq(penjualan_detail.penjualan_id, id))
    .all()

  return c.json({ success: true, data: { ...trx, items } })
})

// ── POST /penjualan — buat transaksi baru ─────────────────────────────────

type ItemInput = {
  barang_id: number
  satuan_id?: number
  jumlah: number
  harga_jual: number
  diskon_item?: number
}

penjualanRouter.post('/', requirePermission('penjualan.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const body = await c.req.json<{
    pelanggan_id?: number
    tipe: 'eceran' | 'grosir'
    metode_bayar: 'tunai' | 'transfer' | 'qris' | 'hutang'
    bayar: number
    kas_bank_id?: number
    diskon_total?: number
    items: ItemInput[]
  }>()

  if (!body.items?.length) throw new HTTPException(400, { message: 'Keranjang kosong' })
  if (body.metode_bayar === 'hutang' && !body.pelanggan_id) {
    throw new HTTPException(400, { message: 'Transaksi hutang wajib memilih pelanggan' })
  }

  // Hitung total
  let subtotal = 0
  const itemsValidated: (ItemInput & { subtotal: number })[] = []

  for (const item of body.items) {
    if (!item.jumlah || item.jumlah <= 0) {
      throw new HTTPException(400, { message: 'Jumlah barang harus lebih dari 0' })
    }
    if (item.harga_jual < 0) {
      throw new HTTPException(400, { message: 'Harga jual tidak boleh negatif' })
    }
    const br = db.select().from(barang).where(eq(barang.id, item.barang_id)).get()
    if (!br || !br.is_active) {
      throw new HTTPException(400, { message: `Barang ID ${item.barang_id} tidak ditemukan` })
    }
    if (br.stok_sekarang < item.jumlah) {
      throw new HTTPException(400, {
        message: `Stok ${br.nama_barang} tidak cukup (ada: ${br.stok_sekarang}, butuh: ${item.jumlah})`,
      })
    }
    const itemSubtotal = item.harga_jual * item.jumlah - (item.diskon_item ?? 0)
    subtotal += itemSubtotal
    itemsValidated.push({ ...item, subtotal: itemSubtotal })
  }

  const diskonTotal = body.diskon_total ?? 0
  const total = subtotal - diskonTotal
  const kembalian = body.metode_bayar === 'hutang' ? 0 : Math.max(0, body.bayar - total)
  const status = body.metode_bayar === 'hutang' ? 'hutang' : 'lunas'
  const tgl = tglSekarang()
  const noTrx = noTransaksi()

  // Semua operasi dalam 1 transaksi SQLite
  const trxFn = sqlite.transaction(() => {
    // 1. Buat penjualan
    const trx = db.insert(penjualan).values({
      no_transaksi: noTrx,
      pelanggan_id: body.pelanggan_id,
      tanggal: tgl,
      tipe: body.tipe,
      kasir_id: user.id,
      subtotal,
      diskon_total: diskonTotal,
      total,
      metode_bayar: body.metode_bayar,
      bayar: body.bayar,
      kembalian,
      status,
    }).returning().get()

    // 2. Detail + mutasi stok
    for (const item of itemsValidated) {
      db.insert(penjualan_detail).values({
        penjualan_id: trx.id,
        barang_id: item.barang_id,
        satuan_id: item.satuan_id,
        jumlah: item.jumlah,
        harga_jual: item.harga_jual,
        diskon_item: item.diskon_item ?? 0,
        subtotal: item.subtotal,
      }).run()

      const br = db.select({ stok: barang.stok_sekarang })
        .from(barang).where(eq(barang.id, item.barang_id)).get()!

      db.insert(mutasi_stok).values({
        barang_id: item.barang_id,
        tanggal: tgl,
        jenis: 'keluar',
        referensi_tipe: 'penjualan',
        referensi_id: trx.id,
        jumlah_sebelum: br.stok,
        jumlah_perubahan: -item.jumlah,
        jumlah_sesudah: br.stok - item.jumlah,
        dicatat_oleh: user.id,
      }).run()

      db.update(barang)
        .set({ stok_sekarang: br.stok - item.jumlah })
        .where(eq(barang.id, item.barang_id))
        .run()
    }

    // 3. Jurnal kas (hanya jika bukan hutang)
    if (body.metode_bayar !== 'hutang') {
      let kasTujuan = body.kas_bank_id
        ? db.select().from(kas_bank).where(eq(kas_bank.id, body.kas_bank_id)).get()
        : null
      // Fallback ke kas tunai pertama jika tidak ada kas_bank_id atau tidak ditemukan
      if (!kasTujuan) {
        kasTujuan = db.select().from(kas_bank).where(eq(kas_bank.tipe, 'kas')).get()
      }
      if (kasTujuan) {
        db.insert(jurnal_kas).values({
          tanggal: tgl,
          kas_bank_id: kasTujuan.id,
          jenis: 'masuk',
          kategori: 'penjualan',
          referensi_tipe: 'penjualan',
          referensi_id: trx.id,
          keterangan: `Penjualan ${noTrx}`,
          jumlah: total,
          dicatat_oleh: user.id,
        }).run()
      }
    }

    // 4. Piutang (jika hutang)
    if (body.metode_bayar === 'hutang' && body.pelanggan_id) {
      const plg = db.select().from(pelanggan)
        .where(eq(pelanggan.id, body.pelanggan_id)).get()

      if (plg && plg.limit_piutang > 0 && plg.saldo_piutang + total > plg.limit_piutang) {
        throw new HTTPException(422, { message: `Limit piutang ${plg.nama} terlampaui` })
      }

      db.insert(piutang_pelanggan).values({
        pelanggan_id: body.pelanggan_id,
        penjualan_id: trx.id,
        tanggal_piutang: tgl,
        total_piutang: total,
        sisa_piutang: total,
        status: 'belum',
      }).run()

      if (plg) {
        db.update(pelanggan)
          .set({ saldo_piutang: plg.saldo_piutang + total })
          .where(eq(pelanggan.id, body.pelanggan_id))
          .run()
      }
    }

    return trx
  })

  const result = trxFn()

  bus.emit('checkout', {
    penjualan_id: result.id,
    total: result.total,
    kasir_id: user.id,
    items: body.items.map((i) => ({ barang_id: i.barang_id, jumlah: i.jumlah })),
  })

  return c.json({ success: true, data: result }, 201)
})

// ── POST /penjualan/:id/void ───────────────────────────────────────────────

penjualanRouter.post('/:id/void', requirePermission('penjualan.void'), async (c) => {
  const id = Number(c.req.param('id'))
  const user = c.get('user') as JWTPayload

  const trx = db.select().from(penjualan).where(eq(penjualan.id, id)).get()
  if (!trx) throw new HTTPException(404, { message: 'Transaksi tidak ditemukan' })
  if (trx.status === 'void') throw new HTTPException(400, { message: 'Transaksi sudah di-void' })

  const items = db.select().from(penjualan_detail)
    .where(eq(penjualan_detail.penjualan_id, id)).all()

  const tgl = tglSekarang()

  const voidFn = sqlite.transaction(() => {
    // Kembalikan stok
    for (const item of items) {
      const br = db.select({ stok: barang.stok_sekarang })
        .from(barang).where(eq(barang.id, item.barang_id)).get()!

      db.insert(mutasi_stok).values({
        barang_id: item.barang_id,
        tanggal: tgl,
        jenis: 'masuk',
        referensi_tipe: 'void_penjualan',
        referensi_id: id,
        jumlah_sebelum: br.stok,
        jumlah_perubahan: item.jumlah,
        jumlah_sesudah: br.stok + item.jumlah,
        dicatat_oleh: user.id,
      }).run()

      db.update(barang)
        .set({ stok_sekarang: br.stok + item.jumlah })
        .where(eq(barang.id, item.barang_id))
        .run()
    }

    db.update(penjualan).set({ status: 'void' }).where(eq(penjualan.id, id)).run()
  })

  voidFn()
  catatLog(user.id, 'void', 'penjualan', id, {
    no_transaksi: trx.no_transaksi,
    total: trx.total,
  })
  return c.json({ success: true, data: null })
})
