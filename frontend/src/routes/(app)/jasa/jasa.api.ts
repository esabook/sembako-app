import { api } from '$lib/utils/api';
import type {
	Booking, JadwalStaf, PaketMembership, KreditMembership, KomisiStaf,
	LayananBarang, StafAktif, StatusBooking,
} from './jasa.types';

// ── Booking ───────────────────────────────────────────────────────────────────

export async function fetchBooking(dari: string, sampai: string): Promise<Booking[]> {
	const res = await api.get<Booking[]>(`/jasa/booking?dari=${dari}&sampai=${sampai}`);
	if (!res.success) throw new Error(res.error);
	return res.data ?? [];
}

export type BookingBody = {
	pelanggan_id?: number | null;
	karyawan_id?: number | null;
	barang_id: number;
	waktu_mulai: string;
	status?: StatusBooking;
	kredit_id?: number | null;
	catatan?: string | null;
};

export async function createBooking(body: BookingBody): Promise<Booking> {
	const res = await api.post<Booking>('/jasa/booking', body);
	if (!res.success) throw new Error(res.error);
	return res.data;
}

export async function updateBooking(id: number, body: Partial<BookingBody> & { status?: StatusBooking }): Promise<void> {
	const res = await api.put(`/jasa/booking/${id}`, body);
	if (!res.success) throw new Error(res.error);
}

export async function deleteBooking(id: number): Promise<void> {
	const res = await api.delete(`/jasa/booking/${id}`);
	if (!res.success) throw new Error(res.error);
}

// ── Jadwal Staf ───────────────────────────────────────────────────────────────

export async function fetchJadwalStaf(): Promise<JadwalStaf[]> {
	const res = await api.get<JadwalStaf[]>('/jasa/jadwal-staf');
	if (!res.success) throw new Error(res.error);
	return res.data ?? [];
}

export async function createJadwalStaf(body: Omit<JadwalStaf, 'id' | 'karyawan_nama'>): Promise<void> {
	const res = await api.post('/jasa/jadwal-staf', body);
	if (!res.success) throw new Error(res.error);
}

export async function deleteJadwalStaf(id: number): Promise<void> {
	const res = await api.delete(`/jasa/jadwal-staf/${id}`);
	if (!res.success) throw new Error(res.error);
}

// ── Paket & Kredit Membership ─────────────────────────────────────────────────

export async function fetchPaketMembership(): Promise<PaketMembership[]> {
	const res = await api.get<PaketMembership[]>('/jasa/paket-membership');
	if (!res.success) throw new Error(res.error);
	return res.data ?? [];
}

export async function fetchKreditMembership(pelanggan_id?: number): Promise<KreditMembership[]> {
	const q = pelanggan_id ? `?pelanggan_id=${pelanggan_id}` : '';
	const res = await api.get<KreditMembership[]>(`/jasa/kredit-membership${q}`);
	if (!res.success) throw new Error(res.error);
	return res.data ?? [];
}

// ── Komisi ────────────────────────────────────────────────────────────────────

export async function fetchKomisi(dari: string, sampai: string): Promise<KomisiStaf[]> {
	const res = await api.get<KomisiStaf[]>(`/jasa/komisi?dari=${dari}&sampai=${sampai}`);
	if (!res.success) throw new Error(res.error);
	return res.data ?? [];
}

export async function bayarKomisi(ids: number[]): Promise<void> {
	const res = await api.put('/jasa/komisi/bayar', { ids });
	if (!res.success) throw new Error(res.error);
}

// ── Master ────────────────────────────────────────────────────────────────────

export async function fetchLayanan(): Promise<LayananBarang[]> {
	const res = await api.get<LayananBarang[]>('/jasa/layanan');
	if (!res.success) throw new Error(res.error);
	return res.data ?? [];
}

export async function fetchStafAktif(): Promise<StafAktif[]> {
	const res = await api.get<StafAktif[]>('/karyawan?aktif=1');
	if (!res.success) return [];
	return res.data ?? [];
}
