<script lang="ts">
  import { createBudgetStore } from '../budget/budget.store.svelte.js'
  import {
    rupiah, pctRealisasi, statusPenjualan, statusPengeluaran,
    warnaDariStatus, labelStatus, bulanSebelumnya, bulanBerikutnya, labelBulan, bulanIni,
  } from '../budget/budget.logic.js'
  import { KATEGORI_LABEL, SEMUA_KATEGORI } from '../budget/budget.types.js'
  import type { StatusMetrik } from '../budget/budget.types.js'

  const budgetStore = createBudgetStore()
  let budgetTabAktif = $state<'periode' | 'histori'>('periode')
  const periodeIni = bulanIni()

  let init = false
  $effect(() => {
    if (init) return
    init = true
    Promise.all([budgetStore.muatPeriode(periodeIni), budgetStore.muatHistori()])
  })

  async function navigasiBulan(arah: 'prev' | 'next') {
    const p = arah === 'prev' ? bulanSebelumnya(budgetStore.periode) : bulanBerikutnya(budgetStore.periode)
    await budgetStore.muatPeriode(p)
  }

  const budgetMap = $derived(
    Object.fromEntries((budgetStore.data?.budgets ?? []).map(b => [b.kategori, b.nilai_budget]))
  )
  const pctOmzet = $derived(
    pctRealisasi(budgetStore.realisasi?.realisasi_omzet ?? 0, budgetStore.data?.target?.target_omzet ?? 0)
  )
  const pctTransaksi = $derived(
    pctRealisasi(budgetStore.realisasi?.realisasi_transaksi ?? 0, budgetStore.data?.target?.target_transaksi ?? 0)
  )
  const pctMargin = $derived(
    pctRealisasi(budgetStore.realisasi?.realisasi_margin_pct ?? 0, budgetStore.data?.target?.target_margin_pct ?? 0)
  )
  const adaTarget = $derived(budgetStore.data?.target != null)
  const statusOmzet = $derived(statusPenjualan(pctOmzet, adaTarget))
  const statusTransaksi = $derived(statusPenjualan(pctTransaksi, adaTarget))
  const statusMargin = $derived(
    statusPenjualan(pctMargin, adaTarget && (budgetStore.data?.target?.target_margin_pct ?? 0) > 0)
  )
  const proyeksiPct = $derived(
    budgetStore.proyeksi && budgetStore.data?.target?.target_omzet
      ? pctRealisasi(budgetStore.proyeksi.proyeksi_omzet, budgetStore.data.target.target_omzet)
      : 0
  )
</script>

<!-- Navigasi Bulan -->
<div style="display:flex; align-items:center; gap:.5rem; margin-bottom:1rem; flex-wrap:wrap">
  <button
    onclick={() => navigasiBulan('prev')}
    style="padding:.3rem .6rem; border:1px solid var(--border); border-radius:4px; background:var(--surface); color:var(--text-dim); font-family:inherit; font-size:.85rem; cursor:pointer"
  >←</button>
  <span style="font-size:.85rem; font-weight:600; color:var(--text); min-width:130px; text-align:center">
    {labelBulan(budgetStore.periode)}
  </span>
  <button
    onclick={() => navigasiBulan('next')}
    disabled={budgetStore.periode >= periodeIni}
    style="padding:.3rem .6rem; border:1px solid var(--border); border-radius:4px; background:var(--surface); color:var(--text-dim); font-family:inherit; font-size:.85rem; cursor:pointer; opacity:{budgetStore.periode >= periodeIni ? .4 : 1}"
  >→</button>
  {#if budgetStore.periode !== periodeIni}
    <button
      onclick={() => budgetStore.muatPeriode(periodeIni)}
      style="padding:.3rem .6rem; border:1px solid var(--accent); border-radius:4px; color:var(--accent); font-family:inherit; font-size:.75rem; background:none; cursor:pointer"
    >Bulan Ini</button>
  {/if}
</div>

<!-- Sub-tab -->
<div style="display:flex; gap:.5rem; border-bottom:1px solid var(--border); margin-bottom:1rem">
  {#each ([['periode','Periode Ini'],['histori','6 Bulan Terakhir']] as const) as [key, label] (key)}
    <button
      onclick={() => budgetTabAktif = key}
      style="padding:.5rem 1rem; background:none; border:none; border-bottom:2px solid {budgetTabAktif===key ? 'var(--accent)' : 'transparent'}; color:{budgetTabAktif===key ? 'var(--accent)' : 'var(--text-dim)'}; font-family:inherit; font-size:.8rem; font-weight:600; cursor:pointer; white-space:nowrap"
    >{label}</button>
  {/each}
</div>

{#if budgetTabAktif === 'periode'}

  <!-- Target Penjualan -->
  <div style="margin-bottom:1rem">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:.5rem; flex-wrap:wrap; gap:.5rem">
      <span style="font-size:.72rem; color:var(--text-dim); font-weight:600; text-transform:uppercase; letter-spacing:.05em">Target Penjualan</span>
      <div style="display:flex; gap:.5rem">
        {#if !adaTarget && budgetStore.histori.length > 1}
          <button
            onclick={() => budgetStore.salinBulan(bulanSebelumnya(budgetStore.periode))}
            style="padding:.25rem .6rem; border:1px solid var(--info); border-radius:3px; color:var(--info); font-family:inherit; font-size:.72rem; background:none; cursor:pointer"
          >Salin bulan lalu</button>
        {/if}
        <button
          onclick={() => budgetStore.bukaEditTarget()}
          style="padding:.25rem .6rem; border:1px solid var(--accent); border-radius:3px; color:var(--accent); font-family:inherit; font-size:.72rem; background:none; cursor:pointer"
        >{adaTarget ? 'Edit Target' : '+ Set Target'}</button>
      </div>
    </div>
    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:.6rem">
      {@render kartuTarget('Omzet',
        rupiah(budgetStore.realisasi?.realisasi_omzet ?? 0),
        adaTarget ? rupiah(budgetStore.data!.target!.target_omzet) : null,
        pctOmzet, statusOmzet)}
      {@render kartuTarget('Transaksi',
        String(budgetStore.realisasi?.realisasi_transaksi ?? 0),
        adaTarget ? String(budgetStore.data!.target!.target_transaksi) : null,
        pctTransaksi, statusTransaksi)}
      {@render kartuTarget('Margin Kotor',
        `${(budgetStore.realisasi?.realisasi_margin_pct ?? 0).toFixed(1)}%`,
        (adaTarget && (budgetStore.data?.target?.target_margin_pct ?? 0) > 0)
          ? `${budgetStore.data!.target!.target_margin_pct}%` : null,
        pctMargin, statusMargin)}
    </div>
  </div>

  <!-- Form Edit Target -->
  {#if budgetStore.editTarget}
    <div style="border:1px solid var(--accent); border-radius:6px; padding:1rem; background:var(--surface); margin-bottom:1rem">
      <div style="font-size:.8rem; font-weight:600; color:var(--accent); margin-bottom:.75rem">
        Set Target — {labelBulan(budgetStore.periode)}
      </div>
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:.75rem; margin-bottom:.75rem">
        <div>
          <div style="font-size:.72rem; color:var(--text-dim); margin-bottom:.25rem">Target Omzet (Rp)</div>
          <input type="number" min="0" bind:value={budgetStore.draftOmzet}
            placeholder="0"
            class="input input-bordered w-full text-sm" />
        </div>
        <div>
          <div style="font-size:.72rem; color:var(--text-dim); margin-bottom:.25rem">Target Transaksi</div>
          <input type="number" min="0" bind:value={budgetStore.draftTransaksi}
            placeholder="0"
            class="input input-bordered w-full text-sm" />
        </div>
        <div>
          <div style="font-size:.72rem; color:var(--text-dim); margin-bottom:.25rem">Target Margin (%)</div>
          <input type="number" min="0" max="100" step="0.5" bind:value={budgetStore.draftMargin}
            placeholder="0"
            class="input input-bordered w-full text-sm" />
        </div>
      </div>
      <div style="display:flex; gap:.5rem; justify-content:flex-end">
        <button onclick={() => budgetStore.tutupEditTarget()}
          style="padding:.35rem .75rem; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.8rem; background:none; cursor:pointer">Batal</button>
        <button onclick={() => budgetStore.simpanTarget()}
          style="padding:.35rem .75rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer">Simpan</button>
      </div>
    </div>
  {/if}

  <!-- Proyeksi Akhir Bulan -->
  {#if budgetStore.proyeksi && budgetStore.data?.target}
    <div style="border:1px solid var(--border); border-radius:6px; padding:.75rem 1rem; background:var(--surface); display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:1rem; flex-wrap:wrap">
      <div>
        <div style="font-size:.68rem; color:var(--text-dim); font-weight:600; text-transform:uppercase">Proyeksi Akhir Bulan</div>
        <div style="font-size:1rem; font-weight:700; color:var(--info); margin-top:.2rem">
          {rupiah(budgetStore.proyeksi.proyeksi_omzet)}
        </div>
        <div style="font-size:.72rem; color:var(--text-dim); margin-top:.15rem">
          Hari ke-{budgetStore.proyeksi.hari_sekarang} / {budgetStore.proyeksi.hari_dalam_bulan}
          {#if budgetStore.proyeksi.hari_sekarang > 0}
            · {rupiah(Math.round(budgetStore.proyeksi.omzet_saat_ini / budgetStore.proyeksi.hari_sekarang))}/hari
          {/if}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:1.5rem; font-weight:700; color:{warnaDariStatus(statusPenjualan(proyeksiPct, true))}">{proyeksiPct}%</div>
        <div style="font-size:.7rem; color:var(--text-dim)">dari target</div>
      </div>
    </div>
  {/if}

  <!-- Budget Operasional -->
  <div style="font-size:.72rem; color:var(--text-dim); font-weight:600; text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem">Budget Operasional</div>
  <div style="overflow-x:auto">
    <table style="width:100%; border-collapse:collapse; font-size:.82rem">
      <thead>
        <tr style="border-bottom:1px solid var(--border)">
          {#each ['Kategori','Budget','Realisasi','Sisa','Status',''] as h, i (i)}
            <th style="padding:.5rem .6rem; text-align:{i > 0 && i < 5 ? 'right' : 'left'}; color:var(--text-dim); font-weight:600; font-size:.72rem; white-space:nowrap">{h}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each SEMUA_KATEGORI as kat (kat)}
          {@const bgt = budgetMap[kat] ?? 0}
          {@const real = budgetStore.realisasi?.realisasi_budget[kat] ?? 0}
          {@const sisa = bgt - real}
          {@const st = statusPengeluaran(real, bgt)}
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:.55rem .6rem; color:var(--text)">{KATEGORI_LABEL[kat]}</td>
            <td style="padding:.55rem .6rem; text-align:right; color:{bgt > 0 ? 'var(--text)' : 'var(--text-dim)'}">{bgt > 0 ? rupiah(bgt) : '—'}</td>
            <td style="padding:.55rem .6rem; text-align:right; color:{real > 0 ? 'var(--text)' : 'var(--text-dim)'}">{real > 0 ? rupiah(real) : '—'}</td>
            <td style="padding:.55rem .6rem; text-align:right; color:{bgt > 0 ? (sisa < 0 ? 'var(--danger)' : 'var(--text)') : 'var(--text-dim)'}">{bgt > 0 ? rupiah(sisa) : '—'}</td>
            <td style="padding:.55rem .6rem">
              {#if st !== 'kosong'}
                <span style="font-size:.7rem; font-weight:700; color:{warnaDariStatus(st)}; border:1px solid {warnaDariStatus(st)}; padding:.1rem .4rem; border-radius:3px">{labelStatus(st)}</span>
              {:else}
                <span style="color:var(--text-dim)">—</span>
              {/if}
            </td>
            <td style="padding:.55rem .4rem">
              <button
                onclick={() => budgetStore.bukaEditBudget(kat)}
                style="padding:.2rem .5rem; border:1px solid var(--border); border-radius:3px; color:var(--text-dim); font-family:inherit; font-size:.72rem; background:none; cursor:pointer"
              >Edit</button>
            </td>
          </tr>
          {#if budgetStore.editBudgetKategori === kat}
            <tr style="background:var(--surface2)">
              <td colspan="6" style="padding:.6rem .8rem">
                <div style="display:flex; flex-wrap:wrap; align-items:center; gap:.5rem">
                  <span style="font-size:.75rem; color:var(--accent); flex-shrink:0">{KATEGORI_LABEL[kat]}</span>
                  <input type="number" min="0" bind:value={budgetStore.draftBudget}
                    placeholder="Budget (Rp)"
                    class="input input-bordered input-accent w-[9rem] text-sm" />
                  <input type="text" bind:value={budgetStore.draftBudgetCatatan}
                    placeholder="Catatan (opsional)"
                    class="input input-bordered flex-1 min-w-0 text-sm" />
                  <button onclick={() => budgetStore.simpanBudget()}
                    style="padding:.35rem .75rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer; flex-shrink:0">Simpan</button>
                  <button onclick={() => budgetStore.tutupEditBudget()}
                    style="padding:.35rem .6rem; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.8rem; background:none; cursor:pointer; flex-shrink:0">Batal</button>
                </div>
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  </div>

{:else}

  <!-- Histori 6 Bulan -->
  <div style="font-size:.72rem; color:var(--text-dim); font-weight:600; text-transform:uppercase; letter-spacing:.05em; margin-bottom:.75rem">6 Bulan Terakhir</div>
  <div style="overflow-x:auto">
    <table style="width:100%; border-collapse:collapse; font-size:.82rem">
      <thead>
        <tr style="border-bottom:1px solid var(--border)">
          {#each ['Bulan','Target Omzet','Realisasi','Capaian','Transaksi',''] as h, i (i)}
            <th style="padding:.5rem .6rem; text-align:{i > 0 && i < 5 ? 'right' : 'left'}; color:var(--text-dim); font-weight:600; font-size:.72rem; white-space:nowrap">{h}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each budgetStore.histori as h (h.periode)}
          {@const pct = h.target ? pctRealisasi(h.realisasi.omzet, h.target.target_omzet) : 0}
          {@const st = statusPenjualan(pct, h.target !== null)}
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:.55rem .6rem; color:var(--text)">
              {labelBulan(h.periode)}
              {#if h.periode === periodeIni}
                <span style="font-size:.68rem; color:var(--accent); margin-left:.3rem">← ini</span>
              {/if}
            </td>
            <td style="padding:.55rem .6rem; text-align:right; color:{h.target ? 'var(--text)' : 'var(--text-dim)'}">
              {h.target ? rupiah(h.target.target_omzet) : '—'}
            </td>
            <td style="padding:.55rem .6rem; text-align:right; color:{h.realisasi.omzet > 0 ? 'var(--text)' : 'var(--text-dim)'}">
              {h.realisasi.omzet > 0 ? rupiah(h.realisasi.omzet) : '—'}
            </td>
            <td style="padding:.55rem .6rem; text-align:right; font-weight:700; color:{warnaDariStatus(st)}">
              {h.target ? `${pct}%` : '—'}
            </td>
            <td style="padding:.55rem .6rem; text-align:right; color:var(--text)">{h.realisasi.transaksi}</td>
            <td style="padding:.55rem .4rem">
              <button
                onclick={() => { budgetStore.muatPeriode(h.periode); budgetTabAktif = 'periode' }}
                style="padding:.2rem .5rem; border:1px solid var(--info); border-radius:3px; color:var(--info); font-family:inherit; font-size:.72rem; background:none; cursor:pointer"
              >Buka</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

{/if}

{#snippet kartuTarget(label: string, nilai: string, target: string | null, pct: number, status: StatusMetrik)}
  <div style="border:1px solid var(--border); border-radius:6px; padding:.75rem .9rem; background:var(--surface)">
    <div style="font-size:.68rem; color:var(--text-dim); font-weight:600; text-transform:uppercase; margin-bottom:.4rem">{label}</div>
    <div style="font-size:1.05rem; font-weight:700; color:var(--text); margin-bottom:.4rem">{nilai}</div>
    <div style="display:flex; align-items:center; justify-content:space-between; gap:.5rem">
      {#if target}
        <span style="font-size:.72rem; color:var(--text-dim)">Target: {target}</span>
        <span style="font-size:.8rem; font-weight:700; color:{warnaDariStatus(status)}">{pct}%</span>
      {:else}
        <span style="font-size:.72rem; color:var(--text-dim)">Belum ada target</span>
      {/if}
    </div>
    {#if target}
      <div style="height:5px; border-radius:3px; background:var(--surface2); margin-top:.4rem; overflow:hidden">
        <div style="height:100%; border-radius:3px; width:{Math.min(pct, 100)}%; background:{warnaDariStatus(status)}"></div>
      </div>
    {/if}
  </div>
{/snippet}
