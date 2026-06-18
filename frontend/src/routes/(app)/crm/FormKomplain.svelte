<script lang="ts">
  import SlideOver from '$lib/components/SlideOver.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import Select from '$lib/components/ui/Select.svelte'
  import DatePicker2 from '$lib/components/ui/DatePicker2.svelte'
  import { KATEGORI_LABEL } from './crm.logic.js'
  import type { CrmStore } from './crm.store.svelte.js'

  let { store }: { store: CrmStore } = $props()
</script>

<SlideOver bind:open={store.kFormOpen} title="Catat Komplain Pelanggan">
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); store.simpanKomplain() }} class="flex flex-col gap-3 text-sm">
    <div class="flex flex-col gap-1">
      <Select id="fk-kat" label="KATEGORI *" bind:value={store.fKKategori}
        options={Object.entries(KATEGORI_LABEL).map(([v, lbl]) => ({ value: v, label: lbl }))} />
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
      <DatePicker2 label="TANGGAL *" bind:value={store.fKTanggal} />
    </div>
    {#if store.kError}<p class="text-xs" style="color:var(--danger)">{store.kError}</p>{/if}
    <div class="flex justify-end gap-2 mt-1">
      <Button type="button" variant="ghost" onclick={() => store.kFormOpen = false}>Batal</Button>
      <Button type="submit">Simpan</Button>
    </div>
  </form>
  {/snippet}
</SlideOver>
