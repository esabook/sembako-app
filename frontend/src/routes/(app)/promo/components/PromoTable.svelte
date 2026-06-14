<script lang="ts">
  import DataTable from '$lib/components/DataTable.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import { PROMO_COLUMNS, badgeTipe, isAktifHariIni, rupiah, tglStr } from '../promo.logic'
  import type { createPromoStore } from '../promo.store.svelte'

  let { store }: { store: ReturnType<typeof createPromoStore> } = $props()
</script>

<DataTable
  columns={PROMO_COLUMNS}
  bind:sortKey={store.pSortKey}
  bind:sortDir={store.pSortDir}
  rowCount={store.loading ? 1 : store.sortedPromo.length}
  emptyText="Belum ada promo"
  tableId="promo-list"
  maxRows={12}
>
  {#snippet body(hidden)}
    {#if store.loading}
      <tr><td colspan="7"><div class="flex justify-center py-8"><Spinner /></div></td></tr>
    {:else}
      {#each store.sortedPromo as p (p.id)}
        {@const badge = badgeTipe(p.tipe)}
        {@const aktifHariIni = isAktifHariIni(p)}
        <tr class="border-t" style="border-color:var(--border);opacity:{p.aktif ? 1 : 0.5}">
          {#if !hidden.has('nama')}
            <td class="px-3 py-2 text-sm">
              <div class="font-medium">{p.nama}</div>
              {#if p.deskripsi}<div class="text-xs" style="color:var(--text-dim)">{p.deskripsi}</div>{/if}
              {#if p.min_qty > 1 || p.min_total > 0}
                <div class="text-xs" style="color:var(--text-dim)">
                  {p.min_qty > 1 ? `min ${p.min_qty} qty` : ''}
                  {p.min_total > 0 ? `min total ${rupiah(p.min_total)}` : ''}
                </div>
              {/if}
            </td>
          {/if}
          {#if !hidden.has('tipe')}
            <td class="px-3 py-2">
              <span class="text-xs font-bold" style="color:{badge.color}">{badge.label}</span>
            </td>
          {/if}
          {#if !hidden.has('nilai')}
            <td class="px-3 py-2 text-right text-sm font-mono font-medium" style="color:var(--accent)">
              {p.tipe_nilai === 'persen' ? `${p.nilai}%` : rupiah(p.nilai)}
            </td>
          {/if}
          {#if !hidden.has('targets')}
            <td class="px-3 py-2 text-xs" style="color:var(--text-dim)">
              {#if p.tipe === 'total'}
                <span>Semua belanja</span>
              {:else}
                {p.targets.length} {p.tipe === 'item' ? 'barang' : 'kategori'}
              {/if}
            </td>
          {/if}
          {#if !hidden.has('berlaku_mulai')}
            <td class="px-3 py-2 text-xs" style="color:var(--text-dim)">
              {tglStr(p.berlaku_mulai)} — {tglStr(p.berlaku_sampai)}
              {#if p.max_penggunaan !== null}
                <div>{p.jumlah_dipakai}/{p.max_penggunaan}×</div>
              {/if}
            </td>
          {/if}
          {#if !hidden.has('aktif_status')}
            <td class="px-3 py-2 text-center">
              <button
                onclick={() => store.toggleAktif(p)}
                class="text-xs px-2 py-0.5 rounded border"
                style="{aktifHariIni
                  ? 'border-color:var(--accent);color:var(--accent)'
                  : 'border-color:var(--border);color:var(--text-dim)'}">
                {aktifHariIni ? 'AKTIF' : p.aktif ? 'belum berlaku' : 'nonaktif'}
              </button>
            </td>
          {/if}
          {#if !hidden.has('aksi')}
            <td class="px-3 py-2 text-right">
              <button onclick={() => store.bukaForm(p)} class="text-xs mr-2" style="color:var(--info)">Edit</button>
              <button onclick={() => store.hapus(p.id)} class="text-xs" style="color:var(--danger)">Hapus</button>
            </td>
          {/if}
        </tr>
      {/each}
    {/if}
  {/snippet}
</DataTable>
