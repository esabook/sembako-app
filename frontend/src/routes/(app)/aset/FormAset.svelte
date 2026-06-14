<script lang="ts">
  import SlideOver from '$lib/components/SlideOver.svelte'
  import { KONDISI_LABEL, KATEGORI_LIST } from './aset.logic.js'
  import type { AsetStore } from './aset.store.svelte.js'

  let { store }: { store: AsetStore } = $props()
</script>

<SlideOver bind:open={store.asetFormOpen} title={store.editAsetId ? 'Edit Aset' : 'Tambah Aset'}>
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); store.simpanAset() }} class="flex flex-col gap-3 text-sm">
    <div class="flex flex-col gap-1">
      <label for="fa-nama" class="text-xs" style="color:var(--text-dim)">NAMA ASET *</label>
      <input id="fa-nama" bind:value={store.fAsetNama} required placeholder="mis. Mesin Kasir, Kulkas, Motor"
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label for="fa-kat" class="text-xs" style="color:var(--text-dim)">KATEGORI *</label>
        <select id="fa-kat" bind:value={store.fAsetKategori}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)">
          {#each KATEGORI_LIST as k (k)}
            <option value={k}>{k}</option>
          {/each}
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-kondisi" class="text-xs" style="color:var(--text-dim)">KONDISI *</label>
        <select id="fa-kondisi" bind:value={store.fAsetKondisi}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)">
          {#each Object.entries(KONDISI_LABEL) as [v, lbl] (v)}
            <option value={v}>{lbl}</option>
          {/each}
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-beli" class="text-xs" style="color:var(--text-dim)">NILAI BELI (Rp)</label>
        <input id="fa-beli" type="number" min="0" bind:value={store.fAsetNilaiBeli}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-skrg" class="text-xs" style="color:var(--text-dim)">NILAI SEKARANG (Rp)</label>
        <input id="fa-skrg" type="number" min="0" bind:value={store.fAsetNilaiSekarang}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-tgl" class="text-xs" style="color:var(--text-dim)">TANGGAL BELI</label>
        <input id="fa-tgl" type="date" bind:value={store.fAsetTanggal}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-lokasi" class="text-xs" style="color:var(--text-dim)">LOKASI</label>
        <input id="fa-lokasi" bind:value={store.fAsetLokasi} placeholder="mis. Kasir, Gudang"
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
    </div>
    <div class="flex flex-col gap-1">
      <label for="fa-catatan" class="text-xs" style="color:var(--text-dim)">CATATAN</label>
      <input id="fa-catatan" bind:value={store.fAsetCatatan} placeholder="Opsional"
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    {#if store.asetError}
      <p class="text-xs" style="color:var(--danger)">{store.asetError}</p>
    {/if}
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => store.asetFormOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </form>
  {/snippet}
</SlideOver>
