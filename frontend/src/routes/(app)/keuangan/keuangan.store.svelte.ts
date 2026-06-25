import { withLoading } from '$lib/utils/async'
import { hariIni } from './keuangan.logic'
import {
  fetchHutang,
  bayarHutang,
  fetchPiutang,
  bayarPiutang,
  fetchJurnal,
  simpanJurnal,
  fetchKasBank,
  fetchKasBankSaldo,
  tambahKasBank,
  ubahKasBank,
  hapusKasBank,
  fetchPinjaman,
  tambahPinjaman,
  ubahPinjaman,
  cicilPinjaman,
  hapusPinjaman,
} from './keuangan.api'
import type {
  Hutang,
  Piutang,
  Jurnal,
  KasBank,
  KasBankSaldo,
  PinjamanRow,
  FilterStatus,
  BayarForm,
  JurnalForm,
  KasBankForm,
} from './keuangan.types'

export function createKeuanganStore() {
  const bulanIni = hariIni().slice(0, 7)

  // ── Data ─────────────────────────────────────────────────────────────────
  let hutangList = $state<Hutang[]>([])
  let piutangList = $state<Piutang[]>([])
  let jurnalList = $state<Jurnal[]>([])
  let kasBankList = $state<KasBank[]>([])
  let kasBankSaldo = $state<KasBankSaldo[]>([])
  let piRows = $state<PinjamanRow[]>([])
  let loading = $state(false)

  // ── Filter & pagination ────────────────────────────────────────────────────
  let filterStatusHutang = $state<FilterStatus>('belum')
  let filterStatusPiutang = $state<FilterStatus>('belum')
  let filterDari = $state(bulanIni + '-01')
  let filterSampai = $state(hariIni())
  let filterKasBankId = $state(0)
  let piTipeFilter = $state('')
  let piStatusFilter = $state('aktif')

  let pageHutang = $state(1); let pageSizeHutang = $state(25)
  let pagePiutang = $state(1); let pageSizePiutang = $state(25)
  let pageJurnal = $state(1); let pageSizeJurnal = $state(25)

  // ── Derived ──────────────────────────────────────────────────────────────
  const hutangFiltered = $derived(
    filterStatusHutang === 'semua' ? hutangList : hutangList.filter(h => h.status === filterStatusHutang)
  )
  const piutangFiltered = $derived(
    filterStatusPiutang === 'semua' ? piutangList : piutangList.filter(p => p.status === filterStatusPiutang)
  )
  const pagedHutang = $derived(
    pageSizeHutang === 0 ? hutangFiltered : hutangFiltered.slice((pageHutang - 1) * pageSizeHutang, pageHutang * pageSizeHutang)
  )
  const pagedPiutang = $derived(
    pageSizePiutang === 0 ? piutangFiltered : piutangFiltered.slice((pagePiutang - 1) * pageSizePiutang, pagePiutang * pageSizePiutang)
  )
  const pagedJurnal = $derived(
    pageSizeJurnal === 0 ? jurnalList : jurnalList.slice((pageJurnal - 1) * pageSizeJurnal, pageJurnal * pageSizeJurnal)
  )

  const totalHutangBelum = $derived(
    hutangList.filter(h => h.status !== 'lunas').reduce((s, h) => s + h.sisa_hutang, 0)
  )
  const totalPiutangBelum = $derived(
    piutangList.filter(p => p.status !== 'lunas').reduce((s, p) => s + p.sisa_piutang, 0)
  )
  const totalSaldo = $derived(kasBankSaldo.reduce((s, kb) => s + kb.saldo, 0))
  const jurnalMasuk = $derived(jurnalList.filter(j => j.jenis === 'masuk').reduce((s, j) => s + j.jumlah, 0))
  const jurnalKeluar = $derived(jurnalList.filter(j => j.jenis === 'keluar').reduce((s, j) => s + j.jumlah, 0))

  // ── Modal: Bayar Hutang ────────────────────────────────────────────────────
  let modalBayarHutang = $state(false)
  let hutangDipilih = $state<Hutang | null>(null)
  let formBayarHutang = $state<BayarForm>({ jumlah_bayar: 0, kas_bank_id: 0, tanggal_bayar: '' })
  let savingBayarHutang = $state(false)

  // ── Modal: Bayar Piutang ───────────────────────────────────────────────────
  let modalBayarPiutang = $state(false)
  let piutangDipilih = $state<Piutang | null>(null)
  let formBayarPiutang = $state<BayarForm>({ jumlah_bayar: 0, kas_bank_id: 0, tanggal_bayar: '' })
  let savingBayarPiutang = $state(false)

  // ── Modal: Jurnal Manual ───────────────────────────────────────────────────
  let modalJurnal = $state(false)
  let formJurnal = $state<JurnalForm>({ kas_bank_id: 0, jenis: 'masuk', kategori: '', keterangan: '', jumlah: 0, tanggal: '' })
  let savingJurnal = $state(false)

  // ── Modal: Kas/Bank ────────────────────────────────────────────────────────
  let modalKasBank = $state(false)
  let editKasBank = $state<KasBank | null>(null)
  let formKasBank = $state<KasBankForm>({ nama: '', tipe: 'kas', saldo_awal: 0 })
  let savingKasBank = $state(false)
  let konfirmKasBankId = $state<number | null>(null)
  let konfirmKasBankBuka = $state(false)

  // ── Modal: Pinjaman/Investasi ──────────────────────────────────────────────
  let piFormOpen = $state(false)
  let piCicilOpen = $state(false)
  let piError = $state('')
  let editPiId = $state<number | null>(null)
  let cicilPiId = $state<number | null>(null)
  let cicilJumlah = $state('')
  let fPiTipe = $state<'pinjaman' | 'investasi'>('pinjaman')
  let fPiNama = $state('')
  let fPiPokok = $state('')
  let fPiBunga = $state('0')
  let fPiCicilan = $state('0')
  let fPiMulai = $state('')
  let fPiJatuh = $state('')
  let fPiCatatan = $state('')
  let konfirmPiId = $state<number | null>(null)
  let konfirmPiBuka = $state(false)

  // ── Load ───────────────────────────────────────────────────────────────────
  async function muatHutang() {
    const r = await withLoading(() => fetchHutang(), {
      loadingKey: 'keuangan-hutang', loadingPesan: 'Memuat hutang...',
      modul: 'keuangan', aksi: 'muat_hutang', errorPesan: 'Gagal memuat hutang',
    })
    if (r) hutangList = r
  }

  async function muatPiutang() {
    const r = await withLoading(() => fetchPiutang(), {
      loadingKey: 'keuangan-piutang', loadingPesan: 'Memuat piutang...',
      modul: 'keuangan', aksi: 'muat_piutang', errorPesan: 'Gagal memuat piutang',
    })
    if (r) piutangList = r
  }

  async function muatJurnal() {
    const r = await withLoading(
      () => fetchJurnal({ dari: filterDari, sampai: filterSampai, kas_bank_id: filterKasBankId }),
      { loadingKey: 'keuangan-jurnal', loadingPesan: 'Memuat jurnal...',
        modul: 'keuangan', aksi: 'muat_jurnal', errorPesan: 'Gagal memuat jurnal' },
    )
    if (r) jurnalList = r
  }

  async function muatKasBank() {
    const r = await withLoading(() => fetchKasBank(), {
      loadingKey: 'keuangan-kasbank-list', loadingPesan: 'Memuat akun...',
      modul: 'keuangan', aksi: 'muat_kas_bank', errorPesan: 'Gagal memuat akun kas/bank',
    })
    if (r) kasBankList = r
  }

  async function muatKasBankSaldo() {
    loading = true
    const r = await withLoading(() => fetchKasBankSaldo(), {
      loadingKey: 'keuangan-kasbank-saldo', loadingPesan: 'Memuat saldo...',
      modul: 'keuangan', aksi: 'muat_saldo', errorPesan: 'Gagal memuat saldo',
    })
    if (r) kasBankSaldo = r
    loading = false
  }

  async function muatPinjaman() {
    const r = await withLoading(
      () => fetchPinjaman({ tipe: piTipeFilter, status: piStatusFilter }),
      { loadingKey: 'keuangan-pinjaman', loadingPesan: 'Memuat pinjaman...',
        modul: 'keuangan', aksi: 'muat_pinjaman', errorPesan: 'Gagal memuat pinjaman/investasi' },
    )
    if (r) piRows = r
  }

  // ── Bayar Hutang ───────────────────────────────────────────────────────────
  function bukaBayarHutang(h: Hutang) {
    hutangDipilih = h
    formBayarHutang = { jumlah_bayar: h.sisa_hutang, kas_bank_id: kasBankList[0]?.id ?? 0, tanggal_bayar: hariIni() }
    modalBayarHutang = true
  }

  async function simpanBayarHutang() {
    if (!hutangDipilih) return
    savingBayarHutang = true
    const r = await withLoading(() => bayarHutang(hutangDipilih!.id, formBayarHutang), {
      loadingKey: 'keuangan-bayar-hutang', loadingPesan: 'Menyimpan pembayaran...',
      modul: 'keuangan', aksi: 'bayar_hutang',
      suksesOtomatis: true, suksesPesan: 'Pembayaran hutang tersimpan', errorPesan: 'Gagal menyimpan pembayaran',
    })
    savingBayarHutang = false
    if (r) {
      modalBayarHutang = false
      await Promise.all([muatHutang(), muatKasBankSaldo()])
    }
  }

  // ── Bayar Piutang ──────────────────────────────────────────────────────────
  function bukaBayarPiutang(p: Piutang) {
    piutangDipilih = p
    formBayarPiutang = { jumlah_bayar: p.sisa_piutang, kas_bank_id: kasBankList[0]?.id ?? 0, tanggal_bayar: hariIni() }
    modalBayarPiutang = true
  }

  async function simpanBayarPiutang() {
    if (!piutangDipilih) return
    savingBayarPiutang = true
    const r = await withLoading(() => bayarPiutang(piutangDipilih!.id, formBayarPiutang), {
      loadingKey: 'keuangan-bayar-piutang', loadingPesan: 'Menyimpan pembayaran...',
      modul: 'keuangan', aksi: 'bayar_piutang',
      suksesOtomatis: true, suksesPesan: 'Pembayaran piutang tersimpan', errorPesan: 'Gagal menyimpan pembayaran',
    })
    savingBayarPiutang = false
    if (r) {
      modalBayarPiutang = false
      await Promise.all([muatPiutang(), muatKasBankSaldo()])
    }
  }

  // ── Jurnal Manual ──────────────────────────────────────────────────────────
  function bukaModalJurnal() {
    formJurnal = { kas_bank_id: kasBankList[0]?.id ?? 0, jenis: 'masuk', kategori: '', keterangan: '', jumlah: 0, tanggal: hariIni() }
    modalJurnal = true
  }

  async function simpanJurnalFn() {
    savingJurnal = true
    const r = await withLoading(() => simpanJurnal(formJurnal), {
      loadingKey: 'keuangan-simpan-jurnal', loadingPesan: 'Menyimpan jurnal...',
      modul: 'keuangan', aksi: 'simpan_jurnal',
      suksesOtomatis: true, suksesPesan: 'Jurnal tersimpan', errorPesan: 'Gagal menyimpan jurnal',
    })
    savingJurnal = false
    if (r) {
      modalJurnal = false
      await Promise.all([muatJurnal(), muatKasBankSaldo()])
    }
  }

  // ── Kas/Bank ───────────────────────────────────────────────────────────────
  function bukaTambahKasBank() {
    editKasBank = null
    formKasBank = { nama: '', tipe: 'kas', saldo_awal: 0 }
    modalKasBank = true
  }

  function bukaEditKasBank(kb: KasBankSaldo) {
    editKasBank = kb
    formKasBank = { nama: kb.nama, tipe: kb.tipe, saldo_awal: kb.saldo_awal }
    modalKasBank = true
  }

  async function simpanKasBank() {
    if (!formKasBank.nama.trim()) return
    savingKasBank = true
    const akun = editKasBank
    const r = await withLoading(
      () => akun
        ? ubahKasBank(akun.id, { nama: formKasBank.nama, saldo_awal: formKasBank.saldo_awal })
        : tambahKasBank(formKasBank),
      { loadingKey: 'keuangan-simpan-kasbank', loadingPesan: 'Menyimpan akun...',
        modul: 'keuangan', aksi: 'simpan_kas_bank',
        suksesOtomatis: true, suksesPesan: 'Akun kas/bank tersimpan', errorPesan: 'Gagal menyimpan akun' },
    )
    savingKasBank = false
    if (r) {
      modalKasBank = false
      await Promise.all([muatKasBankSaldo(), muatKasBank()])
    }
  }

  function nonaktifkanKasBank(id: number) {
    konfirmKasBankId = id
    konfirmKasBankBuka = true
  }

  async function doNonaktifkanKasBank() {
    if (!konfirmKasBankId) return
    const id = konfirmKasBankId
    const r = await withLoading(() => hapusKasBank(id), {
      loadingKey: 'keuangan-hapus-kasbank', loadingPesan: 'Menonaktifkan akun...',
      modul: 'keuangan', aksi: 'nonaktif_kas_bank',
      suksesOtomatis: true, suksesPesan: 'Akun dinonaktifkan', errorPesan: 'Gagal menonaktifkan akun',
    })
    konfirmKasBankId = null
    if (r) await Promise.all([muatKasBankSaldo(), muatKasBank()])
  }

  // ── Pinjaman/Investasi ─────────────────────────────────────────────────────
  function bukaPiForm(row?: PinjamanRow) {
    editPiId = row?.id ?? null
    fPiTipe = row?.tipe ?? 'pinjaman'
    fPiNama = row?.nama ?? ''
    fPiPokok = row ? String(row.jumlah_pokok) : ''
    fPiBunga = row ? String(row.bunga_persen) : '0'
    fPiCicilan = row ? String(row.cicilan_per_bulan) : '0'
    fPiMulai = row?.tanggal_mulai ?? ''
    fPiJatuh = row?.jatuh_tempo ?? ''
    fPiCatatan = row?.catatan ?? ''
    piError = ''
    piFormOpen = true
  }

  async function simpanPi() {
    piError = ''
    if (!fPiNama.trim()) { piError = 'Nama wajib'; return }
    if (!fPiPokok || Number(fPiPokok) <= 0) { piError = 'Jumlah pokok harus > 0'; return }
    if (!fPiMulai) { piError = 'Tanggal mulai wajib'; return }
    const payload = {
      tipe: fPiTipe, nama: fPiNama.trim(), jumlah_pokok: Number(fPiPokok),
      bunga_persen: Number(fPiBunga), cicilan_per_bulan: Number(fPiCicilan),
      tanggal_mulai: fPiMulai, jatuh_tempo: fPiJatuh || undefined, catatan: fPiCatatan || undefined,
    }
    const id = editPiId
    const r = await withLoading(
      () => id ? ubahPinjaman(id, payload) : tambahPinjaman(payload),
      { loadingKey: 'keuangan-simpan-pinjaman', loadingPesan: 'Menyimpan...',
        modul: 'keuangan', aksi: 'simpan_pinjaman',
        suksesOtomatis: true, suksesPesan: 'Data tersimpan', errorPesan: 'Gagal menyimpan data' },
    )
    if (r) { piFormOpen = false; await muatPinjaman() }
    else piError = 'Gagal menyimpan data'
  }

  function bukaCicilPi(row: PinjamanRow) {
    cicilPiId = row.id
    cicilJumlah = String(row.cicilan_per_bulan || '')
    piCicilOpen = true
  }

  async function cicilPi() {
    if (!cicilPiId || !cicilJumlah || Number(cicilJumlah) <= 0) return
    const id = cicilPiId
    const r = await withLoading(() => cicilPinjaman(id, Number(cicilJumlah)), {
      loadingKey: 'keuangan-cicil', loadingPesan: 'Menyimpan cicilan...',
      modul: 'keuangan', aksi: 'cicil_pinjaman',
      suksesOtomatis: true, suksesPesan: 'Cicilan tersimpan', errorPesan: 'Gagal menyimpan cicilan',
    })
    if (r) { piCicilOpen = false; cicilJumlah = ''; await muatPinjaman() }
  }

  function hapusPi(id: number) {
    konfirmPiId = id
    konfirmPiBuka = true
  }

  async function doHapusPi() {
    if (!konfirmPiId) return
    const id = konfirmPiId
    const r = await withLoading(() => hapusPinjaman(id), {
      loadingKey: 'keuangan-hapus-pinjaman', loadingPesan: 'Menghapus...',
      modul: 'keuangan', aksi: 'hapus_pinjaman',
      suksesOtomatis: true, suksesPesan: 'Data dihapus', errorPesan: 'Gagal menghapus data',
    })
    konfirmPiId = null
    if (r) await muatPinjaman()
  }

  async function ubahStatusPi(id: number, status: 'aktif' | 'lunas' | 'macet') {
    const r = await withLoading(() => ubahPinjaman(id, { status }), {
      loadingKey: 'keuangan-status-pinjaman', loadingPesan: 'Mengubah status...',
      modul: 'keuangan', aksi: 'ubah_status_pinjaman',
      suksesOtomatis: true, suksesPesan: 'Status diubah', errorPesan: 'Gagal mengubah status',
    })
    if (r) await muatPinjaman()
  }

  return {
    // data getters
    get hutangList() { return hutangList },
    get piutangList() { return piutangList },
    get jurnalList() { return jurnalList },
    get kasBankList() { return kasBankList },
    get kasBankSaldo() { return kasBankSaldo },
    get piRows() { return piRows },
    get loading() { return loading },

    // derived getters
    get hutangFiltered() { return hutangFiltered },
    get piutangFiltered() { return piutangFiltered },
    get pagedHutang() { return pagedHutang },
    get pagedPiutang() { return pagedPiutang },
    get pagedJurnal() { return pagedJurnal },
    get totalHutangBelum() { return totalHutangBelum },
    get totalPiutangBelum() { return totalPiutangBelum },
    get totalSaldo() { return totalSaldo },
    get jurnalMasuk() { return jurnalMasuk },
    get jurnalKeluar() { return jurnalKeluar },

    // filter & pagination (bindable)
    get filterStatusHutang() { return filterStatusHutang },
    set filterStatusHutang(v: FilterStatus) { filterStatusHutang = v },
    get filterStatusPiutang() { return filterStatusPiutang },
    set filterStatusPiutang(v: FilterStatus) { filterStatusPiutang = v },
    get filterDari() { return filterDari },
    set filterDari(v: string) { filterDari = v },
    get filterSampai() { return filterSampai },
    set filterSampai(v: string) { filterSampai = v },
    get filterKasBankId() { return filterKasBankId },
    set filterKasBankId(v: number) { filterKasBankId = v },
    get piTipeFilter() { return piTipeFilter },
    set piTipeFilter(v: string) { piTipeFilter = v },
    get piStatusFilter() { return piStatusFilter },
    set piStatusFilter(v: string) { piStatusFilter = v },
    get pageHutang() { return pageHutang },
    set pageHutang(v: number) { pageHutang = v },
    get pageSizeHutang() { return pageSizeHutang },
    set pageSizeHutang(v: number) { pageSizeHutang = v },
    get pagePiutang() { return pagePiutang },
    set pagePiutang(v: number) { pagePiutang = v },
    get pageSizePiutang() { return pageSizePiutang },
    set pageSizePiutang(v: number) { pageSizePiutang = v },
    get pageJurnal() { return pageJurnal },
    set pageJurnal(v: number) { pageJurnal = v },
    get pageSizeJurnal() { return pageSizeJurnal },
    set pageSizeJurnal(v: number) { pageSizeJurnal = v },

    // modal: bayar hutang
    get modalBayarHutang() { return modalBayarHutang },
    set modalBayarHutang(v: boolean) { modalBayarHutang = v },
    get hutangDipilih() { return hutangDipilih },
    get formBayarHutang() { return formBayarHutang },
    set formBayarHutang(v: BayarForm) { formBayarHutang = v },
    get savingBayarHutang() { return savingBayarHutang },

    // modal: bayar piutang
    get modalBayarPiutang() { return modalBayarPiutang },
    set modalBayarPiutang(v: boolean) { modalBayarPiutang = v },
    get piutangDipilih() { return piutangDipilih },
    get formBayarPiutang() { return formBayarPiutang },
    set formBayarPiutang(v: BayarForm) { formBayarPiutang = v },
    get savingBayarPiutang() { return savingBayarPiutang },

    // modal: jurnal
    get modalJurnal() { return modalJurnal },
    set modalJurnal(v: boolean) { modalJurnal = v },
    get formJurnal() { return formJurnal },
    set formJurnal(v: JurnalForm) { formJurnal = v },
    get savingJurnal() { return savingJurnal },

    // modal: kas/bank
    get modalKasBank() { return modalKasBank },
    set modalKasBank(v: boolean) { modalKasBank = v },
    get editKasBank() { return editKasBank },
    get formKasBank() { return formKasBank },
    set formKasBank(v: KasBankForm) { formKasBank = v },
    get savingKasBank() { return savingKasBank },
    get konfirmKasBankBuka() { return konfirmKasBankBuka },
    set konfirmKasBankBuka(v: boolean) { konfirmKasBankBuka = v },

    // modal: pinjaman
    get piFormOpen() { return piFormOpen },
    set piFormOpen(v: boolean) { piFormOpen = v },
    get piCicilOpen() { return piCicilOpen },
    set piCicilOpen(v: boolean) { piCicilOpen = v },
    get piError() { return piError },
    get editPiId() { return editPiId },
    get cicilJumlah() { return cicilJumlah },
    set cicilJumlah(v: string) { cicilJumlah = v },
    get fPiTipe() { return fPiTipe },
    set fPiTipe(v: 'pinjaman' | 'investasi') { fPiTipe = v },
    get fPiNama() { return fPiNama },
    set fPiNama(v: string) { fPiNama = v },
    get fPiPokok() { return fPiPokok },
    set fPiPokok(v: string) { fPiPokok = v },
    get fPiBunga() { return fPiBunga },
    set fPiBunga(v: string) { fPiBunga = v },
    get fPiCicilan() { return fPiCicilan },
    set fPiCicilan(v: string) { fPiCicilan = v },
    get fPiMulai() { return fPiMulai },
    set fPiMulai(v: string) { fPiMulai = v },
    get fPiJatuh() { return fPiJatuh },
    set fPiJatuh(v: string) { fPiJatuh = v },
    get fPiCatatan() { return fPiCatatan },
    set fPiCatatan(v: string) { fPiCatatan = v },
    get konfirmPiBuka() { return konfirmPiBuka },
    set konfirmPiBuka(v: boolean) { konfirmPiBuka = v },

    // actions
    muatHutang,
    muatPiutang,
    muatJurnal,
    muatKasBank,
    muatKasBankSaldo,
    muatPinjaman,
    bukaBayarHutang,
    simpanBayarHutang,
    bukaBayarPiutang,
    simpanBayarPiutang,
    bukaModalJurnal,
    simpanJurnal: simpanJurnalFn,
    bukaTambahKasBank,
    bukaEditKasBank,
    simpanKasBank,
    nonaktifkanKasBank,
    doNonaktifkanKasBank,
    bukaPiForm,
    simpanPi,
    bukaCicilPi,
    cicilPi,
    hapusPi,
    doHapusPi,
    ubahStatusPi,
  }
}
