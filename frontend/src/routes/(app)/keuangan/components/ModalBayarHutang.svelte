<script lang="ts">
  import Modal from '$lib/components/ui/Modal.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import { fmt } from '../keuangan.logic'
  import type { createKeuanganStore } from '../keuangan.store.svelte'

  let { store }: { store: ReturnType<typeof createKeuanganStore> } = $props()
</script>

{#if store.modalBayarHutang && store.hutangDipilih}
  <Modal judul="Bayar Hutang" ontutup={() => store.modalBayarHutang = false}>
    <div class="flex flex-col gap-3">
      <p class="text-sm" style="color:var(--text-dim)">
        {store.hutangDipilih.nama_supplier} — Sisa <strong style="color:var(--danger)">Rp {fmt(store.hutangDipilih.sisa_hutang)}</strong>
      </p>
      <Input label="Tanggal Bayar" type="text" value={store.formBayarHutang.tanggal_bayar}
        oninput={(v) => store.formBayarHutang.tanggal_bayar = v} />
      <div>
        <span class="mb-1 block text-xs" style="color:var(--text-dim)">Jumlah Bayar</span>
        <input type="number" bind:value={store.formBayarHutang.jumlah_bayar} min="1"
          class="w-full rounded border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-1"
          style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)" />
      </div>
      <div>
        <span class="mb-1 block text-xs" style="color:var(--text-dim)">Akun Kas/Bank</span>
        <select bind:value={store.formBayarHutang.kas_bank_id}
          class="w-full rounded border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-1"
          style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)">
          {#each store.kasBankList as kb (kb.id)}
            <option value={kb.id}>{kb.nama}</option>
          {/each}
        </select>
      </div>
    </div>
    {#snippet footer()}
      <Button variant="ghost" onclick={() => store.modalBayarHutang = false}>Batal</Button>
      <Button onclick={() => store.simpanBayarHutang()} loading={store.savingBayarHutang}>Bayar</Button>
    {/snippet}
  </Modal>
{/if}
