<script lang="ts">
  import type { createLaporanStore } from '../laporan.store.svelte'
  import { fmt, BULAN_LABEL, BULAN_SHORT } from '../laporan.logic'
  import ChartKartu from '$lib/components/chart/ChartKartu.svelte'
  import ChartGaris from '$lib/components/chart/ChartGaris.svelte'

  let { store }: { store: ReturnType<typeof createLaporanStore> } = $props()
</script>

<!-- Filter Pajak -->
<div style="display:flex; gap:.75rem; align-items:center; margin-bottom:1rem; flex-wrap:wrap">
  <div style="display:flex; gap:.4rem; align-items:center">
    <label for="pajak-tahun" style="font-size:.75rem; color:var(--text-dim)">Tahun</label>
    <input id="pajak-tahun" type="number" min="2020" max="2099" bind:value={store.tahunPajak}
      placeholder="Cth: 2025"
      class="input input-bordered w-[5.5rem] text-sm" />
  </div>
  <button
    onclick={() => store.muatPajakUmkm()}
    style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
  >Tampilkan</button>
</div>

{#await store.pajakUmkmPromise}
	<div style="display:flex; flex-direction:column; gap:.75rem; padding:1.25rem">
		<div style="height:.75rem; border-radius:4px; background:var(--surface2); width:70%"></div>
		<div style="height:.75rem; border-radius:4px; background:var(--surface2); width:45%"></div>
		<div style="height:.75rem; border-radius:4px; background:var(--surface2); width:58%"></div>
		<div style="height:.75rem; border-radius:4px; background:var(--surface2); width:30%"></div>
		<div style="height:.75rem; border-radius:4px; background:var(--surface2); width:65%"></div>
	</div>
{:then}
<ChartKartu kosong={!store.pajakUmkm} pesanKosong="Pilih tahun lalu klik Tampilkan.">
{#if store.pajakUmkm}
  {@const px = store.pajakUmkm}
  <div style="max-width:560px">
    <div style="text-align:center; margin-bottom:1.5rem">
      <div style="font-size:1rem; font-weight:700; color:var(--text)">LAPORAN PAJAK UMKM</div>
      <div style="font-size:.8rem; color:var(--text-dim)">Tahun {px.tahun} — PPh Final 0.5% (PP 23/2018)</div>
    </div>

    <!-- Ringkasan -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:.75rem; margin-bottom:1.5rem">
      <div style="padding:.85rem 1rem; background:var(--surface); border:1px solid var(--border); border-radius:6px">
        <div style="font-size:.72rem; color:var(--text-dim); margin-bottom:.3rem">Total Omset</div>
        <div style="font-size:.95rem; font-weight:700; color:var(--text)">Rp {fmt(px.total_omset)}</div>
      </div>
      <div style="padding:.85rem 1rem; background:var(--surface); border:1px solid var(--accent); border-radius:6px">
        <div style="font-size:.72rem; color:var(--text-dim); margin-bottom:.3rem">Total Pajak Terutang</div>
        <div style="font-size:.95rem; font-weight:700; color:var(--accent)">Rp {fmt(px.total_pajak)}</div>
      </div>
    </div>

    <!-- Tabel per bulan -->
    <div style="overflow-x:auto">
      <table style="width:100%; border-collapse:collapse; font-size:.84rem; min-width:360px">
        <thead>
          <tr style="background:var(--surface2)">
            <th style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600">Bulan</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Omset</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Pajak (0.5%)</th>
          </tr>
        </thead>
        <tbody>
          {#each px.bulan as b, i (b.periode)}
            <tr style="border-top:1px solid var(--border); opacity:{b.omset === 0 ? 0.45 : 1}">
              <td style="padding:.4rem .75rem; color:var(--text)">{BULAN_LABEL[i]}</td>
              <td style="padding:.4rem .75rem; text-align:right; color:var(--text-dim)">
                {b.omset > 0 ? `Rp ${fmt(b.omset)}` : '—'}
              </td>
              <td style="padding:.4rem .75rem; text-align:right; font-weight:{b.pajak > 0 ? '600' : '400'}; color:{b.pajak > 0 ? 'var(--text)' : 'var(--text-dim)'}">
                {b.pajak > 0 ? `Rp ${fmt(b.pajak)}` : '—'}
              </td>
            </tr>
          {/each}
          <tr style="border-top:2px solid var(--border); background:var(--surface2)">
            <td style="padding:.45rem .75rem; font-weight:700; color:var(--text)">TOTAL</td>
            <td style="padding:.45rem .75rem; text-align:right; font-weight:700; color:var(--text)">Rp {fmt(px.total_omset)}</td>
            <td style="padding:.45rem .75rem; text-align:right; font-weight:700; color:var(--accent)">Rp {fmt(px.total_pajak)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p style="font-size:.72rem; color:var(--text-dim); margin-top:.75rem">
      * Berdasarkan PP 23/2018. Tarif 0.5% dari omset bruto untuk UMKM dengan omset &lt; Rp 4,8 miliar/tahun.
      Konsultasikan dengan akuntan untuk kewajiban pajak yang tepat.
    </p>

    <!-- Chart tren omset -->
    {#if px.bulan.some(b => b.omset > 0)}
      {@const chartData = px.bulan.map((b, i) => ({ bulan: BULAN_SHORT[i], omset: b.omset }))}
      <div style="margin-top:2rem">
        <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.75rem">Tren Omset per Bulan</div>
        <ChartGaris data={chartData} x="bulan" y="omset" formatNilai={(v) => `Rp ${fmt(v)}`} tinggi={180} />
      </div>
    {/if}
  </div>
{/if}
</ChartKartu>
{/await}
