// Tipe terpusat untuk sistem error, loading, dan toast.
// Dipakai oleh ui.store.ts dan withLoading() di utils/async.ts.

export type ToastTipe = 'sukses' | 'error' | 'warn' | 'info';

export interface ToastItem {
	id: number;
	tipe: ToastTipe;
	pesan: string;
	// null = tidak hilang otomatis (harus ditutup manual)
	durasi: number | null;
}

export interface AppError {
	id: number;
	pesan: string; // pesan ramah untuk user (sudah dipetakan)
	asli: string; // pesan teknis asli (untuk log)
	modul: string;
	aksi: string;
	waktu: Date;
	bisaRetry: boolean;
	// dipanggil ulang saat user klik retry; null jika tidak bisa retry
	retry: (() => void) | null;
}

export interface LoadingState {
	// key unik per operasi → boleh ada beberapa loading paralel
	key: string;
	pesan: string;
}

export interface WithLoadingOpts {
	loadingKey: string;
	loadingPesan?: string;
	modul: string;
	aksi: string;
	errorPesan?: string;
	bisaRetry?: boolean;
	suksesOtomatis?: boolean;
	suksesPesan?: string;
}
