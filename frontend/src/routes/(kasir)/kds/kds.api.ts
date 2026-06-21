import { api } from '$lib/utils/api';
import type { KdsItem, StatusKds } from './kds.types';

export async function fetchKdsItems(): Promise<KdsItem[]> {
	const res = await api.get<KdsItem[]>('/fnb/kds');
	if (!res.success) throw new Error(res.error);
	return res.data ?? [];
}

export async function updateStatusKds(id: number, status: StatusKds): Promise<void> {
	const res = await api.put(`/fnb/kds/${id}`, { status_kds: status });
	if (!res.success) throw new Error(res.error);
}
