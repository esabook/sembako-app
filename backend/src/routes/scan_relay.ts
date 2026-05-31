import type { JWTPayload } from './auth.ts'
import { Hono } from 'hono'

type ScanData      = { kode: string; qty: number }
type Poller        = { resolve: (data: ScanData | null) => void; timer: ReturnType<typeof setTimeout> }
type PreQtyWaiter  = { resolve: (qty: number) => void; timer: ReturnType<typeof setTimeout> }

const pollers       = new Map<string, Poller>()
const preQtyValues  = new Map<string, number>()          // persistent qty per session
const preQtyWaiters = new Map<string, PreQtyWaiter[]>()  // long-poll waiters

export const scanRelayRouter = new Hono<{ Variables: { user: JWTPayload } }>()

// Kasir listen: long poll — tunggu scan masuk atau 30s timeout
scanRelayRouter.get('/kasir/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId')

  const existing = pollers.get(sessionId)
  if (existing) {
    clearTimeout(existing.timer)
    existing.resolve(null)
  }

  const data = await new Promise<ScanData | null>((resolve) => {
    const timer = setTimeout(() => {
      pollers.delete(sessionId)
      resolve(null)
    }, 30_000)

    pollers.set(sessionId, {
      resolve: (d) => {
        clearTimeout(timer)
        pollers.delete(sessionId)
        resolve(d)
      },
      timer,
    })
  })

  return c.json({ success: true, data })
})

// Phone POST scan
scanRelayRouter.post('/scanner/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId')
  const poller = pollers.get(sessionId)
  console.log(`[relay] POST scan session=${sessionId} pollers_aktif=[${[...pollers.keys()].join(',')}]`)
  if (!poller) return c.json({ success: false, error: 'Kasir tidak terhubung' }, 503)
  const { kode, qty = 1 } = await c.req.json<{ kode: string; qty?: number }>()
  console.log(`[relay] kirim ke kasir: ${kode} qty=${qty}`)
  poller.resolve({ kode, qty })
  return c.json({ success: true })
})

// GET /kasir-pre-qty/:sessionId[?known=N]
// Tanpa ?known → kembalikan nilai tersimpan sekarang (untuk refresh)
// Dengan ?known=N → kembalikan langsung jika berbeda, long-poll jika sama
scanRelayRouter.get('/kasir-pre-qty/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId')
  const current   = preQtyValues.get(sessionId) ?? 1
  const knownStr  = c.req.query('known')

  if (knownStr === undefined || parseInt(knownStr, 10) !== current) {
    return c.json({ success: true, data: { qty: current } })
  }

  const qty = await new Promise<number>((resolve) => {
    const timer = setTimeout(() => {
      const list = preQtyWaiters.get(sessionId) ?? []
      preQtyWaiters.set(sessionId, list.filter(w => w.resolve !== resolve))
      resolve(current)
    }, 30_000)
    const list = preQtyWaiters.get(sessionId) ?? []
    list.push({ resolve, timer })
    preQtyWaiters.set(sessionId, list)
  })

  return c.json({ success: true, data: { qty } })
})

// POST /kasir-pre-qty/:sessionId — update nilai bersama, bangunkan semua waiter
scanRelayRouter.post('/kasir-pre-qty/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId')
  const { qty }   = await c.req.json<{ qty: number }>()
  preQtyValues.set(sessionId, qty)
  const list = preQtyWaiters.get(sessionId) ?? []
  preQtyWaiters.delete(sessionId)
  for (const w of list) { clearTimeout(w.timer); w.resolve(qty) }
  return c.json({ success: true, data: { qty } })
})
