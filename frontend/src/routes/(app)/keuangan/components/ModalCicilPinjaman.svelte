<script lang="ts">
  import Modal from '$lib/components/ui/Modal.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import type { createKeuanganStore } from '../keuangan.store.svelte'

  let { store }: { store: ReturnType<typeof createKeuanganStore> } = $props()
</script>

{#if store.piCicilOpen}
  <Modal judul="Bayar Cicilan" lebar="sm" ontutup={() => store.piCicilOpen = false}>
    <div>
      <span class="mb-1 block text-xs" style="color:var(--text-dim)">JUMLAH CICILAN (Rp) *</span>
      <input type="number" min="1" bind:value={store.cicilJumlah}
        class="w-full rounded border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-1"
        style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)" />
    </div>
    {#snippet footer()}
      <Button variant="ghost" onclick={() => store.piCicilOpen = false}>Batal</Button>
      <Button onclick={() => store.cicilPi()}>Bayar</Button>
    {/snippet}
  </Modal>
{/if}
