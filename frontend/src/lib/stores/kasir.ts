import { writable, derived } from 'svelte/store'

export type ItemKeranjang = {
  barang_id: number
  kode_barang: string
  nama_barang: string
  satuan_id: number | null
  singkatan_satuan: string
  jumlah: number
  harga_jual: number
  diskon_item: number
  stok_sekarang: number
}

export type TipeTransaksi = 'eceran' | 'grosir'
export type MetodeBayar = 'tunai' | 'transfer' | 'qris' | 'hutang'

export const keranjang = writable<ItemKeranjang[]>([])
export const tipeTransaksi = writable<TipeTransaksi>('eceran')
export const metodeBayar = writable<MetodeBayar>('tunai')
export type PelangganDipilih = {
  id: number; nama: string; saldo_piutang: number
  gender: 'pria' | 'wanita' | null
  no_kartu: string | null
  tier: 'reguler' | 'silver' | 'gold' | null
  diskon_member: number | null
}
export const pelangganDipilih = writable<PelangganDipilih | null>(null)
export const nominalBayar = writable<string>('')
export const itemAktifIdx = writable<number>(-1)

export const subtotal = derived(keranjang, ($k) =>
  $k.reduce((s, i) => s + i.harga_jual * i.jumlah - i.diskon_item, 0)
)

export const total = derived(subtotal, ($s) => $s)

export const kembalian = derived(
  [total, nominalBayar, metodeBayar],
  ([$total, $bayar, $metode]) => {
    if ($metode === 'hutang') return 0
    return Math.max(0, Number($bayar) - $total)
  }
)

export function resetKasir() {
  keranjang.set([])
  nominalBayar.set('')
  pelangganDipilih.set(null)
  metodeBayar.set('tunai')
  itemAktifIdx.set(-1)
}
