<script lang="ts">
  import DataTable from '$lib/components/DataTable.svelte'
  import SlideOver from '$lib/components/SlideOver.svelte'
  import type { createKaryawanStore } from '../karyawan.store.svelte.js'
  import { STATUS_GAJI_COLOR, rp } from '../karyawan.logic.js'

  let { store }: { store: ReturnType<typeof createKaryawanStore> } = $props()

  $effect(() => { store.filterBulanGaji; store.muatPenggajian() })
</script>

<div class="flex items-center gap-3 flex-wrap">
  <input type="month" bind:value={store.filterBulanGaji}
    class="px-2 py-1 rounded border text-sm outline-none"
    style="background:var(--surface);border-color:var(--border);color:var(--text)" />
  {#if store.isManager}
    <button onclick={store.generateGaji} disabled={store.loadingGenerate}
      class="px-3 py-1 rounded text-sm font-bold ml-auto"
      style="background:var(--info);color:var(--bg);opacity:{store.loadingGenerate ? 0.6 : 1}">
      {store.loadingGenerate ? 'Generating...' : 'Generate Gaji'}
    </button>
  {/if}
</div>

<DataTable
  columns={store.kolPenggajian}
  tableId="karyawan_penggajian"
  bind:sortKey={store.sortKeyGaji}
  bind:sortDir={store.sortDirGaji}
  rowCount={store.sortedGaji.length}
  emptyText='Belum ada data — klik "Generate Gaji" untuk membuat slip gaji dari absensi'
  maxRows={12}
>
  {#snippet body(hidden)}
    {#each store.sortedGaji as item (item.id)}
      <tr class="border-t" style="border-color:var(--border)">
        {#if !hidden.has('nama_karyawan')}
          <td class="px-3 py-2 font-medium">{item.nama_karyawan}</td>
        {/if}
        {#if !hidden.has('periode_bulan')}
          <td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.periode_bulan}</td>
        {/if}
        {#if !hidden.has('hadir_kerja')}
          <td class="px-3 py-2 text-center" style="color:var(--text-dim)">
            {item.hari_hadir}/{item.hari_kerja}
            {#if item.tipe_gaji === 'harian'}<span class="text-xs ml-1">(H)</span>{/if}
          </td>
        {/if}
        {#if !hidden.has('gaji_pokok')}
          <td class="px-3 py-2 text-right">{rp(item.gaji_pokok)}</td>
        {/if}
        {#if !hidden.has('tunjangan')}
          <td class="px-3 py-2 text-right" style="color:var(--accent)">{item.tunjangan > 0 ? rp(item.tunjangan) : '-'}</td>
        {/if}
        {#if !hidden.has('potongan_kasbon')}
          <td class="px-3 py-2 text-right" style="color:var(--warn)">{item.potongan_kasbon > 0 ? rp(item.potongan_kasbon) : '-'}</td>
        {/if}
        {#if !hidden.has('potongan_lain')}
          <td class="px-3 py-2 text-right" style="color:var(--danger)">{item.potongan_lain > 0 ? rp(item.potongan_lain) : '-'}</td>
        {/if}
        {#if !hidden.has('total_gaji')}
          <td class="px-3 py-2 text-right font-bold">{rp(item.total_gaji)}</td>
        {/if}
        {#if !hidden.has('status')}
          <td class="px-3 py-2">
            <span class="text-xs font-bold" style="color:{STATUS_GAJI_COLOR[item.status]}">{item.status.toUpperCase()}</span>
          </td>
        {/if}
        {#if !hidden.has('aksi')}
          <td class="px-3 py-2 text-right whitespace-nowrap">
            {#if item.status === 'draft'}
              <button onclick={() => store.bukaEditGaji(item)} class="text-xs mr-2" style="color:var(--info)">Edit</button>
              <button onclick={() => store.updateStatusGaji(item.id, 'approved')} class="text-xs mr-2" style="color:var(--accent)">Approve</button>
              <button onclick={() => store.hapusGaji(item.id)} class="text-xs" style="color:var(--danger)">Hapus</button>
            {:else if item.status === 'approved'}
              <button onclick={() => store.bukaBayar(item.id)} class="text-xs font-bold" style="color:var(--accent)">Tandai Dibayar</button>
            {:else}
              <span class="text-xs" style="color:var(--text-dim)">Selesai</span>
            {/if}
          </td>
        {/if}
      </tr>
    {/each}
  {/snippet}
</DataTable>
{#if store.penggajianList.length > 0}
  <div class="flex justify-end px-3 py-2 text-sm font-bold rounded border" style="border-color:var(--border);background:var(--surface2)">
    <span style="color:var(--text-dim)">Total Penggajian &nbsp;</span>
    <span style="color:var(--accent)">{rp(store.penggajianList.reduce((s, r) => s + r.total_gaji, 0))}</span>
  </div>
{/if}

<!-- ── Modal: Edit Tunjangan/Potongan ──────────────────────────────────────── -->
<SlideOver bind:open={store.modalGajiOpen} title="Edit Tunjangan & Potongan">
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); store.simpanEditGaji() }} class="flex flex-col gap-3 text-sm">
    {#if store.editGaji}
      <p class="text-xs" style="color:var(--text-dim)">{store.editGaji.nama_karyawan} — {store.editGaji.periode_bulan}</p>
      <p class="text-xs">Gaji pokok: <strong>{rp(store.editGaji.gaji_pokok)}</strong> &nbsp; Potongan kasbon otomatis: <strong>{rp(store.editGaji.potongan_kasbon)}</strong></p>
    {/if}
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label for="fg-tunj" class="text-xs" style="color:var(--text-dim)">TUNJANGAN</label>
        <input id="fg-tunj" type="number" min="0" bind:value={store.formGaji.tunjangan}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fg-pot" class="text-xs" style="color:var(--text-dim)">POTONGAN LAIN</label>
        <input id="fg-pot" type="number" min="0" bind:value={store.formGaji.potongan_lain}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
    </div>
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => store.modalGajiOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </form>
  {/snippet}
</SlideOver>

<!-- ── Modal: Tandai Dibayar ───────────────────────────────────────────────── -->
<SlideOver bind:open={store.modalBayarOpen} title="Tandai Gaji Dibayar">
  {#snippet children()}
  <div class="flex flex-col gap-3 text-sm">
    <p style="color:var(--text-dim)">Pilih akun kas/bank untuk mencatat pengeluaran gaji (opsional):</p>
    <select bind:value={store.bayarKasBankId}
      class="px-2 py-1 rounded border outline-none"
      style="background:var(--surface2);border-color:var(--border);color:var(--text)">
      <option value="">-- Tidak catat ke jurnal --</option>
      {#each store.kasBankList as kb (kb.id)}
        <option value={String(kb.id)}>{kb.nama} ({kb.tipe})</option>
      {/each}
    </select>
    <p class="text-xs" style="color:var(--text-dim)">Kasbon karyawan juga akan dipotong cicilan secara otomatis.</p>
    <div class="flex justify-end gap-2 mt-1">
      <button onclick={() => store.modalBayarOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button onclick={store.konfirmasBayar} class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Konfirmasi Dibayar</button>
    </div>
  </div>
  {/snippet}
</SlideOver>
