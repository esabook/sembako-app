export type StatusBooking = 'booked' | 'confirmed' | 'in_progress' | 'selesai' | 'batal' | 'no_show';

export type Booking = {
	id: number;
	no_booking: string;
	pelanggan_id: number | null;
	pelanggan_nama: string | null;
	karyawan_id: number | null;
	karyawan_nama: string | null;
	barang_id: number;
	layanan_nama: string;
	waktu_mulai: string;
	waktu_selesai: string | null;
	status: StatusBooking;
	penjualan_id: number | null;
	kredit_id: number | null;
	catatan: string | null;
};

export type JadwalStaf = {
	id: number;
	karyawan_id: number;
	karyawan_nama: string;
	hari: number;
	jam_mulai: string;
	jam_selesai: string;
	is_active: boolean;
};

export type PaketMembership = {
	id: number;
	kode_paket: string;
	nama: string;
	barang_id: number | null;
	layanan_nama: string | null;
	jumlah_sesi: number;
	harga: number;
	masa_berlaku_hari: number;
	is_active: boolean;
};

export type KreditMembership = {
	id: number;
	pelanggan_id: number;
	pelanggan_nama: string;
	paket_id: number;
	paket_nama: string;
	sisa_kuota: number;
	tanggal_mulai: string;
	tanggal_expired: string | null;
	status: 'aktif' | 'habis' | 'expired';
};

export type KomisiStaf = {
	id: number;
	karyawan_id: number;
	karyawan_nama: string;
	barang_id: number | null;
	layanan_nama: string | null;
	nilai_komisi: number;
	persen: number;
	tanggal: string;
	status: 'pending' | 'dibayar';
};

export type LayananBarang = {
	id: number;
	nama_barang: string;
	harga_jual: number;
	diatur: boolean;
	durasi_menit: number;
	buffer_menit: number;
	dapat_dibooking: boolean;
	komisi_persen: number;
	komisi_nominal: number;
};

export type StafAktif = {
	id: number;
	nama: string;
	kode_karyawan: string;
};

export const HARI_LABEL = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
