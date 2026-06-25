/**
 * Resize gambar di browser sebelum upload — mengurangi bandwidth upload.
 * Menggunakan Canvas API (hanya jalan di browser, bukan SSR).
 *
 * @param file    File gambar input
 * @param maxW    Lebar maksimum output
 * @param maxH    Tinggi maksimum output
 * @param quality Kualitas JPEG 0–1 (default 0.85)
 * @param fit     'inside' = scale down tanpa crop | 'cover' = crop ke ukuran persis
 */
export function resizeImage(
  file: File,
  maxW: number,
  maxH: number,
  quality = 0.85,
  fit: 'inside' | 'cover' = 'inside',
): Promise<File> {
  return new Promise((resolve, reject) => {
    const blobUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(blobUrl)
      const srcW = img.naturalWidth
      const srcH = img.naturalHeight

      let canvasW: number, canvasH: number
      let sx = 0, sy = 0, sw = srcW, sh = srcH

      if (fit === 'inside') {
        // Scale down agar muat dalam maxW × maxH, tidak pernah upscale
        const ratio = Math.min(maxW / srcW, maxH / srcH, 1)
        canvasW = Math.round(srcW * ratio)
        canvasH = Math.round(srcH * ratio)
      } else {
        // Cover: scale hingga kedua sisi terisi, lalu center-crop
        const ratio = Math.max(maxW / srcW, maxH / srcH)
        const scaledW = srcW * ratio
        const scaledH = srcH * ratio
        // Hitung source crop area dalam koordinat gambar asli
        sx = (scaledW - maxW) / 2 / ratio
        sy = (scaledH - maxH) / 2 / ratio
        sw = maxW / ratio
        sh = maxH / ratio
        canvasW = maxW
        canvasH = maxH
      }

      const canvas = document.createElement('canvas')
      canvas.width = canvasW
      canvas.height = canvasH
      const ctx = canvas.getContext('2d')!

      if (fit === 'cover') {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvasW, canvasH)
      } else {
        ctx.drawImage(img, 0, 0, canvasW, canvasH)
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Resize gagal')); return }
          const outName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
          resolve(new File([blob], outName, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl)
      reject(new Error('Gagal load gambar'))
    }

    img.src = blobUrl
  })
}
