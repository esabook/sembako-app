import { withLoading } from '$lib/utils/async';
import { toast } from '$lib/stores/ui.store';
import { getProfil, putNama, postGantiPassword, postGantiPin, postAksiToko } from './profil.api';
import type { Profil } from './profil.types';

export function createProfilStore() {
	let profil = $state<Profil | null>(null);
	let loading = $state(true);

	async function muat() {
		loading = true;
		await withLoading(
			async () => {
				profil = await getProfil();
			},
			{ loadingKey: 'profil-muat', modul: 'profil', aksi: 'muat', errorPesan: 'Gagal memuat profil' }
		);
		loading = false;
	}

	async function simpanNama(nama: string): Promise<boolean> {
		let ok = false;
		await withLoading(
			async () => {
				profil = await putNama(nama);
				toast.sukses('Profil diperbarui.');
				ok = true;
			},
			{ loadingKey: 'profil-simpan', modul: 'profil', aksi: 'simpan', errorPesan: 'Gagal menyimpan' }
		);
		return ok;
	}

	async function gantiPassword(lama: string, baru: string): Promise<boolean> {
		let ok = false;
		await withLoading(
			async () => {
				await postGantiPassword(lama, baru);
				toast.sukses('Password diubah.');
				ok = true;
			},
			{ loadingKey: 'profil-pw', modul: 'profil', aksi: 'ganti-pw', errorPesan: 'Gagal mengubah password' }
		);
		return ok;
	}

	async function gantiPin(pinLama: string | null, pinBaru: string): Promise<boolean> {
		let ok = false;
		const body: Record<string, string> = { baru: pinBaru };
		if (pinLama) body.lama = pinLama;
		await withLoading(
			async () => {
				await postGantiPin(body);
				toast.sukses('PIN absensi diubah.');
				await muat();
				ok = true;
			},
			{ loadingKey: 'profil-pin', modul: 'profil', aksi: 'ganti-pin', errorPesan: 'Gagal mengubah PIN' }
		);
		return ok;
	}

	async function aksiPemulihan(path: string, sukses: string): Promise<boolean> {
		let ok = false;
		await withLoading(
			async () => {
				await postAksiToko(path);
				toast.sukses(sukses);
				await muat();
				ok = true;
			},
			{ loadingKey: `profil-${path}`, modul: 'profil', aksi: path }
		);
		return ok;
	}

	async function submitDestruktif(
		mode: 'hapus' | 'nonaktif',
		password: string,
		alasan: string[]
	): Promise<boolean> {
		let ok = false;
		await withLoading(
			async () => {
				await postAksiToko(mode, { password, alasan });
				ok = true;
			},
			{ loadingKey: `profil-${mode}`, modul: 'profil', aksi: mode }
		);
		return ok;
	}

	return {
		get profil() { return profil; },
		get loading() { return loading; },
		muat,
		simpanNama,
		gantiPassword,
		gantiPin,
		aksiPemulihan,
		submitDestruktif,
	};
}

export type ProfilStore = ReturnType<typeof createProfilStore>;
