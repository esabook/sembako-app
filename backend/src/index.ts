import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authRouter } from './routes/auth.ts'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
}))

app.get('/health', (c) => c.json({ success: true, data: { status: 'ok' } }))

app.route('/auth', authRouter)

const PORT = Number(process.env.PORT ?? 3000)
console.log(`Backend berjalan di http://localhost:${PORT}`)

export default {
  port: PORT,
  fetch: app.fetch,
}
