import type { RekapRow, JadwalRow, KasbonStatus } from './karyawan.types'

export const ROLE_COLOR: Record<string, string> = {
  pemilik: 'var(--accent)',
  manajer: 'var(--info)',
  kasir: 'var(--warn)',
  gudang: 'var(--text-dim)',
  sales: '#a855f7',
  pelayanan: '#ec4899',
}

export const STATUS_COLOR: Record<string, string> = {
  hadir: 'var(--accent)',
  izin: 'var(--info)',
  sakit: 'var(--warn)',
  alpa: 'var(--danger)',
}

export const STATUS_GAJI_COLOR: Record<string, string> = {
  draft: 'var(--text-dim)',
  approved: 'var(--info)',
  dibayar: 'var(--accent)',
}

export const STATUS_KB: Record<KasbonStatus, { label: string; color: string }> = {
  pengajuan: { label: 'PENGAJUAN', color: 'var(--info)' },
  disetujui: { label: 'DISETUJUI', color: 'var(--warn)' },
  ditolak:   { label: 'DITOLAK',   color: 'var(--danger)' },
  aktif:     { label: 'AKTIF',     color: 'var(--accent)' },
  lunas:     { label: 'LUNAS',     color: 'var(--text-dim)' },
}

export const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

export function rp(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export function fmtRpK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}rb`
  return String(Math.round(n))
}

export function fmtMenit(m: number): string {
  if (!m) return '—'
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}j${min > 0 ? ` ${min}m` : ''}` : `${min}m`
}

export function hitungDurasi(masuk: string | null | undefined, keluar: string | null | undefined): string {
  if (!masuk || !keluar) return '—'
  const [jm, mm] = masuk.split(':').map(Number)
  const [jk, mk] = keluar.split(':').map(Number)
  const totalMenit = (jk * 60 + mk) - (jm * 60 + mm)
  if (totalMenit <= 0) return '—'
  const j = Math.floor(totalMenit / 60)
  const m = totalMenit % 60
  return j > 0 ? `${j}j${m > 0 ? ` ${m}m` : ''}` : `${m}m`
}

export function getMondayOf(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const m = new Date(d)
  m.setDate(d.getDate() + diff)
  m.setHours(0, 0, 0, 0)
  return m
}

export function getWeekDays(weekStart: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

export function jadwalFor(jadwalList: JadwalRow[], karyawanId: number, tanggal: string): JadwalRow[] {
  return jadwalList.filter(j => j.karyawan_id === karyawanId && j.tanggal === tanggal)
}

export function buildRekapCsvContent(rekapList: RekapRow[]): string {
  const bom = '﻿'
  const header = ['Karyawan', 'Hadir', 'Izin', 'Sakit', 'Alpa', 'Total', '% Hadir']
  const rows = rekapList.map(r => [
    r.nama_karyawan,
    r.hadir, r.izin, r.sakit, r.alpa, r.total,
    r.total > 0 ? `${((r.hadir / r.total) * 100).toFixed(1)}%` : '0%',
  ])
  return bom + [header, ...rows].map(r => r.join(',')).join('\n')
}
