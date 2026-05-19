import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import { SignJWT } from 'jose'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { karyawan } from '../db/schema.ts'
import type { Role } from '../middleware/auth.ts'
import { authMiddleware } from '../middleware/auth.ts'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-ganti-di-production'
)
const COOKIE_MAX_AGE = 60 * 60 * 12 // 12 jam

export type JWTPayload = {
  sub: string
  id: number
  nama: string
  role: Role
  iat?: number
  exp?: number
}

export const authRouter = new Hono<{ Variables: { user: JWTPayload } }>()

authRouter.post('/login', async (c) => {
  const body = await c.req.json<{ username: string; password: string }>()

  if (!body.username || !body.password) {
    throw new HTTPException(400, { message: 'Username dan password wajib diisi' })
  }

  const user = db
    .select()
    .from(karyawan)
    .where(eq(karyawan.username, body.username))
    .get()

  if (!user || !user.is_active) {
    throw new HTTPException(401, { message: 'Username atau password salah' })
  }

  const valid = await Bun.password.verify(body.password, user.password_hash)
  if (!valid) {
    throw new HTTPException(401, { message: 'Username atau password salah' })
  }

  const payload: JWTPayload = {
    sub: String(user.id),
    id: user.id,
    nama: user.nama,
    role: user.role,
  }

  const token = await new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(JWT_SECRET)

  setCookie(c, 'auth_token', token, {
    httpOnly: true,
    sameSite: 'Strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  return c.json({
    success: true,
    data: { id: user.id, nama: user.nama, role: user.role },
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
    data: { id: user.id, nama: user.nama, role: user.role },
  })
})
