<script lang="ts">
  import SlideOver from '$lib/components/SlideOver.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import { rp } from '../harga.logic.js'
  import type { HargaStore } from '../harga.store.svelte.js'

  let { store }: { store: HargaStore } = $props()
</script>

<SlideOver bind:open={store.historiOpen} title={store.historiTarget ? `Histori Harga — ${store.historiTarget.nama_barang}` : ''}>
  {#snippet children()}
  {#if store.loadingHistori}
    <div class="flex justify-center py-8"><Spinner /></div>
  {:else if store.historiList.length === 0}
    <p class="py-8 text-center text-xs" style="color:var(--text-dim)">Belum ada histori harga</p>
  {:else}
    <table class="w-full text-xs">
      <thead>
        <tr style="color:var(--text-dim)">
          <th class="pb-2 text-left font-bold">Tanggal</th>
          <th class="pb-2 text-right font-bold">Eceran</th>
          <th class="pb-2 text-right font-bold">Grosir</th>
          <th class="pb-2 text-left font-bold">Diubah oleh</th>
          <th class="pb-2 text-left font-bold">Status</th>
        </tr>
      </thead>
      <tbody>
        {#each store.historiList as h (h.id)}
          <tr class="border-t" style="border-color:var(--border)">
            <td class="py-2" style="color:var(--text)">{h.tanggal_berlaku}</td>
            <td class="py-2 text-right font-mono" style="color:var(--text)">{rp(h.harga_eceran)}</td>
            <td class="py-2 text-right font-mono" style="color:var(--text)">{rp(h.harga_grosir)}</td>
            <td class="py-2" style="color:var(--text-dim)">{h.nama_ubah ?? '-'}</td>
            <td class="py-2">
              {#if h.tanggal_berakhir === null}
                <span class="rounded px-1.5 py-0.5 text-xs font-bold" style="background:var(--accent);color:var(--bg)">AKTIF</span>
              {:else}
                <span style="color:var(--text-dim)">s/d {h.tanggal_berakhir}</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
  {/snippet}
</SlideOver>
