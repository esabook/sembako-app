export type TabKey =
  | 'laba-rugi'
  | 'arus-kas'
  | 'neraca'
  | 'aging'
  | 'budget-realisasi'
  | 'pajak-umkm'
  | 'margin-produk'
  | 'perbandingan'
  | 'persediaan'
  | 'top-pelanggan'
  | 'pembelian-supplier'
  | 'rekap-penggajian'
  | 'analitik-jam'

export type LabaRugi = {
  periode: { dari: string; sampai: string }
  penjualan: { bruto: number; diskon: number; bersih: number; jumlah_transaksi: number }
  hpp: number
  laba_kotor: number
  margin_kotor_persen: number
  biaya_operasional: { total: number; per_kategori: Record<string, number> }
  laba_bersih: number
  margin_bersih_persen: number
}

export type ArusKas = {
  periode: { dari: string; sampai: string }
  per_akun: {
    id: number; nama: string; tipe: string
    saldo_awal: number; masuk: number; keluar: number; net: number; saldo_akhir: number
  }[]
  per_kategori: Record<string, { masuk: number; keluar: number }>
  saldo_awal: number
  total_masuk: number
  total_keluar: number
  net: number
  saldo_akhir: number
}

export type AgingItem = { nama: string; sisa: number; hari: number; jatuh_tempo: string }
export type AgingBucket = { label: string; jumlah: number; total: number; items: AgingItem[] }
export type AgingData = {
  per_tanggal: string
  piutang: AgingBucket[]
  hutang: AgingBucket[]
  total_piutang: number
  total_hutang: number
}

export type Neraca = {
  per_tanggal: string
  aset: {
    kas_bank: { id: number; nama: string; tipe: string; saldo: number }[]
    total_kas_bank: number
    piutang_pelanggan: number
    nilai_persediaan: number
    total: number
  }
  liabilitas: { hutang_supplier: number; total: number }
  modal: { total: number }
  check: { aset: number; liabilitas_plus_modal: number; balanced: boolean }
}

export type BudgetRealisasi = {
  periode: string
  target: { target_omzet: number; target_transaksi: number; target_margin_pct: number } | null
  budgets: { kategori: string; nilai_budget: number }[]
  realisasi: {
    realisasi_omzet: number; realisasi_transaksi: number
    realisasi_margin_pct: number; realisasi_hpp: number
    realisasi_budget: Record<string, number>
  }
}

export type PajakUmkm = {
  tahun: string
  bulan: { periode: string; omset: number; pajak: number; jumlah_transaksi: number }[]
  total_omset: number
  total_pajak: number
}

export type MarginProduk = {
  periode: { dari: string; sampai: string }
  produk: {
    barang_id: number; nama_barang: string; kategori: string
    qty_terjual: number; jumlah_transaksi: number
    omset: number; hpp: number; margin: number; margin_pct: number
  }[]
  total_omset: number; total_hpp: number; total_margin: number; margin_pct_rata: number
}

export type Persediaan = {
  per_tanggal: string
  produk: { barang_id: number; nama_barang: string; kategori: string; stok: number; hpp: number; nilai_stok: number }[]
  total_nilai: number; jumlah_sku: number; sku_tanpa_stok: number
}

export type TopPelanggan = {
  periode: { dari: string; sampai: string }
  pelanggan: {
    pelanggan_id: number; nama: string; tipe: string; kontak: string | null
    jumlah_transaksi: number; total_omset: number; total_diskon: number; pct_omset: number
  }[]
  total_omset: number
}

export type PembelianSupplier = {
  periode: { dari: string; sampai: string }
  supplier: {
    supplier_id: number; nama_supplier: string; kontak: string | null
    jumlah_penerimaan: number; total_pembelian: number; pct_pembelian: number
  }[]
  total_pembelian: number
}

export type RekapPenggajian = {
  tahun: string
  bulan: {
    periode_bulan: string; jumlah_karyawan: number
    total_gaji_pokok: number; total_tunjangan: number; total_potongan: number; total_gaji: number
  }[]
  total_gaji_tahun: number
}

export type AnalitikJam = {
  dari: string
  sampai: string
  per_jam: { jam: string; jumlah_transaksi: number; omzet: number; rata_per_trx: number }[]
  jam_sibuk: string[]
  total_transaksi: number
  total_omzet: number
}
