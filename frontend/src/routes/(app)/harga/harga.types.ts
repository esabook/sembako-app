export type BarangHarga = {
  id: number
  kode_barang: string
  nama_barang: string
  harga_beli_terakhir: number
  harga_jual_eceran: number
  harga_jual_grosir: number
  stok_sekarang: number
  nama_kategori: string | null
  singkatan_satuan: string | null
  margin_eceran: number | null
  margin_grosir: number | null
}

export type HistoriHarga = {
  id: number
  harga_eceran: number
  harga_grosir: number
  tanggal_berlaku: string
  tanggal_berakhir: string | null
  nama_ubah: string | null
}

export type PreviewMassal = {
  id: number
  kode_barang: string
  nama_barang: string
  harga_eceran_lama: number
  harga_grosir_lama: number
  harga_eceran_baru: number
  harga_grosir_baru: number
  margin_eceran_baru: number | null
}

export type Tab = 'daftar' | 'massal'
export type TipeMassal = 'persen' | 'rupiah'
