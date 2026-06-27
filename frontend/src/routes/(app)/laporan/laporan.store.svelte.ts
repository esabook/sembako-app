import { withLoading } from '$lib/utils/async'
import {
  fetchLabaRugi, fetchArusKas, fetchNeraca, fetchAging,
  fetchBudgetRealisasi, fetchPajakUmkm, fetchMarginProduk,
  fetchPerbandingan, fetchPersediaan, fetchTopPelanggan,
  fetchPembelianSupplier, fetchRekapPenggajian, fetchAnalitikJam,
  fetchCabangList,
} from './laporan.api'
import {
  defaultPeriode, bulanIniStr, periodeSebelumnya,
  downloadCsv,
  buildLabaRugiCsv, buildArusKasCsv, buildNeracaCsv, buildAgingCsv,
  buildBudgetRealisasiCsv, buildPajakUmkmCsv, buildMarginProdukCsv,
  buildPerbandinganCsv, buildPersediaanCsv, buildTopPelangganCsv,
  buildPembelianSupplierCsv, buildRekapPenggajianCsv, buildAnalitikJamCsv,
} from './laporan.logic'
import type {
  TabKey, LabaRugi, ArusKas, Neraca, AgingData, BudgetRealisasi,
  PajakUmkm, MarginProduk, Persediaan, TopPelanggan,
  PembelianSupplier, RekapPenggajian, AnalitikJam,
} from './laporan.types'

export function createLaporanStore() {
  // ── Data state ─────────────────────────────────────────────────────────────
  let labaRugi = $state<LabaRugi | null>(null)
  let arusKas = $state<ArusKas | null>(null)
  let neraca = $state<Neraca | null>(null)
  let aging = $state<AgingData | null>(null)
  let agingExpanded = $state<Record<string, boolean>>({})
  let budgetRealisasi = $state<BudgetRealisasi | null>(null)
  let pajakUmkm = $state<PajakUmkm | null>(null)
  let marginProduk = $state<MarginProduk | null>(null)
  let perbandingan = $state<{ p1: LabaRugi; p2: LabaRugi } | null>(null)
  let persediaan = $state<Persediaan | null>(null)
  let topPelanggan = $state<TopPelanggan | null>(null)
  let pembelianSupplier = $state<PembelianSupplier | null>(null)
  let rekapPenggajian = $state<RekapPenggajian | null>(null)
  let analitikJam = $state<AnalitikJam | null>(null)

  // ── Filter state ───────────────────────────────────────────────────────────
  let periode = $state(defaultPeriode())
  let neracaTanggal = $state(new Date().toLocaleDateString('sv-SE'))
  let periodeBR = $state(bulanIniStr())
  let tahunPajak = $state(String(new Date().getFullYear()))
  let periodeMargin = $state(defaultPeriode())
  let periodeP1 = $state(periodeSebelumnya())
  let periodeP2 = $state(defaultPeriode())
  let periodePelanggan = $state(defaultPeriode())
  let periodeSupplier = $state(defaultPeriode())
  let tahunPenggajian = $state(String(new Date().getFullYear()))
  let periodeJam = $state(defaultPeriode())
  let cabangList = $state<{ id: number; nama: string }[]>([])
  let selectedCabang = $state<number | ''>('')

  const cabangParam = $derived(selectedCabang ? `&cabang_id=${selectedCabang}` : '')

  // ── Promise state per tab (untuk {#await} skeleton) ───────────────────────
  let labaRugiPromise = $state<Promise<LabaRugi | null>>(Promise.resolve(null))
  let arusKasPromise = $state<Promise<ArusKas | null>>(Promise.resolve(null))
  let neracaPromise = $state<Promise<Neraca | null>>(Promise.resolve(null))
  let agingPromise = $state<Promise<AgingData | null>>(Promise.resolve(null))
  let budgetRealisasiPromise = $state<Promise<BudgetRealisasi | null>>(Promise.resolve(null))
  let pajakUmkmPromise = $state<Promise<PajakUmkm | null>>(Promise.resolve(null))
  let marginProdukPromise = $state<Promise<MarginProduk | null>>(Promise.resolve(null))
  let perbandinganPromise = $state<Promise<{ p1: LabaRugi; p2: LabaRugi } | null>>(Promise.resolve(null))
  let persediaanPromise = $state<Promise<Persediaan | null>>(Promise.resolve(null))
  let topPelangganPromise = $state<Promise<TopPelanggan | null>>(Promise.resolve(null))
  let pembelianSupplierPromise = $state<Promise<PembelianSupplier | null>>(Promise.resolve(null))
  let rekapPenggajianPromise = $state<Promise<RekapPenggajian | null>>(Promise.resolve(null))
  let analitikJamPromise = $state<Promise<AnalitikJam | null>>(Promise.resolve(null))

  // ── Load functions ─────────────────────────────────────────────────────────

  async function muatCabang() {
    cabangList = await fetchCabangList()
  }

  function muatLabaRugi() {
    labaRugiPromise = withLoading(
      () => fetchLabaRugi(periode.dari, periode.sampai, cabangParam),
      { loadingKey: 'laporan-laba-rugi', loadingPesan: 'Memuat laporan...', modul: 'laporan', aksi: 'laba-rugi', bisaRetry: true },
    ).then(h => { if (h) labaRugi = h; return h })
  }

  function muatArusKas() {
    arusKasPromise = withLoading(
      () => fetchArusKas(periode.dari, periode.sampai, cabangParam),
      { loadingKey: 'laporan-arus-kas', loadingPesan: 'Memuat laporan...', modul: 'laporan', aksi: 'arus-kas', bisaRetry: true },
    ).then(h => { if (h) arusKas = h; return h })
  }

  function muatNeraca() {
    neracaPromise = withLoading(
      () => fetchNeraca(neracaTanggal),
      { loadingKey: 'laporan-neraca', loadingPesan: 'Memuat laporan...', modul: 'laporan', aksi: 'neraca', bisaRetry: true },
    ).then(h => { if (h) neraca = h; return h })
  }

  function muatAging() {
    agingPromise = withLoading(
      () => fetchAging(),
      { loadingKey: 'laporan-aging', loadingPesan: 'Memuat laporan...', modul: 'laporan', aksi: 'aging', bisaRetry: true },
    ).then(h => { if (h) aging = h; return h })
  }

  function muatBudgetRealisasi() {
    budgetRealisasiPromise = withLoading(
      () => fetchBudgetRealisasi(periodeBR),
      { loadingKey: 'laporan-budget', loadingPesan: 'Memuat laporan...', modul: 'laporan', aksi: 'budget-realisasi', bisaRetry: true },
    ).then(h => { if (h) budgetRealisasi = h; return h })
  }

  function muatPajakUmkm() {
    pajakUmkmPromise = withLoading(
      () => fetchPajakUmkm(tahunPajak),
      { loadingKey: 'laporan-pajak', loadingPesan: 'Memuat laporan...', modul: 'laporan', aksi: 'pajak-umkm', bisaRetry: true },
    ).then(h => { if (h) pajakUmkm = h; return h })
  }

  function muatMarginProduk() {
    marginProdukPromise = withLoading(
      () => fetchMarginProduk(periodeMargin.dari, periodeMargin.sampai, cabangParam),
      { loadingKey: 'laporan-margin', loadingPesan: 'Memuat laporan...', modul: 'laporan', aksi: 'margin-produk', bisaRetry: true },
    ).then(h => { if (h) marginProduk = h; return h })
  }

  function muatPerbandingan() {
    perbandinganPromise = withLoading(
      () => fetchPerbandingan(periodeP1.dari, periodeP1.sampai, periodeP2.dari, periodeP2.sampai),
      { loadingKey: 'laporan-perbandingan', loadingPesan: 'Memuat laporan...', modul: 'laporan', aksi: 'perbandingan', bisaRetry: true },
    ).then(h => { if (h) perbandingan = h; return h })
  }

  function muatPersediaan() {
    persediaanPromise = withLoading(
      () => fetchPersediaan(),
      { loadingKey: 'laporan-persediaan', loadingPesan: 'Memuat laporan...', modul: 'laporan', aksi: 'persediaan', bisaRetry: true },
    ).then(h => { if (h) persediaan = h; return h })
  }

  function muatTopPelanggan() {
    topPelangganPromise = withLoading(
      () => fetchTopPelanggan(periodePelanggan.dari, periodePelanggan.sampai),
      { loadingKey: 'laporan-top-pelanggan', loadingPesan: 'Memuat laporan...', modul: 'laporan', aksi: 'top-pelanggan', bisaRetry: true },
    ).then(h => { if (h) topPelanggan = h; return h })
  }

  function muatPembelianSupplier() {
    pembelianSupplierPromise = withLoading(
      () => fetchPembelianSupplier(periodeSupplier.dari, periodeSupplier.sampai),
      { loadingKey: 'laporan-pembelian', loadingPesan: 'Memuat laporan...', modul: 'laporan', aksi: 'pembelian-supplier', bisaRetry: true },
    ).then(h => { if (h) pembelianSupplier = h; return h })
  }

  function muatRekapPenggajian() {
    rekapPenggajianPromise = withLoading(
      () => fetchRekapPenggajian(tahunPenggajian),
      { loadingKey: 'laporan-penggajian', loadingPesan: 'Memuat laporan...', modul: 'laporan', aksi: 'rekap-penggajian', bisaRetry: true },
    ).then(h => { if (h) rekapPenggajian = h; return h })
  }

  function muatAnalitikJam() {
    analitikJamPromise = withLoading(
      () => fetchAnalitikJam(periodeJam.dari, periodeJam.sampai, cabangParam),
      { loadingKey: 'laporan-analitik-jam', loadingPesan: 'Memuat laporan...', modul: 'laporan', aksi: 'analitik-jam', bisaRetry: true },
    ).then(h => { if (h) analitikJam = h; return h })
  }

  function muat(tab: TabKey) {
    if (tab === 'laba-rugi') muatLabaRugi()
    else if (tab === 'arus-kas') muatArusKas()
    else if (tab === 'neraca') muatNeraca()
    else if (tab === 'aging') muatAging()
    else if (tab === 'budget-realisasi') muatBudgetRealisasi()
    else if (tab === 'pajak-umkm') muatPajakUmkm()
    else if (tab === 'margin-produk') muatMarginProduk()
    else if (tab === 'perbandingan') muatPerbandingan()
    else if (tab === 'persediaan') muatPersediaan()
    else if (tab === 'top-pelanggan') muatTopPelanggan()
    else if (tab === 'pembelian-supplier') muatPembelianSupplier()
    else if (tab === 'rekap-penggajian') muatRekapPenggajian()
    else if (tab === 'analitik-jam') muatAnalitikJam()
  }

  // ── Export CSV ─────────────────────────────────────────────────────────────

  function exportCsv(tab: TabKey) {
    if (tab === 'laba-rugi' && labaRugi)
      downloadCsv(buildLabaRugiCsv(labaRugi), `laba-rugi-${labaRugi.periode.dari}-${labaRugi.periode.sampai}.csv`)
    else if (tab === 'arus-kas' && arusKas)
      downloadCsv(buildArusKasCsv(arusKas), `arus-kas-${arusKas.periode.dari}-${arusKas.periode.sampai}.csv`)
    else if (tab === 'neraca' && neraca)
      downloadCsv(buildNeracaCsv(neraca), `neraca-${neraca.per_tanggal}.csv`)
    else if (tab === 'aging' && aging)
      downloadCsv(buildAgingCsv(aging), `aging-${aging.per_tanggal}.csv`)
    else if (tab === 'budget-realisasi' && budgetRealisasi)
      downloadCsv(buildBudgetRealisasiCsv(budgetRealisasi), `budget-realisasi-${budgetRealisasi.periode}.csv`)
    else if (tab === 'pajak-umkm' && pajakUmkm)
      downloadCsv(buildPajakUmkmCsv(pajakUmkm), `pajak-umkm-${pajakUmkm.tahun}.csv`)
    else if (tab === 'margin-produk' && marginProduk)
      downloadCsv(buildMarginProdukCsv(marginProduk), `margin-produk-${marginProduk.periode.dari}-${marginProduk.periode.sampai}.csv`)
    else if (tab === 'perbandingan' && perbandingan)
      downloadCsv(buildPerbandinganCsv(perbandingan.p1, perbandingan.p2), `perbandingan-${perbandingan.p1.periode.dari}-vs-${perbandingan.p2.periode.dari}.csv`)
    else if (tab === 'persediaan' && persediaan)
      downloadCsv(buildPersediaanCsv(persediaan), `persediaan-${persediaan.per_tanggal}.csv`)
    else if (tab === 'top-pelanggan' && topPelanggan)
      downloadCsv(buildTopPelangganCsv(topPelanggan), `top-pelanggan-${topPelanggan.periode.dari}-${topPelanggan.periode.sampai}.csv`)
    else if (tab === 'pembelian-supplier' && pembelianSupplier)
      downloadCsv(buildPembelianSupplierCsv(pembelianSupplier), `pembelian-supplier-${pembelianSupplier.periode.dari}-${pembelianSupplier.periode.sampai}.csv`)
    else if (tab === 'rekap-penggajian' && rekapPenggajian)
      downloadCsv(buildRekapPenggajianCsv(rekapPenggajian), `rekap-penggajian-${rekapPenggajian.tahun}.csv`)
    else if (tab === 'analitik-jam' && analitikJam)
      downloadCsv(buildAnalitikJamCsv(analitikJam), `analitik-jam-${analitikJam.dari}-${analitikJam.sampai}.csv`)
  }

  return {
    // data
    get labaRugi() { return labaRugi },
    get arusKas() { return arusKas },
    get neraca() { return neraca },
    get aging() { return aging },
    get agingExpanded() { return agingExpanded },
    get budgetRealisasi() { return budgetRealisasi },
    get pajakUmkm() { return pajakUmkm },
    get marginProduk() { return marginProduk },
    get perbandingan() { return perbandingan },
    get persediaan() { return persediaan },
    get topPelanggan() { return topPelanggan },
    get pembelianSupplier() { return pembelianSupplier },
    get rekapPenggajian() { return rekapPenggajian },
    get analitikJam() { return analitikJam },
    // filter
    get periode() { return periode },
    set periode(v) { periode = v },
    get neracaTanggal() { return neracaTanggal },
    set neracaTanggal(v) { neracaTanggal = v },
    get periodeBR() { return periodeBR },
    set periodeBR(v) { periodeBR = v },
    get tahunPajak() { return tahunPajak },
    set tahunPajak(v) { tahunPajak = v },
    get periodeMargin() { return periodeMargin },
    set periodeMargin(v) { periodeMargin = v },
    get periodeP1() { return periodeP1 },
    set periodeP1(v) { periodeP1 = v },
    get periodeP2() { return periodeP2 },
    set periodeP2(v) { periodeP2 = v },
    get periodePelanggan() { return periodePelanggan },
    set periodePelanggan(v) { periodePelanggan = v },
    get periodeSupplier() { return periodeSupplier },
    set periodeSupplier(v) { periodeSupplier = v },
    get tahunPenggajian() { return tahunPenggajian },
    set tahunPenggajian(v) { tahunPenggajian = v },
    get periodeJam() { return periodeJam },
    set periodeJam(v) { periodeJam = v },
    get cabangList() { return cabangList },
    get selectedCabang() { return selectedCabang },
    set selectedCabang(v) { selectedCabang = v },
    // promises (untuk {#await} skeleton)
    get labaRugiPromise() { return labaRugiPromise },
    get arusKasPromise() { return arusKasPromise },
    get neracaPromise() { return neracaPromise },
    get agingPromise() { return agingPromise },
    get budgetRealisasiPromise() { return budgetRealisasiPromise },
    get pajakUmkmPromise() { return pajakUmkmPromise },
    get marginProdukPromise() { return marginProdukPromise },
    get perbandinganPromise() { return perbandinganPromise },
    get persediaanPromise() { return persediaanPromise },
    get topPelangganPromise() { return topPelangganPromise },
    get pembelianSupplierPromise() { return pembelianSupplierPromise },
    get rekapPenggajianPromise() { return rekapPenggajianPromise },
    get analitikJamPromise() { return analitikJamPromise },
    // actions
    toggleAgingExpanded(key: string) { agingExpanded[key] = !agingExpanded[key] },
    muatCabang,
    muatLabaRugi,
    muatArusKas,
    muatNeraca,
    muatAging,
    muatBudgetRealisasi,
    muatPajakUmkm,
    muatMarginProduk,
    muatPerbandingan,
    muatPersediaan,
    muatTopPelanggan,
    muatPembelianSupplier,
    muatRekapPenggajian,
    muatAnalitikJam,
    muat,
    exportCsv,
    // helpers
    defaultPeriode,
    bulanIniStr,
    periodeSebelumnya,
  }
}
