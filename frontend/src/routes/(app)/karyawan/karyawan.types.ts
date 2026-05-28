export type Tab = 'data' | 'absensi' | 'penggajian' | 'kasbon' | 'jadwal' | 'performa'

export type Karyawan = {
  id: number
  kode_karyawan: string
  nama: string
  role: string
  username: string
  gaji_pokok: number
  tipe_gaji: string
  kontak: string | null
  foto_path: string | null
  is_active: boolean
}

export type AbsensiRow = {
  id: number
  karyawan_id: number
  nama_karyawan: string
  tanggal: string
  jam_masuk: string | null
  jam_keluar: string | null
  shift: string | null
  status: 'hadir' | 'izin' | 'sakit' | 'alpa'
  terlambat_menit: number | null
}

export type RealtimeRow = {
  id: number
  karyawan_id: number
  nama_karyawan: string
  jam_masuk: string | null
  terlambat_menit: number | null
}

export type RekapRow = {
  karyawan_id: number
  nama_karyawan: string
  hadir: number
  izin: number
  sakit: number
  alpa: number
  total: number
}

export type PenggajianRow = {
  id: number
  karyawan_id: number
  nama_karyawan: string
  tipe_gaji: string
  periode_bulan: string
  hari_kerja: number
  hari_hadir: number
  gaji_pokok: number
  tunjangan: number
  potongan_kasbon: number
  potongan_lain: number
  total_gaji: number
  status: 'draft' | 'approved' | 'dibayar'
}

export type KasBank = { id: number; nama: string; tipe: string }

export type KasbonStatus = 'pengajuan' | 'disetujui' | 'ditolak' | 'aktif' | 'lunas'

export type KasbonRow = {
  id: number
  karyawan_id: number
  nama_karyawan: string
  tanggal_pinjam: string
  tanggal_cair: string | null
  jumlah: number
  cicilan_per_bulan: number
  sisa_kasbon: number
  status: KasbonStatus
  catatan: string | null
}

export type JadwalCicilan = {
  bulan_ke: number
  bulan: string
  jumlah_cicil: number
  sudah_lunas: boolean
}

export type TipeShift = {
  id: number
  nama: string
  jam_mulai: string
  jam_selesai: string
  warna: string
}

export type JadwalRow = {
  id: number
  karyawan_id: number
  nama_karyawan: string
  tipe_shift_id: number
  nama_shift: string
  jam_mulai: string
  jam_selesai: string
  warna: string
  tanggal: string
  catatan: string | null
}

export type TukarRow = {
  id: number
  pengaju_id: number
  nama_pengaju: string
  penerima_id: number
  nama_penerima: string
  jadwal_id: number
  jadwal_penerima_id: number | null
  tanggal_jadwal: string
  nama_shift: string
  alasan: string | null
  status: 'menunggu' | 'disetujui' | 'ditolak'
  created_at: string
}

export type PerformaRingkasan = {
  id: number
  nama: string
  total_shift: number
  shift_ditutup: number
  total_transaksi: number
  total_penjualan: number
  avg_penjualan_per_shift: number
  avg_transaksi_per_shift: number
  rata_per_trx: number
  trx_per_jam: number
  avg_durasi_menit: number
  total_void: number
  void_rate_pct: number
  avg_selisih_kas: number
  absensi: { hadir: number; alpa: number }
}

export type PerShift = {
  id: number
  tanggal: string
  jam_buka: string
  jam_tutup: string | null
  durasi_menit: number
  jumlah_transaksi: number
  total_penjualan: number
  trx_per_jam: number | null
  rata_per_trx: number
  selisih_kas: number | null
  status: 'buka' | 'tutup'
}

export type PerformaDetail = {
  karyawan: { id: number; nama: string; role: string }
  bulan: string
  ringkasan: {
    total_shift: number
    shift_ditutup: number
    total_transaksi: number
    total_penjualan: number
    avg_penjualan_per_shift: number
    avg_transaksi_per_shift: number
    rata_per_trx: number
    avg_durasi_menit: number
    total_void: number
    void_rate_pct: number
  }
  per_shift: PerShift[]
  absensi: { hadir: number; izin: number; sakit: number; alpa: number }
}
