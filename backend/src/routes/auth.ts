import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import { SignJWT } from 'jose'
import { eq, and, or } from 'drizzle-orm'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import { env } from '../config/env.ts'
import { karyawan, toko, cabang } from '../db/schema.ts'
import type { Role } from '../middleware/auth.ts'
import { authMiddleware } from '../middleware/auth.ts'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-ganti-di-production'
)
const JWT_EXPIRY_HOURS = Number(process.env.JWT_EXPIRY_HOURS ?? 12)
const COOKIE_MAX_AGE = JWT_EXPIRY_HOURS * 60 * 60

// Mode SaaS multi-tenant (flag terpusat env.saasGating, sama dgn gating langganan).
// Saat aktif, pemilik HANYA boleh akses toko miliknya (email_pemilik), bukan semua toko.
// Mode LAN (default): pemilik = superuser 1 instance → lihat semua toko.

// In-memory rate limiter: maks 10 percobaan login per IP per 15 menit
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000
  const max = 10
  const entry = loginAttempts.get(ip)
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= max) return false
  entry.count++
  return true
}

// Rate limiter terpisah untuk registrasi: maks 5 daftar per IP per jam (cegah spam)
const registerAttempts = new Map<string, { count: number; resetAt: number }>()
function checkRegisterLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000
  const max = 5
  const entry = registerAttempts.get(ip)
  if (!entry || entry.resetAt < now) {
    registerAttempts.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= max) return false
  entry.count++
  return true
}

const TRIAL_HARI = Number(process.env.TRIAL_HARI ?? 14)

export type JWTPayload = {
  sub: string
  id: number
  nama: string
  role: Role
  kode_karyawan: string
  tenant_id: number        // toko yang diakses
  cabang_id: number | null // null = akses semua cabang toko ini (manajer/pemilik)
  iat?: number
  exp?: number
}

export const authRouter = new Hono<{ Variables: { user: JWTPayload } }>()

authRouter.post('/login', async (c) => {
  const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown'
  if (!checkRateLimit(ip)) {
    throw new HTTPException(429, { message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' })
  }

  const body = await c.req.json<{ username: string; password: string }>()

  if (!body.username || !body.password) {
    throw new HTTPException(400, { message: 'Username / email dan password wajib diisi' })
  }

  const identifier = body.username.trim().toLowerCase()
  const isEmail = identifier.includes('@')
  const user = await query.find<typeof karyawan.$inferSelect>(db
    .select()
    .from(karyawan)
    .where(isEmail ? eq(karyawan.email, identifier) : eq(karyawan.username, identifier))
  )

  if (!user || !user.is_active) {
    throw new HTTPException(401, { message: 'Username / email atau password salah' })
  }

  const valid = await Bun.password.verify(body.password, user.password_hash)
  if (!valid) {
    throw new HTTPException(401, { message: 'Username atau password salah' })
  }

  const tenantId = user.toko_id ?? 1

  const payload: JWTPayload = {
    sub: String(user.id),
    id: user.id!,
    nama: user.nama,
    role: user.role,
    kode_karyawan: user.kode_karyawan,
    tenant_id: tenantId,
    cabang_id: user.cabang_id ?? null,
  }

  const token = await new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${JWT_EXPIRY_HOURS}h`)
    .sign(JWT_SECRET)

  setCookie(c, 'auth_token', token, {
    httpOnly: true,
    sameSite: 'Strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  return c.json({
    success: true,
    data: {
      id: user.id,
      nama: user.nama,
      role: user.role,
      kode_karyawan: user.kode_karyawan,
      tenant_id: tenantId,
      cabang_id: user.cabang_id ?? null,
    },
  })
})

// ─── Registrasi mandiri (publik) — SaaS cloud ───────────────────────────────
type DaftarBody = {
  nama_toko: string
  nama_pemilik: string
  password: string
  email: string
  wa: string
  nama_cabang?: string
}

authRouter.post('/daftar', async (c) => {
  const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown'
  if (!checkRegisterLimit(ip)) {
    throw new HTTPException(429, { message: 'Terlalu banyak pendaftaran. Coba lagi dalam 1 jam.' })
  }

  const b = await c.req.json<DaftarBody>()

  // Validasi field wajib
  const nama_toko = b.nama_toko?.trim()
  const nama_pemilik = b.nama_pemilik?.trim()
  const email = b.email?.trim().toLowerCase()
  const wa = b.wa?.trim()
  if (!nama_toko || !nama_pemilik || !b.password || !email || !wa) {
    throw new HTTPException(400, { message: 'Nama toko, nama pemilik, password, email, dan WA wajib diisi' })
  }
  if (b.password.length < 6) {
    throw new HTTPException(400, { message: 'Password minimal 6 karakter' })
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new HTTPException(400, { message: 'Format email tidak valid' })
  }
  if (!/^[0-9+\s-]{8,}$/.test(wa)) {
    throw new HTTPException(400, { message: 'Nomor WA tidak valid' })
  }

  // Cek email unik (constraint DB juga jaga race)
  const exists = await query.find(db.select({ id: karyawan.id }).from(karyawan).where(eq(karyawan.email, email)))
  if (exists) {
    throw new HTTPException(409, { message: 'Email sudah terdaftar, gunakan email lain atau masuk' })
  }

  // Auto-generate username dari prefix email + suffix waktu (dijamin unik)
  const emailPrefix = (email.split('@')[0] ?? 'user').replace(/[^a-z0-9._-]/g, '_').slice(0, 20)

  const hash = await Bun.password.hash(b.password)
  const trialBerakhir = new Date(Date.now() + TRIAL_HARI * 24 * 60 * 60 * 1000).toISOString()
  // Kode unik berbasis waktu — hindari tabrakan tanpa query max id
  const suffix = Date.now().toString(36).toUpperCase()
  // Username auto-generated; pemilik login pakai email
  const username = `${emailPrefix}_${suffix.toLowerCase()}`

  const result = await withTransaction(async () => {
    const tokoRow = await query.ret<{ id: number }>(
      db.insert(toko).values({
        kode_toko: `T-${suffix}`,
        nama: nama_toko,
        status_langganan: 'trial',
        trial_berakhir: trialBerakhir,
        email_pemilik: email,
        wa_pemilik: wa,
        is_active: true,
      }).returning()
    )
    const tid = tokoRow!.id

    const cabangRow = await query.ret<{ id: number }>(
      db.insert(cabang).values({
        toko_id: tid,
        kode_cabang: 'CAB-01',
        nama: b.nama_cabang?.trim() || 'Cabang Utama',
        is_active: true,
      }).returning()
    )
    const cid = cabangRow!.id

    await query.ret<{ id: number }>(
      db.insert(karyawan).values({
        kode_karyawan: `KRY-${suffix}`,
        nama: nama_pemilik,
        role: 'pemilik',
        username,
        email,
        password_hash: hash,
        tipe_gaji: 'bulanan',
        toko_id: tid,
        cabang_id: null, // pemilik akses semua cabang
      }).returning()
    )

    return { toko_id: tid, cabang_id: cid }
  })

  return c.json({ success: true, data: { toko_id: result.toko_id } }, 201)
})

authRouter.post('/logout', (c) => {
  deleteCookie(c, 'auth_token', { path: '/' })
  return c.json({ success: true, data: null })
})

authRouter.get('/me', authMiddleware, (c) => {
  const user = c.get('user') as JWTPayload
  return c.json({
    success: true,
    data: {
      id: user.id,
      nama: user.nama,
      role: user.role,
      kode_karyawan: user.kode_karyawan,
      tenant_id: user.tenant_id,
      cabang_id: user.cabang_id,
      saas: env.saasGating,
    },
  })
})

// Helper: ambil list toko+cabang yang boleh diakses user berdasarkan role
async function getAccessibleContext(role: Role, tokoId: number) {
  if (role !== 'pemilik' && role !== 'manajer') return []

  let tokoList: { id: number | null; nama: string }[]
  if (role === 'manajer') {
    // Manajer: selalu cuma toko sendiri.
    tokoList = await db.select({ id: toko.id, nama: toko.nama }).from(toko)
      .where(and(eq(toko.id, tokoId), eq(toko.is_active, true)))
  } else if (env.saasGating) {
    // SaaS: pemilik hanya toko miliknya (cocokkan email_pemilik dgn toko aktif).
    const cur = await query.find<{ email_pemilik: string | null }>(
      db.select({ email_pemilik: toko.email_pemilik }).from(toko).where(eq(toko.id, tokoId))
    )
    const email = cur?.email_pemilik ?? null
    tokoList = email
      ? await db.select({ id: toko.id, nama: toko.nama }).from(toko)
          .where(and(eq(toko.email_pemilik, email), eq(toko.is_active, true)))
      : await db.select({ id: toko.id, nama: toko.nama }).from(toko)
          .where(and(eq(toko.id, tokoId), eq(toko.is_active, true)))
  } else {
    // LAN: pemilik = superuser → semua toko.
    tokoList = await db.select({ id: toko.id, nama: toko.nama }).from(toko)
      .where(eq(toko.is_active, true))
  }

  const result: { id: number; nama: string; cabang: { id: number; nama: string }[] }[] = []
  for (const t of tokoList) {
    if (!t.id) continue
    const cabangList = await db
      .select({ id: cabang.id, nama: cabang.nama })
      .from(cabang)
      .where(and(eq(cabang.toko_id, t.id), eq(cabang.is_active, true)))
    result.push({ id: t.id, nama: t.nama, cabang: cabangList.map((c) => ({ id: c.id!, nama: c.nama })) })
  }
  return result
}

authRouter.get('/accessible-context', authMiddleware, async (c) => {
  const user = c.get('user') as JWTPayload
  const list = await getAccessibleContext(user.role, user.tenant_id)
  return c.json({ success: true, data: list })
})

authRouter.post('/switch-context', authMiddleware, async (c) => {
  const user = c.get('user') as JWTPayload
  const body = await c.req.json<{ toko_id: number; cabang_id: number | null }>()

  if (!body.toko_id) throw new HTTPException(400, { message: 'toko_id wajib diisi' })

  const accessible = await getAccessibleContext(user.role, user.tenant_id)
  const targetToko = accessible.find((t) => t.id === body.toko_id)
  if (!targetToko) throw new HTTPException(403, { message: 'Tidak punya akses ke toko ini' })

  if (body.cabang_id !== null && body.cabang_id !== undefined) {
    const validCabang = targetToko.cabang.find((c) => c.id === body.cabang_id)
    if (!validCabang) throw new HTTPException(403, { message: 'Cabang tidak ditemukan di toko ini' })
  }

  const newCabangId = body.cabang_id ?? null

  const payload: JWTPayload = {
    sub: String(user.id),
    id: user.id!,
    nama: user.nama,
    role: user.role,
    kode_karyawan: user.kode_karyawan,
    tenant_id: body.toko_id,
    cabang_id: newCabangId,
  }

  const token = await new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${JWT_EXPIRY_HOURS}h`)
    .sign(JWT_SECRET)

  setCookie(c, 'auth_token', token, {
    httpOnly: true,
    sameSite: 'Strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  return c.json({ success: true, data: { tenant_id: body.toko_id, cabang_id: newCabangId } })
})
