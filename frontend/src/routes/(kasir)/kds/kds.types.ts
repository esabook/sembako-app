export type StatusKds = 'pending' | 'cooking' | 'served' | 'cancelled';

export type KdsItem = {
	id: number; // penjualan_detail.id
	penjualan_id: number;
	no_transaksi: string;
	meja_kode: string | null;
	barang_nama: string;
	jumlah: number;
	catatan: string | null;
	status_kds: StatusKds;
	modifiers: string[]; // nama_snapshot list
	created_at: string; // ISO
};
