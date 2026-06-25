import { api } from '$lib/utils/api'
import type {
	ReturListItem,
	PenjualanDetail,
	SisaItem,
	BarangCari,
	ReturDetail,
	KasBank,
} from './retur.types.js'

export async function fetchReturList(dari: string, sampai: string): Promise<ReturListItem[]> {
	const res = await api.get<ReturListItem[]>(`/retur-penjualan?dari=${dari}&sampai=${sampai}`)
	if (!res.success) throw new Error(res.error)
	return res.data
}

export async function fetchKasBank(): Promise<KasBank[]> {
	const res = await api.get<KasBank[]>('/keuangan/kas-bank')
	if (!res.success) throw new Error(res.error)
	return res.data
}

export async function searchPenjualan(q: string): Promise<PenjualanDetail[]> {
	const res = await api.get<PenjualanDetail[]>(`/penjualan?q=${encodeURIComponent(q)}`)
	if (!res.success) throw new Error(res.error)
	return res.data as unknown as PenjualanDetail[]
}

export async function fetchPenjualanDetail(id: number | string): Promise<PenjualanDetail> {
	const res = await api.get<PenjualanDetail>(`/penjualan/${id}`)
	if (!res.success) throw new Error(res.error)
	return res.data
}

export async function fetchSisaRetur(penjualanId: number): Promise<SisaItem[]> {
	const res = await api.get<SisaItem[]>(`/retur-penjualan/sisa/${penjualanId}`)
	if (!res.success) return []
	return res.data
}

export async function fetchReturDetail(id: number): Promise<ReturDetail> {
	const res = await api.get<ReturDetail>(`/retur-penjualan/${id}`)
	if (!res.success) throw new Error(res.error)
	return res.data
}

export async function fetchBarangCari(q: string): Promise<BarangCari[]> {
	const res = await api.get<BarangCari[]>(`/barang?q=${encodeURIComponent(q)}`)
	if (!res.success) throw new Error(res.error)
	return res.data.slice(0, 8)
}

export async function postRetur(body: Record<string, unknown>): Promise<{ no_retur: string }> {
	const res = await api.post<{ no_retur: string }>('/retur-penjualan', body)
	if (!res.success) throw new Error(res.error)
	return res.data
}
