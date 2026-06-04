<svelte:head><title>Karyawan — Stokasir</title></svelte:head>

<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { user } from '$lib/stores/auth.js'
  import SlideOver from '$lib/components/SlideOver.svelte'
  import DataTable from '$lib/components/DataTable.svelte'
  import { createKaryawanStore } from './karyawan.store.svelte.js'
  import type { Tab } from './karyawan.types.js'
  import FormKaryawan from './FormKaryawan.svelte'
  import {
    ROLE_COLOR, STATUS_COLOR, STATUS_GAJI_COLOR, STATUS_KB, DAY_LABELS,
    rp, fmtRpK, fmtMenit, hitungDurasi,
  } from './karyawan.logic.js'
  import type { IzinRow, EvaluasiRow, SanksiInsentifRow } from './karyawan.types.js'
  import { api } from '$lib/utils/api.js'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  $effect(() => {
    if ($user && !['pemilik', 'manajer'].includes($user.role)) goto('/kasir')
  })

  const tab = $derived<Tab>((page.url.searchParams.get('tab') as Tab) ?? 'data')

  const store = createKaryawanStore()

  onMount(() => store.muatKaryawan())

  $effect(() => { if (tab === 'absensi')    { store.filterBulan; store.filterKaryawanId; store.muatAbsensi() } })
  $effect(() => { if (tab === 'absensi' && store.isManager) store.muatRealtime() })
  $effect(() => { if (tab === 'penggajian') { store.filterBulanGaji; store.muatPenggajian() } })
  $effect(() => { if (tab === 'kasbon')     { store.filterStatusKasbon; store.muatKasbon() } })
  $effect(() => { if (tab === 'jadwal')     { store.weekStart; store.muatJadwal() } })
  $effect(() => { if (tab === 'performa')   { store.bulanPerforma; store.muatPerforma() } })

  // ── C1: Izin ────────────────────────────────────────────────────────────
  let izinRows = $state<IzinRow[]>([])
  let izinLoading = $state(false)
  let izinBulan = $state('')
  let izinKaryawanId = $state('')
  let izinFormOpen = $state(false)
  let izinError = $state('')
  let fIzinJenis = $state<'cuti'|'izin'|'sakit'>('izin')
  let fIzinMulai = $state('')
  let fIzinSelesai = $state('')
  let fIzinAlasan = $state('')
  let fIzinKaryawanId = $state('')

  async function muatIzin() {
    izinLoading = true
    const q = new URLSearchParams()
    if (izinKaryawanId) q.set('karyawan_id', izinKaryawanId)
    if (izinBulan) { q.set('dari', izinBulan + '-01'); q.set('sampai', izinBulan + '-31') }
    const r = await api.get<IzinRow[]>(`/izin?${q}`)
    if (r.success) izinRows = r.data
    izinLoading = false
  }

  async function setujuiIzin(id: number) {
    await api.post(`/izin/${id}/setujui`, {})
    muatIzin()
  }

  async function tolakIzin(id: number) {
    const catatan = prompt('Alasan penolakan (opsional):') ?? ''
    await api.post(`/izin/${id}/tolak`, { catatan })
    muatIzin()
  }

  async function simpanIzin() {
    izinError = ''
    if (!fIzinMulai || !fIzinSelesai) { izinError = 'Tanggal wajib diisi'; return }
    const body: Record<string, unknown> = {
      jenis: fIzinJenis, tanggal_mulai: fIzinMulai, tanggal_selesai: fIzinSelesai, alasan: fIzinAlasan || undefined,
    }
    if ($user && ['pemilik','manajer'].includes($user.role) && fIzinKaryawanId) {
      body.karyawan_id = Number(fIzinKaryawanId)
    }
    const r = await api.post('/izin', body)
    if (!r.success) { izinError = (r as { success: false; error: string }).error; return }
    izinFormOpen = false; muatIzin()
  }

  $effect(() => { if (tab === 'izin') { izinBulan; izinKaryawanId; muatIzin() } })

  // ── C1: Evaluasi ─────────────────────────────────────────────────────────
  let evalRows = $state<EvaluasiRow[]>([])
  let evalKaryawanId = $state('')
  let evalPeriode = $state('')
  let evalFormOpen = $state(false)
  let evalError = $state('')
  let editEvalId = $state<number|null>(null)
  let fEvalKaryawanId = $state('')
  let fEvalPeriode = $state('')
  let fEvalNilai = $state('3')
  let fEvalCatatan = $state('')

  async function muatEval() {
    const q = new URLSearchParams()
    if (evalKaryawanId) q.set('karyawan_id', evalKaryawanId)
    if (evalPeriode) q.set('periode', evalPeriode)
    const r = await api.get<EvaluasiRow[]>(`/evaluasi?${q}`)
    if (r.success) evalRows = r.data
  }

  function bukaEvalForm(row?: EvaluasiRow) {
    editEvalId = row?.id ?? null
    fEvalKaryawanId = row ? String(row.karyawan_id) : ''
    fEvalPeriode = row?.periode ?? evalPeriode
    fEvalNilai = String(row?.nilai ?? 3)
    fEvalCatatan = row?.catatan ?? ''
    evalError = ''
    evalFormOpen = true
  }

  async function simpanEval() {
    evalError = ''
    if (!fEvalKaryawanId) { evalError = 'Pilih karyawan'; return }
    if (!fEvalPeriode) { evalError = 'Periode wajib'; return }
    const body = { karyawan_id: Number(fEvalKaryawanId), periode: fEvalPeriode, nilai: Number(fEvalNilai), catatan: fEvalCatatan || undefined, tanggal: new Date().toISOString().slice(0,10) }
    const r = editEvalId
      ? await api.put(`/evaluasi/${editEvalId}`, body)
      : await api.post('/evaluasi', body)
    if (!r.success) { evalError = (r as { success: false; error: string }).error; return }
    evalFormOpen = false; muatEval()
  }

  async function hapusEval(id: number) {
    if (!confirm('Hapus evaluasi ini?')) return
    await api.delete(`/evaluasi/${id}`)
    muatEval()
  }

  $effect(() => { if (tab === 'evaluasi') { evalKaryawanId; evalPeriode; muatEval() } })

  // ── C1: Sanksi & Insentif ─────────────────────────────────────────────
  let siRows = $state<SanksiInsentifRow[]>([])
  let siBulan = $state('')
  let siKaryawanId = $state('')
  let siTipe = $state('')
  let siFormOpen = $state(false)
  let siError = $state('')
  let fSiKaryawanId = $state('')
  let fSiTipe = $state<'sanksi'|'insentif'>('insentif')
  let fSiJenis = $state('')
  let fSiJumlah = $state('')
  let fSiTanggal = $state('')
  let fSiBulan = $state('')
  let fSiKet = $state('')

  async function muatSI() {
    const q = new URLSearchParams()
    if (siKaryawanId) q.set('karyawan_id', siKaryawanId)
    if (siBulan) q.set('periode_bulan', siBulan)
    if (siTipe) q.set('tipe', siTipe)
    const r = await api.get<SanksiInsentifRow[]>(`/sanksi-insentif?${q}`)
    if (r.success) siRows = r.data
  }

  async function simpanSI() {
    siError = ''
    if (!fSiKaryawanId) { siError = 'Pilih karyawan'; return }
    if (!fSiJenis.trim()) { siError = 'Jenis wajib'; return }
    if (!fSiJumlah || Number(fSiJumlah) <= 0) { siError = 'Jumlah harus > 0'; return }
    if (!fSiTanggal) { siError = 'Tanggal wajib'; return }
    if (!fSiBulan) { siError = 'Periode bulan wajib'; return }
    const r = await api.post('/sanksi-insentif', {
      karyawan_id: Number(fSiKaryawanId), tipe: fSiTipe, jenis: fSiJenis,
      jumlah: Number(fSiJumlah), tanggal: fSiTanggal, periode_bulan: fSiBulan, keterangan: fSiKet || undefined,
    })
    if (!r.success) { siError = (r as { success: false; error: string }).error; return }
    siFormOpen = false; muatSI()
  }

  async function hapusSI(id: number) {
    if (!confirm('Hapus data ini?')) return
    await api.delete(`/sanksi-insentif/${id}`)
    muatSI()
  }

  $effect(() => { if (tab === 'sanksi') { siKaryawanId; siBulan; siTipe; muatSI() } })
</script>

<!-- ── Tab bar ──────────────────────────────────────────────────────────────── -->
<div class="flex flex-col gap-4">
  <div class="flex gap-1 border-b overflow-x-auto" style="border-color:var(--border);scrollbar-width:none">
    {#each ([['data','Data Karyawan'],['absensi','Absensi'],['penggajian','Penggajian'],['kasbon','Kasbon'],['jadwal','Jadwal Shift'],['performa','Performa Shift'],['izin','Cuti & Izin'],['evaluasi','Evaluasi'],['sanksi','Sanksi & Insentif']] as const) as [key, label] (key)}
      <button
        onclick={() => goto(`?tab=${key}`, { replaceState: true, keepFocus: true, noScroll: true })}
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors shrink-0"
        style="{tab === key ? 'border-color:var(--accent);color:var(--accent)' : 'border-color:transparent;color:var(--text-dim)'}"
      >{label}</button>
    {/each}
  </div>

  <!-- ════════════════════════════════════════════════════════════════════════
       TAB: DATA KARYAWAN
  ═════════════════════════════════════════════════════════════════════════ -->
  {#if tab === 'data'}
    <DataTable
      columns={store.kolKaryawan}
      tableId="karyawan_data"
      bind:sortKey={store.sortKeyKaryawan}
      bind:sortDir={store.sortDirKaryawan}
      bind:currentPage={store.pageKaryawan}
      bind:pageSize={store.pageSizeKaryawan}
      totalRows={store.filteredKaryawan.length}
      rowCount={store.pagedKaryawan.length}
      emptyText="Tidak ada data"
      maxRows={12}
    >
      {#snippet toolbarEnd()}
        <div class="flex items-center gap-2">
          <input type="search" placeholder="Cari nama/username..." bind:value={store.queryKaryawan}
            class="px-3 py-1 rounded border text-sm outline-none"
            style="background:var(--surface);border-color:var(--border);color:var(--text);width:180px" />
          {#if store.isManager}
            <button onclick={() => store.bukaFormKaryawan()} class="px-3 py-1 rounded text-sm font-bold shrink-0"
              style="background:var(--accent);color:var(--bg)">+ Tambah</button>
          {/if}
        </div>
      {/snippet}
      {#snippet body(hidden)}
        {#each store.pagedKaryawan as item (item.id)}
          <tr class="border-t" style="border-color:var(--border)">
            {#if !hidden.has('kode_karyawan')}
              <td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.kode_karyawan}</td>
            {/if}
            {#if !hidden.has('nama')}
              <td class="px-3 py-2">
                <div class="flex items-center gap-2">
                  {#if item.foto_path}
                    <img src="/uploads/{item.foto_path.replace('med_', 'thumb_')}" alt={item.nama}
                      class="rounded-full object-cover shrink-0"
                      style="width:28px;height:28px;background:var(--surface2)" />
                  {:else}
                    <span class="rounded-full flex items-center justify-center shrink-0 font-bold"
                      style="width:28px;height:28px;background:var(--surface2);color:var(--text-dim);font-size:10px">
                      {item.nama.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()}
                    </span>
                  {/if}
                  {item.nama}
                </div>
              </td>
            {/if}
            {#if !hidden.has('role')}
              <td class="px-3 py-2">
                <span class="text-xs font-bold" style="color:{ROLE_COLOR[item.role] ?? 'var(--text-dim)'}">
                  {item.role.toUpperCase()}
                </span>
              </td>
            {/if}
            {#if !hidden.has('username')}
              <td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.username}</td>
            {/if}
            {#if !hidden.has('gaji_pokok')}
              <td class="px-3 py-2 text-right">{rp(item.gaji_pokok)}</td>
            {/if}
            {#if !hidden.has('tipe_gaji')}
              <td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.tipe_gaji}</td>
            {/if}
            {#if !hidden.has('aksi')}
              <td class="px-3 py-2 text-right">
                {#if store.isManager}
                  <button onclick={() => store.bukaFormKaryawan(item)} class="text-xs mr-2" style="color:var(--info)">Edit</button>
                  <button onclick={() => store.hapusKaryawan(item.id)} class="text-xs" style="color:var(--danger)">Nonaktif</button>
                {/if}
              </td>
            {/if}
          </tr>
        {/each}
      {/snippet}
    </DataTable>
  {/if}

  <!-- ════════════════════════════════════════════════════════════════════════
       TAB: ABSENSI
  ═════════════════════════════════════════════════════════════════════════ -->
  {#if tab === 'absensi'}
    {#if !store.isManager}
      <div class="flex items-center gap-3 p-3 rounded border" style="background:var(--surface);border-color:var(--border)">
        <span class="text-sm font-medium">Hari ini — {new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long' })}</span>
        {#if !store.absensiHariIni}
          <button onclick={store.clockIn} class="px-4 py-1.5 rounded text-sm font-bold"
            style="background:var(--accent);color:var(--bg)">Clock In</button>
        {:else if !store.absensiHariIni.jam_keluar}
          <span class="text-xs" style="color:var(--text-dim)">Masuk: {store.absensiHariIni.jam_masuk}</span>
          <button onclick={store.clockOut} class="px-4 py-1.5 rounded text-sm font-bold"
            style="background:var(--warn);color:var(--bg)">Clock Out</button>
        {:else}
          <span class="text-xs" style="color:var(--accent)">Masuk: {store.absensiHariIni.jam_masuk} — Keluar: {store.absensiHariIni.jam_keluar}</span>
        {/if}
      </div>
    {/if}

    {#if store.isManager && store.realtimeList.length > 0}
      <div class="rounded border p-3" style="background:var(--surface);border-color:var(--border)">
        <p class="text-xs font-bold mb-2" style="color:var(--text-dim)">SEDANG BEKERJA ({store.realtimeList.length})</p>
        <div class="flex flex-wrap gap-2">
          {#each store.realtimeList as r (r.karyawan_id)}
            <div class="flex items-center gap-2 px-2 py-1 rounded border text-xs"
              style="border-color:var(--accent)33;background:var(--surface2)">
              <span class="font-medium">{r.nama_karyawan}</span>
              <span style="color:var(--accent)">{r.jam_masuk}</span>
              {#if r.terlambat_menit}
                <span class="font-bold" style="color:var(--warn)">+{r.terlambat_menit}mnt</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="flex items-center gap-3 flex-wrap">
      <input type="month" bind:value={store.filterBulan}
        class="px-2 py-1 rounded border text-sm outline-none"
        style="background:var(--surface);border-color:var(--border);color:var(--text)" />
      {#if store.isManager}
        <select bind:value={store.filterKaryawanId}
          class="px-2 py-1 rounded border text-sm outline-none"
          style="background:var(--surface);border-color:var(--border);color:var(--text)">
          <option value="">Semua karyawan</option>
          {#each store.karyawanList as k (k.id)}
            <option value={k.id}>{k.nama}</option>
          {/each}
        </select>
        <div class="flex gap-1 text-sm">
          <button onclick={() => store.viewAbsensi = 'list'}
            class="px-3 py-1 rounded"
            style="{store.viewAbsensi === 'list' ? 'background:var(--surface2);color:var(--text)' : 'color:var(--text-dim)'}">List</button>
          <button onclick={() => store.viewAbsensi = 'rekap'}
            class="px-3 py-1 rounded"
            style="{store.viewAbsensi === 'rekap' ? 'background:var(--surface2);color:var(--text)' : 'color:var(--text-dim)'}">Rekap</button>
        </div>
        <div class="flex gap-2 ml-auto">
          {#if store.viewAbsensi === 'rekap' && store.rekapList.length > 0}
            <button onclick={store.exportRekapCsv} class="px-3 py-1 rounded text-sm border"
              style="border-color:var(--border);color:var(--text-dim)">↓ CSV</button>
          {/if}
          <button onclick={() => store.bukaFormAbsensi()} class="px-3 py-1 rounded text-sm font-bold"
            style="background:var(--accent);color:var(--bg)">+ Tambah</button>
        </div>
      {/if}
    </div>

    {#if store.viewAbsensi === 'list'}
      <DataTable
        columns={store.kolAbsensiList}
        tableId="karyawan_absensi"
        bind:sortKey={store.sortKeyAbsensi}
        bind:sortDir={store.sortDirAbsensi}
        rowCount={store.sortedAbsensi.length}
        emptyText="Belum ada data absensi bulan ini"
        maxRows={14}
      >
        {#snippet body(hidden)}
          {#each store.sortedAbsensi as item (item.id)}
            <tr class="border-t" style="border-color:var(--border)">
              {#if !hidden.has('nama_karyawan')}
                <td class="px-3 py-2 font-medium">{item.nama_karyawan}</td>
              {/if}
              {#if !hidden.has('tanggal')}
                <td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.tanggal}</td>
              {/if}
              {#if !hidden.has('jam_masuk')}
                <td class="px-3 py-2">{item.jam_masuk ?? '-'}</td>
              {/if}
              {#if !hidden.has('jam_keluar')}
                <td class="px-3 py-2">{item.jam_keluar ?? '-'}</td>
              {/if}
              {#if !hidden.has('durasi')}
                <td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{hitungDurasi(item.jam_masuk, item.jam_keluar)}</td>
              {/if}
              {#if !hidden.has('status')}
                <td class="px-3 py-2">
                  <span class="text-xs font-bold" style="color:{STATUS_COLOR[item.status]}">{item.status.toUpperCase()}</span>
                </td>
              {/if}
              {#if !hidden.has('terlambat_menit')}
                <td class="px-3 py-2 text-xs">
                  {#if item.terlambat_menit == null}
                    <span style="color:var(--text-dim)">—</span>
                  {:else}
                    <span class="font-bold" style="color:{item.terlambat_menit > 30 ? 'var(--danger)' : 'var(--warn)'}">
                      +{item.terlambat_menit} mnt
                    </span>
                  {/if}
                </td>
              {/if}
              {#if !hidden.has('aksi')}
                <td class="px-3 py-2 text-right">
                  <button onclick={() => store.bukaFormAbsensi(item)} class="text-xs mr-2" style="color:var(--info)">Edit</button>
                  <button onclick={() => store.hapusAbsensi(item.id)} class="text-xs" style="color:var(--danger)">Hapus</button>
                </td>
              {/if}
            </tr>
          {/each}
        {/snippet}
      </DataTable>
    {:else}
      <DataTable
        columns={store.kolAbsensiRekap}
        tableId="karyawan_rekap"
        bind:sortKey={store.sortKeyRekap}
        bind:sortDir={store.sortDirRekap}
        rowCount={store.sortedRekap.length}
        emptyText="Belum ada data"
        maxRows={14}
      >
        {#snippet body(hidden)}
          {#each store.sortedRekap as item (item.karyawan_id)}
            <tr class="border-t" style="border-color:var(--border)">
              {#if !hidden.has('nama_karyawan')}
                <td class="px-3 py-2 font-medium">{item.nama_karyawan}</td>
              {/if}
              {#if !hidden.has('hadir')}
                <td class="px-3 py-2 text-center font-bold" style="color:var(--accent)">{item.hadir}</td>
              {/if}
              {#if !hidden.has('izin')}
                <td class="px-3 py-2 text-center" style="color:var(--info)">{item.izin}</td>
              {/if}
              {#if !hidden.has('sakit')}
                <td class="px-3 py-2 text-center" style="color:var(--warn)">{item.sakit}</td>
              {/if}
              {#if !hidden.has('alpa')}
                <td class="px-3 py-2 text-center" style="color:var(--danger)">{item.alpa}</td>
              {/if}
              {#if !hidden.has('total')}
                <td class="px-3 py-2 text-center" style="color:var(--text-dim)">{item.total}</td>
              {/if}
              {#if !hidden.has('pct')}
                <td class="px-3 py-2 text-center text-xs font-bold"
                  style="color:{item.total > 0 && (item.hadir / item.total) >= 0.8 ? 'var(--accent)' : 'var(--warn)'}">
                  {item.total > 0 ? `${((item.hadir / item.total) * 100).toFixed(0)}%` : '—'}
                </td>
              {/if}
            </tr>
          {/each}
        {/snippet}
      </DataTable>
    {/if}
  {/if}

  <!-- ════════════════════════════════════════════════════════════════════════
       TAB: PENGGAJIAN
  ═════════════════════════════════════════════════════════════════════════ -->
  {#if tab === 'penggajian'}
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
  {/if}

  <!-- ════════════════════════════════════════════════════════════════════════
       TAB: KASBON
  ═════════════════════════════════════════════════════════════════════════ -->
  {#if tab === 'kasbon'}
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
  {/if}

  <!-- ════════ TAB: JADWAL SHIFT ════════════════════════════════════════════ -->
  {#if tab === 'jadwal'}
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
  {/if}

  <!-- ════════════════════════════════════════════════════════════════════════
       TAB: PERFORMA SHIFT
  ═════════════════════════════════════════════════════════════════════════ -->
  {#if tab === 'performa'}
    <div class="flex items-center gap-3 flex-wrap">
      <input type="month" bind:value={store.bulanPerforma}
        class="px-2 py-1 rounded border text-sm outline-none"
        style="background:var(--surface);border-color:var(--border);color:var(--text)" />
      <button onclick={store.muatPerforma}
        class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Tampilkan</button>
      {#if store.performaDetailId}
        <button onclick={() => { store.performaDetailId = null }}
          class="px-3 py-1 rounded text-sm border ml-auto"
          style="border-color:var(--border);color:var(--text-dim)">← Semua Kasir</button>
      {/if}
    </div>

    {#if store.loadingPerforma}
      <div class="flex justify-center py-6"><Spinner /></div>

    {:else if store.performaDetailId && store.performaDetail}
      {@const d = store.performaDetail}
      <div class="flex flex-col gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color:var(--text-dim)">
            {d.karyawan.nama} — {d.bulan}
          </p>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {#each [
              { label: 'Total Shift', val: String(d.ringkasan.total_shift), sub: `${d.ringkasan.shift_ditutup} ditutup` },
              { label: 'Total Transaksi', val: String(d.ringkasan.total_transaksi), sub: `~${d.ringkasan.avg_transaksi_per_shift}/shift` },
              { label: 'Total Penjualan', val: `Rp ${fmtRpK(d.ringkasan.total_penjualan)}`, sub: `~${fmtRpK(d.ringkasan.avg_penjualan_per_shift)}/shift`, accent: true },
              { label: 'Rata-rata/Trx', val: `Rp ${fmtRpK(d.ringkasan.rata_per_trx)}`, sub: `${fmtMenit(d.ringkasan.avg_durasi_menit)} avg shift` },
            ] as c (c.label)}
              <div class="rounded border p-3" style="background:var(--surface);border-color:var(--border)">
                <div class="text-xs mb-0.5" style="color:var(--text-dim)">{c.label}</div>
                <div class="text-sm font-bold" style="color:{c.accent ? 'var(--accent)' : 'var(--text)'}">{c.val}</div>
                <div class="text-xs mt-0.5" style="color:var(--text-dim)">{c.sub}</div>
              </div>
            {/each}
          </div>
        </div>

        <div class="flex flex-wrap gap-3 text-xs">
          {#each [
            { label: 'Hadir', val: d.absensi.hadir, color: 'var(--accent)' },
            { label: 'Izin', val: d.absensi.izin, color: 'var(--info)' },
            { label: 'Sakit', val: d.absensi.sakit, color: 'var(--warn)' },
            { label: 'Alpa', val: d.absensi.alpa, color: 'var(--danger)' },
            { label: 'Void', val: d.ringkasan.total_void, color: d.ringkasan.total_void > 0 ? 'var(--danger)' : 'var(--text-dim)' },
            { label: 'Void rate', val: `${d.ringkasan.void_rate_pct}%`, color: d.ringkasan.void_rate_pct > 1 ? 'var(--warn)' : 'var(--text-dim)' },
          ] as stat (stat.label)}
            <div class="flex items-center gap-1.5 rounded border px-2 py-1" style="border-color:var(--border)">
              <span style="color:var(--text-dim)">{stat.label}</span>
              <span class="font-bold" style="color:{stat.color}">{stat.val}</span>
            </div>
          {/each}
        </div>

        {#if d.per_shift.length > 0}
          {@const maxPenjualan = Math.max(...d.per_shift.map(s => s.total_penjualan), 1)}
          <div>
            <p class="text-xs font-semibold mb-2" style="color:var(--text-dim)">Penjualan per Shift</p>
            <div class="flex items-end gap-0.5 overflow-x-auto" style="height:80px;padding-bottom:1.5rem">
              {#each d.per_shift as s (s.id)}
                {@const pct = (s.total_penjualan / maxPenjualan) * 100}
                <div class="flex flex-col items-center shrink-0" style="min-width:22px;height:100%;position:relative"
                  title="{s.tanggal.slice(8)} {s.jam_buka}–{s.jam_tutup ?? '?'} | {s.jumlah_transaksi} trx | Rp {fmtRpK(s.total_penjualan)}">
                  <div class="flex-1 flex items-end w-full">
                    <div style="width:100%;height:{pct}%;min-height:{pct > 0 ? 2 : 0}px;
                      background:{s.status === 'tutup' ? 'var(--accent)' : 'var(--border)'};
                      border-radius:2px 2px 0 0;opacity:{pct === 0 ? .3 : 1}"></div>
                  </div>
                  <span style="position:absolute;bottom:-1.3rem;font-size:.55rem;color:var(--text-dim)">{s.tanggal.slice(8)}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <div class="overflow-x-auto">
          <table class="min-w-full" style="border-collapse:collapse;font-size:.8rem;min-width:540px">
            <thead>
              <tr style="background:var(--surface2)">
                <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Tanggal</th>
                <th class="px-2 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Jam</th>
                <th class="px-2 py-2 text-left text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Durasi</th>
                <th class="px-2 py-2 text-right text-xs font-semibold" style="color:var(--text-dim)">Trx</th>
                <th class="px-3 py-2 text-right text-xs font-semibold" style="color:var(--text-dim)">Penjualan</th>
                <th class="px-2 py-2 text-right text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Trx/jam</th>
                <th class="px-2 py-2 text-right text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Selisih Kas</th>
                <th class="px-2 py-2 text-center text-xs font-semibold" style="color:var(--text-dim)">Status</th>
              </tr>
            </thead>
            <tbody>
              {#each d.per_shift as s (s.id)}
                <tr style="border-top:1px solid var(--border)">
                  <td class="px-3 py-2" style="color:var(--text)">
                    {new Date(s.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { weekday:'short', day:'numeric', month:'short' })}
                  </td>
                  <td class="px-2 py-2 text-xs" style="color:var(--text-dim)">{s.jam_buka}–{s.jam_tutup ?? '?'}</td>
                  <td class="px-2 py-2 hidden sm:table-cell" style="color:var(--text-dim)">{fmtMenit(s.durasi_menit)}</td>
                  <td class="px-2 py-2 text-right font-semibold" style="color:var(--text)">{s.jumlah_transaksi}</td>
                  <td class="px-3 py-2 text-right font-semibold" style="color:var(--accent)">Rp {fmtRpK(s.total_penjualan)}</td>
                  <td class="px-2 py-2 text-right hidden sm:table-cell" style="color:var(--text-dim)">{s.trx_per_jam ?? '—'}</td>
                  <td class="px-2 py-2 text-right hidden sm:table-cell"
                    style="color:{s.selisih_kas != null && s.selisih_kas !== 0 ? (s.selisih_kas > 0 ? 'var(--accent)' : 'var(--danger)') : 'var(--text-dim)'}">
                    {s.selisih_kas != null ? (s.selisih_kas >= 0 ? '+' : '') + new Intl.NumberFormat('id-ID').format(s.selisih_kas) : '—'}
                  </td>
                  <td class="px-2 py-2 text-center">
                    <span class="text-xs px-1.5 py-0.5 rounded"
                      style="background:{s.status === 'tutup' ? 'rgba(var(--accent-rgb,0,128,0),.15)' : 'var(--surface2)'};
                             color:{s.status === 'tutup' ? 'var(--accent)' : 'var(--warn)'}">
                      {s.status}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

    {:else if store.performaList.length === 0}
      <p class="text-sm py-4" style="color:var(--text-dim)">Tidak ada kasir aktif atau belum ada shift di bulan ini.</p>

    {:else}
      <div class="overflow-x-auto">
        <table class="min-w-full" style="border-collapse:collapse;font-size:.8rem;min-width:560px">
          <thead>
            <tr style="background:var(--surface2)">
              <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Kasir</th>
              <th class="px-2 py-2 text-right text-xs font-semibold" style="color:var(--text-dim)">Shift</th>
              <th class="px-2 py-2 text-right text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Trx</th>
              <th class="px-3 py-2 text-right text-xs font-semibold" style="color:var(--text-dim)">Penjualan</th>
              <th class="px-2 py-2 text-right text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Trx/jam</th>
              <th class="px-2 py-2 text-right text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Avg/Trx</th>
              <th class="px-2 py-2 text-right text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Void%</th>
              <th class="px-2 py-2 text-right text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Hadir</th>
              <th class="px-2 py-2 text-center text-xs font-semibold" style="color:var(--text-dim)">Detail</th>
            </tr>
          </thead>
          <tbody>
            {#each store.performaList.sort((a, b) => b.total_penjualan - a.total_penjualan) as p (p.id)}
              <tr style="border-top:1px solid var(--border)">
                <td class="px-3 py-2 font-semibold" style="color:var(--text)">{p.nama}</td>
                <td class="px-2 py-2 text-right" style="color:var(--text-dim)">
                  {p.total_shift}
                  {#if p.total_shift > p.shift_ditutup}
                    <span class="text-xs" style="color:var(--warn)">({p.total_shift - p.shift_ditutup}buka)</span>
                  {/if}
                </td>
                <td class="px-2 py-2 text-right font-semibold hidden sm:table-cell" style="color:var(--text)">{p.total_transaksi}</td>
                <td class="px-3 py-2 text-right font-bold" style="color:var(--accent)">Rp {fmtRpK(p.total_penjualan)}</td>
                <td class="px-2 py-2 text-right hidden sm:table-cell" style="color:var(--text-dim)">
                  {p.trx_per_jam > 0 ? p.trx_per_jam : '—'}
                </td>
                <td class="px-2 py-2 text-right hidden sm:table-cell" style="color:var(--text-dim)">
                  {p.rata_per_trx > 0 ? `Rp ${fmtRpK(p.rata_per_trx)}` : '—'}
                </td>
                <td class="px-2 py-2 text-right hidden sm:table-cell"
                  style="color:{p.void_rate_pct > 1 ? 'var(--warn)' : 'var(--text-dim)'}">
                  {p.void_rate_pct > 0 ? `${p.void_rate_pct}%` : '—'}
                </td>
                <td class="px-2 py-2 text-right hidden sm:table-cell"
                  style="color:{p.absensi.alpa > 0 ? 'var(--warn)' : 'var(--text-dim)'}">
                  {p.absensi.hadir}
                  {#if p.absensi.alpa > 0}
                    <span class="text-xs" style="color:var(--danger)">/{p.absensi.alpa}alpa</span>
                  {/if}
                </td>
                <td class="px-2 py-2 text-center">
                  <button onclick={() => store.muatPerformaDetail(p.id)}
                    class="text-xs px-2 py-0.5 rounded border"
                    style="border-color:var(--border);color:var(--info);cursor:pointer">
                    Detail →
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}

  <!-- ════════════════════════════════════════════════════════════════════════
       TAB: CUTI & IZIN
  ═════════════════════════════════════════════════════════════════════════ -->
  {#if tab === 'izin'}
    <div class="flex flex-wrap gap-2 mb-3 items-end">
      <select bind:value={izinKaryawanId}
        class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
        <option value="">Semua Karyawan</option>
        {#each store.karyawanList as k (k.id)}
          <option value={String(k.id)}>{k.nama}</option>
        {/each}
      </select>
      <input type="month" bind:value={izinBulan}
        class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
      <button onclick={() => { izinError=''; fIzinJenis='izin'; fIzinMulai=''; fIzinSelesai=''; fIzinAlasan=''; fIzinKaryawanId=''; izinFormOpen=true }}
        class="px-3 py-1 rounded text-sm font-bold ml-auto" style="background:var(--accent);color:var(--bg)">+ Ajukan</button>
    </div>
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead><tr class="text-xs" style="color:var(--text-dim)">
          <th class="text-left py-2 pr-3">Karyawan</th>
          <th class="text-left py-2 pr-3">Jenis</th>
          <th class="text-left py-2 pr-3">Mulai</th>
          <th class="text-left py-2 pr-3">Selesai</th>
          <th class="text-left py-2 pr-3">Alasan</th>
          <th class="text-left py-2 pr-3">Status</th>
          <th class="py-2"></th>
        </tr></thead>
        <tbody>
          {#each izinRows as row (row.id)}
            <tr class="border-t text-sm" style="border-color:var(--border)">
              <td class="py-2 pr-3 font-medium">{row.nama_karyawan}</td>
              <td class="py-2 pr-3 capitalize">{row.jenis}</td>
              <td class="py-2 pr-3">{row.tanggal_mulai}</td>
              <td class="py-2 pr-3">{row.tanggal_selesai}</td>
              <td class="py-2 pr-3" style="color:var(--text-dim)">{row.alasan ?? '-'}</td>
              <td class="py-2 pr-3">
                {#if row.status === 'menunggu'}
                  <span class="px-2 py-0.5 rounded-full text-xs" style="background:color-mix(in srgb,var(--warn) 20%,transparent);color:var(--warn)">Menunggu</span>
                {:else if row.status === 'disetujui'}
                  <span class="px-2 py-0.5 rounded-full text-xs" style="background:color-mix(in srgb,var(--accent) 20%,transparent);color:var(--accent)">Disetujui</span>
                {:else}
                  <span class="px-2 py-0.5 rounded-full text-xs" style="background:color-mix(in srgb,var(--danger) 20%,transparent);color:var(--danger)">Ditolak</span>
                {/if}
              </td>
              <td class="py-2 text-right">
                {#if row.status === 'menunggu' && $user && ['pemilik','manajer'].includes($user.role)}
                  <button onclick={() => setujuiIzin(row.id)} class="text-xs px-2 py-0.5 rounded mr-1" style="background:color-mix(in srgb,var(--accent) 20%,transparent);color:var(--accent)">Setujui</button>
                  <button onclick={() => tolakIzin(row.id)} class="text-xs px-2 py-0.5 rounded" style="background:color-mix(in srgb,var(--danger) 20%,transparent);color:var(--danger)">Tolak</button>
                {/if}
              </td>
            </tr>
          {/each}
          {#if !izinRows.length}
            <tr><td colspan="7" class="py-6 text-center text-sm" style="color:var(--text-dim)">{izinLoading ? 'Memuat...' : 'Belum ada pengajuan'}</td></tr>
          {/if}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- ════════════════════════════════════════════════════════════════════════
       TAB: EVALUASI
  ═════════════════════════════════════════════════════════════════════════ -->
  {#if tab === 'evaluasi'}
    <div class="flex flex-wrap gap-2 mb-3 items-end">
      <select bind:value={evalKaryawanId}
        class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
        <option value="">Semua Karyawan</option>
        {#each store.karyawanList as k (k.id)}
          <option value={String(k.id)}>{k.nama}</option>
        {/each}
      </select>
      <input type="month" bind:value={evalPeriode} placeholder="Periode"
        class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
      {#if $user && ['pemilik','manajer'].includes($user.role)}
        <button onclick={() => bukaEvalForm()}
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
          {#each evalRows as row (row.id)}
            <tr class="border-t text-sm" style="border-color:var(--border)">
              <td class="py-2 pr-3 font-medium">{row.nama_karyawan}</td>
              <td class="py-2 pr-3">{row.periode}</td>
              <td class="py-2 pr-3 text-center">
                <span class="font-bold text-base" style="color:{row.nilai >= 4 ? 'var(--accent)' : row.nilai <= 2 ? 'var(--danger)' : 'var(--warn)'}">{'★'.repeat(row.nilai)}{'☆'.repeat(5-row.nilai)}</span>
              </td>
              <td class="py-2 pr-3 text-xs" style="color:var(--text-dim)">{row.catatan ?? '-'}</td>
              <td class="py-2 pr-3 text-xs">{row.tanggal}</td>
              <td class="py-2 text-right">
                {#if $user && ['pemilik','manajer'].includes($user.role)}
                  <button onclick={() => bukaEvalForm(row)} class="text-xs px-2 py-0.5 rounded mr-1" style="color:var(--text-dim);border:1px solid var(--border)">Edit</button>
                  <button onclick={() => hapusEval(row.id)} class="text-xs px-2 py-0.5 rounded" style="color:var(--danger)">Hapus</button>
                {/if}
              </td>
            </tr>
          {/each}
          {#if !evalRows.length}
            <tr><td colspan="6" class="py-6 text-center text-sm" style="color:var(--text-dim)">Belum ada evaluasi</td></tr>
          {/if}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- ════════════════════════════════════════════════════════════════════════
       TAB: SANKSI & INSENTIF
  ═════════════════════════════════════════════════════════════════════════ -->
  {#if tab === 'sanksi'}
    <div class="flex flex-wrap gap-2 mb-3 items-end">
      <select bind:value={siKaryawanId}
        class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
        <option value="">Semua Karyawan</option>
        {#each store.karyawanList as k (k.id)}
          <option value={String(k.id)}>{k.nama}</option>
        {/each}
      </select>
      <input type="month" bind:value={siBulan}
        class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
      <select bind:value={siTipe}
        class="border rounded px-2 py-1 text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)">
        <option value="">Semua Tipe</option>
        <option value="sanksi">Sanksi</option>
        <option value="insentif">Insentif</option>
      </select>
      {#if $user && ['pemilik','manajer'].includes($user.role)}
        <button onclick={() => { siError=''; fSiKaryawanId=''; fSiTipe='insentif'; fSiJenis=''; fSiJumlah=''; fSiTanggal=''; fSiBulan=siBulan; fSiKet=''; siFormOpen=true }}
          class="px-3 py-1 rounded text-sm font-bold ml-auto" style="background:var(--accent);color:var(--bg)">+ Catat</button>
      {/if}
    </div>
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead><tr class="text-xs" style="color:var(--text-dim)">
          <th class="text-left py-2 pr-3">Karyawan</th>
          <th class="text-left py-2 pr-3">Tipe</th>
          <th class="text-left py-2 pr-3">Jenis</th>
          <th class="text-right py-2 pr-3">Jumlah</th>
          <th class="text-left py-2 pr-3">Periode</th>
          <th class="text-left py-2 pr-3">Keterangan</th>
          <th class="py-2"></th>
        </tr></thead>
        <tbody>
          {#each siRows as row (row.id)}
            <tr class="border-t text-sm" style="border-color:var(--border)">
              <td class="py-2 pr-3 font-medium">{row.nama_karyawan}</td>
              <td class="py-2 pr-3">
                {#if row.tipe === 'insentif'}
                  <span class="px-2 py-0.5 rounded-full text-xs" style="background:color-mix(in srgb,var(--accent) 20%,transparent);color:var(--accent)">Insentif</span>
                {:else}
                  <span class="px-2 py-0.5 rounded-full text-xs" style="background:color-mix(in srgb,var(--danger) 20%,transparent);color:var(--danger)">Sanksi</span>
                {/if}
              </td>
              <td class="py-2 pr-3">{row.jenis}</td>
              <td class="py-2 pr-3 text-right font-mono">{rp(row.jumlah)}</td>
              <td class="py-2 pr-3 text-xs">{row.periode_bulan}</td>
              <td class="py-2 pr-3 text-xs" style="color:var(--text-dim)">{row.keterangan ?? '-'}</td>
              <td class="py-2 text-right">
                {#if $user && ['pemilik','manajer'].includes($user.role)}
                  <button onclick={() => hapusSI(row.id)} class="text-xs px-2 py-0.5 rounded" style="color:var(--danger)">Hapus</button>
                {/if}
              </td>
            </tr>
          {/each}
          {#if !siRows.length}
            <tr><td colspan="7" class="py-6 text-center text-sm" style="color:var(--text-dim)">Belum ada data</td></tr>
          {/if}
        </tbody>
      </table>
    </div>
  {/if}

</div>

<!-- ── Modal: Form Karyawan ─────────────────────────────────────────────────── -->
<FormKaryawan {store} />

<!-- ── Modal: Form Absensi ──────────────────────────────────────────────────── -->
<SlideOver bind:open={store.modalAbsensiOpen} title={store.editAbsensi ? 'Edit Absensi' : 'Tambah Absensi'}>
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); store.simpanAbsensi() }} class="flex flex-col gap-3 text-sm">
    <div class="grid grid-cols-2 gap-3">
      {#if store.isManager}
        <div class="flex flex-col gap-1 col-span-2">
          <label for="fa-karyw" class="text-xs" style="color:var(--text-dim)">KARYAWAN *</label>
          <select id="fa-karyw" bind:value={store.formAbsensi.karyawan_id} required
            class="px-2 py-1 rounded border outline-none"
            style="background:var(--surface2);border-color:var(--border);color:var(--text)">
            <option value="">-- Pilih --</option>
            {#each store.karyawanList as k (k.id)}
              <option value={String(k.id)}>{k.nama}</option>
            {/each}
          </select>
        </div>
      {/if}
      <div class="flex flex-col gap-1">
        <label for="fa-tgl" class="text-xs" style="color:var(--text-dim)">TANGGAL *</label>
        <input id="fa-tgl" type="date" bind:value={store.formAbsensi.tanggal} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-status" class="text-xs" style="color:var(--text-dim)">STATUS *</label>
        <select id="fa-status" bind:value={store.formAbsensi.status}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)">
          <option value="hadir">Hadir</option>
          <option value="izin">Izin</option>
          <option value="sakit">Sakit</option>
          <option value="alpa">Alpa</option>
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-masuk" class="text-xs" style="color:var(--text-dim)">JAM MASUK</label>
        <input id="fa-masuk" type="time" bind:value={store.formAbsensi.jam_masuk}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-keluar" class="text-xs" style="color:var(--text-dim)">JAM KELUAR</label>
        <input id="fa-keluar" type="time" bind:value={store.formAbsensi.jam_keluar}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-shift" class="text-xs" style="color:var(--text-dim)">SHIFT</label>
        <input id="fa-shift" bind:value={store.formAbsensi.shift} placeholder="Pagi / Sore / ..."
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
    </div>
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => store.modalAbsensiOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </form>
  {/snippet}
</SlideOver>

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

<!-- ── Modal: Form Kasbon ───────────────────────────────────────────────────── -->
<SlideOver bind:open={store.modalKasbonOpen} title="Tambah Kasbon">
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); store.simpanKasbon() }} class="flex flex-col gap-3 text-sm">
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1 col-span-2">
        <label for="fk-karyw" class="text-xs" style="color:var(--text-dim)">KARYAWAN *</label>
        <select id="fk-karyw" bind:value={store.formKasbon.karyawan_id} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)">
          <option value="">-- Pilih --</option>
          {#each store.karyawanList as k (k.id)}
            <option value={String(k.id)}>{k.nama}</option>
          {/each}
        </select>
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
      <select id="ftu-jadwal" bind:value={store.formTukar.jadwal_id} required
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)">
        <option value="">-- Pilih Jadwal --</option>
        {#each store.jadwalSendiri as j (j.id)}
          <option value={String(j.id)}>{j.tanggal} — {j.nama_shift}</option>
        {/each}
      </select>
      {#if store.jadwalSendiri.length === 0}
        <p class="text-xs" style="color:var(--text-dim)">Tidak ada jadwal di minggu ini.</p>
      {/if}
    </div>
    <div class="flex flex-col gap-1">
      <label for="ftu-penerima" class="text-xs" style="color:var(--text-dim)">DITUKAR DENGAN *</label>
      <select id="ftu-penerima" bind:value={store.formTukar.penerima_id} required
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)">
        <option value="">-- Pilih Karyawan --</option>
        {#each store.karyawanList.filter(k => $user && k.id !== $user.id) as k (k.id)}
          <option value={String(k.id)}>{k.nama}</option>
        {/each}
      </select>
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

<!-- ── Modal: Ajukan Cuti/Izin ──────────────────────────────────────────────── -->
<SlideOver bind:open={izinFormOpen} title="Ajukan Cuti / Izin">
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); simpanIzin() }} class="flex flex-col gap-3 text-sm">
    {#if $user && ['pemilik','manajer'].includes($user.role)}
      <div class="flex flex-col gap-1">
        <label for="fi-karyw" class="text-xs" style="color:var(--text-dim)">KARYAWAN *</label>
        <select id="fi-karyw" bind:value={fIzinKaryawanId}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)">
          <option value="">-- Saya Sendiri --</option>
          {#each store.karyawanList as k (k.id)}
            <option value={String(k.id)}>{k.nama}</option>
          {/each}
        </select>
      </div>
    {/if}
    <div class="flex flex-col gap-1">
      <span class="text-xs" style="color:var(--text-dim)">JENIS *</span>
      <div class="flex gap-3 flex-wrap">
        {#each ([['izin','Izin'],['cuti','Cuti'],['sakit','Sakit']] as const) as [v, lbl] (v)}
          <label class="flex items-center gap-1.5 cursor-pointer text-sm">
            <input type="radio" bind:group={fIzinJenis} value={v} class="accent-[var(--accent)]" />
            {lbl}
          </label>
        {/each}
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label for="fi-mulai" class="text-xs" style="color:var(--text-dim)">TANGGAL MULAI *</label>
        <input id="fi-mulai" type="date" bind:value={fIzinMulai} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fi-selesai" class="text-xs" style="color:var(--text-dim)">TANGGAL SELESAI *</label>
        <input id="fi-selesai" type="date" bind:value={fIzinSelesai} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
    </div>
    <div class="flex flex-col gap-1">
      <label for="fi-alasan" class="text-xs" style="color:var(--text-dim)">ALASAN</label>
      <textarea id="fi-alasan" bind:value={fIzinAlasan} rows="3" placeholder="Opsional"
        class="px-2 py-1 rounded border outline-none resize-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)"></textarea>
    </div>
    {#if izinError}
      <p class="text-xs" style="color:var(--danger)">{izinError}</p>
    {/if}
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => izinFormOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Kirim</button>
    </div>
  </form>
  {/snippet}
</SlideOver>

<!-- ── Modal: Form Evaluasi ──────────────────────────────────────────────────── -->
<SlideOver bind:open={evalFormOpen} title={editEvalId ? 'Edit Evaluasi' : 'Tambah Evaluasi'}>
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); simpanEval() }} class="flex flex-col gap-3 text-sm">
    <div class="flex flex-col gap-1">
      <label for="fe-karyw" class="text-xs" style="color:var(--text-dim)">KARYAWAN *</label>
      <select id="fe-karyw" bind:value={fEvalKaryawanId} required
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
      <input id="fe-periode" type="month" bind:value={fEvalPeriode} required
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex flex-col gap-1">
      <span class="text-xs" style="color:var(--text-dim)">NILAI *</span>
      <div class="flex gap-1">
        {#each [1,2,3,4,5] as n (n)}
          <button type="button" onclick={() => fEvalNilai = String(n)}
            class="text-2xl leading-none transition-transform hover:scale-110"
            style="color:{Number(fEvalNilai) >= n ? 'var(--warn)' : 'var(--border)'}">
            ★
          </button>
        {/each}
        <span class="ml-2 text-sm self-center" style="color:var(--text-dim)">{fEvalNilai}/5</span>
      </div>
    </div>
    <div class="flex flex-col gap-1">
      <label for="fe-catatan" class="text-xs" style="color:var(--text-dim)">CATATAN</label>
      <textarea id="fe-catatan" bind:value={fEvalCatatan} rows="3" placeholder="Opsional"
        class="px-2 py-1 rounded border outline-none resize-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)"></textarea>
    </div>
    {#if evalError}
      <p class="text-xs" style="color:var(--danger)">{evalError}</p>
    {/if}
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => evalFormOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </form>
  {/snippet}
</SlideOver>

<!-- ── Modal: Form Sanksi & Insentif ────────────────────────────────────────── -->
<SlideOver bind:open={siFormOpen} title="Catat Sanksi / Insentif">
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); simpanSI() }} class="flex flex-col gap-3 text-sm">
    <div class="flex flex-col gap-1">
      <label for="fsi-karyw" class="text-xs" style="color:var(--text-dim)">KARYAWAN *</label>
      <select id="fsi-karyw" bind:value={fSiKaryawanId} required
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)">
        <option value="">-- Pilih --</option>
        {#each store.karyawanList as k (k.id)}
          <option value={String(k.id)}>{k.nama}</option>
        {/each}
      </select>
    </div>
    <div class="flex flex-col gap-1">
      <span class="text-xs" style="color:var(--text-dim)">TIPE *</span>
      <div class="flex gap-4">
        {#each ([['insentif','Insentif'],['sanksi','Sanksi']] as const) as [v, lbl] (v)}
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" bind:group={fSiTipe} value={v} class="accent-[var(--accent)]" />
            <span style="color:{v === 'insentif' ? 'var(--accent)' : 'var(--danger)'}">{lbl}</span>
          </label>
        {/each}
      </div>
    </div>
    <div class="flex flex-col gap-1">
      <label for="fsi-jenis" class="text-xs" style="color:var(--text-dim)">JENIS *</label>
      <input id="fsi-jenis" bind:value={fSiJenis} required placeholder="mis. Bonus penjualan, Keterlambatan, ..."
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label for="fsi-jml" class="text-xs" style="color:var(--text-dim)">JUMLAH (Rp) *</label>
        <input id="fsi-jml" type="number" min="1" bind:value={fSiJumlah} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fsi-tgl" class="text-xs" style="color:var(--text-dim)">TANGGAL *</label>
        <input id="fsi-tgl" type="date" bind:value={fSiTanggal} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
    </div>
    <div class="flex flex-col gap-1">
      <label for="fsi-bulan" class="text-xs" style="color:var(--text-dim)">PERIODE BULAN *</label>
      <input id="fsi-bulan" type="month" bind:value={fSiBulan} required
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex flex-col gap-1">
      <label for="fsi-ket" class="text-xs" style="color:var(--text-dim)">KETERANGAN</label>
      <input id="fsi-ket" bind:value={fSiKet} placeholder="Opsional"
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    {#if siError}
      <p class="text-xs" style="color:var(--danger)">{siError}</p>
    {/if}
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => siFormOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </form>
  {/snippet}
</SlideOver>
