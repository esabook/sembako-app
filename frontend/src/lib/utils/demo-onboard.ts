import { goto } from '$app/navigation';
import { api } from '$lib/utils/api';
import { toast } from '$lib/stores/ui.store';

export type BukaDemoInput = {
	email: string;
	password: string;
	nama_toko: string;
	nama_pemilik: string;
	wa: string;
};

/**
 * Daftarkan akun baru lalu lempar ke halaman login (email pre-fill via query param).
 * Login dan onboarding (mode demo) menyelesaikan sisa proses.
 */
export async function bukaDemo(input: BukaDemoInput): Promise<boolean> {
	const daftar = await api.post('/auth/daftar', {
		email: input.email.trim().toLowerCase(),
		password: input.password,
		nama_toko: input.nama_toko.trim(),
		nama_pemilik: input.nama_pemilik.trim(),
		wa: input.wa.trim()
	});
	if (!daftar.success) {
		toast.error(daftar.error || 'Pendaftaran gagal, coba lagi.');
		return false;
	}

	await goto(`/login?email=${encodeURIComponent(input.email.trim().toLowerCase())}`);
	return true;
}
