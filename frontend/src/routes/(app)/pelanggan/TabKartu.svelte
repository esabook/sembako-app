<script lang="ts">
  import { api } from '$lib/utils/api.js'
  import Modal from '$lib/components/Modal.svelte'

  type Kartu = {
    id: number; no_kartu: string
    tier: 'reguler' | 'silver' | 'gold'
    diskon_member: number; poin: number
    pelanggan_id: number | null; is_active: boolean
    pelanggan_nama: string | null; pelanggan_kode: string | null
  }

  type Pelanggan = {
    id: number; nama: string; kode_pelanggan: string
    gender: 'pria' | 'wanita' | null
    kontak: string | null; no_kartu: string | null
  }

  const TIER_COLOR: Record<string, string> = {
    reguler: 'color:var(--text-dim)',
    silver:  'color:#b0b8c1',
    gold:    'color:#f5c518',
  }
  const TIER_LABEL: Record<string, string> = { reguler: 'Reguler', silver: 'Silver', gold: 'Gold' }

  let kartuList    = $state<Kartu[]>([])
  let kartuQuery   = $state('')
  let kartuFilter  = $state<'semua' | 'assigned' | 'available'>('semua')
  let kartuLoading = $state(false)
  let viewMode     = $state<'grid' | 'list'>('grid')

  let modalGenerateOpen = $state(false)
  let formGenerate      = $state({ tier: 'reguler' as Kartu['tier'], diskon_member: '0', jumlah: '1' })
  let errGenerate       = $state('')

  let modalEditKartuOpen = $state(false)
  let editKartu          = $state<Kartu | null>(null)
  let formEditKartu      = $state({ tier: 'reguler' as Kartu['tier'], diskon_member: '0' })
  let errEditKartu       = $state('')

  let modalPoinOpen = $state(false)
  let poinTarget    = $state<Kartu | null>(null)
  let formPoin      = $state({ delta: '', mode: 'tambah' as 'tambah' | 'kurang' })
  let errPoin       = $state('')

  let modalAssignKartuOpen  = $state(false)
  let assignKartuTarget     = $state<Kartu | null>(null)
  let plgSearchQ            = $state('')
  let plgSearchResults      = $state<Pelanggan[]>([])
  let plgSearchLoading      = $state(false)
  let assignPlgId           = $state<number | null>(null)
  let assignPlgLabel        = $state('')
  let errAssignKartu        = $state('')

  export async function muat() {
    kartuLoading = true
    const statusParam = kartuFilter === 'semua' ? '' : `&status=${kartuFilter}`
    const res = await api.get<Kartu[]>(`/kartu-anggota?q=${kartuQuery}${statusParam}`)
    if (res.success) kartuList = res.data
    kartuLoading = false
  }

  $effect(() => { kartuQuery; kartuFilter; muat() })

  function bukaGenerate() {
    formGenerate = { tier: 'reguler', diskon_member: '0', jumlah: '1' }
    errGenerate = ''
    modalGenerateOpen = true
  }

  async function simpanGenerate() {
    errGenerate = ''
    const jumlah = Number(formGenerate.jumlah)
    if (!jumlah || jumlah < 1) { errGenerate = 'Jumlah minimal 1'; return }
    const res = await api.post('/kartu-anggota/generate', { tier: formGenerate.tier, diskon_member: Number(formGenerate.diskon_member) || 0, jumlah })
    if (!res.success) { errGenerate = (res as { success: false; error: string }).error; return }
    modalGenerateOpen = false
    muat()
  }

  function bukaEditKartu(k: Kartu) {
    editKartu = k
    formEditKartu = { tier: k.tier, diskon_member: String(k.diskon_member) }
    errEditKartu = ''
    modalEditKartuOpen = true
  }

  async function simpanEditKartu() {
    errEditKartu = ''
    if (!editKartu) return
    const res = await api.put(`/kartu-anggota/${editKartu.id}`, { tier: formEditKartu.tier, diskon_member: Number(formEditKartu.diskon_member) || 0 })
    if (!res.success) { errEditKartu = (res as { success: false; error: string }).error; return }
    modalEditKartuOpen = false
    muat()
  }

  function bukaPoin(k: Kartu) {
    poinTarget = k
    formPoin = { delta: '', mode: 'tambah' }
    errPoin = ''
    modalPoinOpen = true
  }

  async function simpanPoin() {
    errPoin = ''
    if (!poinTarget) return
    const delta = Number(formPoin.delta)
    if (!delta || delta <= 0) { errPoin = 'Jumlah harus lebih dari 0'; return }
    const res = await api.patch(`/kartu-anggota/${poinTarget.id}/poin`, { delta: formPoin.mode === 'tambah' ? delta : -delta })
    if (!res.success) { errPoin = (res as { success: false; error: string }).error; return }
    modalPoinOpen = false
    muat()
  }

  async function bukaAssignKartu(k: Kartu) {
    assignKartuTarget = k
    plgSearchQ = ''
    plgSearchResults = []
    assignPlgId = null
    assignPlgLabel = ''
    errAssignKartu = ''
    modalAssignKartuOpen = true
  }

  async function cariPelanggan() {
    if (plgSearchQ.length < 2) { plgSearchResults = []; return }
    plgSearchLoading = true
    const res = await api.get<Pelanggan[]>(`/pelanggan?q=${plgSearchQ}&aktif=1`)
    if (res.success) plgSearchResults = (res.data as Pelanggan[]).filter(p => !p.no_kartu)
    plgSearchLoading = false
  }

  function pilihPelanggan(p: Pelanggan) {
    assignPlgId = p.id
    const sym = p.gender === 'pria' ? ' ♂' : p.gender === 'wanita' ? ' ♀' : ''
    assignPlgLabel = `${p.nama}${sym} (${p.kode_pelanggan})`
    plgSearchResults = []
    plgSearchQ = ''
  }

  async function simpanAssignKartu() {
    errAssignKartu = ''
    if (!assignKartuTarget || !assignPlgId) { errAssignKartu = 'Pilih pelanggan terlebih dahulu'; return }
    const res = await api.post(`/kartu-anggota/${assignKartuTarget.id}/assign`, { pelanggan_id: assignPlgId })
    if (!res.success) { errAssignKartu = (res as { success: false; error: string }).error; return }
    modalAssignKartuOpen = false
    muat()
  }

  async function unassignKartu(k: Kartu) {
    if (!confirm(`Lepas kartu ${k.no_kartu} dari "${k.pelanggan_nama}"?`)) return
    await api.delete(`/kartu-anggota/${k.id}/assign`)
    muat()
  }

  async function nonaktifkanKartu(k: Kartu) {
    if (!confirm(`Nonaktifkan kartu ${k.no_kartu}? Kartu akan dilepas dari pelanggan jika ada.`)) return
    await api.delete(`/kartu-anggota/${k.id}`)
    muat()
  }
</script>

<!-- action bar -->
<div class="space-y-3">
  <div class="flex items-center gap-2">
    <input
      bind:value={kartuQuery}
      placeholder="Cari nomor kartu..."
      class="px-3 py-1.5 text-sm rounded border flex-1 min-w-0 outline-none"
      style="background:var(--surface);border-color:var(--border);color:var(--text)"
    />
    <div class="flex items-center gap-1.5 shrink-0">
      <select
        bind:value={kartuFilter}
        class="px-2 py-1.5 text-sm rounded border"
        style="background:var(--surface);border-color:var(--border);color:var(--text)"
      >
        <option value="semua">Semua</option>
        <option value="available">Tersedia</option>
        <option value="assigned">Assigned</option>
      </select>
      <button
        onclick={() => (viewMode = 'grid')}
        title="Tampilan grid"
        class="p-1.5 rounded border transition-colors"
        style="{viewMode === 'grid' ? 'background:var(--surface2);border-color:var(--accent);color:var(--accent)' : 'border-color:var(--border);color:var(--text-dim)'}"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <rect x="0" y="0" width="6" height="6" rx="1"/><rect x="8" y="0" width="6" height="6" rx="1"/>
          <rect x="0" y="8" width="6" height="6" rx="1"/><rect x="8" y="8" width="6" height="6" rx="1"/>
        </svg>
      </button>
      <button
        onclick={() => (viewMode = 'list')}
        title="Tampilan list"
        class="p-1.5 rounded border transition-colors"
        style="{viewMode === 'list' ? 'background:var(--surface2);border-color:var(--accent);color:var(--accent)' : 'border-color:var(--border);color:var(--text-dim)'}"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <rect x="0" y="1" width="14" height="2" rx="1"/><rect x="0" y="6" width="14" height="2" rx="1"/>
          <rect x="0" y="11" width="14" height="2" rx="1"/>
        </svg>
      </button>
      <button
        onclick={bukaGenerate}
        class="px-3 py-1.5 text-sm rounded font-medium whitespace-nowrap"
        style="background:var(--accent);color:var(--bg)"
      >+ Generate</button>
    </div>
  </div>

  {#if kartuLoading}
    <p class="text-sm" style="color:var(--text-dim)">Memuat...</p>
  {:else if kartuList.length === 0}
    <p class="text-sm" style="color:var(--text-dim)">Belum ada kartu. Klik "Generate Kartu" untuk membuat.</p>
  {:else if viewMode === 'grid'}
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each kartuList as k (k.id)}
        <div
          class="flex flex-col gap-2 rounded border p-3 text-sm"
          style="background:var(--surface);border-color:var(--border)"
        >
          <!-- No. Kartu + Tier -->
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono font-bold tracking-widest" style="color:var(--accent)">{k.no_kartu}</span>
            <span class="font-bold text-xs" style="{TIER_COLOR[k.tier]}">{TIER_LABEL[k.tier]}</span>
          </div>

          <!-- Diskon + Poin -->
          <div class="flex items-center justify-between text-xs">
            <span style="color:{k.diskon_member > 0 ? 'var(--accent)' : 'var(--text-dim)'}">
              {k.diskon_member > 0 ? `−${k.diskon_member}%` : '—'}
            </span>
            <span style="color:var(--info)">{k.poin} poin</span>
          </div>

          <!-- Pelanggan / Tersedia -->
          <div class="flex items-center justify-between gap-2 border-t pt-2 text-xs" style="border-color:var(--border)">
            {#if k.pelanggan_nama}
              <div class="min-w-0">
                <div class="truncate font-medium" style="color:var(--text)">{k.pelanggan_nama}</div>
                <div class="font-mono" style="color:var(--text-dim)">{k.pelanggan_kode}</div>
              </div>
              <button
                onclick={() => unassignKartu(k)}
                class="shrink-0 rounded border px-2 py-1 transition-colors"
                style="border-color:var(--border);color:var(--warn)"
              >Lepas</button>
            {:else}
              <span class="rounded px-1.5 py-0.5" style="background:var(--surface2);color:var(--accent)">Tersedia</span>
              <button
                onclick={() => bukaAssignKartu(k)}
                class="shrink-0 rounded border px-2 py-1 transition-colors"
                style="border-color:var(--border);color:var(--accent)"
              >Assign</button>
            {/if}
          </div>

          <!-- Aksi bawah -->
          <div class="flex items-center gap-1.5 border-t pt-2" style="border-color:var(--border)">
            <button
              onclick={() => bukaEditKartu(k)}
              class="rounded border px-2 py-1 text-xs transition-colors"
              style="border-color:var(--border);color:var(--text-dim)"
            >Edit</button>
            <button
              onclick={() => bukaPoin(k)}
              class="rounded border px-2 py-1 text-xs transition-colors"
              style="border-color:var(--border);color:var(--info)"
            >Poin</button>
            <button
              onclick={() => nonaktifkanKartu(k)}
              class="ml-auto rounded border px-2 py-1 text-xs transition-colors"
              style="border-color:var(--border);color:var(--danger)"
            >Nonaktif</button>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="rounded border overflow-x-auto" style="border-color:var(--border)">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr style="background:var(--surface2)">
            <th class="text-left px-3 py-2 text-xs font-medium" style="color:var(--text-dim)">No. Kartu</th>
            <th class="text-left px-3 py-2 text-xs font-medium" style="color:var(--text-dim)">Tier</th>
            <th class="text-right px-3 py-2 text-xs font-medium" style="color:var(--text-dim)">Diskon</th>
            <th class="text-right px-3 py-2 text-xs font-medium" style="color:var(--text-dim)">Poin</th>
            <th class="text-left px-3 py-2 text-xs font-medium" style="color:var(--text-dim)">Pelanggan</th>
            <th class="text-right px-3 py-2 text-xs font-medium" style="color:var(--text-dim)">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {#each kartuList as k (k.id)}
            <tr class="border-t" style="border-color:var(--border)">
              <td class="px-3 py-2 font-mono font-bold tracking-widest" style="color:var(--accent)">{k.no_kartu}</td>
              <td class="px-3 py-2 text-xs font-bold" style="{TIER_COLOR[k.tier]}">{TIER_LABEL[k.tier]}</td>
              <td class="px-3 py-2 text-right text-xs" style="color:{k.diskon_member > 0 ? 'var(--accent)' : 'var(--text-dim)'}">
                {k.diskon_member > 0 ? `−${k.diskon_member}%` : '—'}
              </td>
              <td class="px-3 py-2 text-right text-xs" style="color:var(--info)">{k.poin}</td>
              <td class="px-3 py-2 text-xs">
                {#if k.pelanggan_nama}
                  <div class="font-medium" style="color:var(--text)">{k.pelanggan_nama}</div>
                  <div class="font-mono text-xs" style="color:var(--text-dim)">{k.pelanggan_kode}</div>
                {:else}
                  <span class="rounded px-1.5 py-0.5" style="background:var(--surface2);color:var(--accent)">Tersedia</span>
                {/if}
              </td>
              <td class="px-3 py-2">
                <div class="flex items-center gap-1 justify-end flex-wrap">
                  <button onclick={() => bukaEditKartu(k)} class="rounded border px-2 py-0.5 text-xs" style="border-color:var(--border);color:var(--text-dim)">Edit</button>
                  <button onclick={() => bukaPoin(k)} class="rounded border px-2 py-0.5 text-xs" style="border-color:var(--border);color:var(--info)">Poin</button>
                  {#if k.pelanggan_nama}
                    <button onclick={() => unassignKartu(k)} class="rounded border px-2 py-0.5 text-xs" style="border-color:var(--border);color:var(--warn)">Lepas</button>
                  {:else}
                    <button onclick={() => bukaAssignKartu(k)} class="rounded border px-2 py-0.5 text-xs" style="border-color:var(--border);color:var(--accent)">Assign</button>
                  {/if}
                  <button onclick={() => nonaktifkanKartu(k)} class="rounded border px-2 py-0.5 text-xs" style="border-color:var(--border);color:var(--danger)">Nonaktif</button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<!-- MODAL: Generate Kartu -->
<Modal bind:open={modalGenerateOpen} title="Generate Kartu Anggota">
  <div class="space-y-3">
    <p class="text-xs" style="color:var(--text-dim)">Nomor kartu 10 digit akan di-generate otomatis secara acak dan unik.</p>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label for="kartu-tier-default" class="block text-xs mb-1" style="color:var(--text-dim)">Tier Default</label>
        <select id="kartu-tier-default" bind:value={formGenerate.tier} class="w-full px-3 py-1.5 text-sm rounded border"
          style="background:var(--surface);border-color:var(--border);color:var(--text)">
          <option value="reguler">Reguler</option>
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
        </select>
      </div>
      <div>
        <label for="kartu-diskon-member" class="block text-xs mb-1" style="color:var(--text-dim)">Diskon Member (%)</label>
        <input id="kartu-diskon-member" type="number" bind:value={formGenerate.diskon_member} min="0" max="100" step="0.5" placeholder="0"
          class="w-full px-3 py-1.5 text-sm rounded border"
          style="background:var(--surface);border-color:var(--border);color:var(--text)" />
      </div>
    </div>
    <div>
      <label for="kartu-jumlah" class="block text-xs mb-1" style="color:var(--text-dim)">Jumlah Kartu (maks. 50)</label>
      <input id="kartu-jumlah" type="number" bind:value={formGenerate.jumlah} min="1" max="50" placeholder="1"
        class="w-full px-3 py-1.5 text-sm rounded border"
        style="background:var(--surface);border-color:var(--border);color:var(--text)" />
    </div>
    {#if errGenerate}<p class="text-xs" style="color:var(--danger)">{errGenerate}</p>{/if}
    <div class="flex justify-end gap-2 pt-1">
      <button onclick={() => (modalGenerateOpen = false)} class="px-3 py-1.5 text-sm rounded border" style="border-color:var(--border);color:var(--text-dim)">Batal</button>
      <button onclick={simpanGenerate} class="px-4 py-1.5 text-sm rounded font-medium" style="background:var(--accent);color:var(--bg)">Generate</button>
    </div>
  </div>
</Modal>

<!-- MODAL: Edit Tier/Diskon Kartu -->
<Modal bind:open={modalEditKartuOpen} title="Edit Kartu — {editKartu?.no_kartu ?? ''}">
  <div class="space-y-3">
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label for="kartu-tier" class="block text-xs mb-1" style="color:var(--text-dim)">Tier</label>
        <select id="kartu-tier" bind:value={formEditKartu.tier} class="w-full px-3 py-1.5 text-sm rounded border"
          style="background:var(--surface);border-color:var(--border);color:var(--text)">
          <option value="reguler">Reguler</option>
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
        </select>
      </div>
      <div>
        <label for="kartu-diskon" class="block text-xs mb-1" style="color:var(--text-dim)">Diskon (%)</label>
        <input id="kartu-diskon" type="number" bind:value={formEditKartu.diskon_member} min="0" max="100" step="0.5"
          class="w-full px-3 py-1.5 text-sm rounded border"
          style="background:var(--surface);border-color:var(--border);color:var(--text)" />
      </div>
    </div>
    {#if errEditKartu}<p class="text-xs" style="color:var(--danger)">{errEditKartu}</p>{/if}
    <div class="flex justify-end gap-2 pt-1">
      <button onclick={() => (modalEditKartuOpen = false)} class="px-3 py-1.5 text-sm rounded border" style="border-color:var(--border);color:var(--text-dim)">Batal</button>
      <button onclick={simpanEditKartu} class="px-4 py-1.5 text-sm rounded font-medium" style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </div>
</Modal>

<!-- MODAL: Update Poin -->
<Modal bind:open={modalPoinOpen} title="Update Poin — {poinTarget?.no_kartu ?? ''}">
  {#if poinTarget}
    <div class="space-y-3">
      <div class="text-center py-2 rounded" style="background:var(--surface2)">
        <p class="text-xs" style="color:var(--text-dim)">Poin Saat Ini</p>
        <p class="text-2xl font-bold" style="color:var(--info)">{poinTarget.poin}</p>
      </div>
      <div>
        <p class="block text-xs mb-1" style="color:var(--text-dim)">Operasi</p>
        <div class="flex gap-3">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label for="poin-tambah" class="flex items-center gap-1.5 text-sm cursor-pointer" style="color:var(--text)">
            <input id="poin-tambah" type="radio" bind:group={formPoin.mode} value="tambah" /> Tambah
          </label>
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label for="poin-kurang" class="flex items-center gap-1.5 text-sm cursor-pointer" style="color:var(--text)">
            <input id="poin-kurang" type="radio" bind:group={formPoin.mode} value="kurang" /> Kurangi
          </label>
        </div>
      </div>
      <div>
        <label for="kartu-poin-delta" class="block text-xs mb-1" style="color:var(--text-dim)">Jumlah Poin</label>
        <input id="kartu-poin-delta" type="number" bind:value={formPoin.delta} min="1" placeholder="0"
          class="w-full px-3 py-1.5 text-sm rounded border"
          style="background:var(--surface);border-color:var(--border);color:var(--text)" />
      </div>
      {#if errPoin}<p class="text-xs" style="color:var(--danger)">{errPoin}</p>{/if}
      <div class="flex justify-end gap-2 pt-1">
        <button onclick={() => (modalPoinOpen = false)} class="px-3 py-1.5 text-sm rounded border" style="border-color:var(--border);color:var(--text-dim)">Batal</button>
        <button onclick={simpanPoin} class="px-4 py-1.5 text-sm rounded font-medium" style="background:var(--accent);color:var(--bg)">Simpan</button>
      </div>
    </div>
  {/if}
</Modal>

<!-- MODAL: Assign Kartu ke Pelanggan (dari sisi kartu) -->
<Modal bind:open={modalAssignKartuOpen} title="Assign Kartu {assignKartuTarget?.no_kartu ?? ''} ke Pelanggan">
  <div class="space-y-3">
    {#if assignPlgId}
      <!-- Pelanggan sudah dipilih -->
      <div class="flex items-center justify-between p-2.5 rounded border" style="background:var(--surface2);border-color:var(--border)">
        <span class="text-sm" style="color:var(--text)">{assignPlgLabel}</span>
        <button
          onclick={() => { assignPlgId = null; assignPlgLabel = '' }}
          class="text-xs px-2 py-0.5 rounded border ml-2"
          style="border-color:var(--border);color:var(--danger)"
        >Ganti</button>
      </div>
    {:else}
      <!-- Search pelanggan -->
      <div>
        <label for="kartu-cari-plg" class="block text-xs mb-1" style="color:var(--text-dim)">Cari Pelanggan (nama / no. HP / kode)</label>
        <div class="relative">
          <input
            id="kartu-cari-plg"
            bind:value={plgSearchQ}
            oninput={cariPelanggan}
            placeholder="Ketik min. 2 karakter..."
            class="w-full px-3 py-1.5 text-sm rounded border"
            style="background:var(--surface);border-color:var(--border);color:var(--text)"
          />
          {#if plgSearchLoading}
            <p class="text-xs mt-1" style="color:var(--text-dim)">Mencari...</p>
          {:else if plgSearchResults.length > 0}
            <div class="absolute z-20 top-full left-0 right-0 mt-1 rounded border max-h-48 overflow-y-auto shadow-lg"
              style="background:var(--surface);border-color:var(--border)">
              {#each plgSearchResults as p}
                <button
                  onclick={() => pilihPelanggan(p)}
                  class="w-full text-left px-3 py-2 text-xs border-t"
                  style="border-color:var(--border)"
                >
                  <span class="font-medium" style="color:var(--text)">{p.nama}</span>
                  {#if p.gender === 'pria'}
                    <span class="ml-1" style="color:#40c4ff">♂</span>
                  {:else if p.gender === 'wanita'}
                    <span class="ml-1" style="color:#ff80ab">♀</span>
                  {/if}
                  <span class="ml-2 font-mono text-xs" style="color:var(--text-dim)">{p.kode_pelanggan}</span>
                  {#if p.kontak}
                    <span class="ml-2" style="color:var(--text-dim)">{p.kontak}</span>
                  {/if}
                </button>
              {/each}
            </div>
          {:else if plgSearchQ.length >= 2}
            <p class="text-xs mt-1" style="color:var(--warn)">Tidak ada pelanggan tanpa kartu yang cocok.</p>
          {:else if plgSearchQ.length > 0}
            <p class="text-xs mt-1" style="color:var(--text-dim)">Ketik minimal 2 karakter.</p>
          {/if}
        </div>
      </div>
    {/if}
    {#if errAssignKartu}<p class="text-xs" style="color:var(--danger)">{errAssignKartu}</p>{/if}
    <div class="flex justify-end gap-2 pt-1">
      <button onclick={() => (modalAssignKartuOpen = false)} class="px-3 py-1.5 text-sm rounded border" style="border-color:var(--border);color:var(--text-dim)">Batal</button>
      {#if assignPlgId}
        <button onclick={simpanAssignKartu} class="px-4 py-1.5 text-sm rounded font-medium" style="background:var(--accent);color:var(--bg)">Assign</button>
      {/if}
    </div>
  </div>
</Modal>
