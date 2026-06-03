// ── B6: Upload Utility ────────────────────────────────────────────────────
// Satu fungsi saveUpload() menggantikan boilerplate upload di barang/karyawan/barang_masuk.
// Semua route upload cukup panggil saveUpload() dan simpan path yang dikembalikan.

import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { HTTPException } from 'hono/http-exception'

type ImageMode =
  | { type: 'passthrough' }
  | { type: 'contain'; w: number; h: number }
  | { type: 'cover'; w: number; h: number }

export type UploadOptions = {
  subdir: string
  prefix?: string | number
  mode: ImageMode
  quality?: number
  thumbnail?: { w: number; h: number; quality?: number }
  allowTypes?: RegExp   // default /^image\//
}

export type SavedUpload = {
  path: string        // path utama, relatif dari uploads/
  thumb_path?: string // thumbnail jika diminta
}

function getUploadDir(): string {
  return process.env.UPLOAD_DIR ?? join(import.meta.dir, '../../uploads')
}

export async function saveUpload(file: File, opts: UploadOptions): Promise<SavedUpload> {
  const allowPattern = opts.allowTypes ?? /^image\//
  if (!allowPattern.test(file.type)) {
    throw new HTTPException(400, { message: `Tipe file tidak didukung: ${file.type}` })
  }

  const uploadDir = getUploadDir()
  const targetDir = join(uploadDir, opts.subdir)
  mkdirSync(targetDir, { recursive: true })

  const prefix = opts.prefix != null ? `${opts.prefix}_` : ''
  const filename = `${prefix}${Date.now()}.jpg`
  const quality = opts.quality ?? 85
  const buf = Buffer.from(await file.arrayBuffer())

  try {
    // Gambar utama
    let pipeline = sharp(buf)
    if (opts.mode.type === 'contain') {
      pipeline = pipeline.resize(opts.mode.w, opts.mode.h, { fit: 'inside', withoutEnlargement: true })
    } else if (opts.mode.type === 'cover') {
      pipeline = pipeline.resize(opts.mode.w, opts.mode.h, { fit: 'cover' })
    }
    // passthrough: tidak ada resize

    const mainBuf = await pipeline.jpeg({ quality }).toBuffer()
    writeFileSync(join(targetDir, filename), mainBuf)

    const result: SavedUpload = { path: `${opts.subdir}/${filename}` }

    // Thumbnail opsional
    if (opts.thumbnail) {
      const thumbBuf = await sharp(buf)
        .resize(opts.thumbnail.w, opts.thumbnail.h, { fit: 'cover' })
        .jpeg({ quality: opts.thumbnail.quality ?? 75 })
        .toBuffer()
      const thumbFilename = `thumb_${filename}`
      writeFileSync(join(targetDir, thumbFilename), thumbBuf)
      result.thumb_path = `${opts.subdir}/${thumbFilename}`
    }

    return result
  } catch {
    throw new HTTPException(422, { message: 'Gagal memproses gambar. Pastikan file gambar valid.' })
  }
}
