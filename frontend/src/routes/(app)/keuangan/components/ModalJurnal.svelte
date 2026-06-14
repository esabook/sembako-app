<script lang="ts">
  import Modal from '$lib/components/ui/Modal.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import Input from '$lib/components/ui/Input.svelte'
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
        <span class="mb-1 block text-xs" style="color:var(--text-dim)">Akun Kas/Bank</span>
        <select bind:value={store.formJurnal.kas_bank_id}
          class="w-full rounded border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-1"
          style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)">
          {#each store.kasBankList as kb (kb.id)}
            <option value={kb.id}>{kb.nama}</option>
          {/each}
        </select>
      </div>
      <div>
        <span class="mb-1 block text-xs" style="color:var(--text-dim)">Jenis</span>
        <select bind:value={store.formJurnal.jenis}
          class="w-full rounded border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-1"
          style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)">
          <option value="masuk">Masuk</option>
          <option value="keluar">Keluar</option>
        </select>
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
