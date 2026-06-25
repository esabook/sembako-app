import { api } from '$lib/utils/api.js'
import type { AsetRow, TagihanRow } from './aset.types.js'

export async function fetchAset(kondisi: string, kategori: string) {
  const q = new URLSearchParams()
  if (kondisi) q.set('kondisi', kondisi)
  if (kategori) q.set('kategori', kategori)
  return api.get<AsetRow[]>(`/aset?${q}`)
}

export async function createAset(body: object) {
  return api.post('/aset', body)
}

export async function updateAset(id: number, body: object) {
  return api.put(`/aset/${id}`, body)
}

export async function deleteAset(id: number) {
  return api.delete(`/aset/${id}`)
}

export async function fetchUtilitas(jenis: string, bulan: string) {
  const q = new URLSearchParams()
  if (jenis) q.set('jenis', jenis)
  if (bulan) q.set('periode_bulan', bulan)
  return api.get<TagihanRow[]>(`/utilitas?${q}`)
}

export async function createUtilitas(body: object) {
  return api.post('/utilitas', body)
}

export async function updateUtilitas(id: number, body: object) {
  return api.put(`/utilitas/${id}`, body)
}

export async function deleteUtilitas(id: number) {
  return api.delete(`/utilitas/${id}`)
}
