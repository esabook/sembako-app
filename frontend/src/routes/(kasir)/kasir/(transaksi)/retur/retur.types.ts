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

export type ReturListItem = {
	id: number
	no_retur: string
	penjualan_id: number
	no_transaksi: string | null
	tanggal: string
	total_retur: number
	alasan: string | null
	metode_refund: MetodeRefund
	kasir_nama: string | null
}

export type PenjualanDetail = {
	id: number
	no_transaksi: string
	tanggal: string
	total: number
	metode_bayar: string
	status: string
	pelanggan_id: number | null
	items: PenjualanItem[]
}

export type PenjualanItem = {
	id: number
	barang_id: number
	nama_barang: string
	kode_barang: string
	satuan_id: number | null
	jumlah: number
	harga_jual: number
	diskon_item: number
	subtotal: number
}

export type SisaItem = {
	barang_id: number
	jumlah_asal: number
	sudah_diretur: number
	sisa: number
}

export type BarangCari = {
	id: number
	nama_barang: string
	kode_barang: string
	harga_jual_eceran: number
	stok_sekarang: number
	satuan_dasar_id: number | null
	nama_satuan: string | null
}

export type ItemTukarForm = {
	barang_id: number
	nama_barang: string
	kode_barang: string
	satuan_id: number | null
	jumlah: number
	harga_jual: number
}

export type KasBank = { id: number; nama: string; tipe: 'kas' | 'bank' }

export type ItemRetur = PenjualanItem & {
	dipilih: boolean
	jumlah_retur: number
}

export type MetodeRefund = 'tunai' | 'kurang_piutang' | 'tukar_barang'
