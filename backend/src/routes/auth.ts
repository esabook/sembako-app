import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import { SignJWT } from 'jose'
import { eq } from 'drizzle-orm'
import { db, query, withTransaction, isoNow } from '../db/index.ts'
import { karyawan, toko, cabang } from '../db/schema.ts'
import type { Role } from '../middleware/auth.ts'
import { authMiddleware } from '../middleware/auth.ts'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-ganti-di-production'
)
const JWT_EXPIRY_HOURS = Number(process.env.JWT_EXPIRY_HOURS ?? 12)
const COOKIE_MAX_AGE = JWT_EXPIRY_HOURS * 60 * 60

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
    throw new HTTPException(400, { message: 'Username dan password wajib diisi' })
  }

  const user = await query.find(db
    .select()
    .from(karyawan)
    .where(eq(karyawan.username, body.username))
    )

  if (!user || !user.is_active) {
    throw new HTTPException(401, { message: 'Username atau password salah' })
  }

  const valid = await Bun.password.verify(body.password, user.password_hash)
  if (!valid) {
    throw new HTTPException(401, { message: 'Username atau password salah' })
  }

  const tenantId = user.toko_id ?? 1

  const payload: JWTPayload = {
    sub: String(user.id),
    id: user.id,
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
    },
  })
})
