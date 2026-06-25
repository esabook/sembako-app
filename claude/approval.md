# Approval Gate

Primitif approval lintas modul. Modul apapun bisa pakai tanpa duplikasi logika status.

File: `backend/src/utils/approval.ts` (helper), `backend/src/routes/approval.ts` (endpoint).

## Cara pakai di route

```typescript
import { mintaApproval, getApproval } from '../utils/approval.ts'

// Saat user mengajukan (insert record modul, lalu daftarkan ke approval):
const ap = mintaApproval({
  referensi_tipe: 'kasbon',
  referensi_id: row.id,
  diminta_oleh: user.id,
  catatan_pengaju: body.catatan,
})

// Cek status approval yang sudah ada:
const current = getApproval('kasbon', id)
// current?.status → 'menunggu' | 'disetujui' | 'ditolak' | null
```

## Endpoint approval

```text
GET  /approval                  → list (query: referensi_tipe, status, limit)
POST /approval/:id/setujui      → setujui (body: { catatan? }) — pemilik/manajer only
POST /approval/:id/tolak        → tolak   (body: { catatan? }) — pemilik/manajer only
```

Setelah setujui/tolak, bus emit `approval.disetujui` / `approval.ditolak` — hook di `hooks.ts` untuk aksi lanjutan.

## Status flow

```text
menunggu → disetujui  (via POST /approval/:id/setujui)
menunggu → ditolak    (via POST /approval/:id/tolak)
```

Modul kasbon dan stok_opname punya kolom approval sendiri (historis). Modul baru sebaiknya pakai primitif ini.
