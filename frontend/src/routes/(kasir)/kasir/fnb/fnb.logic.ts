import type { GrupModifier, ModifierTerpilih } from './fnb.types';

export function validasiModifier(
	grupList: GrupModifier[],
	terpilih: Map<number, ModifierTerpilih[]>
): string | null {
	for (const grup of grupList) {
		const pilihan = terpilih.get(grup.id) ?? [];
		if (grup.wajib && pilihan.length < 1) return `"${grup.nama}" wajib dipilih`;
		if (pilihan.length < grup.min_pilih) return `"${grup.nama}" minimal ${grup.min_pilih} pilihan`;
		if (pilihan.length > grup.max_pilih) return `"${grup.nama}" maksimal ${grup.max_pilih} pilihan`;
	}
	return null;
}

export function totalHargaModifier(terpilih: Map<number, ModifierTerpilih[]>): number {
	let total = 0;
	for (const items of terpilih.values()) {
		for (const m of items) total += m.harga_snapshot;
	}
	return total;
}

export function flattenModifier(terpilih: Map<number, ModifierTerpilih[]>): ModifierTerpilih[] {
	return Array.from(terpilih.values()).flat();
}
