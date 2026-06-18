<script lang="ts">
  import type { createLaporanStore } from '../laporan.store.svelte'
  import { fmt, tglFmt } from '../laporan.logic'
  import DateRangePicker2 from '$lib/components/ui/DateRangePicker2.svelte'

  let { store }: { store: ReturnType<typeof createLaporanStore> } = $props()
</script>

<!-- Filter Pelanggan -->
<div style="display:flex; gap:.75rem; align-items:center; margin-bottom:1rem; flex-wrap:wrap">
  <DateRangePicker2 bind:from={store.periodePelanggan.dari} bind:to={store.periodePelanggan.sampai} />
  <button onclick={() => store.muatTopPelanggan()}
    style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
  >Tampilkan</button>
  {#each [
    { label: 'Bulan ini', fn: () => { store.periodePelanggan = store.defaultPeriode(); store.muatTopPelanggan() } },
    { label: 'Bulan lalu', fn: () => { store.periodePelanggan = store.periodeSebelumnya(); store.muatTopPelanggan() } },
  ] as s (s.label)}
    <button onclick={s.fn}
      style="padding:.25rem .6rem; background:transparent; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.72rem; cursor:pointer"
    >{s.label}</button>
  {/each}
</div>

{#if store.topPelanggan}
  {@const tp = store.topPelanggan}
  <div style="padding:0 1.25rem 2rem">
    <div style="text-align:center; margin-bottom:1.5rem">
      <div style="font-size:1rem; font-weight:700; color:var(--text)">TOP PELANGGAN</div>
      <div style="font-size:.8rem; color:var(--text-dim)">
        Periode {tglFmt(tp.periode.dari)} — {tglFmt(tp.periode.sampai)}
      </div>
    </div>
    {#if tp.pelanggan.length === 0}
      <p style="color:var(--text-dim); font-size:.85rem">Tidak ada transaksi pelanggan terdaftar di periode ini.</p>
    {:else}
      <div style="overflow-x:auto">
        <table style="width:100%; border-collapse:collapse; font-size:.82rem; min-width:480px">
          <thead>
            <tr style="background:var(--surface2)">
              <th style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600">#</th>
              <th style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600">Nama</th>
              <th style="padding:.4rem .5rem; text-align:left; color:var(--text-dim); font-weight:600" class="hidden sm:table-cell">Tipe</th>
              <th style="padding:.4rem .5rem; text-align:right; color:var(--text-dim); font-weight:600" class="hidden sm:table-cell">Transaksi</th>
              <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Omset</th>
              <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">%</th>
            </tr>
          </thead>
          <tbody>
            {#each tp.pelanggan as pl, i (pl.pelanggan_id)}
              <tr style="border-top:1px solid var(--border)">
                <td style="padding:.35rem .75rem; color:var(--text-dim); font-size:.75rem">{i + 1}</td>
                <td style="padding:.35rem .75rem; color:var(--text); font-weight:500">{pl.nama}</td>
                <td style="padding:.35rem .5rem; color:var(--text-dim); font-size:.78rem; text-transform:capitalize" class="hidden sm:table-cell">{pl.tipe}</td>
                <td style="padding:.35rem .5rem; text-align:right; color:var(--text-dim)" class="hidden sm:table-cell">{pl.jumlah_transaksi}x</td>
                <td style="padding:.35rem .75rem; text-align:right; color:var(--text); font-weight:600">Rp {fmt(pl.total_omset)}</td>
                <td style="padding:.35rem .75rem; text-align:right; color:var(--text-dim)">{pl.pct_omset.toFixed(1)}%</td>
              </tr>
            {/each}
            <tr style="border-top:2px solid var(--border); background:var(--surface2)">
              <td colspan="4" style="padding:.4rem .75rem; font-weight:700; color:var(--text)">TOTAL</td>
              <td style="padding:.4rem .75rem; text-align:right; font-weight:700; color:var(--accent)">Rp {fmt(tp.total_omset)}</td>
              <td style="padding:.4rem .75rem; text-align:right; font-weight:700; color:var(--text-dim)">100%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style="font-size:.72rem; color:var(--text-dim); margin-top:.6rem">* Hanya pelanggan yang terdaftar di sistem. Transaksi walk-in tidak termasuk.</p>
    {/if}
  </div>
{/if}
