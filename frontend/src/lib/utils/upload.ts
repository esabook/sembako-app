/**
 * Resolve upload path ke URL yang bisa dipakai di <img src>.
 * - Path relatif  "subdir/file.jpg"  → "/uploads/subdir/file.jpg"
 * - Full URL      "https://..."      → dipakai langsung (S3/R2 mode)
 * - null/undefined                  → null
 */
export function imgUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `/uploads/${path}`
}

/**
 * Khusus thumbnail: ganti "med_" → "thumb_" sebelum resolve.
 * Tetap aman untuk full URL (tidak ada "med_" di URL S3).
 */
export function thumbUrl(path: string | null | undefined): string | null {
  if (!path) return null
  const thumb = path.replace('/med_', '/thumb_')
  return imgUrl(thumb)
}
