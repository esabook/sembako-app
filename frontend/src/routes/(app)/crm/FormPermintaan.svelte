<script lang="ts">
  import SlideOver from '$lib/components/SlideOver.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import DatePicker2 from '$lib/components/ui/DatePicker2.svelte'
  import type { CrmStore } from './crm.store.svelte.js'

  let { store }: { store: CrmStore } = $props()
</script>

<SlideOver bind:open={store.pFormOpen} title="Catat Permintaan Barang">
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); store.simpanPermintaan() }} class="flex flex-col gap-3 text-sm">
    <div class="flex flex-col gap-1">
      <label for="fp-barang" class="text-xs" style="color:var(--text-dim)">NAMA BARANG DIMINTA *</label>
      <input id="fp-barang" bind:value={store.fPBarang} required placeholder="mis. Mie Instan ABC Rasa Soto"
        class="w-full rounded border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-1"
        style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)" />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label for="fp-pelanggan" class="text-xs" style="color:var(--text-dim)">NAMA PELANGGAN</label>
        <input id="fp-pelanggan" bind:value={store.fPPelanggan} placeholder="Opsional (walk-in)"
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fp-qty" class="text-xs" style="color:var(--text-dim)">JUMLAH MINTA</label>
        <input id="fp-qty" type="number" min="1" bind:value={store.fPQty}
          placeholder="1"
          class="input input-bordered w-full text-sm" />
      </div>
      <div class="col-span-2">
        <DatePicker2 label="TANGGAL *" bind:value={store.fPTanggal} />
      </div>
    </div>
    <div class="flex flex-col gap-1">
      <label for="fp-catatan" class="text-xs" style="color:var(--text-dim)">CATATAN</label>
      <input id="fp-catatan" bind:value={store.fPCatatan} placeholder="Detail tambahan"
        class="input input-bordered w-full text-sm" />
    </div>
    {#if store.pError}<p class="text-xs" style="color:var(--danger)">{store.pError}</p>{/if}
    <div class="flex justify-end gap-2 mt-1">
      <Button type="button" variant="ghost" onclick={() => store.pFormOpen = false}>Batal</Button>
      <Button type="submit">Simpan</Button>
    </div>
  </form>
  {/snippet}
</SlideOver>
