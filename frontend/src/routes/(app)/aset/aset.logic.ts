import type { AsetRow, TagihanRow } from './aset.types.js'

export const KONDISI_LABEL: Record<AsetRow['kondisi'], string> = {
  baik: 'Baik', rusak_ringan: 'Rusak Ringan', rusak_berat: 'Rusak Berat',
  dijual: 'Dijual', dibuang: 'Dibuang',
}

export const KONDISI_COLOR: Record<AsetRow['kondisi'], string> = {
  baik: 'var(--accent)', rusak_ringan: 'var(--warn)', rusak_berat: 'var(--danger)',
  dijual: 'var(--text-dim)', dibuang: 'var(--text-dim)',
}

export const KATEGORI_LIST = ['Elektronik', 'Kendaraan', 'Peralatan', 'Mesin', 'Furnitur', 'Lainnya']

export const JENIS_LABEL: Record<TagihanRow['jenis'], string> = {
  listrik: 'Listrik', air: 'Air', internet: 'Internet', lainnya: 'Lainnya',
}

export const JENIS_ICON: Record<TagihanRow['jenis'], string> = {
  listrik: '⚡', air: '💧', internet: '🌐', lainnya: '📋',
}

export function rp(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}
