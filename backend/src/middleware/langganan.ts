import type { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import { jwtVerify } from 'jose'
import { eq } from 'drizzle-orm'
import { db, query } from '../db/index.ts'
import { toko } from '../db/schema.ts'
import type { JWTPayload } from '../routes/auth.ts'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-ganti-di-production'
)

// Gating hanya aktif di mode cloud/online. Mode LAN/offline → middleware no-op.
const GATING_ON = process.env.SAAS_GATING === '1'

// Method mutasi yang dikunci saat langganan nonaktif. GET (read-only) selalu lolos.
const METHOD_MUTASI = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// Path yang selalu lolos walau suspended (bayar/berlangganan & auth & platform admin).
const WHITELIST_PREFIX = ['/auth', '/langganan', '/platform']

// Cache ringan status efektif per tenant agar tak query toko tiap request.
const TTL_MS = 30_000
const cache = new Map<number, { suspended: boolean; expiresAt: number }>()

// Status efektif: trial/aktif yang sudah lewat tanggal dianggap suspended.
function hitungSuspended(row: {
  status_langganan: string
  trial_berakhir: string | null
  aktif_sampai: string | null
}): boolean {
  if (row.status_langganan === 'suspended') return true
  const now = new Date().toISOString()
  if (row.status_langganan === 'trial') return !!row.trial_berakhir && row.trial_berakhir < now
  if (row.status_langganan === 'aktif') return !!row.aktif_sampai && row.aktif_sampai < now
  return false
}

async function isSuspended(tenantId: number): Promise<boolean> {
  const cached = cache.get(tenantId)
  if (cached && cached.expiresAt > Date.now()) return cached.suspended

  const row = await query.find<{
    status_langganan: string
    trial_berakhir: string | null
    aktif_sampai: string | null
  }>(
    db
      .select({
        status_langganan: toko.status_langganan,
        trial_berakhir: toko.trial_berakhir,
        aktif_sampai: toko.aktif_sampai,
      })
      .from(toko)
      .where(eq(toko.id, tenantId))
  )
  // Toko tak ditemukan → jangan kunci di sini, biar handler/tenant yang urus.
  const suspended = row ? hitungSuspended(row) : false
  cache.set(tenantId, { suspended, expiresAt: Date.now() + TTL_MS })
  return suspended
}

// Kunci operasi mutasi untuk toko dengan langganan nonaktif (suspended / trial habis).
// Dijalankan di level app SEBELUM router bisnis; decode JWT sendiri karena
// auth/tenant middleware milik router belum jalan pada titik ini.
export async function langgananMiddleware(c: Context, next: Next) {
  if (!GATING_ON) return next()
  if (!METHOD_MUTASI.has(c.req.method)) return next()
  if (WHITELIST_PREFIX.some((p) => c.req.path.startsWith(p))) return next()

  const token = getCookie(c, 'auth_token')
  if (!token) return next() // biarkan authMiddleware router yang balas 401

  let tenantId: number
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    tenantId = (payload as JWTPayload).tenant_id ?? 1
  } catch {
    return next() // token invalid → serahkan ke authMiddleware
  }

  if (await isSuspended(tenantId)) {
    throw new HTTPException(402, { message: 'Langganan nonaktif — segera berlangganan' })
  }
  return next()
}
