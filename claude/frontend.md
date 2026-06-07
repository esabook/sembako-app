# Frontend — Konvensi Wajib

## Struktur file per modul

```text
[modul].types.ts   → interface/type, tanpa import selain TS built-in
[modul].api.ts     → fetch ke backend, unwrap ApiResponse, throw on error
[modul].logic.ts   → pure functions, tanpa fetch/store/DOM
[modul].store.svelte.ts → createXStore() factory, $state runes, withLoading()
+page.svelte       → HANYA template: bind store, on:event, {#if}, {#each}
```

## Svelte 5 runes

```svelte
let { value = 0, ontutup }: { value?: number; ontutup?: () => void } = $props()
const total = $derived(value * 2)
let items = $state<Item[]>([])

// Cleanup pakai return dari onMount, bukan onDestroy
onMount(() => { const id = setInterval(fn, 1000); return () => clearInterval(id) })

// Callback props — bukan createEventDispatcher
ontutup?.()
```

## withLoading

```typescript
import { withLoading } from '$lib/utils/async'

const hasil = await withLoading(() => fetchData(), {
  loadingKey: 'modul-aksi', loadingPesan: 'Memuat...',
  modul: 'barang', aksi: 'muat',
  errorPesan: 'Gagal memuat', bisaRetry: true,
})
if (hasil) data = hasil
```

## Async utilities

`withLoading(fn, opts)` → semua async di store
`withIdle(fn, timeout?)` → defer komputasi berat ke idle time
`debounce(fn, delay)` → input/filter/search
`dedupe(key, fn)` → cegah duplicate fetch
`createTaskQueue()` → serial async tasks

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

Di component scope wajib dalam `$effect` + `return () => d.cancel()`. Di module-level store boleh di luar `$effect`.

## CSS

```text
var(--bg) var(--surface) var(--surface2) var(--border)
var(--text) var(--text-dim) var(--accent) var(--warn) var(--danger) var(--info)
var(--skeleton)
```

7 tema: `dark` / `light` / `eye` / `bww` / `bwb` / `island` / `klasik` — toggle di navbar.

## Responsive

```text
mobile   : default (< 640px)   → HP portrait, layar kecil
tablet   : sm: (640px+)        → HP landscape, tablet
desktop  : md: (768px+)        → laptop, PC
```

Pola wajib:

```svelte
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
<div class="overflow-x-auto">
  <table class="min-w-full">...</table>
</div>
<button class="w-full sm:w-auto">Simpan</button>
<h1 class="text-base md:text-lg">Judul</h1>
<div class="p-3 md:p-6">
```

Prioritas tampilan:
- HP → kasir & gudang harus 100% usable
- Tablet → semua modul usable, tabel boleh scroll horizontal
- Desktop → layout optimal, tampilkan semua kolom

## Anti-patterns

```text
✗ window/document di luar onMount     → SSR crash
✗ createEventDispatcher                → pakai callback props ($props)
✗ export let                           → pakai $props() rune
✗ try/catch di store action            → pakai withLoading()
✗ onDestroy                            → pakai onMount(() => { return () => cleanup })
✗ onMount() + $effect() untuk load     → pilih salah satu
✗ hitung di template {a - b}          → pakai $derived
✗ localStorage/sessionStorage          → state di store, data di backend
✗ {kondisi ? <span>...</span> : ...}  → JSX tidak valid di Svelte, pakai {#if}
✗ lebar fixed px di elemen utama      → pakai %, max-w-, atau w-full
✗ tabel tanpa overflow-x-auto di HP   → konten terpotong
✗ {#each items as x} tanpa key        → Svelte rebuild semua node, pakai (x.id)
✗ $derived berat dipakai langsung     → UI freeze, pakai pola deferred
✗ komputasi berat sync di main thread → withIdle(), bukan setTimeout(fn,0)
✗ new Worker() untuk data kecil       → overhead, withIdle() cukup s/d ~10rb baris
✗ <p>Memuat...</p> untuk loading      → pakai <Spinner /> atau <Skeleton />
✗ warna hex hardcode di style=        → pakai var(--accent), var(--danger), dst.
✗ emptyText DataTable pakai ternary loading → DataTable sudah punya skeleton rows saat loading=true
```

## Loading state

```svelte
import Spinner from '$lib/components/ui/Spinner.svelte'
<div class="flex justify-center py-6"><Spinner /></div>
<Spinner size={16} />

import Skeleton from '$lib/components/ui/Skeleton.svelte'
<Skeleton w="60%" h="0.875rem" />
<Skeleton w="100%" h="7rem" />
<Skeleton w="4rem" h="4rem" br="rounded-full" />
```

`DataTable` sudah terintegrasi skeleton rows saat `loading=true`.

## No-freeze

```typescript
import { untrack } from 'svelte'
import { withIdle } from '$lib/utils/async'

let hasil = $state(untrack(() => hitungData(data, filter)))
let loading = $state(false)
let firstRun = true

$effect(() => {
  const f = filter
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
<div style={loading ? 'opacity:0.55;pointer-events:none' : ''}>
  ...
</div>
```

## Thread & Task Management

```text
IO (fetch/file)          → sudah non-blocking
Main thread (UI/Svelte)  → jaga responsif dengan withIdle()
Web Worker               → hanya jika withIdle() tidak cukup
```

Kriteria:

```text
< 50ms, jarang dipanggil          → sync biasa
> 50ms, atau dipicu filter/reaktif → withIdle()
> 10.000 baris / > 100ms terukur   → Web Worker
```

Web Worker hanya untuk:
- CSV export > 10.000 baris
- Generate label/barcode massal
- Proses yang stabil > 100ms

Jangan pakai Web Worker untuk:
- Data < 1.000 baris
- Fungsi yang butuh DOM / Svelte state langsung
- One-shot on-click

## Key wajib di `{#each}`

```svelte
✓ {#each items as item (item.id)}          → by id
✓ {#each rows as row (row.tanggal)}        → by natural key
✓ {#each [7, 30] as n (n)}                 → by value untuk list statis
✗ {#each items as item}                   → no key, full rebuild saat update
```
