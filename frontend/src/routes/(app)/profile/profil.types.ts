export type Profil = {
	id: number;
	kode_karyawan: string;
	nama: string;
	role: string;
	username: string;
	email: string | null;
	kontak: string | null;
	foto_path: string | null;
	gaji_pokok: number;
	tipe_gaji: string;
	has_pin: boolean;
	status_toko: string | null;
	hapus_terjadwal: string | null;
	sisa_hari_hapus: number | null;
};

export const ALASAN_OPSI = [
	'Tidak dipakai lagi',
	'Pindah ke aplikasi lain',
	'Terlalu susah',
	'Fitur kurang lengkap',
	'Ada kendala teknis',
	'Lainnya'
] as const;
