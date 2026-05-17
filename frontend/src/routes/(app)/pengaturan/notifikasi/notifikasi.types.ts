export type JenisNotifikasi =
  | 'stok_habis'
  | 'stok_kritis'
  | 'barang_kadaluarsa'
  | 'hutang_jatuh_tempo'
  | 'piutang_macet'
  | 'void_transaksi'
  | 'diskon_tinggi'
  | 'selisih_kas'
  | 'ringkasan_harian'
  | 'ringkasan_mingguan'

export type NotifikasiConfig = {
  id: number | null
  jenis: JenisNotifikasi
  label: string
  deskripsi: string
  aktif: boolean
  channel: 'wa' | 'dashboard' | 'keduanya'
  threshold: number | null
  jam_kirim: string | null
  hari_kirim: number | null
  penerima_wa: string | null
  terakhir_dikirim: string | null
}

export type NotifikasiLog = {
  id: number
  jenis: string
  channel: 'wa' | 'dashboard'
  pesan: string
  penerima: string | null
  status: 'terkirim' | 'gagal' | 'pending'
  waktu: string
  referensi_tipe: string | null
  referensi_id: number | null
}

export type AlertCheck = {
  jenis: string
  pesan: string
  referensi_tipe: string
  referensi_id: number
}

// Jenis yang butuh field threshold
export const JENIS_THRESHOLD: Partial<Record<JenisNotifikasi, string>> = {
  barang_kadaluarsa: 'hari sebelum kadaluarsa',
  hutang_jatuh_tempo: 'hari sebelum jatuh tempo',
  piutang_macet: 'hari setelah jatuh tempo',
  diskon_tinggi: '% batas diskon',
}

// Jenis scheduled (butuh jam/hari)
export const JENIS_SCHEDULED: JenisNotifikasi[] = ['ringkasan_harian', 'ringkasan_mingguan']

export const HARI_LABEL = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
