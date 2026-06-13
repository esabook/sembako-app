import sharp from 'sharp'
import { HTTPException } from 'hono/http-exception'
import { storagePut } from './storage.ts'

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
  allowTypes?: RegExp
}

export type SavedUpload = {
  path: string        // relative key (local) or full URL (s3)
  thumb_path?: string
}

export async function saveUpload(file: File, opts: UploadOptions): Promise<SavedUpload> {
  const allowPattern = opts.allowTypes ?? /^image\//
  if (!allowPattern.test(file.type)) {
    throw new HTTPException(400, { message: `Tipe file tidak didukung: ${file.type}` })
  }

  const prefix = opts.prefix != null ? `${opts.prefix}_` : ''
  const filename = `${prefix}${Date.now()}.jpg`
  const key = `${opts.subdir}/${filename}`
  const quality = opts.quality ?? 85
  const buf = Buffer.from(await file.arrayBuffer())

  try {
    let pipeline = sharp(buf)
    if (opts.mode.type === 'contain') {
      pipeline = pipeline.resize(opts.mode.w, opts.mode.h, { fit: 'inside', withoutEnlargement: true })
    } else if (opts.mode.type === 'cover') {
      pipeline = pipeline.resize(opts.mode.w, opts.mode.h, { fit: 'cover' })
    }

    const mainBuf = await pipeline.jpeg({ quality }).toBuffer()
    const path = await storagePut(key, mainBuf)

    const result: SavedUpload = { path }

    if (opts.thumbnail) {
      const thumbBuf = await sharp(buf)
        .resize(opts.thumbnail.w, opts.thumbnail.h, { fit: 'cover' })
        .jpeg({ quality: opts.thumbnail.quality ?? 75 })
        .toBuffer()
      const thumbKey = `${opts.subdir}/thumb_${filename}`
      result.thumb_path = await storagePut(thumbKey, thumbBuf)
    }

    return result
  } catch (e) {
    if (e instanceof HTTPException) throw e
    throw new HTTPException(422, { message: 'Gagal memproses gambar. Pastikan file gambar valid.' })
  }
}
