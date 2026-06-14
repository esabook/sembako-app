<script lang="ts">
  import { rupiah as rpFmt } from '../keuangan.logic'
  import type { createKeuanganStore } from '../keuangan.store.svelte'

  let { store }: { store: ReturnType<typeof createKeuanganStore> } = $props()
</script>

<div class="flex flex-wrap gap-2 items-end mb-3">
  <select bind:value={store.piTipeFilter} onchange={() => store.muatPinjaman()}
    class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
    <option value="">Semua Tipe</option>
    <option value="pinjaman">Pinjaman</option>
    <option value="investasi">Investasi</option>
  </select>
  <select bind:value={store.piStatusFilter} onchange={() => store.muatPinjaman()}
    class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
    <option value="">Semua Status</option>
    <option value="aktif">Aktif</option>
    <option value="lunas">Lunas</option>
    <option value="macet">Macet</option>
  </select>
  <button onclick={() => store.bukaPiForm()}
    class="px-3 py-1 rounded text-sm font-bold ml-auto" style="background:var(--accent);color:var(--bg)">+ Tambah</button>
</div>

{#if store.piRows.length === 0}
  <p class="text-sm py-4" style="color:var(--text-dim)">Belum ada data pinjaman/investasi.</p>
{:else}
  <div class="overflow-x-auto rounded border" style="border-color:var(--border)">
    <table class="min-w-full text-sm" style="border-collapse:collapse;min-width:600px">
      <thead>
        <tr style="background:var(--surface2)">
          <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Tipe</th>
          <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Nama</th>
          <th class="px-3 py-2 text-right text-xs font-semibold" style="color:var(--text-dim)">Pokok</th>
          <th class="px-3 py-2 text-right text-xs font-semibold" style="color:var(--text-dim)">Sisa</th>
          <th class="px-3 py-2 text-right text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Cicilan/bln</th>
          <th class="px-3 py-2 text-left text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Jatuh Tempo</th>
          <th class="px-3 py-2 text-center text-xs font-semibold" style="color:var(--text-dim)">Status</th>
          <th class="px-3 py-2"></th>
        </tr>
      </thead>
      <tbody>
        {#each store.piRows as row (row.id)}
          {@const pct = row.jumlah_pokok > 0 ? Math.round((1 - row.sisa_pokok / row.jumlah_pokok) * 100) : 0}
          <tr class="border-t" style="border-color:var(--border)">
            <td class="px-3 py-2">
              <span class="text-xs font-bold px-1.5 py-0.5 rounded"
                style="background:{row.tipe==='pinjaman' ? 'color-mix(in srgb,var(--danger) 15%,transparent)' : 'color-mix(in srgb,var(--accent) 15%,transparent)'};
                       color:{row.tipe==='pinjaman' ? 'var(--danger)' : 'var(--accent)'}">
                {row.tipe === 'pinjaman' ? 'Pinjaman' : 'Investasi'}
              </span>
            </td>
            <td class="px-3 py-2 font-medium">
              <div>{row.nama}</div>
              {#if row.bunga_persen > 0}
                <div class="text-xs" style="color:var(--text-dim)">{row.bunga_persen}% p.a.</div>
              {/if}
            </td>
            <td class="px-3 py-2 text-right font-mono text-xs">{rpFmt(row.jumlah_pokok)}</td>
            <td class="px-3 py-2 text-right font-mono">
              <div class="text-sm font-bold" style="color:{row.sisa_pokok === 0 ? 'var(--accent)' : 'var(--warn)'}">{rpFmt(row.sisa_pokok)}</div>
              <div class="text-xs mt-0.5" style="color:var(--text-dim)">{pct}% lunas</div>
            </td>
            <td class="px-3 py-2 text-right text-xs hidden sm:table-cell" style="color:var(--text-dim)">
              {row.cicilan_per_bulan > 0 ? rpFmt(row.cicilan_per_bulan) : '—'}
            </td>
            <td class="px-3 py-2 text-xs hidden sm:table-cell" style="color:var(--text-dim)">{row.jatuh_tempo ?? '—'}</td>
            <td class="px-3 py-2 text-center">
              <span class="text-xs font-bold"
                style="color:{row.status==='aktif' ? 'var(--warn)' : row.status==='lunas' ? 'var(--accent)' : 'var(--danger)'}">
                {row.status}
              </span>
            </td>
            <td class="px-3 py-2 text-right whitespace-nowrap">
              {#if row.status === 'aktif'}
                <button onclick={() => store.bukaCicilPi(row)}
                  class="text-xs px-2 py-0.5 rounded mr-1" style="background:color-mix(in srgb,var(--accent) 15%,transparent);color:var(--accent)">Cicil</button>
              {/if}
              <button onclick={() => store.bukaPiForm(row)} class="text-xs px-2 py-0.5 rounded mr-1"
                style="border:1px solid var(--border);color:var(--text-dim)">Edit</button>
              <button onclick={() => store.hapusPi(row.id)} class="text-xs px-2 py-0.5 rounded"
                style="color:var(--danger)">Hapus</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
