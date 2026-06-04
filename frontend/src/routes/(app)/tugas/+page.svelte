<svelte:head><title>Tugas — Stokasir</title></svelte:head>

<script lang="ts">
  import { onMount } from 'svelte'
  import { api } from '$lib/utils/api.js'
  import SlideOver from '$lib/components/SlideOver.svelte'
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte'
  import { user } from '$lib/stores/auth.js'

  type Item = { id: number; nama: string; kategori: string; urutan: number; is_active: boolean }
  type LogRow = {
    log_id: number | null; item_id: number; nama: string; kategori: string
    urutan: number; selesai: boolean | null; catatan: string | null; nama_karyawan: string | null
    tanggal: string | null
  }

  let tanggal = $state(new Date().toLocaleDateString('sv-SE'))
  let items = $state<Item[]>([])
  let logRows = $state<LogRow[]>([])
  let loading = $state(false)
  let tab = $state<'harian' | 'template'>('harian')

  // form template
  let formOpen = $state(false)
  let editItem = $state<Item | null>(null)
  let fNama = $state('')
  let fKategori = $state('kebersihan')
  let fUrutan = $state(0)

  let konfirmHapus = $state<{ buka: boolean; id: number | null }>({ buka: false, id: null })

  const isManager = $derived($user?.role === 'pemilik' || $user?.role === 'manajer')

  async function muatLog() {
    loading = true
    try {
      const r = await api.get<LogRow[]>(`/tugas/log?tanggal=${tanggal}`)
      if (r.success) logRows = r.data
    } finally { loading = false }
  }

  async function muatItems() {
    const r = await api.get<Item[]>('/tugas/item')
    if (r.success) items = r.data
  }

  async function tandai(itemId: number, selesai: boolean) {
    await api.post('/tugas/log/tandai', { item_id: itemId, selesai, tanggal })
    await muatLog()
  }

  function bukaFormTambah() {
    editItem = null; fNama = ''; fKategori = 'kebersihan'; fUrutan = 0
    formOpen = true
  }

  function bukaFormEdit(item: Item) {
    editItem = item; fNama = item.nama; fKategori = item.kategori; fUrutan = item.urutan
    formOpen = true
  }

  async function simpanItem() {
    if (!fNama.trim()) return
    if (editItem) {
      await api.put(`/tugas/item/${editItem.id}`, { nama: fNama, kategori: fKategori, urutan: fUrutan })
    } else {
      await api.post('/tugas/item', { nama: fNama, kategori: fKategori, urutan: fUrutan })
    }
    formOpen = false
    await muatItems()
  }

  async function hapusItem() {
    if (!konfirmHapus.id) return
    await api.delete(`/tugas/item/${konfirmHapus.id}`)
    konfirmHapus = { buka: false, id: null }
    await muatItems()
  }

  // grup logRows by kategori
  const grouped = $derived(() => {
    const m: Record<string, LogRow[]> = {}
    for (const r of logRows) {
      if (!m[r.kategori]) m[r.kategori] = []
      m[r.kategori].push(r)
    }
    return m
  })

  const totalSelesai = $derived(logRows.filter(r => r.selesai).length)
  const totalItem = $derived(logRows.length)
  const persen = $derived(totalItem > 0 ? Math.round((totalSelesai / totalItem) * 100) : 0)

  $effect(() => { if (tab === 'harian') { tanggal; muatLog() } })
  $effect(() => { if (tab === 'template') muatItems() })

  onMount(() => muatLog())
</script>

<div class="p-3 md:p-6 space-y-4">
  <div class="flex flex-wrap items-center justify-between gap-2">
    <h1 class="text-base md:text-lg font-bold" style="color:var(--text)">Tugas Harian</h1>
  </div>

  <!-- Tab -->
  <div class="flex gap-1 border-b" style="border-color:var(--border)">
    {#each [['harian','Checklist Hari Ini'],['template','Kelola Item']] as [key, label] (key)}
      <button
        onclick={() => tab = key as any}
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        style={tab === key
          ? 'border-color:var(--accent);color:var(--accent)'
          : 'border-color:transparent;color:var(--text-dim)'}
      >{label}</button>
    {/each}
  </div>

  {#if tab === 'harian'}
    <!-- Header harian -->
    <div class="flex flex-wrap items-center gap-3">
      <input type="date" bind:value={tanggal}
        class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
      <div class="flex items-center gap-2 flex-1">
        <div class="flex-1 h-3 rounded-full overflow-hidden" style="background:var(--surface2)">
          <div class="h-3 rounded-full transition-all" style="width:{persen}%;background:var(--accent)"></div>
        </div>
        <span class="text-sm font-medium whitespace-nowrap" style="color:var(--text-dim)">{totalSelesai}/{totalItem} ({persen}%)</span>
      </div>
    </div>

    {#if loading}
      <p class="text-sm" style="color:var(--text-dim)">Memuat...</p>
    {:else if logRows.length === 0}
      <div class="text-center py-12" style="color:var(--text-dim)">
        <p class="text-sm">Belum ada item tugas.</p>
        {#if isManager}
          <button onclick={() => { tab = 'template' }}
            class="mt-2 text-sm underline" style="color:var(--accent)">Tambah item di tab Kelola Item</button>
        {/if}
      </div>
    {:else}
      {#each Object.entries(grouped()) as [kat, rows] (kat)}
        <div class="space-y-2">
          <h3 class="text-xs font-semibold uppercase tracking-wider" style="color:var(--text-dim)">{kat}</h3>
          {#each rows as row (row.item_id)}
            <div class="flex items-center gap-3 p-3 rounded-lg border"
              style="background:var(--surface);border-color:var(--border)">
              <button
                onclick={() => tandai(row.item_id, !row.selesai)}
                class="w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                style={row.selesai
                  ? 'background:var(--accent);border-color:var(--accent)'
                  : 'background:transparent;border-color:var(--border)'}
              >
                {#if row.selesai}
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                {/if}
              </button>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium" style="color:var(--text);{row.selesai?'text-decoration:line-through;opacity:0.6':''}">{row.nama}</p>
                {#if row.nama_karyawan}
                  <p class="text-xs" style="color:var(--text-dim)">oleh {row.nama_karyawan}</p>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/each}
    {/if}

  {:else}
    <!-- Template management (pemilik/manajer only) -->
    {#if !isManager}
      <p class="text-sm" style="color:var(--text-dim)">Hanya pemilik/manajer yang bisa mengelola item tugas.</p>
    {:else}
      <div class="flex justify-end">
        <button onclick={bukaFormTambah}
          class="px-3 py-1.5 rounded text-sm font-medium text-white" style="background:var(--accent)">
          + Tambah Item
        </button>
      </div>

      {#if items.length === 0}
        <p class="text-sm text-center py-8" style="color:var(--text-dim)">Belum ada item tugas.</p>
      {:else}
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr style="border-bottom:1px solid var(--border)">
                <th class="text-left py-2 px-3 font-semibold" style="color:var(--text-dim)">Nama</th>
                <th class="text-left py-2 px-3 font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Kategori</th>
                <th class="text-left py-2 px-3 font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Urutan</th>
                <th class="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {#each items as item (item.id)}
                <tr style="border-bottom:1px solid var(--border)">
                  <td class="py-2 px-3" style="color:var(--text)">{item.nama}</td>
                  <td class="py-2 px-3 hidden sm:table-cell" style="color:var(--text-dim)">{item.kategori}</td>
                  <td class="py-2 px-3 hidden sm:table-cell" style="color:var(--text-dim)">{item.urutan}</td>
                  <td class="py-2 px-3">
                    <div class="flex gap-2 justify-end">
                      <button onclick={() => bukaFormEdit(item)} class="text-xs px-2 py-1 rounded" style="background:var(--surface2);color:var(--text)">Edit</button>
                      <button onclick={() => konfirmHapus = { buka: true, id: item.id }}
                        class="text-xs px-2 py-1 rounded" style="background:#fee2e2;color:#dc2626">Hapus</button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    {/if}
  {/if}
</div>

<!-- SlideOver form item -->
<SlideOver bind:open={formOpen} title={editItem ? 'Edit Item' : 'Tambah Item Tugas'}>
  {#snippet children()}
  <div class="space-y-4">
    <div>
      <label for="ft-nama" class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Nama Tugas *</label>
      <input id="ft-nama" bind:value={fNama} type="text" placeholder="Misal: Sapu lantai toko"
        class="w-full border rounded px-3 py-2 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    </div>
    <div>
      <label for="ft-kat" class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Kategori</label>
      <input id="ft-kat" bind:value={fKategori} type="text" placeholder="kebersihan / keamanan / dll"
        class="w-full border rounded px-3 py-2 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    </div>
    <div>
      <label for="ft-urutan" class="block text-sm font-medium mb-1" style="color:var(--text-dim)">Urutan</label>
      <input id="ft-urutan" bind:value={fUrutan} type="number" min="0"
        class="w-full border rounded px-3 py-2 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex gap-2 pt-2">
      <button onclick={() => formOpen = false}
        class="flex-1 py-2 rounded text-sm" style="background:var(--surface2);color:var(--text)">Batal</button>
      <button onclick={simpanItem}
        class="flex-1 py-2 rounded text-sm font-medium text-white" style="background:var(--accent)">Simpan</button>
    </div>
  </div>
  {/snippet}
</SlideOver>

<ConfirmDialog
  bind:open={konfirmHapus.buka}
  pesan="Hapus item tugas ini?"
  onkanan={hapusItem}
  onkiri={() => konfirmHapus = { buka: false, id: null }}
/>
