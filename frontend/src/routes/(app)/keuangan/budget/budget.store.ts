import {
  fetchDataPeriode,
  fetchRealisasi,
  fetchProyeksi,
  fetchHistori,
  simpanTarget,
  simpanBudget,
  salinDariPeriode,
} from './budget.api'
import type {
  DataPeriode,
  Realisasi,
  Proyeksi,
  RingkasanHistori,
  KategoriBudget,
} from './budget.types'
import { withLoading } from '$lib/utils/async'
import { toast } from '$lib/stores/ui.store'
import { bulanIni } from './budget.logic'

export function createBudgetStore() {
  let periode = $state(bulanIni())
  let data = $state<DataPeriode | null>(null)
  let realisasi = $state<Realisasi | null>(null)
  let proyeksi = $state<Proyeksi | null>(null)
  let histori = $state<RingkasanHistori[]>([])

  // Edit state untuk form inline
  let editTarget = $state(false)
  let editBudgetKategori = $state<KategoriBudget | null>(null)

  // Draft form target
  let draftOmzet = $state(0)
  let draftTransaksi = $state(0)
  let draftMargin = $state(0)
  let draftCatatan = $state('')

  // Draft form budget (satu kategori sekaligus)
  let draftBudget = $state(0)
  let draftBudgetCatatan = $state('')

  async function muatPeriode(p: string) {
    periode = p
    data = null
    realisasi = null
    proyeksi = null

    const [d, r, pr] = await Promise.all([
      withLoading(() => fetchDataPeriode(p), {
        loadingKey: 'budget-data',
        loadingPesan: 'Memuat data budget...',
        modul: 'budget',
        aksi: 'muat_data',
        errorPesan: 'Gagal memuat data budget',
      }),
      withLoading(() => fetchRealisasi(p), {
        loadingKey: 'budget-realisasi',
        loadingPesan: 'Memuat realisasi...',
        modul: 'budget',
        aksi: 'muat_realisasi',
        errorPesan: 'Gagal memuat data realisasi',
      }),
      withLoading(() => fetchProyeksi(p), {
        loadingKey: 'budget-proyeksi',
        loadingPesan: 'Memuat proyeksi...',
        modul: 'budget',
        aksi: 'muat_proyeksi',
        errorPesan: 'Gagal memuat proyeksi',
      }),
    ])

    if (d) data = d
    if (r) realisasi = r
    if (pr) proyeksi = pr
  }

  async function muatHistori() {
    const hasil = await withLoading(() => fetchHistori(), {
      loadingKey: 'budget-histori',
      loadingPesan: 'Memuat histori...',
      modul: 'budget',
      aksi: 'muat_histori',
      errorPesan: 'Gagal memuat histori',
    })
    if (hasil) histori = hasil
  }

  function bukaEditTarget() {
    draftOmzet = data?.target?.target_omzet ?? 0
    draftTransaksi = data?.target?.target_transaksi ?? 0
    draftMargin = data?.target?.target_margin_pct ?? 0
    draftCatatan = data?.target?.catatan ?? ''
    editTarget = true
  }

  function tutupEditTarget() {
    editTarget = false
  }

  async function simpanTargetFn() {
    const hasil = await withLoading(
      () => simpanTarget({
        periode_bulan: periode,
        target_omzet: draftOmzet,
        target_transaksi: draftTransaksi,
        target_margin_pct: draftMargin,
        catatan: draftCatatan || undefined,
      }),
      {
        loadingKey: 'budget-simpan-target',
        loadingPesan: 'Menyimpan target...',
        modul: 'budget',
        aksi: 'simpan_target',
        suksesOtomatis: true,
        suksesPesan: 'Target berhasil disimpan',
        errorPesan: 'Gagal menyimpan target',
      },
    )
    if (hasil) {
      data = data ? { ...data, target: hasil } : { target: hasil, budgets: [] }
      editTarget = false
    }
  }

  function bukaEditBudget(kategori: KategoriBudget) {
    const existing = data?.budgets.find(b => b.kategori === kategori)
    draftBudget = existing?.nilai_budget ?? 0
    draftBudgetCatatan = existing?.catatan ?? ''
    editBudgetKategori = kategori
  }

  function tutupEditBudget() {
    editBudgetKategori = null
  }

  async function simpanBudgetFn() {
    if (!editBudgetKategori) return
    const kategori = editBudgetKategori
    const hasil = await withLoading(
      () => simpanBudget({
        periode_bulan: periode,
        kategori,
        nilai_budget: draftBudget,
        catatan: draftBudgetCatatan || undefined,
      }),
      {
        loadingKey: 'budget-simpan-budget',
        loadingPesan: 'Menyimpan budget...',
        modul: 'budget',
        aksi: 'simpan_budget',
        suksesOtomatis: true,
        suksesPesan: 'Budget berhasil disimpan',
        errorPesan: 'Gagal menyimpan budget',
      },
    )
    if (hasil && data) {
      const idx = data.budgets.findIndex(b => b.kategori === kategori)
      if (idx >= 0) {
        data = { ...data, budgets: data.budgets.map((b, i) => i === idx ? hasil : b) }
      } else {
        data = { ...data, budgets: [...data.budgets, hasil] }
      }
      editBudgetKategori = null
    }
  }

  async function salinBulan(dari: string) {
    const hasil = await withLoading(
      () => salinDariPeriode(dari, periode),
      {
        loadingKey: 'budget-salin',
        loadingPesan: `Menyalin dari ${dari}...`,
        modul: 'budget',
        aksi: 'salin_bulan',
        suksesOtomatis: true,
        suksesPesan: 'Data berhasil disalin',
        errorPesan: 'Gagal menyalin data',
      },
    )
    if (hasil) {
      data = hasil
      toast.info('Sesuaikan angkanya sebelum menyimpan perubahan')
    }
  }

  return {
    get periode() { return periode },
    get data() { return data },
    get realisasi() { return realisasi },
    get proyeksi() { return proyeksi },
    get histori() { return histori },
    get editTarget() { return editTarget },
    get editBudgetKategori() { return editBudgetKategori },
    get draftOmzet() { return draftOmzet },
    set draftOmzet(v: number) { draftOmzet = v },
    get draftTransaksi() { return draftTransaksi },
    set draftTransaksi(v: number) { draftTransaksi = v },
    get draftMargin() { return draftMargin },
    set draftMargin(v: number) { draftMargin = v },
    get draftCatatan() { return draftCatatan },
    set draftCatatan(v: string) { draftCatatan = v },
    get draftBudget() { return draftBudget },
    set draftBudget(v: number) { draftBudget = v },
    get draftBudgetCatatan() { return draftBudgetCatatan },
    set draftBudgetCatatan(v: string) { draftBudgetCatatan = v },
    muatPeriode,
    muatHistori,
    bukaEditTarget,
    tutupEditTarget,
    simpanTarget: simpanTargetFn,
    bukaEditBudget,
    tutupEditBudget,
    simpanBudget: simpanBudgetFn,
    salinBulan,
  }
}
