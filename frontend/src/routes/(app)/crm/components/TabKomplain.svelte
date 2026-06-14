<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte'
  import { KATEGORI_LABEL, STATUS_K_COLOR } from '../crm.logic.js'
  import type { CrmStore } from '../crm.store.svelte.js'

  let { store }: { store: CrmStore } = $props()
</script>

<div class="flex flex-wrap gap-2 items-end mb-2">
  <input type="month" bind:value={store.kBulan}
    class="border rounded px-2 py-1 text-sm" style="background:var(--bg);border-color:var(--border);color:var(--text)">
  <select bind:value={store.kStatus}
    class="border rounded px-2 py-1 text-sm" style="background:var(--bg);border-color:var(--border);color:var(--text)">
    <option value="">Semua Status</option>
    <option value="masuk">Masuk</option>
    <option value="diproses">Diproses</option>
    <option value="selesai">Selesai</option>
    <option value="ditolak">Ditolak</option>
  </select>
  <div class="ml-auto">
    <Button onclick={() => store.bukaFormKomplain()}>+ Catat Komplain</Button>
  </div>
</div>

{#if store.kRows.length === 0}
  <p class="text-sm py-4" style="color:var(--text-dim)">Belum ada komplain tercatat.</p>
{:else}
  <div class="overflow-x-auto rounded border" style="border-color:var(--border)">
    <table class="min-w-full text-sm" style="border-collapse:collapse;min-width:500px">
      <thead><tr style="background:var(--surface2)">
        <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Tanggal</th>
        <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Komplain</th>
        <th class="px-3 py-2 text-left text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Kategori</th>
        <th class="px-3 py-2 text-center text-xs font-semibold" style="color:var(--text-dim)">Status</th>
        <th class="px-3 py-2"></th>
      </tr></thead>
      <tbody>
        {#each store.kRows as row (row.id)}
          <tr class="border-t" style="border-color:var(--border)">
            <td class="px-3 py-2 text-xs">{row.tanggal}</td>
            <td class="px-3 py-2">
              <div class="text-sm">{row.deskripsi}</div>
              {#if row.nama_pelanggan}<div class="text-xs" style="color:var(--text-dim)">{row.nama_pelanggan}</div>{/if}
              {#if row.resolusi}<div class="text-xs mt-0.5" style="color:var(--accent)">→ {row.resolusi}</div>{/if}
            </td>
            <td class="px-3 py-2 text-xs hidden sm:table-cell" style="color:var(--text-dim)">{KATEGORI_LABEL[row.kategori] ?? row.kategori}</td>
            <td class="px-3 py-2 text-center">
              <span class="text-xs font-semibold" style="color:{STATUS_K_COLOR[row.status]}">{row.status}</span>
            </td>
            <td class="px-3 py-2 text-right whitespace-nowrap">
              {#if row.status === 'masuk' || row.status === 'diproses'}
                <button onclick={() => store.bukaDetailKomplain(row)}
                  class="text-xs px-2 py-0.5 rounded mr-1"
                  style="background:color-mix(in srgb,var(--info) 15%,transparent);color:var(--info)">Proses</button>
              {/if}
              <button onclick={() => store.hapusK(row.id)} class="text-xs px-2 py-0.5 rounded"
                style="color:var(--text-dim)">×</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
