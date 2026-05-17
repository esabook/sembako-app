import { api } from '$lib/utils/api.js'
import type { NotifikasiConfig, NotifikasiLog, AlertCheck } from './notifikasi.types.js'

export async function fetchConfigs() {
  return api.get<NotifikasiConfig[]>('/notifikasi/config')
}

export async function updateConfig(jenis: string, payload: Partial<NotifikasiConfig>) {
  return api.put<NotifikasiConfig>(`/notifikasi/config/${jenis}`, payload)
}

export async function fetchLog(limit = 50) {
  return api.get<NotifikasiLog[]>(`/notifikasi/log?limit=${limit}`)
}

export async function checkAlerts() {
  return api.get<AlertCheck[]>('/notifikasi/check')
}
