import { Hono } from 'hono'
import { eq, like, and, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.ts'
import { karyawan } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import type { JWTPayload } from './auth.ts'

export const karyawanRouter = new Hono()

karyawanRouter.use('*', authMiddleware)

karyawanRouter.get('/', requirePermission('karyawan.lihat'), async (c) => {
  const q = c.req.query('q')
  const aktif = c.req.query('aktif') !== '0'

  const rows = db
    .select({
      id: karyawan.id,
      kode_karyawan: karyawan.kode_karyawan,
      nama: karyawan.nama,
      role: karyawan.role,
      username: karyawan.username,
      gaji_pokok: karyawan.gaji_pokok,
      tipe_gaji: karyawan.tipe_gaji,
      kontak: karyawan.kontak,
      foto_path: karyawan.foto_path,
      is_active: karyawan.is_active,
      created_at: karyawan.created_at,
    })
    .from(karyawan)
    .where(
      and(
        aktif ? eq(karyawan.is_active, true) : undefined,
        q ? like(karyawan.nama, `%${q}%`) : undefined,
      )
    )
    .all()

  return c.json({ success: true, data: rows })
})

karyawanRouter.get('/:id', requirePermission('karyawan.lihat'), async (c) => {
  const id = Number(c.req.param('id'))
  const row = db
    .select({
      id: karyawan.id,
      kode_karyawan: karyawan.kode_karyawan,
      nama: karyawan.nama,
      role: karyawan.role,
      username: karyawan.username,
      gaji_pokok: karyawan.gaji_pokok,
      tipe_gaji: karyawan.tipe_gaji,
      kontak: karyawan.kontak,
      foto_path: karyawan.foto_path,
      is_active: karyawan.is_active,
    })
    .from(karyawan)
    .where(eq(karyawan.id, id))
    .get()

  if (!row) throw new HTTPException(404, { message: 'Karyawan tidak ditemukan' })
  return c.json({ success: true, data: row })
})

karyawanRouter.post('/', requirePermission('karyawan.edit'), async (c) => {
  const body = await c.req.json<{
    kode_karyawan: string
    nama: string
    role: 'pemilik' | 'manajer' | 'kasir' | 'gudang'
    username: string
    password: string
    gaji_pokok?: number
    tipe_gaji?: 'harian' | 'bulanan'
    kontak?: string
  }>()

  if (!body.kode_karyawan?.trim() || !body.nama?.trim() || !body.username?.trim() || !body.password) {
    throw new HTTPException(400, { message: 'Kode, nama, username, dan password wajib diisi' })
  }

  const hash = await Bun.password.hash(body.password)

  const row = db.insert(karyawan).values({
    kode_karyawan: body.kode_karyawan.trim(),
    nama: body.nama.trim(),
    role: body.role,
    username: body.username.trim(),
    password_hash: hash,
    gaji_pokok: body.gaji_pokok ?? 0,
    tipe_gaji: body.tipe_gaji ?? 'bulanan',
    kontak: body.kontak,
  }).returning({
    id: karyawan.id,
    kode_karyawan: karyawan.kode_karyawan,
    nama: karyawan.nama,
    role: karyawan.role,
    username: karyawan.username,
  }).get()

  return c.json({ success: true, data: row }, 201)
})

karyawanRouter.put('/:id', requirePermission('karyawan.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{
    nama?: string
    role?: 'pemilik' | 'manajer' | 'kasir' | 'gudang'
    username?: string
    password?: string
    gaji_pokok?: number
    tipe_gaji?: 'harian' | 'bulanan'
    kontak?: string
  }>()

  const existing = db.select().from(karyawan).where(eq(karyawan.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Karyawan tidak ditemukan' })

  const updates: Partial<typeof karyawan.$inferInsert> = {
    ...body,
    updated_at: sql`(datetime('now','localtime'))` as unknown as string,
  }

  if (body.password) {
    updates.password_hash = await Bun.password.hash(body.password)
    delete (updates as Record<string, unknown>).password
  }

  const row = db.update(karyawan).set(updates).where(eq(karyawan.id, id)).returning({
    id: karyawan.id,
    kode_karyawan: karyawan.kode_karyawan,
    nama: karyawan.nama,
    role: karyawan.role,
    username: karyawan.username,
  }).get()

  return c.json({ success: true, data: row })
})

karyawanRouter.delete('/:id', requirePermission('karyawan.edit'), async (c) => {
  const id = Number(c.req.param('id'))
  const user = c.get('user') as JWTPayload

  if (user.id === id) throw new HTTPException(400, { message: 'Tidak bisa menonaktifkan diri sendiri' })

  const existing = db.select().from(karyawan).where(eq(karyawan.id, id)).get()
  if (!existing) throw new HTTPException(404, { message: 'Karyawan tidak ditemukan' })

  db.update(karyawan)
    .set({ is_active: false, updated_at: sql`(datetime('now','localtime'))` })
    .where(eq(karyawan.id, id))
    .run()

  return c.json({ success: true, data: null })
})
