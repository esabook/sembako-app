import type { Column } from '$lib/components/DataTable.svelte'
import { rupiah, tglStr } from '$lib/utils/format'
import type { Promo } from './promo.types'

export { rupiah, tglStr }

export const PROMO_COLUMNS: Column[] = [
  { key: 'nama', label: 'Nama', sortable: true, minWidth: 130 },
  { key: 'tipe', label: 'Tipe', sortable: true, priority: 2, minWidth: 90 },
  { key: 'nilai', label: 'Diskon', align: 'right', sortable: true, priority: 2, minWidth: 80 },
  { key: 'targets', label: 'Target', sortable: false, priority: 3 },
  { key: 'berlaku_mulai', label: 'Berlaku', sortable: true, priority: 3 },
  { key: 'aktif_status', label: 'Status', align: 'center', sortable: false },
  { key: 'aksi', label: '', align: 'right', sortable: false, hideable: false, minWidth: 80 },
]

export function badgeTipe(tipe: string): { label: string; color: string } {
  if (tipe === 'item') return { label: 'Per Barang', color: 'var(--info)' }
  if (tipe === 'kategori') return { label: 'Per Kategori', color: 'var(--warn)' }
  return { label: 'Min. Total', color: 'var(--accent)' }
}

export function isAktifHariIni(p: Promo): boolean {
  if (!p.aktif) return false
  const hari = new Date().toISOString().slice(0, 10)
  if (p.berlaku_mulai && p.berlaku_mulai > hari) return false
  if (p.berlaku_sampai && p.berlaku_sampai < hari) return false
  if (p.max_penggunaan !== null && p.jumlah_dipakai >= p.max_penggunaan) return false
  return true
}
