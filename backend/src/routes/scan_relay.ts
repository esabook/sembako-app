import type { JWTPayload } from './auth.ts'
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'

type Session = { send: (data: string) => Promise<void> }

const sessions = new Map<string, Session>()
const cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>()

function scheduleCleanup(sessionId: string) {
  const existing = cleanupTimers.get(sessionId)
  if (existing) clearTimeout(existing)
  const t = setTimeout(() => {
    sessions.delete(sessionId)
    cleanupTimers.delete(sessionId)
  }, 30_000)
  cleanupTimers.set(sessionId, t)
}

function cancelCleanup(sessionId: string) {
  const t = cleanupTimers.get(sessionId)
  if (t) { clearTimeout(t); cleanupTimers.delete(sessionId) }
}

export const scanRelayRouter = new Hono<{ Variables: { user: JWTPayload } }>()

// Kasir listen via SSE
scanRelayRouter.get('/kasir/:sessionId', (c) => {
  const sessionId = c.req.param('sessionId')
  return streamSSE(c, async (stream) => {
    cancelCleanup(sessionId)
    sessions.set(sessionId, {
      send: async (data) => { await stream.writeSSE({ data }) },
    })
    await stream.writeSSE({ data: JSON.stringify({ type: 'ready' }) })
    while (!stream.closed) {
      await stream.sleep(10000)
      if (!stream.closed) await stream.writeSSE({ data: JSON.stringify({ type: 'ping' }) })
    }
    scheduleCleanup(sessionId)
  })
})

// Phone POST scan
scanRelayRouter.post('/scanner/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId')
  const session = sessions.get(sessionId)
  console.log(`[relay] POST scan session=${sessionId} sessions_aktif=[${[...sessions.keys()].join(',')}]`)
  if (!session) return c.json({ success: false, error: 'Session tidak ditemukan' }, 404)
  const { kode, qty = 1 } = await c.req.json<{ kode: string; qty?: number }>()
  console.log(`[relay] kirim ke kasir: ${kode} qty=${qty}`)
  await session.send(JSON.stringify({ type: 'scan', kode, qty }))
  return c.json({ success: true })
})
