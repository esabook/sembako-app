import type { StatusMetrik } from './budget.types'

// Format Rp tanpa desimal
export function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

// Persen realisasi terhadap target (0 jika target = 0)
export function pctRealisasi(realisasi: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(Math.round((realisasi / target) * 100), 999)
}

// Status traffic light untuk metrik penjualan (tinggi = bagus)
export function statusPenjualan(pct: number, adaTarget: boolean): StatusMetrik {
  if (!adaTarget) return 'kosong'
  if (pct >= 90) return 'aman'
  if (pct >= 70) return 'perhatian'
  return 'bahaya'
}

// Status traffic light untuk pengeluaran (tinggi vs budget = buruk)
export function statusPengeluaran(realisasi: number, budget: number): StatusMetrik {
  if (budget <= 0) return 'kosong'
  const pct = (realisasi / budget) * 100
  if (pct <= 90) return 'aman'
  if (pct <= 110) return 'perhatian'
  return 'bahaya'
}

// Warna CSS var berdasarkan status
export function warnaDariStatus(status: StatusMetrik): string {
  switch (status) {
    case 'aman': return 'var(--accent)'
    case 'perhatian': return 'var(--warn)'
    case 'bahaya': return 'var(--danger)'
    default: return 'var(--text-dim)'
  }
}

// Label status dalam Bahasa Indonesia
export function labelStatus(status: StatusMetrik): string {
  switch (status) {
    case 'aman': return 'AMAN'
    case 'perhatian': return 'PERHATIAN'
    case 'bahaya': return 'BAHAYA'
    default: return '—'
  }
}

// Bulan sebelumnya dalam format YYYY-MM
export function bulanSebelumnya(periode: string): string {
  const [y, m] = periode.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Bulan berikutnya dalam format YYYY-MM
export function bulanBerikutnya(periode: string): string {
  const [y, m] = periode.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Format YYYY-MM → nama bulan Indonesia
export function labelBulan(periode: string): string {
  const [y, m] = periode.split('-').map(Number)
  return new Date(y, m - 1, 1)
    .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

// Periode bulan ini
export function bulanIni(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 7)
}
