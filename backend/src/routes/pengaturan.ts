import type { JWTPayload } from './auth.ts'
import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { networkInterfaces } from 'node:os'
import { db, sqlite, query, withTransaction, isoNow, dialect } from '../db/index.ts'
import { toko_settings, preferensi_pengguna } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { HTTPException } from 'hono/http-exception'

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
  const rows = await query.findAll(db.select().from(toko_settings))
  const row = rows.find((r) => r.key === 'nama_toko')
  return c.json({ success: true, data: { nama_toko: row?.value ?? 'Stokasir' } })
})

// ── GET /pengaturan/server-info — info jaringan & sistem ──────────────────
pengaturanRouter.get('/server-info', async (c) => {
  const commitDate = (() => {
    try {
      const proc = Bun.spawnSync(['git', 'log', '-1', '--format=%ci'])
      return proc.stdout.toString().trim() || 'unknown'
    } catch {
      return 'unknown'
    }
  })()

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
      last_commit_date: commitDate,
    },
  })
})

// Auth middleware — wajib sebelum semua route yang butuh login
// /publik dan /server-info di atas ini tidak butuh auth (by design)
pengaturanRouter.use('*', authMiddleware)

const DB_PATH = (process.env.DATABASE_URL ?? './data.db').replace(/^file:/, '')

// ── GET /pengaturan/backup-db — download file SQLite ─────────────────────

pengaturanRouter.get('/backup-db', requirePermission('*'), async (c) => {
  if (dialect !== 'sqlite') {
    throw new HTTPException(501, { message: `Backup tidak tersedia untuk dialect ${dialect}. Gunakan dashboard provider (Turso/Supabase).` })
  }

  // WAL checkpoint: flush semua write pending ke file utama sebelum copy
  sqlite.run('PRAGMA wal_checkpoint(TRUNCATE)')

  const file = Bun.file(DB_PATH)
  if (!await file.exists()) throw new HTTPException(500, { message: 'File database tidak ditemukan' })

  const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 16).replace(/[: ]/g, '-')
  const buffer = await file.arrayBuffer()

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="stokasir-backup-${now}.db"`,
      'Content-Length': String(buffer.byteLength),
    },
  })
})

// ── POST /pengaturan/restore-db — upload & replace database ──────────────

pengaturanRouter.post('/restore-db', requirePermission('*'), async (c) => {
  if (dialect !== 'sqlite') {
    throw new HTTPException(501, { message: `Restore tidak tersedia untuk dialect ${dialect}. Gunakan dashboard provider (Turso/Supabase).` })
  }

  const user = c.get('user') as JWTPayload
  if (user.role !== 'pemilik') {
    throw new HTTPException(403, { message: 'Hanya pemilik yang bisa melakukan restore' })
  }

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) throw new HTTPException(400, { message: 'File database wajib diunggah' })
  if (!file.name.endsWith('.db')) throw new HTTPException(400, { message: 'File harus berekstensi .db' })

  const MAX_SIZE = 500 * 1024 * 1024 // 500 MB
  if (file.size > MAX_SIZE) throw new HTTPException(400, { message: 'File terlalu besar (maks 500 MB)' })

  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  // Validasi magic bytes SQLite: "SQLite format 3\000"
  const magic = String.fromCharCode(...bytes.slice(0, 16))
  if (!magic.startsWith('SQLite format 3')) {
    throw new HTTPException(400, { message: 'File bukan database SQLite yang valid' })
  }

  sqlite.run('PRAGMA wal_checkpoint(TRUNCATE)')
  sqlite.close()
  await Bun.write(DB_PATH, buffer)

  // Beri waktu respons terkirim sebelum proses mati
  setTimeout(() => process.exit(0), 200)

  return c.json({
    success: true,
    data: { message: 'Database berhasil direstore. Server akan restart dalam beberapa detik.' },
  })
})

// Nilai default untuk semua key settings
const DEFAULTS: Record<string, string> = {
  nama_toko: 'Stokasir',
  alamat: '',
  telepon: '',
  email: '',
  struk_header: '',
  struk_footer: 'Terima kasih sudah berbelanja!',
  struk_ukuran: '80',
  struk_copy: '1',
  auto_cetak: 'false',
  printer_mode: 'browser',
  printer_bridge_port: '9999',
  wa_nomor: '',
  tema_default: 'dark',
  harga_default: 'eceran',
}

// ── GET /pengaturan/preferensi/:modul — ambil preferensi user untuk modul ──
// Harus SEBELUM /:key agar tidak tertangkap oleh route dinamis

pengaturanRouter.get('/preferensi/:modul', async (c) => {
  const user = c.get('user')
  const modul = c.req.param('modul')
  const row = await query.find(db.select().from(preferensi_pengguna)
    .where(and(
      eq(preferensi_pengguna.karyawan_id, Number(user.sub)),
      eq(preferensi_pengguna.modul, modul),
    ))
  )
  const nilai = row ? (() => { try { return JSON.parse(row.nilai_json) } catch { return null } }) : null
  return c.json({ success: true, data: nilai })
})

// ── PUT /pengaturan/preferensi/:modul — simpan preferensi user ────────────

pengaturanRouter.put('/preferensi/:modul', async (c) => {
  const user = c.get('user')
  const modul = c.req.param('modul')
  const body = await c.req.json()
  const nilai_json = JSON.stringify(body)
  const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' })

  const existing = await query.find(db.select({ id: preferensi_pengguna.id }).from(preferensi_pengguna)
    .where(and(
      eq(preferensi_pengguna.karyawan_id, Number(user.sub)),
      eq(preferensi_pengguna.modul, modul),
    ))
  )

  if (existing) {
    await query.exec(db.update(preferensi_pengguna)
      .set({ nilai_json, updated_at: now })
      .where(eq(preferensi_pengguna.id, existing.id))
    )
  } else {
    await query.exec(db.insert(preferensi_pengguna)
      .values({ karyawan_id: Number(user.sub), modul, nilai_json, updated_at: now })
    )
  }

  return c.json({ success: true, data: body })
})

// ── GET /pengaturan ────────────────────────────────────────────────────────

pengaturanRouter.get('/', async (c) => {
  const rows = await query.findAll(db.select().from(toko_settings))

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

  const existing = await query.find(db.select().from(toko_settings).where(eq(toko_settings.key, key)))

  if (existing) {
    await query.exec(db.update(toko_settings)
      .set({
        value: body.value,
        updated_at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }),
      })
      .where(eq(toko_settings.key, key))
    )
  } else {
    await query.exec(db.insert(toko_settings).values({ key, value: body.value }))
  }

  return c.json({ success: true, data: { key, value: body.value } })
})

// ── POST /pengaturan/bulk ──────────────────────────────────────────────────
// Simpan banyak key sekaligus dari satu form submit

pengaturanRouter.post('/bulk', requirePermission('*'), async (c) => {
  const body = await c.req.json<Record<string, string>>()

  for (const [key, value] of Object.entries(body)) {
    if (!(key in DEFAULTS)) continue

    const existing = await query.find(db.select().from(toko_settings).where(eq(toko_settings.key, key)))
    if (existing) {
      await query.exec(db.update(toko_settings)
        .set({
          value,
          updated_at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }),
        })
        .where(eq(toko_settings.key, key))
      )
    } else {
      await query.exec(db.insert(toko_settings).values({ key, value }))
    }
  }

  return c.json({ success: true, data: body })
})

