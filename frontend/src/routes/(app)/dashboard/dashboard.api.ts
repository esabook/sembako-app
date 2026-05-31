import { api } from '$lib/utils/api'
import type { DashboardData, StokPrediktif } from './dashboard.types'

export async function fetchDashboard(): Promise<DashboardData> {
	const res = await api.get<DashboardData>('/dashboard')
	if (!res.success) throw new Error('Gagal memuat dashboard')
	return res.data
}

export async function fetchStokPrediktif(): Promise<StokPrediktif[]> {
	const res = await api.get<StokPrediktif[]>('/stok/alert-prediktif?hari=7')
	if (!res.success) throw new Error('Gagal memuat prediksi stok')
	return res.data
}
