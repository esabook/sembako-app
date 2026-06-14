import { api } from '$lib/utils/api.js'
import type { Acara } from './hajatan.types.js'

export async function fetchAcara(bulan: string, status: string) {
  const q = new URLSearchParams()
  if (bulan) { q.set('dari', `${bulan}-01`); q.set('sampai', `${bulan}-31`) }
  if (status) q.set('status', status)
  return api.get<Acara[]>(`/hajatan?${q}`)
}

export async function createAcara(payload: Omit<Acara, 'id' | 'pelanggan_id'>) {
  return api.post('/hajatan', payload)
}

export async function updateAcara(id: number, payload: Omit<Acara, 'id' | 'pelanggan_id'>) {
  return api.put(`/hajatan/${id}`, payload)
}

export async function deleteAcara(id: number) {
  return api.delete(`/hajatan/${id}`)
}
