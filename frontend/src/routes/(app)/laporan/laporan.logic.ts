import type {
  LabaRugi, ArusKas, Neraca, AgingData, BudgetRealisasi,
  PajakUmkm, MarginProduk, Persediaan, TopPelanggan,
  PembelianSupplier, RekapPenggajian, AnalitikJam,
} from './laporan.types'

// ── Helpers format ────────────────────────────────────────────────────────────

export function fmt(n: number): string {
  return new Intl.NumberFormat('id-ID').format(Math.round(n))
}

export function fmtPct(n: number): string {
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`
}

export function fmtRp(n: number): string {
  return `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(n))}`
}

export function tglFmt(t: string): string {
  return new Date(t).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ── Helpers periode ───────────────────────────────────────────────────────────

export function defaultPeriode() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const last = new Date(y, now.getMonth() + 1, 0).getDate()
  return { dari: `${y}-${m}-01`, sampai: `${y}-${m}-${last}` }
}

export function bulanIniStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function periodeSebelumnya() {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const y = prev.getFullYear()
  const m = String(prev.getMonth() + 1).padStart(2, '0')
  const last = new Date(y, prev.getMonth() + 1, 0).getDate()
  return { dari: `${y}-${m}-01`, sampai: `${y}-${m}-${last}` }
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v)
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsvRow(row: (string | number | null | undefined)[]): string {
  return row.map(csvCell).join(',')
}

export function downloadCsv(rows: (string | number | null | undefined)[][], nama: string) {
  const bom = '﻿'
  const content = rows.map(toCsvRow).join('\n')
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nama
  a.click()
  URL.revokeObjectURL(url)
}

// ── Export CSV per laporan ────────────────────────────────────────────────────

export function buildLabaRugiCsv(lr: LabaRugi): (string | number)[][] {
  return [
    ['LAPORAN LABA RUGI', ''],
    ['Periode', `${tglFmt(lr.periode.dari)} - ${tglFmt(lr.periode.sampai)}`],
    [],
    ['PENJUALAN', ''],
    ['Penjualan Bruto', fmtRp(lr.penjualan.bruto)],
    ['Diskon', `(${fmtRp(lr.penjualan.diskon)})`],
    ['Penjualan Bersih', fmtRp(lr.penjualan.bersih)],
    ['Jumlah Transaksi', `${lr.penjualan.jumlah_transaksi} transaksi`],
    [],
    ['HARGA POKOK PENJUALAN', ''],
    ['HPP (estimasi)', `(${fmtRp(lr.hpp)})`],
    ['Laba Kotor', fmtRp(lr.laba_kotor)],
    ['Margin Kotor', `${lr.margin_kotor_persen.toFixed(1)}%`],
    [],
    ['BIAYA OPERASIONAL', ''],
    ...Object.entries(lr.biaya_operasional.per_kategori).map(([k, v]) => [
      k.replace(/_/g, ' '), `(${fmtRp(v)})`
    ]),
    ['Total Biaya', `(${fmtRp(lr.biaya_operasional.total)})`],
    [],
    ['LABA BERSIH', fmtRp(lr.laba_bersih)],
    ['Margin Bersih', `${lr.margin_bersih_persen.toFixed(1)}%`],
  ]
}

export function buildArusKasCsv(ak: ArusKas): (string | number)[][] {
  return [
    ['LAPORAN ARUS KAS', ''],
    ['Periode', `${tglFmt(ak.periode.dari)} - ${tglFmt(ak.periode.sampai)}`],
    [],
    ['RINGKASAN', ''],
    ['Saldo Awal', fmtRp(ak.saldo_awal)],
    ['Total Masuk', fmtRp(ak.total_masuk)],
    ['Total Keluar', `(${fmtRp(ak.total_keluar)})`],
    ['Net Periode', fmtRp(ak.net)],
    ['Saldo Akhir', fmtRp(ak.saldo_akhir)],
    [],
    ['PER AKUN KAS/BANK', '', '', '', '', ''],
    ['Akun', 'Saldo Awal', 'Masuk', 'Keluar', 'Net', 'Saldo Akhir'],
    ...ak.per_akun.map((a) => [a.nama, fmtRp(a.saldo_awal), fmtRp(a.masuk), fmtRp(a.keluar), fmtRp(a.net), fmtRp(a.saldo_akhir)]),
    ['TOTAL', fmtRp(ak.saldo_awal), fmtRp(ak.total_masuk), fmtRp(ak.total_keluar), fmtRp(ak.net), fmtRp(ak.saldo_akhir)],
    [],
    ['RINCIAN PER KATEGORI', '', ''],
    ['Kategori', 'Masuk', 'Keluar'],
    ...Object.entries(ak.per_kategori).map(([k, v]) => [
      k.replace(/_/g, ' '), v.masuk > 0 ? fmtRp(v.masuk) : '-', v.keluar > 0 ? fmtRp(v.keluar) : '-'
    ]),
  ]
}

export function buildNeracaCsv(n: Neraca): (string | number)[][] {
  return [
    ['NERACA', ''],
    ['Per Tanggal', tglFmt(n.per_tanggal)],
    [],
    ['ASET', ''],
    ['Kas & Bank', ''],
    ...n.aset.kas_bank.map((a) => [`  ${a.nama}`, fmtRp(a.saldo)]),
    ['Subtotal Kas/Bank', fmtRp(n.aset.total_kas_bank)],
    ['Piutang Pelanggan', fmtRp(n.aset.piutang_pelanggan)],
    ['Nilai Persediaan', fmtRp(n.aset.nilai_persediaan)],
    ['TOTAL ASET', fmtRp(n.aset.total)],
    [],
    ['LIABILITAS', ''],
    ['Hutang Supplier', fmtRp(n.liabilitas.hutang_supplier)],
    ['TOTAL LIABILITAS', fmtRp(n.liabilitas.total)],
    [],
    ['MODAL', ''],
    ['TOTAL MODAL', fmtRp(n.modal.total)],
    [],
    ['CEK BALANCE', ''],
    ['Total Aset', fmtRp(n.check.aset)],
    ['Liabilitas + Modal', fmtRp(n.check.liabilitas_plus_modal)],
    ['Status', n.check.balanced ? 'BALANCE' : 'TIDAK BALANCE'],
  ]
}

export function buildAgingCsv(ag: AgingData): (string | number)[][] {
  return [
    ['LAPORAN AGING PIUTANG & HUTANG', ''],
    ['Per Tanggal', tglFmt(ag.per_tanggal)],
    [],
    ['PIUTANG PELANGGAN', ''],
    ['Bucket', 'Jumlah', 'Total'],
    ...ag.piutang.map(b => [b.label, b.jumlah, fmtRp(b.total)]),
    ['TOTAL PIUTANG', '', fmtRp(ag.total_piutang)],
    [],
    ['HUTANG SUPPLIER', ''],
    ['Bucket', 'Jumlah', 'Total'],
    ...ag.hutang.map(b => [b.label, b.jumlah, fmtRp(b.total)]),
    ['TOTAL HUTANG', '', fmtRp(ag.total_hutang)],
  ]
}

const NAMA_BUDGET: Record<string, string> = {
  gaji: 'Gaji', sewa: 'Sewa', listrik: 'Listrik',
  kemasan: 'Kemasan', operasional: 'Operasional', lain: 'Lain-lain',
}

export function buildBudgetRealisasiCsv(br: BudgetRealisasi): (string | number)[][] {
  return [
    ['LAPORAN REALISASI BUDGET VS AKTUAL', ''],
    ['Periode', br.periode],
    [],
    ['TARGET PENJUALAN', ''],
    ['Target Omzet', br.target ? fmtRp(br.target.target_omzet) : '-'],
    ['Realisasi Omzet', fmtRp(br.realisasi.realisasi_omzet)],
    ['Target Transaksi', br.target ? br.target.target_transaksi : '-'],
    ['Realisasi Transaksi', br.realisasi.realisasi_transaksi],
    ['Target Margin', br.target ? `${br.target.target_margin_pct.toFixed(1)}%` : '-'],
    ['Realisasi Margin', `${br.realisasi.realisasi_margin_pct.toFixed(1)}%`],
    [],
    ['BIAYA OPERASIONAL', '', '', ''],
    ['Kategori', 'Budget', 'Realisasi', 'Selisih'],
    ...br.budgets.map((b) => {
      const real = br.realisasi.realisasi_budget[b.kategori] ?? 0
      return [NAMA_BUDGET[b.kategori] ?? b.kategori, fmtRp(b.nilai_budget), fmtRp(real), fmtRp(b.nilai_budget - real)]
    }),
  ]
}

const BULAN_LABEL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const BULAN_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

export function buildPajakUmkmCsv(px: PajakUmkm): (string | number)[][] {
  return [
    ['LAPORAN PAJAK UMKM (PPh Final 0.5%)', ''],
    ['Tahun', px.tahun],
    [],
    ['Bulan', 'Omset', 'Pajak (0.5%)'],
    ...px.bulan.map((b, i) => [BULAN_LABEL[i]!, fmtRp(b.omset), fmtRp(b.pajak)]),
    [],
    ['TOTAL', fmtRp(px.total_omset), fmtRp(px.total_pajak)],
  ]
}

export function buildMarginProdukCsv(mp: MarginProduk): (string | number)[][] {
  return [
    ['LAPORAN MARGIN PER PRODUK', ''],
    ['Periode', `${tglFmt(mp.periode.dari)} - ${tglFmt(mp.periode.sampai)}`],
    [],
    ['RINGKASAN', ''],
    ['Total Omset', fmtRp(mp.total_omset)],
    ['Total HPP', fmtRp(mp.total_hpp)],
    ['Total Margin', fmtRp(mp.total_margin)],
    ['Rata-rata Margin', `${mp.margin_pct_rata.toFixed(1)}%`],
    [],
    ['Nama Produk', 'Kategori', 'Qty', 'Omset', 'HPP', 'Margin', 'Margin %'],
    ...mp.produk.map((p) => [p.nama_barang, p.kategori, p.qty_terjual, fmtRp(p.omset), fmtRp(p.hpp), fmtRp(p.margin), `${p.margin_pct.toFixed(1)}%`]),
  ]
}

export function buildPerbandinganCsv(p1: LabaRugi, p2: LabaRugi): (string | number)[][] {
  const delta = (a: number, b: number) => b - a
  const deltaPct = (a: number, b: number) => a !== 0 ? ((b - a) / a) * 100 : 0
  return [
    ['LAPORAN PERBANDINGAN PERIODE', '', '', ''],
    ['Metrik', `P1: ${tglFmt(p1.periode.dari)}–${tglFmt(p1.periode.sampai)}`, `P2: ${tglFmt(p2.periode.dari)}–${tglFmt(p2.periode.sampai)}`, 'Selisih', 'Δ%'],
    ['Penjualan Bersih', fmtRp(p1.penjualan.bersih), fmtRp(p2.penjualan.bersih), fmtRp(delta(p1.penjualan.bersih, p2.penjualan.bersih)), `${deltaPct(p1.penjualan.bersih, p2.penjualan.bersih).toFixed(1)}%`],
    ['Jumlah Transaksi', p1.penjualan.jumlah_transaksi, p2.penjualan.jumlah_transaksi, delta(p1.penjualan.jumlah_transaksi, p2.penjualan.jumlah_transaksi), `${deltaPct(p1.penjualan.jumlah_transaksi, p2.penjualan.jumlah_transaksi).toFixed(1)}%`],
    ['HPP', fmtRp(p1.hpp), fmtRp(p2.hpp), fmtRp(delta(p1.hpp, p2.hpp)), `${deltaPct(p1.hpp, p2.hpp).toFixed(1)}%`],
    ['Laba Kotor', fmtRp(p1.laba_kotor), fmtRp(p2.laba_kotor), fmtRp(delta(p1.laba_kotor, p2.laba_kotor)), `${deltaPct(p1.laba_kotor, p2.laba_kotor).toFixed(1)}%`],
    ['Margin Kotor %', `${p1.margin_kotor_persen.toFixed(1)}%`, `${p2.margin_kotor_persen.toFixed(1)}%`, `${(p2.margin_kotor_persen - p1.margin_kotor_persen).toFixed(1)}pp`, ''],
    ['Biaya Operasional', fmtRp(p1.biaya_operasional.total), fmtRp(p2.biaya_operasional.total), fmtRp(delta(p1.biaya_operasional.total, p2.biaya_operasional.total)), `${deltaPct(p1.biaya_operasional.total, p2.biaya_operasional.total).toFixed(1)}%`],
    ['Laba Bersih', fmtRp(p1.laba_bersih), fmtRp(p2.laba_bersih), fmtRp(delta(p1.laba_bersih, p2.laba_bersih)), `${deltaPct(p1.laba_bersih, p2.laba_bersih).toFixed(1)}%`],
    ['Margin Bersih %', `${p1.margin_bersih_persen.toFixed(1)}%`, `${p2.margin_bersih_persen.toFixed(1)}%`, `${(p2.margin_bersih_persen - p1.margin_bersih_persen).toFixed(1)}pp`, ''],
  ]
}

export function buildPersediaanCsv(p: Persediaan): (string | number)[][] {
  return [
    ['LAPORAN NILAI PERSEDIAAN', ''],
    ['Per Tanggal', tglFmt(p.per_tanggal)],
    ['Total Nilai', fmtRp(p.total_nilai)],
    ['Jumlah SKU Aktif', p.jumlah_sku],
    ['SKU Tanpa Stok', p.sku_tanpa_stok],
    [],
    ['Produk', 'Kategori', 'Stok', 'HPP', 'Nilai Stok'],
    ...p.produk.map((pr) => [pr.nama_barang, pr.kategori, pr.stok, fmtRp(pr.hpp), fmtRp(pr.nilai_stok)]),
  ]
}

export function buildTopPelangganCsv(tp: TopPelanggan): (string | number)[][] {
  return [
    ['LAPORAN TOP PELANGGAN', ''],
    ['Periode', `${tglFmt(tp.periode.dari)} - ${tglFmt(tp.periode.sampai)}`],
    ['Total Omset', fmtRp(tp.total_omset)],
    [],
    ['Nama', 'Tipe', 'Kontak', 'Transaksi', 'Omset', '% Omset'],
    ...tp.pelanggan.map((p) => [p.nama, p.tipe, p.kontak ?? '—', p.jumlah_transaksi, fmtRp(p.total_omset), `${p.pct_omset.toFixed(1)}%`]),
  ]
}

export function buildPembelianSupplierCsv(ps: PembelianSupplier): (string | number)[][] {
  return [
    ['LAPORAN PEMBELIAN PER SUPPLIER', ''],
    ['Periode', `${tglFmt(ps.periode.dari)} - ${tglFmt(ps.periode.sampai)}`],
    ['Total Pembelian', fmtRp(ps.total_pembelian)],
    [],
    ['Supplier', 'Kontak', 'Penerimaan', 'Total Pembelian', '% Total'],
    ...ps.supplier.map((s) => [s.nama_supplier, s.kontak ?? '—', s.jumlah_penerimaan, fmtRp(s.total_pembelian), `${s.pct_pembelian.toFixed(1)}%`]),
  ]
}

export function buildRekapPenggajianCsv(rp: RekapPenggajian): (string | number)[][] {
  return [
    ['REKAP PENGGAJIAN', ''],
    ['Tahun', rp.tahun],
    ['Total Biaya Gaji', fmtRp(rp.total_gaji_tahun)],
    [],
    ['Bulan', 'Karyawan', 'Gaji Pokok', 'Tunjangan', 'Potongan', 'Total Gaji'],
    ...rp.bulan.map((b, i) => [BULAN_SHORT[i]!, b.jumlah_karyawan, fmtRp(b.total_gaji_pokok), fmtRp(b.total_tunjangan), fmtRp(b.total_potongan), fmtRp(b.total_gaji)]),
  ]
}

export function buildAnalitikJamCsv(aj: AnalitikJam): (string | number)[][] {
  return [
    ['ANALITIK TRANSAKSI PER JAM', ''],
    ['Periode', `${tglFmt(aj.dari)} - ${tglFmt(aj.sampai)}`],
    ['Total Transaksi', aj.total_transaksi],
    ['Total Omzet', fmtRp(aj.total_omzet)],
    ['Jam Sibuk (≥70% peak)', aj.jam_sibuk.map(j => j + ':00').join(', ')],
    [],
    ['Jam', 'Jumlah Transaksi', 'Omzet', 'Rata-rata per Transaksi', 'Jam Sibuk'],
    ...aj.per_jam.map(r => [
      r.jam + ':00',
      r.jumlah_transaksi,
      fmtRp(r.omzet),
      fmtRp(r.rata_per_trx),
      aj.jam_sibuk.includes(r.jam) ? 'Ya' : '',
    ]),
  ]
}

export { NAMA_BUDGET, BULAN_LABEL, BULAN_SHORT }
