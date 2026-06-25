# Aturan Database

```
1. id INTEGER PRIMARY KEY AUTOINCREMENT di semua tabel
2. Hapus = is_active = 0, bukan DELETE
3. Harga di detail transaksi = SNAPSHOT (bukan FK ke master)
4. Setiap perubahan stok = 1 baris di mutasi_stok (wajib ada referensi dokumen)
5. Hutang/piutang otomatis dari transaksi — tidak ada input ganda
6. Multi-tabel → wajib withTransaction()
7. Laporan approve → tersimpan sebagai JSON snapshot
8. Tabel baru WAJIB spread ...tenantField dan ...auditFields
```

Schema detail → `backend/src/db/schema.ts`

## Multi-Dialect — builders.ts

Jangan import dari `drizzle-orm/sqlite-core` langsung. Pakai `builders.ts`:

```typescript
import { table, pkInt, txt, int, money, bool, jsonText, timestamps, idx, uidx } from '../db/builders.ts'

// money() → integer di SQLite/libSQL, bigint(mode:'number') di PG/MySQL
// bool()  → integer(mode:'boolean') di SQLite, boolean() di PG/MySQL
// pkInt() → integer().primaryKey({autoIncrement}) di SQLite, serial().primaryKey() di PG
```

Dialect terdeteksi otomatis dari `DATABASE_URL`:
- `postgres://...` → PG
- `mysql://...` → MySQL
- `libsql://...` atau `https://...` → Turso/libSQL
- selain itu → SQLite (default)

## Helper schema wajib untuk tabel baru

```typescript
import { table, pkInt, txt, int, bool, timestamps } from '../db/builders.ts'

export const tabel_baru = table('tabel_baru', {
  id: pkInt('id'),
  // ... kolom bisnis pakai builders (bukan sqlite-core langsung) ...
  is_active: bool('is_active').notNull().default(true),
  ...tenantField,   // ← wajib: tenant_id INTEGER NOT NULL DEFAULT 1
  ...auditFields,   // ← wajib: created_by + updated_by (nullable)
  ...timestamps,    // ← wajib: created_at + updated_at (ISO string via $defaultFn)
})
```

Isi `created_by`/`updated_by` di route:

```typescript
import { getAuditBy, getUpdatedBy } from '../utils/audit.ts'

db.insert(tabel).values({ ...data, ...getAuditBy(c) })
db.update(tabel).set({ ...data, ...getUpdatedBy(c) })
```

## Pola Query Multi-Tenant

```typescript
const tenantId = user.tenant_id ?? 1
const cabangId = user.cabang_id ?? null  // null = semua cabang toko ini

// GET list transaksional (penjualan, stok, kas, shift, dll):
where: and(
  eq(t.tenant_id, tenantId),
  cabangId ? eq(t.cabang_id, cabangId) : undefined,
)

// GET list master data (barang, supplier, pelanggan, dll):
where: eq(t.tenant_id, tenantId)   // tidak ada cabang_id

// INSERT transaksional:
{ tenant_id: tenantId, cabang_id: cabangId ?? 1, ... }

// INSERT master data:
{ tenant_id: tenantId, ... }
```

Tabel `karyawan` pakai `toko_id` (FK ke toko), bukan `tenant_id`.

## withTransaction

```typescript
import { withTransaction } from '../db/index.ts'

await withTransaction(async (tx) => {
  await tx.insert(tableA).values(...)
  await tx.insert(tableB).values(...)
})
```

SQLite: manual BEGIN/COMMIT. libSQL/PG/MySQL: native transaction dari Drizzle.
