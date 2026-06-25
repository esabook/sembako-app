import type { Booking, StatusBooking } from './jasa.types';

export const WARNA_STATUS: Record<StatusBooking, string> = {
	booked: 'var(--info)',
	confirmed: 'var(--accent)',
	in_progress: 'var(--warn)',
	selesai: 'var(--text-dim)',
	batal: 'var(--danger)',
	no_show: 'var(--danger)',
};

export const LABEL_STATUS: Record<StatusBooking, string> = {
	booked: 'Booked',
	confirmed: 'Konfirmasi',
	in_progress: 'Sedang',
	selesai: 'Selesai',
	batal: 'Batal',
	no_show: 'No Show',
};

export function hitungWaktuSelesai(waktu_mulai: string, durasi_menit: number, buffer_menit = 0): string {
	const d = new Date(waktu_mulai);
	d.setMinutes(d.getMinutes() + durasi_menit + buffer_menit);
	return d.toISOString();
}

export function isKonflik(a: Booking, waktu_mulai: string, waktu_selesai: string): boolean {
	const mulai = new Date(waktu_mulai).getTime();
	const selesai = new Date(waktu_selesai).getTime();
	const aMulai = new Date(a.waktu_mulai).getTime();
	const aSelesai = a.waktu_selesai ? new Date(a.waktu_selesai).getTime() : aMulai + 30 * 60_000;
	return mulai < aSelesai && selesai > aMulai;
}

export function validasiBooking(
	waktu_mulai: string,
	barang_id: number | null,
	karyawan_id: number | null,
	existing: Booking[]
): string | null {
	if (!barang_id) return 'Pilih layanan';
	if (!waktu_mulai) return 'Pilih waktu mulai';
	const konflik = existing.filter(
		(b) =>
			b.karyawan_id === karyawan_id &&
			['booked', 'confirmed', 'in_progress'].includes(b.status)
	);
	for (const k of konflik) {
		const selesai = k.waktu_selesai ?? k.waktu_mulai;
		if (isKonflik(k, waktu_mulai, selesai)) return `Konflik jadwal: ${k.no_booking}`;
	}
	return null;
}

// Kelompokkan booking per tanggal (YYYY-MM-DD) untuk calendar view
export function groupByTanggal(bookings: Booking[]): Map<string, Booking[]> {
	const map = new Map<string, Booking[]>();
	for (const b of bookings) {
		const tgl = b.waktu_mulai.slice(0, 10);
		const list = map.get(tgl) ?? [];
		list.push(b);
		map.set(tgl, list);
	}
	return map;
}

// Buat array tanggal untuk week view
export function getWeekDates(base: Date): Date[] {
	const monday = new Date(base);
	monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
	return Array.from({ length: 7 }, (_, i) => {
		const d = new Date(monday);
		d.setDate(monday.getDate() + i);
		return d;
	});
}

export function formatTanggal(d: Date): string {
	return d.toISOString().slice(0, 10);
}

export function formatJam(iso: string): string {
	return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
