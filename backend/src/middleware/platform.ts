import type { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import { jwtVerify } from 'jose'
import { eq } from 'drizzle-orm'
import { db, query } from '../db/index.ts'
import { platform_admin } from '../db/schema.ts'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-ganti-di-production'
)

// Sesi operator lintas-tenant — TERPISAH dari karyawan/tenant.
// Cookie sendiri (platform_token) + flag is_platform di payload.
export type PlatformPayload = {
  is_platform: true
  id: number
  nama: string
  iat?: number
  exp?: number
}

// Verifikasi platform_token + flag is_platform. TIDAK pakai tenantMiddleware —
// admin platform bukan bagian dari toko mana pun.
export async function platformMiddleware(c: Context, next: Next) {
  const token = getCookie(c, 'platform_token')
  if (!token) throw new HTTPException(401, { message: 'Tidak terautentikasi' })

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const admin = payload as unknown as PlatformPayload
    if (!admin.is_platform) throw new HTTPException(401, { message: 'Bukan sesi admin platform' })
    const row = await query.find<{ is_active: boolean }>(
      db
        .select({ is_active: platform_admin.is_active })
        .from(platform_admin)
        .where(eq(platform_admin.id, admin.id))
    )
    if (!row?.is_active) throw new HTTPException(401, { message: 'Akun admin nonaktif' })
    c.set('admin', admin)
  } catch (e) {
    if (e instanceof HTTPException) throw e
    throw new HTTPException(401, { message: 'Token tidak valid atau kedaluwarsa' })
  }

  await next()
}
