import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query, isoNow } from '../db/index.ts'
import { env } from '../config/env.ts'
import { toko, cabang, karyawan, toko_settings } from '../db/schema.ts'
import { authMiddleware } from '../middleware/auth.ts'
import { requirePermission } from '../middleware/auth.ts'
import type { JWTPayload } from './auth.ts'

export const tokoRouter = new Hono<{ Variables: { user: JWTPayload } }>()

tokoRouter.use('*', authMiddleware)

// Di mode SaaS, pemilik hanya boleh sentuh toko miliknya (tenant aktif).
// Mode LAN (default): pemilik = superuser → bebas kelola semua toko.
function assertTokoAccess(user: JWTPayload, tokoId: number) {
  if (env.saasGating && tokoId !== user.tenant_id) {
    throw new HTTPException(403, { message: 'Tidak punya akses ke toko ini' })
  }
}

// ─── Toko CRUD (hanya pemilik super / setup awal) ────────────────────────────

tokoRouter.get('/', requirePermission('toko.kelola'), async (c) => {
  const user = c.get('user') as JWTPayload
  const rows = await query.findAll(
    env.saasGating
      ? db.select().from(toko).where(eq(toko.id, user.tenant_id)).orderBy(toko.id)
      : db.select().from(toko).orderBy(toko.id)
  )
  return c.json({ success: true, data: rows })
})

tokoRouter.post('/', requirePermission('toko.kelola'), async (c) => {
  if (env.saasGating) {
    throw new HTTPException(403, { message: 'Toko hanya dibuat lewat pendaftaran' })
  }
  const body = await c.req.json<{ kode_toko: string; nama: string; alamat?: string }>()
  if (!body.kode_toko || !body.nama) {
    throw new HTTPException(400, { message: 'kode_toko dan nama wajib diisi' })
  }
  const row = await query.ret(
    db.insert(toko).values({ kode_toko: body.kode_toko, nama: body.nama, alamat: body.alamat }).returning()
  )
  return c.json({ success: true, data: row }, 201)
})

tokoRouter.put('/:id', requirePermission('toko.kelola'), async (c) => {
  const user = c.get('user') as JWTPayload
  const id = Number(c.req.param('id'))
  assertTokoAccess(user, id)
  const body = await c.req.json<{ nama?: string; alamat?: string; is_active?: boolean }>()
  const row = await query.ret(
    db.update(toko).set({ ...body, updated_at: isoNow() }).where(eq(toko.id, id)).returning()
  )
  if (!row) throw new HTTPException(404, { message: 'Toko tidak ditemukan' })

  // Sync nama/alamat entitas toko → toko_settings (branding login/struk),
  // hanya bila yang diubah adalah toko milik tenant aktif.
  if (id === user.tenant_id) {
    const sync: Record<string, string | undefined> = { nama_toko: body.nama, alamat: body.alamat }
    for (const [key, value] of Object.entries(sync)) {
      if (value === undefined) continue
      const existing = await query.find(db.select().from(toko_settings)
        .where(and(eq(toko_settings.toko_id, id), eq(toko_settings.key, key))))
      if (existing) {
        await query.exec(db.update(toko_settings).set({ value, updated_at: isoNow() })
          .where(and(eq(toko_settings.toko_id, id), eq(toko_settings.key, key))))
      } else {
        await query.exec(db.insert(toko_settings).values({ toko_id: id, key, value }))
      }
    }
  }

  return c.json({ success: true, data: row })
})

// ─── Cabang CRUD (pemilik atau manajer toko terkait) ─────────────────────────

tokoRouter.get('/:toko_id/cabang', requirePermission('toko.kelola'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tokoId = Number(c.req.param('toko_id'))
  assertTokoAccess(user, tokoId)
  const rows = await query.findAll(
    db.select().from(cabang).where(eq(cabang.toko_id, tokoId)).orderBy(cabang.id)
  )
  return c.json({ success: true, data: rows })
})

tokoRouter.post('/:toko_id/cabang', requirePermission('toko.kelola'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tokoId = Number(c.req.param('toko_id'))
  assertTokoAccess(user, tokoId)
  const body = await c.req.json<{ kode_cabang: string; nama: string; alamat?: string }>()
  if (!body.kode_cabang || !body.nama) {
    throw new HTTPException(400, { message: 'kode_cabang dan nama wajib diisi' })
  }
  const row = await query.ret(
    db.insert(cabang).values({
      toko_id: tokoId,
      kode_cabang: body.kode_cabang,
      nama: body.nama,
      alamat: body.alamat,
    }).returning()
  )
  return c.json({ success: true, data: row }, 201)
})

tokoRouter.put('/:toko_id/cabang/:id', requirePermission('toko.kelola'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tokoId = Number(c.req.param('toko_id'))
  assertTokoAccess(user, tokoId)
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ nama?: string; alamat?: string; is_active?: boolean }>()
  const row = await query.ret(
    db.update(cabang)
      .set({ ...body, updated_at: isoNow() })
      .where(and(eq(cabang.id, id), eq(cabang.toko_id, tokoId)))
      .returning()
  )
  if (!row) throw new HTTPException(404, { message: 'Cabang tidak ditemukan' })
  return c.json({ success: true, data: row })
})

// ─── List semua cabang (untuk dropdown UI) ───────────────────────────────────

tokoRouter.get('/cabang', requirePermission('laporan.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const rows = await query.findAll(
    db.select().from(cabang)
      .where(and(eq(cabang.toko_id, user.tenant_id), eq(cabang.is_active, true)))
      .orderBy(cabang.id)
  )
  return c.json({ success: true, data: rows })
})
