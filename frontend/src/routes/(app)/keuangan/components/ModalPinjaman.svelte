<script lang="ts">
  import Modal from '$lib/components/ui/Modal.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import DatePicker2 from '$lib/components/ui/DatePicker2.svelte'
  import type { createKeuanganStore } from '../keuangan.store.svelte'

  let { store }: { store: ReturnType<typeof createKeuanganStore> } = $props()
</script>

{#if store.piFormOpen}
  <Modal judul="{store.editPiId ? 'Edit' : 'Tambah'} Pinjaman / Investasi" ontutup={() => store.piFormOpen = false}>
    <div class="flex flex-col gap-3 text-sm">
      <div class="flex gap-4">
        {#each ([['pinjaman','Pinjaman'],['investasi','Investasi']] as const) as [v, lbl] (v)}
          <label class="flex cursor-pointer items-center gap-1.5">
            <input type="radio" bind:group={store.fPiTipe} value={v} class="accent-[var(--accent)]" />
            <span style="color:{v==='pinjaman' ? 'var(--danger)' : 'var(--accent)'}">{lbl}</span>
          </label>
        {/each}
      </div>
      <Input label="{store.fPiTipe === 'pinjaman' ? 'NAMA PEMBERI PINJAMAN' : 'NAMA PENERIMA/PROYEK'} *"
        placeholder="mis. Bank BRI, Koperasi, ..." bind:value={store.fPiNama} />
      <div class="grid grid-cols-2 gap-3">
        <div>
          <span class="mb-1 block text-xs" style="color:var(--text-dim)">JUMLAH POKOK (Rp) *</span>
          <input type="number" min="1" bind:value={store.fPiPokok}
            placeholder="0"
            class="input input-bordered w-full text-sm" />
        </div>
        <div>
          <span class="mb-1 block text-xs" style="color:var(--text-dim)">BUNGA (% per tahun)</span>
          <input type="number" min="0" step="0.1" bind:value={store.fPiBunga}
            placeholder="0"
            class="input input-bordered w-full text-sm" />
        </div>
        <div>
          <span class="mb-1 block text-xs" style="color:var(--text-dim)">CICILAN/BULAN (Rp)</span>
          <input type="number" min="0" bind:value={store.fPiCicilan}
            placeholder="0"
            class="input input-bordered w-full text-sm" />
        </div>
        <DatePicker2 label="TANGGAL MULAI *" bind:value={store.fPiMulai} />
        <div class="col-span-2">
          <DatePicker2 label="JATUH TEMPO" bind:value={store.fPiJatuh} />
        </div>
      </div>
      <Input label="CATATAN" placeholder="Opsional" bind:value={store.fPiCatatan} />
      {#if store.piError}<p class="text-xs" style="color:var(--danger)">{store.piError}</p>{/if}
    </div>
    {#snippet footer()}
      <Button variant="ghost" onclick={() => store.piFormOpen = false}>Batal</Button>
      <Button onclick={() => store.simpanPi()}>Simpan</Button>
    {/snippet}
  </Modal>
{/if}
