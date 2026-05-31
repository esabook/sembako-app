import { withLoading } from '$lib/utils/async'
import { fetchDashboard, fetchStokPrediktif } from './dashboard.api'
import type { DashboardData, StokPrediktif } from './dashboard.types'

export function createDashboardStore() {
	let data          = $state<DashboardData | null>(null)
	let stokPrediktif = $state<StokPrediktif[]>([])
	let loading       = $state(true)

	async function muat() {
		loading = true
		const hasil = await withLoading(
			async () => {
				const [main, pred] = await Promise.all([
					fetchDashboard(),
					fetchStokPrediktif().catch((): StokPrediktif[] => []),
				])
				return { main, pred }
			},
			{
				loadingKey:  'dashboard-muat',
				modul:       'dashboard',
				aksi:        'muat',
				errorPesan:  'Gagal memuat dashboard',
				bisaRetry:   true,
			}
		)
		if (hasil) {
			data          = hasil.main
			stokPrediktif = hasil.pred
		}
		loading = false
	}

	return {
		get data()          { return data },
		get stokPrediktif() { return stokPrediktif },
		get loading()       { return loading },
		muat,
	}
}
