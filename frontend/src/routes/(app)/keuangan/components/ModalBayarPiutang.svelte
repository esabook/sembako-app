<script lang="ts">
  import Modal from '$lib/components/ui/Modal.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import { fmt } from '../keuangan.logic'
  import type { createKeuanganStore } from '../keuangan.store.svelte'

  let { store }: { store: ReturnType<typeof createKeuanganStore> } = $props()
</script>

{#if store.modalBayarPiutang && store.piutangDipilih}
  <Modal judul="Terima Pembayaran Piutang" ontutup={() => store.modalBayarPiutang = false}>
    <div class="flex flex-col gap-3">
      <p class="text-sm" style="color:var(--text-dim)">
        {store.piutangDipilih.nama_pelanggan} — Sisa <strong style="color:var(--warn)">Rp {fmt(store.piutangDipilih.sisa_piutang)}</strong>
      </p>
      <Input label="Tanggal Terima" type="text" value={store.formBayarPiutang.tanggal_bayar}
        oninput={(v) => store.formBayarPiutang.tanggal_bayar = v} />
      <div>
        <span class="mb-1 block text-xs" style="color:var(--text-dim)">Jumlah Diterima</span>
        <input type="number" bind:value={store.formBayarPiutang.jumlah_bayar} min="1"
          class="w-full rounded border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-1"
          style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)" />
      </div>
      <div>
        <span class="mb-1 block text-xs" style="color:var(--text-dim)">Akun Kas/Bank</span>
        <select bind:value={store.formBayarPiutang.kas_bank_id}
          class="w-full rounded border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-1"
          style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)">
          {#each store.kasBankList as kb (kb.id)}
            <option value={kb.id}>{kb.nama}</option>
          {/each}
        </select>
      </div>
    </div>
    {#snippet footer()}
      <Button variant="ghost" onclick={() => store.modalBayarPiutang = false}>Batal</Button>
      <Button onclick={() => store.simpanBayarPiutang()} loading={store.savingBayarPiutang}>Terima</Button>
    {/snippet}
  </Modal>
{/if}
