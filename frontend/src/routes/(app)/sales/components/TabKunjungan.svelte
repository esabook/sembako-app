<script lang="ts">
  import SlideOver from '$lib/components/SlideOver.svelte'
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte'
  import type { createKunjunganStore } from '../sales.store.svelte.js'
  import { TUJUAN_LABEL, STATUS_K_COLOR } from '../sales.logic.js'

  let { store }: { store: ReturnType<typeof createKunjunganStore> } = $props()
</script>

<div class="flex flex-wrap gap-2 items-end mb-2">
  <input type="month" bind:value={store.bulan}
    class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
  <select bind:value={store.status}
    class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
    <option value="">Semua Status</option>
    <option value="open">Open</option>
    <option value="pending">Pending</option>
    <option value="selesai">Selesai</option>
  </select>
  <button onclick={() => store.bukaForm()}
    class="px-3 py-1 rounded text-sm font-bold ml-auto" style="background:var(--accent);color:var(--bg)">+ Catat Kunjungan</button>
</div>

{#if store.rows.length === 0}
  <p class="text-sm py-4" style="color:var(--text-dim)">Belum ada catatan kunjungan.</p>
{:else}
  <div class="overflow-x-auto rounded border" style="border-color:var(--border)">
    <table class="min-w-full text-sm" style="border-collapse:collapse;min-width:540px">
      <thead><tr style="background:var(--surface2)">
        <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Tanggal</th>
        <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Nama Warung</th>
        <th class="px-3 py-2 text-left text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Tujuan</th>
        <th class="px-3 py-2 text-left text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Petugas</th>
        <th class="px-3 py-2 text-center text-xs font-semibold" style="color:var(--text-dim)">Status</th>
        <th class="px-3 py-2"></th>
      </tr></thead>
      <tbody>
        {#each store.rows as row (row.id)}
          <tr class="border-t" style="border-color:var(--border)">
            <td class="px-3 py-2 text-xs">{row.tanggal}</td>
            <td class="px-3 py-2">
              <div class="font-medium">{row.nama_warung}</div>
              {#if row.alamat}<div class="text-xs" style="color:var(--text-dim)">{row.alamat}</div>{/if}
              {#if row.hasil}<div class="text-xs mt-0.5" style="color:var(--text-dim)">→ {row.hasil}</div>{/if}
            </td>
            <td class="px-3 py-2 text-xs hidden sm:table-cell">{TUJUAN_LABEL[row.tujuan]}</td>
            <td class="px-3 py-2 text-xs hidden sm:table-cell" style="color:var(--text-dim)">{row.nama_petugas ?? '—'}</td>
            <td class="px-3 py-2 text-center">
              <span class="text-xs font-semibold" style="color:{STATUS_K_COLOR[row.status_tindak_lanjut]}">{row.status_tindak_lanjut}</span>
            </td>
            <td class="px-3 py-2 text-right whitespace-nowrap">
              <button onclick={() => store.bukaForm(row)} class="text-xs px-2 py-0.5 rounded mr-1"
                style="border:1px solid var(--border);color:var(--text-dim)">Edit</button>
              <button onclick={() => store.hapus(row.id)} class="text-xs px-2 py-0.5 rounded"
                style="color:var(--danger)">Hapus</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<SlideOver bind:open={store.formOpen} title={store.editId ? 'Edit Kunjungan' : 'Catat Kunjungan Warung'}>
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); store.simpan() }} class="flex flex-col gap-3 text-sm">
    <div class="flex flex-col gap-1">
      <label for="fk-nama" class="text-xs" style="color:var(--text-dim)">NAMA WARUNG *</label>
      <input id="fk-nama" bind:value={store.fNama} required placeholder="Warung Bu Tini, Toko XYZ, ..."
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex flex-col gap-1">
      <label for="fk-alamat" class="text-xs" style="color:var(--text-dim)">ALAMAT</label>
      <input id="fk-alamat" bind:value={store.fAlamat} placeholder="Opsional"
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label for="fk-tgl" class="text-xs" style="color:var(--text-dim)">TANGGAL *</label>
        <input id="fk-tgl" type="date" bind:value={store.fTanggal} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fk-tujuan" class="text-xs" style="color:var(--text-dim)">TUJUAN</label>
        <select id="fk-tujuan" bind:value={store.fTujuan}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)">
          {#each Object.entries(TUJUAN_LABEL) as [v, lbl] (v)}
            <option value={v}>{lbl}</option>
          {/each}
        </select>
      </div>
    </div>
    <div class="flex flex-col gap-1">
      <label for="fk-hasil" class="text-xs" style="color:var(--text-dim)">HASIL KUNJUNGAN</label>
      <input id="fk-hasil" bind:value={store.fHasil} placeholder="Ringkasan hasil"
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex flex-col gap-1">
      <span class="text-xs" style="color:var(--text-dim)">STATUS TINDAK LANJUT</span>
      <div class="flex gap-3">
        {#each (['open', 'pending', 'selesai'] as const) as s (s)}
          <label class="flex items-center gap-1.5 cursor-pointer text-sm capitalize">
            <input type="radio" bind:group={store.fStatus} value={s} class="accent-[var(--accent)]" />{s}
          </label>
        {/each}
      </div>
    </div>
    {#if store.error}<p class="text-xs" style="color:var(--danger)">{store.error}</p>{/if}
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => store.formOpen = false} class="px-3 py-1 rounded text-sm" style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold" style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </form>
  {/snippet}
</SlideOver>

<ConfirmDialog
  bind:open={store.konfirmBuka}
  judul="Hapus kunjungan?"
  pesan="Data kunjungan ini akan dihapus permanen."
  labelKanan="Hapus"
  warnaKanan="var(--danger)"
  onkiri={() => store.konfirmId = null}
  onkanan={() => store.doHapus()}
/>
