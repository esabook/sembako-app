<svelte:head><title>Hajatan — Stokasir</title></svelte:head>

<script lang="ts">
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import { STATUS_COLOR, STATUS_LABEL, STATUS_LIST, fmt } from './hajatan.logic.js'
  import { createHajatanStore } from './hajatan.store.svelte.js'
  import FormAcara from './FormAcara.svelte'

  const store = createHajatanStore()

  $effect(() => { store.filterStatus; store.filterBulan; store.muat() })
</script>

<div class="p-3 md:p-6 space-y-4">
  <div class="flex flex-wrap items-center justify-between gap-2">
    <h1 class="text-base md:text-lg font-bold" style="color:var(--text)">Acara & Hajatan</h1>
    <button onclick={() => store.bukaFormTambah()}
      class="px-3 py-1.5 rounded text-sm font-medium text-white" style="background:var(--accent)">
      + Tambah Acara
    </button>
  </div>

  <div class="flex flex-wrap gap-2">
    <input type="month" bind:value={store.filterBulan}
      class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    <select bind:value={store.filterStatus}
      class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
      <option value="">Semua Status</option>
      {#each STATUS_LIST as s (s)}
        <option value={s}>{STATUS_LABEL[s]}</option>
      {/each}
    </select>
  </div>

  {#if store.list.length > 0}
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {#each STATUS_LIST as s (s)}
        {@const cnt = store.list.filter(x => x.status === s).length}
        <div class="rounded-lg p-3 border" style="background:var(--surface);border-color:var(--border)">
          <p class="text-xs" style="color:var(--text-dim)">{STATUS_LABEL[s]}</p>
          <p class="text-xl font-bold" style="color:{STATUS_COLOR[s]}">{cnt}</p>
        </div>
      {/each}
    </div>
  {/if}

  {#if store.loading}
    <div class="flex justify-center py-6"><Spinner /></div>
  {:else if store.list.length === 0}
    <p class="text-sm text-center py-12" style="color:var(--text-dim)">Belum ada acara.</p>
  {:else}
    <div class="space-y-3">
      {#each store.list as a (a.id)}
        <div class="rounded-lg border p-4" style="background:var(--surface);border-color:var(--border)">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-semibold text-sm" style="color:var(--text)">{a.nama_acara}</h3>
                <span class="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                  style="background:{STATUS_COLOR[a.status]}">{STATUS_LABEL[a.status]}</span>
              </div>
              <p class="text-xs mt-1" style="color:var(--text-dim)">
                Penyelenggara: <strong>{a.nama_penyelenggara}</strong>
                · {new Date(a.tanggal_acara).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}
              </p>
              {#if a.alamat}
                <p class="text-xs mt-0.5" style="color:var(--text-dim)">📍 {a.alamat}</p>
              {/if}
              <div class="flex flex-wrap gap-3 mt-1">
                {#if a.estimasi_tamu}
                  <span class="text-xs" style="color:var(--text-dim)">~{fmt(a.estimasi_tamu)} tamu</span>
                {/if}
                {#if a.total_order > 0}
                  <span class="text-xs font-medium" style="color:var(--accent)">Order: Rp {fmt(a.total_order)}</span>
                {/if}
              </div>
              {#if a.catatan}
                <p class="text-xs mt-1 italic" style="color:var(--text-dim)">{a.catatan}</p>
              {/if}
            </div>
            <div class="flex gap-2 flex-shrink-0">
              <button onclick={() => store.bukaFormEdit(a)}
                class="text-xs px-2 py-1 rounded" style="background:var(--surface2);color:var(--text)">Edit</button>
              <button onclick={() => store.konfirmHapus(a.id)}
                class="text-xs px-2 py-1 rounded" style="background:#fee2e2;color:#dc2626">Hapus</button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<FormAcara {store} />

<ConfirmDialog
  bind:open={store.konfirmBuka}
  pesan="Hapus acara ini?"
  onkanan={store.hapus}
  onkiri={() => { store.konfirmBuka = false }}
/>
