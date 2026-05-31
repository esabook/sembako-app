import type { Trend } from './dashboard.types'

export type ChartDay = {
	tanggal: string
	total:   number
	label:   string
	isToday: boolean
}

export type SummaryRow = {
	tanggal:    string
	label:      string
	total:      number
	jumlah_trx: number
	isToday:    boolean
}

export type SummaryStats = {
	total:      number
	trx:        number
	avgHarian:  number
	avgPerTrx:  number
	best:       SummaryRow | null
}

export function rp(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`
	if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}rb`
	return String(Math.round(n))
}

export function rpFull(n: number): string {
	return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export function delta(today: number, yesterday: number): string {
	if (yesterday === 0) return today > 0 ? '+100%' : '0%'
	const pct = ((today - yesterday) / yesterday) * 100
	return (pct >= 0 ? '+' : '') + pct.toFixed(0) + '%'
}

export function deltaColor(today: number, yesterday: number): string {
	if (today > yesterday) return 'var(--accent)'
	if (today < yesterday) return 'var(--danger)'
	return 'var(--text-dim)'
}

export function buildChartDays(penjualan30: Trend[], today: string, n: 7 | 30 = 30): ChartDay[] {
	const map = new Map(penjualan30.map(r => [r.tanggal, r]))
	return Array.from({ length: n }, (_, i) => {
		const d   = new Date(Date.now() - (n - 1 - i) * 86400000)
		const tgl = d.toISOString().slice(0, 10)
		const mid = Math.floor(n / 2)
		const label = i === 0 || i === mid || i === n - 1 || tgl === today
			? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
			: String(d.getDate())
		return { tanggal: tgl, total: map.get(tgl)?.total ?? 0, label, isToday: tgl === today }
	})
}

export function buildSummaryRows(penjualan30: Trend[], today: string, n: 7 | 30): SummaryRow[] {
	const map = new Map(penjualan30.map(r => [r.tanggal, r]))
	return Array.from({ length: n }, (_, i) => {
		const d   = new Date(Date.now() - i * 86400000)
		const tgl = d.toISOString().slice(0, 10)
		const row = map.get(tgl)
		return {
			tanggal:    tgl,
			label:      d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }),
			total:      row?.total      ?? 0,
			jumlah_trx: row?.jumlah_trx ?? 0,
			isToday:    tgl === today,
		}
	})
}

export function buildSummaryStats(rows: SummaryRow[]): SummaryStats {
	const total  = rows.reduce((s, r) => s + r.total, 0)
	const trx    = rows.reduce((s, r) => s + r.jumlah_trx, 0)
	const active = rows.filter(r => r.total > 0).length
	const best   = rows.reduce<SummaryRow | null>((b, r) => (!b || r.total > b.total) ? r : b, null)
	return {
		total,
		trx,
		avgHarian: active > 0 ? total / active : 0,
		avgPerTrx: trx > 0 ? total / trx : 0,
		best:      best && best.total > 0 ? best : null,
	}
}

export function hariDariToday(tgl: string): number {
	return Math.round((new Date(tgl).getTime() - Date.now()) / 86400000)
}
