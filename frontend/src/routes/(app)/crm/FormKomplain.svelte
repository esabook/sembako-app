<script lang="ts">
  import SlideOver from '$lib/components/SlideOver.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import { KATEGORI_LABEL } from './crm.logic.js'
  import type { CrmStore } from './crm.store.svelte.js'

  let { store }: { store: CrmStore } = $props()
</script>

<SlideOver bind:open={store.kFormOpen} title="Catat Komplain Pelanggan">
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); store.simpanKomplain() }} class="flex flex-col gap-3 text-sm">
    <div class="flex flex-col gap-1">
      <label for="fk-kat" class="text-xs" style="color:var(--text-dim)">KATEGORI *</label>
      <select id="fk-kat" bind:value={store.fKKategori}
        class="w-full rounded border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-1"
        style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)">
        {#each Object.entries(KATEGORI_LABEL) as [v, lbl] (v)}
          <option value={v}>{lbl}</option>
        {/each}
      </select>
    </div>
    <div class="flex flex-col gap-1">
      <label for="fk-desk" class="text-xs" style="color:var(--text-dim)">DESKRIPSI KOMPLAIN *</label>
      <textarea id="fk-desk" bind:value={store.fKDeskripsi} rows="3" required
        class="w-full rounded border px-2 py-1.5 text-sm outline-none resize-none transition-colors focus:ring-1"
        style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)"></textarea>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label for="fk-pel" class="text-xs" style="color:var(--text-dim)">NAMA PELANGGAN</label>
        <input id="fk-pel" bind:value={store.fKPelanggan} placeholder="Opsional"
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fk-tgl" class="text-xs" style="color:var(--text-dim)">TANGGAL *</label>
        <input id="fk-tgl" type="date" bind:value={store.fKTanggal} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
    </div>
    {#if store.kError}<p class="text-xs" style="color:var(--danger)">{store.kError}</p>{/if}
    <div class="flex justify-end gap-2 mt-1">
      <Button type="button" variant="ghost" onclick={() => store.kFormOpen = false}>Batal</Button>
      <Button type="submit">Simpan</Button>
    </div>
  </form>
  {/snippet}
</SlideOver>
