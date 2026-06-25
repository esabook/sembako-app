const BULAN = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES']

export function formatWaktu(now: Date): { timeStr: string; dateStr: string } {
	const pad = (n: number) => String(n).padStart(2, '0')
	return {
		timeStr: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
		dateStr: `${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()}`
	}
}
