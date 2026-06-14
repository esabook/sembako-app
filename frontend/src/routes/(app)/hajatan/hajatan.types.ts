export type Acara = {
  id: number; nama_acara: string; nama_penyelenggara: string
  pelanggan_id: number | null; tanggal_acara: string
  alamat: string | null; estimasi_tamu: number | null
  catatan: string | null; status: string; total_order: number
}
