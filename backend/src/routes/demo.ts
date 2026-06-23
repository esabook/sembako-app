import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { eq } from 'drizzle-orm'
import { db, query } from '../db/index.ts'
import { toko } from '../db/schema.ts'
import { env } from '../config/env.ts'
import { authMiddleware } from '../middleware/auth.ts'
import type { JWTPayload } from './auth.ts'
import { generateDemoData, deleteDemoData, getDemoTokoId, getDemoStats, demoTokoKode } from '../db/demo.ts'

export const demoRouter = new Hono<{ Variables: { user: JWTPayload } }>()

demoRouter.use('*', authMiddleware)

// Semua endpoint demo hanya boleh diakses pemilik
demoRouter.use('*', async (c, next) => {
  const user = c.get('user') as JWTPayload
  if (user.role !== 'pemilik') throw new HTTPException(403, { message: 'Hanya pemilik yang bisa akses fitur demo' })
  await next()
})

// Kode toko demo untuk pemilik aktif (per-mode). Di SaaS, toko demo per-tenant.
function demoKodeFor(user: JWTPayload): string {
  return demoTokoKode(env.saasGating, user.tenant_id)
}

// ── GET /demo/status ──────────────────────────────────────────────────────────
demoRouter.get('/status', async (c) => {
  const user = c.get('user') as JWTPayload
  const tokoId = await getDemoTokoId(demoKodeFor(user))
  if (!tokoId) return c.json({ success: true, data: { exists: false } })
  const stats = await getDemoStats(tokoId)
  return c.json({ success: true, data: { exists: true, toko_id: tokoId, ...stats } })
})

// ── POST /demo/generate ───────────────────────────────────────────────────────
demoRouter.post('/generate', async (c) => {
  const user = c.get('user') as JWTPayload
  try {
    const kode = demoKodeFor(user)
    // SaaS: toko demo harus pakai email pemilik toko asli agar muncul di
    // accessible-context (difilter email_pemilik) → boleh switch-context.
    let emailPemilik: string | null = null
    if (env.saasGating) {
      const home = await query.find<{ email_pemilik: string | null }>(
        db.select({ email_pemilik: toko.email_pemilik }).from(toko).where(eq(toko.id, user.tenant_id))
      )
      emailPemilik = home?.email_pemilik ?? null
    }
    const userSuffix = env.saasGating ? `-${user.tenant_id}` : ''
    const result = await generateDemoData({ kode, emailPemilik, userSuffix })
    return c.json({
      success: true,
      data: {
        message: 'Data demo berhasil di-generate. Masuk mode demo untuk mencoba.',
        toko_id: result.toko_id,
      },
    }, 201)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Gagal generate data demo'
    throw new HTTPException(409, { message: msg })
  }
})

// ── DELETE /demo ──────────────────────────────────────────────────────────────
demoRouter.delete('/', async (c) => {
  const user = c.get('user') as JWTPayload
  try {
    await deleteDemoData(demoKodeFor(user))
    return c.json({ success: true, data: { message: 'Data demo berhasil dihapus' } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Gagal menghapus data demo'
    throw new HTTPException(404, { message: msg })
  }
})
