export type PromoTarget = {
  id?: number
  target_tipe: 'barang' | 'kategori'
  target_id: number
  nama?: string
}

export type Promo = {
  id: number
  nama: string
  deskripsi: string | null
  tipe: 'item' | 'kategori' | 'total'
  nilai: number
  tipe_nilai: 'persen' | 'rupiah'
  min_qty: number
  min_total: number
  berlaku_mulai: string | null
  berlaku_sampai: string | null
  max_penggunaan: number | null
  jumlah_dipakai: number
  aktif: boolean
  targets: { target_tipe: 'barang' | 'kategori'; target_id: number }[]
}

export type BarangOption = {
  id: number
  kode_barang: string
  nama_barang: string
  kategori_id: number | null
}

export type KategoriOption = {
  id: number
  nama: string
}

export type FormPromo = {
  nama: string
  deskripsi: string
  tipe: 'item' | 'kategori' | 'total'
  nilai: string
  tipe_nilai: 'persen' | 'rupiah'
  min_qty: string
  min_total: string
  berlaku_mulai: string
  berlaku_sampai: string
  max_penggunaan: string
}
