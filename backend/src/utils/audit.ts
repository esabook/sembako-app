import type { Context } from 'hono'
import type { JWTPayload } from '../routes/auth.ts'

// Kembalikan { created_by, updated_by } dari JWT user di context.
// Gunakan saat INSERT: spread ...getAuditBy(c)
// Gunakan saat UPDATE: spread ...getUpdatedBy(c)
export function getAuditBy(c: Context<{ Variables: { user: JWTPayload } }>): { created_by: number; updated_by: number } {
  const id = c.get('user').id
  return { created_by: id, updated_by: id }
}

export function getUpdatedBy(c: Context<{ Variables: { user: JWTPayload } }>): { updated_by: number } {
  return { updated_by: c.get('user').id }
}
