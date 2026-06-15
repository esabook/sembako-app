<script lang="ts">
  import SlideOver from '$lib/components/SlideOver.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import DatePicker from '$lib/components/ui/DatePicker.svelte'
  import InputRupiah from '$lib/components/form/InputRupiah.svelte'
  import { STATUS_COLOR, STATUS_LABEL, STATUS_LIST } from './hajatan.logic.js'
  import type { HajatanStore } from './hajatan.store.svelte.js'

  let { store }: { store: HajatanStore } = $props()

  let totalOrder = $derived(store.fTotalOrder !== '' ? Number(store.fTotalOrder) : 0)
</script>

<SlideOver bind:open={store.formOpen} title={store.editRow ? 'Edit Acara' : 'Tambah Acara'}>
  <div class="space-y-4">
    <Input bind:value={store.fNamaAcara} label="Nama Acara *" placeholder="Pernikahan, Syukuran, dll" />
    <Input bind:value={store.fNamaPenyelenggara} label="Nama Penyelenggara *" placeholder="Bpk/Ibu." />
    <DatePicker bind:value={store.fTanggal} label="Tanggal Acara *" />
    <Input bind:value={store.fAlamat} label="Alamat" />
    <div>
      <label for="fh-estimasi" class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Estimasi Tamu</label>
      <input id="fh-estimasi" bind:value={store.fEstimasi} type="number" min="0"
        class="w-full border rounded px-3 py-2 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    </div>
    <InputRupiah
      value={totalOrder}
      label="Total Order"
      onchange={(v) => store.fTotalOrder = v}
    />
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
      <Button variant="dim" onclick={() => store.formOpen = false} size="md">Batal</Button>
      <Button onclick={() => store.simpan()}>Simpan</Button>
    </div>
  </div>
</SlideOver>
