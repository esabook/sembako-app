export const STATUS_COLOR: Record<string, string> = {
  persiapan: '#f59e0b', konfirmasi: '#3b82f6', selesai: '#10b981', batal: '#6b7280',
}

export const STATUS_LABEL: Record<string, string> = {
  persiapan: 'Persiapan', konfirmasi: 'Konfirmasi', selesai: 'Selesai', batal: 'Batal',
}

export const STATUS_LIST = ['persiapan', 'konfirmasi', 'selesai', 'batal'] as const

export function fmt(n: number) {
  return n.toLocaleString('id-ID')
}
