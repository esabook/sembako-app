# CLAUDE_SKILL_FEATURE_DEV.md

Konteks teknis siap-pakai untuk skill `feature-dev:feature-dev`.
Baca file ini sebelum eksplorasi codebase — banyak fase discovery bisa diskip
atau dipersingkat karena pola di bawah ini sudah diverifikasi dari implementasi nyata.

---

## CARA PAKAI FILE INI

Ketika feature-dev ingin eksplorasi codebase (Phase 2), instruksikan agent:
> "Baca CLAUDE.md dan CLAUDE_SKILL_FEATURE_DEV.md terlebih dahulu. Fokus eksplorasi
>  hanya pada hal yang BELUM tercakup di file tersebut."

Ini mempersingkat Phase 2 dari 2-3 agent paralel menjadi 1 agent ringan
(atau skip sama sekali jika fitur baru mirip dengan yang sudah ada).

---

## BACKEND — POLA SIAP PAKAI

### Stack Aktual
```
Runtime  : Bun (bukan Node)
DB       : bun:sqlite (bukan better-sqlite3)
ORM      : drizzle-orm/bun-sqlite
HTTP     : Hono.js
Auth     : jose JWT di httpOnly cookie `auth_token`
```

### Buat Route Baru — Checklist

```typescript
// 1. Buat file: backend/src/routes/[nama].ts
import { Hono } from 'hono'
import { eq, and, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/index.ts'
import { [tabel] } from '../db/schema.ts'
import { authMiddleware, requirePermission } from '../middleware/auth.ts'
import type { JWTPayload } from './auth.ts'

export const [nama]Router = new Hono<{ Variables: { user: JWTPayload } }>()
[nama]Router.use('*', authMiddleware)

// 2. Daftarkan di backend/src/index.ts:
import { [nama]Router } from './routes/[nama].ts'
app.route('/[nama]', [nama]Router)
```

### ⚠ Gotcha Kritis: Urutan Route di Hono

Hono mencocokkan route **urut dari atas**. Route statis HARUS di atas route dinamis.

```typescript
// SALAH — /histori tidak akan pernah tercapai
router.get('/:id', handler)
router.get('/histori', handler)  // ← tertutup oleh /:id di atas

// BENAR
router.get('/histori', handler)  // ← statis dulu
router.get('/:id', handler)      // ← dinamis belakangan
```

### Response Format (wajib konsisten)
```typescript
return c.json({ success: true, data: ... })          // sukses
return c.json({ success: true, data: ... }, 201)     // created
throw new HTTPException(400, { message: '...' })     // error → otomatis { success: false, error }
throw new HTTPException(404, { message: '...' })
```

### Validasi Input (manual, tidak pakai Zod)
```typescript
const body = await c.req.json<{ nama: string; nilai?: number }>()
if (!body.nama?.trim()) throw new HTTPException(400, { message: 'Nama wajib diisi' })
if (typeof body.nilai !== 'number' || body.nilai < 0) throw new HTTPException(400, { message: '...' })
```

### Ambil User dari Context
```typescript
const user = c.get('user')  // tipe JWTPayload: { sub: number, role, username, ... }
```

### Transaksi Multi-Tabel
```typescript
import { sqlite } from '../db/index.ts'

const trxFn = sqlite.transaction(() => {
  const a = db.insert(tabelA).values(...).returning().get()
  db.insert(tabelB).values({ ref_id: a.id }).run()
  db.update(tabelC).set({ stok: sql`stok - 1` }).where(eq(...)).run()
  return a
})
const result = trxFn()
```

### Pola Upsert (insert atau update)
```typescript
const existing = db.select().from(tabel).where(eq(tabel.key, val)).get()
if (existing) {
  const updated = db.update(tabel).set({ field: newVal }).where(eq(tabel.id, existing.id)).returning().get()
  return c.json({ success: true, data: updated })
}
const created = db.insert(tabel).values({ ... }).returning().get()
return c.json({ success: true, data: created }, 201)
```

### Permission Yang Tersedia
```
stok.lihat/edit/hapus
harga_jual.lihat/edit
harga_beli.lihat/edit
penjualan.buat/lihat/void
pembelian.buat/lihat
piutang.lihat/edit
hutang.lihat/edit
laporan.lihat/export
karyawan.lihat/edit
gaji.lihat/edit
absensi.diri/semua
role.kelola
```
Roles: `pemilik` → `*` | `manajer` → hampir semua | `kasir`/`gudang` → terbatas.

---

## DATABASE — SCHEMA DRIZZLE

### Template Tabel Baru
```typescript
// di backend/src/db/schema.ts — tambahkan di bagian bawah
export const nama_tabel = sqliteTable('nama_tabel', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // FK ke tabel lain
  karyawan_id: integer('karyawan_id').references(() => karyawan.id),

  // Tipe umum
  periode_bulan: text('periode_bulan').notNull(),           // YYYY-MM
  tanggal: text('tanggal').notNull(),                        // YYYY-MM-DD
  nilai: real('nilai').notNull().default(0),                 // uang/angka desimal
  jumlah: integer('jumlah').notNull().default(0),            // stok/qty (integer)
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  tipe: text('tipe', { enum: ['a', 'b', 'c'] }).notNull(),   // enum
  data: text('data', { mode: 'json' }),                      // JSON fleksibel

  ...timestamps,  // created_at + updated_at otomatis
})
```

### Jalankan Migrasi
```bash
cd backend
bun run db:generate   # buat file SQL migrasi
bun run db:migrate    # jalankan ke data.db
```

### SQL Raw di Drizzle
```typescript
// Gunakan column reference — JANGAN alias SQL manual
sql<number>`COALESCE(SUM(${tabel.kolom} * ${tabelLain.kolom}), 0)`

// Filter by periode bulan
sql`strftime('%Y-%m', ${tabel.tanggal}) = ${periode}`

// IN clause dari array
sql`kolom IN (${sql.join(arr.map(v => sql`${v}`), sql`, `)})`
```

---

## FRONTEND — POLA SIAP PAKAI

### Struktur File Per Modul (wajib)
```
src/routes/(app)/[modul]/
├── +page.svelte             ← UI template. HANYA bind store, event, #if, #each
├── [modul].types.ts         ← interface, type, const arrays/maps. Tanpa import selain TS built-in
├── [modul].api.ts           ← fetch ke backend. Selalu unwrap ApiResponse, throw on error
├── [modul].logic.ts         ← pure functions: format, hitung, validasi. Tanpa fetch/store/DOM
└── [modul].store.svelte.ts  ← createXStore() factory dengan $state runes + withLoading()
```

> Penamaan `.store.svelte.ts` (bukan `.store.ts`) agar Svelte compiler tahu file ini pakai runes (`$state`, `$derived`). File `.store.ts` lama (kasir, gudang) masih pakai Svelte 4 `writable()` — jangan dicampur.

### Store Factory (Svelte 5 — pola terbaru codebase)
```typescript
// [modul].store.svelte.ts
import { withLoading } from '$lib/utils/async'
import { fetchSesuatu, simpanSesuatu } from './[modul].api'

export function create[Modul]Store() {
  // State dengan $state runes (bukan writable())
  let data = $state<Tipe[]>([])
  let editItem = $state<Tipe | null>(null)

  async function muat() {
    const hasil = await withLoading(() => fetchSesuatu(), {
      loadingKey: '[modul]-muat',
      loadingPesan: 'Memuat data...',
      modul: '[modul]',
      aksi: 'muat',
      errorPesan: 'Gagal memuat data',
    })
    if (hasil) data = hasil
  }

  async function simpan(payload: Partial<Tipe>) {
    const hasil = await withLoading(() => simpanSesuatu(payload), {
      loadingKey: '[modul]-simpan',
      loadingPesan: 'Menyimpan...',
      modul: '[modul]',
      aksi: 'simpan',
      suksesOtomatis: true,
      suksesPesan: 'Berhasil disimpan',
      errorPesan: 'Gagal menyimpan',
    })
    if (hasil) { data = [...data, hasil]; editItem = null }
  }

  return {
    get data() { return data },
    get editItem() { return editItem },
    set editItem(v) { editItem = v },
    muat,
    simpan,
  }
}
```

### API Layer (unwrap ApiResponse)
```typescript
// [modul].api.ts
import { api } from '$lib/utils/api'

function unwrap<T>(res: { success: true; data: T } | { success: false; error: string }): T {
  if (!res.success) throw new Error(res.error)
  return res.data
}

export async function fetchData(): Promise<Tipe[]> {
  return unwrap(await api.get<Tipe[]>('/endpoint'))
}

export async function simpanData(body: Partial<Tipe>): Promise<Tipe> {
  return unwrap(await api.post<Tipe>('/endpoint', body))
}
```

### Page Component (Svelte 5)
```svelte
<script lang="ts">
  import { onMount } from 'svelte'
  import { create[Modul]Store } from './[modul].store.js'
  import type { Tipe } from './[modul].types.js'

  const store = create[Modul]Store()

  // Derived values
  const total = $derived(store.data.reduce((s, x) => s + x.nilai, 0))

  onMount(() => store.muat())
</script>

<!-- CSS: gunakan var(--accent) bukan text-green-500 -->
<!-- Layout: gunakan Tailwind (flex, grid, gap, p, etc) -->

<div class="p-4 space-y-4">
  <h1 style="color: var(--text)">Judul</h1>

  <!-- JANGAN: {kondisi ? <span>...</span> : <span>...</span>} -->
  <!-- HARUS: -->
  {#if kondisi}
    <span style="color: var(--accent)">Ada</span>
  {:else}
    <span style="color: var(--text-dim)">—</span>
  {/if}
</div>
```

### ⚠ Gotcha Kritis: JSX Tidak Valid di Svelte Template

```svelte
<!-- SALAH — akan parse error -->
{nilai > 0 ? rupiah(nilai) : <span style="color:var(--text-dim)">—</span>}

<!-- BENAR -->
{#if nilai > 0}
  {rupiah(nilai)}
{:else}
  <span style="color: var(--text-dim)">—</span>
{/if}
```

### Toast & Loading (sudah tersedia di lib)
```typescript
import { toast } from '$lib/stores/ui.store'
toast.sukses('Berhasil')
toast.error('Gagal')
toast.warn('Perhatian')
toast.info('Info')
```

### CSS Custom Properties (jangan hardcode warna)
```
var(--bg)         halaman background
var(--surface)    kartu/panel
var(--surface2)   input/table header
var(--border)     garis border
var(--text)       teks utama
var(--text-dim)   teks sekunder/placeholder
var(--accent)     hijau — aksi positif, badge aktif
var(--warn)       kuning — peringatan
var(--danger)     merah — error, hapus
var(--info)       biru — info, link
```

### Cek Type Frontend
```bash
cd frontend && bun run check
# Target: 0 ERRORS (warnings dari audit.svelte boleh diabaikan — pre-existing)
```

---

## NAVIGASI & RBAC FRONTEND

### Tambah Halaman ke Nav Utama
Edit `src/routes/(app)/+layout.svelte` — array `NAV`:
```typescript
{ href: '/[rute]', label: 'Label', roles: ['pemilik', 'manajer'] }
```

### Cek Role di Page
```typescript
// +page.svelte atau store
import { user } from '$lib/stores/auth.js'
// Akses: $user.role — tipe: 'pemilik' | 'manajer' | 'kasir' | 'gudang'
```

---

## URUTAN IMPLEMENTASI FITUR BARU

Ikuti urutan ini — sudah terbukti efisien:

```
1. Schema Drizzle → tambah tabel di schema.ts
2. Migrasi        → bun run db:generate && bun run db:migrate
3. Backend route  → buat file routes/[nama].ts + daftar di index.ts
4. Types frontend → [nama].types.ts
5. API layer      → [nama].api.ts
6. Logic layer    → [nama].logic.ts (pure functions)
7. Store          → [nama].store.ts (createXStore factory)
8. Page           → +page.svelte
9. Navigasi       → tambah link dari halaman induk atau layout
10. Type check    → bun run check (0 errors)
```

---

## FILE REFERENSI TERBAIK

Ketika perlu contoh pola spesifik, baca file ini:

| Kebutuhan | File |
|-----------|------|
| Route backend kompleks (multi-tabel) | `backend/src/routes/penjualan.ts` |
| Route backend sederhana (CRUD) | `backend/src/routes/barang.ts` |
| Route keuangan (bayar hutang/piutang) | `backend/src/routes/keuangan.ts` |
| Schema Drizzle lengkap | `backend/src/db/schema.ts` |
| Store factory Svelte 5 runes (terbaru) | `frontend/src/routes/(app)/keuangan/budget/budget.store.svelte.ts` |
| Store kompleks + keyboard + SSE (Svelte 4 writable) | `frontend/src/routes/(app)/kasir/kasir.store.ts` |
| Page Svelte 5 lengkap | `frontend/src/routes/(app)/kasir/+page.svelte` |
| withLoading() implementation | `frontend/src/lib/utils/async.ts` |
| api.ts wrapper | `frontend/src/lib/utils/api.ts` |
| Modul lengkap terbaru (Svelte 5 runes) | `frontend/src/routes/(app)/keuangan/budget/` |
