<script lang="ts">
  import { onMount } from 'svelte'
  import { api } from '$lib/utils/api.js'
  import SlideOver from '$lib/components/SlideOver.svelte'
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte'

  type Inspeksi = {
    id: number; tanggal: string; jenis: string; area: string | null
    temuan: string | null; tindakan: string | null; nilai: number | null
    status: string; catatan: string | null; nama_petugas: string | null
  }

  const JENIS_LABEL: Record<string, string> = {
    rutin: 'Rutin', mendadak: 'Mendadak', bulanan: 'Bulanan', tahunan: 'Tahunan',
  }
  const JENIS_COLOR: Record<string, string> = {
    rutin: '#3b82f6', mendadak: '#ef4444', bulanan: '#8b5cf6', tahunan: '#10b981',
  }

  function nilaiColor(n: number) {
    if (n >= 80) return '#10b981'
    if (n >= 60) return '#f59e0b'
    return '#ef4444'
  }

  let list = $state<Inspeksi[]>([])
  let loading = $state(false)
  let filterBulan = $state(new Date().toISOString().slice(0, 7))
  let filterJenis = $state('')
  let filterStatus = $state('')

  let formOpen = $state(false)
  let editRow = $state<Inspeksi | null>(null)
  let fTanggal = $state('')
  let fJenis = $state<string>('rutin')
  let fArea = $state('')
  let fTemuan = $state('')
  let fTindakan = $state('')
  let fNilai = $state<number | ''>('')
  let fStatus = $state('draft')
  let fCatatan = $state('')

  let konfirmHapus = $state<{ buka: boolean; id: number | null }>({ buka: false, id: null })

  async function muat() {
    loading = true
    try {
      const q = new URLSearchParams()
      if (filterBulan) { q.set('dari', `${filterBulan}-01`); q.set('sampai', `${filterBulan}-31`) }
      if (filterJenis) q.set('jenis', filterJenis)
      if (filterStatus) q.set('status', filterStatus)
      const r = await api.get<Inspeksi[]>(`/inspeksi?${q}`)
      if (r.success) list = r.data
    } finally { loading = false }
  }

  function bukaFormTambah() {
    editRow = null
    fTanggal = new Date().toLocaleDateString('sv-SE')
    fJenis = 'rutin'; fArea = ''; fTemuan = ''; fTindakan = ''
    fNilai = ''; fStatus = 'draft'; fCatatan = ''
    formOpen = true
  }

  function bukaFormEdit(row: Inspeksi) {
    editRow = row
    fTanggal = row.tanggal; fJenis = row.jenis
    fArea = row.area ?? ''; fTemuan = row.temuan ?? ''
    fTindakan = row.tindakan ?? ''; fNilai = row.nilai ?? ''
    fStatus = row.status; fCatatan = row.catatan ?? ''
    formOpen = true
  }

  async function simpan() {
    if (!fTanggal) return
    const payload = {
      tanggal: fTanggal, jenis: fJenis,
      area: fArea || undefined, temuan: fTemuan || undefined,
      tindakan: fTindakan || undefined,
      nilai: fNilai !== '' ? Number(fNilai) : undefined,
      status: fStatus, catatan: fCatatan || undefined,
    }
    if (editRow) {
      await api.put(`/inspeksi/${editRow.id}`, payload)
    } else {
      await api.post('/inspeksi', payload)
    }
    formOpen = false
    await muat()
  }

  async function hapus() {
    if (!konfirmHapus.id) return
    await api.delete(`/inspeksi/${konfirmHapus.id}`)
    konfirmHapus = { buka: false, id: null }
    await muat()
  }

  $effect(() => { filterBulan; filterJenis; filterStatus; muat() })
  onMount(muat)
</script>

<div class="p-3 md:p-6 space-y-4">
  <div class="flex flex-wrap items-center justify-between gap-2">
    <h1 class="text-base md:text-lg font-bold" style="color:var(--text)">Inspeksi Toko</h1>
    <button onclick={bukaFormTambah}
      class="px-3 py-1.5 rounded text-sm font-medium text-white" style="background:var(--accent)">
      + Catat Inspeksi
    </button>
  </div>

  <!-- Filter -->
  <div class="flex flex-wrap gap-2">
    <input type="month" bind:value={filterBulan}
      class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    <select bind:value={filterJenis}
      class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
      <option value="">Semua Jenis</option>
      {#each Object.entries(JENIS_LABEL) as [k, v] (k)}
        <option value={k}>{v}</option>
      {/each}
    </select>
    <select bind:value={filterStatus}
      class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
      <option value="">Semua Status</option>
      <option value="draft">Draft</option>
      <option value="selesai">Selesai</option>
    </select>
  </div>

  <!-- Rata-rata nilai bulan ini -->
  {#if list.filter(x => x.nilai !== null).length > 0}
    {@const avg = Math.round(list.filter(x => x.nilai !== null).reduce((s, x) => s + (x.nilai ?? 0), 0) / list.filter(x => x.nilai !== null).length)}
    <div class="flex items-center gap-3 p-3 rounded-lg border" style="background:var(--surface);border-color:var(--border)">
      <div class="text-3xl font-bold" style="color:{nilaiColor(avg)}">{avg}</div>
      <div>
        <p class="text-sm font-medium" style="color:var(--text)">Rata-rata Nilai</p>
        <p class="text-xs" style="color:var(--text-dim)">{list.filter(x => x.nilai !== null).length} inspeksi dengan nilai</p>
      </div>
    </div>
  {/if}

  {#if loading}
    <p class="text-sm" style="color:var(--text-dim)">Memuat...</p>
  {:else if list.length === 0}
    <p class="text-sm text-center py-12" style="color:var(--text-dim)">Belum ada catatan inspeksi.</p>
  {:else}
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr style="border-bottom:1px solid var(--border)">
            <th class="text-left py-2 px-3 font-semibold" style="color:var(--text-dim)">Tanggal</th>
            <th class="text-left py-2 px-3 font-semibold" style="color:var(--text-dim)">Jenis</th>
            <th class="text-left py-2 px-3 font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Area</th>
            <th class="text-left py-2 px-3 font-semibold hidden md:table-cell" style="color:var(--text-dim)">Petugas</th>
            <th class="text-left py-2 px-3 font-semibold" style="color:var(--text-dim)">Nilai</th>
            <th class="text-left py-2 px-3 font-semibold" style="color:var(--text-dim)">Status</th>
            <th class="py-2 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {#each list as row (row.id)}
            <tr style="border-bottom:1px solid var(--border)">
              <td class="py-2 px-3" style="color:var(--text)">
                {new Date(row.tanggal).toLocaleDateString('id-ID', { day:'numeric', month:'short' })}
              </td>
              <td class="py-2 px-3">
                <span class="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                  style="background:{JENIS_COLOR[row.jenis]}">{JENIS_LABEL[row.jenis]}</span>
              </td>
              <td class="py-2 px-3 hidden sm:table-cell" style="color:var(--text-dim)">{row.area ?? '—'}</td>
              <td class="py-2 px-3 hidden md:table-cell" style="color:var(--text-dim)">{row.nama_petugas ?? '—'}</td>
              <td class="py-2 px-3">
                {#if row.nilai !== null}
                  <span class="text-sm font-bold" style="color:{nilaiColor(row.nilai)}">{row.nilai}</span>
                {:else}
                  <span style="color:var(--text-dim)">—</span>
                {/if}
              </td>
              <td class="py-2 px-3">
                <span class="text-xs px-2 py-0.5 rounded-full"
                  style={row.status === 'selesai'
                    ? 'background:#d1fae5;color:#059669'
                    : 'background:#fef3c7;color:#d97706'}>
                  {row.status === 'selesai' ? 'Selesai' : 'Draft'}
                </span>
              </td>
              <td class="py-2 px-3">
                <div class="flex gap-2 justify-end">
                  <button onclick={() => bukaFormEdit(row)}
                    class="text-xs px-2 py-1 rounded" style="background:var(--surface2);color:var(--text)">Edit</button>
                  <button onclick={() => konfirmHapus = { buka: true, id: row.id }}
                    class="text-xs px-2 py-1 rounded" style="background:#fee2e2;color:#dc2626">Hapus</button>
                </div>
              </td>
            </tr>
            {#if row.temuan || row.tindakan}
              <tr style="border-bottom:1px solid var(--border)">
                <td colspan="7" class="pb-2 px-3">
                  {#if row.temuan}
                    <p class="text-xs" style="color:var(--text-dim)"><strong>Temuan:</strong> {row.temuan}</p>
                  {/if}
                  {#if row.tindakan}
                    <p class="text-xs" style="color:var(--text-dim)"><strong>Tindakan:</strong> {row.tindakan}</p>
                  {/if}
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<SlideOver bind:open={formOpen} title={editRow ? 'Edit Inspeksi' : 'Catat Inspeksi'}>
  {#snippet children()}
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Tanggal *</label>
      <input bind:value={fTanggal} type="date"
        class="w-full border rounded px-3 py-2 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    </div>
    <div>
      <label class="block text-sm font-medium mb-2" style="color:var(--text-dim)">Jenis Inspeksi</label>
      <div class="flex flex-wrap gap-2">
        {#each Object.entries(JENIS_LABEL) as [k, v] (k)}
          <button onclick={() => fJenis = k}
            class="px-3 py-1.5 rounded text-sm border transition-colors"
            style={fJenis === k
              ? `background:${JENIS_COLOR[k]};color:white;border-color:${JENIS_COLOR[k]}`
              : 'background:var(--surface);color:var(--text-dim);border-color:var(--border)'}>
            {v}
          </button>
        {/each}
      </div>
    </div>
    <div>
      <label class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Area yang Diperiksa</label>
      <input bind:value={fArea} type="text" placeholder="Gudang, Kasir, Toilet, dll"
        class="w-full border rounded px-3 py-2 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    </div>
    <div>
      <label class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Temuan</label>
      <textarea bind:value={fTemuan} rows="3" placeholder="Masalah atau kondisi yang ditemukan"
        class="w-full border rounded px-3 py-2 text-sm resize-none" style="background:var(--surface);border-color:var(--border);color:var(--text)"></textarea>
    </div>
    <div>
      <label class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Tindakan</label>
      <textarea bind:value={fTindakan} rows="2" placeholder="Tindakan yang sudah/akan dilakukan"
        class="w-full border rounded px-3 py-2 text-sm resize-none" style="background:var(--surface);border-color:var(--border);color:var(--text)"></textarea>
    </div>
    <div>
      <label class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Nilai (1–100)</label>
      <input bind:value={fNilai} type="number" min="1" max="100"
        class="w-full border rounded px-3 py-2 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    </div>
    <div>
      <label class="block text-sm font-medium mb-2" style="color:var(--text-dim)">Status</label>
      <div class="flex gap-2">
        {#each [['draft','Draft','#f59e0b'],['selesai','Selesai','#10b981']] as [k, v, color] (k)}
          <button onclick={() => fStatus = k}
            class="flex-1 py-1.5 rounded text-sm border transition-colors"
            style={fStatus === k
              ? `background:${color};color:white;border-color:${color}`
              : 'background:var(--surface);color:var(--text-dim);border-color:var(--border)'}>
            {v}
          </button>
        {/each}
      </div>
    </div>
    <div>
      <label class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Catatan</label>
      <textarea bind:value={fCatatan} rows="2"
        class="w-full border rounded px-3 py-2 text-sm resize-none" style="background:var(--surface);border-color:var(--border);color:var(--text)"></textarea>
    </div>
    <div class="flex gap-2 pt-2">
      <button onclick={() => formOpen = false}
        class="flex-1 py-2 rounded text-sm" style="background:var(--surface2);color:var(--text)">Batal</button>
      <button onclick={simpan}
        class="flex-1 py-2 rounded text-sm font-medium text-white" style="background:var(--accent)">Simpan</button>
    </div>
  </div>
  {/snippet}
</SlideOver>

<ConfirmDialog
  bind:open={konfirmHapus.buka}
  pesan="Hapus catatan inspeksi ini?"
  onkanan={hapus}
  onkiri={() => konfirmHapus = { buka: false, id: null }}
/>
