import { api } from '$lib/utils/api';
import type { Profil } from './profil.types';

export async function getProfil(): Promise<Profil> {
	const res = await api.get<Profil>('/akun/profil');
	if (!res.success) throw new Error(res.error || 'Gagal memuat profil');
	return res.data;
}

export async function putNama(nama: string): Promise<Profil> {
	const res = await api.put<Profil>('/akun/profil', { nama: nama.trim() });
	if (!res.success) throw new Error(res.error || 'Gagal menyimpan');
	return res.data;
}

export async function postGantiPassword(lama: string, baru: string): Promise<void> {
	const res = await api.post('/akun/ganti-password', { lama, baru });
	if (!res.success) throw new Error(res.error || 'Gagal mengubah password');
}

export async function postGantiPin(body: Record<string, string>): Promise<void> {
	const res = await api.post('/akun/ganti-pin', body);
	if (!res.success) throw new Error(res.error || 'Gagal mengubah PIN');
}

export async function postAksiToko(path: string, body: Record<string, unknown> = {}): Promise<void> {
	const res = await api.post(`/akun/toko/${path}`, body);
	if (!res.success) throw new Error(res.error || 'Gagal memproses');
}
