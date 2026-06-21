export type StatusMeja = 'kosong' | 'terisi' | 'reserved' | 'dibersihkan';

export type Meja = {
	id: number;
	kode_meja: string;
	nama: string | null;
	kapasitas: number;
	status: StatusMeja;
	is_active: boolean;
	cabang_id: number;
};

export type GrupModifier = {
	id: number;
	nama: string;
	wajib: boolean;
	min_pilih: number;
	max_pilih: number;
	modifiers: ModifierItem[];
};

export type ModifierItem = {
	id: number;
	grup_modifier_id: number;
	nama: string;
	harga_tambahan: number;
	is_active: boolean;
};

export type ModifierTerpilih = {
	modifier_id: number;
	nama_snapshot: string;
	harga_snapshot: number;
};

// Master (termasuk is_active) — dipakai halaman pengaturan modifier
export type GrupModifierMaster = {
	id: number;
	nama: string;
	wajib: boolean;
	min_pilih: number;
	max_pilih: number;
	is_active: boolean;
	modifiers: ModifierItem[];
};
