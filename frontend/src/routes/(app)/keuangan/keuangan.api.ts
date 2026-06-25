import { api } from '$lib/utils/api'
import type {
  Hutang,
  Piutang,
  Jurnal,
  KasBank,
  KasBankSaldo,
  PinjamanRow,
  BayarForm,
  JurnalForm,
  KasBankForm,
} from './keuangan.types'

function unwrap<T>(res: { success: true; data: T } | { success: false; error: string }): T {
  if (!res.success) throw new Error(res.error)
  return res.data
}

// ── Hutang ───────────────────────────────────────────────────────────────────

export async function fetchHutang(): Promise<Hutang[]> {
  return unwrap(await api.get<Hutang[]>('/keuangan/hutang'))
}

export async function bayarHutang(id: number, form: BayarForm): Promise<{ sisa_hutang: number; status: string }> {
  return unwrap(await api.post<{ sisa_hutang: number; status: string }>(`/keuangan/hutang/${id}/bayar`, form))
}

// ── Piutang ──────────────────────────────────────────────────────────────────

export async function fetchPiutang(): Promise<Piutang[]> {
  return unwrap(await api.get<Piutang[]>('/keuangan/piutang'))
}

export async function bayarPiutang(id: number, form: BayarForm): Promise<{ sisa_piutang: number; status: string }> {
  return unwrap(await api.post<{ sisa_piutang: number; status: string }>(`/keuangan/piutang/${id}/bayar`, form))
}

// ── Jurnal ───────────────────────────────────────────────────────────────────

export async function fetchJurnal(filter: { dari?: string; sampai?: string; kas_bank_id?: number }): Promise<Jurnal[]> {
  const params = new URLSearchParams()
  if (filter.dari) params.set('dari', filter.dari)
  if (filter.sampai) params.set('sampai', filter.sampai)
  if (filter.kas_bank_id) params.set('kas_bank_id', String(filter.kas_bank_id))
  return unwrap(await api.get<Jurnal[]>(`/keuangan/jurnal?${params}`))
}

export async function simpanJurnal(form: JurnalForm): Promise<unknown> {
  return unwrap(await api.post('/keuangan/jurnal', form))
}

// ── Kas / Bank ───────────────────────────────────────────────────────────────

export async function fetchKasBank(): Promise<KasBank[]> {
  return unwrap(await api.get<KasBank[]>('/keuangan/kas-bank'))
}

export async function fetchKasBankSaldo(): Promise<KasBankSaldo[]> {
  return unwrap(await api.get<KasBankSaldo[]>('/keuangan/kas-bank/saldo'))
}

export async function tambahKasBank(form: KasBankForm): Promise<unknown> {
  return unwrap(await api.post('/keuangan/kas-bank', form))
}

export async function ubahKasBank(id: number, payload: { nama: string; saldo_awal: number }): Promise<unknown> {
  return unwrap(await api.put(`/keuangan/kas-bank/${id}`, payload))
}

export async function hapusKasBank(id: number): Promise<unknown> {
  return unwrap(await api.delete(`/keuangan/kas-bank/${id}`))
}

// ── Pinjaman & Investasi ──────────────────────────────────────────────────────

export async function fetchPinjaman(filter: { tipe?: string; status?: string }): Promise<PinjamanRow[]> {
  const q = new URLSearchParams()
  if (filter.tipe) q.set('tipe', filter.tipe)
  if (filter.status) q.set('status', filter.status)
  return unwrap(await api.get<PinjamanRow[]>(`/pinjaman-investasi?${q}`))
}

export type PinjamanPayload = {
  tipe: 'pinjaman' | 'investasi'
  nama: string
  jumlah_pokok: number
  bunga_persen: number
  cicilan_per_bulan: number
  tanggal_mulai: string
  jatuh_tempo?: string
  catatan?: string
}

export async function tambahPinjaman(payload: PinjamanPayload): Promise<unknown> {
  return unwrap(await api.post('/pinjaman-investasi', payload))
}

export async function ubahPinjaman(id: number, payload: Partial<PinjamanPayload> & { status?: 'aktif' | 'lunas' | 'macet' }): Promise<unknown> {
  return unwrap(await api.put(`/pinjaman-investasi/${id}`, payload))
}

export async function cicilPinjaman(id: number, jumlah: number): Promise<unknown> {
  return unwrap(await api.post(`/pinjaman-investasi/${id}/cicil`, { jumlah }))
}

export async function hapusPinjaman(id: number): Promise<unknown> {
  return unwrap(await api.delete(`/pinjaman-investasi/${id}`))
}
