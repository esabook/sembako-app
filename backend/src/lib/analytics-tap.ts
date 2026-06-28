// ── Analytics Tap ──────────────────────────────────────────────────────────
// Forward event bus SOP → log_aktivitas (modul='analytics') sebagai event store
// product/usage analytics. First-party, offline: tidak ada SaaS/telemetry luar.
//
// Reuse: bus.register (fire-and-forget, error tidak propagate) + tabel
// log_aktivitas. Panggil initAnalyticsTap() SEKALI saat startup (di index.ts),
// setelah initHooks().

import { db } from '../db/index.ts';
import { log_aktivitas } from '../db/schema.ts';
import { bus } from './event-bus.ts';

// Insert ringan ke event store. karyawan_id boleh null (event tanpa aktor,
// mis. stok.kritis). Gagal log TIDAK BOLEH menghentikan operasi utama.
async function rekam(
	aksi: string,
	referensi_id: number | null,
	detail: Record<string, unknown> | null,
	karyawan_id: number | null = null
): Promise<void> {
	try {
		await db.insert(log_aktivitas)
			.values({
				karyawan_id,
				aksi,
				modul: 'analytics',
				referensi_id,
				detail_json: detail
			})
			.run();
	} catch {
		// swallow — analytics tidak boleh ganggu alur bisnis
	}
}

export function initAnalyticsTap(): void {
	bus.register('checkout', ({ penjualan_id, total, kasir_id, items }) => {
		void rekam('checkout', penjualan_id, { total, item_count: items.length }, kasir_id);
	});

	bus.register('barang_masuk', ({ barang_masuk_id, supplier_id }) => {
		void rekam('barang_masuk', barang_masuk_id, { supplier_id });
	});

	bus.register('stok.kritis', ({ barang_id, nama, stok, minimum }) => {
		void rekam('stok_kritis', barang_id, { nama, stok, minimum });
	});

	bus.register('absensi.masuk', ({ karyawan_id }) => {
		void rekam('absensi_masuk', null, null, karyawan_id);
	});

	bus.register('absensi.pulang', ({ absensi_id, karyawan_id }) => {
		void rekam('absensi_pulang', absensi_id, null, karyawan_id);
	});

	bus.register('approval.disetujui', ({ approval_id, referensi_tipe, diproses_oleh }) => {
		void rekam('approval_disetujui', approval_id, { referensi_tipe }, diproses_oleh);
	});

	bus.register('approval.ditolak', ({ approval_id, referensi_tipe, diproses_oleh }) => {
		void rekam('approval_ditolak', approval_id, { referensi_tipe }, diproses_oleh);
	});
}
