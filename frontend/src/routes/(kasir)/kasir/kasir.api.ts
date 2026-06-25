// Semua fetch ke backend untuk modul kasir.
// Setiap fungsi: throw on error, return data langsung (unwrap ApiResponse).
// Konsumsi oleh kasir.store.ts via withLoading().

import { api } from '$lib/utils/api';
import { enqueue, OfflineQueuedError } from '$lib/stores/offlineQueue';
import type { BarangResult, PelangganResult, HistoriPenjualan, HistoriDetail, StokMenipis } from './kasir.types';
import type { ItemKeranjang, MetodeBayar, TipeTransaksi, ModifierTerpilih } from '$lib/stores/kasir';

export type TipeLayanan = 'retail' | 'dine_in' | 'take_away' | 'jasa';

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

export type SubmitItem = Pick<ItemKeranjang, 'barang_id' | 'satuan_id' | 'jumlah' | 'harga_jual' | 'diskon_item'> & {
	catatan?: string | null;
	dilayani_oleh?: number | null;
	booking_id?: number | null;
	modifiers?: ModifierTerpilih[];
};

type SubmitPenjualanBody = {
	pelanggan_id?: number;
	tipe: TipeTransaksi;
	tipe_layanan?: TipeLayanan;
	meja_id?: number | null;
	metode_bayar: MetodeBayar;
	bayar: number;
	diskon_total?: number;
	kas_bank_id?: number;
	items: SubmitItem[];
};

export async function submitPenjualan(body: SubmitPenjualanBody): Promise<{ no_transaksi: string }> {
	const res = await api.post<{ no_transaksi: string }>('/penjualan', body);
	if (!res.success) {
		if (res.error === 'Network error' && !navigator.onLine) {
			const label = `Transaksi Rp ${new Intl.NumberFormat('id-ID').format(body.bayar)}`
			enqueue({ method: 'post', path: '/penjualan', body, label })
			throw new OfflineQueuedError(label)
		}
		throw new Error(res.error);
	}
	return res.data;
}

// ── Multi Open Bill ───────────────────────────────────────────────────────

export type DraftItem = Pick<ItemKeranjang, 'barang_id' | 'tipe_harga' | 'satuan_id' | 'jumlah' | 'harga_jual' | 'harga_eceran' | 'harga_grosir' | 'diskon_item'> & {
	kode_barang: string;
	nama_barang: string;
	stok_sekarang: number;
	singkatan_satuan: string | null;
};

export type BillSummary = {
	id: number;
	nomor_bill: number;
	label: string | null;
	tipe: TipeTransaksi;
	pelanggan_id: number | null;
	meja_id: number | null;
	subtotal: number;
	jumlah_item: number;
	created_at: string;
	updated_at: string;
};

export type BillDetail = BillSummary & { items: DraftItem[] };

export async function listBills(): Promise<BillSummary[]> {
	const res = await api.get<BillSummary[]>('/draft/keranjang');
	if (!res.success) return [];
	return res.data ?? [];
}

export async function getBill(id: number): Promise<BillDetail | null> {
	const res = await api.get<BillDetail | null>(`/draft/keranjang/${id}`);
	if (!res.success) return null;
	return res.data ?? null;
}

export async function createBill(meja_id?: number | null): Promise<{ id: number; nomor_bill: number }> {
	const res = await api.post<{ id: number; nomor_bill: number }>('/draft/keranjang', { meja_id: meja_id ?? null });
	if (!res.success) throw new Error(res.error);
	return res.data;
}

export async function saveBillItems(id: number, payload: {
	tipe: TipeTransaksi;
	pelanggan_id?: number | null;
	meja_id?: number | null;
	label?: string | null;
	items: Pick<ItemKeranjang, 'barang_id' | 'tipe_harga' | 'satuan_id' | 'jumlah' | 'harga_jual' | 'diskon_item'>[];
}): Promise<void> {
	await api.put(`/draft/keranjang/${id}`, payload);
}

export async function deleteBill(id: number): Promise<void> {
	await api.delete(`/draft/keranjang/${id}`);
}

// ── History transaksi ─────────────────────────────────────────────────────

export async function fetchHistoriPenjualan(dari: string, sampai: string): Promise<HistoriPenjualan[]> {
	const res = await api.get<HistoriPenjualan[]>(`/penjualan?dari=${dari}&sampai=${sampai}`);
	if (!res.success) throw new Error(res.error);
	return res.data;
}

export async function fetchDetailPenjualan(id: number): Promise<HistoriDetail> {
	const res = await api.get<HistoriDetail>(`/penjualan/${id}`);
	if (!res.success) throw new Error(res.error);
	return res.data;
}



export type { HistoriPenjualan, HistoriDetail, StokMenipis };
