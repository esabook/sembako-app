import { withLoading } from '$lib/utils/async';
import * as api from './jasa.api';
import type { PelangganRingkas } from './jasa.api';
import { validasiBooking, hitungWaktuSelesai } from './jasa.logic';
import type { Booking, JadwalStaf, LayananBarang, StafAktif, StatusBooking } from './jasa.types';

export function createBookingStore() {
	let bookings = $state<Booking[]>([]);
	let jadwal = $state<JadwalStaf[]>([]);
	let layanan = $state<LayananBarang[]>([]);
	let staf = $state<StafAktif[]>([]);
	let pelanggan = $state<PelangganRingkas[]>([]);
	let loading = $state(false);
	let loadingGrid = $state(false);

	// form
	let formOpen = $state(false);
	let editId = $state<number | null>(null);
	let fPelangganId = $state<number | null>(null);
	let fKaryawanId = $state<number | null>(null);
	let fBarangId = $state<number | null>(null);
	let fWaktuMulai = $state('');
	let fCatatan = $state('');
	let fKreditId = $state<number | null>(null);
	let error = $state('');

	// filter
	let dari = $state(new Date().toISOString().slice(0, 10));
	let sampai = $state(new Date().toISOString().slice(0, 10));
	let viewMode = $state<'list' | 'calendar'>('list');

	async function muat() {
		loading = true;
		const hasil = await withLoading(() => api.fetchBooking(dari, sampai), {
			loadingKey: 'jasa-booking-muat',
			modul: 'jasa',
			aksi: 'muat-booking',
			errorPesan: 'Gagal memuat booking',
		});
		if (hasil) bookings = hasil;
		loading = false;
	}

	async function muatMaster() {
		const [l, s, p] = await Promise.all([api.fetchLayanan(true), api.fetchStafAktif(), api.fetchPelangganRingkas()]);
		layanan = l;
		staf = s;
		pelanggan = p;
	}

	async function checkout(id: number, pakaiKuota: boolean) {
		const ok = await withLoading(() => api.checkoutBooking(id, { pakai_kuota: pakaiKuota }), {
			loadingKey: `jasa-checkout-${id}`,
			modul: 'jasa', aksi: 'checkout-booking',
			errorPesan: 'Gagal checkout booking',
		});
		if (ok !== null) muat();
		return ok;
	}

	function bukaForm(b?: Booking) {
		editId = b?.id ?? null;
		fPelangganId = b?.pelanggan_id ?? null;
		fKaryawanId = b?.karyawan_id ?? null;
		fBarangId = b?.barang_id ?? null;
		fWaktuMulai = b?.waktu_mulai?.slice(0, 16) ?? '';
		fCatatan = b?.catatan ?? '';
		fKreditId = b?.kredit_id ?? null;
		error = '';
		formOpen = true;
	}

	async function simpan() {
		error = '';
		const layananDipilih = layanan.find((l) => l.id === fBarangId);
		const waktu_selesai = layananDipilih && fWaktuMulai
			? hitungWaktuSelesai(fWaktuMulai, layananDipilih.durasi_menit)
			: null;

		const validErr = validasiBooking(fWaktuMulai, fBarangId, fKaryawanId,
			bookings.filter((b) => b.id !== editId));
		if (validErr) { error = validErr; return; }

		const body: api.BookingBody = {
			pelanggan_id: fPelangganId,
			karyawan_id: fKaryawanId,
			barang_id: fBarangId!,
			waktu_mulai: new Date(fWaktuMulai).toISOString(),
			kredit_id: fKreditId,
			catatan: fCatatan || null,
		};

		const ok = editId
			? await withLoading(() => api.updateBooking(editId!, body), {
					loadingKey: 'jasa-booking-update',
					modul: 'jasa', aksi: 'update-booking',
					errorPesan: 'Gagal simpan booking',
				})
			: await withLoading(() => api.createBooking(body), {
					loadingKey: 'jasa-booking-create',
					modul: 'jasa', aksi: 'buat-booking',
					errorPesan: 'Gagal buat booking',
				});

		if (ok !== null) { formOpen = false; muat(); }
	}

	async function ubahStatus(id: number, status: StatusBooking) {
		bookings = bookings.map((b) => (b.id === id ? { ...b, status } : b));
		await withLoading(() => api.updateBooking(id, { status }), {
			loadingKey: `jasa-status-${id}`,
			modul: 'jasa', aksi: 'ubah-status',
			errorPesan: 'Gagal ubah status booking',
		});
		muat();
	}

	async function hapus(id: number) {
		await withLoading(() => api.deleteBooking(id), {
			loadingKey: `jasa-hapus-${id}`,
			modul: 'jasa', aksi: 'hapus-booking',
			errorPesan: 'Gagal hapus booking',
		});
		muat();
	}

	return {
		get bookings() { return bookings; },
		get loading() { return loading; },
		get loadingGrid() { return loadingGrid; },
		get layanan() { return layanan; },
		get staf() { return staf; },
		get pelanggan() { return pelanggan; },
		get formOpen() { return formOpen; }, set formOpen(v) { formOpen = v; },
		get editId() { return editId; },
		get fPelangganId() { return fPelangganId; }, set fPelangganId(v) { fPelangganId = v; },
		get fKaryawanId() { return fKaryawanId; }, set fKaryawanId(v) { fKaryawanId = v; },
		get fBarangId() { return fBarangId; }, set fBarangId(v) { fBarangId = v; },
		get fWaktuMulai() { return fWaktuMulai; }, set fWaktuMulai(v) { fWaktuMulai = v; },
		get fCatatan() { return fCatatan; }, set fCatatan(v) { fCatatan = v; },
		get fKreditId() { return fKreditId; }, set fKreditId(v) { fKreditId = v; },
		get error() { return error; },
		get dari() { return dari; }, set dari(v) { dari = v; },
		get sampai() { return sampai; }, set sampai(v) { sampai = v; },
		get viewMode() { return viewMode; }, set viewMode(v) { viewMode = v; },
		muat, muatMaster, bukaForm, simpan, ubahStatus, hapus, checkout,
	};
}
