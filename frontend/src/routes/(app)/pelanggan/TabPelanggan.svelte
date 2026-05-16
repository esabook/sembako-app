<script lang="ts">
  import { onMount } from 'svelte'
  import { api } from '$lib/utils/api.js'
  import Modal from '$lib/components/Modal.svelte'

  type Pelanggan = {
    id: number; kode_pelanggan: string; nama: string
    gender: 'pria' | 'wanita' | null
    tipe: 'eceran' | 'grosir' | 'langganan'
    kontak: string | null; alamat: string | null
    limit_piutang: number; saldo_piutang: number
    is_active: boolean
    kartu_id: number | null; no_kartu: string | null
    tier: 'reguler' | 'silver' | 'gold' | null
    poin: number | null; diskon_member: number | null
  }

  type KartuResult = {
    id: number; no_kartu: string
    tier: 'reguler' | 'silver' | 'gold'
    diskon_member: number; poin: number
  }

  const TIER_COLOR: Record<string, string> = {
    reguler: 'color:var(--text-dim)',
    silver:  'color:#b0b8c1',
    gold:    'color:#f5c518',
  }
  const TIER_LABEL: Record<string, string> = { reguler: 'Reguler', silver: 'Silver', gold: 'Gold' }

  function genderSymbol(g: string | null) {
    if (g === 'pria')   return '♂'
    if (g === 'wanita') return '♀'
    return ''
  }
  function genderColor(g: string | null) {
    if (g === 'pria')   return 'color:#40c4ff'
    if (g === 'wanita') return 'color:#ff80ab'
    return 'color:var(--text-dim)'
  }

  let plgList         = $state<Pelanggan[]>([])
  let plgQuery        = $state('')
  let plgLoading      = $state(false)
  let plgShowNonAktif = $state(false)

  let modalPlgOpen = $state(false)
  let editPlg      = $state<Pelanggan | null>(null)
  let formPlg      = $state({
    kode_pelanggan: '', nama: '',
    gender: '' as '' | 'pria' | 'wanita',
    tipe: 'eceran' as Pelanggan['tipe'],
    kontak: '', alamat: '', limit_piutang: '0',
  })
  let errPlg = $state('')

  // Modal assign kartu — searchable
  let modalAssignOpen    = $state(false)
  let assignTarget       = $state<Pelanggan | null>(null)
  let kartuSearchQ       = $state('')
  let kartuSearchResults = $state<KartuResult[]>([])
  let kartuSearchLoading = $state(false)
  let assignKartuId      = $state<number | null>(null)
  let assignKartuLabel   = $state('')
  let errAssign          = $state('')

  export async function muat() {
    plgLoading = true
    const aktifParam = plgShowNonAktif ? '0' : '1'
    const res = await api.get<Pelanggan[]>(`/pelanggan?q=${plgQuery}&aktif=${aktifParam}`)
    if (res.success) plgList = res.data
    plgLoading = false
  }

  onMount(muat)
  $effect(() => { plgQuery; plgShowNonAktif; muat() })

  function bukaTambahPlg() {
    editPlg = null
    formPlg = { kode_pelanggan: '', nama: '', gender: '', tipe: 'eceran', kontak: '', alamat: '', limit_piutang: '0' }
    errPlg = ''
    modalPlgOpen = true
  }

  function bukaEditPlg(p: Pelanggan) {
    editPlg = p
    formPlg = {
      kode_pelanggan: p.kode_pelanggan,
      nama: p.nama,
      gender: p.gender ?? '',
      tipe: p.tipe,
      kontak: p.kontak ?? '',
      alamat: p.alamat ?? '',
      limit_piutang: String(p.limit_piutang),
    }
    errPlg = ''
    modalPlgOpen = true
  }

  async function simpanPlg() {
    errPlg = ''
    if (!formPlg.kode_pelanggan.trim() || !formPlg.nama.trim()) { errPlg = 'Kode dan nama wajib diisi'; return }
    const payload = {
      kode_pelanggan: formPlg.kode_pelanggan.trim().toUpperCase(),
      nama: formPlg.nama.trim(),
      gender: formPlg.gender || undefined,
      tipe: formPlg.tipe,
      kontak: formPlg.kontak || undefined,
      alamat: formPlg.alamat || undefined,
      limit_piutang: Number(formPlg.limit_piutang) || 0,
    }
    const res = editPlg
      ? await api.put(`/pelanggan/${editPlg.id}`, payload)
      : await api.post('/pelanggan', payload)
    if (!res.success) { errPlg = (res as { success: false; error: string }).error; return }
    modalPlgOpen = false
    muat()
  }

  async function toggleAktifPlg(p: Pelanggan) {
    if (!confirm(`${p.is_active ? 'Nonaktifkan' : 'Aktifkan'} pelanggan "${p.nama}"?`)) return
    await api.put(`/pelanggan/${p.id}`, { is_active: !p.is_active })
    muat()
  }

  // ── Assign kartu: searchable dropdown ───────────────────────────────────
  async function bukaAssignKartu(p: Pelanggan) {
    assignTarget = p
    kartuSearchQ = ''
    kartuSearchResults = []
    assignKartuId = null
    assignKartuLabel = ''
    errAssign = ''
    modalAssignOpen = true
  }

  async function cariKartu() {
    if (kartuSearchQ.length < 3) { kartuSearchResults = []; return }
    kartuSearchLoading = true
    const res = await api.get<KartuResult[]>(`/kartu-anggota?status=available&q=${kartuSearchQ}`)
    if (res.success) kartuSearchResults = res.data
    kartuSearchLoading = false
  }

  function pilihKartu(k: KartuResult) {
    assignKartuId = k.id
    assignKartuLabel = `${k.no_kartu} · ${TIER_LABEL[k.tier]}${k.diskon_member > 0 ? ` · −${k.diskon_member}%` : ''}`
    kartuSearchResults = []
    kartuSearchQ = ''
  }

  async function simpanAssign() {
    errAssign = ''
    if (!assignTarget || !assignKartuId) { errAssign = 'Pilih kartu terlebih dahulu'; return }
    const res = await api.post(`/pelanggan/${assignTarget.id}/assign-kartu`, { kartu_id: assignKartuId })
    if (!res.success) { errAssign = (res as { success: false; error: string }).error; return }
    modalAssignOpen = false
    muat()
  }

  async function unassignKartu(p: Pelanggan) {
    if (!confirm(`Lepas kartu anggota dari "${p.nama}"? Kartu akan kembali tersedia.`)) return
    await api.delete(`/pelanggan/${p.id}/assign-kartu`)
    muat()
  }

  function rupiah(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
  }
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between flex-wrap gap-2">
    <div class="flex gap-2 flex-1 flex-wrap">
      <input
        bind:value={plgQuery}
        placeholder="Cari nama, kode, no. HP, atau no. kartu..."
        class="px-3 py-1.5 text-sm rounded border flex-1 min-w-52"
        style="background:var(--surface);border-color:var(--border);color:var(--text)"
      />
      <label class="flex items-center gap-1.5 text-sm cursor-pointer" style="color:var(--text-dim)">
        <input type="checkbox" bind:checked={plgShowNonAktif} />
        Non-aktif
      </label>
    </div>
    <button
      onclick={bukaTambahPlg}
      class="px-3 py-1.5 text-sm rounded font-medium"
      style="background:var(--accent);color:var(--bg)"
    >+ Tambah</button>
  </div>

  {#if plgLoading}
    <p class="text-sm" style="color:var(--text-dim)">Memuat...</p>
  {:else if plgList.length === 0}
    <p class="text-sm" style="color:var(--text-dim)">Belum ada pelanggan.</p>
  {:else}
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each plgList as p (p.id)}
        <div
          class="flex flex-col gap-2 rounded border p-3 text-sm"
          style="background:var(--surface);border-color:var(--border);{!p.is_active ? 'opacity:0.5' : ''}"
        >
          <!-- Kode + Tipe -->
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono text-xs" style="color:var(--text-dim)">{p.kode_pelanggan}</span>
            <span class="rounded px-1.5 py-0.5 text-xs" style="background:var(--surface2);color:var(--text-dim)">{p.tipe}</span>
          </div>

          <!-- Nama + Gender -->
          <div class="font-medium leading-tight">
            {p.nama}
            {#if p.gender}
              <span class="ml-1 text-xs" style="{genderColor(p.gender)}">{genderSymbol(p.gender)}</span>
            {/if}
          </div>

          <!-- Kontak + Piutang -->
          <div class="flex items-center justify-between gap-2 text-xs">
            <span style="color:var(--text-dim)">{p.kontak ?? '—'}</span>
            <span style="color:{p.saldo_piutang > 0 ? 'var(--warn)' : 'var(--text-dim)'}">
              {p.saldo_piutang > 0 ? rupiah(p.saldo_piutang) : '—'}
            </span>
          </div>

          <!-- Kartu Anggota -->
          {#if p.no_kartu}
            <div class="space-y-1 border-t pt-2" style="border-color:var(--border)">
              <p class="text-xs font-medium" style="color:var(--text-dim)">Kartu Anggota:</p>
              <div class="flex items-center justify-between text-xs">
                <span class="font-mono" style="color:var(--accent)">{p.no_kartu}</span>
                {#if p.diskon_member && p.diskon_member > 0}
                  <span style="color:var(--accent)">−{p.diskon_member}%</span>
                {:else}
                  <span style="color:var(--text-dim)">—</span>
                {/if}
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold" style="{TIER_COLOR[p.tier ?? 'reguler']}">{TIER_LABEL[p.tier ?? 'reguler']}</span>
                <span style="color:var(--info)">{p.poin ?? 0} poin</span>
              </div>
            </div>
          {/if}

          <!-- Aksi -->
          <div class="mt-auto flex flex-wrap items-center gap-1.5 border-t pt-2" style="border-color:var(--border)">
            <button
              onclick={() => bukaEditPlg(p)}
              class="rounded border px-2 py-1 text-xs transition-colors"
              style="border-color:var(--border);color:var(--text-dim)"
            >Edit</button>
            {#if p.no_kartu}
              <button
                onclick={() => unassignKartu(p)}
                class="rounded border px-2 py-1 text-xs transition-colors"
                style="border-color:var(--border);color:var(--danger)"
              >Lepas Kartu</button>
            {:else}
              <button
                onclick={() => bukaAssignKartu(p)}
                class="rounded border px-2 py-1 text-xs transition-colors"
                style="border-color:var(--border);color:var(--accent)"
              >+ Kartu</button>
            {/if}
            <button
              onclick={() => toggleAktifPlg(p)}
              class="ml-auto rounded border px-2 py-1 text-xs transition-colors"
              style="border-color:var(--border);color:{p.is_active ? 'var(--danger)' : 'var(--text-dim)'}"
            >{p.is_active ? 'Nonaktif' : 'Aktifkan'}</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- MODAL: Tambah/Edit Pelanggan -->
<Modal bind:open={modalPlgOpen} title={editPlg ? 'Edit Pelanggan' : 'Tambah Pelanggan'}>
  <div class="space-y-3">
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label for="plg-kode" class="block text-xs mb-1" style="color:var(--text-dim)">Kode * <span class="text-xs">(otomatis kapital)</span></label>
        <input
          id="plg-kode"
          bind:value={formPlg.kode_pelanggan}
          oninput={() => formPlg.kode_pelanggan = formPlg.kode_pelanggan.toUpperCase()}
          placeholder="PLG001"
          class="w-full px-3 py-1.5 text-sm rounded border uppercase"
          style="background:var(--surface);border-color:var(--border);color:var(--text)"
        />
      </div>
      <div>
        <label for="plg-tipe" class="block text-xs mb-1" style="color:var(--text-dim)">Tipe</label>
        <select id="plg-tipe" bind:value={formPlg.tipe} class="w-full px-3 py-1.5 text-sm rounded border"
          style="background:var(--surface);border-color:var(--border);color:var(--text)">
          <option value="eceran">Eceran</option>
          <option value="grosir">Grosir</option>
          <option value="langganan">Langganan</option>
        </select>
      </div>
    </div>
    <div>
      <label for="plg-nama" class="block text-xs mb-1" style="color:var(--text-dim)">Nama *</label>
      <input id="plg-nama" bind:value={formPlg.nama} placeholder="Nama pelanggan"
        class="w-full px-3 py-1.5 text-sm rounded border"
        style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    </div>
    <div>
      <p class="block text-xs mb-1" style="color:var(--text-dim)">Jenis Kelamin</p>
      <div class="flex gap-2">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label for="gender-pria" class="flex items-center gap-1.5 text-sm cursor-pointer px-3 py-1.5 rounded border flex-1 justify-center"
          style="border-color:var(--border);{formPlg.gender === 'pria' ? 'background:var(--surface2);border-color:var(--accent)' : ''}">
          <input id="gender-pria" type="radio" bind:group={formPlg.gender} value="pria" class="sr-only" />
          <span style="color:#40c4ff">♂</span> Pria
        </label>
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label for="gender-wanita" class="flex items-center gap-1.5 text-sm cursor-pointer px-3 py-1.5 rounded border flex-1 justify-center"
          style="border-color:var(--border);{formPlg.gender === 'wanita' ? 'background:var(--surface2);border-color:var(--accent)' : ''}">
          <input id="gender-wanita" type="radio" bind:group={formPlg.gender} value="wanita" class="sr-only" />
          <span style="color:#ff80ab">♀</span> Wanita
        </label>
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label for="gender-kosong" class="flex items-center gap-1.5 text-sm cursor-pointer px-3 py-1.5 rounded border flex-1 justify-center"
          style="border-color:var(--border);{formPlg.gender === '' ? 'background:var(--surface2)' : ''}">
          <input id="gender-kosong" type="radio" bind:group={formPlg.gender} value="" class="sr-only" />
          <span style="color:var(--text-dim)">Tidak diisi</span>
        </label>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label for="plg-kontak" class="block text-xs mb-1" style="color:var(--text-dim)">No. HP</label>
        <input id="plg-kontak" bind:value={formPlg.kontak} placeholder="08xx..."
          class="w-full px-3 py-1.5 text-sm rounded border"
          style="background:var(--surface);border-color:var(--border);color:var(--text)" />
      </div>
      <div>
        <label for="plg-limit" class="block text-xs mb-1" style="color:var(--text-dim)">Limit Piutang (Rp)</label>
        <input id="plg-limit" type="number" bind:value={formPlg.limit_piutang} min="0"
          class="w-full px-3 py-1.5 text-sm rounded border"
          style="background:var(--surface);border-color:var(--border);color:var(--text)" />
      </div>
    </div>
    <div>
      <label for="plg-alamat" class="block text-xs mb-1" style="color:var(--text-dim)">Alamat</label>
      <textarea id="plg-alamat" bind:value={formPlg.alamat} rows="2" placeholder="Opsional"
        class="w-full px-3 py-1.5 text-sm rounded border resize-none"
        style="background:var(--surface);border-color:var(--border);color:var(--text)"></textarea>
    </div>
    {#if errPlg}<p class="text-xs" style="color:var(--danger)">{errPlg}</p>{/if}
    <div class="flex justify-end gap-2 pt-1">
      <button onclick={() => (modalPlgOpen = false)} class="px-3 py-1.5 text-sm rounded border" style="border-color:var(--border);color:var(--text-dim)">Batal</button>
      <button onclick={simpanPlg} class="px-4 py-1.5 text-sm rounded font-medium" style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </div>
</Modal>

<!-- MODAL: Assign Kartu ke Pelanggan (searchable) -->
<Modal bind:open={modalAssignOpen} title="Assign Kartu — {assignTarget?.nama ?? ''}">
  <div class="space-y-3">
    {#if assignKartuId}
      <!-- Kartu sudah dipilih -->
      <div class="flex items-center justify-between p-2.5 rounded border" style="background:var(--surface2);border-color:var(--border)">
        <div class="text-sm">
          <span class="font-mono font-bold" style="color:var(--accent)">{assignKartuLabel.split(' · ')[0]}</span>
          <span class="ml-2 text-xs" style="color:var(--text-dim)">{assignKartuLabel.split(' · ').slice(1).join(' · ')}</span>
        </div>
        <button
          onclick={() => { assignKartuId = null; assignKartuLabel = '' }}
          class="text-xs px-2 py-0.5 rounded border"
          style="border-color:var(--border);color:var(--danger)"
        >Ganti</button>
      </div>
    {:else}
      <!-- Search kartu -->
      <div>
        <label for="plg-cari-kartu" class="block text-xs mb-1" style="color:var(--text-dim)">Cari No. Kartu (min. 3 digit)</label>
        <div class="relative">
          <input
            id="plg-cari-kartu"
            bind:value={kartuSearchQ}
            oninput={cariKartu}
            placeholder="Ketik min. 3 digit nomor kartu..."
            class="w-full px-3 py-1.5 text-sm rounded border"
            style="background:var(--surface);border-color:var(--border);color:var(--text)"
          />
          {#if kartuSearchLoading}
            <p class="text-xs mt-1" style="color:var(--text-dim)">Mencari...</p>
          {:else if kartuSearchResults.length > 0}
            <div class="absolute z-20 top-full left-0 right-0 mt-1 rounded border max-h-48 overflow-y-auto shadow-lg"
              style="background:var(--surface);border-color:var(--border)">
              {#each kartuSearchResults as k}
                <button
                  onclick={() => pilihKartu(k)}
                  class="w-full text-left px-3 py-2 text-xs border-t"
                  style="border-color:var(--border)"
                >
                  <span class="font-mono font-bold" style="color:var(--accent)">{k.no_kartu}</span>
                  <span class="ml-2 font-bold" style="{TIER_COLOR[k.tier]}">{TIER_LABEL[k.tier]}</span>
                  {#if k.diskon_member > 0}
                    <span class="ml-2" style="color:var(--accent)">−{k.diskon_member}%</span>
                  {/if}
                  <span class="ml-2" style="color:var(--info)">{k.poin} poin</span>
                </button>
              {/each}
            </div>
          {:else if kartuSearchQ.length >= 3}
            <p class="text-xs mt-1" style="color:var(--warn)">Tidak ada kartu tersedia dengan nomor tersebut.</p>
          {:else if kartuSearchQ.length > 0}
            <p class="text-xs mt-1" style="color:var(--text-dim)">Ketik minimal 3 digit untuk mencari.</p>
          {/if}
        </div>
      </div>
      <p class="text-xs" style="color:var(--text-dim)">Belum ada kartu? Generate dulu di tab Kartu Anggota.</p>
    {/if}
    {#if errAssign}<p class="text-xs" style="color:var(--danger)">{errAssign}</p>{/if}
    <div class="flex justify-end gap-2 pt-1">
      <button onclick={() => (modalAssignOpen = false)} class="px-3 py-1.5 text-sm rounded border" style="border-color:var(--border);color:var(--text-dim)">Batal</button>
      {#if assignKartuId}
        <button onclick={simpanAssign} class="px-4 py-1.5 text-sm rounded font-medium" style="background:var(--accent);color:var(--bg)">Assign</button>
      {/if}
    </div>
  </div>
</Modal>
