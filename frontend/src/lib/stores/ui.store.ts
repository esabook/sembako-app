import { writable, derived } from 'svelte/store';
import type { ToastItem, ToastTipe, AppError, LoadingState } from '$lib/types/error.types';

let _id = 0;
const nextId = () => ++_id;

// ── Toast ────────────────────────────────────────────────────────────────
const _toast = writable<ToastItem[]>([]);

function tambahToast(tipe: ToastTipe, pesan: string, durasi: number | null) {
	const id = nextId();
	_toast.update((list) => [...list, { id, tipe, pesan, durasi }]);
	if (durasi !== null) {
		setTimeout(() => hapusToast(id), durasi);
	}
	return id;
}

function hapusToast(id: number) {
	_toast.update((list) => list.filter((t) => t.id !== id));
}

export const toast = {
	subscribe: _toast.subscribe,
	sukses: (pesan: string) => tambahToast('sukses', pesan, 3000),
	error: (pesan: string) => tambahToast('error', pesan, null),
	warn: (pesan: string) => tambahToast('warn', pesan, 5000),
	info: (pesan: string) => tambahToast('info', pesan, 3000),
	hapus: hapusToast,
};

// ── Loading ──────────────────────────────────────────────────────────────
const _loading = writable<LoadingState[]>([]);

export const loading = {
	subscribe: _loading.subscribe,
	mulai: (key: string, pesan = 'Memuat...') =>
		_loading.update((list) =>
			list.some((l) => l.key === key) ? list : [...list, { key, pesan }]
		),
	selesai: (key: string) =>
		_loading.update((list) => list.filter((l) => l.key !== key)),
};

// true jika ada minimal 1 operasi loading berjalan
export const adaLoading = derived(_loading, ($l) => $l.length > 0);

// pesan loading yang paling baru (untuk ditampilkan di LoadingBar)
export const pesanLoading = derived(_loading, ($l) =>
	$l.length > 0 ? $l[$l.length - 1].pesan : ''
);

// ── Errors ───────────────────────────────────────────────────────────────
const _errors = writable<AppError[]>([]);

export const errors = {
	subscribe: _errors.subscribe,
	tambah: (e: Omit<AppError, 'id' | 'waktu'>) => {
		const err: AppError = { ...e, id: nextId(), waktu: new Date() };
		_errors.update((list) => [...list, err]);
		return err.id;
	},
	hapus: (id: number) =>
		_errors.update((list) => list.filter((e) => e.id !== id)),
	bersihkan: () => _errors.set([]),
};
