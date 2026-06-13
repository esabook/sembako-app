/**
 * Storage driver abstraction.
 * STORAGE_DRIVER=local  → save to UPLOAD_DIR, returns relative key   "subdir/file.jpg"
 * STORAGE_DRIVER=s3     → upload to S3/R2,     returns full URL       "https://cdn.../subdir/file.jpg"
 *
 * Env vars for s3 driver:
 *   S3_ENDPOINT        — e.g. https://<account>.r2.cloudflarestorage.com  (R2 / MinIO / Tigris)
 *   S3_ACCESS_KEY_ID
 *   S3_SECRET_ACCESS_KEY
 *   S3_BUCKET
 *   S3_REGION          — default "auto" (R2), set "us-east-1" for AWS
 *   S3_PUBLIC_URL      — public base URL e.g. https://cdn.example.com
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'

const DRIVER = (process.env.STORAGE_DRIVER ?? 'local') as 'local' | 's3'

function localUploadDir(): string {
  return process.env.UPLOAD_DIR ?? join(import.meta.dir, '../../../uploads')
}

export function storagePutSync(key: string, data: Buffer): string {
  if (DRIVER === 's3') throw new Error('storagePutSync: use storagePut for s3 driver')
  const fullPath = join(localUploadDir(), key)
  mkdirSync(dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, data)
  return key
}

export async function storagePut(key: string, data: Buffer, contentType = 'image/jpeg'): Promise<string> {
  if (DRIVER === 's3') {
    return s3Put(key, data, contentType)
  }
  return storagePutSync(key, data)
}

async function s3Put(key: string, data: Buffer, contentType: string): Promise<string> {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
  const client = new S3Client({
    region: process.env.S3_REGION ?? 'auto',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  })
  await client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    Body: data,
    ContentType: contentType,
  }))
  const base = (process.env.S3_PUBLIC_URL ?? '').replace(/\/$/, '')
  return `${base}/${key}`
}

export function storageDriver(): 'local' | 's3' {
  return DRIVER
}
