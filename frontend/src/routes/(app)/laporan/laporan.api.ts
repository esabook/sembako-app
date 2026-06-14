import { api } from '$lib/utils/api'
import type {
  LabaRugi, ArusKas, Neraca, AgingData, BudgetRealisasi,
  PajakUmkm, MarginProduk, Persediaan, TopPelanggan,
  PembelianSupplier, RekapPenggajian, AnalitikJam,
} from './laporan.types'

function unwrap<T>(res: { success: true; data: T } | { success: false; error: string }): T {
  if (!res.success) throw new Error(res.error)
  return res.data
}

export async function fetchLabaRugi(dari: string, sampai: string, cabangParam: string): Promise<LabaRugi> {
  return unwrap(await api.get<LabaRugi>(`/laporan/laba-rugi?dari=${dari}&sampai=${sampai}${cabangParam}`))
}

export async function fetchArusKas(dari: string, sampai: string, cabangParam: string): Promise<ArusKas> {
  return unwrap(await api.get<ArusKas>(`/laporan/arus-kas?dari=${dari}&sampai=${sampai}${cabangParam}`))
}

export async function fetchNeraca(perTanggal: string): Promise<Neraca> {
  return unwrap(await api.get<Neraca>(`/laporan/neraca?per_tanggal=${perTanggal}`))
}

export async function fetchAging(): Promise<AgingData> {
  return unwrap(await api.get<AgingData>('/laporan/aging'))
}

export async function fetchBudgetRealisasi(periode: string): Promise<BudgetRealisasi> {
  const [resData, resReal] = await Promise.all([
    api.get<{ target: BudgetRealisasi['target']; budgets: BudgetRealisasi['budgets'] }>(`/budget-target/${periode}`),
    api.get<BudgetRealisasi['realisasi']>(`/budget-target/${periode}/realisasi`),
  ])
  const data = unwrap(resData)
  const realisasi = unwrap(resReal)
  return { periode, target: data.target, budgets: data.budgets, realisasi }
}

export async function fetchPajakUmkm(tahun: string): Promise<PajakUmkm> {
  return unwrap(await api.get<PajakUmkm>(`/laporan/pajak-umkm?tahun=${tahun}`))
}

export async function fetchMarginProduk(dari: string, sampai: string, cabangParam: string): Promise<MarginProduk> {
  return unwrap(await api.get<MarginProduk>(`/laporan/margin-produk?dari=${dari}&sampai=${sampai}${cabangParam}`))
}

export async function fetchPerbandingan(
  p1Dari: string, p1Sampai: string,
  p2Dari: string, p2Sampai: string,
): Promise<{ p1: LabaRugi; p2: LabaRugi }> {
  const [res1, res2] = await Promise.all([
    api.get<LabaRugi>(`/laporan/laba-rugi?dari=${p1Dari}&sampai=${p1Sampai}`),
    api.get<LabaRugi>(`/laporan/laba-rugi?dari=${p2Dari}&sampai=${p2Sampai}`),
  ])
  return { p1: unwrap(res1), p2: unwrap(res2) }
}

export async function fetchPersediaan(): Promise<Persediaan> {
  return unwrap(await api.get<Persediaan>('/laporan/persediaan'))
}

export async function fetchTopPelanggan(dari: string, sampai: string): Promise<TopPelanggan> {
  return unwrap(await api.get<TopPelanggan>(`/laporan/top-pelanggan?dari=${dari}&sampai=${sampai}`))
}

export async function fetchPembelianSupplier(dari: string, sampai: string): Promise<PembelianSupplier> {
  return unwrap(await api.get<PembelianSupplier>(`/laporan/pembelian-supplier?dari=${dari}&sampai=${sampai}`))
}

export async function fetchRekapPenggajian(tahun: string): Promise<RekapPenggajian> {
  return unwrap(await api.get<RekapPenggajian>(`/laporan/rekap-penggajian?tahun=${tahun}`))
}

export async function fetchAnalitikJam(dari: string, sampai: string, cabangParam: string): Promise<AnalitikJam> {
  return unwrap(await api.get<AnalitikJam>(`/laporan/analitik-jam?dari=${dari}&sampai=${sampai}${cabangParam}`))
}

export async function fetchCabangList(): Promise<{ id: number; nama: string }[]> {
  const res = await api.get<{ id: number; nama: string }[]>('/toko/cabang')
  if (!res.success) return []
  return res.data.length > 1 ? res.data : []
}
