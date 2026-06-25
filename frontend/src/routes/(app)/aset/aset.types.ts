export type AsetRow = {
  id: number
  nama: string
  kategori: string
  nilai_beli: number
  nilai_sekarang: number
  tanggal_beli: string | null
  kondisi: 'baik' | 'rusak_ringan' | 'rusak_berat' | 'dijual' | 'dibuang'
  lokasi: string | null
  catatan: string | null
  is_active: boolean
  created_at: string | null
}

export type TagihanRow = {
  id: number
  jenis: 'listrik' | 'air' | 'internet' | 'lainnya'
  periode_bulan: string
  jumlah: number
  tanggal_bayar: string | null
  meter_awal: number | null
  meter_akhir: number | null
  catatan: string | null
}
