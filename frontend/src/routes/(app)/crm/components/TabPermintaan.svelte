<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte'
  import { STATUS_P_COLOR } from '../crm.logic.js'
  import type { CrmStore } from '../crm.store.svelte.js'
  import type { PermintaanRow } from '../crm.types.js'

  let { store }: { store: CrmStore } = $props()
</script>

<div class="flex flex-wrap gap-2 items-end mb-2">
  <input type="month" bind:value={store.pBulan}
    class="border rounded px-2 py-1 text-sm" style="background:var(--bg);border-color:var(--border);color:var(--text)">
  <select bind:value={store.pStatus}
    class="border rounded px-2 py-1 text-sm" style="background:var(--bg);border-color:var(--border);color:var(--text)">
    <option value="">Semua Status</option>
    <option value="menunggu">Menunggu</option>
    <option value="tersedia">Tersedia</option>
    <option value="tidak_tersedia">Tidak Tersedia</option>
  </select>
  <div class="ml-auto">
    <Button onclick={() => store.bukaFormPermintaan()}>+ Catat Permintaan</Button>
  </div>
</div>

{#if store.pRows.length === 0}
  <p class="text-sm py-4" style="color:var(--text-dim)">Belum ada permintaan tercatat.</p>
{:else}
  <div class="overflow-x-auto rounded border" style="border-color:var(--border)">
    <table class="min-w-full text-sm" style="border-collapse:collapse;min-width:480px">
      <thead><tr style="background:var(--surface2)">
        <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Tanggal</th>
        <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Barang Diminta</th>
        <th class="px-3 py-2 text-left text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Pelanggan</th>
        <th class="px-3 py-2 text-right text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Qty</th>
        <th class="px-3 py-2 text-center text-xs font-semibold" style="color:var(--text-dim)">Status</th>
        <th class="px-3 py-2"></th>
      </tr></thead>
      <tbody>
        {#each store.pRows as row (row.id)}
          <tr class="border-t" style="border-color:var(--border)">
            <td class="px-3 py-2 text-xs">{row.tanggal}</td>
            <td class="px-3 py-2">
              <div class="font-medium">{row.nama_barang}</div>
              {#if row.catatan}<div class="text-xs" style="color:var(--text-dim)">{row.catatan}</div>{/if}
            </td>
            <td class="px-3 py-2 text-xs hidden sm:table-cell" style="color:var(--text-dim)">{row.nama_pelanggan ?? 'Umum'}</td>
            <td class="px-3 py-2 text-right text-xs hidden sm:table-cell" style="color:var(--text-dim)">{row.qty_minta ?? '—'}</td>
            <td class="px-3 py-2 text-center">
              <span class="text-xs font-semibold" style="color:{STATUS_P_COLOR[row.status]}">{row.status.replace('_', ' ')}</span>
            </td>
            <td class="px-3 py-2 text-right whitespace-nowrap">
              {#if row.status === 'menunggu'}
                <button onclick={() => store.ubahStatusP(row.id, 'tersedia')} class="text-xs px-2 py-0.5 rounded mr-1"
                  style="background:color-mix(in srgb,var(--accent) 15%,transparent);color:var(--accent)">Tersedia</button>
                <button onclick={() => store.ubahStatusP(row.id, 'tidak_tersedia')} class="text-xs px-2 py-0.5 rounded mr-1"
                  style="color:var(--danger)">Tidak Ada</button>
              {/if}
              <button onclick={() => store.hapusP(row.id)} class="text-xs px-2 py-0.5 rounded"
                style="color:var(--text-dim)">×</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
