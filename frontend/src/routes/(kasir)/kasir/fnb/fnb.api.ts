import { api } from '$lib/utils/api';
import type { Meja, GrupModifier, GrupModifierMaster } from './fnb.types';

export async function fetchMeja(all = false): Promise<Meja[]> {
	const res = await api.get<Meja[]>(`/fnb/meja${all ? '?all=1' : ''}`);
	if (!res.success) throw new Error(res.error);
	return res.data ?? [];
}

export async function updateStatusMeja(id: number, status: Meja['status']): Promise<void> {
	const res = await api.put(`/fnb/meja/${id}/status`, { status });
	if (!res.success) throw new Error(res.error);
}

export type MejaBody = { kode_meja: string; nama?: string | null; kapasitas?: number };

export async function createMeja(body: MejaBody): Promise<void> {
	const res = await api.post('/fnb/meja', body);
	if (!res.success) throw new Error(res.error);
}

export async function updateMeja(id: number, body: Partial<MejaBody> & { is_active?: boolean }): Promise<void> {
	const res = await api.put(`/fnb/meja/${id}`, body);
	if (!res.success) throw new Error(res.error);
}

export async function deleteMeja(id: number): Promise<void> {
	const res = await api.delete(`/fnb/meja/${id}`);
	if (!res.success) throw new Error(res.error);
}

export async function fetchModifierGrup(barang_id: number): Promise<GrupModifier[]> {
	const res = await api.get<GrupModifier[]>(`/fnb/modifier-grup?barang_id=${barang_id}`);
	if (!res.success) throw new Error(res.error);
	return res.data ?? [];
}

// ── Master modifier ───────────────────────────────────────────────────────────

export async function fetchGrupMaster(): Promise<GrupModifierMaster[]> {
	const res = await api.get<GrupModifierMaster[]>('/fnb/grup-modifier');
	if (!res.success) throw new Error(res.error);
	return res.data ?? [];
}

export type GrupBody = { nama: string; wajib: boolean; min_pilih: number; max_pilih: number };

export async function createGrup(body: GrupBody): Promise<void> {
	const res = await api.post('/fnb/grup-modifier', body);
	if (!res.success) throw new Error(res.error);
}

export async function updateGrup(id: number, body: Partial<GrupBody> & { is_active?: boolean }): Promise<void> {
	const res = await api.put(`/fnb/grup-modifier/${id}`, body);
	if (!res.success) throw new Error(res.error);
}

export async function deleteGrup(id: number): Promise<void> {
	const res = await api.delete(`/fnb/grup-modifier/${id}`);
	if (!res.success) throw new Error(res.error);
}

export async function createOpsi(body: { grup_modifier_id: number; nama: string; harga_tambahan: number }): Promise<void> {
	const res = await api.post('/fnb/modifier', body);
	if (!res.success) throw new Error(res.error);
}

export async function updateOpsi(id: number, body: Partial<{ nama: string; harga_tambahan: number; is_active: boolean }>): Promise<void> {
	const res = await api.put(`/fnb/modifier/${id}`, body);
	if (!res.success) throw new Error(res.error);
}

export async function deleteOpsi(id: number): Promise<void> {
	const res = await api.delete(`/fnb/modifier/${id}`);
	if (!res.success) throw new Error(res.error);
}

// ── Assign grup ke menu ───────────────────────────────────────────────────────

export async function fetchGrupAssigned(barang_id: number): Promise<number[]> {
	const res = await api.get<number[]>(`/fnb/barang/${barang_id}/modifier-grup`);
	if (!res.success) throw new Error(res.error);
	return res.data ?? [];
}

export async function setGrupAssigned(barang_id: number, grup_ids: number[]): Promise<void> {
	const res = await api.put(`/fnb/barang/${barang_id}/modifier-grup`, { grup_ids });
	if (!res.success) throw new Error(res.error);
}
