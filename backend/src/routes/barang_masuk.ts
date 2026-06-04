import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, sqlite } from '../db/index.ts'
import {
  barang_masuk, barang_masuk_detail,
  barang, mutasi_stok,
  hutang_supplier, supplier,
  histori_harga_beli,
} from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import type { JWTPayload } from './auth.ts'
import { saveUpload } from '../utils/upload.ts'

export const barangMasukRouter = new Hono<{ Variables: { user: JWTPayload } }>()

barangMasukRouter.use('*', authMiddleware)

function noTerima(): string {
  const d = new Date()
  const tgl = d.toISOString().slice(0, 10).replace(/-/g, '')
  const rnd = Math.floor(Math.random() * 9000 + 1000)
  return `BM-${tgl}-${rnd}`
}

function tglSekarang(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 19)
}

// ── GET /barang-masuk ─────────────────────────────────────────────────────

barangMasukRouter.get('/', requirePermission('pembelian.lihat'), async (c) => {
  const rows = db
    .select({
      id: barang_masuk.id,
      no_penerimaan: barang_masuk.no_penerimaan,
      tanggal_terima: barang_masuk.tanggal_terima,
      supplier_id: barang_masuk.supplier_id,
      nama_supplier: supplier.nama_supplier,
      no_faktur_supplier: barang_masuk.no_faktur_supplier,
      total_nilai: barang_masuk.total_nilai,
      foto_faktur_path: barang_masuk.foto_faktur_path,
    })
    .from(barang_masuk)
    .leftJoin(supplier, eq(barang_masuk.supplier_id, supplier.id))
    .orderBy(desc(barang_masuk.tanggal_terima))
    .limit(100)
    .all()

  return c.json({ success: true, data: rows })
})

// ── GET /barang-masuk/:id ─────────────────────────────────────────────────

barangMasukRouter.get('/:id', requirePermission('pembelian.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const bm = db.select().from(barang_masuk).where(eq(barang_masuk.id, id)).get()
  if (!bm) throw new HTTPException(404, { message: 'Penerimaan tidak ditemukan' })

  const items = db
    .select({
      id: barang_masuk_detail.id,
      barang_id: barang_masuk_detail.barang_id,
      nama_barang: barang.nama_barang,
      kode_barang: barang.kode_barang,
      satuan_id: barang_masuk_detail.satuan_id,
      jumlah_terima: barang_masuk_detail.jumlah_terima,
      harga_beli: barang_masuk_detail.harga_beli,
      tgl_kadaluarsa: barang_masuk_detail.tgl_kadaluarsa,
    })
    .from(barang_masuk_detail)
    .leftJoin(barang, eq(barang_masuk_detail.barang_id, barang.id))
    .where(eq(barang_masuk_detail.penerimaan_id, id))
    .all()

  return c.json({ success: true, data: { ...bm, items } })
})

// ── POST /barang-masuk — terima barang ────────────────────────────────────

type ItemMasuk = {
  barang_id: number
  satuan_id?: number
  jumlah_terima: number
  harga_beli: number
  tgl_kadaluarsa?: string
}

barangMasukRouter.post('/', requirePermission('pembelian.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const body = await c.req.json<{
    supplier_id: number
    po_id?: number
    tanggal_terima?: string
    no_faktur_supplier?: string
    terms_bayar?: number
    items: ItemMasuk[]
  }>()

  if (!body.supplier_id) throw new HTTPException(400, { message: 'Supplier wajib dipilih' })
  if (!body.items?.length) throw new HTTPException(400, { message: 'Item barang kosong' })

  const sup = db.select().from(supplier).where(eq(supplier.id, body.supplier_id)).get()
  if (!sup) throw new HTTPException(404, { message: 'Supplier tidak ditemukan' })

  const tgl = body.tanggal_terima ?? tglSekarang()
  const noTrx = noTerima()

  let totalNilai = 0
  for (const item of body.items) {
    totalNilai += item.harga_beli * item.jumlah_terima
  }

  const termsHari = body.terms_bayar ?? sup.terms_bayar

  const result = sqlite.transaction(() => {
    // 1. Buat barang_masuk header
    const bm = db.insert(barang_masuk).values({
      no_penerimaan: noTrx,
      po_id: body.po_id,
      supplier_id: body.supplier_id,
      tanggal_terima: tgl,
      no_faktur_supplier: body.no_faktur_supplier,
      total_nilai: totalNilai,
      diterima_oleh: user.id,
    }).returning().get()

    // 2. Detail + mutasi stok
    for (const item of body.items) {
      const br = db.select().from(barang).where(eq(barang.id, item.barang_id)).get()
      if (!br) throw new HTTPException(400, { message: `Barang ID ${item.barang_id} tidak ditemukan` })

      db.insert(barang_masuk_detail).values({
        penerimaan_id: bm.id,
        barang_id: item.barang_id,
        satuan_id: item.satuan_id,
        jumlah_terima: item.jumlah_terima,
        harga_beli: item.harga_beli,
        tgl_kadaluarsa: item.tgl_kadaluarsa,
      }).run()

      db.insert(mutasi_stok).values({
        barang_id: item.barang_id,
        tanggal: tgl,
        jenis: 'masuk',
        referensi_tipe: 'barang_masuk',
        referensi_id: bm.id,
        jumlah_sebelum: br.stok_sekarang,
        jumlah_perubahan: item.jumlah_terima,
        jumlah_sesudah: br.stok_sekarang + item.jumlah_terima,
        dicatat_oleh: user.id,
      }).run()

      // WAC: (stok_lama × rata_lama + jumlah_masuk × harga_baru) / (stok_lama + jumlah_masuk)
      const stokLama = br.stok_sekarang
      const rataLama = br.harga_beli_rata > 0 ? br.harga_beli_rata : br.harga_beli_terakhir
      const stokBaru = stokLama + item.jumlah_terima
      const hargaBeliBaru = stokBaru > 0
        ? (stokLama * rataLama + item.jumlah_terima * item.harga_beli) / stokBaru
        : item.harga_beli

      db.update(barang)
        .set({
          stok_sekarang: stokBaru,
          harga_beli_terakhir: item.harga_beli,
          harga_beli_rata: Math.round(hargaBeliBaru),
        })
        .where(eq(barang.id, item.barang_id))
        .run()

      db.insert(histori_harga_beli).values({
        barang_id: item.barang_id,
        supplier_id: body.supplier_id,
        barang_masuk_id: bm.id,
        harga_beli: item.harga_beli,
        tanggal_berlaku: tgl.slice(0, 10),
      }).run()
    }

    // 3. Buat hutang supplier
    const jatuhTempo = termsHari > 0
      ? new Date(Date.now() + termsHari * 86400000)
          .toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)
      : null

    db.insert(hutang_supplier).values({
      supplier_id: body.supplier_id,
      barang_masuk_id: bm.id,
      tanggal_hutang: tgl.slice(0, 10),
      tanggal_jatuh_tempo: jatuhTempo,
      total_hutang: totalNilai,
      sisa_hutang: totalNilai,
      status: 'belum',
    }).run()

    return bm
  })()

  return c.json({ success: true, data: result }, 201)
})

// ── Upload Foto Faktur ────────────────────────────────────────────────────

barangMasukRouter.post('/:id/foto', requirePermission('pembelian.buat'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = db.select().from(barang_masuk).where(eq(barang_masuk.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Penerimaan tidak ditemukan' })

  const formData = await c.req.formData()
  const file = formData.get('foto') as File | null
  if (!file || !file.size) throw new HTTPException(400, { message: 'File foto wajib diisi' })

  // Invoice disimpan resolusi tinggi agar teks faktur terbaca
  const { path: fotoPath } = await saveUpload(file, {
    subdir: 'invoice',
    prefix: id,
    mode: { type: 'passthrough' },
    quality: 90,
  })

  db.update(barang_masuk)
    .set({ foto_faktur_path: fotoPath })
    .where(eq(barang_masuk.id, id))
    .run()

  return c.json({ success: true, data: { foto_faktur_path: fotoPath } })
})
