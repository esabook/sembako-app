import type { PermintaanRow, KomplainRow } from './crm.types.js'
import * as api from './crm.api.js'

export function createCrmStore() {
  // ── Permintaan state ─────────────────────────────────────────────────────
  let _pRows = $state<PermintaanRow[]>([])
  let _pBulan = $state(new Date().toISOString().slice(0, 7))
  let _pStatus = $state('')
  let _pFormOpen = $state(false)
  let _pError = $state('')
  let _fPNama = $state('')
  let _fPPelanggan = $state('')
  let _fPBarang = $state('')
  let _fPQty = $state('')
  let _fPCatatan = $state('')
  let _fPTanggal = $state(new Date().toISOString().slice(0, 10))
  let _konfirmPermintaanId = $state<number | null>(null)
  let _konfirmPermintaanBuka = $state(false)

  // ── Komplain state ───────────────────────────────────────────────────────
  let _kRows = $state<KomplainRow[]>([])
  let _kBulan = $state(new Date().toISOString().slice(0, 7))
  let _kStatus = $state('')
  let _kFormOpen = $state(false)
  let _kDetailOpen = $state(false)
  let _kDetailRow = $state<KomplainRow | null>(null)
  let _kError = $state('')
  let _fKPelanggan = $state('')
  let _fKKategori = $state('lainnya')
  let _fKDeskripsi = $state('')
  let _fKTanggal = $state(new Date().toISOString().slice(0, 10))
  let _fKResolusi = $state('')
  let _konfirmKomplainId = $state<number | null>(null)
  let _konfirmKomplainBuka = $state(false)

  return {
    // ── Permintaan getters/setters ─────────────────────────────────────────
    get pRows() { return _pRows },
    get pBulan() { return _pBulan },
    set pBulan(v) { _pBulan = v },
    get pStatus() { return _pStatus },
    set pStatus(v) { _pStatus = v },
    get pFormOpen() { return _pFormOpen },
    set pFormOpen(v) { _pFormOpen = v },
    get pError() { return _pError },
    get fPNama() { return _fPNama },
    set fPNama(v) { _fPNama = v },
    get fPPelanggan() { return _fPPelanggan },
    set fPPelanggan(v) { _fPPelanggan = v },
    get fPBarang() { return _fPBarang },
    set fPBarang(v) { _fPBarang = v },
    get fPQty() { return _fPQty },
    set fPQty(v) { _fPQty = v },
    get fPCatatan() { return _fPCatatan },
    set fPCatatan(v) { _fPCatatan = v },
    get fPTanggal() { return _fPTanggal },
    set fPTanggal(v) { _fPTanggal = v },
    get konfirmPermintaanId() { return _konfirmPermintaanId },
    get konfirmPermintaanBuka() { return _konfirmPermintaanBuka },
    set konfirmPermintaanBuka(v) { _konfirmPermintaanBuka = v },

    // ── Komplain getters/setters ───────────────────────────────────────────
    get kRows() { return _kRows },
    get kBulan() { return _kBulan },
    set kBulan(v) { _kBulan = v },
    get kStatus() { return _kStatus },
    set kStatus(v) { _kStatus = v },
    get kFormOpen() { return _kFormOpen },
    set kFormOpen(v) { _kFormOpen = v },
    get kDetailOpen() { return _kDetailOpen },
    set kDetailOpen(v) { _kDetailOpen = v },
    get kDetailRow() { return _kDetailRow },
    get kError() { return _kError },
    get fKPelanggan() { return _fKPelanggan },
    set fKPelanggan(v) { _fKPelanggan = v },
    get fKKategori() { return _fKKategori },
    set fKKategori(v) { _fKKategori = v },
    get fKDeskripsi() { return _fKDeskripsi },
    set fKDeskripsi(v) { _fKDeskripsi = v },
    get fKTanggal() { return _fKTanggal },
    set fKTanggal(v) { _fKTanggal = v },
    get fKResolusi() { return _fKResolusi },
    set fKResolusi(v) { _fKResolusi = v },
    get konfirmKomplainId() { return _konfirmKomplainId },
    get konfirmKomplainBuka() { return _konfirmKomplainBuka },
    set konfirmKomplainBuka(v) { _konfirmKomplainBuka = v },

    // ── Permintaan methods ─────────────────────────────────────────────────
    async muatPermintaan() {
      const r = await api.fetchPermintaan(_pBulan, _pStatus)
      if (r.success) _pRows = r.data
    },

    bukaFormPermintaan() {
      _pError = ''; _fPNama = ''; _fPBarang = ''; _fPPelanggan = ''
      _fPQty = ''; _fPCatatan = ''
      _fPTanggal = new Date().toISOString().slice(0, 10)
      _pFormOpen = true
    },

    async simpanPermintaan() {
      _pError = ''
      if (!_fPBarang.trim()) { _pError = 'Nama barang wajib'; return }
      const r = await api.createPermintaan({
        nama_barang: _fPBarang.trim(),
        nama_pelanggan: _fPPelanggan.trim() || undefined,
        qty_minta: _fPQty ? Number(_fPQty) : undefined,
        catatan: _fPCatatan.trim() || undefined,
        tanggal: _fPTanggal,
      })
      if (!r.success) { _pError = (r as any).error; return }
      _pFormOpen = false
      await this.muatPermintaan()
    },

    async ubahStatusP(id: number, status: PermintaanRow['status']) {
      await api.updatePermintaan(id, status)
      await this.muatPermintaan()
    },

    hapusP(id: number) {
      _konfirmPermintaanId = id
      _konfirmPermintaanBuka = true
    },

    async doHapusP() {
      if (!_konfirmPermintaanId) return
      await api.deletePermintaan(_konfirmPermintaanId)
      _konfirmPermintaanId = null
      await this.muatPermintaan()
    },

    // ── Komplain methods ───────────────────────────────────────────────────
    async muatKomplain() {
      const r = await api.fetchKomplain(_kBulan, _kStatus)
      if (r.success) _kRows = r.data
    },

    bukaFormKomplain() {
      _kError = ''; _fKPelanggan = ''; _fKKategori = 'lainnya'
      _fKDeskripsi = ''
      _fKTanggal = new Date().toISOString().slice(0, 10)
      _kFormOpen = true
    },

    async simpanKomplain() {
      _kError = ''
      if (!_fKDeskripsi.trim()) { _kError = 'Deskripsi wajib'; return }
      const r = await api.createKomplain({
        kategori: _fKKategori, deskripsi: _fKDeskripsi.trim(),
        nama_pelanggan: _fKPelanggan.trim() || undefined,
        tanggal: _fKTanggal,
      })
      if (!r.success) { _kError = (r as any).error; return }
      _kFormOpen = false
      await this.muatKomplain()
    },

    bukaDetailKomplain(row: KomplainRow) {
      _kDetailRow = row
      _fKResolusi = row.resolusi ?? ''
      _kDetailOpen = true
    },

    async ubahStatusK(id: number, status: KomplainRow['status'], resolusi?: string) {
      await api.updateKomplain(id, status, resolusi)
      _kDetailOpen = false
      await this.muatKomplain()
    },

    hapusK(id: number) {
      _konfirmKomplainId = id
      _konfirmKomplainBuka = true
    },

    async doHapusK() {
      if (!_konfirmKomplainId) return
      await api.deleteKomplain(_konfirmKomplainId)
      _konfirmKomplainId = null
      await this.muatKomplain()
    },
  }
}

export type CrmStore = ReturnType<typeof createCrmStore>
