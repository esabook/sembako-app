export type PenjualanHari   = { total: number; jumlah_trx: number; rata_per_trx: number }
export type PenjualanSimple = { total: number; jumlah_trx: number }
export type Trend           = { tanggal: string; total: number; jumlah_trx: number }
export type AkunKas         = { id: number; nama: string; tipe: string; saldo: number }
export type StokKritis      = { id: number; kode_barang: string; nama_barang: string; stok_sekarang: number; stok_minimum: number }
export type StokPrediktif   = { id: number; nama_barang: string; stok_sekarang: number; satuan: string | null; avg_harian: number; hari_tersisa: number }
export type PiutangMacet    = { id: number; nama_pelanggan: string; kontak: string | null; sisa_piutang: number; tanggal_jatuh_tempo: string | null }
export type HutangJT        = { id: number; nama_supplier: string; sisa_hutang: number; tanggal_jatuh_tempo: string | null }
export type TopBarang       = { barang_id: number; nama_barang: string; total_qty: number; total_omset: number }
export type BelumAbsen      = { id: number; nama: string; role: string }

export type DashboardData = {
	today: string
	penjualan_hari_ini:   PenjualanHari | null
	penjualan_kemarin:    PenjualanSimple | null
	penjualan_30hari:     Trend[]
	saldo_kas:            { akun: AkunKas[]; total: number }
	stok_kritis:          StokKritis[]
	piutang_macet:        { list: PiutangMacet[]; total: number }
	hutang_jatuh_tempo:   { list: HutangJT[]; total: number }
	top_barang:           TopBarang[]
	belum_absen:          BelumAbsen[]
	ringkasan:            { total_piutang: number; total_hutang: number }
}
