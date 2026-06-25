import { api } from '$lib/utils/api.js'
import type { BarangHarga, HistoriHarga, PreviewMassal, TipeMassal } from './harga.types.js'

export async function fetchHarga() {
  return api.get<BarangHarga[]>('/harga')
}

export async function updateHarga(id: number, harga_jual_eceran: number, harga_jual_grosir: number) {
  return api.put(`/harga/${id}`, { harga_jual_eceran, harga_jual_grosir })
}

export async function fetchHistoriHarga(id: number) {
  return api.get<HistoriHarga[]>(`/harga/${id}/histori`)
}

export async function simulasiMassal(
  barang_ids: number[],
  tipe: TipeMassal,
  nilai_eceran: number,
  nilai_grosir: number,
) {
  return api.post<PreviewMassal[]>('/harga/simulasi', { barang_ids, tipe, nilai_eceran, nilai_grosir })
}

export async function applyMassal(
  barang_ids: number[],
  tipe: TipeMassal,
  nilai_eceran: number,
  nilai_grosir: number,
) {
  return api.post<{ updated: number }>('/harga/massal', { barang_ids, tipe, nilai_eceran, nilai_grosir })
}
