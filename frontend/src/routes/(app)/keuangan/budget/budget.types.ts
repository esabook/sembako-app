export type KategoriBudget = 'gaji' | 'sewa' | 'listrik' | 'kemasan' | 'operasional' | 'lain'

export const KATEGORI_LABEL: Record<KategoriBudget, string> = {
  gaji: 'Gaji Karyawan',
  sewa: 'Sewa Toko',
  listrik: 'Listrik & Air',
  kemasan: 'Kemasan & Bahan',
  operasional: 'Operasional',
  lain: 'Lain-lain',
}

export const SEMUA_KATEGORI: KategoriBudget[] = ['gaji', 'sewa', 'listrik', 'kemasan', 'operasional', 'lain']

export interface TargetPenjualan {
  id: number
  periode_bulan: string
  target_omzet: number
  target_transaksi: number
  target_margin_pct: number
  catatan: string | null
}

export interface BudgetOperasional {
  id: number
  periode_bulan: string
  kategori: KategoriBudget
  nilai_budget: number
  catatan: string | null
}

export interface DataPeriode {
  target: TargetPenjualan | null
  budgets: BudgetOperasional[]
}

export interface Realisasi {
  periode: string
  realisasi_omzet: number
  realisasi_transaksi: number
  realisasi_margin_pct: number
  realisasi_hpp: number
  realisasi_budget: Record<string, number>
}

export interface Proyeksi {
  periode: string
  hari_sekarang: number
  hari_dalam_bulan: number
  omzet_saat_ini: number
  proyeksi_omzet: number
}

export interface RingkasanHistori {
  periode: string
  target: TargetPenjualan | null
  realisasi: { omzet: number; transaksi: number }
}

// AMAN / PERHATIAN / BAHAYA untuk progress penjualan (semakin besar makin baik)
// Terbalik untuk pengeluaran (semakin besar vs budget makin buruk)
export type StatusMetrik = 'aman' | 'perhatian' | 'bahaya' | 'kosong'
