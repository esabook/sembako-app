import { api } from '$lib/utils/api.js'
import type { KunjunganRow, AgendaRow, PipelineRow } from './sales.types.js'

export function createKunjunganStore() {
  let rows = $state<KunjunganRow[]>([])
  let bulan = $state(new Date().toISOString().slice(0, 7))
  let status = $state('')
  let formOpen = $state(false)
  let error = $state('')
  let editId = $state<number | null>(null)
  let fNama = $state('')
  let fAlamat = $state('')
  let fTanggal = $state(new Date().toISOString().slice(0, 10))
  let fTujuan = $state<KunjunganRow['tujuan']>('prospek')
  let fHasil = $state('')
  let fCatatan = $state('')
  let fStatus = $state<KunjunganRow['status_tindak_lanjut']>('open')
  let konfirmId = $state<number | null>(null)
  let konfirmBuka = $state(false)

  async function muat() {
    const q = new URLSearchParams()
    if (bulan) { q.set('dari', bulan + '-01'); q.set('sampai', bulan + '-31') }
    if (status) q.set('status', status)
    const r = await api.get<KunjunganRow[]>(`/sales/kunjungan?${q}`)
    if (r.success) rows = r.data
  }

  function bukaForm(row?: KunjunganRow) {
    editId = row?.id ?? null
    fNama = row?.nama_warung ?? ''
    fAlamat = row?.alamat ?? ''
    fTanggal = row?.tanggal ?? new Date().toISOString().slice(0, 10)
    fTujuan = row?.tujuan ?? 'prospek'
    fHasil = row?.hasil ?? ''
    fCatatan = row?.catatan ?? ''
    fStatus = row?.status_tindak_lanjut ?? 'open'
    error = ''
    formOpen = true
  }

  async function simpan() {
    error = ''
    if (!fNama.trim()) { error = 'Nama warung wajib'; return }
    const body = {
      nama_warung: fNama.trim(), alamat: fAlamat || undefined,
      tanggal: fTanggal, tujuan: fTujuan, hasil: fHasil || undefined,
      catatan: fCatatan || undefined, status_tindak_lanjut: fStatus,
    }
    const r = editId
      ? await api.put(`/sales/kunjungan/${editId}`, body)
      : await api.post('/sales/kunjungan', body)
    if (!r.success) { error = (r as any).error; return }
    formOpen = false
    muat()
  }

  function hapus(id: number) { konfirmId = id; konfirmBuka = true }

  async function doHapus() {
    if (!konfirmId) return
    await api.delete(`/sales/kunjungan/${konfirmId}`)
    konfirmId = null
    muat()
  }

  return {
    get rows() { return rows },
    get bulan() { return bulan }, set bulan(v: string) { bulan = v },
    get status() { return status }, set status(v: string) { status = v },
    get formOpen() { return formOpen }, set formOpen(v: boolean) { formOpen = v },
    get error() { return error },
    get editId() { return editId },
    get fNama() { return fNama }, set fNama(v: string) { fNama = v },
    get fAlamat() { return fAlamat }, set fAlamat(v: string) { fAlamat = v },
    get fTanggal() { return fTanggal }, set fTanggal(v: string) { fTanggal = v },
    get fTujuan() { return fTujuan }, set fTujuan(v: KunjunganRow['tujuan']) { fTujuan = v },
    get fHasil() { return fHasil }, set fHasil(v: string) { fHasil = v },
    get fCatatan() { return fCatatan }, set fCatatan(v: string) { fCatatan = v },
    get fStatus() { return fStatus }, set fStatus(v: KunjunganRow['status_tindak_lanjut']) { fStatus = v },
    get konfirmId() { return konfirmId }, set konfirmId(v: number | null) { konfirmId = v },
    get konfirmBuka() { return konfirmBuka }, set konfirmBuka(v: boolean) { konfirmBuka = v },
    muat, bukaForm, simpan, hapus, doHapus,
  }
}

export function createAgendaStore() {
  let rows = $state<AgendaRow[]>([])
  let bulan = $state(new Date().toISOString().slice(0, 7))
  let status = $state('')
  let formOpen = $state(false)
  let error = $state('')
  let editId = $state<number | null>(null)
  let fNamaSupplier = $state('')
  let fTipe = $state('kunjungan')
  let fTanggal = $state(new Date().toISOString().slice(0, 10))
  let fJam = $state('')
  let fLokasi = $state('')
  let fCatatan = $state('')
  let fHasil = $state('')
  let fStatus = $state('dijadwalkan')
  let konfirmId = $state<number | null>(null)
  let konfirmBuka = $state(false)

  async function muat() {
    const q = new URLSearchParams()
    if (bulan) { q.set('dari', bulan + '-01'); q.set('sampai', bulan + '-31') }
    if (status) q.set('status', status)
    const r = await api.get<AgendaRow[]>(`/sales/agenda-supplier?${q}`)
    if (r.success) rows = r.data
  }

  function bukaForm(row?: AgendaRow) {
    editId = row?.id ?? null
    fNamaSupplier = row?.nama_supplier ?? ''
    fTipe = row?.tipe ?? 'kunjungan'
    fTanggal = row?.tanggal ?? new Date().toISOString().slice(0, 10)
    fJam = row?.jam ?? ''
    fLokasi = row?.lokasi ?? ''
    fCatatan = row?.catatan ?? ''
    fHasil = row?.hasil ?? ''
    fStatus = row?.status ?? 'dijadwalkan'
    error = ''
    formOpen = true
  }

  async function simpan() {
    error = ''
    if (!fNamaSupplier.trim()) { error = 'Nama supplier wajib'; return }
    const body = {
      nama_supplier: fNamaSupplier.trim(), tipe: fTipe,
      tanggal: fTanggal, jam: fJam || undefined, lokasi: fLokasi || undefined,
      catatan: fCatatan || undefined, hasil: fHasil || undefined, status: fStatus,
    }
    const r = editId
      ? await api.put(`/sales/agenda-supplier/${editId}`, body)
      : await api.post('/sales/agenda-supplier', body)
    if (!r.success) { error = (r as any).error; return }
    formOpen = false
    muat()
  }

  function hapus(id: number) { konfirmId = id; konfirmBuka = true }

  async function doHapus() {
    if (!konfirmId) return
    await api.delete(`/sales/agenda-supplier/${konfirmId}`)
    konfirmId = null
    muat()
  }

  return {
    get rows() { return rows },
    get bulan() { return bulan }, set bulan(v: string) { bulan = v },
    get status() { return status }, set status(v: string) { status = v },
    get formOpen() { return formOpen }, set formOpen(v: boolean) { formOpen = v },
    get error() { return error },
    get editId() { return editId },
    get fNamaSupplier() { return fNamaSupplier }, set fNamaSupplier(v: string) { fNamaSupplier = v },
    get fTipe() { return fTipe }, set fTipe(v: string) { fTipe = v },
    get fTanggal() { return fTanggal }, set fTanggal(v: string) { fTanggal = v },
    get fJam() { return fJam }, set fJam(v: string) { fJam = v },
    get fLokasi() { return fLokasi }, set fLokasi(v: string) { fLokasi = v },
    get fCatatan() { return fCatatan }, set fCatatan(v: string) { fCatatan = v },
    get fHasil() { return fHasil }, set fHasil(v: string) { fHasil = v },
    get fStatus() { return fStatus }, set fStatus(v: string) { fStatus = v },
    get konfirmId() { return konfirmId }, set konfirmId(v: number | null) { konfirmId = v },
    get konfirmBuka() { return konfirmBuka }, set konfirmBuka(v: boolean) { konfirmBuka = v },
    muat, bukaForm, simpan, hapus, doHapus,
  }
}

export function createPipelineStore() {
  let rows = $state<PipelineRow[]>([])
  let tahap = $state('')
  let formOpen = $state(false)
  let error = $state('')
  let editId = $state<number | null>(null)
  let fNama = $state('')
  let fNilai = $state<number | ''>(0)
  let fTahap = $state('prospek')
  let fProduk = $state('')
  let fCatatan = $state('')
  let fTanggal = $state(new Date().toISOString().slice(0, 10))
  let konfirmId = $state<number | null>(null)
  let konfirmBuka = $state(false)

  async function muat() {
    const q = new URLSearchParams()
    if (tahap) q.set('tahap', tahap)
    const r = await api.get<PipelineRow[]>(`/sales/pipeline?${q}`)
    if (r.success) rows = r.data
  }

  function bukaForm(row?: PipelineRow) {
    editId = row?.id ?? null
    fNama = row?.nama_pelanggan ?? ''
    fNilai = row?.nilai_estimasi ?? 0
    fTahap = row?.tahap ?? 'prospek'
    fProduk = row?.produk_minat ?? ''
    fCatatan = row?.catatan ?? ''
    fTanggal = row?.tanggal_masuk ?? new Date().toISOString().slice(0, 10)
    error = ''
    formOpen = true
  }

  async function simpan() {
    error = ''
    if (!fNama.trim()) { error = 'Nama pelanggan wajib'; return }
    const body = {
      nama_pelanggan: fNama.trim(), nilai_estimasi: Number(fNilai) || 0,
      tahap: fTahap, produk_minat: fProduk || undefined,
      catatan: fCatatan || undefined, tanggal_masuk: fTanggal,
    }
    const r = editId
      ? await api.put(`/sales/pipeline/${editId}`, body)
      : await api.post('/sales/pipeline', body)
    if (!r.success) { error = (r as any).error; return }
    formOpen = false
    muat()
  }

  async function ubahTahap(id: number, t: string) {
    await api.put(`/sales/pipeline/${id}`, { tahap: t })
    muat()
  }

  function hapus(id: number) { konfirmId = id; konfirmBuka = true }

  async function doHapus() {
    if (!konfirmId) return
    await api.delete(`/sales/pipeline/${konfirmId}`)
    konfirmId = null
    muat()
  }

  return {
    get rows() { return rows },
    get tahap() { return tahap }, set tahap(v: string) { tahap = v },
    get formOpen() { return formOpen }, set formOpen(v: boolean) { formOpen = v },
    get error() { return error },
    get editId() { return editId },
    get fNama() { return fNama }, set fNama(v: string) { fNama = v },
    get fNilai() { return fNilai }, set fNilai(v: number | '') { fNilai = v },
    get fTahap() { return fTahap }, set fTahap(v: string) { fTahap = v },
    get fProduk() { return fProduk }, set fProduk(v: string) { fProduk = v },
    get fCatatan() { return fCatatan }, set fCatatan(v: string) { fCatatan = v },
    get fTanggal() { return fTanggal }, set fTanggal(v: string) { fTanggal = v },
    get konfirmId() { return konfirmId }, set konfirmId(v: number | null) { konfirmId = v },
    get konfirmBuka() { return konfirmBuka }, set konfirmBuka(v: boolean) { konfirmBuka = v },
    muat, bukaForm, simpan, ubahTahap, hapus, doHapus,
  }
}
