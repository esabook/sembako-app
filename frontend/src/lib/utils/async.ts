import { loading, errors, toast } from '$lib/stores/ui.store';
import type { WithLoadingOpts } from '$lib/types/error.types';

// Petaan error teknis → pesan ramah user (lihat CLAUDE_v2.md).
function petakanError(asli: string): string {
	const s = asli.toLowerCase();
	if (s.includes('failed to fetch') || s.includes('networkerror'))
		return 'Koneksi ke server gagal. Cek jaringan WiFi.';
	if (s.includes('404')) return 'Data tidak ditemukan.';
	if (s.includes('401') || s.includes('403'))
		return 'Akses ditolak. Silakan login ulang.';
	if (s.includes('500')) return 'Terjadi kesalahan di server. Coba lagi.';
	if (s.includes('stok')) return 'Stok tidak mencukupi.';
	return 'Terjadi kesalahan. Silakan coba lagi.';
}

/**
 * Pembungkus tunggal untuk semua operasi async di store.
 * - fn harus throw on error dan return data langsung (unwrap ApiResponse di layer api.ts)
 * - Otomatis mulai/selesai loading
 * - Tangkap error → petakan → toast + catat ke errors store
 * - Opsional toast sukses
 * - Kembalikan T jika sukses, null jika gagal
 */
export async function withLoading<T>(
	fn: () => Promise<T>,
	opts: WithLoadingOpts
): Promise<T | null> {
	loading.mulai(opts.loadingKey, opts.loadingPesan);
	try {
		const hasil = await fn();
		if (opts.suksesOtomatis) {
			toast.sukses(opts.suksesPesan ?? 'Berhasil');
		}
		return hasil;
	} catch (e) {
		const asli = e instanceof Error ? e.message : String(e);
		const pesan = opts.errorPesan ?? petakanError(asli);
		errors.tambah({
			pesan,
			asli,
			modul: opts.modul,
			aksi: opts.aksi,
			bisaRetry: opts.bisaRetry ?? false,
			retry: opts.bisaRetry ? () => void withLoading(fn, opts) : null,
		});
		toast.error(pesan);
		return null;
	} finally {
		loading.selesai(opts.loadingKey);
	}
}
