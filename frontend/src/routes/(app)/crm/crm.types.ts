export type PermintaanRow = {
  id: number; pelanggan_id: number|null; nama_pelanggan: string|null
  nama_barang: string; barang_id: number|null; qty_minta: number|null
  catatan: string|null; status: 'menunggu'|'tersedia'|'tidak_tersedia'
  tanggal: string; nama_petugas: string|null
}

export type KomplainRow = {
  id: number; pelanggan_id: number|null; nama_pelanggan: string|null
  kategori: string; deskripsi: string; tanggal: string
  status: 'masuk'|'diproses'|'selesai'|'ditolak'
  resolusi: string|null; nama_petugas: string|null
}
