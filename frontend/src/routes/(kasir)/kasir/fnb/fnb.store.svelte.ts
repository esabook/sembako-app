import { withLoading } from '$lib/utils/async';
import { dedupe } from '$lib/utils/async';
import * as api from './fnb.api';
import type { Meja, StatusMeja } from './fnb.types';

export function createMejaStore() {
	let meja = $state<Meja[]>([]);
	let loading = $state(false);

	async function muat() {
		const hasil = await withLoading(() => dedupe('fnb-meja', api.fetchMeja), {
			loadingKey: 'fnb-meja-muat',
			modul: 'fnb',
			aksi: 'muat-meja',
			errorPesan: 'Gagal memuat data meja',
		});
		if (hasil) meja = hasil;
	}

	async function ubahStatus(id: number, status: StatusMeja) {
		// optimistic update
		const prev = meja.map((m) => ({ ...m }));
		meja = meja.map((m) => (m.id === id ? { ...m, status } : m));

		const ok = await withLoading(() => api.updateStatusMeja(id, status), {
			loadingKey: `fnb-meja-status-${id}`,
			modul: 'fnb',
			aksi: 'ubah-status-meja',
			errorPesan: 'Gagal ubah status meja',
		});
		if (!ok) meja = prev; // rollback on error
	}

	return {
		get meja() { return meja; },
		get loading() { return loading; },
		muat,
		ubahStatus,
	};
}
