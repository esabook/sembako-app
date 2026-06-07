# Aturan Database

```
1. id INTEGER PRIMARY KEY AUTOINCREMENT di semua tabel
2. Hapus = is_active = 0, bukan DELETE
3. Harga di detail transaksi = SNAPSHOT (bukan FK ke master)
4. Setiap perubahan stok = 1 baris di mutasi_stok (wajib ada referensi dokumen)
5. Hutang/piutang otomatis dari transaksi — tidak ada input ganda
6. Multi-tabel → wajib db.transaction()
7. Laporan approve → tersimpan sebagai JSON snapshot
8. Tabel baru WAJIB spread ...tenantField dan ...auditFields
```

Schema detail → `backend/src/db/schema.ts`

## Helper schema wajib untuk tabel baru

```typescript
// Sudah didefinisikan di schema.ts — tinggal spread:
// tenantField  → tenant_id INTEGER NOT NULL DEFAULT 1 (A1, siap multi-tenant)
// auditFields  → created_by INTEGER + updated_by INTEGER (A2, nullable)

export const tabel_baru = sqliteTable('tabel_baru', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // ... kolom bisnis ...
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  ...tenantField,   // ← wajib
  ...auditFields,   // ← wajib (nullable, isi via getAuditBy)
  ...timestamps,    // ← wajib
})
```

Isi `created_by`/`updated_by` di route — pakai helper `utils/audit.ts`:

```typescript
import { getAuditBy, getUpdatedBy } from '../utils/audit.ts'

// INSERT:
db.insert(tabel).values({ ...data, ...getAuditBy(c) })
// UPDATE:
db.update(tabel).set({ ...data, ...getUpdatedBy(c) })
```
