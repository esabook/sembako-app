import { writable, derived, get } from 'svelte/store'

// ── Mode kasir ────────────────────────────────────────────────────────────────
// Tersimpan di localStorage supaya persist antar session di device yang sama.
// Manual override mengalahkan auto-detect sampai direset.

export type KasirMode = 'guided' | 'normal' | 'pro'

function loadTrxCount(): number {
  try { return parseInt(localStorage.getItem('kasir_trx_count') ?? '0') || 0 } catch { return 0 }
}

function modeFromCount(n: number): KasirMode {
  if (n <= 50) return 'guided'
  if (n <= 200) return 'normal'
  return 'pro'
}

export const kasirTrxCount = writable<number>(0)
export const kasirModeOverride = writable<KasirMode | null>(null)
export const kasirMode = derived(
  [kasirTrxCount, kasirModeOverride],
  ([$count, $override]) => $override ?? modeFromCount($count)
)

export function initKasirMode() {
  const n = loadTrxCount()
  kasirTrxCount.set(n)
  try {
    const ov = localStorage.getItem('kasir_mode_override') as KasirMode | null
    if (ov && ['guided', 'normal', 'pro'].includes(ov)) kasirModeOverride.set(ov)
  } catch { /* ignore */ }
}

export function incrementTrxCount() {
  kasirTrxCount.update((n) => {
    const next = n + 1
    try { localStorage.setItem('kasir_trx_count', String(next)) } catch { /* ignore */ }
    return next
  })
}

export function setModeOverride(mode: KasirMode | null) {
  kasirModeOverride.set(mode)
  try {
    if (mode) localStorage.setItem('kasir_mode_override', mode)
    else localStorage.removeItem('kasir_mode_override')
  } catch { /* ignore */ }
}

export type ItemKeranjang = {
  barang_id: number
  tipe_harga: 'eceran' | 'grosir'
  kode_barang: string
  nama_barang: string
  satuan_id: number | null
  singkatan_satuan: string
  jumlah: number
  harga_jual: number
  harga_eceran: number
  harga_grosir: number
  diskon_item: number
  stok_sekarang: number
  foto_path?: string | null
}

export type TipeTransaksi = 'eceran' | 'grosir'
export type MetodeBayar = 'tunai' | 'transfer' | 'qris' | 'hutang'

export const keranjang = writable<ItemKeranjang[]>([])
export const tipeTransaksi = writable<TipeTransaksi>('eceran')
export const metodeBayar = writable<MetodeBayar>('tunai')
export type PelangganDipilih = {
  id: number; nama: string; kontak: string | null; saldo_piutang: number
  gender: 'pria' | 'wanita' | null
  no_kartu: string | null
  tier: 'reguler' | 'silver' | 'gold' | null
  diskon_member: number | null
}
export const pelangganDipilih = writable<PelangganDipilih | null>(null)
export const nominalBayar = writable<number>(0)
export const itemAktifIdx = writable<number>(-1)

export const subtotal = derived(keranjang, ($k) =>
  $k.reduce((s, i) => s + i.harga_jual * i.jumlah, 0)
)

export const diskonTotal = derived(keranjang, ($k) =>
  $k.reduce((s, i) => s + i.diskon_item, 0)
)

// diskon_member (%) dari pelanggan dipotong dari subtotal
export const diskonMember = derived(
  [subtotal, pelangganDipilih],
  ([$s, $p]) => $p?.diskon_member ? Math.round($s * $p.diskon_member / 100) : 0
)

export const total = derived(
  [subtotal, diskonMember, diskonTotal],
  ([$s, $d, $dt]) => $s - $d - $dt
)

export const kembalian = derived(
  [total, nominalBayar, metodeBayar],
  ([$total, $bayar, $metode]) => {
    if ($metode === 'hutang') return 0
    return Math.max(0, $bayar - $total)
  }
)

export function resetKasir() {
  keranjang.set([])
  nominalBayar.set(0)
  pelangganDipilih.set(null)
  metodeBayar.set('tunai')
  tipeTransaksi.set('eceran')
  itemAktifIdx.set(-1)
}
