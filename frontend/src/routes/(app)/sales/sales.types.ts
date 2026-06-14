export type KunjunganRow = {
  id: number
  pelanggan_id: number | null
  nama_warung: string
  alamat: string | null
  petugas_id: number | null
  nama_petugas: string | null
  tanggal: string
  tujuan: 'prospek' | 'follow_up' | 'pengiriman' | 'lainnya'
  hasil: string | null
  catatan: string | null
  status_tindak_lanjut: 'open' | 'selesai' | 'pending'
}

export type AgendaRow = {
  id: number
  supplier_id: number | null
  nama_supplier: string
  tipe: string
  tanggal: string
  jam: string | null
  lokasi: string | null
  nama_petugas: string | null
  hasil: string | null
  catatan: string | null
  status: 'dijadwalkan' | 'selesai' | 'dibatalkan'
}

export type PipelineRow = {
  id: number
  nama_pelanggan: string
  pelanggan_id: number | null
  nilai_estimasi: number
  tahap: string
  produk_minat: string | null
  catatan: string | null
  tanggal_masuk: string
  tanggal_update: string | null
  nama_petugas: string | null
}
