<script lang="ts">
  import Modal from '$lib/components/ui/Modal.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Select from '$lib/components/ui/Select.svelte'
  import type { createKeuanganStore } from '../keuangan.store.svelte'

  let { store }: { store: ReturnType<typeof createKeuanganStore> } = $props()
</script>

{#if store.modalKasBank}
  <Modal judul={store.editKasBank ? 'Edit Akun' : 'Tambah Akun Kas/Bank'} ontutup={() => store.modalKasBank = false}>
    <div class="flex flex-col gap-3">
      <Input label="Nama Akun" placeholder="contoh: Kas Toko, BCA 1234"
        bind:value={store.formKasBank.nama} />
      {#if !store.editKasBank}
        <div>
          <Select label="Tipe" bind:value={store.formKasBank.tipe}
            options={[{ value: 'kas', label: 'Kas (uang tunai)' }, { value: 'bank', label: 'Bank (rekening)' }]} />
        </div>
      {/if}
      <div>
        <span class="mb-1 block text-xs" style="color:var(--text-dim)">Saldo Awal</span>
        <input type="number" bind:value={store.formKasBank.saldo_awal} min="0"
          placeholder="0"
          class="input input-bordered w-full text-sm" />
      </div>
    </div>
    {#snippet footer()}
      <Button variant="ghost" onclick={() => store.modalKasBank = false}>Batal</Button>
      <Button onclick={() => store.simpanKasBank()} loading={store.savingKasBank}>Simpan</Button>
    {/snippet}
  </Modal>
{/if}
