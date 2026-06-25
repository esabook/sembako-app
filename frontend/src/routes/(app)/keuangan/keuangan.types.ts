export type TabKey = 'hutang' | 'piutang' | 'jurnal' | 'kasbank' | 'budget' | 'pinjaman'

export type StatusBayar = 'belum' | 'sebagian' | 'lunas'
export type FilterStatus = 'semua' | 'belum' | 'sebagian' | 'lunas'

export type Hutang = {
  id: number
  supplier_id: number
  nama_supplier: string
  barang_masuk_id: number
  tanggal_hutang: string
  tanggal_jatuh_tempo: string | null
  total_hutang: number
  sisa_hutang: number
  status: StatusBayar
}

export type Piutang = {
  id: number
  pelanggan_id: number
  nama_pelanggan: string
  penjualan_id: number
  no_transaksi: string
  tanggal_piutang: string
  tanggal_jatuh_tempo: string | null
  total_piutang: number
  sisa_piutang: number
  status: StatusBayar
}

export type Jurnal = {
  id: number
  tanggal: string
  kas_bank_id: number
  nama_akun: string
  jenis: 'masuk' | 'keluar'
  kategori: string
  keterangan: string | null
  jumlah: number
  referensi_tipe: string | null
  referensi_id: number | null
}

export type KasBank = {
  id: number
  nama: string
  tipe: 'kas' | 'bank'
  saldo_awal: number
}

export type KasBankSaldo = KasBank & {
  total_masuk: number
  total_keluar: number
  saldo: number
}

export type PinjamanRow = {
  id: number
  tipe: 'pinjaman' | 'investasi'
  nama: string
  jumlah_pokok: number
  bunga_persen: number
  cicilan_per_bulan: number
  tanggal_mulai: string
  jatuh_tempo: string | null
  sisa_pokok: number
  status: 'aktif' | 'lunas' | 'macet'
  catatan: string | null
}

export type BayarForm = { jumlah_bayar: number; kas_bank_id: number; tanggal_bayar: string }

export type JurnalForm = {
  kas_bank_id: number
  jenis: 'masuk' | 'keluar'
  kategori: string
  keterangan: string
  jumlah: number
  tanggal: string
}

export type KasBankForm = { nama: string; tipe: 'kas' | 'bank'; saldo_awal: number }
