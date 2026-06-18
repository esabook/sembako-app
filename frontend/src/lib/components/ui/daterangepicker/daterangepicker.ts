export const TEMPLATES = [
	'Last 90 days',
	'Last 30 days',
	'Last 7 days',
	'Last 24 hours',
	'Last 12 hours',
	'Last 60 minutes'
];

export const MONTH_NAMES = [
	'Januari',
	'Februari',
	'Maret',
	'April',
	'Mei',
	'Juni',
	'Juli',
	'Agustus',
	'September',
	'Oktober',
	'November',
	'Desember'
];

export const WEEK_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function toISO(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export function isoToDisplay(iso: string): string {
	if (!iso) return '';
	const [y, m, d] = iso.split('-');
	return `${d}/${m}/${y}`;
}

export function parseDisplay(s: string): string | null {
	const match = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
	if (!match) return null;
	const [, dd, mm, yyyy] = match;
	const dv = parseInt(dd),
		mo = parseInt(mm) - 1,
		y = parseInt(yyyy);
	const date = new Date(y, mo, dv);
	if (date.getFullYear() !== y || date.getMonth() !== mo || date.getDate() !== dv) return null;
	return `${yyyy}-${mm}-${dd}`;
}

export function calcTemplateRange(label: string): { from: string; to: string } {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const t = toISO(today);
	const offset = (n: number) => {
		const d = new Date(today);
		d.setDate(d.getDate() - n);
		return toISO(d);
	};
	if (label === 'Last 90 days') return { from: offset(89), to: t };
	if (label === 'Last 30 days') return { from: offset(29), to: t };
	if (label === 'Last 7 days') return { from: offset(6), to: t };
	if (label === 'Last 24 hours') return { from: offset(1), to: t };
	return { from: t, to: t };
}

export function fmtDate(iso: string, withYear: boolean): string {
	if (!iso) return '';
	const d = new Date(iso + 'T00:00:00');
	const month = d.toLocaleDateString('id-ID', { month: 'short' });
	return withYear ? `${d.getDate()} ${month} ${d.getFullYear()}` : `${d.getDate()} ${month}`;
}

export function displayRange(from: string, to: string): string {
	if (!from || !to) return '';
	const cy = new Date().getFullYear();
	const withYear = parseInt(from.slice(0, 4)) !== cy || parseInt(to.slice(0, 4)) !== cy;
	return `${fmtDate(from, withYear)} - ${fmtDate(to, withYear)}`;
}

export function maskDate(raw: string): string {
	const digits = raw.replace(/\D/g, '').slice(0, 8);
	let result = '';
	for (let i = 0; i < digits.length; i++) {
		if (i === 2 || i === 4) result += '/';
		result += digits[i];
	}
	return result;
}

export function getMonthDays(viewDate: Date): { iso: string; current: boolean }[] {
	const year = viewDate.getFullYear();
	const month = viewDate.getMonth();
	const firstDow = new Date(year, month, 1).getDay();
	const lastDate = new Date(year, month + 1, 0).getDate();
	const days: { iso: string; current: boolean }[] = [];
	for (let i = firstDow; i > 0; i--) {
		days.push({ iso: toISO(new Date(year, month, 1 - i)), current: false });
	}
	for (let d = 1; d <= lastDate; d++) {
		days.push({ iso: toISO(new Date(year, month, d)), current: true });
	}
	let next = 1;
	while (days.length < 42) {
		days.push({ iso: toISO(new Date(year, month + 1, next++)), current: false });
	}
	return days;
}

export function getYearGrid(nowYear: number): number[] {
	return Array.from({ length: 24 }, (_, i) => nowYear - 23 + i);
}
