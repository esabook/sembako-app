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
	kas_bank_id?: number;
	items: Pick<ItemKeranjang, 'barang_id' | 'satuan_id' | 'jumlah' | 'harga_jual' | 'diskon_item'>[];
};

export async function submitPenjualan(body: SubmitPenjualanBody): Promise<{ no_transaksi: string }> {
	const res = await api.post<{ no_transaksi: string }>('/penjualan', body);
	if (!res.success) throw new Error(res.error);
	return res.data;
}

// ── Draft keranjang ───────────────────────────────────────────────────────

export type DraftItem = Pick<ItemKeranjang, 'barang_id' | 'tipe_harga' | 'satuan_id' | 'jumlah' | 'harga_jual' | 'diskon_item'> & {
	kode_barang: string;
	nama_barang: string;
	stok_sekarang: number;
	singkatan_satuan: string | null;
};

export type DraftResponse = {
	tipe: TipeTransaksi;
	pelanggan_id: number | null;
	items: DraftItem[];
};

export async function getDraft(): Promise<DraftResponse | null> {
	const res = await api.get<DraftResponse | null>('/draft/keranjang');
	if (!res.success) return null;
	return res.data ?? null;
}

export async function saveDraft(payload: {
	tipe: TipeTransaksi;
	pelanggan_id?: number | null;
	items: Pick<ItemKeranjang, 'barang_id' | 'tipe_harga' | 'satuan_id' | 'jumlah' | 'harga_jual' | 'diskon_item'>[];
}): Promise<void> {
	await api.put('/draft/keranjang', payload);
}

export async function deleteDraft(): Promise<void> {
	await api.delete('/draft/keranjang');
}
