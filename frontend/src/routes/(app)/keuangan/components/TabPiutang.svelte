<script lang="ts">
  import DataTable from '$lib/components/DataTable.svelte'
  import { fmt, tglFmt, isJatuhTempo, statusBadge, kolPiutang } from '../keuangan.logic'
  import type { createKeuanganStore } from '../keuangan.store.svelte'
  import type { FilterStatus } from '../keuangan.types'

  let { store }: { store: ReturnType<typeof createKeuanganStore> } = $props()
</script>

<div style="display:flex; gap:.5rem; margin-bottom:.75rem; align-items:center">
  <span style="font-size:.75rem; color:var(--text-dim)">Status:</span>
  {#each (['semua','belum','sebagian','lunas'] as const) as s (s)}
    <button
      onclick={() => store.filterStatusPiutang = s as FilterStatus}
      style="padding:.25rem .6rem; border:1px solid {store.filterStatusPiutang===s ? 'var(--accent)' : 'var(--border)'}; background:{store.filterStatusPiutang===s ? 'rgba(0,230,118,.15)' : 'transparent'}; color:{store.filterStatusPiutang===s ? 'var(--accent)' : 'var(--text-dim)'}; border-radius:4px; font-family:inherit; font-size:.72rem; cursor:pointer"
    >{s}</button>
  {/each}
</div>

<DataTable
  columns={kolPiutang}
  tableId="keuangan_piutang"
  bind:currentPage={store.pagePiutang}
  bind:pageSize={store.pageSizePiutang}
  totalRows={store.piutangFiltered.length}
  rowCount={store.pagedPiutang.length}
  emptyText="Tidak ada data piutang."
  maxRows={12}
>
  {#snippet body(hidden)}
    {#each store.pagedPiutang as p (p.id)}
      <tr style="border-bottom:1px solid var(--border)">
        {#if !hidden.has('nama_pelanggan')}
          <td style="padding:.55rem .6rem; color:var(--text)">{p.nama_pelanggan ?? '—'}</td>
        {/if}
        {#if !hidden.has('no_transaksi')}
          <td style="padding:.55rem .6rem; color:var(--text-dim); font-size:.75rem">{p.no_transaksi ?? '—'}</td>
        {/if}
        {#if !hidden.has('tanggal_piutang')}
          <td style="padding:.55rem .6rem; color:var(--text-dim)">{tglFmt(p.tanggal_piutang)}</td>
        {/if}
        {#if !hidden.has('tanggal_jatuh_tempo')}
          <td style="padding:.55rem .6rem; color:{isJatuhTempo(p.tanggal_jatuh_tempo) && p.status !== 'lunas' ? 'var(--danger)' : 'var(--text-dim)'}">
            {tglFmt(p.tanggal_jatuh_tempo)}
            {#if isJatuhTempo(p.tanggal_jatuh_tempo) && p.status !== 'lunas'} ⚠{/if}
          </td>
        {/if}
        {#if !hidden.has('total_piutang')}
          <td style="padding:.55rem .6rem; color:var(--text); text-align:right">Rp {fmt(p.total_piutang)}</td>
        {/if}
        {#if !hidden.has('sisa_piutang')}
          <td style="padding:.55rem .6rem; font-weight:700; text-align:right; color:{p.sisa_piutang > 0 ? 'var(--warn)' : 'var(--text-dim)'}">
            Rp {fmt(p.sisa_piutang)}
          </td>
        {/if}
        {#if !hidden.has('status_piutang')}
          <td style="padding:.55rem .6rem">
            <span style="font-size:.7rem; font-weight:700; text-transform:uppercase; {statusBadge(p.status)}">{p.status}</span>
          </td>
        {/if}
        {#if !hidden.has('aksi_piutang')}
          <td style="padding:.55rem .6rem">
            {#if p.status !== 'lunas'}
              <button
                onclick={() => store.bukaBayarPiutang(p)}
                style="padding:.25rem .65rem; background:var(--accent); color:var(--bg); border:none; border-radius:3px; font-family:inherit; font-size:.72rem; font-weight:700; cursor:pointer"
              >Terima</button>
            {/if}
          </td>
        {/if}
      </tr>
    {/each}
  {/snippet}
</DataTable>
