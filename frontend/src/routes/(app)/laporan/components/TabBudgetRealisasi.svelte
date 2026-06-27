<script lang="ts">
  import type { createLaporanStore } from '../laporan.store.svelte'
  import { fmt, NAMA_BUDGET } from '../laporan.logic'
  import ChartKartu from '$lib/components/chart/ChartKartu.svelte'
  import ChartBatang from '$lib/components/chart/ChartBatang.svelte'

  let { store }: { store: ReturnType<typeof createLaporanStore> } = $props()
</script>

<!-- Filter Budget -->
<div style="display:flex; gap:.75rem; align-items:center; margin-bottom:1rem; flex-wrap:wrap">
  <div style="display:flex; gap:.4rem; align-items:center">
    <label for="br-bulan" style="font-size:.75rem; color:var(--text-dim)">Bulan</label>
    <input id="br-bulan" type="month" bind:value={store.periodeBR}
      style="padding:.35rem .6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.82rem" />
  </div>
  <button
    onclick={() => store.muatBudgetRealisasi()}
    style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
  >Tampilkan</button>
  {#each [
    { label: 'Bulan ini', fn: () => { store.periodeBR = store.bulanIniStr(); store.muatBudgetRealisasi() } },
    { label: 'Bulan lalu', fn: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); store.periodeBR = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; store.muatBudgetRealisasi() } },
  ] as s (s.label)}
    <button
      onclick={s.fn}
      style="padding:.25rem .6rem; background:transparent; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.72rem; cursor:pointer"
    >{s.label}</button>
  {/each}
</div>

{#await store.budgetRealisasiPromise}
	<div style="display:flex; flex-direction:column; gap:.75rem; padding:1.25rem">
		<div style="height:.75rem; border-radius:4px; background:var(--surface2); width:70%"></div>
		<div style="height:.75rem; border-radius:4px; background:var(--surface2); width:45%"></div>
		<div style="height:.75rem; border-radius:4px; background:var(--surface2); width:58%"></div>
		<div style="height:.75rem; border-radius:4px; background:var(--surface2); width:30%"></div>
		<div style="height:.75rem; border-radius:4px; background:var(--surface2); width:65%"></div>
	</div>
{:then}
<ChartKartu kosong={!store.budgetRealisasi} pesanKosong="Pilih bulan lalu klik Tampilkan.">
{#if store.budgetRealisasi}
  {@const br = store.budgetRealisasi}
  <div style="max-width:680px">
    <div style="text-align:center; margin-bottom:1.5rem">
      <div style="font-size:1rem; font-weight:700; color:var(--text)">REALISASI BUDGET VS AKTUAL</div>
      <div style="font-size:.8rem; color:var(--text-dim)">Periode {br.periode}</div>
    </div>

    {#if !br.target}
      <div style="padding:.6rem .9rem; background:rgba(255,200,0,.1); border:1px solid var(--warn); border-radius:4px; color:var(--warn); font-size:.8rem; margin-bottom:1.25rem">
        Belum ada target yang diset untuk bulan ini. Atur target di menu Keuangan → Budget & Target.
      </div>
    {/if}

    <!-- Ringkasan Penjualan -->
    <div style="margin-bottom:1.5rem">
      <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem; padding-bottom:.3rem; border-bottom:1px solid var(--border)">
        Penjualan
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:.84rem">
        <thead>
          <tr style="background:var(--surface2)">
            <th style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600">Metrik</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Target</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Realisasi</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">%</th>
          </tr>
        </thead>
        <tbody>
          {#each [
            { label: 'Omzet', target: br.target?.target_omzet ?? null, real: br.realisasi.realisasi_omzet, isRp: true, higher: true },
            { label: 'Transaksi', target: br.target?.target_transaksi ?? null, real: br.realisasi.realisasi_transaksi, isRp: false, higher: true },
            { label: 'Margin %', target: br.target?.target_margin_pct ?? null, real: br.realisasi.realisasi_margin_pct, isRp: false, higher: true, isPct: true },
          ] as row (row.label)}
            {@const pct = row.target && row.target > 0 ? (row.real / row.target) * 100 : null}
            {@const ok = pct !== null ? (row.higher ? pct >= 90 : pct <= 110) : null}
            <tr style="border-top:1px solid var(--border)">
              <td style="padding:.4rem .75rem; color:var(--text)">{row.label}</td>
              <td style="padding:.4rem .75rem; text-align:right; color:var(--text-dim)">
                {#if row.target !== null}
                  {#if row.isPct}{row.target.toFixed(1)}%{:else if row.isRp}Rp {fmt(row.target)}{:else}{fmt(row.target)}{/if}
                {:else}—{/if}
              </td>
              <td style="padding:.4rem .75rem; text-align:right; color:var(--text); font-weight:600">
                {#if row.isPct}{row.real.toFixed(1)}%{:else if row.isRp}Rp {fmt(row.real)}{:else}{fmt(row.real)}{/if}
              </td>
              <td style="padding:.4rem .75rem; text-align:right; font-weight:700; color:{ok === null ? 'var(--text-dim)' : ok ? 'var(--accent)' : 'var(--danger)'}">
                {pct !== null ? `${pct.toFixed(0)}%` : '—'}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Chart omzet target vs realisasi -->
    {#if br.target}
      {@const omzetData = [
        { label: 'Target', nilai: br.target.target_omzet ?? 0 },
        { label: 'Realisasi', nilai: br.realisasi.realisasi_omzet }
      ]}
      <div style="margin-bottom:1.5rem">
        <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.75rem">Target vs Realisasi Omzet</div>
        <ChartBatang data={omzetData} x="label" y="nilai" formatNilai={(v) => `Rp ${fmt(v)}`} tinggi={140} />
      </div>
    {/if}

    <!-- Biaya Operasional -->
    <div style="margin-bottom:1.25rem">
      <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem; padding-bottom:.3rem; border-bottom:1px solid var(--border)">
        Biaya Operasional
      </div>
      {#if br.budgets.length === 0}
        <p style="font-size:.82rem; color:var(--text-dim)">Belum ada budget operasional yang diset untuk bulan ini.</p>
      {:else}
        <table style="width:100%; border-collapse:collapse; font-size:.84rem">
          <thead>
            <tr style="background:var(--surface2)">
              <th style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600">Kategori</th>
              <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Budget</th>
              <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Realisasi</th>
              <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Selisih</th>
            </tr>
          </thead>
          <tbody>
            {#each br.budgets as b (b.kategori)}
              {@const real = br.realisasi.realisasi_budget[b.kategori] ?? 0}
              {@const selisih = b.nilai_budget - real}
              <tr style="border-top:1px solid var(--border)">
                <td style="padding:.4rem .75rem; color:var(--text)">{NAMA_BUDGET[b.kategori] ?? b.kategori}</td>
                <td style="padding:.4rem .75rem; text-align:right; color:var(--text-dim)">Rp {fmt(b.nilai_budget)}</td>
                <td style="padding:.4rem .75rem; text-align:right; color:var(--text)">Rp {fmt(real)}</td>
                <td style="padding:.4rem .75rem; text-align:right; font-weight:600; color:{selisih >= 0 ? 'var(--accent)' : 'var(--danger)'}">
                  {selisih >= 0 ? '+' : ''}Rp {fmt(selisih)}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>

    <!-- Chart budget vs realisasi biaya -->
    {#if br.budgets.length > 0}
      {@const budgetBarData = br.budgets.map((b) => ({ kategori: NAMA_BUDGET[b.kategori] ?? b.kategori, nilai: b.nilai_budget }))}
      {@const realisasiBarData = br.budgets.map((b) => ({ kategori: NAMA_BUDGET[b.kategori] ?? b.kategori, nilai: br.realisasi.realisasi_budget[b.kategori] ?? 0 }))}
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-top:.5rem">
        <div>
          <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.75rem">Budget Biaya</div>
          <ChartBatang data={budgetBarData} x="kategori" y="nilai" formatNilai={(v) => `Rp ${fmt(v)}`} tinggi={140} />
        </div>
        <div>
          <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.75rem">Realisasi Biaya</div>
          <ChartBatang data={realisasiBarData} x="kategori" y="nilai" formatNilai={(v) => `Rp ${fmt(v)}`} tinggi={140} warna="var(--info)" />
        </div>
      </div>
    {/if}
  </div>
{/if}
</ChartKartu>
{/await}
