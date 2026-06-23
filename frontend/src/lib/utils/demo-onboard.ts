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
 * Jalur "buka toko demo": buat akun asli lalu langsung masuk sandbox demo.
 * Chain reuse endpoint existing (sama pola onboarding mode demo):
 *   daftar → login → demo/generate → switch-context → '/'
 * Data toko dikirim sebagai sentinel ('Stokasir' dll); profil asli diisi nanti di onboarding.
 * Return false bila ada langkah gagal (toast error sudah ditampilkan).
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

	const login = await api.post('/auth/login', {
		username: input.email.trim().toLowerCase(),
		password: input.password
	});
	if (!login.success) {
		toast.error(login.error || 'Gagal masuk ke akun demo.');
		return false;
	}

	// Idempoten: pakai demo yang sudah ada bila tersedia, kalau belum generate.
	let demoTokoId: number | null = null;
	const status = await api.get<{ exists: boolean; toko_id?: number }>('/demo/status');
	if (status.success && status.data.exists) demoTokoId = status.data.toko_id ?? null;
	if (!demoTokoId) {
		const gen = await api.post<{ toko_id: number }>('/demo/generate', {});
		if (!gen.success) {
			toast.error(gen.error || 'Gagal menyiapkan data demo.');
			return false;
		}
		demoTokoId = gen.data.toko_id;
	}

	const sw = await api.post('/auth/switch-context', { toko_id: demoTokoId, cabang_id: null });
	if (!sw.success) {
		toast.error(sw.error || 'Gagal masuk mode demo.');
		return false;
	}

	await goto('/');
	return true;
}
