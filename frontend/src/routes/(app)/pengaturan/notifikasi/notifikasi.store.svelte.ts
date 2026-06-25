import { fetchConfigs, fetchLog, checkAlerts, updateConfig } from './notifikasi.api.js'
import type { NotifikasiConfig, NotifikasiLog, AlertCheck } from './notifikasi.types.js'

export function createNotifikasiStore() {
  let configs = $state<NotifikasiConfig[]>([])
  let log = $state<NotifikasiLog[]>([])
  let alerts = $state<AlertCheck[]>([])
  let loading = $state(false)
  let loadingLog = $state(false)
  let loadingAlerts = $state(false)
  let savingJenis = $state<string | null>(null)
  let error = $state<string | null>(null)

  async function loadConfigs() {
    loading = true
    error = null
    const res = await fetchConfigs()
    if (res.success) configs = res.data
    else error = res.error
    loading = false
  }

  async function loadLog() {
    loadingLog = true
    const res = await fetchLog()
    if (res.success) log = res.data
    loadingLog = false
  }

  async function loadAlerts() {
    loadingAlerts = true
    const res = await checkAlerts()
    if (res.success) alerts = res.data
    loadingAlerts = false
  }

  async function save(jenis: string, payload: Partial<NotifikasiConfig>) {
    savingJenis = jenis
    const res = await updateConfig(jenis, payload)
    if (res.success) {
      configs = configs.map(c => c.jenis === jenis ? { ...c, ...res.data } : c)
    }
    savingJenis = null
    return res
  }

  async function toggleAktif(jenis: string, aktif: boolean) {
    const cfg = configs.find(c => c.jenis === jenis)
    if (!cfg) return
    configs = configs.map(c => c.jenis === jenis ? { ...c, aktif } : c)
    const res = await save(jenis, { aktif })
    if (!res.success) {
      configs = configs.map(c => c.jenis === jenis ? { ...c, aktif: !aktif } : c)
    }
  }

  return {
    get configs() { return configs },
    get log() { return log },
    get alerts() { return alerts },
    get loading() { return loading },
    get loadingLog() { return loadingLog },
    get loadingAlerts() { return loadingAlerts },
    get savingJenis() { return savingJenis },
    get error() { return error },
    loadConfigs,
    loadLog,
    loadAlerts,
    save,
    toggleAktif,
  }
}
