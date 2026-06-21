import { api } from '$lib/utils/api';

export type Bahan = {
	id: number;
	kode_bahan: string;
	nama: string;
	satuan_id: number | null;
	satuan_singkatan: string | null;
	stok_sekarang: number;
	stok_minimum: number;
	harga_beli_rata: number;
	is_active: boolean;
};

export type BahanBody = {
	nama: string;
	satuan_id?: number | null;
	stok_sekarang?: number;
	stok_minimum?: number;
	harga_beli_rata?: number;
};

export type ResepLine = {
	id?: number;
	bahan_baku_id: number;
	bahan_nama?: string;
	jumlah: number;
	satuan_id?: number | null;
	satuan_singkatan?: string | null;
	harga_beli_rata?: number;
};

export type MenuRingkas = { id: number; nama_barang: string; tipe_produk: string };

export type HppRow = {
	id: number; nama_barang: string; harga_jual: number;
	hpp: number; margin: number; margin_persen: number;
};

export async function fetchBahan(q = ''): Promise<Bahan[]> {
	const res = await api.get<Bahan[]>(`/bom/bahan${q ? `?q=${encodeURIComponent(q)}` : ''}`);
	if (!res.success) throw new Error(res.error);
	return res.data ?? [];
}

export async function createBahan(body: BahanBody): Promise<void> {
	const res = await api.post('/bom/bahan', body);
	if (!res.success) throw new Error(res.error);
}

export async function updateBahan(id: number, body: Partial<BahanBody> & { is_active?: boolean }): Promise<void> {
	const res = await api.put(`/bom/bahan/${id}`, body);
	if (!res.success) throw new Error(res.error);
}

export async function deleteBahan(id: number): Promise<void> {
	const res = await api.delete(`/bom/bahan/${id}`);
	if (!res.success) throw new Error(res.error);
}

export async function fetchResep(barang_id: number): Promise<{ lines: ResepLine[]; hpp: number }> {
	const res = await api.get<{ lines: ResepLine[]; hpp: number }>(`/bom/resep/${barang_id}`);
	if (!res.success) throw new Error(res.error);
	return res.data ?? { lines: [], hpp: 0 };
}

export async function saveResep(barang_id: number, lines: { bahan_baku_id: number; jumlah: number; satuan_id?: number | null }[]): Promise<void> {
	const res = await api.put(`/bom/resep/${barang_id}`, { lines });
	if (!res.success) throw new Error(res.error);
}

export async function fetchHpp(): Promise<HppRow[]> {
	const res = await api.get<HppRow[]>('/bom/hpp');
	if (!res.success) throw new Error(res.error);
	return res.data ?? [];
}

export async function fetchMenuList(): Promise<MenuRingkas[]> {
	const res = await api.get<MenuRingkas[]>('/barang');
	if (!res.success) return [];
	return (res.data ?? []).filter((b) => b.tipe_produk === 'menu_item');
}
