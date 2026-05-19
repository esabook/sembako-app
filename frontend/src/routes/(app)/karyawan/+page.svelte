<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { api } from '$lib/utils/api.js'
  import { user } from '$lib/stores/auth.js'
  import Modal from '$lib/components/Modal.svelte'
  import DataTable from '$lib/components/DataTable.svelte'
  import type { Column } from '$lib/components/DataTable.svelte'

  $effect(() => {
    if ($user && !['pemilik', 'manajer'].includes($user.role)) goto('/kasir')
  })

  // ── Tab ─────────────────────────────────────────────────────────────────────
  type Tab = 'data' | 'absensi' | 'penggajian' | 'kasbon' | 'jadwal'
  let tab = $derived<Tab>(
    (page.url.searchParams.get('tab') as Tab) ?? 'data'
  )

  const canManageGaji = $derived($user?.role === 'pemilik' || $user?.role === 'manajer')
  const canSemua = $derived($user?.role === 'pemilik' || $user?.role === 'manajer')

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB: DATA KARYAWAN
  // ═══════════════════════════════════════════════════════════════════════════

  type Karyawan = {
    id: number; kode_karyawan: string; nama: string
    role: string; username: string; gaji_pokok: number
    tipe_gaji: string; kontak: string | null; foto_path: string | null; is_active: boolean
  }

  const kolKaryawan: Column[] = [
    { key: 'kode_karyawan', label: 'Kode',       width: 90,  priority: 2 },
    { key: 'nama',          label: 'Nama',        minWidth: 140 },
    { key: 'role',          label: 'Role',        width: 90  },
    { key: 'username',      label: 'Username',    width: 110, priority: 2 },
    { key: 'gaji_pokok',    label: 'Gaji Pokok',  width: 120, align: 'right' },
    { key: 'tipe_gaji',     label: 'Tipe',        width: 80,  priority: 3 },
    { key: 'aksi',          label: '',            width: 120, sortable: false, hideable: false, align: 'right' },
  ]
  let sortKeyKaryawan   = $state('nama')
  let sortDirKaryawan   = $state<'asc' | 'desc'>('asc')
  let pageKaryawan      = $state(1)
  let pageSizeKaryawan  = $state(25)

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
  let fotoKaryawanFile = $state<File | null>(null)
  let fotoKaryawanPreview = $state('')

  function handleFotoKaryawanChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0] ?? null
    fotoKaryawanFile = file
    if (file) fotoKaryawanPreview = URL.createObjectURL(file)
  }

  async function muatKaryawan() {
    loadingKaryawan = true
    const res = await api.get<Karyawan[]>('/karyawan')
    if (res.success) karyawanList = res.data
    loadingKaryawan = false
  }

  onMount(muatKaryawan)

  function bukaFormKaryawan(item?: Karyawan) {
    editKaryawan = item ?? null
    fotoKaryawanFile = null
    fotoKaryawanPreview = item?.foto_path ? `/uploads/${item.foto_path}` : ''
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

    const savedId = editKaryawan?.id ?? (res as { success: true; data: { id: number } }).data.id
    if (fotoKaryawanFile && savedId) {
      const fd = new FormData()
      fd.append('foto', fotoKaryawanFile)
      await api.upload(`/karyawan/${savedId}/foto`, fd)
    }

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

  let filteredKaryawan = $derived(
    queryKaryawan
      ? karyawanList.filter(k => k.nama.toLowerCase().includes(queryKaryawan.toLowerCase()) || k.username.toLowerCase().includes(queryKaryawan.toLowerCase()))
      : karyawanList
  )
  let sortedKaryawan = $derived.by(() => {
    const key = sortKeyKaryawan as keyof Karyawan
    return [...filteredKaryawan].sort((a, b) => {
      const va = String(a[key] ?? '')
      const vb = String(b[key] ?? '')
      const cmp = va.localeCompare(vb, 'id', { numeric: true })
      return sortDirKaryawan === 'asc' ? cmp : -cmp
    })
  })
  let pagedKaryawan = $derived(
    pageSizeKaryawan === 0
      ? sortedKaryawan
      : sortedKaryawan.slice((pageKaryawan - 1) * pageSizeKaryawan, pageKaryawan * pageSizeKaryawan)
  )

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
  let sortKeyAbsensi = $state('tanggal')
  let sortDirAbsensi = $state<'asc' | 'desc'>('desc')
  let sortKeyRekap = $state('nama_karyawan')
  let sortDirRekap = $state<'asc' | 'desc'>('asc')
  let kolAbsensiList = $derived<import('$lib/components/DataTable.svelte').Column[]>([
    ...(canSemua ? [{ key: 'nama_karyawan', label: 'Karyawan', minWidth: 120 }] : []),
    { key: 'tanggal',    label: 'Tanggal', width: 105 },
    { key: 'jam_masuk',  label: 'Masuk',   width: 75 },
    { key: 'jam_keluar', label: 'Keluar',  width: 75 },
    { key: 'durasi',     label: 'Durasi',  width: 80, sortable: false },
    { key: 'status',     label: 'Status',  width: 90 },
    ...(canSemua ? [{ key: 'aksi', label: '', width: 110, sortable: false, hideable: false, align: 'right' as const }] : []),
  ])
  const kolAbsensiRekap: import('$lib/components/DataTable.svelte').Column[] = [
    { key: 'nama_karyawan', label: 'Karyawan',  minWidth: 130 },
    { key: 'hadir',         label: 'Hadir',     width: 70, align: 'center' },
    { key: 'izin',          label: 'Izin',      width: 60, align: 'center' },
    { key: 'sakit',         label: 'Sakit',     width: 60, align: 'center' },
    { key: 'alpa',          label: 'Alpa',      width: 60, align: 'center' },
    { key: 'total',         label: 'Total',     width: 65, align: 'center' },
    { key: 'pct',           label: '% Hadir',   width: 80, align: 'center', sortable: false },
  ]
  let sortedAbsensi = $derived.by(() => {
    const key = sortKeyAbsensi as keyof AbsensiRow
    return [...absensiList].sort((a, b) => {
      const va = String(a[key] ?? ''); const vb = String(b[key] ?? '')
      const cmp = va.localeCompare(vb, 'id', { numeric: true })
      return sortDirAbsensi === 'asc' ? cmp : -cmp
    })
  })
  let sortedRekap = $derived.by(() => {
    const key = sortKeyRekap as keyof RekapRow
    return [...rekapList].sort((a, b) => {
      const va = String(a[key] ?? ''); const vb = String(b[key] ?? '')
      const cmp = va.localeCompare(vb, 'id', { numeric: true })
      return sortDirRekap === 'asc' ? cmp : -cmp
    })
  })
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

  function hitungDurasi(masuk: string | null | undefined, keluar: string | null | undefined): string {
    if (!masuk || !keluar) return '—'
    const [jm, mm] = masuk.split(':').map(Number)
    const [jk, mk] = keluar.split(':').map(Number)
    const totalMenit = (jk * 60 + mk) - (jm * 60 + mm)
    if (totalMenit <= 0) return '—'
    const j = Math.floor(totalMenit / 60)
    const m = totalMenit % 60
    return j > 0 ? `${j}j${m > 0 ? ` ${m}m` : ''}` : `${m}m`
  }

  function exportRekapCsv() {
    if (!rekapList.length) return
    const bom = '﻿'
    const header = ['Karyawan', 'Hadir', 'Izin', 'Sakit', 'Alpa', 'Total', '% Hadir']
    const rows = rekapList.map(r => [
      r.nama_karyawan,
      r.hadir, r.izin, r.sakit, r.alpa, r.total,
      r.total > 0 ? `${((r.hadir / r.total) * 100).toFixed(1)}%` : '0%',
    ])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `rekap-absensi-${filterBulan}.csv`; a.click()
    URL.revokeObjectURL(url)
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

  let sortKeyGaji = $state('nama_karyawan')
  let sortDirGaji = $state<'asc' | 'desc'>('asc')
  let kolPenggajian = $derived<import('$lib/components/DataTable.svelte').Column[]>([
    { key: 'nama_karyawan',   label: 'Karyawan',      minWidth: 120 },
    { key: 'periode_bulan',   label: 'Periode',        width: 90, priority: 3 },
    { key: 'hadir_kerja',     label: 'Hadir/Kerja',   width: 90, align: 'center', sortable: false, priority: 2 },
    { key: 'gaji_pokok',      label: 'Gaji Pokok',    width: 110, align: 'right' },
    { key: 'tunjangan',       label: 'Tunjangan',     width: 100, align: 'right', priority: 2 },
    { key: 'potongan_kasbon', label: 'Pot. Kasbon',   width: 100, align: 'right', priority: 2 },
    { key: 'potongan_lain',   label: 'Pot. Lain',     width: 90,  align: 'right', priority: 3 },
    { key: 'total_gaji',      label: 'Total',         width: 110, align: 'right' },
    { key: 'status',          label: 'Status',        width: 90 },
    ...(canManageGaji ? [{ key: 'aksi', label: '', width: 170, sortable: false, hideable: false, align: 'right' as const }] : []),
  ])
  let sortedGaji = $derived.by(() => {
    const key = sortKeyGaji as keyof PenggajianRow
    return [...penggajianList].sort((a, b) => {
      const va = String(a[key] ?? ''); const vb = String(b[key] ?? '')
      const cmp = va.localeCompare(vb, 'id', { numeric: true })
      return sortDirGaji === 'asc' ? cmp : -cmp
    })
  })

  function rp(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB: KASBON
  // ═══════════════════════════════════════════════════════════════════════════

  type KasbonStatus = 'pengajuan' | 'disetujui' | 'ditolak' | 'aktif' | 'lunas'
  type KasbonRow = {
    id: number; karyawan_id: number; nama_karyawan: string
    tanggal_pinjam: string; tanggal_cair: string | null
    jumlah: number; cicilan_per_bulan: number
    sisa_kasbon: number; status: KasbonStatus
    catatan: string | null
  }
  type JadwalCicilan = { bulan_ke: number; bulan: string; jumlah_cicil: number; sudah_lunas: boolean }

  const STATUS_KB: Record<KasbonStatus, { label: string; color: string }> = {
    pengajuan: { label: 'PENGAJUAN', color: 'var(--info)' },
    disetujui: { label: 'DISETUJUI', color: 'var(--warn)' },
    ditolak:   { label: 'DITOLAK',   color: 'var(--danger)' },
    aktif:     { label: 'AKTIF',     color: 'var(--accent)' },
    lunas:     { label: 'LUNAS',     color: 'var(--text-dim)' },
  }

  let sortKeyKasbon = $state('tanggal_pinjam')
  let sortDirKasbon = $state<'asc' | 'desc'>('desc')
  let kolKasbon = $derived<import('$lib/components/DataTable.svelte').Column[]>([
    { key: 'nama_karyawan',    label: 'Karyawan',    minWidth: 120 },
    { key: 'tanggal_pinjam',   label: 'Tgl Pinjam',  width: 100, priority: 2 },
    { key: 'jumlah',           label: 'Jumlah',      width: 110, align: 'right' },
    { key: 'cicilan_per_bulan',label: 'Cicilan/Bln', width: 100, align: 'right', priority: 2 },
    { key: 'sisa_kasbon',      label: 'Sisa',        width: 100, align: 'right' },
    { key: 'status',           label: 'Status',      width: 90 },
    ...(canManageGaji ? [{ key: 'aksi', label: '', width: 160, sortable: false, hideable: false, align: 'right' as const }] : []),
  ])
  let sortedKasbon = $derived.by(() => {
    const key = sortKeyKasbon as keyof KasbonRow
    return [...kasbonList].sort((a, b) => {
      const va = String(a[key] ?? ''); const vb = String(b[key] ?? '')
      const cmp = va.localeCompare(vb, 'id', { numeric: true })
      return sortDirKasbon === 'asc' ? cmp : -cmp
    })
  })

  let filterStatusKasbon = $state<KasbonStatus | ''>('pengajuan')
  let kasbonList = $state<KasbonRow[]>([])
  let loadingKasbon = $state(false)
  let modalKasbonOpen = $state(false)
  let modalCicilOpen = $state(false)
  let modalJadwalOpen = $state(false)
  let jadwalList = $state<JadwalCicilan[]>([])
  let jadwalNama = $state('')
  let cicilKasbonId = $state<number | null>(null)
  let cicilJumlah = $state('')
  let formKasbon = $state({
    karyawan_id: '', tanggal_pinjam: new Date().toISOString().slice(0, 10),
    jumlah: '', cicilan_per_bulan: '', catatan: '',
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
      catatan: formKasbon.catatan || undefined,
    })
    if (!res.success) { errorKasbon = (res as { success: false; error: string }).error; return }
    modalKasbonOpen = false
    filterStatusKasbon = 'pengajuan'
    muatKasbon()
  }

  async function setujuiKasbon(id: number) {
    const res = await api.put(`/kasbon/${id}/setujui`, {})
    if (!res.success) { alert((res as { success: false; error: string }).error); return }
    muatKasbon()
  }

  async function tolakKasbon(id: number) {
    const catatan = prompt('Alasan penolakan (opsional):') ?? ''
    const res = await api.put(`/kasbon/${id}/tolak`, { catatan })
    if (!res.success) { alert((res as { success: false; error: string }).error); return }
    muatKasbon()
  }

  async function cairkanKasbon(id: number) {
    if (!confirm('Cairkan kasbon ini? Dana akan diberikan ke karyawan.')) return
    const res = await api.put(`/kasbon/${id}/cair`, {})
    if (!res.success) { alert((res as { success: false; error: string }).error); return }
    filterStatusKasbon = 'aktif'
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

  async function lihatJadwal(item: KasbonRow) {
    jadwalNama = item.nama_karyawan
    const res = await api.get<JadwalCicilan[]>(`/kasbon/${item.id}/jadwal`)
    if (res.success) { jadwalList = res.data; modalJadwalOpen = true }
  }

  async function hapusKasbon(id: number) {
    if (!confirm('Hapus data kasbon ini?')) return
    const res = await api.delete(`/kasbon/${id}`)
    if (!res.success) { alert((res as { success: false; error: string }).error); return }
    muatKasbon()
  }

  // ── Jadwal & Shift ──────────────────────────────────────────────────────────

  type TipeShift = { id: number; nama: string; jam_mulai: string; jam_selesai: string; warna: string }
  type JadwalRow = { id: number; karyawan_id: number; nama_karyawan: string; tipe_shift_id: number; nama_shift: string; jam_mulai: string; jam_selesai: string; warna: string; tanggal: string; catatan: string | null }
  type TukarRow = { id: number; pengaju_id: number; nama_pengaju: string; penerima_id: number; nama_penerima: string; jadwal_id: number; jadwal_penerima_id: number | null; tanggal_jadwal: string; nama_shift: string; alasan: string | null; status: 'menunggu' | 'disetujui' | 'ditolak'; created_at: string }

  let tipeShiftList = $state<TipeShift[]>([])
  let jadwalKerjaList = $state<JadwalRow[]>([])
  let tukarList = $state<TukarRow[]>([])
  let loadingJadwal = $state(false)

  // Week navigation
  function getMondayOf(d: Date) {
    const day = d.getDay()
    const diff = (day === 0 ? -6 : 1 - day)
    const m = new Date(d)
    m.setDate(d.getDate() + diff)
    m.setHours(0, 0, 0, 0)
    return m
  }
  let weekStart = $state(getMondayOf(new Date()))
  const weekDays = $derived(
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      return d.toISOString().slice(0, 10)
    })
  )
  const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

  function prevWeek() { const d = new Date(weekStart); d.setDate(d.getDate() - 7); weekStart = d }
  function nextWeek() { const d = new Date(weekStart); d.setDate(d.getDate() + 7); weekStart = d }
  function thisWeek() { weekStart = getMondayOf(new Date()) }

  function jadwalFor(karyawanId: number, tanggal: string) {
    return jadwalKerjaList.filter(j => j.karyawan_id === karyawanId && j.tanggal === tanggal)
  }

  async function muatJadwal() {
    loadingJadwal = true
    const dari = weekDays[0]
    const sampai = weekDays[6]
    const [r1, r2, r3] = await Promise.all([
      api.get<TipeShift[]>('/jadwal/tipe'),
      api.get<JadwalRow[]>(`/jadwal?dari=${dari}&sampai=${sampai}`),
      api.get<TukarRow[]>('/jadwal/tukar'),
    ])
    if (r1.success) tipeShiftList = r1.data
    if (r2.success) jadwalKerjaList = r2.data
    if (r3.success) tukarList = r3.data
    loadingJadwal = false
  }

  $effect(() => { if (tab === 'jadwal') { weekStart; muatJadwal() } })

  // Assign shift
  let assignCell = $state<{ karyawan_id: number; tanggal: string } | null>(null)

  async function assignShift(karyawanId: number, tanggal: string, tipeId: number) {
    const res = await api.post('/jadwal', { karyawan_id: karyawanId, tipe_shift_id: tipeId, tanggal })
    if (!res.success) { alert((res as { success: false; error: string }).error); return }
    assignCell = null
    muatJadwal()
  }

  async function hapusJadwal(id: number) {
    if (!confirm('Hapus jadwal ini?')) return
    await api.delete(`/jadwal/${id}`)
    muatJadwal()
  }

  // Tipe shift CRUD
  let modalTipeOpen = $state(false)
  let editTipe = $state<TipeShift | null>(null)
  let formTipe = $state({ nama: '', jam_mulai: '08:00', jam_selesai: '15:00', warna: '#00e676' })

  function bukaModalTipe(t?: TipeShift) {
    editTipe = t ?? null
    formTipe = t ? { nama: t.nama, jam_mulai: t.jam_mulai, jam_selesai: t.jam_selesai, warna: t.warna } : { nama: '', jam_mulai: '08:00', jam_selesai: '15:00', warna: '#00e676' }
    modalTipeOpen = true
  }

  async function simpanTipe() {
    if (editTipe) {
      await api.put(`/jadwal/tipe/${editTipe.id}`, formTipe)
    } else {
      await api.post('/jadwal/tipe', formTipe)
    }
    modalTipeOpen = false
    muatJadwal()
  }

  async function hapusTipe(id: number) {
    if (!confirm('Nonaktifkan tipe shift ini?')) return
    await api.delete(`/jadwal/tipe/${id}`)
    muatJadwal()
  }

  // Tukar shift
  let modalTukarOpen = $state(false)
  let formTukar = $state({ jadwal_id: '', penerima_id: '', alasan: '' })
  let errorTukar = $state('')
  const jadwalSendiri = $derived(jadwalKerjaList.filter(j => $user && j.karyawan_id === $user.id))

  async function ajukanTukar() {
    errorTukar = ''
    if (!formTukar.jadwal_id || !formTukar.penerima_id) { errorTukar = 'Pilih jadwal dan penerima'; return }
    const res = await api.post('/jadwal/tukar', {
      jadwal_id: Number(formTukar.jadwal_id),
      penerima_id: Number(formTukar.penerima_id),
      alasan: formTukar.alasan || undefined,
    })
    if (!res.success) { errorTukar = (res as { success: false; error: string }).error; return }
    modalTukarOpen = false
    muatJadwal()
  }

  async function setujuiTukar(id: number) {
    await api.put(`/jadwal/tukar/${id}/setujui`, {})
    muatJadwal()
  }

  async function tolakTukar(id: number) {
    await api.put(`/jadwal/tukar/${id}/tolak`, {})
    muatJadwal()
  }
</script>

<!-- ── Tab bar ──────────────────────────────────────────────────────────────── -->
<div class="flex flex-col gap-4">
  <div class="flex gap-1 border-b overflow-x-auto" style="border-color:var(--border);scrollbar-width:none">
    {#each ([['data','Data Karyawan'],['absensi','Absensi'],['penggajian','Penggajian'],['kasbon','Kasbon'],['jadwal','Jadwal Shift']] as const) as [key, label]}
      <button
        onclick={() => goto(`?tab=${key}`, { replaceState: true, keepFocus: true, noScroll: true })}
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors shrink-0"
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
    <DataTable
      columns={kolKaryawan}
      tableId="karyawan_data"
      bind:sortKey={sortKeyKaryawan}
      bind:sortDir={sortDirKaryawan}
      bind:currentPage={pageKaryawan}
      bind:pageSize={pageSizeKaryawan}
      totalRows={filteredKaryawan.length}
      rowCount={pagedKaryawan.length}
      emptyText={loadingKaryawan ? 'Memuat...' : 'Tidak ada data'}
      maxRows={12}
    >
      {#snippet toolbarEnd()}
        <div class="flex items-center gap-2">
          <input type="search" placeholder="Cari nama/username..." bind:value={queryKaryawan}
            class="px-3 py-1 rounded border text-sm outline-none"
            style="background:var(--surface);border-color:var(--border);color:var(--text);width:180px" />
          {#if canManageGaji}
            <button onclick={() => bukaFormKaryawan()} class="px-3 py-1 rounded text-sm font-bold shrink-0"
              style="background:var(--accent);color:var(--bg)">+ Tambah</button>
          {/if}
        </div>
      {/snippet}
      {#snippet body(hidden)}
        {#each pagedKaryawan as item}
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
                {#if canManageGaji}
                  <button onclick={() => bukaFormKaryawan(item)} class="text-xs mr-2" style="color:var(--info)">Edit</button>
                  <button onclick={() => hapusKaryawan(item.id)} class="text-xs" style="color:var(--danger)">Nonaktif</button>
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
        <select bind:value={filterKaryawanId}
          class="px-2 py-1 rounded border text-sm outline-none"
          style="background:var(--surface);border-color:var(--border);color:var(--text)">
          <option value="">Semua karyawan</option>
          {#each karyawanList as k (k.id)}
            <option value={k.id}>{k.nama}</option>
          {/each}
        </select>
        <div class="flex gap-1 text-sm">
          <button onclick={() => viewAbsensi = 'list'}
            class="px-3 py-1 rounded"
            style="{viewAbsensi === 'list' ? 'background:var(--surface2);color:var(--text)' : 'color:var(--text-dim)'}">List</button>
          <button onclick={() => viewAbsensi = 'rekap'}
            class="px-3 py-1 rounded"
            style="{viewAbsensi === 'rekap' ? 'background:var(--surface2);color:var(--text)' : 'color:var(--text-dim)'}">Rekap</button>
        </div>
        <div class="flex gap-2 ml-auto">
          {#if viewAbsensi === 'rekap' && rekapList.length > 0}
            <button onclick={exportRekapCsv} class="px-3 py-1 rounded text-sm border"
              style="border-color:var(--border);color:var(--text-dim)">↓ CSV</button>
          {/if}
          <button onclick={() => bukaFormAbsensi()} class="px-3 py-1 rounded text-sm font-bold"
            style="background:var(--accent);color:var(--bg)">+ Tambah</button>
        </div>
      {/if}
    </div>

    {#if viewAbsensi === 'list'}
      <DataTable
        columns={kolAbsensiList}
        tableId="karyawan_absensi"
        bind:sortKey={sortKeyAbsensi}
        bind:sortDir={sortDirAbsensi}
        rowCount={sortedAbsensi.length}
        emptyText={loadingAbsensi ? 'Memuat...' : 'Belum ada data absensi bulan ini'}
        maxRows={14}
      >
        {#snippet body(hidden)}
          {#each sortedAbsensi as item}
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
              {#if !hidden.has('aksi')}
                <td class="px-3 py-2 text-right">
                  <button onclick={() => bukaFormAbsensi(item)} class="text-xs mr-2" style="color:var(--info)">Edit</button>
                  <button onclick={() => hapusAbsensi(item.id)} class="text-xs" style="color:var(--danger)">Hapus</button>
                </td>
              {/if}
            </tr>
          {/each}
        {/snippet}
      </DataTable>
    {:else}
      <DataTable
        columns={kolAbsensiRekap}
        tableId="karyawan_rekap"
        bind:sortKey={sortKeyRekap}
        bind:sortDir={sortDirRekap}
        rowCount={sortedRekap.length}
        emptyText={loadingAbsensi ? 'Memuat...' : 'Belum ada data'}
        maxRows={14}
      >
        {#snippet body(hidden)}
          {#each sortedRekap as item}
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

    <DataTable
      columns={kolPenggajian}
      tableId="karyawan_penggajian"
      bind:sortKey={sortKeyGaji}
      bind:sortDir={sortDirGaji}
      rowCount={sortedGaji.length}
      emptyText={loadingGaji ? 'Memuat...' : 'Belum ada data — klik "Generate Gaji" untuk membuat slip gaji dari absensi'}
      maxRows={12}
    >
      {#snippet body(hidden)}
        {#each sortedGaji as item}
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
      {/snippet}
    </DataTable>
    {#if penggajianList.length > 0}
      <div class="flex justify-end px-3 py-2 text-sm font-bold rounded border" style="border-color:var(--border);background:var(--surface2)">
        <span style="color:var(--text-dim)">Total Penggajian &nbsp;</span>
        <span style="color:var(--accent)">{rp(penggajianList.reduce((s, r) => s + r.total_gaji, 0))}</span>
      </div>
    {/if}
  {/if}

  <!-- ════════════════════════════════════════════════════════════════════════
       TAB: KASBON
  ═════════════════════════════════════════════════════════════════════════ -->
  {#if tab === 'kasbon'}
    <div class="flex items-center gap-2 flex-wrap">
      <div class="flex gap-1 text-sm flex-wrap">
        {#each ([['pengajuan','Pengajuan'],['disetujui','Disetujui'],['aktif','Aktif'],['lunas','Lunas'],['ditolak','Ditolak'],['','Semua']] as const) as [v, l]}
          <button onclick={() => filterStatusKasbon = v}
            class="px-3 py-1 rounded text-xs border"
            style="{filterStatusKasbon === v
              ? 'background:var(--surface2);color:var(--text);border-color:var(--accent)'
              : 'color:var(--text-dim);border-color:var(--border)'}">
            {l}
          </button>
        {/each}
      </div>
      {#if canManageGaji}
        <button onclick={() => {
            formKasbon = { karyawan_id: '', tanggal_pinjam: new Date().toISOString().slice(0,10),
              jumlah: '', cicilan_per_bulan: '', catatan: '' };
            errorKasbon = ''; modalKasbonOpen = true
          }}
          class="px-3 py-1 rounded text-sm font-bold ml-auto"
          style="background:var(--accent);color:var(--bg)">+ Kasbon</button>
      {/if}
    </div>

    <DataTable
      columns={kolKasbon}
      tableId="karyawan_kasbon"
      bind:sortKey={sortKeyKasbon}
      bind:sortDir={sortDirKasbon}
      rowCount={sortedKasbon.length}
      emptyText={loadingKasbon ? 'Memuat...' : 'Tidak ada kasbon'}
      maxRows={12}
    >
      {#snippet body(hidden)}
        {#each sortedKasbon as item}
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
                  <button onclick={() => setujuiKasbon(item.id)} class="text-xs mr-1.5" style="color:var(--accent)">Setujui</button>
                  <button onclick={() => tolakKasbon(item.id)} class="text-xs" style="color:var(--danger)">Tolak</button>
                {:else if item.status === 'disetujui'}
                  <button onclick={() => cairkanKasbon(item.id)} class="text-xs mr-1.5" style="color:var(--warn)">Cairkan</button>
                  <button onclick={() => tolakKasbon(item.id)} class="text-xs" style="color:var(--danger)">Tolak</button>
                {:else if item.status === 'aktif'}
                  <button onclick={() => bukaCicil(item)} class="text-xs mr-1.5" style="color:var(--info)">Cicil</button>
                  {#if item.cicilan_per_bulan > 0}
                    <button onclick={() => lihatJadwal(item)} class="text-xs mr-1.5" style="color:var(--text-dim)">Jadwal</button>
                  {/if}
                {:else if item.status === 'ditolak' || item.status === 'lunas'}
                  <button onclick={() => hapusKasbon(item.id)} class="text-xs" style="color:var(--danger)">Hapus</button>
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
    <!-- Tipe Shift master -->
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-bold" style="color:var(--text-dim)">TIPE SHIFT</span>
      <button onclick={() => bukaModalTipe()} class="text-xs px-2 py-1 rounded border"
        style="border-color:var(--border);color:var(--accent)">+ Tambah Tipe</button>
    </div>
    <div class="flex flex-wrap gap-2 mb-4">
      {#each tipeShiftList as ts (ts.id)}
        <div class="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold border"
          style="border-color:{ts.warna};color:{ts.warna}">
          <span>{ts.nama}</span>
          <span style="color:var(--text-dim);font-weight:normal">{ts.jam_mulai}–{ts.jam_selesai}</span>
          <button onclick={() => bukaModalTipe(ts)} class="ml-1 opacity-60 hover:opacity-100" title="Edit">✎</button>
          <button onclick={() => hapusTipe(ts.id)} class="opacity-60 hover:opacity-100" title="Hapus" style="color:var(--danger)">✕</button>
        </div>
      {/each}
      {#if tipeShiftList.length === 0}
        <p class="text-xs" style="color:var(--text-dim)">Belum ada tipe shift. Tambah dulu sebelum membuat jadwal.</p>
      {/if}
    </div>

    <!-- Week navigator -->
    <div class="flex items-center gap-2 mb-3">
      <button onclick={prevWeek} class="px-2 py-1 rounded text-sm border"
        style="border-color:var(--border);color:var(--text-dim)">←</button>
      <button onclick={thisWeek} class="px-3 py-1 rounded text-xs border"
        style="border-color:var(--border);color:var(--text-dim)">Minggu Ini</button>
      <button onclick={nextWeek} class="px-2 py-1 rounded text-sm border"
        style="border-color:var(--border);color:var(--text-dim)">→</button>
      <span class="text-sm ml-1" style="color:var(--text)">
        {weekDays[0]} – {weekDays[6]}
      </span>
    </div>

    <!-- Grid mingguan -->
    {#if loadingJadwal}
      <p class="text-xs py-4 text-center" style="color:var(--text-dim)">Memuat...</p>
    {:else}
      <div class="overflow-x-auto rounded border" style="border-color:var(--border)">
        <table class="w-full text-xs border-collapse" style="min-width:680px">
          <thead>
            <tr style="background:var(--surface2)">
              <th class="px-3 py-2 text-left font-medium" style="color:var(--text-dim);min-width:120px">Karyawan</th>
              {#each weekDays as d, i}
                <th class="px-2 py-2 text-center font-medium" style="color:var(--text-dim);min-width:90px">
                  <span>{DAY_LABELS[i]}</span>
                  <span class="block text-xs opacity-60">{d.slice(5)}</span>
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each karyawanList as k (k.id)}
              <tr style="border-top:1px solid var(--border)">
                <td class="px-3 py-2 font-medium" style="color:var(--text)">{k.nama}</td>
                {#each weekDays as d}
                  {@const entries = jadwalFor(k.id, d)}
                  <td class="px-1 py-1 text-center align-top" style="border-left:1px solid var(--border)">
                    <div class="flex flex-col gap-1 items-center">
                      {#each entries as entry (entry.id)}
                        <div class="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-bold"
                          style="background:{entry.warna}22;color:{entry.warna};border:1px solid {entry.warna}">
                          <span>{entry.nama_shift}</span>
                          <button onclick={() => hapusJadwal(entry.id)} class="ml-0.5 opacity-50 hover:opacity-100 text-xs leading-none" title="Hapus">✕</button>
                        </div>
                      {/each}
                      {#if tipeShiftList.length > 0}
                        {#if assignCell?.karyawan_id === k.id && assignCell?.tanggal === d}
                          <div class="flex flex-col gap-0.5 p-1 rounded border z-10"
                            style="background:var(--surface);border-color:var(--border)">
                            {#each tipeShiftList as ts (ts.id)}
                              <button onclick={() => assignShift(k.id, d, ts.id)}
                                class="text-xs px-2 py-0.5 rounded text-left"
                                style="color:{ts.warna};background:{ts.warna}11">
                                {ts.nama}
                              </button>
                            {/each}
                            <button onclick={() => assignCell = null} class="text-xs mt-0.5" style="color:var(--text-dim)">Batal</button>
                          </div>
                        {:else}
                          <button onclick={() => assignCell = { karyawan_id: k.id, tanggal: d }}
                            class="text-xs w-6 h-6 rounded border opacity-30 hover:opacity-100"
                            style="border-color:var(--border);color:var(--text-dim)">+</button>
                        {/if}
                      {/if}
                    </div>
                  </td>
                {/each}
              </tr>
            {/each}
            {#if karyawanList.length === 0}
              <tr><td colspan="8" class="px-3 py-4 text-center text-xs" style="color:var(--text-dim)">Belum ada karyawan.</td></tr>
            {/if}
          </tbody>
        </table>
      </div>
    {/if}

    <!-- Tukar Shift -->
    <div class="flex items-center justify-between mt-6 mb-2">
      <span class="text-sm font-bold" style="color:var(--text-dim)">PERMINTAAN TUKAR SHIFT</span>
      <button onclick={() => { formTukar = { jadwal_id: '', penerima_id: '', alasan: '' }; errorTukar = ''; modalTukarOpen = true }}
        class="text-xs px-2 py-1 rounded border" style="border-color:var(--border);color:var(--accent)">+ Ajukan Tukar</button>
    </div>
    {#if tukarList.length === 0}
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
            {#each tukarList as t (t.id)}
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
                    <button onclick={() => setujuiTukar(t.id)} class="mr-1.5" style="color:var(--accent)">Setujui</button>
                    <button onclick={() => tolakTukar(t.id)} style="color:var(--danger)">Tolak</button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
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
    <!-- Foto karyawan -->
    <div class="flex flex-col gap-1">
      <label for="f-foto" class="text-xs" style="color:var(--text-dim)">FOTO</label>
      <div class="flex items-center gap-3">
        {#if fotoKaryawanPreview}
          <img src={fotoKaryawanPreview} alt="preview"
            class="rounded-full object-cover shrink-0"
            style="width:48px;height:48px;border:1px solid var(--border)" />
        {:else}
          <div class="rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
            style="width:48px;height:48px;background:var(--surface2);border:1px dashed var(--border);color:var(--text-dim)">
            {formKaryawan.nama ? formKaryawan.nama.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase() : '?'}
          </div>
        {/if}
        <input id="f-foto" type="file" accept="image/*" onchange={handleFotoKaryawanChange} class="text-xs" style="color:var(--text)" />
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
      <div class="flex flex-col gap-1 col-span-2">
        <label for="fk-catatan" class="text-xs" style="color:var(--text-dim)">CATATAN</label>
        <input id="fk-catatan" bind:value={formKasbon.catatan} placeholder="Opsional"
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

<!-- ── Modal: Jadwal Cicilan ────────────────────────────────────────────────── -->
<Modal bind:open={modalJadwalOpen} title="Jadwal Cicilan Kasbon">
  {#snippet children()}
  <div class="flex flex-col gap-3 text-sm">
    <p class="text-xs font-bold" style="color:var(--text-dim)">{jadwalNama}</p>
    {#if jadwalList.length === 0}
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
            {#each jadwalList as j (j.bulan_ke)}
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
      <button onclick={() => modalJadwalOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Tutup</button>
    </div>
  </div>
  {/snippet}
</Modal>

<!-- ── Modal: Form Tipe Shift ────────────────────────────────────────────────── -->
<Modal bind:open={modalTipeOpen} title={editTipe ? 'Edit Tipe Shift' : 'Tambah Tipe Shift'}>
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); simpanTipe() }} class="flex flex-col gap-3 text-sm">
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1 col-span-2">
        <label for="ft-nama" class="text-xs" style="color:var(--text-dim)">NAMA *</label>
        <input id="ft-nama" bind:value={formTipe.nama} required placeholder="mis. Pagi, Sore, Malam"
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="ft-mulai" class="text-xs" style="color:var(--text-dim)">JAM MULAI *</label>
        <input id="ft-mulai" type="time" bind:value={formTipe.jam_mulai} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="ft-selesai" class="text-xs" style="color:var(--text-dim)">JAM SELESAI *</label>
        <input id="ft-selesai" type="time" bind:value={formTipe.jam_selesai} required
          class="px-2 py-1 rounded border outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
      </div>
      <div class="flex flex-col gap-1 col-span-2">
        <label for="ft-warna" class="text-xs" style="color:var(--text-dim)">WARNA BADGE</label>
        <div class="flex items-center gap-2">
          <input id="ft-warna" type="color" bind:value={formTipe.warna}
            class="w-10 h-8 rounded border cursor-pointer"
            style="border-color:var(--border)" />
          <span class="text-xs px-2 py-1 rounded font-bold" style="color:{formTipe.warna};border:1px solid {formTipe.warna}">
            {formTipe.nama || 'Preview'}
          </span>
        </div>
      </div>
    </div>
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => modalTipeOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Simpan</button>
    </div>
  </form>
  {/snippet}
</Modal>

<!-- ── Modal: Ajukan Tukar Shift ─────────────────────────────────────────────── -->
<Modal bind:open={modalTukarOpen} title="Ajukan Tukar Shift">
  {#snippet children()}
  <form onsubmit={(e) => { e.preventDefault(); ajukanTukar() }} class="flex flex-col gap-3 text-sm">
    {#if errorTukar}<p class="text-xs p-2 rounded" style="background:var(--surface2);color:var(--danger)">{errorTukar}</p>{/if}
    <div class="flex flex-col gap-1">
      <label for="ftu-jadwal" class="text-xs" style="color:var(--text-dim)">JADWAL SAYA (yang ingin ditukar) *</label>
      <select id="ftu-jadwal" bind:value={formTukar.jadwal_id} required
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)">
        <option value="">-- Pilih Jadwal --</option>
        {#each jadwalSendiri as j (j.id)}
          <option value={String(j.id)}>{j.tanggal} — {j.nama_shift}</option>
        {/each}
      </select>
      {#if jadwalSendiri.length === 0}
        <p class="text-xs" style="color:var(--text-dim)">Tidak ada jadwal di minggu ini.</p>
      {/if}
    </div>
    <div class="flex flex-col gap-1">
      <label for="ftu-penerima" class="text-xs" style="color:var(--text-dim)">DITUKAR DENGAN *</label>
      <select id="ftu-penerima" bind:value={formTukar.penerima_id} required
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)">
        <option value="">-- Pilih Karyawan --</option>
        {#each karyawanList.filter(k => $user && k.id !== $user.id) as k}
          <option value={String(k.id)}>{k.nama}</option>
        {/each}
      </select>
    </div>
    <div class="flex flex-col gap-1">
      <label for="ftu-alasan" class="text-xs" style="color:var(--text-dim)">ALASAN</label>
      <input id="ftu-alasan" bind:value={formTukar.alasan} placeholder="Opsional"
        class="px-2 py-1 rounded border outline-none"
        style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
    </div>
    <div class="flex justify-end gap-2 mt-1">
      <button type="button" onclick={() => modalTukarOpen = false} class="px-3 py-1 rounded text-sm"
        style="color:var(--text-dim)">Batal</button>
      <button type="submit" class="px-3 py-1 rounded text-sm font-bold"
        style="background:var(--accent);color:var(--bg)">Kirim</button>
    </div>
  </form>
  {/snippet}
</Modal>
