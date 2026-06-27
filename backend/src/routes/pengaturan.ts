import type { JWTPayload } from './auth.ts'
import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { networkInterfaces } from 'node:os'

// Bun = local Pi/dev; Node.js = cloud deployment (Railway, etc.)
const isLocalBun = typeof (globalThis as unknown as { Bun?: unknown }).Bun !== 'undefined'
import { db, sqlite, query, withTransaction, isoNow, dialect } from '../db/index.ts'
import { toko, toko_settings, preferensi_pengguna } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import { HTTPException } from 'hono/http-exception'
import { createBackupStream, restoreFromBackup } from '../utils/backup-logical.ts'

function getLanIps(): string[] {
  if (!isLocalBun) return []
  try {
    const nets = networkInterfaces()
    const results: string[] = []
    for (const iface of Object.values(nets)) {
      for (const net of iface ?? []) {
        if (net.family === 'IPv4' && !net.internal) results.push(net.address)
      }
    }
    return results
  } catch {
    return []
  }
}

export const pengaturanRouter = new Hono<{ Variables: { user: JWTPayload } }>()

// ── GET /pengaturan/publik — tanpa auth, untuk login page ─────────────────
pengaturanRouter.get('/publik', async (c) => {
  const tokoId = Number(c.req.query('toko_id') ?? 1)
  const rows = await query.findAll<typeof toko_settings.$inferSelect>(
    db.select().from(toko_settings).where(eq(toko_settings.toko_id, tokoId))
  )
  const setting = rows.find((r) => r.key === 'nama_toko')
  if (setting?.value) {
    return c.json({ success: true, data: { nama_toko: setting.value } })
  }
  // fallback: baca toko.nama langsung (tenant baru belum punya toko_settings.nama_toko)
  const tokoRow = await query.find<{ nama: string }>(db.select({ nama: toko.nama }).from(toko).where(eq(toko.id, tokoId)))
  return c.json({ success: true, data: { nama_toko: tokoRow?.nama ?? 'Stokasir' } })
})

// ── GET /pengaturan/server-info — info jaringan & sistem ──────────────────
pengaturanRouter.get('/server-info', async (c) => {
  const commitDate = (() => {
    if (!isLocalBun) return process.env.APP_COMMIT_DATE ?? 'unknown'
    try {
      const proc = (globalThis as unknown as { Bun: { spawnSync: (cmd: string[]) => { stdout: { toString: () => string } } } }).Bun.spawnSync(['git', 'log', '-1', '--format=%ci'])
      return proc.stdout.toString().trim() || 'unknown'
    } catch {
      return 'unknown'
    }
  })()

  return c.json({
    success: true,
    data: {
      mode: isLocalBun ? 'local' : 'cloud',
      lan_ips: getLanIps(),
      port_frontend: isLocalBun ? Number(process.env.FRONTEND_PORT ?? 5173) : null,
      port_backend: isLocalBun ? Number(process.env.PORT ?? 3000) : null,
      bun_version: process.versions.bun ?? null,
      platform: process.platform,
      uptime_detik: isLocalBun ? Math.floor(process.uptime()) : null,
      app_version: '0.0.1',
      last_commit_date: commitDate,
    },
  })
})

// Auth middleware — wajib sebelum semua route yang butuh login
// /publik dan /server-info di atas ini tidak butuh auth (by design)
pengaturanRouter.use('*', authMiddleware)
pengaturanRouter.use('*', tenantMiddleware)

const DB_PATH = (process.env.DATABASE_URL ?? './data.db').replace(/^file:/, '')

// ── GET /pengaturan/backup-db — download backup database ─────────────────
// SQLite   → binary .db file (WAL checkpoint + buffer)
// lainnya  → streaming NDJSON.gz logical backup
//   ?include_media=1 → sertakan file uploads/ sebagai base64 (STORAGE_DRIVER=local)

pengaturanRouter.get('/backup-db', requirePermission('pengaturan.kelola'), async (c) => {
  const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 16).replace(/[: ]/g, '-')

  if (dialect === 'sqlite') {
    // WAL checkpoint: flush semua write pending ke file utama sebelum copy
    sqlite.run('PRAGMA wal_checkpoint(TRUNCATE)')

    const file = Bun.file(DB_PATH)
    if (!await file.exists()) throw new HTTPException(500, { message: 'File database tidak ditemukan' })

    const buffer = await file.arrayBuffer()
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="stokasir-backup-${now}.db"`,
        'Content-Length': String(buffer.byteLength),
      },
    })
  }

  // Logical streaming backup untuk Turso/libSQL/PostgreSQL
  const includeMedia = c.req.query('include_media') === '1'
  const rawStream = createBackupStream(includeMedia)
  const gzStream = rawStream.pipeThrough(new CompressionStream('gzip') as any)

  return new Response(gzStream, {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="stokasir-backup-${now}.json.gz"`,
    },
  })
})

// ── POST /pengaturan/restore-db — upload & replace database ──────────────
// SQLite  → upload .db binary, replace file, restart
// lainnya → upload .json.gz, logical restore (truncate + re-insert)

pengaturanRouter.post('/restore-db', requirePermission('pengaturan.kelola'), async (c) => {
  const user = c.get('user') as JWTPayload
  if (user.role !== 'pemilik') {
    throw new HTTPException(403, { message: 'Hanya pemilik yang bisa melakukan restore' })
  }

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) throw new HTTPException(400, { message: 'File backup wajib diunggah' })

  const MAX_SIZE = 500 * 1024 * 1024
  if (file.size > MAX_SIZE) throw new HTTPException(400, { message: 'File terlalu besar (maks 500 MB)' })

  // JSON.gz logical restore (untuk semua dialect, tapi utamanya non-sqlite)
  if (file.name.endsWith('.json.gz')) {
    const stream = file.stream() as unknown as ReadableStream<Uint8Array>
    const result = await restoreFromBackup(stream)
    return c.json({
      success: true,
      data: { message: `Restore selesai: ${result.tables} tabel, ${result.files} file gambar dipulihkan.` },
    })
  }

  // SQLite binary restore
  if (dialect !== 'sqlite') {
    throw new HTTPException(400, { message: 'Upload file .json.gz untuk restore di dialect ini.' })
  }
  if (!file.name.endsWith('.db')) {
    throw new HTTPException(400, { message: 'File harus berekstensi .db atau .json.gz' })
  }

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
  onboarding_selesai: 'false',
}

// ── GET /pengaturan/preferensi/:modul — ambil preferensi user untuk modul ──
// Harus SEBELUM /:key agar tidak tertangkap oleh route dinamis

pengaturanRouter.get('/preferensi/:modul', async (c) => {
  const user = c.get('user')
  const modul = c.req.param('modul')
  const row = await query.find<typeof preferensi_pengguna.$inferSelect>(db.select().from(preferensi_pengguna)
    .where(and(
      eq(preferensi_pengguna.karyawan_id, Number(user.sub)),
      eq(preferensi_pengguna.modul, modul),
    ))
  )
  const nilai = row ? (() => { try { return JSON.parse(row.nilai_json) } catch { return null } })() : null
  return c.json({ success: true, data: nilai })
})

// ── PUT /pengaturan/preferensi/:modul — simpan preferensi user ────────────

pengaturanRouter.put('/preferensi/:modul', async (c) => {
  const user = c.get('user')
  const modul = c.req.param('modul')
  const body = await c.req.json()
  const nilai_json = JSON.stringify(body)
  const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' })

  const existing = await query.find<{ id: number }>(db.select({ id: preferensi_pengguna.id }).from(preferensi_pengguna)
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
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const rows = await query.findAll<typeof toko_settings.$inferSelect>(db.select().from(toko_settings).where(eq(toko_settings.toko_id, tenantId)))

  // Merge dengan defaults agar semua key selalu ada
  const result: Record<string, string> = { ...DEFAULTS }
  for (const row of rows) {
    if (row.value !== null && row.value !== undefined) {
      result[row.key] = row.value
    }
  }

  // nama_toko: sumber kebenaran tunggal = toko.nama. toko_settings.nama_toko
  // belum di-seed saat register, jadi fallback ke toko.nama agar konsisten
  // dengan /publik dan /accessible-context (hindari tampil 'Stokasir').
  if (!rows.some((r) => r.key === 'nama_toko' && r.value)) {
    const tokoRow = await query.find<{ nama: string }>(
      db.select({ nama: toko.nama }).from(toko).where(eq(toko.id, tenantId))
    )
    if (tokoRow?.nama) result.nama_toko = tokoRow.nama
  }

  return c.json({ success: true, data: result })
})

async function upsertSetting(tenantId: number, key: string, value: string) {
  const existing = await query.find(
    db.select().from(toko_settings).where(and(eq(toko_settings.toko_id, tenantId), eq(toko_settings.key, key)))
  )
  if (existing) {
    await query.exec(
      db.update(toko_settings)
        .set({ value, updated_at: isoNow() })
        .where(and(eq(toko_settings.toko_id, tenantId), eq(toko_settings.key, key)))
    )
  } else {
    await query.exec(db.insert(toko_settings).values({ toko_id: tenantId, key, value }))
  }
}

// ── PUT /pengaturan/:key ───────────────────────────────────────────────────

pengaturanRouter.put('/:key', requirePermission('pengaturan.kelola'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const key = c.req.param('key') ?? ''
  const body = await c.req.json<{ value: string }>()

  if (!(key in DEFAULTS)) {
    return c.json({ success: false, error: `Key '${key}' tidak dikenal` }, 400)
  }

  await upsertSetting(tenantId, key, body.value)

  if (key === 'nama_toko') {
    await query.exec(db.update(toko).set({ nama: body.value, updated_at: isoNow() }).where(eq(toko.id, tenantId)))
  }

  return c.json({ success: true, data: { key, value: body.value } })
})

// ── POST /pengaturan/bulk ──────────────────────────────────────────────────
// Simpan banyak key sekaligus dari satu form submit

pengaturanRouter.post('/bulk', requirePermission('pengaturan.kelola'), async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const body = await c.req.json<Record<string, string>>()

  for (const [key, value] of Object.entries(body)) {
    if (!(key in DEFAULTS)) continue
    await upsertSetting(tenantId, key, value)
  }

  if (body.nama_toko) {
    await query.exec(db.update(toko).set({ nama: body.nama_toko, updated_at: isoNow() }).where(eq(toko.id, tenantId)))
  }

  return c.json({ success: true, data: body })
})

