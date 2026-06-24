// ── Platform Route — Super-Admin lintas-tenant ────────────────────────────
// POST /platform/login                       — login operator (cookie platform_token)
// POST /platform/logout                      — hapus cookie sesi
// GET  /platform/me                          — info admin sesi
// GET  /platform/toko                        — list semua toko + status + bukti menunggu
// GET  /platform/pembayaran?status=menunggu  — antrian verifikasi bukti (join toko)
// POST /platform/pembayaran/:id/verifikasi   — setuju → toko aktif +periode×30d; tolak → ditolak
//
// Login publik; sisanya dijaga platformMiddleware. Prefix /platform di-whitelist
// langgananMiddleware sehingga tak kena gating 402.

import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import { SignJWT } from 'jose'
import { eq, desc, count } from 'drizzle-orm'
import { db, query } from '../db/index.ts'
import { env } from '../config/env.ts'
import { platform_admin, toko, pembayaran_langganan } from '../db/schema.ts'
import { platformMiddleware } from '../middleware/platform.ts'
import type { PlatformPayload } from '../middleware/platform.ts'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-ganti-di-production'
)
const JWT_EXPIRY_HOURS = Number(process.env.JWT_EXPIRY_HOURS ?? 12)
const COOKIE_MAX_AGE = JWT_EXPIRY_HOURS * 60 * 60
const COOKIE_SECURE = env.isProd

// Rate limit login admin: maks 10 percobaan per IP per 15 menit.
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

const HARI_MS = 86_400_000

export const platformRouter = new Hono<{ Variables: { admin: PlatformPayload } }>()

// ── POST /login ───────────────────────────────────────────────────────────
platformRouter.post('/login', async (c) => {
  const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown'
  if (!checkRateLimit(ip)) {
    throw new HTTPException(429, { message: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' })
  }

  const body = await c.req.json<{ username: string; password: string }>()
  if (!body.username || !body.password) {
    throw new HTTPException(400, { message: 'Username dan password wajib diisi' })
  }

  const admin = await query.find<typeof platform_admin.$inferSelect>(
    db.select().from(platform_admin).where(eq(platform_admin.username, body.username.trim().toLowerCase()))
  )
  if (!admin || !admin.is_active) {
    throw new HTTPException(401, { message: 'Username atau password salah' })
  }

  const valid = await Bun.password.verify(body.password, admin.password_hash)
  if (!valid) throw new HTTPException(401, { message: 'Username atau password salah' })

  const payload: PlatformPayload = { is_platform: true, id: admin.id!, nama: admin.nama }
  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${JWT_EXPIRY_HOURS}h`)
    .sign(JWT_SECRET)

  setCookie(c, 'platform_token', token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'Strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  return c.json({ success: true, data: { id: admin.id, nama: admin.nama } })
})

// ── POST /logout ──────────────────────────────────────────────────────────
platformRouter.post('/logout', (c) => {
  deleteCookie(c, 'platform_token', { path: '/' })
  return c.json({ success: true, data: null })
})

// ── GET /me ───────────────────────────────────────────────────────────────
platformRouter.get('/me', platformMiddleware, (c) => {
  const admin = c.get('admin') as PlatformPayload
  return c.json({ success: true, data: { id: admin.id, nama: admin.nama } })
})

// ── GET /toko — semua toko + jumlah bukti menunggu ────────────────────────
platformRouter.get('/toko', platformMiddleware, async (c) => {
  const status = c.req.query('status')

  const rows = await query.findAll<{
    id: number
    nama: string
    kode_toko: string
    status_langganan: string
    trial_berakhir: string | null
    aktif_sampai: string | null
    email_pemilik: string | null
    wa_pemilik: string | null
  }>(
    db
      .select({
        id: toko.id,
        nama: toko.nama,
        kode_toko: toko.kode_toko,
        status_langganan: toko.status_langganan,
        trial_berakhir: toko.trial_berakhir,
        aktif_sampai: toko.aktif_sampai,
        email_pemilik: toko.email_pemilik,
        wa_pemilik: toko.wa_pemilik,
      })
      .from(toko)
      .orderBy(desc(toko.id))
  )

  // Hitung bukti menunggu per toko (agregat dialect-proof, merge di JS).
  const counts = await query.findAll<{ toko_id: number; n: number }>(
    db
      .select({ toko_id: pembayaran_langganan.toko_id, n: count() })
      .from(pembayaran_langganan)
      .where(eq(pembayaran_langganan.status, 'menunggu'))
      .groupBy(pembayaran_langganan.toko_id)
  )
  const cmap = new Map(counts.map((r) => [r.toko_id, Number(r.n)]))

  let data = rows.map((t) => ({ ...t, bukti_menunggu: cmap.get(t.id) ?? 0 }))
  if (status) data = data.filter((t) => t.status_langganan === status)

  return c.json({ success: true, data })
})

// ── GET /pembayaran — antrian verifikasi bukti ────────────────────────────
platformRouter.get('/pembayaran', platformMiddleware, async (c) => {
  const status = (c.req.query('status') ?? 'menunggu') as 'menunggu' | 'disetujui' | 'ditolak'

  const rows = await query.findAll(
    db
      .select({
        id: pembayaran_langganan.id,
        toko_id: pembayaran_langganan.toko_id,
        nama_toko: toko.nama,
        periode_bulan: pembayaran_langganan.periode_bulan,
        nominal: pembayaran_langganan.nominal,
        bukti_path: pembayaran_langganan.bukti_path,
        status: pembayaran_langganan.status,
        catatan_admin: pembayaran_langganan.catatan_admin,
        created_at: pembayaran_langganan.created_at,
      })
      .from(pembayaran_langganan)
      .innerJoin(toko, eq(pembayaran_langganan.toko_id, toko.id))
      .where(eq(pembayaran_langganan.status, status))
      .orderBy(desc(pembayaran_langganan.id))
  )

  return c.json({ success: true, data: rows })
})

// ── POST /pembayaran/:id/verifikasi — setuju / tolak ──────────────────────
platformRouter.post('/pembayaran/:id/verifikasi', platformMiddleware, async (c) => {
  const admin = c.get('admin') as PlatformPayload
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ aksi: 'setuju' | 'tolak'; catatan?: string }>()

  if (body.aksi !== 'setuju' && body.aksi !== 'tolak') {
    throw new HTTPException(400, { message: 'aksi tidak valid' })
  }

  const bayar = await query.find<typeof pembayaran_langganan.$inferSelect>(
    db.select().from(pembayaran_langganan).where(eq(pembayaran_langganan.id, id))
  )
  if (!bayar) throw new HTTPException(404, { message: 'Pembayaran tidak ditemukan' })
  if (bayar.status !== 'menunggu') {
    throw new HTTPException(409, { message: 'Pembayaran sudah diverifikasi' })
  }

  const catatan = body.catatan?.trim() || null

  if (body.aksi === 'tolak') {
    await query.exec(
      db
        .update(pembayaran_langganan)
        .set({ status: 'ditolak', catatan_admin: catatan, diverifikasi_oleh: admin.id })
        .where(eq(pembayaran_langganan.id, id))
    )
    return c.json({ success: true, data: { status: 'ditolak' } })
  }

  // Setuju → perpanjang langganan. Basis = aktif_sampai bila masih di depan, else now.
  const tokoRow = await query.find<{ aktif_sampai: string | null }>(
    db.select({ aktif_sampai: toko.aktif_sampai }).from(toko).where(eq(toko.id, bayar.toko_id))
  )
  const now = Date.now()
  const existing = tokoRow?.aktif_sampai ? new Date(tokoRow.aktif_sampai).getTime() : 0
  const base = existing > now ? existing : now
  const aktifSampai = new Date(base + bayar.periode_bulan * 30 * HARI_MS).toISOString()

  await query.exec(
    db
      .update(pembayaran_langganan)
      .set({ status: 'disetujui', catatan_admin: catatan, diverifikasi_oleh: admin.id })
      .where(eq(pembayaran_langganan.id, id))
  )
  await query.exec(
    db
      .update(toko)
      .set({ status_langganan: 'aktif', aktif_sampai: aktifSampai })
      .where(eq(toko.id, bayar.toko_id))
  )

  return c.json({ success: true, data: { status: 'disetujui', aktif_sampai: aktifSampai } })
})
