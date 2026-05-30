export type ReturDetail = {
	id: number
	no_retur: string
	no_transaksi: string | null
	tanggal: string
	total_retur: number
	alasan: string | null
	metode_refund: string
	catatan: string | null
	kasir_nama: string | null
	items: {
		barang_id: number
		nama_barang: string
		kode_barang: string
		nama_satuan: string | null
		jumlah_retur: number
		harga_jual: number
		subtotal: number
	}[]
	tukar_items: {
		barang_id: number
		nama_barang: string
		kode_barang: string
		nama_satuan: string | null
		jumlah: number
		harga_jual: number
		subtotal: number
	}[]
}
