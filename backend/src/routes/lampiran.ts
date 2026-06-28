// ── B6: Lampiran Route ────────────────────────────────────────────────────
// POST /lampiran                     — upload file (multipart)
// GET  /lampiran?referensi_tipe=X&referensi_id=Y  — list lampiran dokumen
// DELETE /lampiran/:id               — hapus file + record

import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { db, query, } from '../db/index.ts'
import { lampiran } from '../db/schema.ts'
import { authMiddleware } from '../middleware/auth.ts'
import { tenantMiddleware } from '../middleware/tenant.ts'
import type { JWTPayload } from './auth.ts'
import { saveUpload } from '../utils/upload.ts'

export const lampiranRouter = new Hono<{ Variables: { user: JWTPayload } }>()

lampiranRouter.use('*', authMiddleware)
lampiranRouter.use('*', tenantMiddleware)

// ── GET / — list lampiran untuk satu dokumen ─────────────────────────────

lampiranRouter.get('/', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const referensiTipe = c.req.query('referensi_tipe')
  const referensiId = c.req.query('referensi_id')

  if (!referensiTipe || !referensiId) {
    throw new HTTPException(400, { message: 'referensi_tipe dan referensi_id wajib' })
  }

  const rows = await query.findAll(db
    .select()
    .from(lampiran)
    .where(
      and(
        eq(lampiran.tenant_id, tenantId),
        eq(lampiran.referensi_tipe, referensiTipe),
        eq(lampiran.referensi_id, Number(referensiId)),
      ),
    )
    )

  return c.json({ success: true, data: rows })
})

// ── POST / — upload file baru ─────────────────────────────────────────────
// Form fields: referensi_tipe (text), referensi_id (number), file (File)
// Query param: ?thumb=1 untuk generate thumbnail (default: tidak)

lampiranRouter.post('/', async (c) => {
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1
  const formData = await c.req.formData()

  const referensiTipe = formData.get('referensi_tipe') as string | null
  const referensiId = Number(formData.get('referensi_id'))
  const file = formData.get('file') as File | null

  if (!referensiTipe?.trim()) throw new HTTPException(400, { message: 'referensi_tipe wajib' })
  if (!referensiId || Number.isNaN(referensiId)) throw new HTTPException(400, { message: 'referensi_id wajib' })
  if (!file?.size) throw new HTTPException(400, { message: 'file wajib' })

  const isImage = /^image\//.test(file.type)
  const isPdf = file.type === 'application/pdf'
  if (!isImage && !isPdf) {
    throw new HTTPException(400, { message: 'Tipe file tidak didukung — hanya gambar atau PDF' })
  }

  const withThumb = c.req.query('thumb') === '1'
  const subdir = `lampiran/${referensiTipe}`
  const tipe = isImage ? 'gambar' : 'pdf'

  let path: string
  let thumb_path: string | undefined

  if (isImage) {
    const saved = await saveUpload(file, {
      subdir,
      prefix: `${referensiId}`,
      mode: { type: 'contain', w: 1200, h: 1200 },
      quality: 88,
      thumbnail: withThumb ? { w: 120, h: 120 } : undefined,
    })
    path = saved.path
    thumb_path = saved.thumb_path
  } else {
    // PDF: simpan langsung tanpa proses
    const { mkdirSync, writeFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const uploadDir = process.env.UPLOAD_DIR ?? join(import.meta.dir, '../../uploads')
    const dir = join(uploadDir, subdir)
    mkdirSync(dir, { recursive: true })
    const filename = `${referensiId}_${Date.now()}.pdf`
    writeFileSync(join(dir, filename), Buffer.from(await file.arrayBuffer()))
    path = `${subdir}/${filename}`
  }

  const row = await query.find(db
    .insert(lampiran)
    .values({
      tenant_id: tenantId,
      referensi_tipe: referensiTipe,
      referensi_id: referensiId,
      tipe,
      path,
      thumb_path,
      nama_asli: file.name,
      ukuran: file.size,
      uploaded_by: user.id,
    })
    .returning()
    )

  return c.json({ success: true, data: row }, 201)
})

// ── DELETE /:id — hapus file dan record ──────────────────────────────────

lampiranRouter.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const user = c.get('user') as JWTPayload
  const tenantId = user.tenant_id ?? 1

  const row = await query.find<typeof lampiran.$inferSelect>(db.select().from(lampiran).where(and(eq(lampiran.id, id), eq(lampiran.tenant_id, tenantId))))
  if (!row) throw new HTTPException(404, { message: 'Lampiran tidak ditemukan' })

  // Pemilik file atau manajer/pemilik toko boleh hapus
  if (row.uploaded_by !== user.id && !['pemilik', 'manajer'].includes(user.role)) {
    throw new HTTPException(403, { message: 'Tidak boleh menghapus lampiran milik orang lain' })
  }

  const uploadDir = process.env.UPLOAD_DIR ?? join(import.meta.dir, '../../uploads')

  const mainPath = join(uploadDir, row.path)
  if (existsSync(mainPath)) unlinkSync(mainPath)

  if (row.thumb_path) {
    const thumbPath = join(uploadDir, row.thumb_path)
    if (existsSync(thumbPath)) unlinkSync(thumbPath)
  }

  await query.exec(db.delete(lampiran).where(and(eq(lampiran.id, id), eq(lampiran.tenant_id, tenantId))))

  return c.json({ success: true, data: null })
})
