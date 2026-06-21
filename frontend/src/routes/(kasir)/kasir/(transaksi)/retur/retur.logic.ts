import type { ItemRetur, ItemTukarForm } from './retur.types.js'

export const LABEL_METODE: Record<string, string> = {
	tunai: 'Refund Tunai',
	kurang_piutang: 'Kurangi Piutang',
	tukar_barang: 'Tukar Barang',
}

export function fmt(n: number): string {
	return n.toLocaleString('id-ID')
}

export function fmtTgl(s: string): string {
	return new Date(s).toLocaleDateString('id-ID', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

export function hitungHargaNet(item: Pick<ItemRetur, 'jumlah' | 'subtotal' | 'harga_jual'>): number {
	return item.jumlah > 0 ? item.subtotal / item.jumlah : item.harga_jual
}

export function hitungTotalRetur(items: ItemRetur[]): number {
	return items.reduce((s, i) => s + hitungHargaNet(i) * i.jumlah_retur, 0)
}

export function hitungTotalTukar(items: ItemTukarForm[]): number {
	return items.reduce((s, t) => s + t.harga_jual * t.jumlah, 0)
}
