import type { Column } from '$lib/components/DataTable.svelte'

export function hariIni(): string {
  return new Date().toLocaleDateString('sv-SE')
}

export function fmt(n: number): string {
  return new Intl.NumberFormat('id-ID').format(n)
}

export function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)
}

export function tglFmt(t: string | null): string {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function isJatuhTempo(tgl: string | null): boolean {
  if (!tgl) return false
  return new Date(tgl) < new Date()
}

export function statusBadge(s: string): string {
  if (s === 'lunas') return 'color:var(--accent)'
  if (s === 'sebagian') return 'color:var(--warn)'
  return 'color:var(--danger)'
}

// ── Kolom DataTable ──────────────────────────────────────────────────────────

export const kolHutang: Column[] = [
  { key: 'nama_supplier',       label: 'Supplier',     minWidth: 120 },
  { key: 'tanggal_hutang',      label: 'Tgl Hutang',   width: 100, priority: 2 },
  { key: 'tanggal_jatuh_tempo', label: 'Jatuh Tempo',  width: 110 },
  { key: 'total_hutang',        label: 'Total',        width: 110, align: 'right', priority: 3 },
  { key: 'sisa_hutang',         label: 'Sisa',         width: 110, align: 'right' },
  { key: 'status_hutang',       label: 'Status',       width: 90 },
  { key: 'aksi_hutang',         label: '',             width: 70, sortable: false, hideable: false },
]

export const kolPiutang: Column[] = [
  { key: 'nama_pelanggan',      label: 'Pelanggan',    minWidth: 120 },
  { key: 'no_transaksi',        label: 'No Trx',       width: 110, priority: 3 },
  { key: 'tanggal_piutang',     label: 'Tgl Piutang',  width: 100, priority: 2 },
  { key: 'tanggal_jatuh_tempo', label: 'Jatuh Tempo',  width: 110 },
  { key: 'total_piutang',       label: 'Total',        width: 110, align: 'right', priority: 3 },
  { key: 'sisa_piutang',        label: 'Sisa',         width: 110, align: 'right' },
  { key: 'status_piutang',      label: 'Status',       width: 90 },
  { key: 'aksi_piutang',        label: '',             width: 70, sortable: false, hideable: false },
]

export const kolJurnal: Column[] = [
  { key: 'tanggal',    label: 'Tanggal',   width: 100, priority: 2 },
  { key: 'nama_akun',  label: 'Akun',      width: 110, priority: 2 },
  { key: 'jenis',      label: 'Jenis',     width: 90 },
  { key: 'kategori',   label: 'Kategori',  width: 110, priority: 3 },
  { key: 'keterangan', label: 'Keterangan', minWidth: 100, priority: 3 },
  { key: 'jumlah',     label: 'Jumlah',    width: 120, align: 'right' },
]
