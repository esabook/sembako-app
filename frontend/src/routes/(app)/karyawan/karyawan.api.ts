import { api } from '$lib/utils/api'
import type {
  Karyawan, AbsensiRow, RekapRow, PenggajianRow, KasBank,
  KasbonRow, JadwalCicilan, TipeShift, JadwalRow, TukarRow,
  PerformaRingkasan, PerformaDetail, RealtimeRow,
  IzinRow, EvaluasiRow, SanksiInsentifRow,
} from './karyawan.types'

function unwrap<T>(res: { success: true; data: T } | { success: false; error: string }): T {
  if (!res.success) throw new Error(res.error)
  return res.data
}

// ── Karyawan ─────────────────────────────────────────────────────────────────

export async function fetchKaryawan(): Promise<Karyawan[]> {
  return unwrap(await api.get<Karyawan[]>('/karyawan'))
}

export async function createKaryawan(payload: Record<string, unknown>): Promise<{ id: number }> {
  return unwrap(await api.post<{ id: number }>('/karyawan', payload))
}

export async function updateKaryawan(id: number, payload: Record<string, unknown>): Promise<true> {
  unwrap(await api.put<unknown>(`/karyawan/${id}`, payload))
  return true
}

export async function uploadFotoKaryawan(id: number, fd: FormData): Promise<void> {
  await api.upload(`/karyawan/${id}/foto`, fd)
}

export async function deleteKaryawan(id: number): Promise<true> {
  await api.delete(`/karyawan/${id}`)
  return true
}

// ── Absensi ──────────────────────────────────────────────────────────────────

export async function fetchAbsensi(params: URLSearchParams): Promise<AbsensiRow[]> {
  return unwrap(await api.get<AbsensiRow[]>(`/absensi?${params}`))
}

export async function fetchAbsensiRekap(bulan: string): Promise<RekapRow[]> {
  return unwrap(await api.get<RekapRow[]>(`/absensi/rekap?bulan=${bulan}`))
}

export async function fetchAbsensiRealtime(): Promise<RealtimeRow[]> {
  return unwrap(await api.get<RealtimeRow[]>('/absensi/realtime'))
}

export async function createAbsensi(payload: Record<string, unknown>): Promise<true> {
  unwrap(await api.post('/absensi', payload))
  return true
}

export async function updateAbsensi(id: number, payload: Record<string, unknown>): Promise<true> {
  unwrap(await api.put(`/absensi/${id}`, payload))
  return true
}

export async function deleteAbsensi(id: number): Promise<true> {
  await api.delete(`/absensi/${id}`)
  return true
}

// ── Penggajian ───────────────────────────────────────────────────────────────

export async function fetchPenggajian(bulan: string): Promise<PenggajianRow[]> {
  return unwrap(await api.get<PenggajianRow[]>(`/penggajian?bulan=${bulan}`))
}

export async function fetchKasBankList(): Promise<KasBank[]> {
  return unwrap(await api.get<KasBank[]>('/keuangan/kas-bank'))
}

export async function generateGajiApi(bulan: string): Promise<{ generated: number; skipped: number }> {
  return unwrap(await api.post<{ generated: number; skipped: number }>('/penggajian/generate', { bulan }))
}

export async function updatePenggajian(id: number, payload: Record<string, unknown>): Promise<true> {
  unwrap(await api.put(`/penggajian/${id}`, payload))
  return true
}

export async function deletePenggajian(id: number): Promise<true> {
  await api.delete(`/penggajian/${id}`)
  return true
}

// ── Kasbon ───────────────────────────────────────────────────────────────────

export async function fetchKasbon(status?: string): Promise<KasbonRow[]> {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  return unwrap(await api.get<KasbonRow[]>(`/kasbon?${params}`))
}

export async function createKasbon(payload: Record<string, unknown>): Promise<true> {
  unwrap(await api.post('/kasbon', payload))
  return true
}

export async function setujuiKasbonApi(id: number): Promise<true> {
  unwrap(await api.put(`/kasbon/${id}/setujui`, {}))
  return true
}

export async function tolakKasbonApi(id: number, catatan: string): Promise<true> {
  unwrap(await api.put(`/kasbon/${id}/tolak`, { catatan }))
  return true
}

export async function cairkanKasbonApi(id: number): Promise<true> {
  unwrap(await api.put(`/kasbon/${id}/cair`, {}))
  return true
}

export async function cicilKasbonApi(id: number, jumlah_cicil: number): Promise<true> {
  unwrap(await api.put(`/kasbon/${id}/cicil`, { jumlah_cicil }))
  return true
}

export async function fetchJadwalCicilan(id: number): Promise<JadwalCicilan[]> {
  return unwrap(await api.get<JadwalCicilan[]>(`/kasbon/${id}/jadwal`))
}

export async function deleteKasbon(id: number): Promise<true> {
  await api.delete(`/kasbon/${id}`)
  return true
}

// ── Jadwal Shift ─────────────────────────────────────────────────────────────

export async function fetchTipeShift(): Promise<TipeShift[]> {
  return unwrap(await api.get<TipeShift[]>('/jadwal/tipe'))
}

export async function fetchJadwalKerja(dari: string, sampai: string): Promise<JadwalRow[]> {
  return unwrap(await api.get<JadwalRow[]>(`/jadwal?dari=${dari}&sampai=${sampai}`))
}

export async function fetchTukar(): Promise<TukarRow[]> {
  return unwrap(await api.get<TukarRow[]>('/jadwal/tukar'))
}

export async function createJadwalKerja(payload: Record<string, unknown>): Promise<true> {
  unwrap(await api.post('/jadwal', payload))
  return true
}

export async function deleteJadwalKerja(id: number): Promise<true> {
  await api.delete(`/jadwal/${id}`)
  return true
}

export async function createTipeShiftApi(payload: Record<string, unknown>): Promise<true> {
  unwrap(await api.post('/jadwal/tipe', payload))
  return true
}

export async function updateTipeShiftApi(id: number, payload: Record<string, unknown>): Promise<true> {
  unwrap(await api.put(`/jadwal/tipe/${id}`, payload))
  return true
}

export async function deleteTipeShiftApi(id: number): Promise<true> {
  await api.delete(`/jadwal/tipe/${id}`)
  return true
}

export async function createTukarApi(payload: Record<string, unknown>): Promise<true> {
  unwrap(await api.post('/jadwal/tukar', payload))
  return true
}

export async function setujuiTukarApi(id: number): Promise<true> {
  await api.put(`/jadwal/tukar/${id}/setujui`, {})
  return true
}

export async function tolakTukarApi(id: number): Promise<true> {
  await api.put(`/jadwal/tukar/${id}/tolak`, {})
  return true
}

// ── Performa ─────────────────────────────────────────────────────────────────

export async function fetchPerforma(bulan: string): Promise<{ bulan: string; hasil: PerformaRingkasan[] }> {
  return unwrap(await api.get<{ bulan: string; hasil: PerformaRingkasan[] }>(`/karyawan/performa?bulan=${bulan}`))
}

export async function fetchPerformaDetail(id: number, bulan: string): Promise<PerformaDetail> {
  return unwrap(await api.get<PerformaDetail>(`/karyawan/${id}/performa?bulan=${bulan}`))
}

// ── Izin ─────────────────────────────────────────────────────────────────────

export async function fetchIzin(params: URLSearchParams): Promise<IzinRow[]> {
  return unwrap(await api.get<IzinRow[]>(`/izin?${params}`))
}

export async function setujuiIzinApi(id: number): Promise<void> {
  await api.post(`/izin/${id}/setujui`, {})
}

export async function tolakIzinApi(id: number, catatan: string): Promise<void> {
  await api.post(`/izin/${id}/tolak`, { catatan })
}

export async function createIzin(payload: Record<string, unknown>): Promise<true> {
  unwrap(await api.post('/izin', payload))
  return true
}

// ── Evaluasi ─────────────────────────────────────────────────────────────────

export async function fetchEvaluasi(params: URLSearchParams): Promise<EvaluasiRow[]> {
  return unwrap(await api.get<EvaluasiRow[]>(`/evaluasi?${params}`))
}

export async function createEvaluasi(payload: Record<string, unknown>): Promise<true> {
  unwrap(await api.post('/evaluasi', payload))
  return true
}

export async function updateEvaluasi(id: number, payload: Record<string, unknown>): Promise<true> {
  unwrap(await api.put(`/evaluasi/${id}`, payload))
  return true
}

export async function deleteEvaluasi(id: number): Promise<true> {
  await api.delete(`/evaluasi/${id}`)
  return true
}

// ── Sanksi & Insentif ──────────────────────────────────────────────────────

export async function fetchSanksiInsentif(params: URLSearchParams): Promise<SanksiInsentifRow[]> {
  return unwrap(await api.get<SanksiInsentifRow[]>(`/sanksi-insentif?${params}`))
}

export async function createSanksiInsentif(payload: Record<string, unknown>): Promise<true> {
  unwrap(await api.post('/sanksi-insentif', payload))
  return true
}

export async function deleteSanksiInsentif(id: number): Promise<true> {
  await api.delete(`/sanksi-insentif/${id}`)
  return true
}
