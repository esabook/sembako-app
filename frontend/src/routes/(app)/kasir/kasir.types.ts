// Re-export tipe dari store inti agar modul kasir bisa import dari 1 tempat
export type { ItemKeranjang, MetodeBayar, TipeTransaksi } from '$lib/stores/kasir';

export type BarangResult = {
	id: number;
	kode_barang: string;
	nama_barang: string;
	kategori_id: number | null;
	harga_jual_eceran: number;
	harga_jual_grosir: number;
	stok_sekarang: number;
	satuan_dasar_id: number | null;
	singkatan_satuan: string | null;
	foto_path: string | null;
};

export type PelangganResult = {
	id: number;
	nama: string;
	kontak: string | null;
	saldo_piutang: number;
	gender: 'pria' | 'wanita' | null;
	no_kartu: string | null;
	tier: 'reguler' | 'silver' | 'gold' | null;
	diskon_member: number | null;
};

export type ScannerStatus = 'idle' | 'connected' | 'disconnected';

export type PromoAktif = {
	id: number;
	nama: string;
	tipe: 'item' | 'kategori' | 'total';
	nilai: number;
	tipe_nilai: 'persen' | 'rupiah';
	min_qty: number;
	min_total: number;
	targets: { target_tipe: 'barang' | 'kategori'; target_id: number }[];
};

export type Snap = {
	items: import('$lib/stores/kasir').ItemKeranjang[];
	subtotal: number;
	diskon: number;
	total: number;
	metode: import('$lib/stores/kasir').MetodeBayar;
	nominal: number;
	kembalian: number;
	pelanggan: PelangganResult | null;
	tipe: import('$lib/stores/kasir').TipeTransaksi;
	noTransaksi: string;
	waktu: Date;
};
