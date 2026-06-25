<script lang="ts">
  import SlideOver from '$lib/components/SlideOver.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import { KATEGORI_LABEL } from './crm.logic.js'
  import type { CrmStore } from './crm.store.svelte.js'

  let { store }: { store: CrmStore } = $props()
</script>

<SlideOver bind:open={store.kDetailOpen} title="Proses Komplain">
  {#snippet children()}
  {#if store.kDetailRow}
  <div class="flex flex-col gap-3 text-sm">
    <div class="rounded p-3 text-xs" style="background:var(--surface2)">
      <div class="font-semibold mb-1" style="color:var(--text-dim)">{KATEGORI_LABEL[store.kDetailRow.kategori]}</div>
      <div>{store.kDetailRow.deskripsi}</div>
    </div>
    <div class="flex flex-col gap-1">
      <label for="kd-res" class="text-xs" style="color:var(--text-dim)">RESOLUSI / CATATAN</label>
      <textarea id="kd-res" bind:value={store.fKResolusi} rows="3" placeholder="Cara penyelesaian komplain"
        class="w-full rounded border px-2 py-1.5 text-sm outline-none resize-none transition-colors focus:ring-1"
        style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)"></textarea>
    </div>
    <div class="flex flex-wrap gap-2 mt-1">
      <Button variant="ghost" onclick={() => store.ubahStatusK(store.kDetailRow!.id, 'diproses', store.fKResolusi||undefined)}>
        Tandai Diproses
      </Button>
      <Button onclick={() => store.ubahStatusK(store.kDetailRow!.id, 'selesai', store.fKResolusi||undefined)}>
        Selesaikan
      </Button>
      <Button variant="danger" onclick={() => store.ubahStatusK(store.kDetailRow!.id, 'ditolak', store.fKResolusi||undefined)}>
        Tolak
      </Button>
    </div>
  </div>
  {/if}
  {/snippet}
</SlideOver>
