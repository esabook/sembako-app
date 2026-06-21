import { api } from '$lib/utils/api';
import type { Meja, GrupModifier } from './fnb.types';

export async function fetchMeja(): Promise<Meja[]> {
	const res = await api.get<Meja[]>('/fnb/meja');
	if (!res.success) throw new Error(res.error);
	return res.data ?? [];
}

export async function updateStatusMeja(id: number, status: Meja['status']): Promise<void> {
	const res = await api.put(`/fnb/meja/${id}/status`, { status });
	if (!res.success) throw new Error(res.error);
}

export async function fetchModifierGrup(barang_id: number): Promise<GrupModifier[]> {
	const res = await api.get<GrupModifier[]>(`/fnb/modifier-grup?barang_id=${barang_id}`);
	if (!res.success) throw new Error(res.error);
	return res.data ?? [];
}
