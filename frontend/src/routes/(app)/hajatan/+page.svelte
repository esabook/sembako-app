<svelte:head><title>Hajatan — Stokasir</title></svelte:head>

<script lang="ts">
  import { onMount } from 'svelte'
  import { api } from '$lib/utils/api.js'
  import SlideOver from '$lib/components/SlideOver.svelte'
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  type Acara = {
    id: number; nama_acara: string; nama_penyelenggara: string
    pelanggan_id: number | null; tanggal_acara: string
    alamat: string | null; estimasi_tamu: number | null
    catatan: string | null; status: string; total_order: number
  }

  const STATUS_COLOR: Record<string, string> = {
    persiapan: '#f59e0b', konfirmasi: '#3b82f6', selesai: '#10b981', batal: '#6b7280',
  }
  const STATUS_LABEL: Record<string, string> = {
    persiapan: 'Persiapan', konfirmasi: 'Konfirmasi', selesai: 'Selesai', batal: 'Batal',
  }

  let list = $state<Acara[]>([])
  let loading = $state(false)
  let filterStatus = $state('')
  let filterBulan = $state(new Date().toISOString().slice(0, 7))

  let formOpen = $state(false)
  let editRow = $state<Acara | null>(null)
  let fNamaAcara = $state('')
  let fNamaPenyelenggara = $state('')
  let fTanggal = $state('')
  let fAlamat = $state('')
  let fEstimasi = $state<number | ''>('')
  let fCatatan = $state('')
  let fStatus = $state('persiapan')
  let fTotalOrder = $state<number | ''>('')

  let konfirmHapus = $state<{ buka: boolean; id: number | null }>({ buka: false, id: null })

  async function muat() {
    loading = true
    try {
      const q = new URLSearchParams()
      if (filterBulan) {
        q.set('dari', `${filterBulan}-01`)
        q.set('sampai', `${filterBulan}-31`)
      }
      if (filterStatus) q.set('status', filterStatus)
      const r = await api.get<Acara[]>(`/hajatan?${q}`)
      if (r.success) list = r.data
    } finally { loading = false }
  }

  function bukaFormTambah() {
    editRow = null
    fNamaAcara = ''; fNamaPenyelenggara = ''; fTanggal = ''
    fAlamat = ''; fEstimasi = ''; fCatatan = ''; fStatus = 'persiapan'; fTotalOrder = ''
    formOpen = true
  }

  function bukaFormEdit(a: Acara) {
    editRow = a
    fNamaAcara = a.nama_acara; fNamaPenyelenggara = a.nama_penyelenggara
    fTanggal = a.tanggal_acara; fAlamat = a.alamat ?? ''
    fEstimasi = a.estimasi_tamu ?? ''; fCatatan = a.catatan ?? ''
    fStatus = a.status; fTotalOrder = a.total_order || ''
    formOpen = true
  }

  async function simpan() {
    if (!fNamaAcara.trim() || !fNamaPenyelenggara.trim() || !fTanggal) return
    const payload = {
      nama_acara: fNamaAcara.trim(),
      nama_penyelenggara: fNamaPenyelenggara.trim(),
      tanggal_acara: fTanggal,
      alamat: fAlamat || undefined,
      estimasi_tamu: fEstimasi !== '' ? Number(fEstimasi) : undefined,
      catatan: fCatatan || undefined,
      status: fStatus,
      total_order: fTotalOrder !== '' ? Number(fTotalOrder) : 0,
    }
    if (editRow) {
      await api.put(`/hajatan/${editRow.id}`, payload)
    } else {
      await api.post('/hajatan', payload)
    }
    formOpen = false
    await muat()
  }

  async function hapus() {
    if (!konfirmHapus.id) return
    await api.delete(`/hajatan/${konfirmHapus.id}`)
    konfirmHapus = { buka: false, id: null }
    await muat()
  }

  function fmt(n: number) {
    return n.toLocaleString('id-ID')
  }

  $effect(() => { filterStatus; filterBulan; muat() })
  onMount(muat)
</script>

<div class="p-3 md:p-6 space-y-4">
  <div class="flex flex-wrap items-center justify-between gap-2">
    <h1 class="text-base md:text-lg font-bold" style="color:var(--text)">Acara & Hajatan</h1>
    <button onclick={bukaFormTambah}
      class="px-3 py-1.5 rounded text-sm font-medium text-white" style="background:var(--accent)">
      + Tambah Acara
    </button>
  </div>

  <!-- Filter -->
  <div class="flex flex-wrap gap-2">
    <input type="month" bind:value={filterBulan}
      class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    <select bind:value={filterStatus}
      class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
      <option value="">Semua Status</option>
      {#each ['persiapan','konfirmasi','selesai','batal'] as s (s)}
        <option value={s}>{STATUS_LABEL[s]}</option>
      {/each}
    </select>
  </div>

  <!-- Ringkasan -->
  {#if list.length > 0}
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {#each ['persiapan','konfirmasi','selesai','batal'] as s (s)}
        {@const cnt = list.filter(x => x.status === s).length}
        <div class="rounded-lg p-3 border" style="background:var(--surface);border-color:var(--border)">
          <p class="text-xs" style="color:var(--text-dim)">{STATUS_LABEL[s]}</p>
          <p class="text-xl font-bold" style="color:{STATUS_COLOR[s]}">{cnt}</p>
        </div>
      {/each}
    </div>
  {/if}

  {#if loading}
    <div class="flex justify-center py-6"><Spinner /></div>
  {:else if list.length === 0}
    <p class="text-sm text-center py-12" style="color:var(--text-dim)">Belum ada acara.</p>
  {:else}
    <div class="space-y-3">
      {#each list as a (a.id)}
        <div class="rounded-lg border p-4" style="background:var(--surface);border-color:var(--border)">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-semibold text-sm" style="color:var(--text)">{a.nama_acara}</h3>
                <span class="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                  style="background:{STATUS_COLOR[a.status]}">{STATUS_LABEL[a.status]}</span>
              </div>
              <p class="text-xs mt-1" style="color:var(--text-dim)">
                Penyelenggara: <strong>{a.nama_penyelenggara}</strong>
                · {new Date(a.tanggal_acara).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}
              </p>
              {#if a.alamat}
                <p class="text-xs mt-0.5" style="color:var(--text-dim)">📍 {a.alamat}</p>
              {/if}
              <div class="flex flex-wrap gap-3 mt-1">
                {#if a.estimasi_tamu}
                  <span class="text-xs" style="color:var(--text-dim)">~{fmt(a.estimasi_tamu)} tamu</span>
                {/if}
                {#if a.total_order > 0}
                  <span class="text-xs font-medium" style="color:var(--accent)">Order: Rp {fmt(a.total_order)}</span>
                {/if}
              </div>
              {#if a.catatan}
                <p class="text-xs mt-1 italic" style="color:var(--text-dim)">{a.catatan}</p>
              {/if}
            </div>
            <div class="flex gap-2 flex-shrink-0">
              <button onclick={() => bukaFormEdit(a)}
                class="text-xs px-2 py-1 rounded" style="background:var(--surface2);color:var(--text)">Edit</button>
              <button onclick={() => konfirmHapus = { buka: true, id: a.id }}
                class="text-xs px-2 py-1 rounded" style="background:#fee2e2;color:#dc2626">Hapus</button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Form SlideOver -->
<SlideOver bind:open={formOpen} title={editRow ? 'Edit Acara' : 'Tambah Acara'}>
  {#snippet children()}
  <div class="space-y-4">
    <div>
      <label for="fh-nama" class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Nama Acara *</label>
      <input id="fh-nama" bind:value={fNamaAcara} type="text" placeholder="Pernikahan, Syukuran, dll"
        class="w-full border rounded px-3 py-2 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    </div>
    <div>
      <label for="fh-penyelenggara" class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Nama Penyelenggara *</label>
      <input id="fh-penyelenggara" bind:value={fNamaPenyelenggara} type="text" placeholder="Bpk/Ibu ..."
        class="w-full border rounded px-3 py-2 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    </div>
    <div>
      <label for="fh-tgl" class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Tanggal Acara *</label>
      <input id="fh-tgl" bind:value={fTanggal} type="date"
        class="w-full border rounded px-3 py-2 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    </div>
    <div>
      <label for="fh-alamat" class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Alamat</label>
      <input id="fh-alamat" bind:value={fAlamat} type="text"
        class="w-full border rounded px-3 py-2 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    </div>
    <div>
      <label for="fh-estimasi" class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Estimasi Tamu</label>
      <input id="fh-estimasi" bind:value={fEstimasi} type="number" min="0"
        class="w-full border rounded px-3 py-2 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    </div>
    <div>
      <label for="fh-total" class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Total Order (Rp)</label>
      <input id="fh-total" bind:value={fTotalOrder} type="number" min="0"
        class="w-full border rounded px-3 py-2 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    </div>
    <div>
      <p class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Status</p>
      <div class="flex flex-wrap gap-2">
        {#each ['persiapan','konfirmasi','selesai','batal'] as s (s)}
          <button onclick={() => fStatus = s}
            class="px-3 py-1.5 rounded text-sm border transition-colors"
            style={fStatus === s
              ? `background:${STATUS_COLOR[s]};color:white;border-color:${STATUS_COLOR[s]}`
              : 'background:var(--surface);color:var(--text-dim);border-color:var(--border)'}>
            {STATUS_LABEL[s]}
          </button>
        {/each}
      </div>
    </div>
    <div>
      <label for="fh-catatan" class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Catatan</label>
      <textarea id="fh-catatan" bind:value={fCatatan} rows="3"
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
  pesan="Hapus acara ini?"
  onkanan={hapus}
  onkiri={() => konfirmHapus = { buka: false, id: null }}
/>
