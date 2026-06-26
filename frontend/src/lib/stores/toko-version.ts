import { writable } from 'svelte/store';

// Dibump tiap identitas toko berubah (nama_toko dll via /pengaturan/bulk).
// Konsumen: layout namaToko (/pengaturan/publik) & NavUser konteksList
// (/auth/accessible-context) — refetch saat versi naik agar tidak stale.
export const tokoVersion = writable(0);

export function invalidateToko() {
	tokoVersion.update((v) => v + 1);
}
