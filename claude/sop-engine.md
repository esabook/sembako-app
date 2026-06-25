# SOP Engine — Event Bus

File: `backend/src/lib/event-bus.ts` (bus), `backend/src/lib/hooks.ts` (handler registry).
`initHooks()` dipanggil sekali di `index.ts` saat startup.

## Emit event di route

```typescript
import { bus } from '../lib/event-bus.ts'

// Blocking — cek sebelum aksi (bisa ditolak hook)
const result = await bus.emitBefore('absensi.masuk', { karyawan_id, tanggal })
if (!result.ok) {
  return c.json({ success: false, error: result.reason, data: result.data }, 428)
}

// Fire-and-forget — setelah aksi berhasil
bus.emit('checkout', { penjualan_id, total, kasir_id, items })
```

## Tambah hook baru

```typescript
// Non-blocking (after):
bus.register('checkout', async ({ penjualan_id }) => { /* kirim notif, dll */ })

// Blocking (before):
bus.registerBefore('absensi.masuk', async ({ karyawan_id }) => {
  if (kondisiBlokir) return { ok: false, reason: 'alasan', data: { ... } }
  return { ok: true }
})
```

## Event yang sudah ada

```text
'absensi.masuk'      → before: cek SOP checklist; after: (slot kosong)
'absensi.pulang'     → (slot kosong)
'checkout'           → after: cek stok minimum → notifikasi_log
'barang_masuk'       → (slot kosong)
'stok.kritis'        → (slot kosong, emitted manual jika perlu)
'approval.disetujui' → after: (slot kosong — hook di sini untuk notif/aksi lanjutan)
'approval.ditolak'   → after: (slot kosong — hook di sini untuk notif/aksi lanjutan)
'notifikasi.wa'      → after: emitted scheduler saat channel='wa' — pasang gateway WA di sini
```

## SOP Checklist (B4 POC)

Kiosk `/absensi-kiosk/masuk` → 428 jika ada `sop_rule` checklist aktif belum selesai.
Flow: `GET /sop/checklist-hari-ini` → tampilkan item → `POST /sop/checklist/:id/selesai` → retry masuk.
Rule dibuat via `POST /sop/rule` dengan `config_json: [{ id, label, wajib }]`.
