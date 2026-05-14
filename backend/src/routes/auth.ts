import { Hono } from 'hono'

// placeholder — akan diisi di Fase C
export const authRouter = new Hono()

authRouter.get('/', (c) => c.json({ success: true, data: 'auth ready' }))
