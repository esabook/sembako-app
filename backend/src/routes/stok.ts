import { Hono } from 'hono'
import { eq, desc, and } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, sqlite } from '../db/index.ts'
import { barang, mutasi_stok, kategori, satuan } from '../db/schema.ts'
import { catatLog } from '../utils/log.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import type { JWTPayload } from './auth.ts'

export const stokRouter = new Hono<{ Variables: { user: JWTPayload } }>()

stokRouter.use('*', authMiddleware)

// ── GET /stok — list semua barang + status stok ───────────────────────────

stokRouter.get('/', requirePermission('stok.lihat'), async (c) => {
  const rows = db
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
    .all()

  return c.json({ success: true, data: rows })
})

// ── GET /stok/:id/mutasi — riwayat mutasi per barang ─────────────────────

stokRouter.get('/:id/mutasi', requirePermission('stok.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const rows = db
    .select()
    .from(mutasi_stok)
    .where(eq(mutasi_stok.barang_id, id))
    .orderBy(desc(mutasi_stok.tanggal))
    .limit(100)
    .all()

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

  const br = db.select().from(barang).where(eq(barang.id, body.barang_id)).get()
  if (!br) throw new HTTPException(404, { message: 'Barang tidak ditemukan' })

  const selisih = body.stok_baru - br.stok_sekarang

  const tgl = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 19)

  sqlite.transaction(() => {
    db.insert(mutasi_stok).values({
      barang_id: body.barang_id,
      tanggal: tgl,
      jenis: 'koreksi',
      referensi_tipe: 'koreksi_manual',
      referensi_id: user.id,
      jumlah_sebelum: br.stok_sekarang,
      jumlah_perubahan: selisih,
      jumlah_sesudah: body.stok_baru,
      dicatat_oleh: user.id,
    }).run()

    db.update(barang)
      .set({ stok_sekarang: body.stok_baru })
      .where(eq(barang.id, body.barang_id))
      .run()
  })()

  catatLog(user.id, 'koreksi_stok', 'stok', body.barang_id, {
    nama_barang: br.nama_barang,
    stok_sebelum: br.stok_sekarang,
    stok_sesudah: body.stok_baru,
    selisih,
    alasan: body.alasan,
  })
  return c.json({ success: true, data: { selisih } })
})
