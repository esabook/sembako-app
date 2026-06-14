# Aturan Coding

```
1. Selalu TypeScript — tidak ada .js
2. Middleware auth + tenantMiddleware di setiap route yang butuh login
3. Validasi input di backend
4. Response konsisten: { success: true, data } | { success: false, error }
5. File gambar di filesystem/S3, path di database — pakai storagePut() bukan writeFileSync
6. Transaction multi-tabel → withTransaction() dari db/index.ts
7. Route statis HARUS di atas route dinamis (/:id) — Hono match urut dari atas
8. Kolom DB baru → pakai builders.ts (bukan drizzle-orm/sqlite-core langsung)
9. Frontend image path → imgUrl(path) / thumbUrl(path) dari $lib/utils/upload.ts
```

## Pattern Tenant di Route

```typescript
import { tenantMiddleware } from '../middleware/tenant.ts'

router.use('*', authMiddleware)
router.use('*', tenantMiddleware)

router.get('/', async (c) => {
  const user = c.get('user')
  const tenantId = user.tenant_id ?? 1
  const cabangId = user.cabang_id ?? null

  const rows = await query.findAll(
    db.select().from(t)
      .where(and(
        eq(t.tenant_id, tenantId),
        cabangId ? eq(t.cabang_id, cabangId) : undefined,
      ))
  )
  return c.json({ success: true, data: rows })
})
```

## Storage Upload

```typescript
import { saveUpload } from '../utils/upload.ts'

// Simpan file — return path relatif (local) atau full URL (s3)
const path = await saveUpload(file, { subdir: 'produk', prefix: 'img' })
// Simpan path ke DB — imgUrl() di frontend handle keduanya
```
