<script lang="ts">
  import SlideOver from '$lib/components/SlideOver.svelte'
  import { STATUS_COLOR, STATUS_LABEL, STATUS_LIST } from './hajatan.logic.js'
  import type { HajatanStore } from './hajatan.store.svelte.js'

  let { store }: { store: HajatanStore } = $props()
</script>

<SlideOver bind:open={store.formOpen} title={store.editRow ? 'Edit Acara' : 'Tambah Acara'}>
  {#snippet children()}
  <div class="space-y-4">
    <div>
      <label for="fh-nama" class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Nama Acara *</label>
      <input id="fh-nama" bind:value={store.fNamaAcara} type="text" placeholder="Pernikahan, Syukuran, dll"
        class="w-full border rounded px-3 py-2 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    </div>
    <div>
      <label for="fh-penyelenggara" class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Nama Penyelenggara *</label>
      <input id="fh-penyelenggara" bind:value={store.fNamaPenyelenggara} type="text" placeholder="Bpk/Ibu."
        class="w-full border rounded px-3 py-2 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    </div>
    <div>
      <label for="fh-tgl" class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Tanggal Acara *</label>
      <input id="fh-tgl" bind:value={store.fTanggal} type="date"
        class="w-full border rounded px-3 py-2 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    </div>
    <div>
      <label for="fh-alamat" class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Alamat</label>
      <input id="fh-alamat" bind:value={store.fAlamat} type="text"
        class="w-full border rounded px-3 py-2 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    </div>
    <div>
      <label for="fh-estimasi" class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Estimasi Tamu</label>
      <input id="fh-estimasi" bind:value={store.fEstimasi} type="number" min="0"
        class="w-full border rounded px-3 py-2 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    </div>
    <div>
      <label for="fh-total" class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Total Order (Rp)</label>
      <input id="fh-total" bind:value={store.fTotalOrder} type="number" min="0"
        class="w-full border rounded px-3 py-2 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    </div>
    <div>
      <p class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Status</p>
      <div class="flex flex-wrap gap-2">
        {#each STATUS_LIST as s (s)}
          <button onclick={() => store.fStatus = s}
            class="px-3 py-1.5 rounded text-sm border transition-colors"
            style={store.fStatus === s
              ? `background:${STATUS_COLOR[s]};color:white;border-color:${STATUS_COLOR[s]}`
              : 'background:var(--surface);color:var(--text-dim);border-color:var(--border)'}>
            {STATUS_LABEL[s]}
          </button>
        {/each}
      </div>
    </div>
    <div>
      <label for="fh-catatan" class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Catatan</label>
      <textarea id="fh-catatan" bind:value={store.fCatatan} rows="3"
        class="w-full border rounded px-3 py-2 text-sm resize-none" style="background:var(--surface);border-color:var(--border);color:var(--text)"></textarea>
    </div>
    <div class="flex gap-2 pt-2">
      <button onclick={() => store.formOpen = false}
        class="flex-1 py-2 rounded text-sm" style="background:var(--surface2);color:var(--text)">Batal</button>
      <button onclick={() => store.simpan()}
        class="flex-1 py-2 rounded text-sm font-medium text-white" style="background:var(--accent)">Simpan</button>
    </div>
  </div>
  {/snippet}
</SlideOver>
