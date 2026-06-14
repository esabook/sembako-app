<script lang="ts">
  import type { createLaporanStore } from '../laporan.store.svelte'
  import { fmt, BULAN_LABEL } from '../laporan.logic'

  let { store }: { store: ReturnType<typeof createLaporanStore> } = $props()
</script>

<!-- Filter Penggajian -->
<div style="display:flex; gap:.75rem; align-items:center; margin-bottom:1rem; flex-wrap:wrap">
  <div style="display:flex; gap:.4rem; align-items:center">
    <label for="pg-tahun" style="font-size:.75rem; color:var(--text-dim)">Tahun</label>
    <input id="pg-tahun" type="number" min="2020" max="2099" bind:value={store.tahunPenggajian}
      style="padding:.35rem .6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.82rem; width:5.5rem" />
  </div>
  <button onclick={() => store.muatRekapPenggajian()}
    style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
  >Tampilkan</button>
</div>

{#if store.rekapPenggajian}
  {@const rp = store.rekapPenggajian}
  <div style="padding:0 1.25rem 2rem; max-width:680px">
    <div style="text-align:center; margin-bottom:1.5rem">
      <div style="font-size:1rem; font-weight:700; color:var(--text)">REKAP PENGGAJIAN</div>
      <div style="font-size:.8rem; color:var(--text-dim)">Tahun {rp.tahun} — status approved/dibayar</div>
    </div>
    <div style="margin-bottom:1.5rem; padding:.85rem 1.25rem; background:var(--surface); border:1px solid var(--border); border-radius:6px; display:inline-block">
      <div style="font-size:.72rem; color:var(--text-dim); margin-bottom:.25rem">Total Beban Gaji {rp.tahun}</div>
      <div style="font-size:1.05rem; font-weight:700; color:var(--accent)">Rp {fmt(rp.total_gaji_tahun)}</div>
    </div>
    <div style="overflow-x:auto">
      <table style="width:100%; border-collapse:collapse; font-size:.82rem; min-width:520px">
        <thead>
          <tr style="background:var(--surface2)">
            <th style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600">Bulan</th>
            <th style="padding:.4rem .5rem; text-align:right; color:var(--text-dim); font-weight:600" class="hidden sm:table-cell">Kary.</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600" class="hidden sm:table-cell">Gaji Pokok</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600" class="hidden sm:table-cell">Tunjangan</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600" class="hidden sm:table-cell">Potongan</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Total Gaji</th>
          </tr>
        </thead>
        <tbody>
          {#each rp.bulan as b, i (b.periode_bulan)}
            <tr style="border-top:1px solid var(--border); opacity:{b.total_gaji === 0 ? 0.4 : 1}">
              <td style="padding:.4rem .75rem; color:var(--text)">{BULAN_LABEL[i]}</td>
              <td style="padding:.4rem .5rem; text-align:right; color:var(--text-dim)" class="hidden sm:table-cell">{b.jumlah_karyawan > 0 ? b.jumlah_karyawan : '—'}</td>
              <td style="padding:.4rem .75rem; text-align:right; color:var(--text-dim)" class="hidden sm:table-cell">{b.total_gaji_pokok > 0 ? `Rp ${fmt(b.total_gaji_pokok)}` : '—'}</td>
              <td style="padding:.4rem .75rem; text-align:right; color:var(--text-dim)" class="hidden sm:table-cell">{b.total_tunjangan > 0 ? `Rp ${fmt(b.total_tunjangan)}` : '—'}</td>
              <td style="padding:.4rem .75rem; text-align:right; color:{b.total_potongan > 0 ? 'var(--danger)' : 'var(--text-dim)'}" class="hidden sm:table-cell">{b.total_potongan > 0 ? `(Rp ${fmt(b.total_potongan)})` : '—'}</td>
              <td style="padding:.4rem .75rem; text-align:right; font-weight:{b.total_gaji > 0 ? '600' : '400'}; color:{b.total_gaji > 0 ? 'var(--text)' : 'var(--text-dim)'}">
                {b.total_gaji > 0 ? `Rp ${fmt(b.total_gaji)}` : '—'}
              </td>
            </tr>
          {/each}
          <tr style="border-top:2px solid var(--border); background:var(--surface2)">
            <td colspan="5" style="padding:.45rem .75rem; font-weight:700; color:var(--text)">TOTAL {rp.tahun}</td>
            <td style="padding:.45rem .75rem; text-align:right; font-weight:700; color:var(--accent)">Rp {fmt(rp.total_gaji_tahun)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
{/if}
