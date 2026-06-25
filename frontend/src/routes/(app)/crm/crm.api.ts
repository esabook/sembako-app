import { api } from '$lib/utils/api.js'
import type { PermintaanRow, KomplainRow } from './crm.types.js'

export async function fetchPermintaan(bulan: string, status: string) {
  const q = new URLSearchParams()
  if (bulan) { q.set('dari', bulan+'-01'); q.set('sampai', bulan+'-31') }
  if (status) q.set('status', status)
  return api.get<PermintaanRow[]>(`/crm/permintaan?${q}`)
}

export async function createPermintaan(data: {
  nama_barang: string; nama_pelanggan?: string
  qty_minta?: number; catatan?: string; tanggal: string
}) {
  return api.post('/crm/permintaan', data)
}

export async function updatePermintaan(id: number, status: PermintaanRow['status']) {
  return api.put(`/crm/permintaan/${id}`, { status })
}

export async function deletePermintaan(id: number) {
  return api.delete(`/crm/permintaan/${id}`)
}

export async function fetchKomplain(bulan: string, status: string) {
  const q = new URLSearchParams()
  if (bulan) { q.set('dari', bulan+'-01'); q.set('sampai', bulan+'-31') }
  if (status) q.set('status', status)
  return api.get<KomplainRow[]>(`/crm/komplain?${q}`)
}

export async function createKomplain(data: {
  kategori: string; deskripsi: string
  nama_pelanggan?: string; tanggal: string
}) {
  return api.post('/crm/komplain', data)
}

export async function updateKomplain(id: number, status: KomplainRow['status'], resolusi?: string) {
  return api.put(`/crm/komplain/${id}`, { status, resolusi })
}

export async function deleteKomplain(id: number) {
  return api.delete(`/crm/komplain/${id}`)
}
