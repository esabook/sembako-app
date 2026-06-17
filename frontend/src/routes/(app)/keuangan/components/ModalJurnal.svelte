<script lang="ts">
  import Modal from '$lib/components/ui/Modal.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Select from '$lib/components/ui/Select.svelte'
  import type { createKeuanganStore } from '../keuangan.store.svelte'

  let { store }: { store: ReturnType<typeof createKeuanganStore> } = $props()
</script>

{#if store.modalJurnal}
  <Modal judul="Catat Jurnal Kas" ontutup={() => store.modalJurnal = false}>
    <div class="flex flex-col gap-3">
      <div>
        <span class="mb-1 block text-xs" style="color:var(--text-dim)">Tanggal</span>
        <input type="date" bind:value={store.formJurnal.tanggal}
          class="w-full rounded border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-1"
          style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)" />
      </div>
      <div>
        <Select label="Akun Kas/Bank" bind:value={store.formJurnal.kas_bank_id}
          options={store.kasBankList.map(kb => ({ value: kb.id, label: kb.nama }))} />
      </div>
      <div>
        <Select label="Jenis" bind:value={store.formJurnal.jenis}
          options={[{ value: 'masuk', label: 'Masuk' }, { value: 'keluar', label: 'Keluar' }]} />
      </div>
      <Input label="Kategori" placeholder="contoh: operasional, gaji..." value={store.formJurnal.kategori}
        oninput={(v) => store.formJurnal.kategori = v} />
      <Input label="Keterangan" value={store.formJurnal.keterangan ?? ''}
        oninput={(v) => store.formJurnal.keterangan = v} />
      <div>
        <span class="mb-1 block text-xs" style="color:var(--text-dim)">Jumlah</span>
        <input type="number" bind:value={store.formJurnal.jumlah} min="1"
          class="w-full rounded border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-1"
          style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)" />
      </div>
    </div>
    {#snippet footer()}
      <Button variant="ghost" onclick={() => store.modalJurnal = false}>Batal</Button>
      <Button onclick={() => store.simpanJurnal()} loading={store.savingJurnal}>Simpan</Button>
    {/snippet}
  </Modal>
{/if}
