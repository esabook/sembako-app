<script lang="ts">
  import type { createLaporanStore } from '../laporan.store.svelte'
  import { fmt, tglFmt } from '../laporan.logic'
  import DatePicker2 from '$lib/components/ui/DatePicker2.svelte'
  import ChartKartu from '$lib/components/chart/ChartKartu.svelte'

  let { store }: { store: ReturnType<typeof createLaporanStore> } = $props()
</script>

<!-- Filter Neraca & Aging -->
<div style="display:flex; gap:.75rem; align-items:center; margin-bottom:1rem; flex-wrap:wrap">
  <DatePicker2 label="Per Tanggal" bind:value={store.neracaTanggal} />
  <button
    onclick={() => store.muatNeraca()}
    style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
  >Tampilkan</button>
  {#each [
    { label: 'Hari ini', fn: () => { store.neracaTanggal = new Date().toLocaleDateString('sv-SE'); store.muatNeraca() } },
    { label: 'Akhir bulan lalu', fn: () => { const d = new Date(); d.setDate(0); store.neracaTanggal = d.toLocaleDateString('sv-SE'); store.muatNeraca() } },
  ] as s (s.label)}
    <button
      onclick={s.fn}
      style="padding:.25rem .6rem; background:transparent; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.72rem; cursor:pointer"
    >{s.label}</button>
  {/each}
  <span style="font-size:.72rem; color:var(--text-dim)">* nilai persediaan stok = kondisi saat ini</span>
</div>

<ChartKartu kosong={!store.neraca} pesanKosong="Pilih tanggal lalu klik Tampilkan.">
{#if store.neraca}
  {@const neraca = store.neraca}
  <div style="max-width:680px">
    <div style="text-align:center; margin-bottom:1.5rem">
      <div style="font-size:1rem; font-weight:700; color:var(--text)">NERACA</div>
      <div style="font-size:.8rem; color:var(--text-dim)">Per tanggal {tglFmt(neraca.per_tanggal)}</div>
      {#if !neraca.check.balanced}
        <div style="font-size:.72rem; color:var(--danger); margin-top:.25rem">⚠ Neraca tidak balance — periksa data</div>
      {/if}
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem">
      <!-- ASET -->
      <div>
        <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem; padding-bottom:.3rem; border-bottom:1px solid var(--border)">
          Aset
        </div>

        <div style="font-size:.75rem; color:var(--text-dim); margin:.5rem 0 .25rem; font-weight:600">Kas & Bank</div>
        {#each neraca.aset.kas_bank as akun (akun.id)}
          <div style="display:flex; justify-content:space-between; font-size:.82rem; padding:.2rem 0; color:var(--text-dim)">
            <span>{akun.nama}</span>
            <span>Rp {fmt(akun.saldo)}</span>
          </div>
        {/each}
        <div style="display:flex; justify-content:space-between; font-size:.82rem; padding:.3rem 0; color:var(--text); font-weight:600; border-top:1px solid var(--border); margin-top:.2rem">
          <span>Subtotal Kas</span>
          <span>Rp {fmt(neraca.aset.total_kas_bank)}</span>
        </div>

        <div style="margin-top:.75rem">
          <div style="display:flex; justify-content:space-between; font-size:.82rem; padding:.2rem 0; color:var(--text-dim)">
            <span>Piutang Pelanggan</span>
            <span>Rp {fmt(neraca.aset.piutang_pelanggan)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:.82rem; padding:.2rem 0; color:var(--text-dim)">
            <span>Nilai Persediaan</span>
            <span>Rp {fmt(neraca.aset.nilai_persediaan)}</span>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; font-size:.9rem; font-weight:700; padding:.5rem 0; color:var(--accent); border-top:2px solid var(--border); margin-top:.5rem">
          <span>TOTAL ASET</span>
          <span>Rp {fmt(neraca.aset.total)}</span>
        </div>
      </div>

      <!-- LIABILITAS & MODAL -->
      <div>
        <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem; padding-bottom:.3rem; border-bottom:1px solid var(--border)">
          Liabilitas
        </div>
        <div style="display:flex; justify-content:space-between; font-size:.82rem; padding:.2rem 0; color:var(--text-dim)">
          <span>Hutang Supplier</span>
          <span>Rp {fmt(neraca.liabilitas.hutang_supplier)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:.9rem; font-weight:700; padding:.5rem 0; color:var(--danger); border-top:2px solid var(--border); margin-top:.5rem">
          <span>TOTAL LIABILITAS</span>
          <span>Rp {fmt(neraca.liabilitas.total)}</span>
        </div>

        <div style="margin-top:1.25rem">
          <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem; padding-bottom:.3rem; border-bottom:1px solid var(--border)">
            Modal
          </div>
          <div style="display:flex; justify-content:space-between; font-size:.9rem; font-weight:700; padding:.5rem 0; color:var(--accent); border-top:2px solid var(--border); margin-top:.5rem">
            <span>TOTAL MODAL</span>
            <span>Rp {fmt(neraca.modal.total)}</span>
          </div>
        </div>

        <div style="margin-top:1.25rem; background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:.6rem .75rem">
          <div style="display:flex; justify-content:space-between; font-size:.8rem; color:var(--text-dim)">
            <span>Liabilitas + Modal</span>
            <span>Rp {fmt(neraca.check.liabilitas_plus_modal)}</span>
          </div>
          <div style="font-size:.72rem; color:{neraca.check.balanced ? 'var(--accent)' : 'var(--danger)'}; margin-top:.25rem; font-weight:600">
            {neraca.check.balanced ? '✓ Balance' : '✗ Tidak balance'}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
</ChartKartu>
