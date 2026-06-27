import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { eq } from 'drizzle-orm'
import { db, query, runWithDemo } from '../db/index.ts'
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
  const kode = demoKodeFor(user)
  // Orphan demo lama yang masih nyangkut di PROD (dibuat sebelum split DB).
  // Dibaca di konteks default (prod), di luar runWithDemo.
  const legacy_prod = (await getDemoTokoId(kode)) != null
  // Data demo aktif hidup di DB demo terpisah → paksa konteks demoDb.
  return runWithDemo(async () => {
    const tokoId = await getDemoTokoId(kode)
    if (!tokoId) return c.json({ success: true, data: { exists: false, legacy_prod } })
    const stats = await getDemoStats(tokoId)
    return c.json({ success: true, data: { exists: true, toko_id: tokoId, legacy_prod, ...stats } })
  })
})

// ── DELETE /demo/legacy ─────────────────────────────────────────────────────
// Bersihkan orphan demo lama di PROD (pre-split DB). Tanpa runWithDemo →
// deleteDemoData jalan di konteks prod, reuse purgeTokoById.
demoRouter.delete('/legacy', async (c) => {
  const user = c.get('user') as JWTPayload
  try {
    // Pengaman: jangan hapus toko yang justru sedang dipakai (aktif/home). Kalau
    // id orphan == tenant aktif / home toko, ini bukan sampah → tolak agar pemilik
    // tidak kehilangan toko & nyangkut di onboarding.
    const orphanId = await getDemoTokoId(demoKodeFor(user))
    if (!orphanId) throw new HTTPException(404, { message: 'Data demo lama tidak ditemukan' })
    if (orphanId === user.tenant_id || orphanId === user.home_toko_id) {
      throw new HTTPException(409, { message: 'Toko ini sedang aktif dipakai, tidak bisa dibersihkan' })
    }
    await deleteDemoData(demoKodeFor(user))
    return c.json({ success: true, data: { message: 'Data demo lama di prod berhasil dibersihkan' } })
  } catch (e) {
    if (e instanceof HTTPException) throw e
    const msg = e instanceof Error ? e.message : 'Gagal membersihkan data demo lama'
    throw new HTTPException(404, { message: msg })
  }
})

// ── POST /demo/generate ───────────────────────────────────────────────────────
demoRouter.post('/generate', async (c) => {
  const user = c.get('user') as JWTPayload
  try {
    const kode = demoKodeFor(user)
    // SaaS: toko demo harus pakai email pemilik toko asli agar muncul di
    // accessible-context (difilter email_pemilik) → boleh switch-context.
    // Email dibaca dari toko home di PROD (konteks default), sebelum masuk demoDb.
    let emailPemilik: string | null = null
    if (env.saasGating) {
      const home = await query.find<{ email_pemilik: string | null }>(
        db.select({ email_pemilik: toko.email_pemilik }).from(toko).where(eq(toko.id, user.tenant_id))
      )
      emailPemilik = home?.email_pemilik ?? null
    }
    const userSuffix = env.saasGating ? `-${user.tenant_id}` : ''
    // Generate sandbox ke DB demo terpisah.
    const result = await runWithDemo(() => generateDemoData({ kode, emailPemilik, userSuffix }))
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
    await runWithDemo(() => deleteDemoData(demoKodeFor(user)))
    return c.json({ success: true, data: { message: 'Data demo berhasil dihapus' } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Gagal menghapus data demo'
    throw new HTTPException(404, { message: msg })
  }
})
