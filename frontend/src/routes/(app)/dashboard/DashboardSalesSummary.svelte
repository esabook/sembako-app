<script lang="ts">
  import { rp, rpFull, buildSummaryRows, buildSummaryStats } from './dashboard.logic'
  import type { DashboardData } from './dashboard.types'

  let { data }: { data: DashboardData } = $props()

  let periode = $state<7 | 30>(7)

  const rows  = $derived(buildSummaryRows(data.penjualan_30hari, data.today, periode))
  const stats = $derived(buildSummaryStats(rows))
</script>

<div class="flex flex-col gap-5">

  <div class="flex items-center justify-between">
    <h3 class="text-xs font-bold uppercase tracking-wider" style="color:var(--text-dim)">
      Ringkasan Penjualan {periode} Hari Terakhir
    </h3>
    <div class="flex gap-1">
      {#each [7, 30] as n (n)}
        <button
          onclick={() => { periode = n as 7 | 30 }}
          class="text-xs px-2 py-0.5 rounded border"
          style="{periode === n ? 'background:var(--accent);color:#000;border-color:var(--accent)' : 'background:transparent;color:var(--text-dim);border-color:var(--border)'}"
        >{n}h</button>
      {/each}
    </div>
  </div>

  <!-- Summary cards -->
  <div class="grid gap-3" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
    <div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
      <p class="text-xs mb-1" style="color:var(--text-dim)">TOTAL OMSET</p>
      <p class="text-2xl font-bold" style="color:var(--accent)">{rp(stats.total)}</p>
      <p class="text-xs mt-1" style="color:var(--text-dim)">{rpFull(stats.total)}</p>
    </div>
    <div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
      <p class="text-xs mb-1" style="color:var(--text-dim)">TOTAL TRANSAKSI</p>
      <p class="text-2xl font-bold">{stats.trx}</p>
      <p class="text-xs mt-1" style="color:var(--text-dim)">rata {rp(stats.avgPerTrx)}/trx</p>
    </div>
    <div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
      <p class="text-xs mb-1" style="color:var(--text-dim)">RATA-RATA/HARI</p>
      <p class="text-2xl font-bold" style="color:var(--info)">{rp(stats.avgHarian)}</p>
      <p class="text-xs mt-1" style="color:var(--text-dim)">{rpFull(stats.avgHarian)}</p>
    </div>
    {#if stats.best}
      <div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
        <p class="text-xs mb-1" style="color:var(--text-dim)">HARI TERBAIK</p>
        <p class="text-2xl font-bold" style="color:var(--warn)">{rp(stats.best.total)}</p>
        <p class="text-xs mt-1" style="color:var(--text-dim)">{stats.best.label}</p>
      </div>
    {/if}
  </div>

  <!-- Daily table -->
  <div class="rounded border overflow-hidden" style="background:var(--surface);border-color:var(--border)">
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr style="background:var(--surface2);border-bottom:1px solid var(--border)">
            <th class="text-left px-3 py-2 font-semibold" style="color:var(--text-dim)">Tanggal</th>
            <th class="text-right px-3 py-2 font-semibold" style="color:var(--text-dim)">Omset</th>
            <th class="text-right px-3 py-2 font-semibold" style="color:var(--text-dim)">Trx</th>
            <th class="text-right px-3 py-2 font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Rata/Trx</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row}
            <tr
              class="border-t"
              style="border-color:var(--border);background:{row.isToday ? 'color-mix(in srgb,var(--accent) 6%,transparent)' : 'transparent'}"
            >
              <td class="px-3 py-2" style="color:{row.isToday ? 'var(--accent)' : 'var(--text)'}">
                {row.label}{row.isToday ? ' ★' : ''}
              </td>
              <td class="px-3 py-2 text-right font-mono tabular-nums" style="color:{row.total > 0 ? 'var(--text)' : 'var(--text-dim)'}">
                {row.total > 0 ? rpFull(row.total) : '—'}
              </td>
              <td class="px-3 py-2 text-right tabular-nums" style="color:{row.jumlah_trx > 0 ? 'var(--text)' : 'var(--text-dim)'}">
                {row.jumlah_trx > 0 ? row.jumlah_trx : '—'}
              </td>
              <td class="px-3 py-2 text-right font-mono tabular-nums hidden sm:table-cell" style="color:var(--text-dim)">
                {row.jumlah_trx > 0 ? rp(row.total / row.jumlah_trx) : '—'}
              </td>
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr style="background:var(--surface2);border-top:2px solid var(--border)">
            <td class="px-3 py-2 font-bold" style="color:var(--text)">Total</td>
            <td class="px-3 py-2 text-right font-bold font-mono tabular-nums" style="color:var(--accent)">{rpFull(stats.total)}</td>
            <td class="px-3 py-2 text-right font-bold tabular-nums">{stats.trx}</td>
            <td class="px-3 py-2 text-right font-mono tabular-nums hidden sm:table-cell" style="color:var(--text-dim)">
              {stats.trx > 0 ? rp(stats.total / stats.trx) : '—'}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>

</div>
