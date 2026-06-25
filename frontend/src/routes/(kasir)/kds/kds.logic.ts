import type { KdsItem } from './kds.types';

export function menitBerlalu(created_at: string): number {
	return Math.floor((Date.now() - new Date(created_at).getTime()) / 60_000);
}

export function labelWaktu(created_at: string): string {
	const menit = menitBerlalu(created_at);
	if (menit < 1) return '< 1 mnt';
	return `${menit} mnt`;
}

// Kelompokkan item per no_transaksi dalam satu status-kolom
export function groupByTransaksi(items: KdsItem[]): Map<string, KdsItem[]> {
	const map = new Map<string, KdsItem[]>();
	for (const item of items) {
		const key = item.no_transaksi;
		const list = map.get(key) ?? [];
		list.push(item);
		map.set(key, list);
	}
	return map;
}
