import type { AsetRow, TagihanRow } from './aset.types.js'
import { fetchAset, createAset, updateAset, deleteAset, fetchUtilitas, createUtilitas, updateUtilitas, deleteUtilitas } from './aset.api.js'
import { now } from '@internationalized/date'

export function createAsetStore() {
  // ── Tab: Inventaris Aset ──────────────────────────────────────────────────
  let asetRows = $state<AsetRow[]>([])
  let asetLoading = $state(false)
  let asetKondisiFilter = $state('')
  let asetKategoriFilter = $state('')
  let asetFormOpen = $state(false)
  let asetError = $state('')
  let editAsetId = $state<number | null>(null)
  let fAsetNama = $state('')
  let fAsetKategori = $state('Lainnya')
  let fAsetNilaiBeli = $state('')
  let fAsetNilaiSekarang = $state('')
  let fAsetTanggal = $state('')
  let fAsetKondisi = $state<AsetRow['kondisi']>('baik')
  let fAsetLokasi = $state('')
  let fAsetCatatan = $state('')
  let konfirmAsetId = $state<number | null>(null)
  let konfirmAsetNama = $state('')
  let konfirmAsetBuka = $state(false)

  async function muatAset() {
    asetLoading = true
    const r = await fetchAset(asetKondisiFilter, asetKategoriFilter)
    if (r.success) asetRows = r.data
    asetLoading = false
  }

  function bukaFormAset(row?: AsetRow) {
    editAsetId = row?.id ?? null
    fAsetNama = row?.nama ?? ''
    fAsetKategori = row?.kategori ?? 'Lainnya'
    fAsetNilaiBeli = row ? String(row.nilai_beli) : ''
    fAsetNilaiSekarang = row ? String(row.nilai_sekarang) : ''
    fAsetTanggal = row?.tanggal_beli ?? ''
    fAsetKondisi = row?.kondisi ?? 'baik'
    fAsetLokasi = row?.lokasi ?? ''
    fAsetCatatan = row?.catatan ?? ''
    asetError = ''
    asetFormOpen = true
  }

  async function simpanAset() {
    asetError = ''
    if (!fAsetNama.trim()) { asetError = 'Nama wajib'; return }
    const body = {
      nama: fAsetNama.trim(), kategori: fAsetKategori,
      nilai_beli: Number(fAsetNilaiBeli) || 0,
      nilai_sekarang: Number(fAsetNilaiSekarang) || Number(fAsetNilaiBeli) || 0,
      tanggal_beli: fAsetTanggal || undefined,
      kondisi: fAsetKondisi,
      lokasi: fAsetLokasi || undefined,
      catatan: fAsetCatatan || undefined,
    }
    const r = editAsetId ? await updateAset(editAsetId, body) : await createAset(body)
    if (!r.success) { asetError = (r as any).error; return }
    asetFormOpen = false
    muatAset()
  }

  function hapusAset(id: number, nama: string) {
    konfirmAsetId = id
    konfirmAsetNama = nama
    konfirmAsetBuka = true
  }

  async function doHapusAset() {
    if (!konfirmAsetId) return
    await deleteAset(konfirmAsetId)
    konfirmAsetId = null
    konfirmAsetNama = ''
    muatAset()
  }

  // ── Tab: Tagihan Utilitas ─────────────────────────────────────────────────
  let utRows = $state<TagihanRow[]>([])
  let utLoading = $state(false)
  let utJenisFilter = $state('')
  let utBulanFilter = $state(new Date().toISOString().slice(0, 7))
  let utFormOpen = $state(false)
  let utError = $state('')
  let editUtId = $state<number | null>(null)
  let fUtJenis = $state<TagihanRow['jenis']>('listrik')
  let fUtBulan = $state('')
  let fUtJumlah = $state('')
  let fUtTanggalBayar = $state('')
  let fUtMeterAwal = $state('')
  let fUtMeterAkhir = $state('')
  let fUtCatatan = $state('')
  let konfirmUtId = $state<number | null>(null)
  let konfirmUtBuka = $state(false)

  const totalUt = $derived(utRows.reduce((s, r) => s + r.jumlah, 0))

  async function muatUtilitas() {
    utLoading = true
    const r = await fetchUtilitas(utJenisFilter, utBulanFilter)
    if (r.success) utRows = r.data
    utLoading = false
  }

  function bukaFormUt(row?: TagihanRow) {
    editUtId = row?.id ?? null
    fUtJenis = row?.jenis ?? 'listrik'
    fUtBulan = row?.periode_bulan ?? utBulanFilter
    fUtJumlah = row ? String(row.jumlah) : ''
    fUtTanggalBayar = row?.tanggal_bayar ?? ''
    fUtMeterAwal = row?.meter_awal != null ? String(row.meter_awal) : ''
    fUtMeterAkhir = row?.meter_akhir != null ? String(row.meter_akhir) : ''
    fUtCatatan = row?.catatan ?? ''
    utError = ''
    utFormOpen = true
  }

  async function simpanUt() {
    utError = ''
    if (!fUtBulan) { utError = 'Periode bulan wajib'; return }
    if (!fUtJumlah || Number(fUtJumlah) <= 0) { utError = 'Jumlah harus > 0'; return }
    const body = {
      jenis: fUtJenis, periode_bulan: fUtBulan, jumlah: Number(fUtJumlah),
      tanggal_bayar: fUtTanggalBayar || undefined,
      meter_awal: fUtMeterAwal ? Number(fUtMeterAwal) : undefined,
      meter_akhir: fUtMeterAkhir ? Number(fUtMeterAkhir) : undefined,
      catatan: fUtCatatan || undefined,
    }
    const r = editUtId ? await updateUtilitas(editUtId, body) : await createUtilitas(body)
    if (!r.success) { utError = (r as any).error; return }
    utFormOpen = false
    muatUtilitas()
  }

  function hapusUt(id: number) {
    konfirmUtId = id
    konfirmUtBuka = true
  }

  async function doHapusUt() {
    if (!konfirmUtId) return
    await deleteUtilitas(konfirmUtId)
    konfirmUtId = null
    muatUtilitas()
  }

  return {
    // Aset state
    get asetRows() { return asetRows },
    get asetLoading() { return asetLoading },
    get asetKondisiFilter() { return asetKondisiFilter },
    set asetKondisiFilter(v) { asetKondisiFilter = v },
    get asetKategoriFilter() { return asetKategoriFilter },
    set asetKategoriFilter(v) { asetKategoriFilter = v },
    get asetFormOpen() { return asetFormOpen },
    set asetFormOpen(v) { asetFormOpen = v },
    get asetError() { return asetError },
    get editAsetId() { return editAsetId },
    get fAsetNama() { return fAsetNama },
    set fAsetNama(v) { fAsetNama = v },
    get fAsetKategori() { return fAsetKategori },
    set fAsetKategori(v) { fAsetKategori = v },
    get fAsetNilaiBeli() { return fAsetNilaiBeli },
    set fAsetNilaiBeli(v) { fAsetNilaiBeli = v },
    get fAsetNilaiSekarang() { return fAsetNilaiSekarang },
    set fAsetNilaiSekarang(v) { fAsetNilaiSekarang = v },
    get fAsetTanggal() { return fAsetTanggal },
    set fAsetTanggal(v) { fAsetTanggal = v },
    get fAsetKondisi() { return fAsetKondisi },
    set fAsetKondisi(v) { fAsetKondisi = v },
    get fAsetLokasi() { return fAsetLokasi },
    set fAsetLokasi(v) { fAsetLokasi = v },
    get fAsetCatatan() { return fAsetCatatan },
    set fAsetCatatan(v) { fAsetCatatan = v },
    get konfirmAsetId() { return konfirmAsetId },
    get konfirmAsetNama() { return konfirmAsetNama },
    get konfirmAsetBuka() { return konfirmAsetBuka },
    set konfirmAsetBuka(v) { konfirmAsetBuka = v },
    muatAset, bukaFormAset, simpanAset, hapusAset, doHapusAset,

    // Utilitas state
    get utRows() { return utRows },
    get utLoading() { return utLoading },
    get utJenisFilter() { return utJenisFilter },
    set utJenisFilter(v) { utJenisFilter = v },
    get utBulanFilter() { return utBulanFilter },
    set utBulanFilter(v) { utBulanFilter = v },
    get utFormOpen() { return utFormOpen },
    set utFormOpen(v) { utFormOpen = v },
    get utError() { return utError },
    get editUtId() { return editUtId },
    get fUtJenis() { return fUtJenis },
    set fUtJenis(v) { fUtJenis = v },
    get fUtBulan() { return fUtBulan },
    set fUtBulan(v) { fUtBulan = v },
    get fUtJumlah() { return fUtJumlah },
    set fUtJumlah(v) { fUtJumlah = v },
    get fUtTanggalBayar() { return fUtTanggalBayar },
    set fUtTanggalBayar(v) { fUtTanggalBayar = v },
    get fUtMeterAwal() { return fUtMeterAwal },
    set fUtMeterAwal(v) { fUtMeterAwal = v },
    get fUtMeterAkhir() { return fUtMeterAkhir },
    set fUtMeterAkhir(v) { fUtMeterAkhir = v },
    get fUtCatatan() { return fUtCatatan },
    set fUtCatatan(v) { fUtCatatan = v },
    get konfirmUtId() { return konfirmUtId },
    get konfirmUtBuka() { return konfirmUtBuka },
    set konfirmUtBuka(v) { konfirmUtBuka = v },
    get totalUt() { return totalUt },
    muatUtilitas, bukaFormUt, simpanUt, hapusUt, doHapusUt,
  }
}

export type AsetStore = ReturnType<typeof createAsetStore>
