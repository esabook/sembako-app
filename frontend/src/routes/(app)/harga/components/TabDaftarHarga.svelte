<script lang="ts">
  import DataTable, { type Column } from '$lib/components/DataTable.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import { rp, pct, marginColor } from '../harga.logic.js'
  import type { HargaStore } from '../harga.store.svelte.js'

  let { store }: { store: HargaStore } = $props()

  const KOLOM: Column[] = [
    { key: 'nama_barang', label: 'Barang', sortable: true, minWidth: 140 },
    { key: 'harga_beli_terakhir', label: 'H.Beli', align: 'right', sortable: true, priority: 3 },
    { key: 'harga_jual_eceran', label: 'Eceran', align: 'right', sortable: true },
    { key: 'margin_eceran', label: 'Margin E', align: 'right', sortable: true, priority: 2 },
    { key: 'harga_jual_grosir', label: 'Grosir', align: 'right', sortable: true, priority: 2 },
    { key: 'margin_grosir', label: 'Margin G', align: 'right', sortable: true, priority: 3 },
    { key: 'aksi', label: '', align: 'right', sortable: false, hideable: false, minWidth: 90 },
  ]
</script>

<div class="flex gap-2">
  <input
    type="search"
    bind:value={store.q}
    placeholder="Cari nama / kode..."
    class="flex-1 rounded border px-3 py-1.5 text-sm"
    style="background:var(--surface);border-color:var(--border);color:var(--text)"
  />
</div>

{#if store.loading}
  <div class="flex justify-center py-12"><Spinner /></div>
{:else}
  <DataTable
    columns={KOLOM}
    bind:sortKey={store.sortKey}
    bind:sortDir={store.sortDir}
    rowCount={store.sortedFiltered.length}
    emptyText="Tidak ada barang"
    tableId="harga-daftar"
    maxRows={15}
  >
    {#snippet body(hidden)}
      {#each store.sortedFiltered as b (b.id)}
        <tr class="border-t" style="border-color:var(--border)">
          {#if !hidden.has('nama_barang')}
            <td class="px-3 py-2 text-xs" style="color:var(--text)">
              <div class="font-medium">{b.nama_barang}</div>
              <div style="color:var(--text-dim)">{b.kode_barang} · {b.nama_kategori ?? '-'}</div>
            </td>
          {/if}
          {#if !hidden.has('harga_beli_terakhir')}
            <td class="px-3 py-2 text-right text-xs font-mono" style="color:var(--text-dim)">
              {rp(b.harga_beli_terakhir)}
            </td>
          {/if}
          {#if !hidden.has('harga_jual_eceran')}
            <td class="px-3 py-2 text-right text-xs font-mono font-bold" style="color:var(--text)">
              {rp(b.harga_jual_eceran)}
            </td>
          {/if}
          {#if !hidden.has('margin_eceran')}
            <td class="px-3 py-2 text-right text-xs font-mono" style={marginColor(b.margin_eceran)}>
              {pct(b.margin_eceran)}
            </td>
          {/if}
          {#if !hidden.has('harga_jual_grosir')}
            <td class="px-3 py-2 text-right text-xs font-mono font-bold" style="color:var(--text)">
              {rp(b.harga_jual_grosir)}
            </td>
          {/if}
          {#if !hidden.has('margin_grosir')}
            <td class="px-3 py-2 text-right text-xs font-mono" style={marginColor(b.margin_grosir)}>
              {pct(b.margin_grosir)}
            </td>
          {/if}
          {#if !hidden.has('aksi')}
            <td class="px-3 py-2">
              <div class="flex gap-1 justify-end">
                <button
                  onclick={() => store.bukaEdit(b)}
                  class="rounded px-2 py-1 text-xs font-bold"
                  style="background:var(--surface2);color:var(--text)"
                >Edit</button>
                <button
                  onclick={() => store.bukaHistori(b)}
                  class="rounded px-2 py-1 text-xs"
                  style="color:var(--text-dim)"
                >Histori</button>
              </div>
            </td>
          {/if}
        </tr>
      {/each}
    {/snippet}
  </DataTable>

  <p class="text-xs" style="color:var(--text-dim)">
    {store.sortedFiltered.length} barang · Margin:
    <span style="color:var(--danger)">merah &lt;5%</span> ·
    <span style="color:var(--warn)">kuning &lt;15%</span> ·
    <span style="color:var(--accent)">hijau ≥15%</span>
  </p>
{/if}
