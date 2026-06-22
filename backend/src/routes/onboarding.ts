// ── Onboarding Route ──────────────────────────────────────────────────────
// POST /onboarding/seed-demo — isi contoh data (barang/supplier/pelanggan) ke
// tenant aktif. Hanya pemilik. Idempoten: aman dipanggil dua kali.

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { authMiddleware } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import type { JWTPayload } from './auth.ts'
import { seedSampleIntoTenant } from '../db/demo.ts'

export const onboardingRouter = new Hono<{ Variables: { user: JWTPayload } }>()

onboardingRouter.use('*', authMiddleware)
onboardingRouter.use('*', tenantMiddleware)

// Onboarding hanya untuk pemilik
onboardingRouter.use('*', async (c, next) => {
  const user = c.get('user') as JWTPayload
  if (user.role !== 'pemilik') {
    throw new HTTPException(403, { message: 'Hanya pemilik yang bisa onboarding' })
  }
  await next()
})

// ── POST /onboarding/seed-demo ────────────────────────────────────────────
onboardingRouter.post('/seed-demo', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? null
  const result = await seedSampleIntoTenant(tenantId, cabangId)
  return c.json({ success: true, data: result }, 201)
})
