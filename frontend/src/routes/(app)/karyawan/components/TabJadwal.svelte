<script lang="ts">
  import SlideOver from '$lib/components/SlideOver.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import Select from '$lib/components/ui/Select.svelte'
  import type { createKaryawanStore } from '../karyawan.store.svelte.js'
  import { DAY_LABELS } from '../karyawan.logic.js'

  let { store }: { store: ReturnType<typeof createKaryawanStore> } = $props()

  $effect(() => { store.weekStart; store.muatJadwal() })
</script>

<div class="flex items-center justify-between mb-2">
  <span class="text-sm font-bold" style="color:var(--text-dim)">TIPE SHIFT</span>
  <button onclick={() => store.bukaModalTipe()} class="text-xs px-2 py-1 rounded border"
    style="border-color:var(--border);color:var(--accent)">+ Tambah Tipe</button>
</div>
<div class="flex flex-wrap gap-2 mb-4">
  {#each store.tipeShiftList as ts (ts.id)}
    <div class="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold border"
      style="border-color:{ts.warna};color:{ts.warna}">
      <span>{ts.nama}</span>
      <span style="color:var(--text-dim);font-weight:normal">{ts.jam_mulai}–{ts.jam_selesai}</span>
      <button onclick={() => store.bukaModalTipe(ts)} class="ml-1 opacity-60 hover:opacity-100" title="Edit">✎</button>
      <button onclick={() => store.hapusTipe(ts.id)} class="opacity-60 hover:opacity-100" title="Hapus" style="color:var(--danger)">✕</button>
    </div>
  {/each}
  {#if store.tipeShiftList.length === 0}
    <p class="text-xs" style="color:var(--text-dim)">Belum ada tipe shift. Tambah dulu sebelum membuat jadwal.</p>
  {/if}
</div>

<div class="flex items-center gap-2 mb-3">
  <button onclick={store.prevWeek} class="px-2 py-1 rounded text-sm border"
    style="border-color:var(--border);color:var(--text-dim)">←</button>
  <button onclick={store.thisWeek} class="px-3 py-1 rounded text-xs border"
    style="border-color:var(--border);color:var(--text-dim)">Minggu Ini</button>
  <button onclick={store.nextWeek} class="px-2 py-1 rounded text-sm border"
    style="border-color:var(--border);color:var(--text-dim)">→</button>
  <span class="text-sm ml-1" style="color:var(--text)">{store.weekDays[0]} – {store.weekDays[6]}</span>
</div>

{#if store.loadingJadwal}
  <div class="flex justify-center py-6"><Spinner /></div>
{:else}
  <div class="overflow-x-auto rounded border" style="border-color:var(--border)">
    <table class="w-full text-xs border-collapse" style="min-width:680px">
      <thead>
        <tr style="background:var(--surface2)">
          <th class="px-3 py-2 text-left font-medium" style="color:var(--text-dim);min-width:120px">Karyawan</th>
          {#each store.weekDays as d, i (d)}
            <th class="px-2 py-2 text-center font-medium" style="color:var(--text-dim);min-width:90px">
              <span>{DAY_LABELS[i]}</span>
              <span class="block text-xs opacity-60">{d.slice(5)}</span>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each store.karyawanList as k (k.id)}
          <tr style="border-top:1px solid var(--border)">
            <td class="px-3 py-2 font-medium" style="color:var(--text)">{k.nama}</td>
            {#each store.weekDays as d (d)}
              {@const entries = store.jadwalUntuk(k.id, d)}
              <td class="px-1 py-1 text-center align-top" style="border-left:1px solid var(--border)">
                <div class="flex flex-col gap-1 items-center">
                  {#each entries as entry (entry.id)}
                    <div class="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-bold"
                      style="background:{entry.warna}22;color:{entry.warna};border:1px solid {entry.warna}">
                      <span>{entry.nama_shift}</span>
                      <button onclick={() => store.hapusJadwal(entry.id)} class="ml-0.5 opacity-50 hover:opacity-100 text-xs leading-none" title="Hapus">✕</button>
                    </div>
                  {/each}
                  {#if store.tipeShiftList.length > 0}
                    {#if store.assignCell?.karyawan_id === k.id && store.assignCell?.tanggal === d}
                      <div class="flex flex-col gap-0.5 p-1 rounded border z-10"
                        style="background:var(--surface);border-color:var(--border)">
                        {#each store.tipeShiftList as ts (ts.id)}
                          <button onclick={() => store.assignShift(k.id, d, ts.id)}
                            class="text-xs px-2 py-0.5 rounded text-left"
                            style="color:{ts.warna};background:{ts.warna}11">
                            {ts.nama}
                          </button>
                        {/each}
                        <button onclick={() => store.assignCell = null} class="text-xs mt-0.5" style="color:var(--text-dim)">Batal</button>
                      </div>
                    {:else}
                      <button onclick={() => store.assignCell = { karyawan_id: k.id, tanggal: d }}
                        class="text-xs w-6 h-6 rounded border opacity-30 hover:opacity-100"
                        style="border-color:var(--border);color:var(--text-dim)">+</button>
                    {/if}
                  {/if}
                </div>
              </td>
            {/each}
          </tr>
        {/each}
        {#if store.karyawanList.length === 0}
          <tr><td colspan="8" class="px-3 py-4 text-center text-xs" style="color:var(--text-dim)">Belum ada karyawan.</td></tr>
        {/if}
      </tbody>
    </table>
  </div>
{/if}

<div class="flex items-center justify-between mt-6 mb-2">
  <span class="text-sm font-bold" style="color:var(--text-dim)">PERMINTAAN TUKAR SHIFT</span>
  <button onclick={store.bukaFormTukar}
    class="text-xs px-2 py-1 rounded border" style="border-color:var(--border);color:var(--accent)">+ Ajukan Tukar</button>
</div>
{#if store.tukarList.length === 0}
  <p class="text-xs" style="color:var(--text-dim)">Tidak ada permintaan tukar shift.</p>
{:else}
  <div class="overflow-x-auto rounded border" style="border-color:var(--border)">
    <table class="w-full text-xs border-collapse">
      <thead>
        <tr style="background:var(--surface2)">
          <th class="px-3 py-2 text-left" style="color:var(--text-dim)">Pengaju</th>
          <th class="px-3 py-2 text-left" style="color:var(--text-dim)">Penerima</th>
          <th class="px-3 py-2 text-left" style="color:var(--text-dim)">Tanggal / Shift</th>
          <th class="px-3 py-2 text-left" style="color:var(--text-dim)">Alasan</th>
          <th class="px-3 py-2 text-left" style="color:var(--text-dim)">Status</th>
          <th class="px-3 py-2"></th>
        </tr>
      </thead>
      <tbody>
        {#each store.tukarList as t (t.id)}
          <tr style="border-top:1px solid var(--border)">
            <td class="px-3 py-2">{t.nama_pengaju}</td>
            <td class="px-3 py-2">{t.nama_penerima}</td>
            <td class="px-3 py-2">{t.tanggal_jadwal} <span style="color:var(--text-dim)">{t.nama_shift}</span></td>
            <td class="px-3 py-2" style="color:var(--text-dim)">{t.alasan ?? '—'}</td>
            <td class="px-3 py-2">
              <span class="font-bold" style="color:{t.status === 'disetujui' ? 'var(--accent)' : t.status === 'ditolak' ? 'var(--danger)' : 'var(--warn)'}">
                {t.status}
              </span>
            </td>
            <td class="px-3 py-2 text-right whitespace-nowrap">
              {#if t.status === 'menunggu'}
                <button onclick={() => store.setujuiTukar(t.id)} class="mr-1.5" style="color:var(--accent)">Setujui</button>
                <button onclick={() => store.tolakTukar(t.id)} style="color:var(--danger)">Tolak</button>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<!-- ── Modal: Form Tipe Shift ────────────────────────────────────────────────── -->
<SlideOver bind:open={store.modalTipeOpen} title={store.editTipe ? 'Edit Tipe Shift' : 'Tambah Tipe Shift'}>
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); store.simpanTipe() }} class="flex flex-col gap-3 text-sm">
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1 col-span-2">
        <label for="ft-nama" class="text-xs" style="color:var(--text-dim)">NAMA *</label>
        <input id="ft-nama" bind:value={store.formTipe.nama} required placeholder="mis. Pagi, Sore, Malam"
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="ft-mulai" class="text-xs" style="color:var(--text-dim)">JAM MULAI *</label>
        <input id="ft-mulai" type="time" bind:value={store.formTipe.jam_mulai} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="ft-selesai" class="text-xs" style="color:var(--text-dim)">JAM SELESAI *</label>
        <input id="ft-selesai" type="time" bind:value={store.formTipe.jam_selesai} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1 col-span-2">
        <label for="ft-warna" class="text-xs" style="color:var(--text-dim)">WARNA BADGE</label>
        <div class="flex items-center gap-2">
          <input id="ft-warna" type="color" bind:value={store.formTipe.warna}
            class="w-10 h-8 rounded border cursor-pointer"
            style="border-color:var(--border)" />
          <span class="text-xs px-2 py-1 rounded font-bold" style="color:{store.formTipe.warna};border:1px solid {store.formTipe.warna}">
            {store.formTipe.nama || 'Preview'}
          </span>
        </div>
      </div>
    </div>
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => store.modalTipeOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </form>
  {/snippet}
</SlideOver>

<!-- ── Modal: Ajukan Tukar Shift ─────────────────────────────────────────────── -->
<SlideOver bind:open={store.modalTukarOpen} title="Ajukan Tukar Shift">
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); store.ajukanTukar() }} class="flex flex-col gap-3 text-sm">
    <div class="flex flex-col gap-1">
      <label for="ftu-jadwal" class="text-xs" style="color:var(--text-dim)">JADWAL SAYA (yang ingin ditukar) *</label>
      <Select id="ftu-jadwal" bind:value={store.formTukar.jadwal_id} required
        options={store.jadwalSendiri.map(j => ({ value: String(j.id), label: j.tanggal + ' — ' + j.nama_shift }))}
        placeholder="-- Pilih Jadwal --"
      />
      {#if store.jadwalSendiri.length === 0}
        <p class="text-xs" style="color:var(--text-dim)">Tidak ada jadwal di minggu ini.</p>
      {/if}
    </div>
    <div class="flex flex-col gap-1">
      <label for="ftu-penerima" class="text-xs" style="color:var(--text-dim)">DITUKAR DENGAN *</label>
      <Select id="ftu-penerima" bind:value={store.formTukar.penerima_id} required
        options={store.karyawanList.filter(k => k.id !== store.userId).map(k => ({ value: String(k.id), label: k.nama }))}
        placeholder="-- Pilih Karyawan --"
      />
    </div>
    <div class="flex flex-col gap-1">
      <label for="ftu-alasan" class="text-xs" style="color:var(--text-dim)">ALASAN</label>
      <input id="ftu-alasan" bind:value={store.formTukar.alasan} placeholder="Opsional"
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => store.modalTukarOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Kirim</button>
    </div>
  </form>
  {/snippet}
</SlideOver>
