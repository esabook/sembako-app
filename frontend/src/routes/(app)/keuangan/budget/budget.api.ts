import { api } from '$lib/utils/api'
import type {
  DataPeriode,
  Realisasi,
  Proyeksi,
  RingkasanHistori,
  TargetPenjualan,
  BudgetOperasional,
  KategoriBudget,
} from './budget.types'

function unwrap<T>(res: { success: true; data: T } | { success: false; error: string }): T {
  if (!res.success) throw new Error(res.error)
  return res.data
}

export async function fetchDataPeriode(periode: string): Promise<DataPeriode> {
  return unwrap(await api.get<DataPeriode>(`/budget-target/${periode}`))
}

export async function fetchRealisasi(periode: string): Promise<Realisasi> {
  return unwrap(await api.get<Realisasi>(`/budget-target/${periode}/realisasi`))
}

export async function fetchProyeksi(periode: string): Promise<Proyeksi> {
  return unwrap(await api.get<Proyeksi>(`/budget-target/${periode}/proyeksi`))
}

export async function fetchHistori(): Promise<RingkasanHistori[]> {
  return unwrap(await api.get<RingkasanHistori[]>('/budget-target/histori/ringkasan'))
}

export async function simpanTarget(payload: {
  periode_bulan: string
  target_omzet: number
  target_transaksi: number
  target_margin_pct: number
  catatan?: string
}): Promise<TargetPenjualan> {
  return unwrap(await api.post<TargetPenjualan>('/budget-target/target', payload))
}

export async function simpanBudget(payload: {
  periode_bulan: string
  kategori: KategoriBudget
  nilai_budget: number
  catatan?: string
}): Promise<BudgetOperasional> {
  return unwrap(await api.post<BudgetOperasional>('/budget-target/budget', payload))
}

export async function salinDariPeriode(dari: string, ke: string): Promise<DataPeriode> {
  return unwrap(await api.post<DataPeriode>('/budget-target/salin', { dari, ke }))
}
