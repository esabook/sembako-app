<script lang="ts">
  import type { createLaporanStore } from '../laporan.store.svelte'
  import { fmt, tglFmt } from '../laporan.logic'
  import DateRangePicker2 from '$lib/components/ui/DateRangePicker2.svelte'

  let { store }: { store: ReturnType<typeof createLaporanStore> } = $props()
</script>

<!-- Filter Periode -->
<div style="display:flex; gap:.75rem; align-items:center; margin-bottom:1rem; flex-wrap:wrap">
  <DateRangePicker2 bind:from={store.periode.dari} bind:to={store.periode.sampai} />
  <button
    onclick={() => store.muat('arus-kas')}
    style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
  >Tampilkan</button>
  {#each [
    { label: 'Hari ini', fn: () => { const t = new Date().toLocaleDateString('sv-SE'); store.periode = { dari: t, sampai: t }; store.muat('arus-kas') } },
    { label: 'Minggu ini', fn: () => { const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1); const sun = new Date(mon); sun.setDate(mon.getDate() + 6); store.periode = { dari: mon.toLocaleDateString('sv-SE'), sampai: sun.toLocaleDateString('sv-SE') }; store.muat('arus-kas') } },
    { label: 'Bulan ini', fn: () => { store.periode = store.defaultPeriode(); store.muat('arus-kas') } },
  ] as s (s.label)}
    <button
      onclick={s.fn}
      style="padding:.25rem .6rem; background:transparent; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.72rem; cursor:pointer"
    >{s.label}</button>
  {/each}
</div>

{#if store.arusKas}
  {@const arusKas = store.arusKas}
  <div style="padding:0 1.25rem 2rem; max-width:720px">
    <div style="text-align:center; margin-bottom:1.5rem">
      <div style="font-size:1rem; font-weight:700; color:var(--text)">LAPORAN ARUS KAS</div>
      <div style="font-size:.8rem; color:var(--text-dim)">
        Periode {tglFmt(arusKas.periode.dari)} — {tglFmt(arusKas.periode.sampai)}
      </div>
    </div>

    <!-- Ringkasan saldo -->
    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:.75rem; margin-bottom:1.5rem">
      {#each [
        ['Saldo Awal', arusKas.saldo_awal, 'var(--text)'],
        ['Net Periode', arusKas.net, arusKas.net >= 0 ? 'var(--accent)' : 'var(--danger)'],
        ['Saldo Akhir', arusKas.saldo_akhir, arusKas.saldo_akhir >= 0 ? 'var(--accent)' : 'var(--danger)'],
      ] as [label, val, warna] (label)}
        <div style="background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:.75rem 1rem">
          <div style="font-size:.7rem; color:var(--text-dim); margin-bottom:.25rem">{label}</div>
          <div style="font-size:1rem; font-weight:700; color:{warna}">Rp {fmt(val as number)}</div>
        </div>
      {/each}
    </div>

    <!-- Per akun -->
    <div style="margin-bottom:1.5rem">
      <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem; padding-bottom:.3rem; border-bottom:1px solid var(--border)">
        Per Akun Kas/Bank
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:.83rem">
        <thead>
          <tr>
            {#each ['Akun','Saldo Awal','Masuk','Keluar','Saldo Akhir'] as h (h)}
              <th style="padding:.4rem .5rem; text-align:{h==='Akun'?'left':'right'}; color:var(--text-dim); font-size:.72rem; font-weight:600">{h}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each arusKas.per_akun as akun (akun.id)}
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:.4rem .5rem; color:var(--text)">{akun.nama}</td>
              <td style="padding:.4rem .5rem; text-align:right; color:var(--text-dim)">Rp {fmt(akun.saldo_awal)}</td>
              <td style="padding:.4rem .5rem; text-align:right; color:var(--accent)">+Rp {fmt(akun.masuk)}</td>
              <td style="padding:.4rem .5rem; text-align:right; color:var(--danger)">−Rp {fmt(akun.keluar)}</td>
              <td style="padding:.4rem .5rem; text-align:right; font-weight:700; color:{akun.saldo_akhir >= 0 ? 'var(--accent)' : 'var(--danger)'}">
                Rp {fmt(akun.saldo_akhir)}
              </td>
            </tr>
          {/each}
          <tr style="font-weight:700; border-top:2px solid var(--border)">
            <td style="padding:.5rem .5rem; color:var(--text)">TOTAL</td>
            <td style="padding:.5rem .5rem; text-align:right; color:var(--text-dim)">Rp {fmt(arusKas.saldo_awal)}</td>
            <td style="padding:.5rem .5rem; text-align:right; color:var(--accent)">+Rp {fmt(arusKas.total_masuk)}</td>
            <td style="padding:.5rem .5rem; text-align:right; color:var(--danger)">−Rp {fmt(arusKas.total_keluar)}</td>
            <td style="padding:.5rem .5rem; text-align:right; color:{arusKas.saldo_akhir >= 0 ? 'var(--accent)' : 'var(--danger)'}">
              Rp {fmt(arusKas.saldo_akhir)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Per kategori -->
    {#if Object.keys(arusKas.per_kategori).length > 0}
      <div>
        <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem; padding-bottom:.3rem; border-bottom:1px solid var(--border)">
          Rincian Per Kategori
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:.83rem">
          <thead>
            <tr>
              {#each ['Kategori','Masuk','Keluar'] as h (h)}
                <th style="padding:.35rem .5rem; text-align:{h==='Kategori'?'left':'right'}; color:var(--text-dim); font-size:.72rem; font-weight:600">{h}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each Object.entries(arusKas.per_kategori).sort((a,b) => (b[1].masuk+b[1].keluar)-(a[1].masuk+a[1].keluar)) as [kat, val] (kat)}
              <tr style="border-bottom:1px solid var(--border)">
                <td style="padding:.35rem .5rem; color:var(--text); text-transform:capitalize">{kat.replace(/_/g,' ')}</td>
                <td style="padding:.35rem .5rem; text-align:right; color:{val.masuk>0?'var(--accent)':'var(--text-dim)'}">
                  {val.masuk > 0 ? `+Rp ${fmt(val.masuk)}` : '—'}
                </td>
                <td style="padding:.35rem .5rem; text-align:right; color:{val.keluar>0?'var(--danger)':'var(--text-dim)'}">
                  {val.keluar > 0 ? `−Rp ${fmt(val.keluar)}` : '—'}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    {#if arusKas.total_masuk === 0 && arusKas.total_keluar === 0}
      <p style="color:var(--text-dim); font-size:.85rem; margin-top:1rem">Tidak ada aktivitas kas pada periode ini.</p>
    {/if}
  </div>
{/if}
