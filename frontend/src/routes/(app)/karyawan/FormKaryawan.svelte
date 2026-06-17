<script lang="ts">
  import SlideOver from '$lib/components/SlideOver.svelte'
  import Select from '$lib/components/ui/Select.svelte'
  import type { createKaryawanStore } from './karyawan.store.svelte.js'

  let { store }: { store: ReturnType<typeof createKaryawanStore> } = $props()
</script>

<SlideOver bind:open={store.modalKaryawanOpen} title={store.editKaryawan?.id ? 'Edit Karyawan' : 'Tambah Karyawan'}>
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); store.simpanKaryawan() }} class="flex flex-col gap-3 text-sm">
    <div class="flex flex-col gap-1">
      <label for="f-kode" class="text-xs" style="color:var(--text-dim)">KODE *</label>
      <input id="f-kode" type="text" bind:value={store.formKaryawan.kode_karyawan} required
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex flex-col gap-1">
      <label for="f-nama" class="text-xs" style="color:var(--text-dim)">NAMA *</label>
      <input id="f-nama" type="text" bind:value={store.formKaryawan.nama} required
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex flex-col gap-1">
      <label for="f-role" class="text-xs" style="color:var(--text-dim)">ROLE *</label>
      <Select id="f-role" bind:value={store.formKaryawan.role}
        options={['pemilik','manajer','kasir','gudang','sales','pelayanan']} />
    </div>
    <div class="flex flex-col gap-1">
      <label for="f-username" class="text-xs" style="color:var(--text-dim)">USERNAME *</label>
      <input id="f-username" bind:value={store.formKaryawan.username} required class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex flex-col gap-1">
      <label for="f-pw" class="text-xs" style="color:var(--text-dim)">PASSWORD {store.editKaryawan?.id ? '(kosong = tidak ubah)' : '*'}</label>
      <input id="f-pw" type="password" bind:value={store.formKaryawan.password}
        required={!store.editKaryawan?.id} class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex flex-col gap-1">
      <label for="f-kontak" class="text-xs" style="color:var(--text-dim)">KONTAK</label>
      <input id="f-kontak" bind:value={store.formKaryawan.kontak} class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex flex-col gap-1">
      <label for="f-pin" class="text-xs" style="color:var(--text-dim)">
        PIN ABSENSI (4 digit){store.editKaryawan?.id ? ' — kosong = tidak ubah' : ''}
      </label>
      <input id="f-pin" type="password" inputmode="numeric" maxlength="4"
        bind:value={store.formKaryawan.pin_absensi}
        placeholder="4 digit angka"
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex flex-col gap-1">
      <label for="f-gaji" class="text-xs" style="color:var(--text-dim)">GAJI POKOK</label>
      <input id="f-gaji" type="number" min="0" bind:value={store.formKaryawan.gaji_pokok} class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex flex-col gap-1">
      <label for="f-tipe" class="text-xs" style="color:var(--text-dim)">TIPE GAJI</label>
      <Select id="f-tipe" bind:value={store.formKaryawan.tipe_gaji}
        options={[
          { value: 'bulanan', label: 'Bulanan' },
          { value: 'harian', label: 'Harian' }
        ]} />
    </div>
    <div class="flex flex-col gap-1">
      <label for="f-foto" class="text-xs" style="color:var(--text-dim)">FOTO</label>
      <div class="flex items-center gap-3">
        {#if store.fotoPreview}
          <img src={store.fotoPreview} alt="preview"
            class="rounded-full object-cover shrink-0"
            style="width:48px;height:48px;border:1px solid var(--border)" />
        {:else}
          <div class="rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
            style="width:48px;height:48px;background:var(--surface2);border:1px dashed var(--border);color:var(--text-dim)">
            {store.formKaryawan.nama ? store.formKaryawan.nama.trim().split(/\s+/).slice(0,2).map((w: string)=>w[0]).join('').toUpperCase() : '?'}
          </div>
        {/if}
        <input id="f-foto" type="file" accept="image/*" onchange={store.handleFotoKaryawanChange} class="text-xs" style="color:var(--text)" />
      </div>
    </div>
    <div class="flex flex-col gap-1">
      <label for="f-cabang" class="text-xs" style="color:var(--text-dim)">CABANG (kosong = semua cabang)</label>
      <Select id="f-cabang" bind:value={store.formKaryawan.cabang_id}
        options={store.cabangList.map(c => ({ value: c.id, label: c.nama }))}
        placeholder="— Semua Cabang —" />
    </div>
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => store.modalKaryawanOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </form>
  {/snippet}
</SlideOver>
