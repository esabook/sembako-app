<script lang="ts">
  import SlideOver from '$lib/components/SlideOver.svelte'
  import { JENIS_LABEL, JENIS_ICON } from './aset.logic.js'
  import type { AsetStore } from './aset.store.svelte.js'
  import type { TagihanRow } from './aset.types.js'

  let { store }: { store: AsetStore } = $props()
</script>

<SlideOver bind:open={store.utFormOpen} title={store.editUtId ? 'Edit Tagihan' : 'Catat Tagihan Utilitas'}>
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); store.simpanUt() }} class="flex flex-col gap-3 text-sm">
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label for="fu-jenis" class="text-xs" style="color:var(--text-dim)">JENIS *</label>
        <select id="fu-jenis" bind:value={store.fUtJenis}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)">
          {#each Object.entries(JENIS_LABEL) as [v, lbl] (v)}
            <option value={v}>{JENIS_ICON[v as TagihanRow['jenis']]} {lbl}</option>
          {/each}
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label for="fu-bulan" class="text-xs" style="color:var(--text-dim)">PERIODE *</label>
        <input id="fu-bulan" type="month" bind:value={store.fUtBulan} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1 col-span-2">
        <label for="fu-jumlah" class="text-xs" style="color:var(--text-dim)">JUMLAH TAGIHAN (Rp) *</label>
        <input id="fu-jumlah" type="number" min="1" bind:value={store.fUtJumlah} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1 col-span-2">
        <label for="fu-bayar" class="text-xs" style="color:var(--text-dim)">TANGGAL BAYAR</label>
        <input id="fu-bayar" type="date" bind:value={store.fUtTanggalBayar}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
    </div>
    {#if store.fUtJenis === 'listrik' || store.fUtJenis === 'air'}
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label for="fu-awal" class="text-xs" style="color:var(--text-dim)">METER AWAL</label>
          <input id="fu-awal" type="number" min="0" bind:value={store.fUtMeterAwal}
            class="px-2 py-1 rounded border outline-none"
            style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
        </div>
        <div class="flex flex-col gap-1">
          <label for="fu-akhir" class="text-xs" style="color:var(--text-dim)">METER AKHIR</label>
          <input id="fu-akhir" type="number" min="0" bind:value={store.fUtMeterAkhir}
            class="px-2 py-1 rounded border outline-none"
            style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
        </div>
      </div>
    {/if}
    <div class="flex flex-col gap-1">
      <label for="fu-catatan" class="text-xs" style="color:var(--text-dim)">CATATAN</label>
      <input id="fu-catatan" bind:value={store.fUtCatatan} placeholder="Opsional"
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    {#if store.utError}
      <p class="text-xs" style="color:var(--danger)">{store.utError}</p>
    {/if}
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => store.utFormOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </form>
  {/snippet}
</SlideOver>
