import type { JWTPayload } from './auth.ts'
import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { networkInterfaces } from 'node:os'
import { db } from '../db/index.ts'
import { toko_settings } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'

function getLanIps(): string[] {
  const nets = networkInterfaces()
  const results: string[] = []
  for (const iface of Object.values(nets)) {
    for (const net of iface ?? []) {
      if (net.family === 'IPv4' && !net.internal) results.push(net.address)
    }
  }
  return results
}

export const pengaturanRouter = new Hono<{ Variables: { user: JWTPayload } }>()

// ── GET /pengaturan/publik — tanpa auth, untuk login page ─────────────────
pengaturanRouter.get('/publik', async (c) => {
  const row = db.select().from(toko_settings).all().find((r) => r.key === 'nama_toko')
  return c.json({ success: true, data: { nama_toko: row?.value ?? 'Toko Sembako' } })
})

// ── GET /pengaturan/server-info — info jaringan & sistem ──────────────────
pengaturanRouter.get('/server-info', async (c) => {
  return c.json({
    success: true,
    data: {
      lan_ips: getLanIps(),
      port_frontend: Number(process.env.FRONTEND_PORT ?? 5173),
      port_backend: Number(process.env.PORT ?? 3000),
      bun_version: process.versions.bun ?? 'unknown',
      platform: process.platform,
      uptime_detik: Math.floor(process.uptime()),
      app_version: '0.0.1',
    },
  })
})

// ── GET /pengaturan/backup-db — download file SQLite ─────────────────────
pengaturanRouter.get('/backup-db', requirePermission('*'), async (c) => {
  const dbPath = process.env.DATABASE_URL ?? './data.db'
  const file = Bun.file(dbPath)
  const tgl = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
  return new Response(file, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="sembako-backup-${tgl}.db"`,
    },
  })
})

pengaturanRouter.use('*', authMiddleware)

// Nilai default untuk semua key settings
const DEFAULTS: Record<string, string> = {
  nama_toko: 'Toko Sembako',
  alamat: '',
  telepon: '',
  email: '',
  struk_header: '',
  struk_footer: 'Terima kasih sudah berbelanja!',
  struk_ukuran: '80',
  wa_nomor: '',
  tema_default: 'dark',
  harga_default: 'eceran',
}

// ── GET /pengaturan ────────────────────────────────────────────────────────

pengaturanRouter.get('/', async (c) => {
  const rows = db.select().from(toko_settings).all()

  // Merge dengan defaults agar semua key selalu ada
  const result: Record<string, string> = { ...DEFAULTS }
  for (const row of rows) {
    if (row.value !== null && row.value !== undefined) {
      result[row.key] = row.value
    }
  }

  return c.json({ success: true, data: result })
})

// ── PUT /pengaturan/:key ───────────────────────────────────────────────────

pengaturanRouter.put('/:key', requirePermission('*'), async (c) => {
  const key = c.req.param('key') ?? ''
  const body = await c.req.json<{ value: string }>()

  if (!(key in DEFAULTS)) {
    return c.json({ success: false, error: `Key '${key}' tidak dikenal` }, 400)
  }

  const existing = db.select().from(toko_settings).where(eq(toko_settings.key, key)).get()

  if (existing) {
    db.update(toko_settings)
      .set({
        value: body.value,
        updated_at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }),
      })
      .where(eq(toko_settings.key, key))
      .run()
  } else {
    db.insert(toko_settings).values({ key, value: body.value }).run()
  }

  return c.json({ success: true, data: { key, value: body.value } })
})

// ── POST /pengaturan/bulk ──────────────────────────────────────────────────
// Simpan banyak key sekaligus dari satu form submit

pengaturanRouter.post('/bulk', requirePermission('*'), async (c) => {
  const body = await c.req.json<Record<string, string>>()

  for (const [key, value] of Object.entries(body)) {
    if (!(key in DEFAULTS)) continue

    const existing = db.select().from(toko_settings).where(eq(toko_settings.key, key)).get()
    if (existing) {
      db.update(toko_settings)
        .set({
          value,
          updated_at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }),
        })
        .where(eq(toko_settings.key, key))
        .run()
    } else {
      db.insert(toko_settings).values({ key, value }).run()
    }
  }

  return c.json({ success: true, data: body })
})
