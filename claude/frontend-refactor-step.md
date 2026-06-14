# Frontend Refactor Step

Panduan refactor frontend. Baca juga: `frontend.md`, `patterns.md`.

---

## Pre-flight

1. Baca `frontend.md`, `patterns.md`, `CLAUDE.md`
2. Scan target — cari duplikasi (filter UI, table layout, stat cards, empty state)
3. Hitung scope — N files, M lines, shared components needed
4. Map dependencies — tiap tab/section perlu data/store/import apa

## Step 1: Extract Shared Components

**Mulai dari shared, bukan tab components.** Shared components kurangi duplikasi → fewer tokens per file.

**Location rule:** dipakai ≥2 modul → `$lib/components/ui/`. Cuma 1 modul → local `components/`.

| Pattern | Props |
|---------|-------|
| `FilterPeriode` | `periode`, `onMuat`, `quickButtons?` |
| `FilterBulan` | `periodeBR`, `onMuat` |
| `FilterTahun` | `tahun`, `onMuat` |
| `FilterTanggal` | `tanggal`, `onMuat`, `quickButtons?` |

## Step 2: Extract Tab Components

```svelte
<script lang="ts">
  import type { createXStore } from '../[modul].store.svelte'
  import { fmt } from '../[modul].logic'

  let { store }: { store: ReturnType<typeof createXStore> } = $props()
</script>

<FilterPeriode bind:periode={store.periode} onMuat={() => store.muat('tab-key')} />

{#if store.data}
  {@const d = store.data}
  <!-- display markup -->
{/if}
```

**Rules:**
- `ReturnType<typeof createStore>` — jangan hardcode store type
- Import ONLY functions yang dipakai dari `logic.ts`
- Import types dari `[modul].types.ts`

## Step 3: Slim Parent Page

Target: ≤150 lines.

```svelte
<!-- 1. Header (title, action buttons) -->
<!-- 2. Global filters (cabang selector, dll) -->
<!-- 3. TabBar / navigation -->
<!-- 4. Conditional render: {#if tab === 'x'} <TabX {store} /> -->
<!-- 5. Loading skeleton (jika semua data null) -->
```

## Step 4: Parallel Execution (≥5 files)

```
Main thread: shared components → parent page → svelte-check
Agents (3 concurrent): batch tab components
```

Agent prompt template:
```
Create Svelte 5 components in [path]/components/:
- $props() typed: let { store }: { store: ReturnType<typeof createXStore> } = $props()
- Import only needed functions from '../[modul].logic'
- Filter section + display section
- Inline styles (CSS vars, no Tailwind for data)
- Key {#each} with stable ID

Components: TabX.svelte, TabY.svelte, ...
```

## Step 5: Verify

```bash
cd frontend && bunx svelte-check --tsconfig ./tsconfig.json
bunx eslint "src/routes/(app)/[modul]/**" --quiet
# Manual test: buka semua tab, cek data, filter, export/print
```

## Anti-patterns

```
✗ Extract tab TANPA shared filters → duplikasi markup
✗ Sequential Write 10+ files di main thread → slow, expensive
✗ Parent page >200 lines → extract lebih lanjut
✗ Import semua dari logic.ts → import only yang dipakai
✗ Hardcode store type → ReturnType<typeof createStore>
✗ Tab akses store.filterState langsung → pakai callback props
```

## Token Budget

| Scope | Tokens | Strategy |
|-------|--------|----------|
| 3-5 files | ~15k | Sequential |
| 5-10 files | ~30k | 2 agents + main |
| 10-15 files | ~50k | 3 agents + shared first |
| 15+ files | ~80k+ | Multi-phase: shared → tabs → parent → verify |
