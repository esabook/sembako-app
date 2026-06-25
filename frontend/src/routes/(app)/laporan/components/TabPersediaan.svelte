<script lang="ts">
  import type { createLaporanStore } from '../laporan.store.svelte'
  import { fmt, fmtRp, tglFmt } from '../laporan.logic'
  import ChartKartu from '$lib/components/chart/ChartKartu.svelte'

  let { store }: { store: ReturnType<typeof createLaporanStore> } = $props()
</script>

<!-- Filter Persediaan -->
<div style="display:flex; gap:.75rem; align-items:center; margin-bottom:1rem">
  <button
    onclick={() => store.muatPersediaan()}
    style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
  >Refresh</button>
  <span style="font-size:.75rem; color:var(--text-dim)">Nilai stok kondisi saat ini</span>
</div>

<ChartKartu kosong={!store.persediaan} pesanKosong="Klik Refresh untuk memuat data.">
{#if store.persediaan}
  {@const p = store.persediaan}
  <div>
    <div style="text-align:center; margin-bottom:1.5rem">
      <div style="font-size:1rem; font-weight:700; color:var(--text)">LAPORAN NILAI PERSEDIAAN</div>
      <div style="font-size:.8rem; color:var(--text-dim)">Per {tglFmt(p.per_tanggal)}</div>
    </div>
    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:.6rem; margin-bottom:1.5rem">
      {#each [
        { label: 'Total Nilai Stok', val: fmtRp(p.total_nilai), color: 'var(--accent)' },
        { label: 'Jumlah SKU Aktif', val: String(p.jumlah_sku), color: 'var(--text)' },
        { label: 'SKU Tanpa Stok', val: String(p.sku_tanpa_stok), color: p.sku_tanpa_stok > 0 ? 'var(--warn)' : 'var(--text-dim)' },
      ] as card (card.label)}
        <div style="padding:.75rem 1rem; background:var(--surface); border:1px solid var(--border); border-radius:6px">
          <div style="font-size:.7rem; color:var(--text-dim); margin-bottom:.25rem">{card.label}</div>
          <div style="font-size:.9rem; font-weight:700; color:{card.color}">{card.val}</div>
        </div>
      {/each}
    </div>
    <div style="overflow-x:auto">
      <table style="width:100%; border-collapse:collapse; font-size:.82rem; min-width:480px">
        <thead>
          <tr style="background:var(--surface2)">
            <th style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600">#</th>
            <th style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600">Produk</th>
            <th style="padding:.4rem .5rem; text-align:left; color:var(--text-dim); font-weight:600" class="hidden sm:table-cell">Kategori</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Stok</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600" class="hidden sm:table-cell">HPP</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Nilai Stok</th>
          </tr>
        </thead>
        <tbody>
          {#each p.produk as pr, i (pr.barang_id)}
            <tr style="border-top:1px solid var(--border); opacity:{pr.stok <= 0 ? 0.4 : 1}">
              <td style="padding:.35rem .75rem; color:var(--text-dim); font-size:.75rem">{i + 1}</td>
              <td style="padding:.35rem .75rem; color:var(--text); font-weight:500">{pr.nama_barang}</td>
              <td style="padding:.35rem .5rem; color:var(--text-dim); font-size:.78rem" class="hidden sm:table-cell">{pr.kategori}</td>
              <td style="padding:.35rem .75rem; text-align:right; color:{pr.stok <= 0 ? 'var(--danger)' : 'var(--text)'}; font-weight:600">{fmt(pr.stok)}</td>
              <td style="padding:.35rem .75rem; text-align:right; color:var(--text-dim)" class="hidden sm:table-cell">Rp {fmt(pr.hpp)}</td>
              <td style="padding:.35rem .75rem; text-align:right; color:var(--text); font-weight:600">Rp {fmt(pr.nilai_stok)}</td>
            </tr>
          {/each}
          <tr style="border-top:2px solid var(--border); background:var(--surface2)">
            <td colspan="5" style="padding:.4rem .75rem; font-weight:700; color:var(--text)">TOTAL NILAI</td>
            <td style="padding:.4rem .75rem; text-align:right; font-weight:700; color:var(--accent)">Rp {fmt(p.total_nilai)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p style="font-size:.72rem; color:var(--text-dim); margin-top:.6rem">* HPP menggunakan harga beli rata-rata (WAC). Nilai stok adalah estimasi modal tertanam.</p>
  </div>
{/if}
</ChartKartu>
