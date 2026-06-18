<script lang="ts">
  import DataTable from '$lib/components/DataTable.svelte'
  import Select from '$lib/components/ui/Select.svelte'
  import { fmt, tglFmt, kolJurnal } from '../keuangan.logic'
  import DateRangePicker2 from '$lib/components/ui/DateRangePicker2.svelte'
  import type { createKeuanganStore } from '../keuangan.store.svelte'

  let { store }: { store: ReturnType<typeof createKeuanganStore> } = $props()
</script>

<!-- Filter -->
<div style="display:flex; gap:.6rem; margin-bottom:.75rem; flex-wrap:wrap; align-items:flex-end">
  <DateRangePicker2 bind:from={store.filterDari} bind:to={store.filterSampai} onchange={() => store.muatJurnal()} />
  <div>
    <div style="font-size:.68rem; color:var(--text-dim); margin-bottom:.2rem">Akun</div>
    <Select bind:value={store.filterKasBankId} onchange={() => store.muatJurnal()}
      options={[{ value: 0, label: 'Semua Akun' }, ...store.kasBankList.map(kb => ({ value: kb.id, label: kb.nama }))]} />
  </div>
</div>

<!-- Ringkasan periode -->
<div style="display:flex; gap:.6rem; margin-bottom:.75rem">
  <div style="background:rgba(0,230,118,.08); border:1px solid rgba(0,230,118,.25); border-radius:4px; padding:.45rem .8rem; font-size:.78rem">
    <span style="color:var(--text-dim)">Masuk: </span>
    <span style="color:var(--accent); font-weight:700">Rp {fmt(store.jurnalMasuk)}</span>
  </div>
  <div style="background:rgba(255,82,82,.08); border:1px solid rgba(255,82,82,.25); border-radius:4px; padding:.45rem .8rem; font-size:.78rem">
    <span style="color:var(--text-dim)">Keluar: </span>
    <span style="color:var(--danger); font-weight:700">Rp {fmt(store.jurnalKeluar)}</span>
  </div>
  <div style="background:var(--surface); border:1px solid var(--border); border-radius:4px; padding:.45rem .8rem; font-size:.78rem">
    <span style="color:var(--text-dim)">Selisih: </span>
    <span style="color:{store.jurnalMasuk - store.jurnalKeluar >= 0 ? 'var(--accent)' : 'var(--danger)'}; font-weight:700">Rp {fmt(store.jurnalMasuk - store.jurnalKeluar)}</span>
  </div>
</div>

<DataTable
  columns={kolJurnal}
  tableId="keuangan_jurnal"
  bind:currentPage={store.pageJurnal}
  bind:pageSize={store.pageSizeJurnal}
  totalRows={store.jurnalList.length}
  rowCount={store.pagedJurnal.length}
  emptyText="Tidak ada jurnal untuk periode ini."
  maxRows={14}
>
  {#snippet body(hidden)}
    {#each store.pagedJurnal as j (j.id)}
      <tr style="border-bottom:1px solid var(--border)">
        {#if !hidden.has('tanggal')}
          <td style="padding:.55rem .6rem; color:var(--text-dim)">{tglFmt(j.tanggal)}</td>
        {/if}
        {#if !hidden.has('nama_akun')}
          <td style="padding:.55rem .6rem; color:var(--text)">{j.nama_akun ?? '—'}</td>
        {/if}
        {#if !hidden.has('jenis')}
          <td style="padding:.55rem .6rem">
            <span style="font-size:.7rem; font-weight:700; color:{j.jenis === 'masuk' ? 'var(--accent)' : 'var(--danger)'}">
              {j.jenis === 'masuk' ? '▲ MASUK' : '▼ KELUAR'}
            </span>
          </td>
        {/if}
        {#if !hidden.has('kategori')}
          <td style="padding:.55rem .6rem; color:var(--text-dim); font-size:.78rem">{j.kategori}</td>
        {/if}
        {#if !hidden.has('keterangan')}
          <td style="padding:.55rem .6rem; color:var(--text-dim); font-size:.78rem">{j.keterangan ?? '—'}</td>
        {/if}
        {#if !hidden.has('jumlah')}
          <td style="padding:.55rem .6rem; text-align:right; font-weight:700; color:{j.jenis === 'masuk' ? 'var(--accent)' : 'var(--danger)'}">
            Rp {fmt(j.jumlah)}
          </td>
        {/if}
      </tr>
    {/each}
  {/snippet}
</DataTable>
