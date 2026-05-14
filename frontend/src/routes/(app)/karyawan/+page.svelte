<script lang="ts">
  import { onMount } from 'svelte'
  import { api } from '$lib/utils/api.js'
  import { user } from '$lib/stores/auth.js'
  import Modal from '$lib/components/Modal.svelte'

  // ── Tab ─────────────────────────────────────────────────────────────────────
  type Tab = 'data' | 'absensi' | 'penggajian' | 'kasbon'
  let tab = $state<Tab>('data')

  const canManageGaji = $derived($user?.role === 'pemilik' || $user?.role === 'manajer')
  const canSemua = $derived($user?.role === 'pemilik' || $user?.role === 'manajer')

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB: DATA KARYAWAN
  // ═══════════════════════════════════════════════════════════════════════════

  type Karyawan = {
    id: number; kode_karyawan: string; nama: string
    role: string; username: string; gaji_pokok: number
    tipe_gaji: string; kontak: string | null; is_active: boolean
  }

  let karyawanList = $state<Karyawan[]>([])
  let queryKaryawan = $state('')
  let loadingKaryawan = $state(false)
  let modalKaryawanOpen = $state(false)
  let editKaryawan = $state<Partial<Karyawan> | null>(null)
  let formKaryawan = $state({
    kode_karyawan: '', nama: '', role: 'kasir', username: '',
    password: '', gaji_pokok: '', tipe_gaji: 'bulanan', kontak: '',
  })
  let errorKaryawan = $state('')

  async function muatKaryawan() {
    loadingKaryawan = true
    const res = await api.get<Karyawan[]>(`/karyawan?q=${queryKaryawan}`)
    if (res.success) karyawanList = res.data
    loadingKaryawan = false
  }

  onMount(muatKaryawan)
  $effect(() => { queryKaryawan; muatKaryawan() })

  function bukaFormKaryawan(item?: Karyawan) {
    editKaryawan = item ?? null
    formKaryawan = {
      kode_karyawan: item?.kode_karyawan ?? '',
      nama: item?.nama ?? '',
      role: item?.role ?? 'kasir',
      username: item?.username ?? '',
      password: '',
      gaji_pokok: String(item?.gaji_pokok ?? ''),
      tipe_gaji: item?.tipe_gaji ?? 'bulanan',
      kontak: item?.kontak ?? '',
    }
    modalKaryawanOpen = true
  }

  async function simpanKaryawan() {
    errorKaryawan = ''
    const payload: Record<string, unknown> = {
      kode_karyawan: formKaryawan.kode_karyawan,
      nama: formKaryawan.nama,
      role: formKaryawan.role,
      username: formKaryawan.username,
      gaji_pokok: Number(formKaryawan.gaji_pokok) || 0,
      tipe_gaji: formKaryawan.tipe_gaji,
      kontak: formKaryawan.kontak || undefined,
    }
    if (formKaryawan.password) payload.password = formKaryawan.password
    if (!editKaryawan?.id) payload.password = formKaryawan.password

    const res = editKaryawan?.id
      ? await api.put(`/karyawan/${editKaryawan.id}`, payload)
      : await api.post('/karyawan', payload)

    if (!res.success) { errorKaryawan = (res as { success: false; error: string }).error; return }
    modalKaryawanOpen = false
    muatKaryawan()
  }

  async function hapusKaryawan(id: number) {
    if (!confirm('Nonaktifkan karyawan ini?')) return
    await api.delete(`/karyawan/${id}`)
    muatKaryawan()
  }

  const ROLE_COLOR: Record<string, string> = {
    pemilik: 'var(--accent)', manajer: 'var(--info)',
    kasir: 'var(--warn)', gudang: 'var(--text-dim)',
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB: ABSENSI
  // ═══════════════════════════════════════════════════════════════════════════

  type AbsensiRow = {
    id: number; karyawan_id: number; nama_karyawan: string
    tanggal: string; jam_masuk: string | null; jam_keluar: string | null
    shift: string | null; status: 'hadir' | 'izin' | 'sakit' | 'alpa'
  }

  type RekapRow = {
    karyawan_id: number; nama_karyawan: string
    hadir: number; izin: number; sakit: number; alpa: number; total: number
  }

  const bulanSekarang = new Date().toISOString().slice(0, 7)
  let filterBulan = $state(bulanSekarang)
  let filterKaryawanId = $state<number | ''>('')
  let absensiList = $state<AbsensiRow[]>([])
  let rekapList = $state<RekapRow[]>([])
  let loadingAbsensi = $state(false)
  let viewAbsensi = $state<'list' | 'rekap'>('list')
  let modalAbsensiOpen = $state(false)
  let editAbsensi = $state<AbsensiRow | null>(null)
  let formAbsensi = $state<{
    karyawan_id: string; tanggal: string; jam_masuk: string; jam_keluar: string
    shift: string; status: 'hadir' | 'izin' | 'sakit' | 'alpa'
  }>({
    karyawan_id: '', tanggal: new Date().toISOString().slice(0, 10),
    jam_masuk: '', jam_keluar: '', shift: '', status: 'hadir',
  })
  let errorAbsensi = $state('')

  // Data hari ini untuk kasir/gudang (clock in/out)
  let absensiHariIni = $derived(
    absensiList.find(
      (a) => a.karyawan_id === $user?.id && a.tanggal === new Date().toISOString().slice(0, 10)
    ) ?? null
  )

  async function muatAbsensi() {
    loadingAbsensi = true
    const params = new URLSearchParams({ bulan: filterBulan })
    if (filterKaryawanId) params.set('karyawan_id', String(filterKaryawanId))
    const res = await api.get<AbsensiRow[]>(`/absensi?${params}`)
    if (res.success) absensiList = res.data

    if (canSemua) {
      const r2 = await api.get<RekapRow[]>(`/absensi/rekap?bulan=${filterBulan}`)
      if (r2.success) rekapList = r2.data
    }
    loadingAbsensi = false
  }

  $effect(() => { if (tab === 'absensi') { filterBulan; filterKaryawanId; muatAbsensi() } })

  function bukaFormAbsensi(item?: AbsensiRow) {
    editAbsensi = item ?? null
    formAbsensi = {
      karyawan_id: item ? String(item.karyawan_id) : (canSemua ? '' : String($user?.id ?? '')),
      tanggal: item?.tanggal ?? new Date().toISOString().slice(0, 10),
      jam_masuk: item?.jam_masuk ?? '',
      jam_keluar: item?.jam_keluar ?? '',
      shift: item?.shift ?? '',
      status: item?.status ?? 'hadir',
    }
    modalAbsensiOpen = true
  }

  async function simpanAbsensi() {
    errorAbsensi = ''
    const payload = {
      karyawan_id: Number(formAbsensi.karyawan_id),
      tanggal: formAbsensi.tanggal,
      jam_masuk: formAbsensi.jam_masuk || undefined,
      jam_keluar: formAbsensi.jam_keluar || undefined,
      shift: formAbsensi.shift || undefined,
      status: formAbsensi.status,
    }
    const res = editAbsensi
      ? await api.put(`/absensi/${editAbsensi.id}`, payload)
      : await api.post('/absensi', payload)
    if (!res.success) { errorAbsensi = (res as { success: false; error: string }).error; return }
    modalAbsensiOpen = false
    muatAbsensi()
  }

  async function hapusAbsensi(id: number) {
    if (!confirm('Hapus data absensi ini?')) return
    await api.delete(`/absensi/${id}`)
    muatAbsensi()
  }

  async function clockIn() {
    const now = new Date()
    const res = await api.post('/absensi', {
      karyawan_id: $user?.id,
      tanggal: now.toISOString().slice(0, 10),
      jam_masuk: now.toTimeString().slice(0, 5),
      status: 'hadir',
    })
    if (!res.success) alert((res as { success: false; error: string }).error)
    else muatAbsensi()
  }

  async function clockOut() {
    if (!absensiHariIni) return
    const now = new Date()
    const res = await api.put(`/absensi/${absensiHariIni.id}`, {
      jam_keluar: now.toTimeString().slice(0, 5),
    })
    if (!res.success) alert((res as { success: false; error: string }).error)
    else muatAbsensi()
  }

  const STATUS_COLOR: Record<string, string> = {
    hadir: 'var(--accent)', izin: 'var(--info)',
    sakit: 'var(--warn)', alpa: 'var(--danger)',
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB: PENGGAJIAN
  // ═══════════════════════════════════════════════════════════════════════════

  type PenggajianRow = {
    id: number; karyawan_id: number; nama_karyawan: string; tipe_gaji: string
    periode_bulan: string; hari_kerja: number; hari_hadir: number
    gaji_pokok: number; tunjangan: number; potongan_kasbon: number
    potongan_lain: number; total_gaji: number
    status: 'draft' | 'approved' | 'dibayar'
  }

  type KasBank = { id: number; nama: string; tipe: string }

  let filterBulanGaji = $state(bulanSekarang)
  let penggajianList = $state<PenggajianRow[]>([])
  let kasBankList = $state<KasBank[]>([])
  let loadingGaji = $state(false)
  let loadingGenerate = $state(false)
  let modalGajiOpen = $state(false)
  let editGaji = $state<PenggajianRow | null>(null)
  let formGaji = $state({ tunjangan: '', potongan_lain: '' })
  let errorGaji = $state('')
  let modalBayarOpen = $state(false)
  let bayarGajiId = $state<number | null>(null)
  let bayarKasBankId = $state('')

  async function muatPenggajian() {
    loadingGaji = true
    const [r1, r2] = await Promise.all([
      api.get<PenggajianRow[]>(`/penggajian?bulan=${filterBulanGaji}`),
      api.get<KasBank[]>('/keuangan/kas-bank'),
    ])
    if (r1.success) penggajianList = r1.data
    if (r2.success) kasBankList = r2.data
    loadingGaji = false
  }

  $effect(() => { if (tab === 'penggajian') { filterBulanGaji; muatPenggajian() } })

  async function generateGaji() {
    if (!confirm(`Generate slip gaji untuk bulan ${filterBulanGaji}? Data yang sudah ada tidak akan ditimpa.`)) return
    loadingGenerate = true
    const res = await api.post<{ generated: number; skipped: number }>('/penggajian/generate', { bulan: filterBulanGaji })
    loadingGenerate = false
    if (res.success) {
      alert(`${res.data.generated} slip dibuat, ${res.data.skipped} sudah ada.`)
      muatPenggajian()
    } else {
      alert((res as { success: false; error: string }).error)
    }
  }

  function bukaEditGaji(item: PenggajianRow) {
    editGaji = item
    formGaji = { tunjangan: String(item.tunjangan), potongan_lain: String(item.potongan_lain) }
    modalGajiOpen = true
  }

  async function simpanEditGaji() {
    if (!editGaji) return
    errorGaji = ''
    const res = await api.put(`/penggajian/${editGaji.id}`, {
      tunjangan: Number(formGaji.tunjangan) || 0,
      potongan_lain: Number(formGaji.potongan_lain) || 0,
    })
    if (!res.success) { errorGaji = (res as { success: false; error: string }).error; return }
    modalGajiOpen = false
    muatPenggajian()
  }

  async function updateStatusGaji(id: number, status: 'approved' | 'dibayar', kasBankId?: number) {
    const payload: Record<string, unknown> = { status }
    if (kasBankId) payload.kas_bank_id = kasBankId
    const res = await api.put(`/penggajian/${id}`, payload)
    if (!res.success) alert((res as { success: false; error: string }).error)
    else muatPenggajian()
  }

  function bukaBayar(id: number) {
    bayarGajiId = id
    bayarKasBankId = kasBankList[0] ? String(kasBankList[0].id) : ''
    modalBayarOpen = true
  }

  async function konfirmasBayar() {
    if (!bayarGajiId) return
    await updateStatusGaji(bayarGajiId, 'dibayar', bayarKasBankId ? Number(bayarKasBankId) : undefined)
    modalBayarOpen = false
  }

  async function hapusGaji(id: number) {
    if (!confirm('Hapus slip gaji ini?')) return
    await api.delete(`/penggajian/${id}`)
    muatPenggajian()
  }

  const STATUS_GAJI_COLOR: Record<string, string> = {
    draft: 'var(--text-dim)', approved: 'var(--info)', dibayar: 'var(--accent)',
  }

  function rp(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB: KASBON
  // ═══════════════════════════════════════════════════════════════════════════

  type KasbonRow = {
    id: number; karyawan_id: number; nama_karyawan: string
    tanggal_pinjam: string; jumlah: number; cicilan_per_bulan: number
    sisa_kasbon: number; status: 'aktif' | 'lunas'
  }

  let filterStatusKasbon = $state<'aktif' | 'lunas' | ''>('aktif')
  let kasbonList = $state<KasbonRow[]>([])
  let loadingKasbon = $state(false)
  let modalKasbonOpen = $state(false)
  let modalCicilOpen = $state(false)
  let cicilKasbonId = $state<number | null>(null)
  let cicilJumlah = $state('')
  let formKasbon = $state({
    karyawan_id: '', tanggal_pinjam: new Date().toISOString().slice(0, 10),
    jumlah: '', cicilan_per_bulan: '',
  })
  let errorKasbon = $state('')

  async function muatKasbon() {
    loadingKasbon = true
    const params = new URLSearchParams()
    if (filterStatusKasbon) params.set('status', filterStatusKasbon)
    const res = await api.get<KasbonRow[]>(`/kasbon?${params}`)
    if (res.success) kasbonList = res.data
    loadingKasbon = false
  }

  $effect(() => { if (tab === 'kasbon') { filterStatusKasbon; muatKasbon() } })

  async function simpanKasbon() {
    errorKasbon = ''
    const res = await api.post('/kasbon', {
      karyawan_id: Number(formKasbon.karyawan_id),
      tanggal_pinjam: formKasbon.tanggal_pinjam,
      jumlah: Number(formKasbon.jumlah),
      cicilan_per_bulan: Number(formKasbon.cicilan_per_bulan) || 0,
    })
    if (!res.success) { errorKasbon = (res as { success: false; error: string }).error; return }
    modalKasbonOpen = false
    muatKasbon()
  }

  function bukaCicil(item: KasbonRow) {
    cicilKasbonId = item.id
    cicilJumlah = String(item.cicilan_per_bulan || '')
    modalCicilOpen = true
  }

  async function simpanCicil() {
    if (!cicilKasbonId) return
    const res = await api.put(`/kasbon/${cicilKasbonId}/cicil`, { jumlah_cicil: Number(cicilJumlah) })
    if (!res.success) { alert((res as { success: false; error: string }).error); return }
    modalCicilOpen = false
    muatKasbon()
  }

  async function hapusKasbon(id: number) {
    if (!confirm('Hapus data kasbon ini?')) return
    await api.delete(`/kasbon/${id}`)
    muatKasbon()
  }
</script>

<!-- ── Tab bar ──────────────────────────────────────────────────────────────── -->
<div class="flex flex-col gap-4">
  <div class="flex gap-1 border-b" style="border-color:var(--border)">
    {#each ([['data','Data Karyawan'],['absensi','Absensi'],['penggajian','Penggajian'],['kasbon','Kasbon']] as const) as [key, label]}
      <button
        onclick={() => tab = key}
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        style="{tab === key
          ? 'border-color:var(--accent);color:var(--accent)'
          : 'border-color:transparent;color:var(--text-dim)'}"
      >{label}</button>
    {/each}
  </div>

  <!-- ════════════════════════════════════════════════════════════════════════
       TAB: DATA KARYAWAN
  ═════════════════════════════════════════════════════════════════════════ -->
  {#if tab === 'data'}
    <div class="flex items-center gap-4">
      <h2 class="font-bold">KARYAWAN</h2>
      <input type="search" placeholder="Cari nama..." bind:value={queryKaryawan}
        class="px-3 py-1 rounded border text-sm flex-1 max-w-xs outline-none"
        style="background:var(--surface);border-color:var(--border);color:var(--text)" />
      {#if canManageGaji}
        <button onclick={() => bukaFormKaryawan()} class="px-3 py-1 rounded text-sm font-bold"
          style="background:var(--accent);color:var(--bg)">+ Tambah</button>
      {/if}
    </div>

    <div class="rounded border overflow-x-auto" style="border-color:var(--border)">
      <table class="w-full text-sm">
        <thead>
          <tr style="background:var(--surface2);color:var(--text-dim)">
            <th class="text-left px-3 py-2 font-medium">Kode</th>
            <th class="text-left px-3 py-2 font-medium">Nama</th>
            <th class="text-left px-3 py-2 font-medium">Role</th>
            <th class="text-left px-3 py-2 font-medium">Username</th>
            <th class="text-left px-3 py-2 font-medium">Gaji Pokok</th>
            <th class="text-left px-3 py-2 font-medium">Tipe</th>
            <th class="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {#if loadingKaryawan}
            <tr><td colspan="7" class="px-3 py-4 text-center" style="color:var(--text-dim)">Memuat...</td></tr>
          {:else if karyawanList.length === 0}
            <tr><td colspan="7" class="px-3 py-4 text-center" style="color:var(--text-dim)">Tidak ada data</td></tr>
          {:else}
            {#each karyawanList as item}
              <tr class="border-t" style="border-color:var(--border)">
                <td class="px-3 py-2" style="color:var(--text-dim)">{item.kode_karyawan}</td>
                <td class="px-3 py-2">{item.nama}</td>
                <td class="px-3 py-2">
                  <span class="text-xs font-bold" style="color:{ROLE_COLOR[item.role] ?? 'var(--text-dim)'}">
                    {item.role.toUpperCase()}
                  </span>
                </td>
                <td class="px-3 py-2" style="color:var(--text-dim)">{item.username}</td>
                <td class="px-3 py-2">{rp(item.gaji_pokok)}</td>
                <td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.tipe_gaji}</td>
                <td class="px-3 py-2 text-right">
                  {#if canManageGaji}
                    <button onclick={() => bukaFormKaryawan(item)} class="text-xs mr-2" style="color:var(--info)">Edit</button>
                    <button onclick={() => hapusKaryawan(item.id)} class="text-xs" style="color:var(--danger)">Nonaktif</button>
                  {/if}
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- ════════════════════════════════════════════════════════════════════════
       TAB: ABSENSI
  ═════════════════════════════════════════════════════════════════════════ -->
  {#if tab === 'absensi'}
    <!-- Clock in/out untuk kasir & gudang -->
    {#if !canSemua}
      <div class="flex items-center gap-3 p-3 rounded border" style="background:var(--surface);border-color:var(--border)">
        <span class="text-sm font-medium">Hari ini — {new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long' })}</span>
        {#if !absensiHariIni}
          <button onclick={clockIn} class="px-4 py-1.5 rounded text-sm font-bold"
            style="background:var(--accent);color:var(--bg)">Clock In</button>
        {:else if !absensiHariIni.jam_keluar}
          <span class="text-xs" style="color:var(--text-dim)">Masuk: {absensiHariIni.jam_masuk}</span>
          <button onclick={clockOut} class="px-4 py-1.5 rounded text-sm font-bold"
            style="background:var(--warn);color:var(--bg)">Clock Out</button>
        {:else}
          <span class="text-xs" style="color:var(--accent)">Masuk: {absensiHariIni.jam_masuk} — Keluar: {absensiHariIni.jam_keluar}</span>
        {/if}
      </div>
    {/if}

    <div class="flex items-center gap-3 flex-wrap">
      <input type="month" bind:value={filterBulan}
        class="px-2 py-1 rounded border text-sm outline-none"
        style="background:var(--surface);border-color:var(--border);color:var(--text)" />
      {#if canSemua}
        <div class="flex gap-1 text-sm">
          <button onclick={() => viewAbsensi = 'list'}
            class="px-3 py-1 rounded"
            style="{viewAbsensi === 'list' ? 'background:var(--surface2);color:var(--text)' : 'color:var(--text-dim)'}">List</button>
          <button onclick={() => viewAbsensi = 'rekap'}
            class="px-3 py-1 rounded"
            style="{viewAbsensi === 'rekap' ? 'background:var(--surface2);color:var(--text)' : 'color:var(--text-dim)'}">Rekap</button>
        </div>
        <button onclick={() => bukaFormAbsensi()} class="px-3 py-1 rounded text-sm font-bold ml-auto"
          style="background:var(--accent);color:var(--bg)">+ Tambah</button>
      {/if}
    </div>

    {#if viewAbsensi === 'list'}
      <div class="rounded border overflow-x-auto" style="border-color:var(--border)">
        <table class="w-full text-sm">
          <thead>
            <tr style="background:var(--surface2);color:var(--text-dim)">
              {#if canSemua}<th class="text-left px-3 py-2 font-medium">Karyawan</th>{/if}
              <th class="text-left px-3 py-2 font-medium">Tanggal</th>
              <th class="text-left px-3 py-2 font-medium">Masuk</th>
              <th class="text-left px-3 py-2 font-medium">Keluar</th>
              <th class="text-left px-3 py-2 font-medium">Status</th>
              {#if canSemua}<th class="px-3 py-2"></th>{/if}
            </tr>
          </thead>
          <tbody>
            {#if loadingAbsensi}
              <tr><td colspan="6" class="px-3 py-4 text-center" style="color:var(--text-dim)">Memuat...</td></tr>
            {:else if absensiList.length === 0}
              <tr><td colspan="6" class="px-3 py-4 text-center" style="color:var(--text-dim)">Belum ada data absensi bulan ini</td></tr>
            {:else}
              {#each absensiList as item}
                <tr class="border-t" style="border-color:var(--border)">
                  {#if canSemua}<td class="px-3 py-2 font-medium">{item.nama_karyawan}</td>{/if}
                  <td class="px-3 py-2" style="color:var(--text-dim)">{item.tanggal}</td>
                  <td class="px-3 py-2">{item.jam_masuk ?? '-'}</td>
                  <td class="px-3 py-2">{item.jam_keluar ?? '-'}</td>
                  <td class="px-3 py-2">
                    <span class="text-xs font-bold" style="color:{STATUS_COLOR[item.status]}">
                      {item.status.toUpperCase()}
                    </span>
                  </td>
                  {#if canSemua}
                    <td class="px-3 py-2 text-right">
                      <button onclick={() => bukaFormAbsensi(item)} class="text-xs mr-2" style="color:var(--info)">Edit</button>
                      <button onclick={() => hapusAbsensi(item.id)} class="text-xs" style="color:var(--danger)">Hapus</button>
                    </td>
                  {/if}
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    {:else}
      <!-- Rekap -->
      <div class="rounded border overflow-x-auto" style="border-color:var(--border)">
        <table class="w-full text-sm">
          <thead>
            <tr style="background:var(--surface2);color:var(--text-dim)">
              <th class="text-left px-3 py-2 font-medium">Karyawan</th>
              <th class="text-center px-3 py-2 font-medium" style="color:var(--accent)">Hadir</th>
              <th class="text-center px-3 py-2 font-medium" style="color:var(--info)">Izin</th>
              <th class="text-center px-3 py-2 font-medium" style="color:var(--warn)">Sakit</th>
              <th class="text-center px-3 py-2 font-medium" style="color:var(--danger)">Alpa</th>
              <th class="text-center px-3 py-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {#if loadingAbsensi}
              <tr><td colspan="6" class="px-3 py-4 text-center" style="color:var(--text-dim)">Memuat...</td></tr>
            {:else if rekapList.length === 0}
              <tr><td colspan="6" class="px-3 py-4 text-center" style="color:var(--text-dim)">Belum ada data</td></tr>
            {:else}
              {#each rekapList as item}
                <tr class="border-t" style="border-color:var(--border)">
                  <td class="px-3 py-2 font-medium">{item.nama_karyawan}</td>
                  <td class="px-3 py-2 text-center font-bold" style="color:var(--accent)">{item.hadir}</td>
                  <td class="px-3 py-2 text-center" style="color:var(--info)">{item.izin}</td>
                  <td class="px-3 py-2 text-center" style="color:var(--warn)">{item.sakit}</td>
                  <td class="px-3 py-2 text-center" style="color:var(--danger)">{item.alpa}</td>
                  <td class="px-3 py-2 text-center" style="color:var(--text-dim)">{item.total}</td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}

  <!-- ════════════════════════════════════════════════════════════════════════
       TAB: PENGGAJIAN
  ═════════════════════════════════════════════════════════════════════════ -->
  {#if tab === 'penggajian'}
    <div class="flex items-center gap-3 flex-wrap">
      <input type="month" bind:value={filterBulanGaji}
        class="px-2 py-1 rounded border text-sm outline-none"
        style="background:var(--surface);border-color:var(--border);color:var(--text)" />
      {#if canManageGaji}
        <button onclick={generateGaji} disabled={loadingGenerate}
          class="px-3 py-1 rounded text-sm font-bold ml-auto"
          style="background:var(--info);color:var(--bg);opacity:{loadingGenerate ? 0.6 : 1}">
          {loadingGenerate ? 'Generating...' : 'Generate Gaji'}
        </button>
      {/if}
    </div>

    <div class="rounded border overflow-x-auto" style="border-color:var(--border)">
      <table class="w-full text-sm">
        <thead>
          <tr style="background:var(--surface2);color:var(--text-dim)">
            <th class="text-left px-3 py-2 font-medium">Karyawan</th>
            <th class="text-left px-3 py-2 font-medium">Periode</th>
            <th class="text-center px-3 py-2 font-medium">Hadir/Kerja</th>
            <th class="text-right px-3 py-2 font-medium">Gaji Pokok</th>
            <th class="text-right px-3 py-2 font-medium">Tunjangan</th>
            <th class="text-right px-3 py-2 font-medium">Pot. Kasbon</th>
            <th class="text-right px-3 py-2 font-medium">Pot. Lain</th>
            <th class="text-right px-3 py-2 font-medium">Total</th>
            <th class="text-left px-3 py-2 font-medium">Status</th>
            {#if canManageGaji}<th class="px-3 py-2"></th>{/if}
          </tr>
        </thead>
        <tbody>
          {#if loadingGaji}
            <tr><td colspan="10" class="px-3 py-4 text-center" style="color:var(--text-dim)">Memuat...</td></tr>
          {:else if penggajianList.length === 0}
            <tr>
              <td colspan="10" class="px-3 py-6 text-center" style="color:var(--text-dim)">
                Belum ada data — klik "Generate Gaji" untuk membuat slip gaji dari absensi
              </td>
            </tr>
          {:else}
            {#each penggajianList as item}
              <tr class="border-t" style="border-color:var(--border)">
                <td class="px-3 py-2 font-medium">{item.nama_karyawan}</td>
                <td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.periode_bulan}</td>
                <td class="px-3 py-2 text-center" style="color:var(--text-dim)">
                  {item.hari_hadir}/{item.hari_kerja}
                  {#if item.tipe_gaji === 'harian'}<span class="text-xs ml-1">(H)</span>{/if}
                </td>
                <td class="px-3 py-2 text-right">{rp(item.gaji_pokok)}</td>
                <td class="px-3 py-2 text-right" style="color:var(--accent)">{item.tunjangan > 0 ? rp(item.tunjangan) : '-'}</td>
                <td class="px-3 py-2 text-right" style="color:var(--warn)">{item.potongan_kasbon > 0 ? rp(item.potongan_kasbon) : '-'}</td>
                <td class="px-3 py-2 text-right" style="color:var(--danger)">{item.potongan_lain > 0 ? rp(item.potongan_lain) : '-'}</td>
                <td class="px-3 py-2 text-right font-bold">{rp(item.total_gaji)}</td>
                <td class="px-3 py-2">
                  <span class="text-xs font-bold" style="color:{STATUS_GAJI_COLOR[item.status]}">
                    {item.status.toUpperCase()}
                  </span>
                </td>
                {#if canManageGaji}
                  <td class="px-3 py-2 text-right whitespace-nowrap">
                    {#if item.status === 'draft'}
                      <button onclick={() => bukaEditGaji(item)} class="text-xs mr-2" style="color:var(--info)">Edit</button>
                      <button onclick={() => updateStatusGaji(item.id, 'approved')} class="text-xs mr-2" style="color:var(--accent)">Approve</button>
                      <button onclick={() => hapusGaji(item.id)} class="text-xs" style="color:var(--danger)">Hapus</button>
                    {:else if item.status === 'approved'}
                      <button onclick={() => bukaBayar(item.id)} class="text-xs font-bold" style="color:var(--accent)">Tandai Dibayar</button>
                    {:else}
                      <span class="text-xs" style="color:var(--text-dim)">Selesai</span>
                    {/if}
                  </td>
                {/if}
              </tr>
            {/each}
          {/if}
        </tbody>
        {#if penggajianList.length > 0}
          <tfoot>
            <tr style="background:var(--surface2)">
              <td colspan="7" class="px-3 py-2 text-right text-sm font-bold" style="color:var(--text-dim)">Total Penggajian</td>
              <td class="px-3 py-2 text-right font-bold" style="color:var(--accent)">
                {rp(penggajianList.reduce((s, r) => s + r.total_gaji, 0))}
              </td>
              <td colspan="{canManageGaji ? 2 : 1}"></td>
            </tr>
          </tfoot>
        {/if}
      </table>
    </div>
  {/if}

  <!-- ════════════════════════════════════════════════════════════════════════
       TAB: KASBON
  ═════════════════════════════════════════════════════════════════════════ -->
  {#if tab === 'kasbon'}
    <div class="flex items-center gap-3">
      <div class="flex gap-1 text-sm">
        {#each ([['aktif','Aktif'],['lunas','Lunas'],['','Semua']] as const) as [v, l]}
          <button onclick={() => filterStatusKasbon = v}
            class="px-3 py-1 rounded"
            style="{filterStatusKasbon === v ? 'background:var(--surface2);color:var(--text)' : 'color:var(--text-dim)'}">
            {l}
          </button>
        {/each}
      </div>
      {#if canManageGaji}
        <button onclick={() => { formKasbon = { karyawan_id: '', tanggal_pinjam: new Date().toISOString().slice(0,10), jumlah: '', cicilan_per_bulan: '' }; errorKasbon = ''; modalKasbonOpen = true }}
          class="px-3 py-1 rounded text-sm font-bold ml-auto"
          style="background:var(--accent);color:var(--bg)">+ Kasbon</button>
      {/if}
    </div>

    <div class="rounded border overflow-x-auto" style="border-color:var(--border)">
      <table class="w-full text-sm">
        <thead>
          <tr style="background:var(--surface2);color:var(--text-dim)">
            <th class="text-left px-3 py-2 font-medium">Karyawan</th>
            <th class="text-left px-3 py-2 font-medium">Tgl Pinjam</th>
            <th class="text-right px-3 py-2 font-medium">Jumlah</th>
            <th class="text-right px-3 py-2 font-medium">Cicilan/Bln</th>
            <th class="text-right px-3 py-2 font-medium">Sisa</th>
            <th class="text-left px-3 py-2 font-medium">Status</th>
            {#if canManageGaji}<th class="px-3 py-2"></th>{/if}
          </tr>
        </thead>
        <tbody>
          {#if loadingKasbon}
            <tr><td colspan="7" class="px-3 py-4 text-center" style="color:var(--text-dim)">Memuat...</td></tr>
          {:else if kasbonList.length === 0}
            <tr><td colspan="7" class="px-3 py-4 text-center" style="color:var(--text-dim)">Tidak ada data</td></tr>
          {:else}
            {#each kasbonList as item}
              <tr class="border-t" style="border-color:var(--border)">
                <td class="px-3 py-2 font-medium">{item.nama_karyawan}</td>
                <td class="px-3 py-2" style="color:var(--text-dim)">{item.tanggal_pinjam}</td>
                <td class="px-3 py-2 text-right">{rp(item.jumlah)}</td>
                <td class="px-3 py-2 text-right" style="color:var(--text-dim)">{item.cicilan_per_bulan > 0 ? rp(item.cicilan_per_bulan) : '-'}</td>
                <td class="px-3 py-2 text-right font-bold" style="color:{item.sisa_kasbon > 0 ? 'var(--warn)' : 'var(--accent)'}">
                  {rp(item.sisa_kasbon)}
                </td>
                <td class="px-3 py-2">
                  <span class="text-xs font-bold" style="color:{item.status === 'aktif' ? 'var(--warn)' : 'var(--accent)'}">
                    {item.status.toUpperCase()}
                  </span>
                </td>
                {#if canManageGaji}
                  <td class="px-3 py-2 text-right">
                    {#if item.status === 'aktif'}
                      <button onclick={() => bukaCicil(item)} class="text-xs mr-2" style="color:var(--info)">Bayar Cicil</button>
                    {/if}
                    <button onclick={() => hapusKasbon(item.id)} class="text-xs" style="color:var(--danger)">Hapus</button>
                  </td>
                {/if}
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<!-- ── Modal: Form Karyawan ─────────────────────────────────────────────────── -->
<Modal bind:open={modalKaryawanOpen} title={editKaryawan?.id ? 'Edit Karyawan' : 'Tambah Karyawan'}>
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); simpanKaryawan() }} class="flex flex-col gap-3 text-sm">
    {#if errorKaryawan}<p class="text-xs p-2 rounded" style="background:var(--surface2);color:var(--danger)">{errorKaryawan}</p>{/if}
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label for="f-kode" class="text-xs" style="color:var(--text-dim)">KODE *</label>
        <input id="f-kode" type="text" bind:value={formKaryawan.kode_karyawan} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="f-nama" class="text-xs" style="color:var(--text-dim)">NAMA *</label>
        <input id="f-nama" type="text" bind:value={formKaryawan.nama} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="f-role" class="text-xs" style="color:var(--text-dim)">ROLE *</label>
        <select id="f-role" bind:value={formKaryawan.role} class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)">
          {#each ['pemilik','manajer','kasir','gudang'] as r}
            <option value={r}>{r}</option>
          {/each}
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label for="f-username" class="text-xs" style="color:var(--text-dim)">USERNAME *</label>
        <input id="f-username" bind:value={formKaryawan.username} required class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="f-pw" class="text-xs" style="color:var(--text-dim)">PASSWORD {editKaryawan?.id ? '(kosong = tidak ubah)' : '*'}</label>
        <input id="f-pw" type="password" bind:value={formKaryawan.password}
          required={!editKaryawan?.id} class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="f-kontak" class="text-xs" style="color:var(--text-dim)">KONTAK</label>
        <input id="f-kontak" bind:value={formKaryawan.kontak} class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="f-gaji" class="text-xs" style="color:var(--text-dim)">GAJI POKOK</label>
        <input id="f-gaji" type="number" min="0" bind:value={formKaryawan.gaji_pokok} class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="f-tipe" class="text-xs" style="color:var(--text-dim)">TIPE GAJI</label>
        <select id="f-tipe" bind:value={formKaryawan.tipe_gaji} class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)">
          <option value="bulanan">Bulanan</option>
          <option value="harian">Harian</option>
        </select>
      </div>
    </div>
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => modalKaryawanOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </form>
  {/snippet}
</Modal>

<!-- ── Modal: Form Absensi ──────────────────────────────────────────────────── -->
<Modal bind:open={modalAbsensiOpen} title={editAbsensi ? 'Edit Absensi' : 'Tambah Absensi'}>
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); simpanAbsensi() }} class="flex flex-col gap-3 text-sm">
    {#if errorAbsensi}<p class="text-xs p-2 rounded" style="background:var(--surface2);color:var(--danger)">{errorAbsensi}</p>{/if}
    <div class="grid grid-cols-2 gap-3">
      {#if canSemua}
        <div class="flex flex-col gap-1 col-span-2">
          <label for="fa-karyw" class="text-xs" style="color:var(--text-dim)">KARYAWAN *</label>
          <select id="fa-karyw" bind:value={formAbsensi.karyawan_id} required
            class="px-2 py-1 rounded border outline-none"
            style="background:var(--surface2);border-color:var(--border);color:var(--text)">
            <option value="">-- Pilih --</option>
            {#each karyawanList as k}
              <option value={String(k.id)}>{k.nama}</option>
            {/each}
          </select>
        </div>
      {/if}
      <div class="flex flex-col gap-1">
        <label for="fa-tgl" class="text-xs" style="color:var(--text-dim)">TANGGAL *</label>
        <input id="fa-tgl" type="date" bind:value={formAbsensi.tanggal} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-status" class="text-xs" style="color:var(--text-dim)">STATUS *</label>
        <select id="fa-status" bind:value={formAbsensi.status}
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
        <input id="fa-masuk" type="time" bind:value={formAbsensi.jam_masuk}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-keluar" class="text-xs" style="color:var(--text-dim)">JAM KELUAR</label>
        <input id="fa-keluar" type="time" bind:value={formAbsensi.jam_keluar}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fa-shift" class="text-xs" style="color:var(--text-dim)">SHIFT</label>
        <input id="fa-shift" bind:value={formAbsensi.shift} placeholder="Pagi / Sore / ..."
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
    </div>
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => modalAbsensiOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </form>
  {/snippet}
</Modal>

<!-- ── Modal: Edit Tunjangan/Potongan ──────────────────────────────────────── -->
<Modal bind:open={modalGajiOpen} title="Edit Tunjangan & Potongan">
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); simpanEditGaji() }} class="flex flex-col gap-3 text-sm">
    {#if errorGaji}<p class="text-xs p-2 rounded" style="background:var(--surface2);color:var(--danger)">{errorGaji}</p>{/if}
    {#if editGaji}
      <p class="text-xs" style="color:var(--text-dim)">{editGaji.nama_karyawan} — {editGaji.periode_bulan}</p>
      <p class="text-xs">Gaji pokok: <strong>{rp(editGaji.gaji_pokok)}</strong> &nbsp; Potongan kasbon otomatis: <strong>{rp(editGaji.potongan_kasbon)}</strong></p>
    {/if}
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label for="fg-tunj" class="text-xs" style="color:var(--text-dim)">TUNJANGAN</label>
        <input id="fg-tunj" type="number" min="0" bind:value={formGaji.tunjangan}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fg-pot" class="text-xs" style="color:var(--text-dim)">POTONGAN LAIN</label>
        <input id="fg-pot" type="number" min="0" bind:value={formGaji.potongan_lain}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
    </div>
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => modalGajiOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </form>
  {/snippet}
</Modal>

<!-- ── Modal: Tandai Dibayar ───────────────────────────────────────────────── -->
<Modal bind:open={modalBayarOpen} title="Tandai Gaji Dibayar">
  {#snippet children()}
  <div class="flex flex-col gap-3 text-sm">
    <p style="color:var(--text-dim)">Pilih akun kas/bank untuk mencatat pengeluaran gaji (opsional):</p>
    <select bind:value={bayarKasBankId}
      class="px-2 py-1 rounded border outline-none"
      style="background:var(--surface2);border-color:var(--border);color:var(--text)">
      <option value="">-- Tidak catat ke jurnal --</option>
      {#each kasBankList as kb}
        <option value={String(kb.id)}>{kb.nama} ({kb.tipe})</option>
      {/each}
    </select>
    <p class="text-xs" style="color:var(--text-dim)">Kasbon karyawan juga akan dipotong cicilan secara otomatis.</p>
    <div class="flex justify-end gap-2 mt-1">
      <button onclick={() => modalBayarOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button onclick={konfirmasBayar} class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Konfirmasi Dibayar</button>
    </div>
  </div>
  {/snippet}
</Modal>

<!-- ── Modal: Form Kasbon ───────────────────────────────────────────────────── -->
<Modal bind:open={modalKasbonOpen} title="Tambah Kasbon">
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); simpanKasbon() }} class="flex flex-col gap-3 text-sm">
    {#if errorKasbon}<p class="text-xs p-2 rounded" style="background:var(--surface2);color:var(--danger)">{errorKasbon}</p>{/if}
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1 col-span-2">
        <label for="fk-karyw" class="text-xs" style="color:var(--text-dim)">KARYAWAN *</label>
        <select id="fk-karyw" bind:value={formKasbon.karyawan_id} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)">
          <option value="">-- Pilih --</option>
          {#each karyawanList as k}
            <option value={String(k.id)}>{k.nama}</option>
          {/each}
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label for="fk-tgl" class="text-xs" style="color:var(--text-dim)">TGL PINJAM *</label>
        <input id="fk-tgl" type="date" bind:value={formKasbon.tanggal_pinjam} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="fk-jml" class="text-xs" style="color:var(--text-dim)">JUMLAH *</label>
        <input id="fk-jml" type="number" min="1" bind:value={formKasbon.jumlah} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1 col-span-2">
        <label for="fk-cicil" class="text-xs" style="color:var(--text-dim)">CICILAN/BULAN (0 = tidak potong gaji otomatis)</label>
        <input id="fk-cicil" type="number" min="0" bind:value={formKasbon.cicilan_per_bulan}
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
    </div>
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => modalKasbonOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </form>
  {/snippet}
</Modal>

<!-- ── Modal: Bayar Cicilan ─────────────────────────────────────────────────── -->
<Modal bind:open={modalCicilOpen} title="Bayar Cicilan Kasbon">
  {#snippet children()}
  <div class="flex flex-col gap-3 text-sm">
    <div class="flex flex-col gap-1">
      <label for="cicil-jml" class="text-xs" style="color:var(--text-dim)">JUMLAH CICILAN</label>
      <input id="cicil-jml" type="number" min="1" bind:value={cicilJumlah}
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex justify-end gap-2 mt-1">
      <button onclick={() => modalCicilOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button onclick={simpanCicil} class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Bayar</button>
    </div>
  </div>
  {/snippet}
</Modal>
