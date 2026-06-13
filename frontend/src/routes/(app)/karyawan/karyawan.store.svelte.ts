import { get } from 'svelte/store'
import { user } from '$lib/stores/auth'
import { api } from '$lib/utils/api'
import { withLoading } from '$lib/utils/async'
import { toast } from '$lib/stores/ui.store'
import { resizeImage } from '$lib/utils/image'
import type { Column } from '$lib/components/DataTable.svelte'
import type {
  Karyawan, AbsensiRow, RekapRow, PenggajianRow, KasBank,
  KasbonRow, KasbonStatus, JadwalCicilan, TipeShift, JadwalRow, TukarRow,
  PerformaRingkasan, PerformaDetail, RealtimeRow,
} from './karyawan.types'
import {
  fetchKaryawan, createKaryawan, updateKaryawan, uploadFotoKaryawan, deleteKaryawan,
  fetchAbsensi, fetchAbsensiRekap, fetchAbsensiRealtime, createAbsensi, updateAbsensi, deleteAbsensi,
  fetchPenggajian, fetchKasBankList, generateGajiApi, updatePenggajian, deletePenggajian,
  fetchKasbon, createKasbon, setujuiKasbonApi, tolakKasbonApi, cairkanKasbonApi,
  cicilKasbonApi, fetchJadwalCicilan, deleteKasbon,
  fetchTipeShift, fetchJadwalKerja, fetchTukar, createJadwalKerja, deleteJadwalKerja,
  createTipeShiftApi, updateTipeShiftApi, deleteTipeShiftApi, createTukarApi,
  setujuiTukarApi, tolakTukarApi,
  fetchPerforma, fetchPerformaDetail,
} from './karyawan.api'
import { getMondayOf, getWeekDays, buildRekapCsvContent, jadwalFor } from './karyawan.logic'

export function createKaryawanStore() {
  const _u = get(user)
  const isManager = _u?.role === 'pemilik' || _u?.role === 'manajer'
  const userId = _u?.id ?? 0
  const bulanIni = new Date().toISOString().slice(0, 7)
  const hariIni = new Date().toISOString().slice(0, 10)

  // ── Column definitions ────────────────────────────────────────────────────
  const kolKaryawan: Column[] = [
    { key: 'kode_karyawan', label: 'Kode',       width: 90,  priority: 2 },
    { key: 'nama',          label: 'Nama',        minWidth: 140 },
    { key: 'role',          label: 'Role',        width: 90  },
    { key: 'username',      label: 'Username',    width: 110, priority: 2 },
    { key: 'gaji_pokok',    label: 'Gaji Pokok',  width: 120, align: 'right' },
    { key: 'tipe_gaji',     label: 'Tipe',        width: 80,  priority: 3 },
    { key: 'aksi',          label: '',            width: 120, sortable: false, hideable: false, align: 'right' },
  ]

  const kolAbsensiList: Column[] = [
    ...(isManager ? [{ key: 'nama_karyawan', label: 'Karyawan', minWidth: 120 }] : []),
    { key: 'tanggal',        label: 'Tanggal',   width: 105 },
    { key: 'jam_masuk',     label: 'Masuk',     width: 75 },
    { key: 'jam_keluar',    label: 'Keluar',    width: 75 },
    { key: 'durasi',        label: 'Durasi',    width: 80, sortable: false },
    { key: 'status',        label: 'Status',    width: 90 },
    { key: 'terlambat_menit', label: 'Terlambat', width: 90, priority: 2 },
    ...(isManager ? [{ key: 'aksi', label: '', width: 110, sortable: false, hideable: false, align: 'right' as const }] : []),
  ]

  const kolAbsensiRekap: Column[] = [
    { key: 'nama_karyawan', label: 'Karyawan',  minWidth: 130 },
    { key: 'hadir',         label: 'Hadir',     width: 70, align: 'center' },
    { key: 'izin',          label: 'Izin',      width: 60, align: 'center' },
    { key: 'sakit',         label: 'Sakit',     width: 60, align: 'center' },
    { key: 'alpa',          label: 'Alpa',      width: 60, align: 'center' },
    { key: 'total',         label: 'Total',     width: 65, align: 'center' },
    { key: 'pct',           label: '% Hadir',   width: 80, align: 'center', sortable: false },
  ]

  const kolPenggajian: Column[] = [
    { key: 'nama_karyawan',   label: 'Karyawan',    minWidth: 120 },
    { key: 'periode_bulan',   label: 'Periode',      width: 90, priority: 3 },
    { key: 'hadir_kerja',     label: 'Hadir/Kerja', width: 90, align: 'center', sortable: false, priority: 2 },
    { key: 'gaji_pokok',      label: 'Gaji Pokok',  width: 110, align: 'right' },
    { key: 'tunjangan',       label: 'Tunjangan',   width: 100, align: 'right', priority: 2 },
    { key: 'potongan_kasbon', label: 'Pot. Kasbon', width: 100, align: 'right', priority: 2 },
    { key: 'potongan_lain',   label: 'Pot. Lain',   width: 90,  align: 'right', priority: 3 },
    { key: 'total_gaji',      label: 'Total',       width: 110, align: 'right' },
    { key: 'status',          label: 'Status',      width: 90 },
    ...(isManager ? [{ key: 'aksi', label: '', width: 170, sortable: false, hideable: false, align: 'right' as const }] : []),
  ]

  const kolKasbon: Column[] = [
    { key: 'nama_karyawan',    label: 'Karyawan',    minWidth: 120 },
    { key: 'tanggal_pinjam',   label: 'Tgl Pinjam',  width: 100, priority: 2 },
    { key: 'jumlah',           label: 'Jumlah',      width: 110, align: 'right' },
    { key: 'cicilan_per_bulan',label: 'Cicilan/Bln', width: 100, align: 'right', priority: 2 },
    { key: 'sisa_kasbon',      label: 'Sisa',        width: 100, align: 'right' },
    { key: 'status',           label: 'Status',      width: 90 },
    ...(isManager ? [{ key: 'aksi', label: '', width: 160, sortable: false, hideable: false, align: 'right' as const }] : []),
  ]

  // ── Tab: Data Karyawan ────────────────────────────────────────────────────
  let karyawanList    = $state<Karyawan[]>([])
  let queryKaryawan   = $state('')
  let loadingKaryawan = $state(false)
  let modalKaryawanOpen = $state(false)
  let editKaryawan    = $state<Partial<Karyawan> | null>(null)
  let formKaryawan    = $state({ kode_karyawan: '', nama: '', role: 'kasir', username: '', password: '', gaji_pokok: '', tipe_gaji: 'bulanan', kontak: '', pin_absensi: '', toko_id: _u?.tenant_id ?? 1, cabang_id: null as number | null })
  let cabangList      = $state<{ id: number; nama: string }[]>([])
  let fotoFile        = $state<File | null>(null)
  let fotoPreview     = $state('')
  let sortKeyKaryawan  = $state('nama')
  let sortDirKaryawan  = $state<'asc' | 'desc'>('asc')
  let pageKaryawan     = $state(1)
  let pageSizeKaryawan = $state(25)

  const filteredKaryawan = $derived(
    queryKaryawan
      ? karyawanList.filter(k =>
          k.nama.toLowerCase().includes(queryKaryawan.toLowerCase()) ||
          k.username.toLowerCase().includes(queryKaryawan.toLowerCase()))
      : karyawanList
  )
  const sortedKaryawan = $derived.by(() => {
    const key = sortKeyKaryawan as keyof Karyawan
    return [...filteredKaryawan].sort((a, b) => {
      const cmp = String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'id', { numeric: true })
      return sortDirKaryawan === 'asc' ? cmp : -cmp
    })
  })
  const pagedKaryawan = $derived(
    pageSizeKaryawan === 0
      ? sortedKaryawan
      : sortedKaryawan.slice((pageKaryawan - 1) * pageSizeKaryawan, pageKaryawan * pageSizeKaryawan)
  )

  async function muatKaryawan() {
    loadingKaryawan = true
    const [hasil, resCabang] = await Promise.all([
      withLoading(() => fetchKaryawan(), { loadingKey: 'karyawan-list', loadingPesan: 'Memuat karyawan...', modul: 'karyawan', aksi: 'muat', errorPesan: 'Gagal memuat data karyawan' }),
      api.get<{ id: number; nama: string }[]>('/toko/cabang'),
    ])
    if (hasil) karyawanList = hasil
    if (resCabang.success) cabangList = resCabang.data
    loadingKaryawan = false
  }

  function bukaFormKaryawan(item?: Karyawan) {
    editKaryawan = item ?? null
    fotoFile = null
    fotoPreview = item?.foto_path ? `/uploads/${item.foto_path}` : ''
    formKaryawan = {
      kode_karyawan: item?.kode_karyawan ?? '', nama: item?.nama ?? '', role: item?.role ?? 'kasir',
      username: item?.username ?? '', password: '', gaji_pokok: String(item?.gaji_pokok ?? ''),
      tipe_gaji: item?.tipe_gaji ?? 'bulanan', kontak: item?.kontak ?? '', pin_absensi: '',
      toko_id: item?.toko_id ?? _u?.tenant_id ?? 1, cabang_id: item?.cabang_id ?? null,
    }
    modalKaryawanOpen = true
  }

  async function handleFotoKaryawanChange(e: Event) {
    const raw = (e.target as HTMLInputElement).files?.[0] ?? null
    if (!raw) { fotoFile = null; return }
    fotoFile = await resizeImage(raw, 600, 600, 0.9, 'cover')
    fotoPreview = URL.createObjectURL(fotoFile)
  }

  async function simpanKaryawan() {
    const payload: Record<string, unknown> = {
      kode_karyawan: formKaryawan.kode_karyawan, nama: formKaryawan.nama, role: formKaryawan.role,
      username: formKaryawan.username, gaji_pokok: Number(formKaryawan.gaji_pokok) || 0,
      tipe_gaji: formKaryawan.tipe_gaji, kontak: formKaryawan.kontak || undefined,
    }
    if (formKaryawan.password) payload.password = formKaryawan.password
    if (!editKaryawan?.id) payload.password = formKaryawan.password
    if (typeof formKaryawan.pin_absensi === 'string') payload.pin_absensi = formKaryawan.pin_absensi
    payload.toko_id = formKaryawan.toko_id
    payload.cabang_id = formKaryawan.cabang_id ?? null

    let savedId = editKaryawan?.id
    if (editKaryawan?.id) {
      const ok = await withLoading(() => updateKaryawan(editKaryawan!.id!, payload), { loadingKey: 'karyawan-simpan', loadingPesan: 'Menyimpan...', modul: 'karyawan', aksi: 'update', errorPesan: 'Gagal menyimpan karyawan' })
      if (ok === null) return
    } else {
      const hasil = await withLoading(() => createKaryawan(payload), { loadingKey: 'karyawan-buat', loadingPesan: 'Menyimpan...', modul: 'karyawan', aksi: 'create', errorPesan: 'Gagal membuat karyawan' })
      if (hasil === null) return
      savedId = hasil.id
    }

    if (fotoFile && savedId) {
      const fd = new FormData()
      fd.append('foto', fotoFile)
      await withLoading(() => uploadFotoKaryawan(savedId!, fd), { loadingKey: 'karyawan-foto', loadingPesan: 'Upload foto...', modul: 'karyawan', aksi: 'upload_foto', errorPesan: 'Gagal upload foto', suksesOtomatis: true, suksesPesan: 'Karyawan disimpan' })
    } else {
      toast.sukses('Karyawan berhasil disimpan')
    }

    modalKaryawanOpen = false
    muatKaryawan()
  }

  async function hapusKaryawan(id: number) {
    if (!confirm('Nonaktifkan karyawan ini?')) return
    await withLoading(() => deleteKaryawan(id), { loadingKey: 'karyawan-hapus', loadingPesan: 'Menghapus...', modul: 'karyawan', aksi: 'hapus', errorPesan: 'Gagal menonaktifkan', suksesOtomatis: true, suksesPesan: 'Karyawan dinonaktifkan' })
    muatKaryawan()
  }

  // ── Tab: Absensi ──────────────────────────────────────────────────────────
  let realtimeList     = $state<RealtimeRow[]>([])
  let loadingRealtime  = $state(false)
  let filterBulan      = $state(bulanIni)
  let filterKaryawanId = $state<number | ''>('')
  let absensiList      = $state<AbsensiRow[]>([])
  let rekapList        = $state<RekapRow[]>([])
  let loadingAbsensi   = $state(false)
  let viewAbsensi      = $state<'list' | 'rekap'>('list')
  let sortKeyAbsensi   = $state('tanggal')
  let sortDirAbsensi   = $state<'asc' | 'desc'>('desc')
  let sortKeyRekap     = $state('nama_karyawan')
  let sortDirRekap     = $state<'asc' | 'desc'>('asc')
  let modalAbsensiOpen = $state(false)
  let editAbsensi      = $state<AbsensiRow | null>(null)
  let formAbsensi      = $state({ karyawan_id: '', tanggal: hariIni, jam_masuk: '', jam_keluar: '', shift: '', status: 'hadir' as 'hadir' | 'izin' | 'sakit' | 'alpa' })

  const absensiHariIni = $derived(
    absensiList.find(a => a.karyawan_id === userId && a.tanggal === hariIni) ?? null
  )
  const sortedAbsensi = $derived.by(() => {
    const key = sortKeyAbsensi as keyof AbsensiRow
    return [...absensiList].sort((a, b) => {
      const cmp = String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'id', { numeric: true })
      return sortDirAbsensi === 'asc' ? cmp : -cmp
    })
  })
  const sortedRekap = $derived.by(() => {
    const key = sortKeyRekap as keyof RekapRow
    return [...rekapList].sort((a, b) => {
      const cmp = String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'id', { numeric: true })
      return sortDirRekap === 'asc' ? cmp : -cmp
    })
  })

  async function muatAbsensi() {
    loadingAbsensi = true
    const params = new URLSearchParams({ bulan: filterBulan })
    if (filterKaryawanId) params.set('karyawan_id', String(filterKaryawanId))
    const hasil = await withLoading(() => fetchAbsensi(params), { loadingKey: 'absensi-list', loadingPesan: 'Memuat absensi...', modul: 'karyawan', aksi: 'muat_absensi', errorPesan: 'Gagal memuat absensi' })
    if (hasil) absensiList = hasil
    if (isManager) {
      const rekap = await withLoading(() => fetchAbsensiRekap(filterBulan), { loadingKey: 'absensi-rekap', loadingPesan: 'Memuat rekap...', modul: 'karyawan', aksi: 'muat_rekap', errorPesan: 'Gagal memuat rekap' })
      if (rekap) rekapList = rekap
    }
    loadingAbsensi = false
  }

  function bukaFormAbsensi(item?: AbsensiRow) {
    editAbsensi = item ?? null
    formAbsensi = {
      karyawan_id: item ? String(item.karyawan_id) : (isManager ? '' : String(userId)),
      tanggal: item?.tanggal ?? hariIni,
      jam_masuk: item?.jam_masuk ?? '', jam_keluar: item?.jam_keluar ?? '',
      shift: item?.shift ?? '', status: item?.status ?? 'hadir',
    }
    modalAbsensiOpen = true
  }

  async function simpanAbsensi() {
    const payload = {
      karyawan_id: Number(formAbsensi.karyawan_id),
      tanggal: formAbsensi.tanggal,
      jam_masuk: formAbsensi.jam_masuk || undefined,
      jam_keluar: formAbsensi.jam_keluar || undefined,
      shift: formAbsensi.shift || undefined,
      status: formAbsensi.status,
    }
    const fn = editAbsensi
      ? () => updateAbsensi(editAbsensi!.id, payload)
      : () => createAbsensi(payload)
    const ok = await withLoading(fn, { loadingKey: 'absensi-simpan', loadingPesan: 'Menyimpan...', modul: 'karyawan', aksi: 'simpan_absensi', errorPesan: 'Gagal menyimpan absensi', suksesOtomatis: true, suksesPesan: 'Absensi disimpan' })
    if (ok === null) return
    modalAbsensiOpen = false
    muatAbsensi()
  }

  async function hapusAbsensi(id: number) {
    if (!confirm('Hapus data absensi ini?')) return
    await withLoading(() => deleteAbsensi(id), { loadingKey: 'absensi-hapus', loadingPesan: 'Menghapus...', modul: 'karyawan', aksi: 'hapus_absensi', errorPesan: 'Gagal hapus absensi', suksesOtomatis: true, suksesPesan: 'Absensi dihapus' })
    muatAbsensi()
  }

  async function clockIn() {
    const now = new Date()
    const ok = await withLoading(() => createAbsensi({ karyawan_id: userId, tanggal: now.toISOString().slice(0, 10), jam_masuk: now.toTimeString().slice(0, 5), status: 'hadir' }), { loadingKey: 'absensi-clockin', loadingPesan: 'Clock in...', modul: 'karyawan', aksi: 'clock_in', errorPesan: 'Gagal clock in' })
    if (ok !== null) muatAbsensi()
  }

  async function clockOut() {
    if (!absensiHariIni) return
    const now = new Date()
    const ok = await withLoading(() => updateAbsensi(absensiHariIni!.id, { jam_keluar: now.toTimeString().slice(0, 5) }), { loadingKey: 'absensi-clockout', loadingPesan: 'Clock out...', modul: 'karyawan', aksi: 'clock_out', errorPesan: 'Gagal clock out' })
    if (ok !== null) muatAbsensi()
  }

  async function muatRealtime() {
    if (!isManager) return
    loadingRealtime = true
    const hasil = await withLoading(() => fetchAbsensiRealtime(), { loadingKey: 'absensi-realtime', loadingPesan: 'Memuat realtime...', modul: 'karyawan', aksi: 'muat_realtime', errorPesan: 'Gagal memuat data realtime' })
    if (hasil) realtimeList = hasil
    loadingRealtime = false
  }

  function exportRekapCsv() {
    if (!rekapList.length) return
    const csv = buildRekapCsvContent(rekapList)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `rekap-absensi-${filterBulan}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Tab: Penggajian ───────────────────────────────────────────────────────
  let filterBulanGaji  = $state(bulanIni)
  let penggajianList   = $state<PenggajianRow[]>([])
  let kasBankList      = $state<KasBank[]>([])
  let loadingGaji      = $state(false)
  let loadingGenerate  = $state(false)
  let modalGajiOpen    = $state(false)
  let editGaji         = $state<PenggajianRow | null>(null)
  let formGaji         = $state({ tunjangan: '', potongan_lain: '' })
  let modalBayarOpen   = $state(false)
  let bayarGajiId      = $state<number | null>(null)
  let bayarKasBankId   = $state('')
  let sortKeyGaji      = $state('nama_karyawan')
  let sortDirGaji      = $state<'asc' | 'desc'>('asc')

  const sortedGaji = $derived.by(() => {
    const key = sortKeyGaji as keyof PenggajianRow
    return [...penggajianList].sort((a, b) => {
      const cmp = String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'id', { numeric: true })
      return sortDirGaji === 'asc' ? cmp : -cmp
    })
  })

  async function muatPenggajian() {
    loadingGaji = true
    const [r1, r2] = await Promise.all([
      withLoading(() => fetchPenggajian(filterBulanGaji), { loadingKey: 'gaji-list', loadingPesan: 'Memuat penggajian...', modul: 'karyawan', aksi: 'muat_gaji', errorPesan: 'Gagal memuat penggajian' }),
      withLoading(() => fetchKasBankList(), { loadingKey: 'gaji-kasbank', loadingPesan: 'Memuat kas...', modul: 'karyawan', aksi: 'muat_kasbank', errorPesan: 'Gagal memuat kas/bank' }),
    ])
    if (r1) penggajianList = r1
    if (r2) kasBankList = r2
    loadingGaji = false
  }

  async function generateGaji() {
    if (!confirm(`Generate slip gaji untuk bulan ${filterBulanGaji}? Data yang sudah ada tidak akan ditimpa.`)) return
    loadingGenerate = true
    const hasil = await withLoading(() => generateGajiApi(filterBulanGaji), { loadingKey: 'gaji-generate', loadingPesan: 'Generating...', modul: 'karyawan', aksi: 'generate_gaji', errorPesan: 'Gagal generate gaji' })
    loadingGenerate = false
    if (hasil) {
      toast.sukses(`${hasil.generated} slip dibuat, ${hasil.skipped} sudah ada`)
      muatPenggajian()
    }
  }

  function bukaEditGaji(item: PenggajianRow) {
    editGaji = item
    formGaji = { tunjangan: String(item.tunjangan), potongan_lain: String(item.potongan_lain) }
    modalGajiOpen = true
  }

  async function simpanEditGaji() {
    if (!editGaji) return
    const ok = await withLoading(() => updatePenggajian(editGaji!.id, { tunjangan: Number(formGaji.tunjangan) || 0, potongan_lain: Number(formGaji.potongan_lain) || 0 }), { loadingKey: 'gaji-simpan', loadingPesan: 'Menyimpan...', modul: 'karyawan', aksi: 'simpan_gaji', errorPesan: 'Gagal menyimpan', suksesOtomatis: true, suksesPesan: 'Gaji diperbarui' })
    if (ok === null) return
    modalGajiOpen = false
    muatPenggajian()
  }

  async function updateStatusGaji(id: number, status: 'approved' | 'dibayar', kasBankId?: number) {
    const payload: Record<string, unknown> = { status }
    if (kasBankId) payload.kas_bank_id = kasBankId
    await withLoading(() => updatePenggajian(id, payload), { loadingKey: 'gaji-status', loadingPesan: 'Memperbarui status...', modul: 'karyawan', aksi: 'status_gaji', errorPesan: 'Gagal memperbarui status', suksesOtomatis: true, suksesPesan: 'Status diperbarui' })
    muatPenggajian()
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
    await withLoading(() => deletePenggajian(id), { loadingKey: 'gaji-hapus', loadingPesan: 'Menghapus...', modul: 'karyawan', aksi: 'hapus_gaji', errorPesan: 'Gagal hapus', suksesOtomatis: true, suksesPesan: 'Slip dihapus' })
    muatPenggajian()
  }

  // ── Tab: Kasbon ───────────────────────────────────────────────────────────
  let filterStatusKasbon = $state<KasbonStatus | ''>('pengajuan')
  let kasbonList         = $state<KasbonRow[]>([])
  let loadingKasbon      = $state(false)
  let modalKasbonOpen    = $state(false)
  let modalCicilOpen     = $state(false)
  let modalJadwalOpen    = $state(false)
  let jadwalCicilanList  = $state<JadwalCicilan[]>([])
  let jadwalCicilanNama  = $state('')
  let cicilKasbonId      = $state<number | null>(null)
  let cicilJumlah        = $state('')
  let formKasbon         = $state({ karyawan_id: '', tanggal_pinjam: hariIni, jumlah: '', cicilan_per_bulan: '', catatan: '' })
  let sortKeyKasbon      = $state('tanggal_pinjam')
  let sortDirKasbon      = $state<'asc' | 'desc'>('desc')

  const sortedKasbon = $derived.by(() => {
    const key = sortKeyKasbon as keyof KasbonRow
    return [...kasbonList].sort((a, b) => {
      const cmp = String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'id', { numeric: true })
      return sortDirKasbon === 'asc' ? cmp : -cmp
    })
  })

  async function muatKasbon() {
    loadingKasbon = true
    const hasil = await withLoading(() => fetchKasbon(filterStatusKasbon || undefined), { loadingKey: 'kasbon-list', loadingPesan: 'Memuat kasbon...', modul: 'karyawan', aksi: 'muat_kasbon', errorPesan: 'Gagal memuat kasbon' })
    if (hasil) kasbonList = hasil
    loadingKasbon = false
  }

  function bukaFormKasbon() {
    formKasbon = { karyawan_id: '', tanggal_pinjam: new Date().toISOString().slice(0, 10), jumlah: '', cicilan_per_bulan: '', catatan: '' }
    modalKasbonOpen = true
  }

  async function simpanKasbon() {
    const ok = await withLoading(() => createKasbon({ karyawan_id: Number(formKasbon.karyawan_id), tanggal_pinjam: formKasbon.tanggal_pinjam, jumlah: Number(formKasbon.jumlah), cicilan_per_bulan: Number(formKasbon.cicilan_per_bulan) || 0, catatan: formKasbon.catatan || undefined }), { loadingKey: 'kasbon-buat', loadingPesan: 'Menyimpan...', modul: 'karyawan', aksi: 'buat_kasbon', errorPesan: 'Gagal membuat kasbon', suksesOtomatis: true, suksesPesan: 'Kasbon diajukan' })
    if (ok === null) return
    modalKasbonOpen = false
    filterStatusKasbon = 'pengajuan'
    muatKasbon()
  }

  async function setujuiKasbon(id: number) {
    await withLoading(() => setujuiKasbonApi(id), { loadingKey: 'kasbon-setujui', loadingPesan: 'Menyetujui...', modul: 'karyawan', aksi: 'setujui_kasbon', errorPesan: 'Gagal menyetujui', suksesOtomatis: true, suksesPesan: 'Kasbon disetujui' })
    muatKasbon()
  }

  async function tolakKasbon(id: number) {
    const catatan = prompt('Alasan penolakan (opsional):') ?? ''
    await withLoading(() => tolakKasbonApi(id, catatan), { loadingKey: 'kasbon-tolak', loadingPesan: 'Menolak...', modul: 'karyawan', aksi: 'tolak_kasbon', errorPesan: 'Gagal menolak', suksesOtomatis: true, suksesPesan: 'Kasbon ditolak' })
    muatKasbon()
  }

  async function cairkanKasbon(id: number) {
    if (!confirm('Cairkan kasbon ini? Dana akan diberikan ke karyawan.')) return
    await withLoading(() => cairkanKasbonApi(id), { loadingKey: 'kasbon-cair', loadingPesan: 'Mencairkan...', modul: 'karyawan', aksi: 'cairkan_kasbon', errorPesan: 'Gagal mencairkan', suksesOtomatis: true, suksesPesan: 'Kasbon dicairkan' })
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
    const ok = await withLoading(() => cicilKasbonApi(cicilKasbonId!, Number(cicilJumlah)), { loadingKey: 'kasbon-cicil', loadingPesan: 'Mencicil...', modul: 'karyawan', aksi: 'cicil_kasbon', errorPesan: 'Gagal mencicil', suksesOtomatis: true, suksesPesan: 'Cicilan berhasil' })
    if (ok === null) return
    modalCicilOpen = false
    muatKasbon()
  }

  async function lihatJadwal(item: KasbonRow) {
    jadwalCicilanNama = item.nama_karyawan
    const hasil = await withLoading(() => fetchJadwalCicilan(item.id), { loadingKey: 'kasbon-jadwal', loadingPesan: 'Memuat jadwal...', modul: 'karyawan', aksi: 'muat_jadwal_cicilan', errorPesan: 'Gagal memuat jadwal' })
    if (hasil) { jadwalCicilanList = hasil; modalJadwalOpen = true }
  }

  async function hapusKasbon(id: number) {
    if (!confirm('Hapus data kasbon ini?')) return
    await withLoading(() => deleteKasbon(id), { loadingKey: 'kasbon-hapus', loadingPesan: 'Menghapus...', modul: 'karyawan', aksi: 'hapus_kasbon', errorPesan: 'Gagal hapus kasbon', suksesOtomatis: true, suksesPesan: 'Kasbon dihapus' })
    muatKasbon()
  }

  // ── Tab: Jadwal Shift ─────────────────────────────────────────────────────
  let tipeShiftList   = $state<TipeShift[]>([])
  let jadwalKerjaList = $state<JadwalRow[]>([])
  let tukarList       = $state<TukarRow[]>([])
  let loadingJadwal   = $state(false)
  let weekStart       = $state(getMondayOf(new Date()))
  let assignCell      = $state<{ karyawan_id: number; tanggal: string } | null>(null)
  let modalTipeOpen   = $state(false)
  let editTipe        = $state<TipeShift | null>(null)
  let formTipe        = $state({ nama: '', jam_mulai: '08:00', jam_selesai: '15:00', warna: '#00e676' })
  let modalTukarOpen  = $state(false)
  let formTukar       = $state({ jadwal_id: '', penerima_id: '', alasan: '' })

  const weekDays = $derived(getWeekDays(weekStart))
  const jadwalSendiri = $derived(jadwalKerjaList.filter(j => j.karyawan_id === userId))

  function jadwalUntuk(karyawanId: number, tanggal: string) {
    return jadwalFor(jadwalKerjaList, karyawanId, tanggal)
  }

  function prevWeek() { const d = new Date(weekStart); d.setDate(d.getDate() - 7); weekStart = d }
  function nextWeek() { const d = new Date(weekStart); d.setDate(d.getDate() + 7); weekStart = d }
  function thisWeek() { weekStart = getMondayOf(new Date()) }

  async function muatJadwal() {
    loadingJadwal = true
    const [r1, r2, r3] = await Promise.all([
      withLoading(() => fetchTipeShift(), { loadingKey: 'jadwal-tipe', loadingPesan: 'Memuat tipe shift...', modul: 'karyawan', aksi: 'muat_tipe', errorPesan: 'Gagal memuat tipe shift' }),
      withLoading(() => fetchJadwalKerja(weekDays[0], weekDays[6]), { loadingKey: 'jadwal-kerja', loadingPesan: 'Memuat jadwal...', modul: 'karyawan', aksi: 'muat_jadwal', errorPesan: 'Gagal memuat jadwal' }),
      withLoading(() => fetchTukar(), { loadingKey: 'jadwal-tukar', loadingPesan: 'Memuat tukar shift...', modul: 'karyawan', aksi: 'muat_tukar', errorPesan: 'Gagal memuat tukar shift' }),
    ])
    if (r1) tipeShiftList = r1
    if (r2) jadwalKerjaList = r2
    if (r3) tukarList = r3
    loadingJadwal = false
  }

  async function assignShift(karyawanId: number, tanggal: string, tipeId: number) {
    const ok = await withLoading(() => createJadwalKerja({ karyawan_id: karyawanId, tipe_shift_id: tipeId, tanggal }), { loadingKey: 'jadwal-assign', loadingPesan: 'Menyimpan jadwal...', modul: 'karyawan', aksi: 'assign_shift', errorPesan: 'Gagal menyimpan jadwal' })
    if (ok === null) return
    assignCell = null
    muatJadwal()
  }

  async function hapusJadwal(id: number) {
    if (!confirm('Hapus jadwal ini?')) return
    await withLoading(() => deleteJadwalKerja(id), { loadingKey: 'jadwal-hapus', loadingPesan: 'Menghapus...', modul: 'karyawan', aksi: 'hapus_jadwal', errorPesan: 'Gagal hapus jadwal' })
    muatJadwal()
  }

  function bukaModalTipe(t?: TipeShift) {
    editTipe = t ?? null
    formTipe = t
      ? { nama: t.nama, jam_mulai: t.jam_mulai, jam_selesai: t.jam_selesai, warna: t.warna }
      : { nama: '', jam_mulai: '08:00', jam_selesai: '15:00', warna: '#00e676' }
    modalTipeOpen = true
  }

  async function simpanTipe() {
    const fn = editTipe
      ? () => updateTipeShiftApi(editTipe!.id, formTipe)
      : () => createTipeShiftApi(formTipe)
    const ok = await withLoading(fn, { loadingKey: 'shift-simpan', loadingPesan: 'Menyimpan...', modul: 'karyawan', aksi: 'simpan_tipe', errorPesan: 'Gagal menyimpan tipe shift', suksesOtomatis: true, suksesPesan: 'Tipe shift disimpan' })
    if (ok === null) return
    modalTipeOpen = false
    muatJadwal()
  }

  async function hapusTipe(id: number) {
    if (!confirm('Nonaktifkan tipe shift ini?')) return
    await withLoading(() => deleteTipeShiftApi(id), { loadingKey: 'shift-hapus', loadingPesan: 'Menghapus...', modul: 'karyawan', aksi: 'hapus_tipe', errorPesan: 'Gagal hapus tipe shift' })
    muatJadwal()
  }

  function bukaFormTukar() {
    formTukar = { jadwal_id: '', penerima_id: '', alasan: '' }
    modalTukarOpen = true
  }

  async function ajukanTukar() {
    if (!formTukar.jadwal_id || !formTukar.penerima_id) {
      toast.error('Pilih jadwal dan penerima')
      return
    }
    const ok = await withLoading(() => createTukarApi({ jadwal_id: Number(formTukar.jadwal_id), penerima_id: Number(formTukar.penerima_id), alasan: formTukar.alasan || undefined }), { loadingKey: 'tukar-ajukan', loadingPesan: 'Mengajukan...', modul: 'karyawan', aksi: 'ajukan_tukar', errorPesan: 'Gagal mengajukan tukar shift', suksesOtomatis: true, suksesPesan: 'Tukar shift diajukan' })
    if (ok === null) return
    modalTukarOpen = false
    muatJadwal()
  }

  async function setujuiTukar(id: number) {
    await withLoading(() => setujuiTukarApi(id), { loadingKey: 'tukar-setujui', loadingPesan: 'Menyetujui...', modul: 'karyawan', aksi: 'setujui_tukar', errorPesan: 'Gagal menyetujui', suksesOtomatis: true, suksesPesan: 'Tukar disetujui' })
    muatJadwal()
  }

  async function tolakTukar(id: number) {
    await withLoading(() => tolakTukarApi(id), { loadingKey: 'tukar-tolak', loadingPesan: 'Menolak...', modul: 'karyawan', aksi: 'tolak_tukar', errorPesan: 'Gagal menolak' })
    muatJadwal()
  }

  // ── Tab: Performa ─────────────────────────────────────────────────────────
  let bulanPerforma      = $state(bulanIni)
  let performaList       = $state<PerformaRingkasan[]>([])
  let performaDetail     = $state<PerformaDetail | null>(null)
  let performaDetailId   = $state<number | null>(null)
  let loadingPerforma    = $state(false)

  async function muatPerforma() {
    loadingPerforma = true
    const hasil = await withLoading(() => fetchPerforma(bulanPerforma), { loadingKey: 'performa-list', loadingPesan: 'Memuat performa...', modul: 'karyawan', aksi: 'muat_performa', errorPesan: 'Gagal memuat performa' })
    loadingPerforma = false
    if (hasil) performaList = hasil.hasil
  }

  async function muatPerformaDetail(id: number) {
    performaDetailId = id
    performaDetail = null
    const hasil = await withLoading(() => fetchPerformaDetail(id, bulanPerforma), { loadingKey: 'performa-detail', loadingPesan: 'Memuat detail...', modul: 'karyawan', aksi: 'muat_performa_detail', errorPesan: 'Gagal memuat detail performa' })
    if (hasil) performaDetail = hasil
  }

  // ── Return ────────────────────────────────────────────────────────────────
  return {
    // Auth
    isManager,

    // Column definitions
    kolKaryawan, kolAbsensiList, kolAbsensiRekap, kolPenggajian, kolKasbon,

    // ── Karyawan ──
    get karyawanList()   { return karyawanList },
    get queryKaryawan()  { return queryKaryawan },
    set queryKaryawan(v: string) { queryKaryawan = v },
    get loadingKaryawan() { return loadingKaryawan },
    get modalKaryawanOpen() { return modalKaryawanOpen },
    set modalKaryawanOpen(v: boolean) { modalKaryawanOpen = v },
    get editKaryawan()   { return editKaryawan },
    get formKaryawan()   { return formKaryawan },
    get cabangList()     { return cabangList },
    get fotoPreview()    { return fotoPreview },
    get sortKeyKaryawan()  { return sortKeyKaryawan },
    set sortKeyKaryawan(v: string) { sortKeyKaryawan = v },
    get sortDirKaryawan()  { return sortDirKaryawan },
    set sortDirKaryawan(v: 'asc' | 'desc') { sortDirKaryawan = v },
    get pageKaryawan()   { return pageKaryawan },
    set pageKaryawan(v: number) { pageKaryawan = v },
    get pageSizeKaryawan() { return pageSizeKaryawan },
    set pageSizeKaryawan(v: number) { pageSizeKaryawan = v },
    get filteredKaryawan() { return filteredKaryawan },
    get pagedKaryawan()  { return pagedKaryawan },
    muatKaryawan, bukaFormKaryawan, handleFotoKaryawanChange, simpanKaryawan, hapusKaryawan,

    // ── Absensi ──
    get filterBulan()    { return filterBulan },
    set filterBulan(v: string) { filterBulan = v },
    get filterKaryawanId() { return filterKaryawanId },
    set filterKaryawanId(v: number | '') { filterKaryawanId = v },
    get absensiList()    { return absensiList },
    get rekapList()      { return rekapList },
    get loadingAbsensi() { return loadingAbsensi },
    get viewAbsensi()    { return viewAbsensi },
    set viewAbsensi(v: 'list' | 'rekap') { viewAbsensi = v },
    get sortKeyAbsensi() { return sortKeyAbsensi },
    set sortKeyAbsensi(v: string) { sortKeyAbsensi = v },
    get sortDirAbsensi() { return sortDirAbsensi },
    set sortDirAbsensi(v: 'asc' | 'desc') { sortDirAbsensi = v },
    get sortKeyRekap()   { return sortKeyRekap },
    set sortKeyRekap(v: string) { sortKeyRekap = v },
    get sortDirRekap()   { return sortDirRekap },
    set sortDirRekap(v: 'asc' | 'desc') { sortDirRekap = v },
    get modalAbsensiOpen() { return modalAbsensiOpen },
    set modalAbsensiOpen(v: boolean) { modalAbsensiOpen = v },
    get editAbsensi()    { return editAbsensi },
    get formAbsensi()    { return formAbsensi },
    get absensiHariIni() { return absensiHariIni },
    get sortedAbsensi()  { return sortedAbsensi },
    get sortedRekap()    { return sortedRekap },
    get realtimeList()   { return realtimeList },
    get loadingRealtime(){ return loadingRealtime },
    muatAbsensi, muatRealtime, bukaFormAbsensi, simpanAbsensi, hapusAbsensi, clockIn, clockOut, exportRekapCsv,

    // ── Penggajian ──
    get filterBulanGaji() { return filterBulanGaji },
    set filterBulanGaji(v: string) { filterBulanGaji = v },
    get penggajianList() { return penggajianList },
    get kasBankList()    { return kasBankList },
    get loadingGaji()    { return loadingGaji },
    get loadingGenerate(){ return loadingGenerate },
    get modalGajiOpen()  { return modalGajiOpen },
    set modalGajiOpen(v: boolean) { modalGajiOpen = v },
    get editGaji()       { return editGaji },
    get formGaji()       { return formGaji },
    get modalBayarOpen() { return modalBayarOpen },
    set modalBayarOpen(v: boolean) { modalBayarOpen = v },
    get bayarKasBankId() { return bayarKasBankId },
    set bayarKasBankId(v: string) { bayarKasBankId = v },
    get sortKeyGaji()    { return sortKeyGaji },
    set sortKeyGaji(v: string) { sortKeyGaji = v },
    get sortDirGaji()    { return sortDirGaji },
    set sortDirGaji(v: 'asc' | 'desc') { sortDirGaji = v },
    get sortedGaji()     { return sortedGaji },
    muatPenggajian, generateGaji, bukaEditGaji, simpanEditGaji, updateStatusGaji, bukaBayar, konfirmasBayar, hapusGaji,

    // ── Kasbon ──
    get filterStatusKasbon() { return filterStatusKasbon },
    set filterStatusKasbon(v: KasbonStatus | '') { filterStatusKasbon = v },
    get kasbonList()     { return kasbonList },
    get loadingKasbon()  { return loadingKasbon },
    get modalKasbonOpen(){ return modalKasbonOpen },
    set modalKasbonOpen(v: boolean) { modalKasbonOpen = v },
    get modalCicilOpen() { return modalCicilOpen },
    set modalCicilOpen(v: boolean) { modalCicilOpen = v },
    get modalJadwalOpen(){ return modalJadwalOpen },
    set modalJadwalOpen(v: boolean) { modalJadwalOpen = v },
    get jadwalCicilanList() { return jadwalCicilanList },
    get jadwalCicilanNama() { return jadwalCicilanNama },
    get cicilJumlah()    { return cicilJumlah },
    set cicilJumlah(v: string) { cicilJumlah = v },
    get formKasbon()     { return formKasbon },
    get sortKeyKasbon()  { return sortKeyKasbon },
    set sortKeyKasbon(v: string) { sortKeyKasbon = v },
    get sortDirKasbon()  { return sortDirKasbon },
    set sortDirKasbon(v: 'asc' | 'desc') { sortDirKasbon = v },
    get sortedKasbon()   { return sortedKasbon },
    muatKasbon, bukaFormKasbon, simpanKasbon, setujuiKasbon, tolakKasbon, cairkanKasbon, bukaCicil, simpanCicil, lihatJadwal, hapusKasbon,

    // ── Jadwal ──
    get tipeShiftList()  { return tipeShiftList },
    get jadwalKerjaList(){ return jadwalKerjaList },
    get tukarList()      { return tukarList },
    get loadingJadwal()  { return loadingJadwal },
    get weekStart()      { return weekStart },
    get weekDays()       { return weekDays },
    get assignCell()     { return assignCell },
    set assignCell(v: { karyawan_id: number; tanggal: string } | null) { assignCell = v },
    get modalTipeOpen()  { return modalTipeOpen },
    set modalTipeOpen(v: boolean) { modalTipeOpen = v },
    get editTipe()       { return editTipe },
    get formTipe()       { return formTipe },
    get modalTukarOpen() { return modalTukarOpen },
    set modalTukarOpen(v: boolean) { modalTukarOpen = v },
    get formTukar()      { return formTukar },
    get jadwalSendiri()  { return jadwalSendiri },
    jadwalUntuk, muatJadwal, prevWeek, nextWeek, thisWeek,
    assignShift, hapusJadwal, bukaModalTipe, simpanTipe, hapusTipe,
    bukaFormTukar, ajukanTukar, setujuiTukar, tolakTukar,

    // ── Performa ──
    get bulanPerforma()  { return bulanPerforma },
    set bulanPerforma(v: string) { bulanPerforma = v },
    get performaList()   { return performaList },
    get performaDetail() { return performaDetail },
    get performaDetailId(){ return performaDetailId },
    set performaDetailId(v: number | null) { performaDetailId = v },
    get loadingPerforma(){ return loadingPerforma },
    muatPerforma, muatPerformaDetail,
  }
}

export type KaryawanStore = ReturnType<typeof createKaryawanStore>
