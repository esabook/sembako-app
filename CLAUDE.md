# CLAUDE.md — Stokasir App

> Deployment ke Raspberry Pi → baca `DEPLOY.md`.
> Pola implementasi fitur baru → baca `CLAUDE_SKILL_FEATURE_DEV.md`.

---

## IDENTITAS & PRINSIP

Aplikasi manajemen stok-kasir grosir/eceran. Webview lokal via WiFi LAN.
1 developer, 1 toko, < 5 karyawan. Offline-first, siap migrasi ke Turso/Supabase.

```
SIMPEL → sedikit dependencies   RINGAN → cepat di HP jadul
OFFLINE → tanpa internet        WEBVIEW → 1 codebase, HP & laptop
```

---

## TECH STACK

```
Frontend  : SvelteKit + TypeScript + TailwindCSS (font: JetBrains Mono)
Backend   : Hono.js + Bun runtime, port 3000
Database  : SQLite via bun:sqlite (bukan better-sqlite3), ORM: drizzle-orm/bun-sqlite
Auth      : JWT via jose, httpOnly cookie `auth_token`, RBAC
Storage   : backend/uploads/{produk,invoice,karyawan}/
```

```bash
cd backend  && bun run dev       # http://localhost:3000
cd frontend && bun run dev       # http://localhost:5173
cd backend  && bun run db:generate && bun run db:migrate
```

---

## STRUKTUR FOLDER

```
frontend/src/
  routes/(app)/
    dashboard/   kasir/    gudang/    karyawan/
    keuangan/    laporan/  harga/     pengaturan/
      pengaturan/notifikasi/   pengaturan/audit/
    kasir/retur/   gudang/label/
  lib/
    components/{ui,data,form,layout}/
    stores/        utils/{api.ts,async.ts,wa.ts,audit.ts}

backend/src/
  routes/   db/{schema.ts,index.ts,migrations/}
  middleware/{auth.ts,upload.ts}
  lib/{event-bus.ts,hooks.ts}   ← SOP engine
  utils/{log.ts,audit.ts}
```

---

## RBAC

```
pemilik  → *
manajer  → semua kecuali role.kelola
kasir    → stok.lihat, harga_jual.lihat, penjualan.*, absensi.diri
gudang   → stok.*, harga_beli.*, pembelian.*, absensi.diri
```

Permission format: `modul.aksi` (stok.lihat, harga_beli.edit, penjualan.void, dll.)
Cek role di frontend: `import { user } from '$lib/stores/auth.js'` → `$user.role`

---

## ATURAN DATABASE

```
1. id INTEGER PRIMARY KEY AUTOINCREMENT di semua tabel
2. Hapus = is_active = 0, bukan DELETE
3. Harga di detail transaksi = SNAPSHOT (bukan FK ke master)
4. Setiap perubahan stok = 1 baris di mutasi_stok (wajib ada referensi dokumen)
5. Hutang/piutang otomatis dari transaksi — tidak ada input ganda
6. Multi-tabel → wajib db.transaction()
7. Laporan approve → tersimpan sebagai JSON snapshot
8. Tabel baru WAJIB spread ...tenantField dan ...auditFields (lihat di bawah)
```

Schema detail → `backend/src/db/schema.ts`

### Helper schema wajib untuk tabel baru

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

---

## ATURAN CODING

```
1. Selalu TypeScript — tidak ada .js
2. Middleware auth di SETIAP route yang butuh login
3. Validasi input di backend
4. Response konsisten: { success: true, data } | { success: false, error }
5. Foto di filesystem, path di database
6. Transaction SQLite untuk operasi multi-tabel
7. Route statis HARUS di atas route dinamis (/:id) — Hono match urut dari atas
```

---

## FRONTEND — KONVENSI WAJIB

### Struktur file per modul
```
[modul].types.ts   → interface/type, tanpa import selain TS built-in
[modul].api.ts     → fetch ke backend, unwrap ApiResponse, throw on error
[modul].logic.ts   → pure functions, tanpa fetch/store/DOM
[modul].store.svelte.ts → createXStore() factory, $state runes, withLoading()
+page.svelte       → HANYA template: bind store, on:event, {#if}, {#each}
```

### Svelte 5 runes (wajib — bukan Svelte 4)
```svelte
let { value = 0, ontutup }: { value?: number; ontutup?: () => void } = $props()
const total = $derived(value * 2)
let items = $state<Item[]>([])

// Cleanup pakai return dari onMount, bukan onDestroy
onMount(() => { const id = setInterval(fn, 1000); return () => clearInterval(id) })

// Callback props — bukan createEventDispatcher
ontutup?.()
```

### withLoading (semua async di store wajib pakai ini)
```typescript
import { withLoading } from '$lib/utils/async'

const hasil = await withLoading(() => fetchData(), {
  loadingKey: 'modul-aksi', loadingPesan: 'Memuat...',
  modul: 'barang', aksi: 'muat',
  errorPesan: 'Gagal memuat', bisaRetry: true,
})
if (hasil) data = hasil
```

### Async utilities — wajib dari `lib/utils/async.ts`

```
withLoading(fn, opts)   → semua async di store (sudah ada)
withIdle(fn, timeout?)  → defer komputasi berat ke idle time main thread
debounce(fn, delay)     → input/filter/search — ganti manual setTimeout
dedupe(key, fn)         → cegah duplicate fetch bersamaan
createTaskQueue()       → serial async tasks (draft save, checkout multi-step)
```

**withIdle** — pakai dalam `$effect` untuk komputasi berat:
```typescript
loading = true
return withIdle(() => {
  hasil = hitungBerat(data, filter)
  loading = false
})
```

**debounce** — pakai di `$effect` untuk input reaktif:
```typescript
const cariBounced = debounce(cariBarang, 200)
$effect(() => { cariBounced(query); return () => cariBounced.cancel() })
```
Di component scope wajib dalam `$effect` + `return () => d.cancel()` — jika tidak, timer pending bisa fire setelah navigasi. Di module-level store boleh di luar `$effect`.

### CSS — custom properties (jangan hardcode warna)
```
var(--bg) var(--surface) var(--surface2) var(--border)
var(--text) var(--text-dim) var(--accent) var(--warn) var(--danger) var(--info)
```
3 tema: `dark` / `light` / `eye` — toggle di navbar.

### Responsive — breakpoint Tailwind
```
mobile   : default (< 640px)   → HP portrait, layar kecil
tablet   : sm: (640px+)        → HP landscape, tablet
desktop  : md: (768px+)        → laptop, PC
```

Pola wajib saat layout berubah antar device:
```svelte
<!-- Grid: 1 kolom HP → 2 kolom tablet → 3 kolom desktop -->
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">

<!-- Tabel: sembunyikan kolom minor di HP -->
<th class="hidden sm:table-cell">Kolom Minor</th>
<td class="hidden sm:table-cell">...</td>

<!-- Tombol: full-width di HP, auto di desktop -->
<button class="w-full sm:w-auto">Simpan</button>

<!-- Teks: lebih kecil di HP -->
<h1 class="text-base md:text-lg">Judul</h1>

<!-- Padding: lebih kecil di HP -->
<div class="p-3 md:p-6">
```

Prioritas tampilan:
- HP → kasir & gudang harus 100% usable (aksi utama toko)
- Tablet → semua modul usable, tabel boleh scroll horizontal
- Desktop → layout optimal, tampilkan semua kolom

Tabel di HP — wajib scrollable, jangan dipotong:
```svelte
<div class="overflow-x-auto">
  <table class="min-w-full">...</table>
</div>
```

### Anti-patterns
```
✗ window/document di luar onMount     → SSR crash
✗ createEventDispatcher                → pakai callback props ($props)
✗ export let                           → pakai $props() rune
✗ try/catch di store action            → pakai withLoading()
✗ onMount() + $effect() untuk load     → pilih salah satu
✗ hitung di template {a - b}          → pakai $derived
✗ localStorage/sessionStorage          → state di store, data di backend
✗ {kondisi ? <span>...</span> : ...}  → JSX tidak valid di Svelte, pakai {#if}
✗ lebar fixed px di elemen utama      → pakai %, max-w-, atau w-full
✗ tabel tanpa overflow-x-auto di HP   → konten terpotong
✗ {#each items as x} tanpa key        → Svelte rebuild semua node, pakai (x.id)
✗ $derived berat dipakai langsung     → UI freeze, pakai pola deferred di bawah
✗ komputasi berat sync di main thread → withIdle(), bukan setTimeout(fn,0)
✗ new Worker() untuk data kecil       → overhead, withIdle() cukup s/d ~10rb baris
```

### No-freeze: komputasi berat setelah state berubah

Untuk filter/toggle yang memicu komputasi ulang banyak data (tabel, grafik):
- `$derived` tidak cocok — sinkron, memblokir repaint browser
- Pola: `$state` + `$effect` + `withIdle()` → browser repaint loading-state dulu, baru hitung

```typescript
import { untrack } from 'svelte'
import { withIdle } from '$lib/utils/async'

// Init eager pakai untrack — render pertama langsung tampil tanpa loading
let hasil = $state(untrack(() => hitungData(data, filter)))
let loading = $state(false)
let firstRun = true

$effect(() => {
  const f = filter   // baca dep reaktif di sini
  const d = data

  if (firstRun) { firstRun = false; return }

  loading = true
  return withIdle(() => {
    hasil = hitungData(d, f)
    loading = false
  })
})
```

```svelte
<!-- Dim konten + blok interaksi saat loading -->
<div style={loading ? 'opacity:0.55;pointer-events:none' : ''}>
  ...
</div>
```

### Thread & Task Management

```
IO (fetch/file)          → sudah non-blocking — tidak perlu intervensi
Main thread (UI/Svelte)  → jaga responsif: defer komputasi berat dengan withIdle()
Web Worker               → hanya jika withIdle() tidak cukup (kriteria di bawah)
```

**Kriteria pilih mana:**
```
< 50ms, jarang dipanggil          → sync biasa
> 50ms, atau dipicu filter/reaktif → withIdle()
> 10.000 baris / > 100ms terukur   → Web Worker
```

**Web Worker — hanya untuk:**
- CSV export > 10.000 baris
- Generate label/barcode massal
- Proses yang stabil > 100ms (bukan estimasi)

**Jangan pakai Web Worker untuk:**
- Data < 1.000 baris — withIdle() cukup
- Fungsi yang butuh DOM / Svelte state langsung
- One-shot on-click — blok sebentar tidak kritis

### Key wajib di {#each}

```svelte
✓ {#each items as item (item.id)}          → by id (paling stabil)
✓ {#each rows as row (row.tanggal)}        → by natural key
✓ {#each [7, 30] as n (n)}                → by value untuk list statis
✗ {#each items as item}                    → no key, full rebuild saat update
```

---

## STATUS IMPLEMENTASI

| Modul | Status |
|-------|--------|

## BUGFIX WAJIB (sebelum deploy)

### Masih Open


### Sudah Diperbaiki (referensi)


---

## BACKLOG — NEXT TASKS

```
Pertimbangan jangka panjang:
  [x] Service Worker / offline cache — agar kasir tetap jalan saat WiFi putus
  [ ] Multi-toko / multi-cabang
  [ ] Migrasi ke Turso (libSQL) untuk akses remote
```

---

## SOP ENGINE — EVENT BUS (Fase B)

File: `backend/src/lib/event-bus.ts` (bus), `backend/src/lib/hooks.ts` (handler registry).
`initHooks()` dipanggil sekali di `index.ts` saat startup.

### Emit event di route

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

### Tambah hook baru (di hooks.ts)

```typescript
// Non-blocking (after):
bus.register('checkout', async ({ penjualan_id }) => { /* kirim notif, dll */ })

// Blocking (before):
bus.registerBefore('absensi.masuk', async ({ karyawan_id }) => {
  if (kondisiBlokir) return { ok: false, reason: 'alasan', data: { ... } }
  return { ok: true }
})
```

### Event yang sudah ada

```
'absensi.masuk'      → before: cek SOP checklist; after: (slot kosong)
'absensi.pulang'     → (slot kosong)
'checkout'           → after: cek stok minimum → notifikasi_log
'barang_masuk'       → (slot kosong)
'stok.kritis'        → (slot kosong, emitted manual jika perlu)
'approval.disetujui' → after: (slot kosong — hook di sini untuk notif/aksi lanjutan)
'approval.ditolak'   → after: (slot kosong — hook di sini untuk notif/aksi lanjutan)
```

### SOP Checklist (B4 POC)

Kiosk `/absensi-kiosk/masuk` → 428 jika ada `sop_rule` checklist aktif belum selesai.
Flow: `GET /sop/checklist-hari-ini` → tampilkan item → `POST /sop/checklist/:id/selesai` → retry masuk.
Rule dibuat via `POST /sop/rule` dengan `config_json: [{ id, label, wajib }]`.

---

## APPROVAL GATE (Fase B5)

Primitif approval lintas modul. Modul apapun bisa pakai tanpa duplikasi logika status.

File: `backend/src/utils/approval.ts` (helper), `backend/src/routes/approval.ts` (endpoint).

### Cara pakai di route

```typescript
import { mintaApproval, getApproval } from '../utils/approval.ts'

// Saat user mengajukan (insert record modul, lalu daftarkan ke approval):
const ap = mintaApproval({
  referensi_tipe: 'kasbon',   // string bebas, biasanya nama tabel
  referensi_id: row.id,
  diminta_oleh: user.id,
  catatan_pengaju: body.catatan,  // opsional
})

// Cek status approval yang sudah ada:
const current = getApproval('kasbon', id)
// current?.status → 'menunggu' | 'disetujui' | 'ditolak' | null
```

### Endpoint approval

```
GET  /approval                  → list (query: referensi_tipe, status, limit)
POST /approval/:id/setujui      → setujui (body: { catatan? }) — pemilik/manajer only
POST /approval/:id/tolak        → tolak   (body: { catatan? }) — pemilik/manajer only
```

Setelah setujui/tolak, bus emit `approval.disetujui` / `approval.ditolak` — hook di `hooks.ts` untuk aksi lanjutan (cairkan kasbon, notif, dsb).

### Status flow

```
menunggu → disetujui  (via POST /approval/:id/setujui)
menunggu → ditolak    (via POST /approval/:id/tolak)
```

Modul kasbon dan stok_opname punya kolom approval sendiri (historis). Modul baru sebaiknya pakai primitif ini.

---

## POLA WAJIB DIJAGA

```
1. Route order Hono: static (/tukar, /aktif) HARUS sebelum dynamic (/:id)
2. Multi-tabel → db.transaction() (contoh: bayar gaji → penggajian+kasbon+jurnal_kas)
3. api.ts try/catch: setelah fix F-H3, tidak perlu try/catch di setiap caller
4. Load data: onMount ATAU $effect — jangan keduanya untuk data yang sama
5. Permission guard di setiap halaman sensitif:
   $effect(() => { if ($user && !['pemilik','manajer'].includes($user.role)) goto('/kasir') })
6. Tabel baru → spread ...tenantField + ...auditFields + ...timestamps (lihat §ATURAN DATABASE)
7. Aksi penting di route → emit event ke bus (sebelum/sesudah sesuai kebutuhan)
8. Modul baru yang butuh approval → pakai mintaApproval() dari utils/approval.ts (bukan buat kolom sendiri)
```

---

## GIT COMMIT

```
<type>(<scope>): <deskripsi singkat>   ← maks 72 karakter

type: feat | fix | refactor | style | chore | docs | db
scope: auth | kasir | gudang | keuangan | laporan | karyawan | barang | stok

Bahasa Indonesia, imperatif, huruf kecil. Jangan tambah Co-Authored-By.
Body: jelaskan KENAPA berubah, bukan APA yang berubah.
```

Contoh: `fix(kasir): reset tipeTransaksi ke eceran setelah checkout`

---

## FORMAT RECAP AKHIR RESPONS

Setiap kali selesai mengerjakan task, akhiri respons dengan **recap dalam format git commit** — langsung bisa di-copy untuk `git commit -m`.

Format:
```
<type>(<scope>): <deskripsi singkat>

<body: kenapa berubah — opsional, hanya jika perlu konteks>
```

Aturan:
- Hanya 1 blok kode fenced (triple backtick) di akhir respons
- Tanpa label/header "Recap:" atau sejenisnya — langsung kodenya
- Jika perubahan mencakup banyak file/scope, pilih scope yang paling dominan
- Bahasa Indonesia, imperatif, huruf kecil
