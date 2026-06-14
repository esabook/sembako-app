<script lang="ts">
  import SlideOver from '$lib/components/SlideOver.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import { rp, pct, marginColor } from '../harga.logic.js'
  import type { HargaStore } from '../harga.store.svelte.js'

  let { store }: { store: HargaStore } = $props()
</script>

<SlideOver bind:open={store.editOpen} title={store.editTarget ? `Edit Harga — ${store.editTarget.nama_barang}` : ''}>
  {#snippet children()}
  {#if store.editTarget}
  <div class="space-y-4">
    <div class="rounded p-3 text-xs" style="background:var(--surface2);color:var(--text-dim)">
      Harga Beli: <strong style="color:var(--text)">Rp {rp(store.editTarget.harga_beli_terakhir)}</strong>
    </div>

    <div class="space-y-1">
      <label for="edit_eceran" class="text-xs" style="color:var(--text-dim)">Harga Eceran (Rp)</label>
      <input
        id="edit_eceran"
        type="number"
        bind:value={store.editEceran}
        class="w-full rounded border px-3 py-2 text-sm"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)"
      />
      {#if store.editTarget.harga_beli_terakhir > 0}
        <p class="text-xs" style={marginColor(((store.editEceran - store.editTarget.harga_beli_terakhir) / store.editTarget.harga_beli_terakhir) * 100)}>
          Margin: {pct(((store.editEceran - store.editTarget.harga_beli_terakhir) / store.editTarget.harga_beli_terakhir) * 100)}
        </p>
      {/if}
    </div>

    <div class="space-y-1">
      <label for="edit_grosir" class="text-xs" style="color:var(--text-dim)">Harga Grosir (Rp)</label>
      <input
        id="edit_grosir"
        type="number"
        bind:value={store.editGrosir}
        class="w-full rounded border px-3 py-2 text-sm"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)"
      />
      {#if store.editTarget.harga_beli_terakhir > 0}
        <p class="text-xs" style={marginColor(((store.editGrosir - store.editTarget.harga_beli_terakhir) / store.editTarget.harga_beli_terakhir) * 100)}>
          Margin: {pct(((store.editGrosir - store.editTarget.harga_beli_terakhir) / store.editTarget.harga_beli_terakhir) * 100)}
        </p>
      {/if}
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <Button variant="ghost" onclick={() => { store.editOpen = false }}>Batal</Button>
      <Button onclick={() => store.simpanEdit()} loading={store.saving}>Simpan</Button>
    </div>
  </div>
  {/if}
  {/snippet}
</SlideOver>
