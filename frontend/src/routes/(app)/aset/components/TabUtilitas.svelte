<script lang="ts">
  import Skeleton from '$lib/components/ui/Skeleton.svelte'
  import { JENIS_LABEL, JENIS_ICON, rp } from '../aset.logic.js'
  import type { AsetStore } from '../aset.store.svelte.js'
  import type { TagihanRow } from '../aset.types.js'

  let { store }: { store: AsetStore } = $props()
</script>

<div class="flex flex-wrap gap-2 items-end mb-2">
  <select bind:value={store.utJenisFilter}
    class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
    <option value="">Semua Jenis</option>
    {#each Object.entries(JENIS_LABEL) as [v, lbl] (v)}
      <option value={v}>{JENIS_ICON[v as TagihanRow['jenis']]} {lbl}</option>
    {/each}
  </select>
  <input type="month" bind:value={store.utBulanFilter}
    class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
  <button onclick={() => store.bukaFormUt()}
    class="px-3 py-1 rounded text-sm font-bold ml-auto" style="background:var(--accent);color:var(--bg)">+ Catat Tagihan</button>
</div>

{#if store.utRows.length > 0}
  <div class="flex gap-3 flex-wrap mb-2">
    {#each (['listrik','air','internet','lainnya'] as const) as j (j)}
      {@const total = store.utRows.filter(r => r.jenis === j).reduce((s, r) => s + r.jumlah, 0)}
      {#if total > 0}
        <div class="rounded border px-3 py-2 text-xs" style="background:var(--surface);border-color:var(--border)">
          <span>{JENIS_ICON[j]} {JENIS_LABEL[j]}</span>
          <span class="font-bold ml-2">{rp(total)}</span>
        </div>
      {/if}
    {/each}
    <div class="rounded border px-3 py-2 text-xs font-bold" style="background:var(--surface2);border-color:var(--border);color:var(--accent)">
      Total: {rp(store.totalUt)}
    </div>
  </div>
{/if}

{#if store.utLoading}
  <div class="overflow-x-auto rounded border" style="border-color:var(--border)">
    <table class="min-w-full text-sm" style="border-collapse:collapse">
      <tbody>
        {#each { length: 4 } as _, i (i)}
          <tr class="border-t" style="border-color:var(--border)">
            <td class="px-3 py-2.5"><Skeleton h="0.75rem" w="{50 + (i * 13) % 30}%" /></td>
            <td class="px-3 py-2.5"><Skeleton h="0.75rem" w="{40 + (i * 9) % 25}%" /></td>
            <td class="px-3 py-2.5"><Skeleton h="0.75rem" w="{45 + (i * 7) % 20}%" /></td>
            <td class="px-3 py-2.5 hidden sm:table-cell"><Skeleton h="0.75rem" w="{35 + (i * 11) % 20}%" /></td>
            <td class="px-3 py-2.5 hidden sm:table-cell"><Skeleton h="0.75rem" w="{30 + (i * 17) % 15}%" /></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else if store.utRows.length === 0}
  <p class="text-sm py-4" style="color:var(--text-dim)">Belum ada tagihan tercatat.</p>
{:else}
  <div class="overflow-x-auto rounded border" style="border-color:var(--border)">
    <table class="min-w-full text-sm" style="border-collapse:collapse">
      <thead>
        <tr style="background:var(--surface2)">
          <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Jenis</th>
          <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Periode</th>
          <th class="px-3 py-2 text-right text-xs font-semibold" style="color:var(--text-dim)">Jumlah</th>
          <th class="px-3 py-2 text-left text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Tgl Bayar</th>
          <th class="px-3 py-2 text-right text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Pemakaian</th>
          <th class="px-3 py-2 text-left text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Catatan</th>
          <th class="px-3 py-2"></th>
        </tr>
      </thead>
      <tbody>
        {#each store.utRows as row (row.id)}
          <tr class="border-t" style="border-color:var(--border)">
            <td class="px-3 py-2">
              <span>{JENIS_ICON[row.jenis]}</span>
              <span class="ml-1 text-sm font-medium">{JENIS_LABEL[row.jenis]}</span>
            </td>
            <td class="px-3 py-2 text-sm">{row.periode_bulan}</td>
            <td class="px-3 py-2 text-right font-mono font-semibold" style="color:var(--accent)">{rp(row.jumlah)}</td>
            <td class="px-3 py-2 text-xs hidden sm:table-cell" style="color:var(--text-dim)">{row.tanggal_bayar ?? '—'}</td>
            <td class="px-3 py-2 text-right text-xs hidden sm:table-cell" style="color:var(--text-dim)">
              {row.meter_awal != null && row.meter_akhir != null
                ? `${row.meter_akhir - row.meter_awal} kWh/m³`
                : '—'}
            </td>
            <td class="px-3 py-2 text-xs hidden sm:table-cell" style="color:var(--text-dim)">{row.catatan ?? '—'}</td>
            <td class="px-3 py-2 text-right whitespace-nowrap">
              <button onclick={() => store.bukaFormUt(row)} class="text-xs px-2 py-0.5 rounded mr-1"
                style="border:1px solid var(--border);color:var(--text-dim)">Edit</button>
              <button onclick={() => store.hapusUt(row.id)} class="text-xs px-2 py-0.5 rounded"
                style="color:var(--danger)">Hapus</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
