import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { authMiddleware } from '../middleware/auth.ts'
import type { JWTPayload } from './auth.ts'
import { generateDemoData, deleteDemoData, getDemoTokoId, getDemoStats } from '../db/demo.ts'

export const demoRouter = new Hono<{ Variables: { user: JWTPayload } }>()

demoRouter.use('*', authMiddleware)

// Semua endpoint demo hanya boleh diakses pemilik
demoRouter.use('*', async (c, next) => {
  const user = c.get('user') as JWTPayload
  if (user.role !== 'pemilik') throw new HTTPException(403, { message: 'Hanya pemilik yang bisa akses fitur demo' })
  await next()
})

// ── GET /demo/status ──────────────────────────────────────────────────────────
demoRouter.get('/status', async (c) => {
  const tokoId = await getDemoTokoId()
  if (!tokoId) return c.json({ success: true, data: { exists: false } })
  const stats = await getDemoStats(tokoId)
  return c.json({ success: true, data: { exists: true, toko_id: tokoId, ...stats } })
})

// ── POST /demo/generate ───────────────────────────────────────────────────────
demoRouter.post('/generate', async (c) => {
  const result = await generateDemoData()
  return c.json({
    success: true,
    data: {
      message: 'Data demo berhasil di-generate. Login demo: demo-admin / demo123',
      toko_id: result.toko_id,
    },
  }, 201)
})

// ── DELETE /demo ──────────────────────────────────────────────────────────────
demoRouter.delete('/', async (c) => {
  await deleteDemoData()
  return c.json({ success: true, data: { message: 'Data demo berhasil dihapus' } })
})
