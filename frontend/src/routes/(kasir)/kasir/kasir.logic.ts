// Fungsi murni untuk modul kasir. Tidak ada fetch, tidak ada store, tidak ada DOM.
import type { MetodeBayar } from './kasir.types';

const fmtRupiah = new Intl.NumberFormat('id-ID');

export function rupiah(n: number): string {
	return fmtRupiah.format(n);
}

export function formatTgl(d: Date): string {
	return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatJam(d: Date): string {
	return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export const METODE: MetodeBayar[] = ['tunai', 'transfer', 'qris', 'hutang'];

export const METODE_LABEL: Record<MetodeBayar, string> = {
	tunai: 'TUNAI',
	transfer: 'TRANSFER',
	qris: 'QRIS',
	hutang: 'HUTANG',
};
