import type { Acara } from './hajatan.types.js'
import * as api from './hajatan.api.js'

export function createHajatanStore() {
  let _list = $state<Acara[]>([])
  let _loading = $state(false)
  let _filterStatus = $state('')
  let _filterBulan = $state(new Date().toISOString().slice(0, 7))

  let _formOpen = $state(false)
  let _editRow = $state<Acara | null>(null)
  let _fNamaAcara = $state('')
  let _fNamaPenyelenggara = $state('')
  let _fTanggal = $state('')
  let _fAlamat = $state('')
  let _fEstimasi = $state<number | ''>('')
  let _fCatatan = $state('')
  let _fStatus = $state('persiapan')
  let _fTotalOrder = $state<number | ''>('')

  let _konfirmBuka = $state(false)
  let _konfirmId = $state<number | null>(null)

  return {
    get list() { return _list },
    get loading() { return _loading },
    get filterStatus() { return _filterStatus },
    set filterStatus(v) { _filterStatus = v },
    get filterBulan() { return _filterBulan },
    set filterBulan(v) { _filterBulan = v },

    get formOpen() { return _formOpen },
    set formOpen(v) { _formOpen = v },
    get editRow() { return _editRow },
    get fNamaAcara() { return _fNamaAcara },
    set fNamaAcara(v) { _fNamaAcara = v },
    get fNamaPenyelenggara() { return _fNamaPenyelenggara },
    set fNamaPenyelenggara(v) { _fNamaPenyelenggara = v },
    get fTanggal() { return _fTanggal },
    set fTanggal(v) { _fTanggal = v },
    get fAlamat() { return _fAlamat },
    set fAlamat(v) { _fAlamat = v },
    get fEstimasi() { return _fEstimasi },
    set fEstimasi(v) { _fEstimasi = v },
    get fCatatan() { return _fCatatan },
    set fCatatan(v) { _fCatatan = v },
    get fStatus() { return _fStatus },
    set fStatus(v) { _fStatus = v },
    get fTotalOrder() { return _fTotalOrder },
    set fTotalOrder(v) { _fTotalOrder = v },

    get konfirmBuka() { return _konfirmBuka },
    set konfirmBuka(v) { _konfirmBuka = v },
    get konfirmId() { return _konfirmId },

    async muat() {
      _loading = true
      try {
        const r = await api.fetchAcara(_filterBulan, _filterStatus)
        if (r.success) _list = r.data
      } finally { _loading = false }
    },

    bukaFormTambah() {
      _editRow = null
      _fNamaAcara = ''; _fNamaPenyelenggara = ''; _fTanggal = ''
      _fAlamat = ''; _fEstimasi = ''; _fCatatan = ''
      _fStatus = 'persiapan'; _fTotalOrder = ''
      _formOpen = true
    },

    bukaFormEdit(a: Acara) {
      _editRow = a
      _fNamaAcara = a.nama_acara
      _fNamaPenyelenggara = a.nama_penyelenggara
      _fTanggal = a.tanggal_acara
      _fAlamat = a.alamat ?? ''
      _fEstimasi = a.estimasi_tamu ?? ''
      _fCatatan = a.catatan ?? ''
      _fStatus = a.status
      _fTotalOrder = a.total_order || ''
      _formOpen = true
    },

    async simpan() {
      if (!_fNamaAcara.trim() || !_fNamaPenyelenggara.trim() || !_fTanggal) return
      const payload = {
        nama_acara: _fNamaAcara.trim(),
        nama_penyelenggara: _fNamaPenyelenggara.trim(),
        tanggal_acara: _fTanggal,
        alamat: _fAlamat || undefined,
        estimasi_tamu: _fEstimasi !== '' ? Number(_fEstimasi) : undefined,
        catatan: _fCatatan || undefined,
        status: _fStatus,
        total_order: _fTotalOrder !== '' ? Number(_fTotalOrder) : 0,
      }
      if (_editRow) {
        await api.updateAcara(_editRow.id, payload as any)
      } else {
        await api.createAcara(payload as any)
      }
      _formOpen = false
      await this.muat()
    },

    konfirmHapus(id: number) {
      _konfirmId = id
      _konfirmBuka = true
    },

    async hapus() {
      if (!_konfirmId) return
      await api.deleteAcara(_konfirmId)
      _konfirmId = null
      _konfirmBuka = false
      await this.muat()
    },
  }
}

export type HajatanStore = ReturnType<typeof createHajatanStore>
