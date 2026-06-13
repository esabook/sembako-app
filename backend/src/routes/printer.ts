// Proxy endpoint ke Go printer agent — mendukung dua skenario:
// A (on-premise/Pi): backend proxy ke localhost:PORT
// B (cloud VPS):     frontend panggil localhost:PORT langsung (tidak lewat sini)
import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import { db, query } from '../db/index.ts'
import { toko_settings } from '../db/schema.ts'
import type { JWTPayload } from './auth.ts'

export const printerRouter = new Hono<{ Variables: { user: JWTPayload } }>()
printerRouter.use('*', authMiddleware)
printerRouter.use('*', tenantMiddleware)

async function getBridgePort(tenantId: number): Promise<number> {
  const row = await query.find(
    db.select().from(toko_settings).where(
      and(eq(toko_settings.toko_id, tenantId), eq(toko_settings.key, 'printer_bridge_port'))
    )
  )
  return Number(row?.value ?? '9999')
}

// GET /printer/status — cek apakah Go agent aktif (untuk skenario A)
printerRouter.get('/status', requirePermission('stok.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const port = await getBridgePort(tenantId)
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: AbortSignal.timeout(2000),
    })
    if (!res.ok) return c.json({ success: false, error: 'agent_error' }, 502)
    const data = await res.json() as Record<string, unknown>
    return c.json({ success: true, data })
  } catch {
    return c.json({ success: false, error: 'bridge_offline' }, 503)
  }
})

// POST /printer/cetak — proxy print request ke Go agent (skenario A)
printerRouter.post('/cetak', requirePermission('stok.lihat'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const port = await getBridgePort(tenantId)
  const body = await c.req.text()
  try {
    const res = await fetch(`http://127.0.0.1:${port}/cetak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(10000),
    })
    const data = await res.json() as Record<string, unknown>
    if (!res.ok || !data.ok) {
      return c.json({ success: false, error: data.error ?? 'printer_error' }, 502)
    }
    return c.json({ success: true, data })
  } catch {
    return c.json({ success: false, error: 'bridge_offline' }, 503)
  }
})

// POST /printer/test — proxy test print ke Go agent
printerRouter.post('/test', requirePermission('*'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const port = await getBridgePort(tenantId)
  try {
    const res = await fetch(`http://127.0.0.1:${port}/test`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
    })
    const data = await res.json() as Record<string, unknown>
    if (!res.ok || !data.ok) {
      return c.json({ success: false, error: data.error ?? 'printer_error' }, 502)
    }
    return c.json({ success: true, data })
  } catch {
    return c.json({ success: false, error: 'bridge_offline' }, 503)
  }
})
