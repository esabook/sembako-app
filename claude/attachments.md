# Attachment / Lampiran

File: `backend/src/utils/upload.ts` (helper), `backend/src/routes/lampiran.ts` (endpoint).
Gunakan Sharp untuk resize — bukan Jimp.

## saveUpload() — helper upload gambar

```typescript
import { saveUpload } from '../utils/upload.ts'

// Contoh: gambar produk dengan thumbnail
const { path, thumb_path } = await saveUpload(file, {
  subdir: 'produk',
  prefix: id,
  mode: { type: 'contain', w: 300, h: 300 },
  quality: 85,
  thumbnail: { w: 60, h: 60, quality: 80 },
})

// Contoh: invoice resolusi tinggi tanpa resize
const { path } = await saveUpload(file, {
  subdir: 'invoice',
  prefix: id,
  mode: { type: 'passthrough' },
  quality: 90,
})
```

Mode:
- `contain` — muat dalam kotak, tidak crop
- `cover` — isi penuh kotak, crop tengah
- `passthrough` — tidak resize, hanya konversi JPEG

## Tabel lampiran

```text
POST /lampiran                                  — upload (multipart: referensi_tipe, referensi_id, file)
GET  /lampiran?referensi_tipe=X&referensi_id=Y  — list
DELETE /lampiran/:id                            — hapus file + record
```

Query param `?thumb=1` di POST untuk generate thumbnail 120×120.
Mendukung gambar (`image/*`) dan PDF (`application/pdf`).

Modul yang sudah punya kolom foto sendiri (barang/karyawan/barang_masuk) tetap pakai kolom itu, tapi sudah refaktor ke `saveUpload()`.
Modul baru → simpan ke tabel `lampiran` via `POST /lampiran`.
