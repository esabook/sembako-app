<script lang="ts">
  import SlideOver from '$lib/components/SlideOver.svelte'
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte'
  import type { createAgendaStore } from '../sales.store.svelte.js'
  import { STATUS_A_COLOR } from '../sales.logic.js'

  let { store }: { store: ReturnType<typeof createAgendaStore> } = $props()
</script>

<div class="flex flex-wrap gap-2 items-end mb-2">
  <input type="month" bind:value={store.bulan}
    class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
  <select bind:value={store.status}
    class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
    <option value="">Semua Status</option>
    <option value="dijadwalkan">Dijadwalkan</option>
    <option value="selesai">Selesai</option>
    <option value="dibatalkan">Dibatalkan</option>
  </select>
  <button onclick={() => store.bukaForm()}
    class="px-3 py-1 rounded text-sm font-bold ml-auto" style="background:var(--accent);color:var(--bg)">+ Tambah Agenda</button>
</div>

{#if store.rows.length === 0}
  <p class="text-sm py-4" style="color:var(--text-dim)">Belum ada agenda supplier.</p>
{:else}
  <div class="overflow-x-auto rounded border" style="border-color:var(--border)">
    <table class="min-w-full text-sm" style="border-collapse:collapse;min-width:500px">
      <thead><tr style="background:var(--surface2)">
        <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Tanggal</th>
        <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Supplier</th>
        <th class="px-3 py-2 text-left text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Tipe</th>
        <th class="px-3 py-2 text-left text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Lokasi/Petugas</th>
        <th class="px-3 py-2 text-center text-xs font-semibold" style="color:var(--text-dim)">Status</th>
        <th class="px-3 py-2"></th>
      </tr></thead>
      <tbody>
        {#each store.rows as row (row.id)}
          <tr class="border-t" style="border-color:var(--border)">
            <td class="px-3 py-2 text-xs">{row.tanggal}{row.jam ? ' ' + row.jam : ''}</td>
            <td class="px-3 py-2 font-medium">
              <div>{row.nama_supplier}</div>
              {#if row.hasil}<div class="text-xs" style="color:var(--text-dim)">→ {row.hasil}</div>{/if}
            </td>
            <td class="px-3 py-2 text-xs capitalize hidden sm:table-cell">{row.tipe}</td>
            <td class="px-3 py-2 text-xs hidden sm:table-cell" style="color:var(--text-dim)">
              {row.lokasi ?? ''}{row.nama_petugas ? (row.lokasi ? ' · ' : '') + row.nama_petugas : ''}
              {#if !row.lokasi && !row.nama_petugas}—{/if}
            </td>
            <td class="px-3 py-2 text-center">
              <span class="text-xs font-semibold" style="color:{STATUS_A_COLOR[row.status]}">{row.status}</span>
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

<SlideOver bind:open={store.formOpen} title={store.editId ? 'Edit Agenda' : 'Tambah Agenda Supplier'}>
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); store.simpan() }} class="flex flex-col gap-3 text-sm">
    <div class="flex flex-col gap-1">
      <label for="fa-sup" class="text-xs" style="color:var(--text-dim)">NAMA SUPPLIER *</label>
      <input id="fa-sup" bind:value={store.fNamaSupplier} required
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label for="fa-tipe" class="text-xs" style="color:var(--text-dim)">TIPE</label>
        <select id="fa-tipe" bind:value={store.fTipe}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)">
          {#each ['kunjungan', 'negosiasi', 'pengiriman', 'lainnya'] as t (t)}
            <option value={t} class="capitalize">{t}</option>
          {/each}
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-tgl" class="text-xs" style="color:var(--text-dim)">TANGGAL *</label>
        <input id="fa-tgl" type="date" bind:value={store.fTanggal} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-jam" class="text-xs" style="color:var(--text-dim)">JAM</label>
        <input id="fa-jam" type="time" bind:value={store.fJam}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-lok" class="text-xs" style="color:var(--text-dim)">LOKASI</label>
        <input id="fa-lok" bind:value={store.fLokasi} placeholder="Toko / Kantor"
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
    </div>
    <div class="flex flex-col gap-1">
      <label for="fa-hasil" class="text-xs" style="color:var(--text-dim)">HASIL</label>
      <input id="fa-hasil" bind:value={store.fHasil} placeholder="Hasil setelah selesai"
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    {#if store.editId}
      <div class="flex flex-col gap-1">
        <span class="text-xs" style="color:var(--text-dim)">STATUS</span>
        <div class="flex gap-3">
          {#each ['dijadwalkan', 'selesai', 'dibatalkan'] as s (s)}
            <label class="flex items-center gap-1.5 cursor-pointer text-sm">
              <input type="radio" bind:group={store.fStatus} value={s} class="accent-[var(--accent)]" />{s}
            </label>
          {/each}
        </div>
      </div>
    {/if}
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
  judul="Hapus agenda?"
  pesan="Data agenda supplier ini akan dihapus permanen."
  labelKanan="Hapus"
  warnaKanan="var(--danger)"
  onkiri={() => store.konfirmId = null}
  onkanan={() => store.doHapus()}
/>
