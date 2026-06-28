// ── Langganan Route ───────────────────────────────────────────────────────
// GET  /langganan        — status langganan toko + sisa hari + riwayat bukti
// POST /langganan/bukti  — upload bukti transfer (multipart) → antrian verifikasi
//
// Dikecualikan dari gating (whitelist prefix /langganan di langgananMiddleware)
// supaya toko suspended tetap bisa lihat status & kirim bukti bayar.

import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db, query } from '../db/index.ts'
import { toko, pembayaran_langganan } from '../db/schema.ts'
import { authMiddleware } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import type { JWTPayload } from './auth.ts'
import { saveUpload } from '../utils/upload.ts'

export const langgananRouter = new Hono<{ Variables: { user: JWTPayload } }>()

langgananRouter.use('*', authMiddleware)
langgananRouter.use('*', tenantMiddleware)

// Sisa hari menuju tanggal acuan (trial/aktif). Negatif = sudah lewat.
function sisaHari(target: string | null): number | null {
  if (!target) return null
  const ms = new Date(target).getTime() - Date.now()
  return Math.ceil(ms / 86_400_000)
}

// ── GET / — status langganan + riwayat pembayaran ─────────────────────────

langgananRouter.get('/', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1

  const row = await query.find<{
    status_langganan: string
    trial_berakhir: string | null
    aktif_sampai: string | null
  }>(
    db
      .select({
        status_langganan: toko.status_langganan,
        trial_berakhir: toko.trial_berakhir,
        aktif_sampai: toko.aktif_sampai,
      })
      .from(toko)
      .where(eq(toko.id, tenantId))
  )

  if (!row) throw new HTTPException(404, { message: 'Toko tidak ditemukan' })

  const acuan = row.status_langganan === 'aktif' ? row.aktif_sampai : row.trial_berakhir

  const riwayat = await query.findAll<typeof pembayaran_langganan.$inferSelect>(
    db
      .select()
      .from(pembayaran_langganan)
      .where(eq(pembayaran_langganan.toko_id, tenantId))
      .orderBy(desc(pembayaran_langganan.id))
  )

  return c.json({
    success: true,
    data: {
      status_langganan: row.status_langganan,
      trial_berakhir: row.trial_berakhir,
      aktif_sampai: row.aktif_sampai,
      sisa_hari: sisaHari(acuan),
      riwayat,
    },
  })
})

// ── POST /bukti — upload bukti transfer ───────────────────────────────────
// Form fields: nominal (number), periode_bulan (number, default 1), file (File)

langgananRouter.post('/bukti', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const formData = await c.req.formData()

  const nominal = Number(formData.get('nominal'))
  const periodeBulan = Number(formData.get('periode_bulan')) || 1
  const file = formData.get('file') as File | null

  if (!nominal || Number.isNaN(nominal) || nominal <= 0) {
    throw new HTTPException(400, { message: 'nominal wajib' })
  }
  if (!file?.size) throw new HTTPException(400, { message: 'file bukti wajib' })

  const isImage = /^image\//.test(file.type)
  const isPdf = file.type === 'application/pdf'
  if (!isImage && !isPdf) {
    throw new HTTPException(400, { message: 'Tipe file tidak didukung — hanya gambar atau PDF' })
  }

  const subdir = `langganan/${tenantId}`
  let buktiPath: string

  if (isImage) {
    const saved = await saveUpload(file, {
      subdir,
      prefix: 'bukti',
      mode: { type: 'contain', w: 1600, h: 1600 },
      quality: 85,
    })
    buktiPath = saved.path
  } else {
    const { mkdirSync, writeFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const uploadDir = process.env.UPLOAD_DIR ?? join(import.meta.dir, '../../uploads')
    const dir = join(uploadDir, subdir)
    mkdirSync(dir, { recursive: true })
    const filename = `bukti_${Date.now()}.pdf`
    writeFileSync(join(dir, filename), Buffer.from(await file.arrayBuffer()))
    buktiPath = `${subdir}/${filename}`
  }

  const row = await query.ret<typeof pembayaran_langganan.$inferSelect>(
    db
      .insert(pembayaran_langganan)
      .values({
        toko_id: tenantId,
        periode_bulan: periodeBulan,
        nominal,
        bukti_path: buktiPath,
        status: 'menunggu',
      })
      .returning()
  )

  return c.json({ success: true, data: row }, 201)
})
