import { Hono } from 'hono'
import { eq, and, or, isNull, gte, lte, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.ts'
import { promo, promo_target, barang, kategori } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import type { JWTPayload } from './auth.ts'

export const promoRouter = new Hono()

promoRouter.use('*', authMiddleware)

function tglHariIni(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 10)
}

// ── GET /promo — list semua promo dengan target ────────────────────────────

promoRouter.get('/', requirePermission('penjualan.lihat'), async (c) => {
  const rows = db.select().from(promo).orderBy(promo.created_at).all()
  const targets = db.select().from(promo_target).all()

  const data = rows.map((p) => ({
    ...p,
    targets: targets.filter((t) => t.promo_id === p.id),
  }))

  return c.json({ success: true, data })
})

// ── GET /promo/aktif — promo aktif hari ini (untuk kasir) ─────────────────

promoRouter.get('/aktif', requirePermission('penjualan.lihat'), async (c) => {
  const hari = tglHariIni()

  const rows = db.select().from(promo).where(
    and(
      eq(promo.aktif, true),
      or(isNull(promo.berlaku_mulai), lte(promo.berlaku_mulai, hari)),
      or(isNull(promo.berlaku_sampai), gte(promo.berlaku_sampai, hari)),
      or(isNull(promo.max_penggunaan), sql`${promo.jumlah_dipakai} < ${promo.max_penggunaan}`),
    )
  ).all()

  const targets = rows.length > 0
    ? db.select().from(promo_target).where(
        sql`${promo_target.promo_id} IN (${sql.join(rows.map((r) => sql`${r.id}`), sql`, `)})`
      ).all()
    : []

  const data = rows.map((p) => ({
    ...p,
    targets: targets.filter((t) => t.promo_id === p.id),
  }))

  return c.json({ success: true, data })
})

// ── GET /promo/:id ────────────────────────────────────────────────────────

promoRouter.get('/:id', requirePermission('penjualan.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const p = db.select().from(promo).where(eq(promo.id, id)).get()
  if (!p) throw new HTTPException(404, { message: 'Promo tidak ditemukan' })

  const targets = db.select().from(promo_target).where(eq(promo_target.promo_id, id)).all()
  return c.json({ success: true, data: { ...p, targets } })
})

// ── POST /promo — buat promo baru ─────────────────────────────────────────

type TargetIn = { target_tipe: 'barang' | 'kategori'; target_id: number }

promoRouter.post('/', requirePermission('penjualan.buat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const body = await c.req.json<{
    nama: string
    deskripsi?: string
    tipe: 'item' | 'kategori' | 'total'
    nilai: number
    tipe_nilai: 'persen' | 'rupiah'
    min_qty?: number
    min_total?: number
    berlaku_mulai?: string
    berlaku_sampai?: string
    max_penggunaan?: number
    targets?: TargetIn[]
  }>()

  if (!body.nama) throw new HTTPException(400, { message: 'Nama promo wajib diisi' })
  if (!body.nilai || body.nilai <= 0) throw new HTTPException(400, { message: 'Nilai diskon harus > 0' })
  if (body.tipe_nilai === 'persen' && body.nilai > 100) throw new HTTPException(400, { message: 'Diskon persen maks 100%' })

  const hasil = db.transaction(() => {
    const p = db.insert(promo).values({
      nama: body.nama,
      deskripsi: body.deskripsi,
      tipe: body.tipe,
      nilai: body.nilai,
      tipe_nilai: body.tipe_nilai ?? 'persen',
      min_qty: body.min_qty ?? 1,
      min_total: body.min_total ?? 0,
      berlaku_mulai: body.berlaku_mulai,
      berlaku_sampai: body.berlaku_sampai,
      max_penggunaan: body.max_penggunaan,
      dibuat_oleh: user.id,
    }).returning().get()

    if (body.targets?.length) {
      for (const t of body.targets) {
        db.insert(promo_target).values({ promo_id: p.id, target_tipe: t.target_tipe, target_id: t.target_id }).run()
      }
    }

    return p
  })

  return c.json({ success: true, data: hasil }, 201)
})

// ── PUT /promo/:id — update promo ─────────────────────────────────────────

promoRouter.put('/:id', requirePermission('penjualan.buat'), async (c) => {
  const id = Number(c.req.param('id'))
  const existing = db.select().from(promo).where(eq(promo.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Promo tidak ditemukan' })

  const body = await c.req.json<{
    nama?: string
    deskripsi?: string
    tipe?: 'item' | 'kategori' | 'total'
    nilai?: number
    tipe_nilai?: 'persen' | 'rupiah'
    min_qty?: number
    min_total?: number
    berlaku_mulai?: string | null
    berlaku_sampai?: string | null
    max_penggunaan?: number | null
    aktif?: boolean
    targets?: TargetIn[]
  }>()

  if (body.tipe_nilai === 'persen' && body.nilai !== undefined && body.nilai > 100)
    throw new HTTPException(400, { message: 'Diskon persen maks 100%' })

  db.transaction(() => {
    db.update(promo)
      .set({
        nama: body.nama ?? existing.nama,
        deskripsi: body.deskripsi !== undefined ? body.deskripsi : existing.deskripsi,
        tipe: body.tipe ?? existing.tipe,
        nilai: body.nilai ?? existing.nilai,
        tipe_nilai: body.tipe_nilai ?? existing.tipe_nilai,
        min_qty: body.min_qty ?? existing.min_qty,
        min_total: body.min_total ?? existing.min_total,
        berlaku_mulai: body.berlaku_mulai !== undefined ? body.berlaku_mulai : existing.berlaku_mulai,
        berlaku_sampai: body.berlaku_sampai !== undefined ? body.berlaku_sampai : existing.berlaku_sampai,
        max_penggunaan: body.max_penggunaan !== undefined ? body.max_penggunaan : existing.max_penggunaan,
        aktif: body.aktif !== undefined ? body.aktif : existing.aktif,
        updated_at: sql`(datetime('now','localtime'))`,
      })
      .where(eq(promo.id, id))
      .run()

    if (body.targets !== undefined) {
      db.delete(promo_target).where(eq(promo_target.promo_id, id)).run()
      for (const t of body.targets) {
        db.insert(promo_target).values({ promo_id: id, target_tipe: t.target_tipe, target_id: t.target_id }).run()
      }
    }
  })

  return c.json({ success: true, data: null })
})

// ── DELETE /promo/:id — nonaktifkan ──────────────────────────────────────

promoRouter.delete('/:id', requirePermission('penjualan.buat'), async (c) => {
  const id = Number(c.req.param('id'))
  db.update(promo).set({ aktif: false, updated_at: sql`(datetime('now','localtime'))` }).where(eq(promo.id, id)).run()
  return c.json({ success: true, data: null })
})
