<script lang="ts">
  import type { createLaporanStore } from '../laporan.store.svelte'
  import { fmt, fmtRp, tglFmt } from '../laporan.logic'
  import ChartKartu from '$lib/components/chart/ChartKartu.svelte'
  import ChartBatang from '$lib/components/chart/ChartBatang.svelte'
  import ChartDonat from '$lib/components/chart/ChartDonat.svelte'
  import DataTable, { type Column } from '$lib/components/DataTable.svelte'
  import LazyMount from '$lib/components/ui/LazyMount.svelte'

  let { store }: { store: ReturnType<typeof createLaporanStore> } = $props()

  const columns: Column[] = [
    { key: 'rank', label: '#', width: 48 },
    { key: 'produk', label: 'Produk', sortable: true },
    { key: 'kategori', label: 'Kategori', hideable: true, priority: 2 },
    { key: 'stok', label: 'Stok', align: 'right', sortable: true },
    { key: 'hpp', label: 'HPP', align: 'right', hideable: true, priority: 2 },
    { key: 'nilai_stok', label: 'Nilai Stok', align: 'right', sortable: true },
  ]

  let currentPage = $state(1)
  let pageSize = $state(25)

  $effect(() => {
    store.persediaanPromise
    currentPage = 1
  })
</script>

<!-- Filter Persediaan -->
<div style="display:flex; gap:.75rem; align-items:center; margin-bottom:1rem">
  <button
    onclick={() => store.muatPersediaan()}
    style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
  >Refresh</button>
  <span style="font-size:.75rem; color:var(--text-dim)">Nilai stok kondisi saat ini</span>
</div>

{#await store.persediaanPromise}
  <div style="padding:1.25rem; background:var(--surface); border:1px solid var(--border); border-radius:8px">
    <DataTable {columns} loading={true} rowCount={6} emptyText="">
      {#snippet body(_hidden)}{/snippet}
    </DataTable>
  </div>
{:then data}
  <ChartKartu kosong={!data} pesanKosong="Klik Refresh untuk memuat data.">
    {#if data}
      {@const allRows = data.produk}
      {@const slicedRows = allRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
      {@const topNilai = allRows.filter((pr) => pr.nilai_stok > 0).slice(0, 15)}
      {@const katData = [...allRows.filter((pr) => pr.nilai_stok > 0).reduce((m, pr) => {
        m.set(pr.kategori, (m.get(pr.kategori) ?? 0) + pr.nilai_stok); return m
      }, new Map<string, number>()).entries()].map(([k, v]) => ({ kategori: k, nilai: v })).sort((a, b) => b.nilai - a.nilai)}
      <div>
        <div style="text-align:center; margin-bottom:1.5rem">
          <div style="font-size:1rem; font-weight:700; color:var(--text)">LAPORAN NILAI PERSEDIAAN</div>
          <div style="font-size:.8rem; color:var(--text-dim)">Per {tglFmt(data.per_tanggal)}</div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:.6rem; margin-bottom:1.5rem">
          {#each [
            { label: 'Total Nilai Stok', val: fmtRp(data.total_nilai), color: 'var(--accent)' },
            { label: 'Jumlah SKU Aktif', val: String(data.jumlah_sku), color: 'var(--text)' },
            { label: 'SKU Tanpa Stok', val: String(data.sku_tanpa_stok), color: data.sku_tanpa_stok > 0 ? 'var(--warn)' : 'var(--text-dim)' },
          ] as card (card.label)}
            <div style="padding:.75rem 1rem; background:var(--surface); border:1px solid var(--border); border-radius:6px">
              <div style="font-size:.7rem; color:var(--text-dim); margin-bottom:.25rem">{card.label}</div>
              <div style="font-size:.9rem; font-weight:700; color:{card.color}">{card.val}</div>
            </div>
          {/each}
        </div>

        <DataTable
          {columns}
          rowCount={slicedRows.length}
          totalRows={allRows.length}
          bind:currentPage
          bind:pageSize
          tableId="laporan-persediaan"
        >
          {#snippet body(hidden)}
            {#each slicedRows as pr, i (pr.barang_id)}
              {@const rank = (currentPage - 1) * pageSize + i + 1}
              <tr style="border-top:1px solid var(--border); opacity:{pr.stok <= 0 ? 0.4 : 1}">
                <td style="padding:.35rem .75rem; color:var(--text-dim); font-size:.75rem">{rank}</td>
                <td style="padding:.35rem .75rem; color:var(--text); font-weight:500">{pr.nama_barang}</td>
                {#if !hidden.has('kategori')}
                  <td style="padding:.35rem .5rem; color:var(--text-dim); font-size:.78rem">{pr.kategori}</td>
                {/if}
                <td style="padding:.35rem .75rem; text-align:right; color:{pr.stok <= 0 ? 'var(--danger)' : 'var(--text)'}; font-weight:600">{fmt(pr.stok)}</td>
                {#if !hidden.has('hpp')}
                  <td style="padding:.35rem .75rem; text-align:right; color:var(--text-dim)">Rp {fmt(pr.hpp)}</td>
                {/if}
                <td style="padding:.35rem .75rem; text-align:right; color:var(--text); font-weight:600">Rp {fmt(pr.nilai_stok)}</td>
              </tr>
            {/each}
          {/snippet}
        </DataTable>
        <div style="display:flex; justify-content:space-between; padding:.4rem .75rem; background:var(--surface2); border:1px solid var(--border); border-top:2px solid var(--border); border-radius:0 0 4px 4px; margin-top:-1px">
          <span style="font-weight:700; color:var(--text)">TOTAL NILAI</span>
          <span style="font-weight:700; color:var(--accent)">Rp {fmt(data.total_nilai)}</span>
        </div>
        <p style="font-size:.72rem; color:var(--text-dim); margin-top:.6rem">* HPP menggunakan harga beli rata-rata (WAC). Nilai stok adalah estimasi modal tertanam.</p>

        {#if topNilai.length > 0}
          <LazyMount when="visible" tinggi={220}>
            <div style="margin-top:2rem">
              <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.75rem">Top 15 Nilai Stok</div>
              <ChartBatang data={topNilai} x="nama_barang" y="nilai_stok" formatNilai={(v) => `Rp ${fmt(v)}`} tinggi={200} />
            </div>
            {#if katData.length > 1}
              <div style="margin-top:1.5rem">
                <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.75rem">Distribusi per Kategori</div>
                <ChartDonat data={katData} label="kategori" nilai="nilai" formatNilai={(v) => `Rp ${fmt(v)}`} tinggi={160} />
              </div>
            {/if}
          </LazyMount>
        {/if}
      </div>
    {/if}
  </ChartKartu>
{/await}
