export type Pelanggan = {
	id: number;
	kode_pelanggan: string;
	nama: string;
	gender: 'pria' | 'wanita' | null;
	tipe: 'eceran' | 'grosir' | 'langganan';
	kontak: string | null;
	alamat: string | null;
	limit_piutang: number;
	saldo_piutang: number;
	is_active: boolean;
	kartu_id: number | null;
	no_kartu: string | null;
	tier: 'reguler' | 'silver' | 'gold' | null;
	poin: number | null;
	diskon_member: number | null;
};

export type KartuResult = {
	id: number;
	no_kartu: string;
	tier: 'reguler' | 'silver' | 'gold';
	diskon_member: number;
	poin: number;
};

export const TIER_COLOR: Record<string, string> = {
	reguler: 'color:var(--text-dim)',
	silver: 'color:#b0b8c1',
	gold: 'color:#f5c518'
};

export const TIER_LABEL: Record<string, string> = {
	reguler: 'Reguler',
	silver: 'Silver',
	gold: 'Gold'
};

export function genderSymbol(g: string | null) {
	if (g === 'pria') return '♂';
	if (g === 'wanita') return '♀';
	return '';
}

export function genderColor(g: string | null) {
	if (g === 'pria') return 'color:#40c4ff';
	if (g === 'wanita') return 'color:#ff80ab';
	return 'color:var(--text-dim)';
}

export function rupiah(n: number) {
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		maximumFractionDigits: 0
	}).format(n);
}
