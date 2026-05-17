// Semua fetch ke backend untuk modul kasir.
// Setiap fungsi: throw on error, return data langsung (unwrap ApiResponse).
// Konsumsi oleh kasir.store.ts via withLoading().

import { api } from '$lib/utils/api';
import type { BarangResult, PelangganResult } from './kasir.types';
import type { ItemKeranjang, MetodeBayar, TipeTransaksi } from '$lib/stores/kasir';

export async function fetchBarang(q: string): Promise<BarangResult[]> {
	const res = await api.get<BarangResult[]>(`/barang?q=${encodeURIComponent(q)}`);
	if (!res.success) throw new Error(res.error);
	return res.data;
}

export async function fetchPelanggan(q: string): Promise<PelangganResult[]> {
	const res = await api.get<PelangganResult[]>(`/pelanggan?q=${encodeURIComponent(q)}`);
	if (!res.success) throw new Error(res.error);
	return res.data;
}

type SubmitPenjualanBody = {
	pelanggan_id?: number;
	tipe: TipeTransaksi;
	metode_bayar: MetodeBayar;
	bayar: number;
	items: Pick<ItemKeranjang, 'barang_id' | 'satuan_id' | 'jumlah' | 'harga_jual' | 'diskon_item'>[];
};

export async function submitPenjualan(body: SubmitPenjualanBody): Promise<{ no_transaksi: string }> {
	const res = await api.post<{ no_transaksi: string }>('/penjualan', body);
	if (!res.success) throw new Error(res.error);
	return res.data;
}
