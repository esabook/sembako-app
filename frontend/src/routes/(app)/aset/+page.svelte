<svelte:head><title>Aset — Stokasir</title></svelte:head>

<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { user } from '$lib/stores/auth.js'
  import SlideOver from '$lib/components/SlideOver.svelte'
  import Skeleton from '$lib/components/ui/Skeleton.svelte'
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte'
  import { api } from '$lib/utils/api.js'

  $effect(() => {
    if ($user && !['pemilik', 'manajer'].includes($user.role)) goto('/kasir')
  })

  type AsetRow = {
    id: number
    nama: string
    kategori: string
    nilai_beli: number
    nilai_sekarang: number
    tanggal_beli: string | null
    kondisi: 'baik' | 'rusak_ringan' | 'rusak_berat' | 'dijual' | 'dibuang'
    lokasi: string | null
    catatan: string | null
    is_active: boolean
    created_at: string | null
  }

  type TagihanRow = {
    id: number
    jenis: 'listrik' | 'air' | 'internet' | 'lainnya'
    periode_bulan: string
    jumlah: number
    tanggal_bayar: string | null
    meter_awal: number | null
    meter_akhir: number | null
    catatan: string | null
  }

  const tab = $derived<'aset' | 'utilitas'>((page.url.searchParams.get('tab') as any) ?? 'aset')

  // ── Aset ─────────────────────────────────────────────────────────────────
  let asetRows = $state<AsetRow[]>([])
  let asetLoading = $state(false)
  let asetKondisiFilter = $state('')
  let asetKategoriFilter = $state('')
  let asetFormOpen = $state(false)
  let asetError = $state('')
  let editAsetId = $state<number | null>(null)
  let fAsetNama = $state('')
  let fAsetKategori = $state('Lainnya')
  let fAsetNilaiBeli = $state('')
  let fAsetNilaiSekarang = $state('')
  let fAsetTanggal = $state('')
  let fAsetKondisi = $state<AsetRow['kondisi']>('baik')
  let fAsetLokasi = $state('')
  let fAsetCatatan = $state('')

  const KONDISI_LABEL: Record<AsetRow['kondisi'], string> = {
    baik: 'Baik', rusak_ringan: 'Rusak Ringan', rusak_berat: 'Rusak Berat',
    dijual: 'Dijual', dibuang: 'Dibuang',
  }
  const KONDISI_COLOR: Record<AsetRow['kondisi'], string> = {
    baik: 'var(--accent)', rusak_ringan: 'var(--warn)', rusak_berat: 'var(--danger)',
    dijual: 'var(--text-dim)', dibuang: 'var(--text-dim)',
  }
  const KATEGORI_LIST = ['Elektronik', 'Kendaraan', 'Peralatan', 'Mesin', 'Furnitur', 'Lainnya']

  async function muatAset() {
    asetLoading = true
    const q = new URLSearchParams()
    if (asetKondisiFilter) q.set('kondisi', asetKondisiFilter)
    if (asetKategoriFilter) q.set('kategori', asetKategoriFilter)
    const r = await api.get<AsetRow[]>(`/aset?${q}`)
    if (r.success) asetRows = r.data
    asetLoading = false
  }

  function bukaFormAset(row?: AsetRow) {
    editAsetId = row?.id ?? null
    fAsetNama = row?.nama ?? ''
    fAsetKategori = row?.kategori ?? 'Lainnya'
    fAsetNilaiBeli = row ? String(row.nilai_beli) : ''
    fAsetNilaiSekarang = row ? String(row.nilai_sekarang) : ''
    fAsetTanggal = row?.tanggal_beli ?? ''
    fAsetKondisi = row?.kondisi ?? 'baik'
    fAsetLokasi = row?.lokasi ?? ''
    fAsetCatatan = row?.catatan ?? ''
    asetError = ''
    asetFormOpen = true
  }

  async function simpanAset() {
    asetError = ''
    if (!fAsetNama.trim()) { asetError = 'Nama wajib'; return }
    const body = {
      nama: fAsetNama.trim(), kategori: fAsetKategori,
      nilai_beli: Number(fAsetNilaiBeli) || 0,
      nilai_sekarang: Number(fAsetNilaiSekarang) || Number(fAsetNilaiBeli) || 0,
      tanggal_beli: fAsetTanggal || undefined,
      kondisi: fAsetKondisi,
      lokasi: fAsetLokasi || undefined,
      catatan: fAsetCatatan || undefined,
    }
    const r = editAsetId
      ? await api.put(`/aset/${editAsetId}`, body)
      : await api.post('/aset', body)
    if (!r.success) { asetError = (r as any).error; return }
    asetFormOpen = false; muatAset()
  }

  let konfirmAsetId = $state<number | null>(null)
  let konfirmAsetNama = $state('')
  let konfirmAsetBuka = $state(false)

  function hapusAset(id: number, nama: string) {
    konfirmAsetId = id
    konfirmAsetNama = nama
    konfirmAsetBuka = true
  }

  async function doHapusAset() {
    if (!konfirmAsetId) return
    await api.delete(`/aset/${konfirmAsetId}`)
    konfirmAsetId = null
    konfirmAsetNama = ''
    muatAset()
  }

  $effect(() => { if (tab === 'aset') { asetKondisiFilter; asetKategoriFilter; muatAset() } })

  // ── Utilitas ──────────────────────────────────────────────────────────────
  let utRows = $state<TagihanRow[]>([])
  let utLoading = $state(false)
  let utJenisFilter = $state('')
  let utBulanFilter = $state('')
  let utFormOpen = $state(false)
  let utError = $state('')
  let editUtId = $state<number | null>(null)
  let fUtJenis = $state<TagihanRow['jenis']>('listrik')
  let fUtBulan = $state('')
  let fUtJumlah = $state('')
  let fUtTanggalBayar = $state('')
  let fUtMeterAwal = $state('')
  let fUtMeterAkhir = $state('')
  let fUtCatatan = $state('')

  const JENIS_LABEL: Record<TagihanRow['jenis'], string> = {
    listrik: 'Listrik', air: 'Air', internet: 'Internet', lainnya: 'Lainnya',
  }
  const JENIS_ICON: Record<TagihanRow['jenis'], string> = {
    listrik: '⚡', air: '💧', internet: '🌐', lainnya: '📋',
  }

  function rp(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
  }

  async function muatUtilitas() {
    utLoading = true
    const q = new URLSearchParams()
    if (utJenisFilter) q.set('jenis', utJenisFilter)
    if (utBulanFilter) q.set('periode_bulan', utBulanFilter)
    const r = await api.get<TagihanRow[]>(`/utilitas?${q}`)
    if (r.success) utRows = r.data
    utLoading = false
  }

  function bukaFormUt(row?: TagihanRow) {
    editUtId = row?.id ?? null
    fUtJenis = row?.jenis ?? 'listrik'
    fUtBulan = row?.periode_bulan ?? utBulanFilter
    fUtJumlah = row ? String(row.jumlah) : ''
    fUtTanggalBayar = row?.tanggal_bayar ?? ''
    fUtMeterAwal = row?.meter_awal != null ? String(row.meter_awal) : ''
    fUtMeterAkhir = row?.meter_akhir != null ? String(row.meter_akhir) : ''
    fUtCatatan = row?.catatan ?? ''
    utError = ''
    utFormOpen = true
  }

  async function simpanUt() {
    utError = ''
    if (!fUtBulan) { utError = 'Periode bulan wajib'; return }
    if (!fUtJumlah || Number(fUtJumlah) <= 0) { utError = 'Jumlah harus > 0'; return }
    const body = {
      jenis: fUtJenis, periode_bulan: fUtBulan, jumlah: Number(fUtJumlah),
      tanggal_bayar: fUtTanggalBayar || undefined,
      meter_awal: fUtMeterAwal ? Number(fUtMeterAwal) : undefined,
      meter_akhir: fUtMeterAkhir ? Number(fUtMeterAkhir) : undefined,
      catatan: fUtCatatan || undefined,
    }
    const r = editUtId
      ? await api.put(`/utilitas/${editUtId}`, body)
      : await api.post('/utilitas', body)
    if (!r.success) { utError = (r as any).error; return }
    utFormOpen = false; muatUtilitas()
  }

  let konfirmUtId = $state<number | null>(null)
  let konfirmUtBuka = $state(false)

  function hapusUt(id: number) {
    konfirmUtId = id
    konfirmUtBuka = true
  }

  async function doHapusUt() {
    if (!konfirmUtId) return
    await api.delete(`/utilitas/${konfirmUtId}`)
    konfirmUtId = null
    muatUtilitas()
  }

  const totalUt = $derived(utRows.reduce((s, r) => s + r.jumlah, 0))

  $effect(() => { if (tab === 'utilitas') { utJenisFilter; utBulanFilter; muatUtilitas() } })
</script>

<!-- Tab bar -->
<div class="flex flex-col gap-4">
  <div class="flex gap-1 border-b" style="border-color:var(--border)">
    {#each ([['aset','Inventaris Aset'],['utilitas','Tagihan Utilitas']] as const) as [key, label] (key)}
      <button
        onclick={() => goto(`?tab=${key}`, { replaceState: true, keepFocus: true, noScroll: true })}
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors shrink-0"
        style="{tab === key ? 'border-color:var(--accent);color:var(--accent)' : 'border-color:transparent;color:var(--text-dim)'}">
        {label}
      </button>
    {/each}
  </div>

  <!-- ════════════════════ TAB: INVENTARIS ASET ════════════════════ -->
  {#if tab === 'aset'}
    <div class="flex flex-wrap gap-2 items-end mb-2">
      <select bind:value={asetKategoriFilter}
        class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
        <option value="">Semua Kategori</option>
        {#each KATEGORI_LIST as k (k)}
          <option value={k}>{k}</option>
        {/each}
      </select>
      <select bind:value={asetKondisiFilter}
        class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
        <option value="">Semua Kondisi</option>
        {#each Object.entries(KONDISI_LABEL) as [v, lbl] (v)}
          <option value={v}>{lbl}</option>
        {/each}
      </select>
      <button onclick={() => bukaFormAset()}
        class="px-3 py-1 rounded text-sm font-bold ml-auto" style="background:var(--accent);color:var(--bg)">+ Tambah Aset</button>
    </div>

    {#if asetLoading}
      <div class="overflow-x-auto rounded border" style="border-color:var(--border)">
        <table class="min-w-full text-sm" style="border-collapse:collapse">
          <tbody>
            {#each { length: 5 } as _, i (i)}
              <tr class="border-t" style="border-color:var(--border)">
                <td class="px-3 py-2.5"><Skeleton h="0.75rem" w="{55 + (i * 13) % 30}%" /></td>
                <td class="px-3 py-2.5 hidden sm:table-cell"><Skeleton h="0.75rem" w="{40 + (i * 9) % 25}%" /></td>
                <td class="px-3 py-2.5 hidden sm:table-cell"><Skeleton h="0.75rem" w="{35 + (i * 7) % 20}%" /></td>
                <td class="px-3 py-2.5"><Skeleton h="0.75rem" w="{45 + (i * 11) % 25}%" /></td>
                <td class="px-3 py-2.5 hidden sm:table-cell"><Skeleton h="0.75rem" w="{30 + (i * 17) % 20}%" /></td>
                <td class="px-3 py-2.5"><Skeleton h="0.75rem" w="4rem" /></td>
                <td class="px-3 py-2.5"><Skeleton h="0.75rem" w="3rem" /></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else if asetRows.length === 0}
      <p class="text-sm py-4" style="color:var(--text-dim)">Belum ada aset tercatat.</p>
    {:else}
      <div class="overflow-x-auto rounded border" style="border-color:var(--border)">
        <table class="min-w-full text-sm" style="border-collapse:collapse">
          <thead>
            <tr style="background:var(--surface2)">
              <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Nama</th>
              <th class="px-3 py-2 text-left text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Kategori</th>
              <th class="px-3 py-2 text-right text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Nilai Beli</th>
              <th class="px-3 py-2 text-right text-xs font-semibold" style="color:var(--text-dim)">Nilai Sekarang</th>
              <th class="px-3 py-2 text-left text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Lokasi</th>
              <th class="px-3 py-2 text-center text-xs font-semibold" style="color:var(--text-dim)">Kondisi</th>
              <th class="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {#each asetRows as row (row.id)}
              <tr class="border-t" style="border-color:var(--border)">
                <td class="px-3 py-2 font-medium">{row.nama}</td>
                <td class="px-3 py-2 text-xs hidden sm:table-cell" style="color:var(--text-dim)">{row.kategori}</td>
                <td class="px-3 py-2 text-right text-xs hidden sm:table-cell font-mono" style="color:var(--text-dim)">{rp(row.nilai_beli)}</td>
                <td class="px-3 py-2 text-right text-xs font-mono font-semibold">{rp(row.nilai_sekarang)}</td>
                <td class="px-3 py-2 text-xs hidden sm:table-cell" style="color:var(--text-dim)">{row.lokasi ?? '—'}</td>
                <td class="px-3 py-2 text-center">
                  <span class="text-xs font-semibold" style="color:{KONDISI_COLOR[row.kondisi]}">{KONDISI_LABEL[row.kondisi]}</span>
                </td>
                <td class="px-3 py-2 text-right whitespace-nowrap">
                  <button onclick={() => bukaFormAset(row)} class="text-xs px-2 py-0.5 rounded mr-1"
                    style="border:1px solid var(--border);color:var(--text-dim)">Edit</button>
                  <button onclick={() => hapusAset(row.id, row.nama)} class="text-xs px-2 py-0.5 rounded"
                    style="color:var(--danger)">Hapus</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}

  <!-- ════════════════════ TAB: TAGIHAN UTILITAS ════════════════════ -->
  {#if tab === 'utilitas'}
    <div class="flex flex-wrap gap-2 items-end mb-2">
      <select bind:value={utJenisFilter}
        class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
        <option value="">Semua Jenis</option>
        {#each Object.entries(JENIS_LABEL) as [v, lbl] (v)}
          <option value={v}>{JENIS_ICON[v as TagihanRow['jenis']]} {lbl}</option>
        {/each}
      </select>
      <input type="month" bind:value={utBulanFilter}
        class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
      <button onclick={() => bukaFormUt()}
        class="px-3 py-1 rounded text-sm font-bold ml-auto" style="background:var(--accent);color:var(--bg)">+ Catat Tagihan</button>
    </div>

    {#if utRows.length > 0}
      <div class="flex gap-3 flex-wrap mb-2">
        {#each (['listrik','air','internet','lainnya'] as const) as j (j)}
          {@const total = utRows.filter(r => r.jenis === j).reduce((s, r) => s + r.jumlah, 0)}
          {#if total > 0}
            <div class="rounded border px-3 py-2 text-xs" style="background:var(--surface);border-color:var(--border)">
              <span>{JENIS_ICON[j]} {JENIS_LABEL[j]}</span>
              <span class="font-bold ml-2">{rp(total)}</span>
            </div>
          {/if}
        {/each}
        <div class="rounded border px-3 py-2 text-xs font-bold" style="background:var(--surface2);border-color:var(--border);color:var(--accent)">
          Total: {rp(totalUt)}
        </div>
      </div>
    {/if}

    {#if utLoading}
      <div class="overflow-x-auto rounded border" style="border-color:var(--border)">
        <table class="min-w-full text-sm" style="border-collapse:collapse">
          <tbody>
            {#each { length: 4 } as _, i (i)}
              <tr class="border-t" style="border-color:var(--border)">
                <td class="px-3 py-2.5"><Skeleton h="0.75rem" w="{50 + (i * 13) % 30}%" /></td>
                <td class="px-3 py-2.5"><Skeleton h="0.75rem" w="{40 + (i * 9) % 25}%" /></td>
                <td class="px-3 py-2.5"><Skeleton h="0.75rem" w="{45 + (i * 7) % 20}%" /></td>
                <td class="px-3 py-2.5 hidden sm:table-cell"><Skeleton h="0.75rem" w="{35 + (i * 11) % 20}%" /></td>
                <td class="px-3 py-2.5 hidden sm:table-cell"><Skeleton h="0.75rem" w="{30 + (i * 17) % 15}%" /></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else if utRows.length === 0}
      <p class="text-sm py-4" style="color:var(--text-dim)">Belum ada tagihan tercatat.</p>
    {:else}
      <div class="overflow-x-auto rounded border" style="border-color:var(--border)">
        <table class="min-w-full text-sm" style="border-collapse:collapse">
          <thead>
            <tr style="background:var(--surface2)">
              <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Jenis</th>
              <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Periode</th>
              <th class="px-3 py-2 text-right text-xs font-semibold" style="color:var(--text-dim)">Jumlah</th>
              <th class="px-3 py-2 text-left text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Tgl Bayar</th>
              <th class="px-3 py-2 text-right text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Pemakaian</th>
              <th class="px-3 py-2 text-left text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Catatan</th>
              <th class="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {#each utRows as row (row.id)}
              <tr class="border-t" style="border-color:var(--border)">
                <td class="px-3 py-2">
                  <span>{JENIS_ICON[row.jenis]}</span>
                  <span class="ml-1 text-sm font-medium">{JENIS_LABEL[row.jenis]}</span>
                </td>
                <td class="px-3 py-2 text-sm">{row.periode_bulan}</td>
                <td class="px-3 py-2 text-right font-mono font-semibold" style="color:var(--accent)">{rp(row.jumlah)}</td>
                <td class="px-3 py-2 text-xs hidden sm:table-cell" style="color:var(--text-dim)">{row.tanggal_bayar ?? '—'}</td>
                <td class="px-3 py-2 text-right text-xs hidden sm:table-cell" style="color:var(--text-dim)">
                  {row.meter_awal != null && row.meter_akhir != null
                    ? `${row.meter_akhir - row.meter_awal} kWh/m³`
                    : '—'}
                </td>
                <td class="px-3 py-2 text-xs hidden sm:table-cell" style="color:var(--text-dim)">{row.catatan ?? '—'}</td>
                <td class="px-3 py-2 text-right whitespace-nowrap">
                  <button onclick={() => bukaFormUt(row)} class="text-xs px-2 py-0.5 rounded mr-1"
                    style="border:1px solid var(--border);color:var(--text-dim)">Edit</button>
                  <button onclick={() => hapusUt(row.id)} class="text-xs px-2 py-0.5 rounded"
                    style="color:var(--danger)">Hapus</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>

<!-- ── Modal: Form Aset ──────────────────────────────────────────────────────── -->
<SlideOver bind:open={asetFormOpen} title={editAsetId ? 'Edit Aset' : 'Tambah Aset'}>
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); simpanAset() }} class="flex flex-col gap-3 text-sm">
    <div class="flex flex-col gap-1">
      <label for="fa-nama" class="text-xs" style="color:var(--text-dim)">NAMA ASET *</label>
      <input id="fa-nama" bind:value={fAsetNama} required placeholder="mis. Mesin Kasir, Kulkas, Motor"
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label for="fa-kat" class="text-xs" style="color:var(--text-dim)">KATEGORI *</label>
        <select id="fa-kat" bind:value={fAsetKategori}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)">
          {#each KATEGORI_LIST as k (k)}
            <option value={k}>{k}</option>
          {/each}
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-kondisi" class="text-xs" style="color:var(--text-dim)">KONDISI *</label>
        <select id="fa-kondisi" bind:value={fAsetKondisi}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)">
          {#each Object.entries(KONDISI_LABEL) as [v, lbl] (v)}
            <option value={v}>{lbl}</option>
          {/each}
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-beli" class="text-xs" style="color:var(--text-dim)">NILAI BELI (Rp)</label>
        <input id="fa-beli" type="number" min="0" bind:value={fAsetNilaiBeli}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-skrg" class="text-xs" style="color:var(--text-dim)">NILAI SEKARANG (Rp)</label>
        <input id="fa-skrg" type="number" min="0" bind:value={fAsetNilaiSekarang}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-tgl" class="text-xs" style="color:var(--text-dim)">TANGGAL BELI</label>
        <input id="fa-tgl" type="date" bind:value={fAsetTanggal}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-lokasi" class="text-xs" style="color:var(--text-dim)">LOKASI</label>
        <input id="fa-lokasi" bind:value={fAsetLokasi} placeholder="mis. Kasir, Gudang"
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
    </div>
    <div class="flex flex-col gap-1">
      <label for="fa-catatan" class="text-xs" style="color:var(--text-dim)">CATATAN</label>
      <input id="fa-catatan" bind:value={fAsetCatatan} placeholder="Opsional"
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    {#if asetError}
      <p class="text-xs" style="color:var(--danger)">{asetError}</p>
    {/if}
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => asetFormOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </form>
  {/snippet}
</SlideOver>

<!-- ── Modal: Form Tagihan Utilitas ─────────────────────────────────────────── -->
<SlideOver bind:open={utFormOpen} title={editUtId ? 'Edit Tagihan' : 'Catat Tagihan Utilitas'}>
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); simpanUt() }} class="flex flex-col gap-3 text-sm">
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label for="fu-jenis" class="text-xs" style="color:var(--text-dim)">JENIS *</label>
        <select id="fu-jenis" bind:value={fUtJenis}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)">
          {#each Object.entries(JENIS_LABEL) as [v, lbl] (v)}
            <option value={v}>{JENIS_ICON[v as TagihanRow['jenis']]} {lbl}</option>
          {/each}
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label for="fu-bulan" class="text-xs" style="color:var(--text-dim)">PERIODE *</label>
        <input id="fu-bulan" type="month" bind:value={fUtBulan} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1 col-span-2">
        <label for="fu-jumlah" class="text-xs" style="color:var(--text-dim)">JUMLAH TAGIHAN (Rp) *</label>
        <input id="fu-jumlah" type="number" min="1" bind:value={fUtJumlah} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1 col-span-2">
        <label for="fu-bayar" class="text-xs" style="color:var(--text-dim)">TANGGAL BAYAR</label>
        <input id="fu-bayar" type="date" bind:value={fUtTanggalBayar}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
    </div>
    {#if fUtJenis === 'listrik' || fUtJenis === 'air'}
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label for="fu-awal" class="text-xs" style="color:var(--text-dim)">METER AWAL</label>
          <input id="fu-awal" type="number" min="0" bind:value={fUtMeterAwal}
            class="px-2 py-1 rounded border outline-none"
            style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
        </div>
        <div class="flex flex-col gap-1">
          <label for="fu-akhir" class="text-xs" style="color:var(--text-dim)">METER AKHIR</label>
          <input id="fu-akhir" type="number" min="0" bind:value={fUtMeterAkhir}
            class="px-2 py-1 rounded border outline-none"
            style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
        </div>
      </div>
    {/if}
    <div class="flex flex-col gap-1">
      <label for="fu-catatan" class="text-xs" style="color:var(--text-dim)">CATATAN</label>
      <input id="fu-catatan" bind:value={fUtCatatan} placeholder="Opsional"
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    {#if utError}
      <p class="text-xs" style="color:var(--danger)">{utError}</p>
    {/if}
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => utFormOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </form>
  {/snippet}
</SlideOver>

<ConfirmDialog
  bind:open={konfirmAsetBuka}
  judul="Nonaktifkan aset?"
  pesan={`Aset "${konfirmAsetNama}" akan dinonaktifkan.`}
  labelKanan="Nonaktifkan"
  warnaKanan="var(--danger)"
  onkiri={() => { konfirmAsetId = null; konfirmAsetNama = '' }}
  onkanan={doHapusAset}
/>

<ConfirmDialog
  bind:open={konfirmUtBuka}
  judul="Hapus tagihan?"
  pesan="Tagihan ini akan dihapus permanen."
  labelKanan="Hapus"
  warnaKanan="var(--danger)"
  onkiri={() => konfirmUtId = null}
  onkanan={doHapusUt}
/>
