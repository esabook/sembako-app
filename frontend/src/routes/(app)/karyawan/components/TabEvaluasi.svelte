<script lang="ts">
  import SlideOver from '$lib/components/SlideOver.svelte'
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte'
  import { user } from '$lib/stores/auth.js'
  import type { createKaryawanStore } from '../karyawan.store.svelte.js'

  let { store }: { store: ReturnType<typeof createKaryawanStore> } = $props()
  let isManager = $derived($user && ['pemilik','manajer'].includes($user.role))

  $effect(() => { store.evalKaryawanId; store.evalPeriode; store.muatEval() })
</script>

<div class="flex flex-wrap gap-2 mb-3 items-end">
  <select bind:value={store.evalKaryawanId}
    class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
    <option value="">Semua Karyawan</option>
    {#each store.karyawanList as k (k.id)}
      <option value={String(k.id)}>{k.nama}</option>
    {/each}
  </select>
  <input type="month" bind:value={store.evalPeriode} placeholder="Periode"
    class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
  {#if isManager}
    <button onclick={() => store.bukaEvalForm()}
      class="px-3 py-1 rounded text-sm font-bold ml-auto" style="background:var(--accent);color:var(--bg)">+ Nilai</button>
  {/if}
</div>
<div class="overflow-x-auto">
  <table class="min-w-full text-sm">
    <thead><tr class="text-xs" style="color:var(--text-dim)">
      <th class="text-left py-2 pr-3">Karyawan</th>
      <th class="text-left py-2 pr-3">Periode</th>
      <th class="text-center py-2 pr-3">Nilai</th>
      <th class="text-left py-2 pr-3">Catatan</th>
      <th class="text-left py-2 pr-3">Tanggal</th>
      <th class="py-2"></th>
    </tr></thead>
    <tbody>
      {#each store.evalRows as row (row.id)}
        <tr class="border-t text-sm" style="border-color:var(--border)">
          <td class="py-2 pr-3 font-medium">{row.nama_karyawan}</td>
          <td class="py-2 pr-3">{row.periode}</td>
          <td class="py-2 pr-3 text-center">
            <span class="font-bold text-base" style="color:{row.nilai >= 4 ? 'var(--accent)' : row.nilai <= 2 ? 'var(--danger)' : 'var(--warn)'}">{'★'.repeat(row.nilai)}{'☆'.repeat(5-row.nilai)}</span>
          </td>
          <td class="py-2 pr-3 text-xs" style="color:var(--text-dim)">{row.catatan ?? '-'}</td>
          <td class="py-2 pr-3 text-xs">{row.tanggal}</td>
          <td class="py-2 text-right">
            {#if isManager}
              <button onclick={() => store.bukaEvalForm(row)} class="text-xs px-2 py-0.5 rounded mr-1" style="color:var(--text-dim);border:1px solid var(--border)">Edit</button>
              <button onclick={() => store.hapusEval(row.id)} class="text-xs px-2 py-0.5 rounded" style="color:var(--danger)">Hapus</button>
            {/if}
          </td>
        </tr>
      {/each}
      {#if !store.evalRows.length}
        <tr><td colspan="6" class="py-6 text-center text-sm" style="color:var(--text-dim)">Belum ada evaluasi</td></tr>
      {/if}
    </tbody>
  </table>
</div>

<!-- ── Modal: Form Evaluasi ──────────────────────────────────────────────────── -->
<SlideOver bind:open={store.evalFormOpen} title={store.editEvalId ? 'Edit Evaluasi' : 'Tambah Evaluasi'}>
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); store.simpanEval() }} class="flex flex-col gap-3 text-sm">
    <div class="flex flex-col gap-1">
      <label for="fe-karyw" class="text-xs" style="color:var(--text-dim)">KARYAWAN *</label>
      <select id="fe-karyw" bind:value={store.fEvalKaryawanId} required
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)">
        <option value="">-- Pilih --</option>
        {#each store.karyawanList as k (k.id)}
          <option value={String(k.id)}>{k.nama}</option>
        {/each}
      </select>
    </div>
    <div class="flex flex-col gap-1">
      <label for="fe-periode" class="text-xs" style="color:var(--text-dim)">PERIODE (YYYY-MM) *</label>
      <input id="fe-periode" type="month" bind:value={store.fEvalPeriode} required
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex flex-col gap-1">
      <span class="text-xs" style="color:var(--text-dim)">NILAI *</span>
      <div class="flex gap-1">
        {#each [1,2,3,4,5] as n (n)}
          <button type="button" onclick={() => store.fEvalNilai = String(n)}
            class="text-2xl leading-none transition-transform hover:scale-110"
            style="color:{Number(store.fEvalNilai) >= n ? 'var(--warn)' : 'var(--border)'}">
            ★
          </button>
        {/each}
        <span class="ml-2 text-sm self-center" style="color:var(--text-dim)">{store.fEvalNilai}/5</span>
      </div>
    </div>
    <div class="flex flex-col gap-1">
      <label for="fe-catatan" class="text-xs" style="color:var(--text-dim)">CATATAN</label>
      <textarea id="fe-catatan" bind:value={store.fEvalCatatan} rows="3" placeholder="Opsional"
        class="px-2 py-1 rounded border outline-none resize-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)"></textarea>
    </div>
    {#if store.evalError}
      <p class="text-xs" style="color:var(--danger)">{store.evalError}</p>
    {/if}
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => store.evalFormOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </form>
  {/snippet}
</SlideOver>

<ConfirmDialog
  bind:open={store.konfirmEvalBuka}
  judul="Hapus evaluasi?"
  pesan="Data evaluasi ini akan dihapus permanen."
  labelKanan="Hapus"
  warnaKanan="var(--danger)"
  onkiri={() => store.resetKonfirmEval()}
  onkanan={() => store.doHapusEval()}
/>
