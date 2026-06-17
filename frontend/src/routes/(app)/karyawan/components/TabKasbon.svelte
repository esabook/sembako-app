<script lang="ts">
  import DataTable from '$lib/components/DataTable.svelte'
  import SlideOver from '$lib/components/SlideOver.svelte'
  import Select from '$lib/components/ui/Select.svelte'
  import type { createKaryawanStore } from '../karyawan.store.svelte.js'
  import { STATUS_KB, rp } from '../karyawan.logic.js'

  let { store }: { store: ReturnType<typeof createKaryawanStore> } = $props()

  $effect(() => { store.filterStatusKasbon; store.muatKasbon() })
</script>

<div class="flex items-center gap-2 flex-wrap">
  <div class="flex gap-1 text-sm flex-wrap">
    {#each ([['pengajuan','Pengajuan'],['disetujui','Disetujui'],['aktif','Aktif'],['lunas','Lunas'],['ditolak','Ditolak'],['','Semua']] as const) as [v, l] (v + l)}
      <button onclick={() => store.filterStatusKasbon = v}
        class="px-3 py-1 rounded text-xs border"
        style="{store.filterStatusKasbon === v
          ? 'background:var(--surface2);color:var(--text);border-color:var(--accent)'
          : 'color:var(--text-dim);border-color:var(--border)'}">
        {l}
      </button>
    {/each}
  </div>
  {#if store.isManager}
    <button onclick={store.bukaFormKasbon}
      class="px-3 py-1 rounded text-sm font-bold ml-auto"
      style="background:var(--accent);color:var(--bg)">+ Kasbon</button>
  {/if}
</div>

<DataTable
  columns={store.kolKasbon}
  tableId="karyawan_kasbon"
  bind:sortKey={store.sortKeyKasbon}
  bind:sortDir={store.sortDirKasbon}
  rowCount={store.sortedKasbon.length}
  emptyText="Tidak ada kasbon"
  maxRows={12}
>
  {#snippet body(hidden)}
    {#each store.sortedKasbon as item (item.id)}
      {@const st = STATUS_KB[item.status]}
      <tr class="border-t" style="border-color:var(--border)">
        {#if !hidden.has('nama_karyawan')}
          <td class="px-3 py-2">
            <div class="font-medium">{item.nama_karyawan}</div>
            {#if item.catatan && (item.status === 'ditolak' || item.status === 'pengajuan')}
              <div class="text-xs mt-0.5" style="color:var(--text-dim)">📝 {item.catatan}</div>
            {/if}
          </td>
        {/if}
        {#if !hidden.has('tanggal_pinjam')}
          <td class="px-3 py-2 text-xs" style="color:var(--text-dim)">
            <div>{item.tanggal_pinjam}</div>
            {#if item.tanggal_cair}<div style="color:var(--accent)">cair: {item.tanggal_cair}</div>{/if}
          </td>
        {/if}
        {#if !hidden.has('jumlah')}
          <td class="px-3 py-2 text-right">{rp(item.jumlah)}</td>
        {/if}
        {#if !hidden.has('cicilan_per_bulan')}
          <td class="px-3 py-2 text-right" style="color:var(--text-dim)">
            {item.cicilan_per_bulan > 0 ? rp(item.cicilan_per_bulan) : '—'}
          </td>
        {/if}
        {#if !hidden.has('sisa_kasbon')}
          <td class="px-3 py-2 text-right font-bold"
            style="color:{item.sisa_kasbon > 0 ? 'var(--warn)' : 'var(--accent)'}">
            {rp(item.sisa_kasbon)}
          </td>
        {/if}
        {#if !hidden.has('status')}
          <td class="px-3 py-2">
            <span class="text-xs font-bold" style="color:{st.color}">{st.label}</span>
          </td>
        {/if}
        {#if !hidden.has('aksi')}
          <td class="px-3 py-2 text-right whitespace-nowrap">
            {#if item.status === 'pengajuan'}
              <button onclick={() => store.setujuiKasbon(item.id)} class="text-xs mr-1.5" style="color:var(--accent)">Setujui</button>
              <button onclick={() => store.tolakKasbon(item.id)} class="text-xs" style="color:var(--danger)">Tolak</button>
            {:else if item.status === 'disetujui'}
              <button onclick={() => store.cairkanKasbon(item.id)} class="text-xs mr-1.5" style="color:var(--warn)">Cairkan</button>
              <button onclick={() => store.tolakKasbon(item.id)} class="text-xs" style="color:var(--danger)">Tolak</button>
            {:else if item.status === 'aktif'}
              <button onclick={() => store.bukaCicil(item)} class="text-xs mr-1.5" style="color:var(--info)">Cicil</button>
              {#if item.cicilan_per_bulan > 0}
                <button onclick={() => store.lihatJadwal(item)} class="text-xs mr-1.5" style="color:var(--text-dim)">Jadwal</button>
              {/if}
            {:else if item.status === 'ditolak' || item.status === 'lunas'}
              <button onclick={() => store.hapusKasbon(item.id)} class="text-xs" style="color:var(--danger)">Hapus</button>
            {/if}
          </td>
        {/if}
      </tr>
    {/each}
  {/snippet}
</DataTable>

<!-- ── Modal: Form Kasbon ───────────────────────────────────────────────────── -->
<SlideOver bind:open={store.modalKasbonOpen} title="Tambah Kasbon">
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); store.simpanKasbon() }} class="flex flex-col gap-3 text-sm">
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1 col-span-2">
        <label for="fk-karyw" class="text-xs" style="color:var(--text-dim)">KARYAWAN *</label>
        <Select id="fk-karyw" bind:value={store.formKasbon.karyawan_id} required
          options={store.karyawanList.map(k => ({ value: String(k.id), label: k.nama }))}
          placeholder="-- Pilih --" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fk-tgl" class="text-xs" style="color:var(--text-dim)">TGL PINJAM *</label>
        <input id="fk-tgl" type="date" bind:value={store.formKasbon.tanggal_pinjam} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fk-jml" class="text-xs" style="color:var(--text-dim)">JUMLAH *</label>
        <input id="fk-jml" type="number" min="1" bind:value={store.formKasbon.jumlah} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1 col-span-2">
        <label for="fk-cicil" class="text-xs" style="color:var(--text-dim)">CICILAN/BULAN (0 = tidak potong gaji otomatis)</label>
        <input id="fk-cicil" type="number" min="0" bind:value={store.formKasbon.cicilan_per_bulan}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1 col-span-2">
        <label for="fk-catatan" class="text-xs" style="color:var(--text-dim)">CATATAN</label>
        <input id="fk-catatan" bind:value={store.formKasbon.catatan} placeholder="Opsional"
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
    </div>
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => store.modalKasbonOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </form>
  {/snippet}
</SlideOver>

<!-- ── Modal: Bayar Cicilan ─────────────────────────────────────────────────── -->
<SlideOver bind:open={store.modalCicilOpen} title="Bayar Cicilan Kasbon">
  {#snippet children()}
  <div class="flex flex-col gap-3 text-sm">
    <div class="flex flex-col gap-1">
      <label for="cicil-jml" class="text-xs" style="color:var(--text-dim)">JUMLAH CICILAN</label>
      <input id="cicil-jml" type="number" min="1" bind:value={store.cicilJumlah}
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex justify-end gap-2 mt-1">
      <button onclick={() => store.modalCicilOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button onclick={store.simpanCicil} class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Bayar</button>
    </div>
  </div>
  {/snippet}
</SlideOver>

<!-- ── Modal: Jadwal Cicilan ────────────────────────────────────────────────── -->
<SlideOver bind:open={store.modalJadwalOpen} title="Jadwal Cicilan Kasbon">
  {#snippet children()}
  <div class="flex flex-col gap-3 text-sm">
    <p class="text-xs font-bold" style="color:var(--text-dim)">{store.jadwalCicilanNama}</p>
    {#if store.jadwalCicilanList.length === 0}
      <p class="text-xs" style="color:var(--text-dim)">Cicilan per bulan belum diset atau kasbon belum cair.</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-xs border-collapse">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              <th class="py-1 pr-3 text-left" style="color:var(--text-dim)">Bulan ke</th>
              <th class="py-1 pr-3 text-left" style="color:var(--text-dim)">Bulan</th>
              <th class="py-1 pr-3 text-right" style="color:var(--text-dim)">Cicilan</th>
              <th class="py-1 text-center" style="color:var(--text-dim)">Status</th>
            </tr>
          </thead>
          <tbody>
            {#each store.jadwalCicilanList as j (j.bulan_ke)}
              <tr style="border-bottom:1px solid var(--border);opacity:{j.sudah_lunas ? 0.5 : 1}">
                <td class="py-1 pr-3">{j.bulan_ke}</td>
                <td class="py-1 pr-3">{j.bulan}</td>
                <td class="py-1 pr-3 text-right">{rp(j.jumlah_cicil)}</td>
                <td class="py-1 text-center">
                  {#if j.sudah_lunas}
                    <span style="color:var(--accent)">✓ Lunas</span>
                  {:else}
                    <span style="color:var(--text-dim)">Belum</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
    <div class="flex justify-end mt-1">
      <button onclick={() => store.modalJadwalOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Tutup</button>
    </div>
  </div>
  {/snippet}
</SlideOver>
