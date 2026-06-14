import type { KunjunganRow } from './sales.types.js'

export const TUJUAN_LABEL: Record<KunjunganRow['tujuan'], string> = {
  prospek: 'Prospek',
  follow_up: 'Follow Up',
  pengiriman: 'Pengiriman',
  lainnya: 'Lainnya',
}

export const STATUS_K_COLOR: Record<KunjunganRow['status_tindak_lanjut'], string> = {
  open: 'var(--warn)',
  selesai: 'var(--accent)',
  pending: 'var(--text-dim)',
}

export const STATUS_A_COLOR: Record<string, string> = {
  dijadwalkan: 'var(--info)',
  selesai: 'var(--accent)',
  dibatalkan: 'var(--danger)',
}

export const TAHAP_ORDER = ['prospek', 'dikunjungi', 'penawaran', 'negosiasi', 'deal', 'batal']

export const TAHAP_COLOR: Record<string, string> = {
  prospek: '#6b7280',
  dikunjungi: '#3b82f6',
  penawaran: '#f59e0b',
  negosiasi: '#8b5cf6',
  deal: '#10b981',
  batal: '#ef4444',
}
