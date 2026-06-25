# Frontend — Konvensi Wajib

frontend_stack: Svelte 5; withLoading; async utilities; responsive; anti-pattern rules ada di frontend.md
frontend_refactor_steps: rules ada di frontend-refactor-step.md
frontend_reused_components: frontend-component-bot.md

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
let { value = 0, onClose }: { value?: number; onClose?: () => void } = $props()
let { count = $bindable(0) } = $props() // two-way binding
const total = $derived(value * 2)
let items = $state<Item[]>([])

// Cleanup pakai return dari onMount, bukan onDestroy
onMount(() => { const id = setInterval(fn, 1000); return () => clearInterval(id) })

// Callback props — bukan createEventDispatcher
onClose?.()

// $effect.pre untuk DOM measurement sebelum browser paint
$effect.pre(() => { const rect = el.getBoundingClientRect() })

// Snippets untuk reusable template blocks
{#snippet itemRow(item)}
  <tr><td>{item.name}</td></tr>
{/snippet}
{#each items as item (item.id)}
  {@render itemRow(item)}
{/each}
```

## withLoading

```typescript
import { withLoading } from '$lib/utils/async'

const hasil = await withLoading(() => fetchData(), {
  loadingKey: 'modul-aksi', loadingPesan: 'Memuat...',
  modul: 'barang', aksi: 'muat',
  errorPesan: 'Gagal memuat', bisaRetry: true,
})
if (hasil) data = hasil  // null = error telah dihandle + toast ditampilkan
```

## SvelteKit patterns

```typescript
// +page.server.ts — server load, form actions, sensitive ops
export async function load({ params, locals }) {
  return { data: await db.query(...) } // SSR + client nav
}

export const actions = {
  default: async ({ request }) => {
    const fd = await request.formData()
    // validate, mutate, return { errors } or { success }
  }
}

// +page.ts — universal load (SSR + browser, can use fetch())
export async function load({ fetch }) {
  const res = await fetch('/api/data')
  return { items: await res.json() }
}

// use:enhance untuk progressive enhancement + optimistic UI
<form method="POST" use:enhance>
  {#if form?.errors}
    <p class="text-danger">{form.errors.field}</p>
  {/if}
</form>

// invalidate() untuk programmatic revalidation saat mutation selesai
import { invalidate } from '$app/navigation'
await withLoading(() => fetchUpdate(), ...)
invalidate('app:items')

// Streaming slow data
export async function load() {
  return {
    streamed: {
      comments: fetchComments() // renders immediately, resolves later
    }
  }
}
```

## Async utilities

`withLoading(fn, opts)` → semua async di store
`withIdle(fn, timeout?)` → defer komputasi berat ke idle time
`debounce(fn, delay)` → input/filter/search
`dedupe(key, fn)` → cegah duplicate fetch
`createTaskQueue()` → serial async tasks

**withIdle** — pakai untuk komputasi > 50ms atau di `$effect` untuk reaktif:

```typescript
loading = true
return withIdle(() => {
  hasil = hitungBerat(data, filter)
  loading = false
})
```

Aman sinkron jika < 50ms; sync biasa jika jarang dipanggil.

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

## Component composition

```svelte
<!-- Dynamic component rendering -->
<svelte:component this={selectedComponent} {props} />

<!-- Conditional layouts without JSX -->
{#if showDetails}
  <DetailView {data} />
{:else}
  <ListView {items} />
{/if}

<!-- Transitions untuk motion -->
<div transition:fade={{ duration: 200 }}>Fade in/out</div>
<div in:fly={{ y: 20 }} out:slide>Fly in, slide out</div>

<!-- {#key} untuk force re-creation saat key berubah -->
{#key selectedUserId}
  <UserProfile userId={selectedUserId} />
{/key}
```

## Anti-patterns

```text
✗ window/document di luar onMount     → SSR crash
✗ createEventDispatcher                → pakai callback props ($props)
✗ export let                           → pakai $props() rune
✗ try/catch di store action            → pakai withLoading()
✗ onDestroy                            → pakai onMount(() => { return () => cleanup })
✗ onMount() + $effect() untuk load     → pilih salah satu
✗ hitung di template {a - b}          → pakai $derived (jika < 50ms), atau deferred untuk berat
✗ $derived berat sync (> 50ms)         → pakai pola deferred + withIdle + loading state
✗ localStorage/sessionStorage          → state di store, data di backend
✗ {kondisi ? <span>...</span> : ...}  → JSX tidak valid di Svelte, pakai {#if}
✗ lebar fixed px di elemen utama      → pakai %, max-w-, atau w-full
✗ tabel tanpa overflow-x-auto di HP   → konten terpotong
✗ {#each items as x} tanpa key        → Svelte rebuild semua node, pakai (x.id)
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

## Store & Component Lifecycle

```typescript
// Module-level store — created once, persists
export const barangStore = createBarangStore()

// Component subscribe — automatic cleanup di destroy
let unsubscribe: () => void
$effect(() => {
  unsubscribe = barangStore.subscribe(v => { data = v })
  return () => unsubscribe?.()
})
```

Svelte 5 auto-cleanup: return dari $effect dipanggil saat component destroy. Tidak perlu `onDestroy`.

## Form Validation

```typescript
// logic.ts — pure validators
export function validateHarga(val: number) {
  return val > 0 ? null : 'Harga harus > 0'
}

// store — hold error state
let errors = $state<Record<string, string | null>>({})

// page — bind input + show error
<input bind:value={form.harga} />
{#if errors.harga}<span class="text-danger">{errors.harga}</span>{/if}
```

Validate on blur atau submit, jangan per-keystroke. Async validation (SKU exists?) via `withLoading`.

## CSS & Tailwind

```text
✓ var(--accent), var(--danger), var(--text), var(--bg)
✓ Tailwind class untuk layout (grid, flex, w-, h-, p-, gap-)
✓ <style> untuk komponen-spesifik, :global() jarang
✗ hardcoded #hex di style=
✗ px-4 di elemen utama (pakai responsive sm: md:)
```

Theme toggle di navbar — user dapat switch dark/light/bww/bwb/island/klasik.
