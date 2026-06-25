<script lang="ts">
  import DataTable from '$lib/components/DataTable.svelte'
  import { fmt, tglFmt, isJatuhTempo, statusBadge, kolHutang } from '../keuangan.logic'
  import type { createKeuanganStore } from '../keuangan.store.svelte'
  import type { FilterStatus } from '../keuangan.types'

  let { store }: { store: ReturnType<typeof createKeuanganStore> } = $props()
</script>

<div style="display:flex; gap:.5rem; margin-bottom:.75rem; align-items:center">
  <span style="font-size:.75rem; color:var(--text-dim)">Status:</span>
  {#each (['semua','belum','sebagian','lunas'] as const) as s (s)}
    <button
      onclick={() => store.filterStatusHutang = s as FilterStatus}
      style="padding:.25rem .6rem; border:1px solid {store.filterStatusHutang===s ? 'var(--accent)' : 'var(--border)'}; background:{store.filterStatusHutang===s ? 'rgba(0,230,118,.15)' : 'transparent'}; color:{store.filterStatusHutang===s ? 'var(--accent)' : 'var(--text-dim)'}; border-radius:4px; font-family:inherit; font-size:.72rem; cursor:pointer"
    >{s}</button>
  {/each}
</div>

<DataTable
  columns={kolHutang}
  tableId="keuangan_hutang"
  bind:currentPage={store.pageHutang}
  bind:pageSize={store.pageSizeHutang}
  totalRows={store.hutangFiltered.length}
  rowCount={store.pagedHutang.length}
  emptyText="Tidak ada data hutang."
  maxRows={12}
>
  {#snippet body(hidden)}
    {#each store.pagedHutang as h (h.id)}
      <tr style="border-bottom:1px solid var(--border)">
        {#if !hidden.has('nama_supplier')}
          <td style="padding:.55rem .6rem; color:var(--text)">{h.nama_supplier ?? '—'}</td>
        {/if}
        {#if !hidden.has('tanggal_hutang')}
          <td style="padding:.55rem .6rem; color:var(--text-dim)">{tglFmt(h.tanggal_hutang)}</td>
        {/if}
        {#if !hidden.has('tanggal_jatuh_tempo')}
          <td style="padding:.55rem .6rem; color:{isJatuhTempo(h.tanggal_jatuh_tempo) && h.status !== 'lunas' ? 'var(--danger)' : 'var(--text-dim)'}">
            {tglFmt(h.tanggal_jatuh_tempo)}
            {#if isJatuhTempo(h.tanggal_jatuh_tempo) && h.status !== 'lunas'} ⚠{/if}
          </td>
        {/if}
        {#if !hidden.has('total_hutang')}
          <td style="padding:.55rem .6rem; color:var(--text); text-align:right">Rp {fmt(h.total_hutang)}</td>
        {/if}
        {#if !hidden.has('sisa_hutang')}
          <td style="padding:.55rem .6rem; font-weight:700; text-align:right; color:{h.sisa_hutang > 0 ? 'var(--danger)' : 'var(--text-dim)'}">
            Rp {fmt(h.sisa_hutang)}
          </td>
        {/if}
        {#if !hidden.has('status_hutang')}
          <td style="padding:.55rem .6rem">
            <span style="font-size:.7rem; font-weight:700; text-transform:uppercase; {statusBadge(h.status)}">{h.status}</span>
          </td>
        {/if}
        {#if !hidden.has('aksi_hutang')}
          <td style="padding:.55rem .6rem">
            {#if h.status !== 'lunas'}
              <button
                onclick={() => store.bukaBayarHutang(h)}
                style="padding:.25rem .65rem; background:var(--accent); color:var(--bg); border:none; border-radius:3px; font-family:inherit; font-size:.72rem; font-weight:700; cursor:pointer"
              >Bayar</button>
            {/if}
          </td>
        {/if}
      </tr>
    {/each}
  {/snippet}
</DataTable>
