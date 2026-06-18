<script lang="ts">
  import type { createLaporanStore } from '../laporan.store.svelte'
  import { fmt, tglFmt } from '../laporan.logic'
  import DatePicker2 from '$lib/components/ui/DatePicker2.svelte'

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

{#if store.aging}
  {@const aging = store.aging}
  <div style="padding:0 1.25rem 2rem; max-width:760px">
    <div style="text-align:center; margin-bottom:1.25rem">
      <div style="font-size:1rem; font-weight:700; color:var(--text)">LAPORAN AGING</div>
      <div style="font-size:.8rem; color:var(--text-dim)">Per {tglFmt(aging.per_tanggal)}</div>
    </div>

    {#each [
      { title: 'Piutang Pelanggan', buckets: aging.piutang, total: aging.total_piutang, prefix: 'p' },
      { title: 'Hutang Supplier', buckets: aging.hutang, total: aging.total_hutang, prefix: 'h' },
    ] as section (section.prefix)}
      <div style="margin-bottom:1.75rem">
        <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.75rem; padding-bottom:.35rem; border-bottom:1px solid var(--border)">
          {section.title} — Total Rp {fmt(section.total)}
        </div>

        {#each section.buckets as bucket, i (bucket.label)}
          {@const key = `${section.prefix}_${i}`}
          {@const warna = i === 0 ? 'var(--accent)' : i === 1 ? 'var(--warn)' : 'var(--danger)'}
          {#if bucket.jumlah > 0}
            <div style="margin-bottom:.5rem; border:1px solid var(--border); border-radius:6px; overflow:hidden; background:var(--surface)">
              <button
                onclick={() => store.toggleAgingExpanded(key)}
                style="width:100%; display:flex; justify-content:space-between; align-items:center; padding:.6rem .85rem; background:none; border:none; cursor:pointer; text-align:left"
              >
                <div style="display:flex; align-items:center; gap:.6rem">
                  <span style="width:8px; height:8px; border-radius:50%; background:{warna}; display:inline-block; flex-shrink:0"></span>
                  <span style="font-size:.85rem; font-weight:600; color:var(--text)">{bucket.label}</span>
                  <span style="font-size:.75rem; color:var(--text-dim)">{bucket.jumlah} item</span>
                </div>
                <div style="display:flex; align-items:center; gap:.75rem">
                  <span style="font-size:.9rem; font-weight:700; color:{warna}">Rp {fmt(bucket.total)}</span>
                  <span style="font-size:.8rem; color:var(--text-dim)">{store.agingExpanded[key] ? '▲' : '▼'}</span>
                </div>
              </button>

              {#if store.agingExpanded[key]}
                <div style="border-top:1px solid var(--border)">
                  <table style="width:100%; font-size:.78rem; border-collapse:collapse">
                    <thead>
                      <tr style="background:var(--surface2)">
                        <th style="padding:.4rem .85rem; text-align:left; color:var(--text-dim); font-weight:600">Nama</th>
                        <th style="padding:.4rem .5rem; text-align:right; color:var(--text-dim); font-weight:600">Jatuh Tempo</th>
                        <th style="padding:.4rem .5rem; text-align:right; color:var(--text-dim); font-weight:600">Hari</th>
                        <th style="padding:.4rem .85rem; text-align:right; color:var(--text-dim); font-weight:600">Sisa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each bucket.items as item, j (j)}
                        <tr style="border-top:1px solid var(--border)">
                          <td style="padding:.35rem .85rem; color:var(--text)">{item.nama}</td>
                          <td style="padding:.35rem .5rem; text-align:right; color:var(--text-dim); font-family:monospace">{item.jatuh_tempo || '—'}</td>
                          <td style="padding:.35rem .5rem; text-align:right; color:{item.hari > 0 ? warna : 'var(--text-dim)'}; font-family:monospace">
                            {item.hari < 0 ? `${Math.abs(item.hari)}h lagi` : item.hari === 0 ? 'Hari ini' : `${item.hari}h`}
                          </td>
                          <td style="padding:.35rem .85rem; text-align:right; color:var(--text); font-weight:600">Rp {fmt(item.sisa)}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {/if}
            </div>
          {:else}
            <div style="display:flex; justify-content:space-between; align-items:center; padding:.45rem .85rem; border-radius:4px; margin-bottom:.35rem; background:var(--surface)">
              <div style="display:flex; align-items:center; gap:.6rem">
                <span style="width:8px; height:8px; border-radius:50%; background:var(--border); display:inline-block"></span>
                <span style="font-size:.82rem; color:var(--text-dim)">{bucket.label}</span>
              </div>
              <span style="font-size:.78rem; color:var(--text-dim)">Nihil</span>
            </div>
          {/if}
        {/each}
      </div>
    {/each}

    <button
      onclick={() => store.muatAging()}
      style="font-size:.75rem; padding:.35rem .75rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text-dim); cursor:pointer; font-family:inherit"
    >Refresh Data</button>
  </div>
{/if}
