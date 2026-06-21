import { loading, errors, toast } from '$lib/stores/ui.store';
import type { WithLoadingOpts } from '$lib/types/error.types';
import { OfflineQueuedError } from '$lib/stores/offlineQueue';

// --- withIdle ---

const _hasRic = typeof requestIdleCallback !== 'undefined';

/** Defer komputasi ke idle time browser. Return cleanup fn untuk cancelIdleCallback. */
export function withIdle(fn: () => void, timeout = 300): () => void {
	if (_hasRic) {
		const id = requestIdleCallback(() => fn(), { timeout });
		return () => cancelIdleCallback(id);
	}
	const id = setTimeout(fn, 0);
	return () => clearTimeout(id);
}

// --- debounce ---

/** Return fungsi debounced + method .cancel(). */
export function debounce<T extends (...args: Parameters<T>) => void>(
	fn: T,
	delay: number
): T & { cancel: () => void } {
	let tid: ReturnType<typeof setTimeout> | undefined;
	const debounced = (...args: Parameters<T>) => {
		clearTimeout(tid);
		tid = setTimeout(() => fn(...args), delay);
	};
	debounced.cancel = () => clearTimeout(tid);
	return debounced as T & { cancel: () => void };
}

// --- dedupe ---

const _inflight = new Map<string, Promise<unknown>>();

/** Panggilan identik yang masih pending → pakai Promise yang sama, bukan request baru. */
export function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
	if (_inflight.has(key)) return _inflight.get(key) as Promise<T>;
	// Promise.resolve().then(fn) memastikan sync throw dari fn() masuk rejected Promise,
	// sehingga .finally() selalu jalan dan key tidak tertinggal di Map selamanya.
	const p = Promise.resolve().then(fn).finally(() => _inflight.delete(key));
	_inflight.set(key, p);
	return p;
}

// --- createTaskQueue ---

/** Task queue serial: task berikut tunggu task sebelumnya selesai sebelum jalan. */
export function createTaskQueue() {
	let _chain = Promise.resolve();
	return {
		enqueue<T>(fn: () => Promise<T>): Promise<T> {
			return new Promise<T>((resolve, reject) => {
				_chain = _chain.then(() => fn().then(resolve, reject));
			});
		},
		flush(): Promise<void> {
			return _chain;
		},
	};
}

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
		if (e instanceof OfflineQueuedError) {
			toast.info(`Offline — ${e.label} disimpan dalam antrian`);
			opts.onAntri?.();
			return null;
		}
		const asli = e instanceof Error ? e.message : String(e);
		const pesan = typeof opts.errorPesan === 'function'
			? opts.errorPesan(asli)
			: (opts.errorPesan ?? petakanError(asli));
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
