import type { Context, Next } from 'hono'
import type { JWTPayload } from '../routes/auth.ts'

// Dijalankan setelah authMiddleware — inject tenant_id & cabang_id ke context
// dari JWT payload agar route handler tidak perlu cast ulang.
export async function tenantMiddleware(c: Context, next: Next) {
  const user = c.get('user') as JWTPayload
  c.set('tenant_id', user.tenant_id ?? 1)
  c.set('cabang_id', user.cabang_id ?? null)
  return next()
}

// Helper: bangun kondisi WHERE tenant + cabang (cabang null = semua cabang)
export function tenantFilter(tenantId: number, cabangId: number | null) {
  return { tenantId, cabangId }
}
