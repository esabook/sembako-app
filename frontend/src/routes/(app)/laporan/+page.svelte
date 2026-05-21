<script lang="ts">
  import { untrack } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { api } from '$lib/utils/api'
  import { user } from '$lib/stores/auth.js'
  import TabBar from '$lib/components/ui/TabBar.svelte'

  $effect(() => {
    if ($user && !['pemilik', 'manajer'].includes($user.role)) goto('/kasir')
  })

  type TabKey = 'laba-rugi' | 'arus-kas' | 'neraca' | 'aging' | 'budget-realisasi' | 'pajak-umkm' | 'margin-produk' | 'perbandingan' | 'persediaan' | 'top-pelanggan' | 'pembelian-supplier' | 'rekap-penggajian'
  let tab = $derived<TabKey>(
    (page.url.searchParams.get('tab') as TabKey) ?? 'laba-rugi'
  )

  // ── Tipe data ─────────────────────────────────────────────────────────────

  type LabaRugi = {
    periode: { dari: string; sampai: string }
    penjualan: { bruto: number; diskon: number; bersih: number; jumlah_transaksi: number }
    hpp: number
    laba_kotor: number
    margin_kotor_persen: number
    biaya_operasional: { total: number; per_kategori: Record<string, number> }
    laba_bersih: number
    margin_bersih_persen: number
  }

  type ArusKas = {
    periode: { dari: string; sampai: string }
    per_akun: {
      id: number; nama: string; tipe: string
      saldo_awal: number; masuk: number; keluar: number; net: number; saldo_akhir: number
    }[]
    per_kategori: Record<string, { masuk: number; keluar: number }>
    saldo_awal: number
    total_masuk: number
    total_keluar: number
    net: number
    saldo_akhir: number
  }

  type AgingItem = { nama: string; sisa: number; hari: number; jatuh_tempo: string }
  type AgingBucket = { label: string; jumlah: number; total: number; items: AgingItem[] }
  type AgingData = {
    per_tanggal: string
    piutang: AgingBucket[]
    hutang: AgingBucket[]
    total_piutang: number
    total_hutang: number
  }

  type Neraca = {
    per_tanggal: string
    aset: {
      kas_bank: { id: number; nama: string; tipe: string; saldo: number }[]
      total_kas_bank: number
      piutang_pelanggan: number
      nilai_persediaan: number
      total: number
    }
    liabilitas: { hutang_supplier: number; total: number }
    modal: { total: number }
    check: { aset: number; liabilitas_plus_modal: number; balanced: boolean }
  }

  type BudgetRealisasi = {
    periode: string
    target: { target_omzet: number; target_transaksi: number; target_margin_pct: number } | null
    budgets: { kategori: string; nilai_budget: number }[]
    realisasi: {
      realisasi_omzet: number; realisasi_transaksi: number
      realisasi_margin_pct: number; realisasi_hpp: number
      realisasi_budget: Record<string, number>
    }
  }

  type PajakUmkm = {
    tahun: string
    bulan: { periode: string; omset: number; pajak: number; jumlah_transaksi: number }[]
    total_omset: number
    total_pajak: number
  }

  type MarginProduk = {
    periode: { dari: string; sampai: string }
    produk: {
      barang_id: number; nama_barang: string; kategori: string
      qty_terjual: number; jumlah_transaksi: number
      omset: number; hpp: number; margin: number; margin_pct: number
    }[]
    total_omset: number; total_hpp: number; total_margin: number; margin_pct_rata: number
  }

  type Persediaan = {
    per_tanggal: string
    produk: { barang_id: number; nama_barang: string; kategori: string; stok: number; hpp: number; nilai_stok: number }[]
    total_nilai: number; jumlah_sku: number; sku_tanpa_stok: number
  }

  type TopPelanggan = {
    periode: { dari: string; sampai: string }
    pelanggan: { pelanggan_id: number; nama: string; tipe: string; kontak: string | null; jumlah_transaksi: number; total_omset: number; total_diskon: number; pct_omset: number }[]
    total_omset: number
  }

  type PembelianSupplier = {
    periode: { dari: string; sampai: string }
    supplier: { supplier_id: number; nama_supplier: string; kontak: string | null; jumlah_penerimaan: number; total_pembelian: number; pct_pembelian: number }[]
    total_pembelian: number
  }

  type RekapPenggajian = {
    tahun: string
    bulan: { periode_bulan: string; jumlah_karyawan: number; total_gaji_pokok: number; total_tunjangan: number; total_potongan: number; total_gaji: number }[]
    total_gaji_tahun: number
  }

  // ── State ─────────────────────────────────────────────────────────────────

  let labaRugi = $state<LabaRugi | null>(null)
  let arusKas = $state<ArusKas | null>(null)
  let neraca = $state<Neraca | null>(null)
  let aging = $state<AgingData | null>(null)
  let agingExpanded = $state<Record<string, boolean>>({})
  let budgetRealisasi = $state<BudgetRealisasi | null>(null)
  let pajakUmkm = $state<PajakUmkm | null>(null)
  let marginProduk = $state<MarginProduk | null>(null)
  let perbandingan = $state<{ p1: LabaRugi; p2: LabaRugi } | null>(null)
  let persediaan = $state<Persediaan | null>(null)
  let topPelanggan = $state<TopPelanggan | null>(null)
  let pembelianSupplier = $state<PembelianSupplier | null>(null)
  let rekapPenggajian = $state<RekapPenggajian | null>(null)

  let loading = $state(false)
  let error = $state('')

  function defaultPeriode() {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const last = new Date(y, now.getMonth() + 1, 0).getDate()
    return { dari: `${y}-${m}-01`, sampai: `${y}-${m}-${last}` }
  }

  function bulanIniStr() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  function periodeSebelumnya() {
    const now = new Date()
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const y = prev.getFullYear()
    const m = String(prev.getMonth() + 1).padStart(2, '0')
    const last = new Date(y, prev.getMonth() + 1, 0).getDate()
    return { dari: `${y}-${m}-01`, sampai: `${y}-${m}-${last}` }
  }

  let periode = $state(defaultPeriode())
  let neracaTanggal = $state(new Date().toLocaleDateString('sv-SE'))
  let periodeBR = $state(bulanIniStr())
  let tahunPajak = $state(String(new Date().getFullYear()))
  let periodeMargin = $state(defaultPeriode())
  let periodeP1 = $state(periodeSebelumnya())
  let periodeP2 = $state(defaultPeriode())
  let periodePelanggan = $state(defaultPeriode())
  let periodeSupplier = $state(defaultPeriode())
  let tahunPenggajian = $state(String(new Date().getFullYear()))

  // ── Load data ─────────────────────────────────────────────────────────────

  async function muatLabaRugi() {
    loading = true; error = ''
    const res = await api.get<LabaRugi>(
      `/laporan/laba-rugi?dari=${periode.dari}&sampai=${periode.sampai}`
    )
    loading = false
    if (res.success) labaRugi = res.data!
    else error = res.error ?? 'Gagal memuat laporan'
  }

  async function muatArusKas() {
    loading = true; error = ''
    const res = await api.get<ArusKas>(
      `/laporan/arus-kas?dari=${periode.dari}&sampai=${periode.sampai}`
    )
    loading = false
    if (res.success) arusKas = res.data!
    else error = res.error ?? 'Gagal memuat laporan'
  }

  async function muatNeraca() {
    loading = true; error = ''
    const res = await api.get<Neraca>(`/laporan/neraca?per_tanggal=${neracaTanggal}`)
    loading = false
    if (res.success) neraca = res.data!
    else error = res.error ?? 'Gagal memuat laporan'
  }

  async function muatAging() {
    loading = true; error = ''
    const res = await api.get<AgingData>('/laporan/aging')
    loading = false
    if (res.success) aging = res.data!
    else error = res.error ?? 'Gagal memuat laporan aging'
  }

  async function muatBudgetRealisasi() {
    loading = true; error = ''
    const [resData, resReal] = await Promise.all([
      api.get<{ target: BudgetRealisasi['target']; budgets: BudgetRealisasi['budgets'] }>(`/budget-target/${periodeBR}`),
      api.get<BudgetRealisasi['realisasi']>(`/budget-target/${periodeBR}/realisasi`),
    ])
    loading = false
    if (!resData.success) { error = resData.error; return }
    if (!resReal.success) { error = resReal.error; return }
    budgetRealisasi = {
      periode: periodeBR,
      target: resData.data.target,
      budgets: resData.data.budgets,
      realisasi: resReal.data,
    }
  }

  async function muatPajakUmkm() {
    loading = true; error = ''
    const res = await api.get<PajakUmkm>(`/laporan/pajak-umkm?tahun=${tahunPajak}`)
    loading = false
    if (res.success) pajakUmkm = res.data!
    else error = res.error ?? 'Gagal memuat laporan pajak'
  }

  async function muatMarginProduk() {
    loading = true; error = ''
    const res = await api.get<MarginProduk>(
      `/laporan/margin-produk?dari=${periodeMargin.dari}&sampai=${periodeMargin.sampai}`
    )
    loading = false
    if (res.success) marginProduk = res.data!
    else error = res.error ?? 'Gagal memuat laporan margin'
  }

  async function muatPerbandingan() {
    loading = true; error = ''
    const [res1, res2] = await Promise.all([
      api.get<LabaRugi>(`/laporan/laba-rugi?dari=${periodeP1.dari}&sampai=${periodeP1.sampai}`),
      api.get<LabaRugi>(`/laporan/laba-rugi?dari=${periodeP2.dari}&sampai=${periodeP2.sampai}`),
    ])
    loading = false
    if (!res1.success) { error = res1.error; return }
    if (!res2.success) { error = res2.error; return }
    perbandingan = { p1: res1.data, p2: res2.data }
  }

  async function muatPersediaan() {
    loading = true; error = ''
    const res = await api.get<Persediaan>('/laporan/persediaan')
    loading = false
    if (res.success) persediaan = res.data!
    else error = res.error ?? 'Gagal memuat persediaan'
  }

  async function muatTopPelanggan() {
    loading = true; error = ''
    const res = await api.get<TopPelanggan>(
      `/laporan/top-pelanggan?dari=${periodePelanggan.dari}&sampai=${periodePelanggan.sampai}`
    )
    loading = false
    if (res.success) topPelanggan = res.data!
    else error = res.error ?? 'Gagal memuat data pelanggan'
  }

  async function muatPembelianSupplier() {
    loading = true; error = ''
    const res = await api.get<PembelianSupplier>(
      `/laporan/pembelian-supplier?dari=${periodeSupplier.dari}&sampai=${periodeSupplier.sampai}`
    )
    loading = false
    if (res.success) pembelianSupplier = res.data!
    else error = res.error ?? 'Gagal memuat data pembelian'
  }

  async function muatRekapPenggajian() {
    loading = true; error = ''
    const res = await api.get<RekapPenggajian>(`/laporan/rekap-penggajian?tahun=${tahunPenggajian}`)
    loading = false
    if (res.success) rekapPenggajian = res.data!
    else error = res.error ?? 'Gagal memuat rekap penggajian'
  }

  async function muat() {
    if (tab === 'laba-rugi') await muatLabaRugi()
    else if (tab === 'arus-kas') await muatArusKas()
    else if (tab === 'neraca') await muatNeraca()
    else if (tab === 'aging') await muatAging()
    else if (tab === 'budget-realisasi') await muatBudgetRealisasi()
    else if (tab === 'pajak-umkm') await muatPajakUmkm()
    else if (tab === 'margin-produk') await muatMarginProduk()
    else if (tab === 'perbandingan') await muatPerbandingan()
    else if (tab === 'persediaan') await muatPersediaan()
    else if (tab === 'top-pelanggan') await muatTopPelanggan()
    else if (tab === 'pembelian-supplier') await muatPembelianSupplier()
    else if (tab === 'rekap-penggajian') await muatRekapPenggajian()
  }

  // Hanya track perubahan `tab`, bukan `periode` (periode diubah manual via tombol Tampilkan)
  $effect(() => {
    tab
    untrack(() => muat())
  })

  // ── Export CSV ────────────────────────────────────────────────────────────

  function downloadCsv(content: string, nama: string) {
    const bom = '﻿' // BOM agar Excel baca UTF-8 dengan benar
    const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nama
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportLabaRugiCsv() {
    if (!labaRugi) return
    const lr = labaRugi
    const rows: (string | number)[][] = [
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
    downloadCsv(rows.map((r) => r.join(',')).join('\n'), `laba-rugi-${lr.periode.dari}-${lr.periode.sampai}.csv`)
  }

  function exportArusKasCsv() {
    if (!arusKas) return
    const ak = arusKas
    const rows: (string | number)[][] = [
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
    downloadCsv(rows.map((r) => r.join(',')).join('\n'), `arus-kas-${ak.periode.dari}-${ak.periode.sampai}.csv`)
  }

  function exportNeracaCsv() {
    if (!neraca) return
    const n = neraca
    const rows: (string | number)[][] = [
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
    downloadCsv(rows.map((r) => r.join(',')).join('\n'), `neraca-${n.per_tanggal}.csv`)
  }

  function exportAgingCsv() {
    if (!aging) return
    const ag = aging
    const rows: (string | number)[][] = [
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
    downloadCsv(rows.map((r) => r.join(',')).join('\n'), `aging-${ag.per_tanggal}.csv`)
  }

  function exportBudgetRealisasiCsv() {
    if (!budgetRealisasi) return
    const br = budgetRealisasi
    const NAMA: Record<string, string> = { gaji: 'Gaji', sewa: 'Sewa', listrik: 'Listrik', kemasan: 'Kemasan', operasional: 'Operasional', lain: 'Lain-lain' }
    const rows: (string | number)[][] = [
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
        return [NAMA[b.kategori] ?? b.kategori, fmtRp(b.nilai_budget), fmtRp(real), fmtRp(b.nilai_budget - real)]
      }),
    ]
    downloadCsv(rows.map((r) => r.join(',')).join('\n'), `budget-realisasi-${br.periode}.csv`)
  }

  function exportPajakUmkmCsv() {
    if (!pajakUmkm) return
    const px = pajakUmkm
    const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
    const rows: (string | number)[][] = [
      ['LAPORAN PAJAK UMKM (PPh Final 0.5%)', ''],
      ['Tahun', px.tahun],
      [],
      ['Bulan', 'Omset', 'Pajak (0.5%)'],
      ...px.bulan.map((b, i) => [BULAN[i]!, fmtRp(b.omset), fmtRp(b.pajak)]),
      [],
      ['TOTAL', fmtRp(px.total_omset), fmtRp(px.total_pajak)],
    ]
    downloadCsv(rows.map((r) => r.join(',')).join('\n'), `pajak-umkm-${px.tahun}.csv`)
  }

  function exportMarginProdukCsv() {
    if (!marginProduk) return
    const mp = marginProduk
    const rows: (string | number)[][] = [
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
    downloadCsv(rows.map((r) => r.join(',')).join('\n'), `margin-produk-${mp.periode.dari}-${mp.periode.sampai}.csv`)
  }

  function exportPerbandinganCsv() {
    if (!perbandingan) return
    const { p1, p2 } = perbandingan
    const delta = (a: number, b: number) => b - a
    const deltaPct = (a: number, b: number) => a !== 0 ? ((b - a) / a) * 100 : 0
    const rows: (string | number)[][] = [
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
    downloadCsv(rows.map((r) => r.join(',')).join('\n'), `perbandingan-${p1.periode.dari}-vs-${p2.periode.dari}.csv`)
  }

  function exportPersediaanCsv() {
    if (!persediaan) return
    const p = persediaan
    const rows: (string | number)[][] = [
      ['LAPORAN NILAI PERSEDIAAN', ''],
      ['Per Tanggal', tglFmt(p.per_tanggal)],
      ['Total Nilai', fmtRp(p.total_nilai)],
      ['Jumlah SKU Aktif', p.jumlah_sku],
      ['SKU Tanpa Stok', p.sku_tanpa_stok],
      [],
      ['Produk', 'Kategori', 'Stok', 'HPP', 'Nilai Stok'],
      ...p.produk.map((pr) => [pr.nama_barang, pr.kategori, pr.stok, fmtRp(pr.hpp), fmtRp(pr.nilai_stok)]),
    ]
    downloadCsv(rows.map((r) => r.join(',')).join('\n'), `persediaan-${p.per_tanggal}.csv`)
  }

  function exportTopPelangganCsv() {
    if (!topPelanggan) return
    const tp = topPelanggan
    const rows: (string | number)[][] = [
      ['LAPORAN TOP PELANGGAN', ''],
      ['Periode', `${tglFmt(tp.periode.dari)} - ${tglFmt(tp.periode.sampai)}`],
      ['Total Omset', fmtRp(tp.total_omset)],
      [],
      ['Nama', 'Tipe', 'Kontak', 'Transaksi', 'Omset', '% Omset'],
      ...tp.pelanggan.map((p) => [p.nama, p.tipe, p.kontak ?? '—', p.jumlah_transaksi, fmtRp(p.total_omset), `${p.pct_omset.toFixed(1)}%`]),
    ]
    downloadCsv(rows.map((r) => r.join(',')).join('\n'), `top-pelanggan-${tp.periode.dari}-${tp.periode.sampai}.csv`)
  }

  function exportPembelianSupplierCsv() {
    if (!pembelianSupplier) return
    const ps = pembelianSupplier
    const rows: (string | number)[][] = [
      ['LAPORAN PEMBELIAN PER SUPPLIER', ''],
      ['Periode', `${tglFmt(ps.periode.dari)} - ${tglFmt(ps.periode.sampai)}`],
      ['Total Pembelian', fmtRp(ps.total_pembelian)],
      [],
      ['Supplier', 'Kontak', 'Penerimaan', 'Total Pembelian', '% Total'],
      ...ps.supplier.map((s) => [s.nama_supplier, s.kontak ?? '—', s.jumlah_penerimaan, fmtRp(s.total_pembelian), `${s.pct_pembelian.toFixed(1)}%`]),
    ]
    downloadCsv(rows.map((r) => r.join(',')).join('\n'), `pembelian-supplier-${ps.periode.dari}-${ps.periode.sampai}.csv`)
  }

  function exportRekapPenggajianCsv() {
    if (!rekapPenggajian) return
    const rp = rekapPenggajian
    const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
    const rows: (string | number)[][] = [
      ['REKAP PENGGAJIAN', ''],
      ['Tahun', rp.tahun],
      ['Total Biaya Gaji', fmtRp(rp.total_gaji_tahun)],
      [],
      ['Bulan', 'Karyawan', 'Gaji Pokok', 'Tunjangan', 'Potongan', 'Total Gaji'],
      ...rp.bulan.map((b, i) => [BULAN[i]!, b.jumlah_karyawan, fmtRp(b.total_gaji_pokok), fmtRp(b.total_tunjangan), fmtRp(b.total_potongan), fmtRp(b.total_gaji)]),
    ]
    downloadCsv(rows.map((r) => r.join(',')).join('\n'), `rekap-penggajian-${rp.tahun}.csv`)
  }

  function exportCsv() {
    if (tab === 'laba-rugi') exportLabaRugiCsv()
    else if (tab === 'arus-kas') exportArusKasCsv()
    else if (tab === 'neraca') exportNeracaCsv()
    else if (tab === 'aging') exportAgingCsv()
    else if (tab === 'budget-realisasi') exportBudgetRealisasiCsv()
    else if (tab === 'pajak-umkm') exportPajakUmkmCsv()
    else if (tab === 'margin-produk') exportMarginProdukCsv()
    else if (tab === 'perbandingan') exportPerbandinganCsv()
    else if (tab === 'persediaan') exportPersediaanCsv()
    else if (tab === 'top-pelanggan') exportTopPelangganCsv()
    else if (tab === 'pembelian-supplier') exportPembelianSupplierCsv()
    else if (tab === 'rekap-penggajian') exportRekapPenggajianCsv()
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function fmt(n: number): string {
    return new Intl.NumberFormat('id-ID').format(Math.round(n))
  }

  function fmtPct(n: number): string {
    return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`
  }

  function fmtRp(n: number): string {
    return `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(n))}`
  }

  function tglFmt(t: string): string {
    return new Date(t).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
  }
</script>

<style>
  @media print {
    @page { margin: 1.5cm; }

    :global(nav), :global(.no-print) { display: none !important; }

    /* Override CSS variables ke warna cetak — semua inline var() ikut otomatis */
    :global(:root), :global([data-theme]) {
      --bg: #ffffff !important;
      --surface: #ffffff !important;
      --surface2: #f4f4f4 !important;
      --border: #999999 !important;
      --text: #000000 !important;
      --text-dim: #444444 !important;
      --accent: #006600 !important;
      --danger: #cc0000 !important;
      --info: #004499 !important;
    }

    :global(body) {
      background: white !important;
      color: black !important;
      font-size: 11pt !important;
    }

    /* Pastikan tabel punya border saat cetak */
    :global(table) { border-collapse: collapse !important; width: 100% !important; }
    :global(td), :global(th) {
      border: 1px solid #999 !important;
      padding: .3rem .5rem !important;
    }
  }
</style>

<!-- ───────────────────────────────────────────── HEADER ── -->
<div style="padding:1rem 1.25rem 0" class="no-print">
  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem">
    <h1 style="font-size:1.1rem; font-weight:700; color:var(--text)">Laporan</h1>
    <div style="display:flex; gap:.5rem">
      <button
        onclick={exportCsv}
        style="padding:.4rem .9rem; background:var(--surface2); border:1px solid var(--border); color:var(--text); border-radius:4px; font-family:inherit; font-size:.8rem; cursor:pointer"
      >Export CSV</button>
      <button
        onclick={() => window.print()}
        style="padding:.4rem .9rem; background:var(--surface2); border:1px solid var(--border); color:var(--text); border-radius:4px; font-family:inherit; font-size:.8rem; cursor:pointer"
      >Print / PDF</button>
    </div>
  </div>

  <!-- Filter Periode -->
  {#if tab === 'laba-rugi' || tab === 'arus-kas'}
    <div style="display:flex; gap:.75rem; align-items:center; margin-bottom:1rem; flex-wrap:wrap">
      <div style="display:flex; gap:.4rem; align-items:center">
        <label for="dari" style="font-size:.75rem; color:var(--text-dim)">Dari</label>
        <input id="dari" type="date" bind:value={periode.dari}
          style="padding:.35rem .6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.82rem" />
      </div>
      <div style="display:flex; gap:.4rem; align-items:center">
        <label for="sampai" style="font-size:.75rem; color:var(--text-dim)">Sampai</label>
        <input id="sampai" type="date" bind:value={periode.sampai}
          style="padding:.35rem .6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.82rem" />
      </div>
      <button
        onclick={muat}
        style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
      >Tampilkan</button>
      {#each [
        { label: 'Hari ini', fn: () => { const t = new Date().toLocaleDateString('sv-SE'); periode = { dari: t, sampai: t }; muat() } },
        { label: 'Minggu ini', fn: () => { const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1); const sun = new Date(mon); sun.setDate(mon.getDate() + 6); periode = { dari: mon.toLocaleDateString('sv-SE'), sampai: sun.toLocaleDateString('sv-SE') }; muat() } },
        { label: 'Bulan ini', fn: () => { periode = defaultPeriode(); muat() } },
      ] as s}
        <button
          onclick={s.fn}
          style="padding:.25rem .6rem; background:transparent; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.72rem; cursor:pointer"
        >{s.label}</button>
      {/each}
    </div>
  {:else if tab === 'neraca' || tab === 'aging'}
    <div style="display:flex; gap:.75rem; align-items:center; margin-bottom:1rem; flex-wrap:wrap">
      <div style="display:flex; gap:.4rem; align-items:center">
        <label for="neraca-tgl" style="font-size:.75rem; color:var(--text-dim)">Per Tanggal</label>
        <input id="neraca-tgl" type="date" bind:value={neracaTanggal}
          style="padding:.35rem .6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.82rem" />
      </div>
      <button
        onclick={muatNeraca}
        style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
      >Tampilkan</button>
      {#each [
        { label: 'Hari ini', fn: () => { neracaTanggal = new Date().toLocaleDateString('sv-SE'); muatNeraca() } },
        { label: 'Akhir bulan lalu', fn: () => { const d = new Date(); d.setDate(0); neracaTanggal = d.toLocaleDateString('sv-SE'); muatNeraca() } },
      ] as s}
        <button
          onclick={s.fn}
          style="padding:.25rem .6rem; background:transparent; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.72rem; cursor:pointer"
        >{s.label}</button>
      {/each}
      <span style="font-size:.72rem; color:var(--text-dim)">* nilai persediaan stok = kondisi saat ini</span>
    </div>
  {:else if tab === 'budget-realisasi'}
    <div style="display:flex; gap:.75rem; align-items:center; margin-bottom:1rem; flex-wrap:wrap">
      <div style="display:flex; gap:.4rem; align-items:center">
        <label for="br-bulan" style="font-size:.75rem; color:var(--text-dim)">Bulan</label>
        <input id="br-bulan" type="month" bind:value={periodeBR}
          style="padding:.35rem .6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.82rem" />
      </div>
      <button
        onclick={muatBudgetRealisasi}
        style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
      >Tampilkan</button>
      {#each [
        { label: 'Bulan ini', fn: () => { periodeBR = bulanIniStr(); muatBudgetRealisasi() } },
        { label: 'Bulan lalu', fn: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); periodeBR = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; muatBudgetRealisasi() } },
      ] as s}
        <button
          onclick={s.fn}
          style="padding:.25rem .6rem; background:transparent; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.72rem; cursor:pointer"
        >{s.label}</button>
      {/each}
    </div>
  {:else if tab === 'pajak-umkm'}
    <div style="display:flex; gap:.75rem; align-items:center; margin-bottom:1rem; flex-wrap:wrap">
      <div style="display:flex; gap:.4rem; align-items:center">
        <label for="pajak-tahun" style="font-size:.75rem; color:var(--text-dim)">Tahun</label>
        <input id="pajak-tahun" type="number" min="2020" max="2099" bind:value={tahunPajak}
          style="padding:.35rem .6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.82rem; width:5.5rem" />
      </div>
      <button
        onclick={muatPajakUmkm}
        style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
      >Tampilkan</button>
    </div>
  {:else if tab === 'margin-produk'}
    <div style="display:flex; gap:.75rem; align-items:center; margin-bottom:1rem; flex-wrap:wrap">
      <div style="display:flex; gap:.4rem; align-items:center">
        <label for="mp-dari" style="font-size:.75rem; color:var(--text-dim)">Dari</label>
        <input id="mp-dari" type="date" bind:value={periodeMargin.dari}
          style="padding:.35rem .6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.82rem" />
      </div>
      <div style="display:flex; gap:.4rem; align-items:center">
        <label for="mp-sampai" style="font-size:.75rem; color:var(--text-dim)">Sampai</label>
        <input id="mp-sampai" type="date" bind:value={periodeMargin.sampai}
          style="padding:.35rem .6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.82rem" />
      </div>
      <button
        onclick={muatMarginProduk}
        style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
      >Tampilkan</button>
      {#each [
        { label: 'Bulan ini', fn: () => { periodeMargin = defaultPeriode(); muatMarginProduk() } },
        { label: 'Bulan lalu', fn: () => { periodeMargin = periodeSebelumnya(); muatMarginProduk() } },
      ] as s}
        <button onclick={s.fn}
          style="padding:.25rem .6rem; background:transparent; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.72rem; cursor:pointer"
        >{s.label}</button>
      {/each}
    </div>
  {:else if tab === 'persediaan'}
    <div style="display:flex; gap:.75rem; align-items:center; margin-bottom:1rem">
      <button
        onclick={muatPersediaan}
        style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
      >Refresh</button>
      <span style="font-size:.75rem; color:var(--text-dim)">Nilai stok kondisi saat ini</span>
    </div>
  {:else if tab === 'top-pelanggan'}
    <div style="display:flex; gap:.75rem; align-items:center; margin-bottom:1rem; flex-wrap:wrap">
      <div style="display:flex; gap:.4rem; align-items:center">
        <label for="pl-dari" style="font-size:.75rem; color:var(--text-dim)">Dari</label>
        <input id="pl-dari" type="date" bind:value={periodePelanggan.dari}
          style="padding:.35rem .6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.82rem" />
      </div>
      <div style="display:flex; gap:.4rem; align-items:center">
        <label for="pl-sampai" style="font-size:.75rem; color:var(--text-dim)">Sampai</label>
        <input id="pl-sampai" type="date" bind:value={periodePelanggan.sampai}
          style="padding:.35rem .6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.82rem" />
      </div>
      <button onclick={muatTopPelanggan}
        style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
      >Tampilkan</button>
      {#each [
        { label: 'Bulan ini', fn: () => { periodePelanggan = defaultPeriode(); muatTopPelanggan() } },
        { label: 'Bulan lalu', fn: () => { periodePelanggan = periodeSebelumnya(); muatTopPelanggan() } },
      ] as s}
        <button onclick={s.fn}
          style="padding:.25rem .6rem; background:transparent; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.72rem; cursor:pointer"
        >{s.label}</button>
      {/each}
    </div>
  {:else if tab === 'pembelian-supplier'}
    <div style="display:flex; gap:.75rem; align-items:center; margin-bottom:1rem; flex-wrap:wrap">
      <div style="display:flex; gap:.4rem; align-items:center">
        <label for="sp-dari" style="font-size:.75rem; color:var(--text-dim)">Dari</label>
        <input id="sp-dari" type="date" bind:value={periodeSupplier.dari}
          style="padding:.35rem .6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.82rem" />
      </div>
      <div style="display:flex; gap:.4rem; align-items:center">
        <label for="sp-sampai" style="font-size:.75rem; color:var(--text-dim)">Sampai</label>
        <input id="sp-sampai" type="date" bind:value={periodeSupplier.sampai}
          style="padding:.35rem .6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.82rem" />
      </div>
      <button onclick={muatPembelianSupplier}
        style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
      >Tampilkan</button>
      {#each [
        { label: 'Bulan ini', fn: () => { periodeSupplier = defaultPeriode(); muatPembelianSupplier() } },
        { label: 'Bulan lalu', fn: () => { periodeSupplier = periodeSebelumnya(); muatPembelianSupplier() } },
      ] as s}
        <button onclick={s.fn}
          style="padding:.25rem .6rem; background:transparent; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.72rem; cursor:pointer"
        >{s.label}</button>
      {/each}
    </div>
  {:else if tab === 'rekap-penggajian'}
    <div style="display:flex; gap:.75rem; align-items:center; margin-bottom:1rem; flex-wrap:wrap">
      <div style="display:flex; gap:.4rem; align-items:center">
        <label for="pg-tahun" style="font-size:.75rem; color:var(--text-dim)">Tahun</label>
        <input id="pg-tahun" type="number" min="2020" max="2099" bind:value={tahunPenggajian}
          style="padding:.35rem .6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.82rem; width:5.5rem" />
      </div>
      <button onclick={muatRekapPenggajian}
        style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
      >Tampilkan</button>
    </div>
  {:else if tab === 'perbandingan'}
    <div style="display:flex; gap:.75rem; align-items:flex-end; margin-bottom:1rem; flex-wrap:wrap">
      <div style="display:flex; flex-direction:column; gap:.3rem">
        <div style="font-size:.72rem; color:var(--text-dim); font-weight:600">Periode 1</div>
        <div style="display:flex; gap:.4rem; align-items:center">
          <input type="date" bind:value={periodeP1.dari}
            style="padding:.35rem .6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.82rem" />
          <span style="font-size:.75rem; color:var(--text-dim)">—</span>
          <input type="date" bind:value={periodeP1.sampai}
            style="padding:.35rem .6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.82rem" />
        </div>
      </div>
      <div style="display:flex; flex-direction:column; gap:.3rem">
        <div style="font-size:.72rem; color:var(--text-dim); font-weight:600">Periode 2</div>
        <div style="display:flex; gap:.4rem; align-items:center">
          <input type="date" bind:value={periodeP2.dari}
            style="padding:.35rem .6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.82rem" />
          <span style="font-size:.75rem; color:var(--text-dim)">—</span>
          <input type="date" bind:value={periodeP2.sampai}
            style="padding:.35rem .6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.82rem" />
        </div>
      </div>
      <button
        onclick={muatPerbandingan}
        style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
      >Bandingkan</button>
    </div>
  {/if}

  <!-- Tabs -->
  <TabBar
    tabs={[
      { key: 'laba-rugi', label: 'Laba Rugi' },
      { key: 'arus-kas', label: 'Arus Kas' },
      { key: 'neraca', label: 'Neraca' },
      { key: 'aging', label: 'Aging' },
      { key: 'budget-realisasi', label: 'Budget vs Aktual' },
      { key: 'pajak-umkm', label: 'Pajak UMKM' },
      { key: 'margin-produk', label: 'Margin Produk' },
      { key: 'perbandingan', label: 'Perbandingan' },
      { key: 'persediaan', label: 'Persediaan' },
      { key: 'top-pelanggan', label: 'Top Pelanggan' },
      { key: 'pembelian-supplier', label: 'Pembelian Supplier' },
      { key: 'rekap-penggajian', label: 'Rekap Penggajian' },
    ]}
    active={tab}
    storageKey="laporan"
    onchange={(key) => goto(`?tab=${key}`, { replaceState: true, keepFocus: true, noScroll: true })}
  />
</div>

{#if error}
  <div style="margin:0 1.25rem 1rem; padding:.6rem .9rem; background:rgba(255,82,82,.15); border:1px solid var(--danger); border-radius:4px; color:var(--danger); font-size:.8rem" class="no-print">
    {error}
    <button onclick={() => error = ''} style="float:right; background:none; border:none; color:var(--danger); cursor:pointer">✕</button>
  </div>
{/if}

{#if loading}
  <p style="padding:1.25rem; color:var(--text-dim); font-size:.85rem">Memuat laporan...</p>

<!-- ═══════════════════════════════════════ LABA RUGI ════ -->
{:else if tab === 'laba-rugi' && labaRugi}
  <div style="padding:0 1.25rem 2rem; max-width:680px">
    <div style="text-align:center; margin-bottom:1.5rem">
      <div style="font-size:1rem; font-weight:700; color:var(--text)">LAPORAN LABA RUGI</div>
      <div style="font-size:.8rem; color:var(--text-dim)">
        Periode {tglFmt(labaRugi.periode.dari)} — {tglFmt(labaRugi.periode.sampai)}
      </div>
    </div>

    <!-- Penjualan -->
    <div style="margin-bottom:1.25rem">
      <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem; padding-bottom:.3rem; border-bottom:1px solid var(--border)">
        Penjualan ({labaRugi.penjualan.jumlah_transaksi} transaksi)
      </div>
      {#each [
        ['Penjualan Bruto', labaRugi.penjualan.bruto, false],
        ['Diskon', labaRugi.penjualan.diskon, true],
        ['Penjualan Bersih', labaRugi.penjualan.bersih, false],
      ] as [label, val, minus]}
        <div style="display:flex; justify-content:space-between; padding:.3rem 0; font-size:.85rem; color:{label === 'Penjualan Bersih' ? 'var(--text)' : 'var(--text-dim)'}; font-weight:{label === 'Penjualan Bersih' ? '600' : '400'}">
          <span>{label}</span>
          <span>{minus ? '(' : ''}Rp {fmt(val as number)}{minus ? ')' : ''}</span>
        </div>
      {/each}
    </div>

    <!-- HPP & Laba Kotor -->
    <div style="margin-bottom:1.25rem">
      <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem; padding-bottom:.3rem; border-bottom:1px solid var(--border)">
        Harga Pokok Penjualan
      </div>
      <div style="display:flex; justify-content:space-between; padding:.3rem 0; font-size:.85rem; color:var(--text-dim)">
        <span>HPP (estimasi)</span>
        <span>(Rp {fmt(labaRugi.hpp)})</span>
      </div>
      <div style="display:flex; justify-content:space-between; padding:.4rem 0; font-size:.9rem; font-weight:700; color:var(--accent); border-top:1px solid var(--border); margin-top:.3rem">
        <span>Laba Kotor</span>
        <span>Rp {fmt(labaRugi.laba_kotor)} <span style="font-size:.72rem; font-weight:400">({fmtPct(labaRugi.margin_kotor_persen)})</span></span>
      </div>
    </div>

    <!-- Biaya Operasional -->
    {#if labaRugi.biaya_operasional.total > 0}
      <div style="margin-bottom:1.25rem">
        <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem; padding-bottom:.3rem; border-bottom:1px solid var(--border)">
          Biaya Operasional
        </div>
        {#each Object.entries(labaRugi.biaya_operasional.per_kategori) as [kat, jml]}
          <div style="display:flex; justify-content:space-between; padding:.3rem 0; font-size:.85rem; color:var(--text-dim)">
            <span style="text-transform:capitalize">{kat.replace(/_/g, ' ')}</span>
            <span>(Rp {fmt(jml)})</span>
          </div>
        {/each}
        <div style="display:flex; justify-content:space-between; padding:.3rem 0 0; font-size:.85rem; font-weight:600; color:var(--text); border-top:1px solid var(--border); margin-top:.3rem">
          <span>Total Biaya</span>
          <span>(Rp {fmt(labaRugi.biaya_operasional.total)})</span>
        </div>
      </div>
    {/if}

    <!-- Laba Bersih -->
    <div style="background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:.9rem 1rem; display:flex; justify-content:space-between; align-items:center">
      <span style="font-size:.9rem; font-weight:700; color:var(--text)">LABA BERSIH</span>
      <div style="text-align:right">
        <div style="font-size:1.2rem; font-weight:700; color:{labaRugi.laba_bersih >= 0 ? 'var(--accent)' : 'var(--danger)'}">
          Rp {fmt(labaRugi.laba_bersih)}
        </div>
        <div style="font-size:.72rem; color:var(--text-dim)">{fmtPct(labaRugi.margin_bersih_persen)} dari penjualan</div>
      </div>
    </div>
  </div>

<!-- ═══════════════════════════════════════ ARUS KAS ═════ -->
{:else if tab === 'arus-kas' && arusKas}
  <div style="padding:0 1.25rem 2rem; max-width:720px">
    <div style="text-align:center; margin-bottom:1.5rem">
      <div style="font-size:1rem; font-weight:700; color:var(--text)">LAPORAN ARUS KAS</div>
      <div style="font-size:.8rem; color:var(--text-dim)">
        Periode {tglFmt(arusKas.periode.dari)} — {tglFmt(arusKas.periode.sampai)}
      </div>
    </div>

    <!-- Ringkasan saldo -->
    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:.75rem; margin-bottom:1.5rem">
      {#each [
        ['Saldo Awal', arusKas.saldo_awal, 'var(--text)'],
        ['Net Periode', arusKas.net, arusKas.net >= 0 ? 'var(--accent)' : 'var(--danger)'],
        ['Saldo Akhir', arusKas.saldo_akhir, arusKas.saldo_akhir >= 0 ? 'var(--accent)' : 'var(--danger)'],
      ] as [label, val, warna]}
        <div style="background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:.75rem 1rem">
          <div style="font-size:.7rem; color:var(--text-dim); margin-bottom:.25rem">{label}</div>
          <div style="font-size:1rem; font-weight:700; color:{warna}">Rp {fmt(val as number)}</div>
        </div>
      {/each}
    </div>

    <!-- Per akun -->
    <div style="margin-bottom:1.5rem">
      <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem; padding-bottom:.3rem; border-bottom:1px solid var(--border)">
        Per Akun Kas/Bank
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:.83rem">
        <thead>
          <tr>
            {#each ['Akun','Saldo Awal','Masuk','Keluar','Saldo Akhir'] as h}
              <th style="padding:.4rem .5rem; text-align:{h==='Akun'?'left':'right'}; color:var(--text-dim); font-size:.72rem; font-weight:600">{h}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each arusKas.per_akun as akun}
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:.4rem .5rem; color:var(--text)">{akun.nama}</td>
              <td style="padding:.4rem .5rem; text-align:right; color:var(--text-dim)">Rp {fmt(akun.saldo_awal)}</td>
              <td style="padding:.4rem .5rem; text-align:right; color:var(--accent)">+Rp {fmt(akun.masuk)}</td>
              <td style="padding:.4rem .5rem; text-align:right; color:var(--danger)">−Rp {fmt(akun.keluar)}</td>
              <td style="padding:.4rem .5rem; text-align:right; font-weight:700; color:{akun.saldo_akhir >= 0 ? 'var(--accent)' : 'var(--danger)'}">
                Rp {fmt(akun.saldo_akhir)}
              </td>
            </tr>
          {/each}
          <tr style="font-weight:700; border-top:2px solid var(--border)">
            <td style="padding:.5rem .5rem; color:var(--text)">TOTAL</td>
            <td style="padding:.5rem .5rem; text-align:right; color:var(--text-dim)">Rp {fmt(arusKas.saldo_awal)}</td>
            <td style="padding:.5rem .5rem; text-align:right; color:var(--accent)">+Rp {fmt(arusKas.total_masuk)}</td>
            <td style="padding:.5rem .5rem; text-align:right; color:var(--danger)">−Rp {fmt(arusKas.total_keluar)}</td>
            <td style="padding:.5rem .5rem; text-align:right; color:{arusKas.saldo_akhir >= 0 ? 'var(--accent)' : 'var(--danger)'}">
              Rp {fmt(arusKas.saldo_akhir)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Per kategori -->
    {#if Object.keys(arusKas.per_kategori).length > 0}
      <div>
        <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem; padding-bottom:.3rem; border-bottom:1px solid var(--border)">
          Rincian Per Kategori
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:.83rem">
          <thead>
            <tr>
              {#each ['Kategori','Masuk','Keluar'] as h}
                <th style="padding:.35rem .5rem; text-align:{h==='Kategori'?'left':'right'}; color:var(--text-dim); font-size:.72rem; font-weight:600">{h}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each Object.entries(arusKas.per_kategori).sort((a,b) => (b[1].masuk+b[1].keluar)-(a[1].masuk+a[1].keluar)) as [kat, val]}
              <tr style="border-bottom:1px solid var(--border)">
                <td style="padding:.35rem .5rem; color:var(--text); text-transform:capitalize">{kat.replace(/_/g,' ')}</td>
                <td style="padding:.35rem .5rem; text-align:right; color:{val.masuk>0?'var(--accent)':'var(--text-dim)'}">
                  {val.masuk > 0 ? `+Rp ${fmt(val.masuk)}` : '—'}
                </td>
                <td style="padding:.35rem .5rem; text-align:right; color:{val.keluar>0?'var(--danger)':'var(--text-dim)'}">
                  {val.keluar > 0 ? `−Rp ${fmt(val.keluar)}` : '—'}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    {#if arusKas.total_masuk === 0 && arusKas.total_keluar === 0}
      <p style="color:var(--text-dim); font-size:.85rem; margin-top:1rem">Tidak ada aktivitas kas pada periode ini.</p>
    {/if}
  </div>

<!-- ═══════════════════════════════════════ NERACA ═══════ -->
{:else if tab === 'neraca' && neraca}
  <div style="padding:0 1.25rem 2rem; max-width:680px">
    <div style="text-align:center; margin-bottom:1.5rem">
      <div style="font-size:1rem; font-weight:700; color:var(--text)">NERACA</div>
      <div style="font-size:.8rem; color:var(--text-dim)">Per tanggal {tglFmt(neraca.per_tanggal)}</div>
      {#if !neraca.check.balanced}
        <div style="font-size:.72rem; color:var(--danger); margin-top:.25rem">⚠ Neraca tidak balance — periksa data</div>
      {/if}
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem">
      <!-- ASET -->
      <div>
        <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem; padding-bottom:.3rem; border-bottom:1px solid var(--border)">
          Aset
        </div>

        <div style="font-size:.75rem; color:var(--text-dim); margin:.5rem 0 .25rem; font-weight:600">Kas & Bank</div>
        {#each neraca.aset.kas_bank as akun}
          <div style="display:flex; justify-content:space-between; font-size:.82rem; padding:.2rem 0; color:var(--text-dim)">
            <span>{akun.nama}</span>
            <span>Rp {fmt(akun.saldo)}</span>
          </div>
        {/each}
        <div style="display:flex; justify-content:space-between; font-size:.82rem; padding:.3rem 0; color:var(--text); font-weight:600; border-top:1px solid var(--border); margin-top:.2rem">
          <span>Subtotal Kas</span>
          <span>Rp {fmt(neraca.aset.total_kas_bank)}</span>
        </div>

        <div style="margin-top:.75rem">
          <div style="display:flex; justify-content:space-between; font-size:.82rem; padding:.2rem 0; color:var(--text-dim)">
            <span>Piutang Pelanggan</span>
            <span>Rp {fmt(neraca.aset.piutang_pelanggan)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:.82rem; padding:.2rem 0; color:var(--text-dim)">
            <span>Nilai Persediaan</span>
            <span>Rp {fmt(neraca.aset.nilai_persediaan)}</span>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; font-size:.9rem; font-weight:700; padding:.5rem 0; color:var(--accent); border-top:2px solid var(--border); margin-top:.5rem">
          <span>TOTAL ASET</span>
          <span>Rp {fmt(neraca.aset.total)}</span>
        </div>
      </div>

      <!-- LIABILITAS & MODAL -->
      <div>
        <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem; padding-bottom:.3rem; border-bottom:1px solid var(--border)">
          Liabilitas
        </div>
        <div style="display:flex; justify-content:space-between; font-size:.82rem; padding:.2rem 0; color:var(--text-dim)">
          <span>Hutang Supplier</span>
          <span>Rp {fmt(neraca.liabilitas.hutang_supplier)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:.9rem; font-weight:700; padding:.5rem 0; color:var(--danger); border-top:2px solid var(--border); margin-top:.5rem">
          <span>TOTAL LIABILITAS</span>
          <span>Rp {fmt(neraca.liabilitas.total)}</span>
        </div>

        <div style="margin-top:1.25rem">
          <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem; padding-bottom:.3rem; border-bottom:1px solid var(--border)">
            Modal
          </div>
          <div style="display:flex; justify-content:space-between; font-size:.9rem; font-weight:700; padding:.5rem 0; color:var(--accent); border-top:2px solid var(--border); margin-top:.5rem">
            <span>TOTAL MODAL</span>
            <span>Rp {fmt(neraca.modal.total)}</span>
          </div>
        </div>

        <div style="margin-top:1.25rem; background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:.6rem .75rem">
          <div style="display:flex; justify-content:space-between; font-size:.8rem; color:var(--text-dim)">
            <span>Liabilitas + Modal</span>
            <span>Rp {fmt(neraca.check.liabilitas_plus_modal)}</span>
          </div>
          <div style="font-size:.72rem; color:{neraca.check.balanced ? 'var(--accent)' : 'var(--danger)'}; margin-top:.25rem; font-weight:600">
            {neraca.check.balanced ? '✓ Balance' : '✗ Tidak balance'}
          </div>
        </div>
      </div>
    </div>
  </div>

<!-- ═══════════════════════════════════════ AGING ════════ -->
{:else if tab === 'aging' && aging}
  <div style="padding:0 1.25rem 2rem; max-width:760px">
    <div style="text-align:center; margin-bottom:1.25rem">
      <div style="font-size:1rem; font-weight:700; color:var(--text)">LAPORAN AGING</div>
      <div style="font-size:.8rem; color:var(--text-dim)">Per {tglFmt(aging.per_tanggal)}</div>
    </div>

    {#each [
      { title: 'Piutang Pelanggan', buckets: aging.piutang, total: aging.total_piutang, prefix: 'p' },
      { title: 'Hutang Supplier', buckets: aging.hutang, total: aging.total_hutang, prefix: 'h' },
    ] as section}
      <div style="margin-bottom:1.75rem">
        <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.75rem; padding-bottom:.35rem; border-bottom:1px solid var(--border)">
          {section.title} — Total Rp {fmt(section.total)}
        </div>

        {#each section.buckets as bucket, i}
          {@const key = `${section.prefix}_${i}`}
          {@const warna = i === 0 ? 'var(--accent)' : i === 1 ? 'var(--warn)' : 'var(--danger)'}
          {#if bucket.jumlah > 0}
            <div style="margin-bottom:.5rem; border:1px solid var(--border); border-radius:6px; overflow:hidden; background:var(--surface)">
              <button
                onclick={() => { agingExpanded[key] = !agingExpanded[key] }}
                style="width:100%; display:flex; justify-content:space-between; align-items:center; padding:.6rem .85rem; background:none; border:none; cursor:pointer; text-align:left"
              >
                <div style="display:flex; align-items:center; gap:.6rem">
                  <span style="width:8px; height:8px; border-radius:50%; background:{warna}; display:inline-block; flex-shrink:0"></span>
                  <span style="font-size:.85rem; font-weight:600; color:var(--text)">{bucket.label}</span>
                  <span style="font-size:.75rem; color:var(--text-dim)">{bucket.jumlah} item</span>
                </div>
                <div style="display:flex; align-items:center; gap:.75rem">
                  <span style="font-size:.9rem; font-weight:700; color:{warna}">Rp {fmt(bucket.total)}</span>
                  <span style="font-size:.8rem; color:var(--text-dim)">{agingExpanded[key] ? '▲' : '▼'}</span>
                </div>
              </button>

              {#if agingExpanded[key]}
                <div style="border-top:1px solid var(--border)">
                  <table style="width:100%; font-size:.78rem; border-collapse:collapse">
                    <thead>
                      <tr style="background:var(--surface2)">
                        <th style="padding:.4rem .85rem; text-align:left; color:var(--text-dim); font-weight:600">Nama</th>
                        <th style="padding:.4rem .5rem; text-align:right; color:var(--text-dim); font-weight:600">Jatuh Tempo</th>
                        <th style="padding:.4rem .5rem; text-align:right; color:var(--text-dim); font-weight:600">Hari</th>
                        <th style="padding:.4rem .85rem; text-align:right; color:var(--text-dim); font-weight:600">Sisa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each bucket.items as item}
                        <tr style="border-top:1px solid var(--border)">
                          <td style="padding:.35rem .85rem; color:var(--text)">{item.nama}</td>
                          <td style="padding:.35rem .5rem; text-align:right; color:var(--text-dim); font-family:monospace">{item.jatuh_tempo || '—'}</td>
                          <td style="padding:.35rem .5rem; text-align:right; color:{item.hari > 0 ? warna : 'var(--text-dim)'}; font-family:monospace">
                            {item.hari < 0 ? `${Math.abs(item.hari)}h lagi` : item.hari === 0 ? 'Hari ini' : `${item.hari}h`}
                          </td>
                          <td style="padding:.35rem .85rem; text-align:right; color:var(--text); font-weight:600">Rp {fmt(item.sisa)}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {/if}
            </div>
          {:else}
            <div style="display:flex; justify-content:space-between; align-items:center; padding:.45rem .85rem; border-radius:4px; margin-bottom:.35rem; background:var(--surface)">
              <div style="display:flex; align-items:center; gap:.6rem">
                <span style="width:8px; height:8px; border-radius:50%; background:var(--border); display:inline-block"></span>
                <span style="font-size:.82rem; color:var(--text-dim)">{bucket.label}</span>
              </div>
              <span style="font-size:.78rem; color:var(--text-dim)">Nihil</span>
            </div>
          {/if}
        {/each}
      </div>
    {/each}

    <button
      onclick={muatAging}
      style="font-size:.75rem; padding:.35rem .75rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text-dim); cursor:pointer; font-family:inherit"
    >Refresh Data</button>
  </div>

<!-- ═══════════════════════════════════ BUDGET VS AKTUAL ════ -->
{:else if tab === 'budget-realisasi' && budgetRealisasi}
  {@const br = budgetRealisasi}
  {@const NAMA: Record<string, string> = { gaji: 'Gaji', sewa: 'Sewa', listrik: 'Listrik', kemasan: 'Kemasan', operasional: 'Operasional', lain: 'Lain-lain' }}
  <div style="padding:0 1.25rem 2rem; max-width:680px">
    <div style="text-align:center; margin-bottom:1.5rem">
      <div style="font-size:1rem; font-weight:700; color:var(--text)">REALISASI BUDGET VS AKTUAL</div>
      <div style="font-size:.8rem; color:var(--text-dim)">Periode {br.periode}</div>
    </div>

    {#if !br.target}
      <div style="padding:.6rem .9rem; background:rgba(255,200,0,.1); border:1px solid var(--warn); border-radius:4px; color:var(--warn); font-size:.8rem; margin-bottom:1.25rem">
        Belum ada target yang diset untuk bulan ini. Atur target di menu Keuangan → Budget & Target.
      </div>
    {/if}

    <!-- Ringkasan Penjualan -->
    <div style="margin-bottom:1.5rem">
      <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem; padding-bottom:.3rem; border-bottom:1px solid var(--border)">
        Penjualan
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:.84rem">
        <thead>
          <tr style="background:var(--surface2)">
            <th style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600">Metrik</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Target</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Realisasi</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">%</th>
          </tr>
        </thead>
        <tbody>
          {#each [
            { label: 'Omzet', target: br.target?.target_omzet ?? null, real: br.realisasi.realisasi_omzet, isRp: true, higher: true },
            { label: 'Transaksi', target: br.target?.target_transaksi ?? null, real: br.realisasi.realisasi_transaksi, isRp: false, higher: true },
            { label: 'Margin %', target: br.target?.target_margin_pct ?? null, real: br.realisasi.realisasi_margin_pct, isRp: false, higher: true, isPct: true },
          ] as row}
            {@const pct = row.target && row.target > 0 ? (row.real / row.target) * 100 : null}
            {@const ok = pct !== null ? (row.higher ? pct >= 90 : pct <= 110) : null}
            <tr style="border-top:1px solid var(--border)">
              <td style="padding:.4rem .75rem; color:var(--text)">{row.label}</td>
              <td style="padding:.4rem .75rem; text-align:right; color:var(--text-dim)">
                {#if row.target !== null}
                  {#if row.isPct}{row.target.toFixed(1)}%{:else if row.isRp}Rp {fmt(row.target)}{:else}{fmt(row.target)}{/if}
                {:else}—{/if}
              </td>
              <td style="padding:.4rem .75rem; text-align:right; color:var(--text); font-weight:600">
                {#if row.isPct}{row.real.toFixed(1)}%{:else if row.isRp}Rp {fmt(row.real)}{:else}{fmt(row.real)}{/if}
              </td>
              <td style="padding:.4rem .75rem; text-align:right; font-weight:700; color:{ok === null ? 'var(--text-dim)' : ok ? 'var(--accent)' : 'var(--danger)'}">
                {pct !== null ? `${pct.toFixed(0)}%` : '—'}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Biaya Operasional -->
    <div style="margin-bottom:1.25rem">
      <div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem; padding-bottom:.3rem; border-bottom:1px solid var(--border)">
        Biaya Operasional
      </div>
      {#if br.budgets.length === 0}
        <p style="font-size:.82rem; color:var(--text-dim)">Belum ada budget operasional yang diset untuk bulan ini.</p>
      {:else}
        <table style="width:100%; border-collapse:collapse; font-size:.84rem">
          <thead>
            <tr style="background:var(--surface2)">
              <th style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600">Kategori</th>
              <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Budget</th>
              <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Realisasi</th>
              <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Selisih</th>
            </tr>
          </thead>
          <tbody>
            {#each br.budgets as b}
              {@const real = br.realisasi.realisasi_budget[b.kategori] ?? 0}
              {@const selisih = b.nilai_budget - real}
              <tr style="border-top:1px solid var(--border)">
                <td style="padding:.4rem .75rem; color:var(--text)">{NAMA[b.kategori] ?? b.kategori}</td>
                <td style="padding:.4rem .75rem; text-align:right; color:var(--text-dim)">Rp {fmt(b.nilai_budget)}</td>
                <td style="padding:.4rem .75rem; text-align:right; color:var(--text)">Rp {fmt(real)}</td>
                <td style="padding:.4rem .75rem; text-align:right; font-weight:600; color:{selisih >= 0 ? 'var(--accent)' : 'var(--danger)'}">
                  {selisih >= 0 ? '+' : ''}Rp {fmt(selisih)}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  </div>

<!-- ═══════════════════════════════════════ PAJAK UMKM ════ -->
{:else if tab === 'pajak-umkm' && pajakUmkm}
  {@const px = pajakUmkm}
  {@const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']}
  <div style="padding:0 1.25rem 2rem; max-width:560px">
    <div style="text-align:center; margin-bottom:1.5rem">
      <div style="font-size:1rem; font-weight:700; color:var(--text)">LAPORAN PAJAK UMKM</div>
      <div style="font-size:.8rem; color:var(--text-dim)">Tahun {px.tahun} — PPh Final 0.5% (PP 23/2018)</div>
    </div>

    <!-- Ringkasan -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:.75rem; margin-bottom:1.5rem">
      <div style="padding:.85rem 1rem; background:var(--surface); border:1px solid var(--border); border-radius:6px">
        <div style="font-size:.72rem; color:var(--text-dim); margin-bottom:.3rem">Total Omset</div>
        <div style="font-size:.95rem; font-weight:700; color:var(--text)">Rp {fmt(px.total_omset)}</div>
      </div>
      <div style="padding:.85rem 1rem; background:var(--surface); border:1px solid var(--accent); border-radius:6px">
        <div style="font-size:.72rem; color:var(--text-dim); margin-bottom:.3rem">Total Pajak Terutang</div>
        <div style="font-size:.95rem; font-weight:700; color:var(--accent)">Rp {fmt(px.total_pajak)}</div>
      </div>
    </div>

    <!-- Tabel per bulan -->
    <div style="overflow-x:auto">
      <table style="width:100%; border-collapse:collapse; font-size:.84rem; min-width:360px">
        <thead>
          <tr style="background:var(--surface2)">
            <th style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600">Bulan</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Omset</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Pajak (0.5%)</th>
          </tr>
        </thead>
        <tbody>
          {#each px.bulan as b, i}
            <tr style="border-top:1px solid var(--border); opacity:{b.omset === 0 ? 0.45 : 1}">
              <td style="padding:.4rem .75rem; color:var(--text)">{BULAN[i]}</td>
              <td style="padding:.4rem .75rem; text-align:right; color:var(--text-dim)">
                {b.omset > 0 ? `Rp ${fmt(b.omset)}` : '—'}
              </td>
              <td style="padding:.4rem .75rem; text-align:right; font-weight:{b.pajak > 0 ? '600' : '400'}; color:{b.pajak > 0 ? 'var(--text)' : 'var(--text-dim)'}">
                {b.pajak > 0 ? `Rp ${fmt(b.pajak)}` : '—'}
              </td>
            </tr>
          {/each}
          <tr style="border-top:2px solid var(--border); background:var(--surface2)">
            <td style="padding:.45rem .75rem; font-weight:700; color:var(--text)">TOTAL</td>
            <td style="padding:.45rem .75rem; text-align:right; font-weight:700; color:var(--text)">Rp {fmt(px.total_omset)}</td>
            <td style="padding:.45rem .75rem; text-align:right; font-weight:700; color:var(--accent)">Rp {fmt(px.total_pajak)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p style="font-size:.72rem; color:var(--text-dim); margin-top:.75rem">
      * Berdasarkan PP 23/2018. Tarif 0.5% dari omset bruto untuk UMKM dengan omset &lt; Rp 4,8 miliar/tahun.
      Konsultasikan dengan akuntan untuk kewajiban pajak yang tepat.
    </p>
  </div>

<!-- ═══════════════════════════════════════ MARGIN PRODUK ════ -->
{:else if tab === 'margin-produk' && marginProduk}
  {@const mp = marginProduk}
  <div style="padding:0 1.25rem 2rem">
    <div style="text-align:center; margin-bottom:1.5rem">
      <div style="font-size:1rem; font-weight:700; color:var(--text)">LAPORAN MARGIN PER PRODUK</div>
      <div style="font-size:.8rem; color:var(--text-dim)">
        Periode {tglFmt(mp.periode.dari)} — {tglFmt(mp.periode.sampai)}
      </div>
    </div>

    <!-- Ringkasan -->
    <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:.6rem; margin-bottom:1.5rem" class="sm:grid-cols-4">
      {#each [
        { label: 'Total Omset', val: fmtRp(mp.total_omset), color: 'var(--text)' },
        { label: 'Total HPP', val: fmtRp(mp.total_hpp), color: 'var(--text-dim)' },
        { label: 'Total Margin', val: fmtRp(mp.total_margin), color: mp.total_margin >= 0 ? 'var(--accent)' : 'var(--danger)' },
        { label: 'Rata-rata Margin %', val: `${mp.margin_pct_rata.toFixed(1)}%`, color: mp.margin_pct_rata >= 15 ? 'var(--accent)' : mp.margin_pct_rata >= 8 ? 'var(--warn)' : 'var(--danger)' },
      ] as card}
        <div style="padding:.75rem 1rem; background:var(--surface); border:1px solid var(--border); border-radius:6px">
          <div style="font-size:.7rem; color:var(--text-dim); margin-bottom:.25rem">{card.label}</div>
          <div style="font-size:.9rem; font-weight:700; color:{card.color}">{card.val}</div>
        </div>
      {/each}
    </div>

    <!-- Tabel produk -->
    <div style="overflow-x:auto">
      <table style="width:100%; border-collapse:collapse; font-size:.82rem; min-width:600px">
        <thead>
          <tr style="background:var(--surface2)">
            <th style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600">#</th>
            <th style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600">Produk</th>
            <th style="padding:.4rem .5rem; text-align:left; color:var(--text-dim); font-weight:600" class="hidden sm:table-cell">Kategori</th>
            <th style="padding:.4rem .5rem; text-align:right; color:var(--text-dim); font-weight:600" class="hidden sm:table-cell">Qty</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Omset</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600" class="hidden sm:table-cell">HPP</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Margin</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">%</th>
          </tr>
        </thead>
        <tbody>
          {#each mp.produk as p, i}
            {@const warnaMargin = p.margin_pct >= 15 ? 'var(--accent)' : p.margin_pct >= 8 ? 'var(--warn)' : 'var(--danger)'}
            <tr style="border-top:1px solid var(--border)">
              <td style="padding:.35rem .75rem; color:var(--text-dim); font-size:.75rem">{i + 1}</td>
              <td style="padding:.35rem .75rem; color:var(--text); font-weight:500">{p.nama_barang}</td>
              <td style="padding:.35rem .5rem; color:var(--text-dim); font-size:.78rem" class="hidden sm:table-cell">{p.kategori}</td>
              <td style="padding:.35rem .5rem; text-align:right; color:var(--text-dim)" class="hidden sm:table-cell">{fmt(p.qty_terjual)}</td>
              <td style="padding:.35rem .75rem; text-align:right; color:var(--text)">Rp {fmt(p.omset)}</td>
              <td style="padding:.35rem .75rem; text-align:right; color:var(--text-dim)" class="hidden sm:table-cell">Rp {fmt(p.hpp)}</td>
              <td style="padding:.35rem .75rem; text-align:right; color:{p.margin >= 0 ? 'var(--accent)' : 'var(--danger)'}; font-weight:600">Rp {fmt(p.margin)}</td>
              <td style="padding:.35rem .75rem; text-align:right; font-weight:700; color:{warnaMargin}">{p.margin_pct.toFixed(1)}%</td>
            </tr>
          {/each}
          <tr style="border-top:2px solid var(--border); background:var(--surface2)">
            <td colspan="4" style="padding:.4rem .75rem; font-weight:700; color:var(--text)">TOTAL</td>
            <td style="padding:.4rem .75rem; text-align:right; font-weight:700; color:var(--text)">Rp {fmt(mp.total_omset)}</td>
            <td style="padding:.4rem .75rem; text-align:right; font-weight:700; color:var(--text-dim)" class="hidden sm:table-cell">Rp {fmt(mp.total_hpp)}</td>
            <td style="padding:.4rem .75rem; text-align:right; font-weight:700; color:var(--accent)">Rp {fmt(mp.total_margin)}</td>
            <td style="padding:.4rem .75rem; text-align:right; font-weight:700; color:var(--accent)">{mp.margin_pct_rata.toFixed(1)}%</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p style="font-size:.72rem; color:var(--text-dim); margin-top:.6rem">* HPP dihitung menggunakan harga beli rata-rata (WAC) saat ini. Nilai margin adalah estimasi.</p>
  </div>

<!-- ═══════════════════════════════════════ PERBANDINGAN ════ -->
{:else if tab === 'perbandingan' && perbandingan}
  {@const { p1, p2 } = perbandingan}
  {@const delta = (a: number, b: number) => b - a}
  {@const deltaPct = (a: number, b: number): number => a !== 0 ? ((b - a) / a) * 100 : 0}
  {@const warnaSelisih = (d: number, higherBetter = true) => d === 0 ? 'var(--text-dim)' : (higherBetter ? d > 0 : d < 0) ? 'var(--accent)' : 'var(--danger)'}
  <div style="padding:0 1.25rem 2rem; max-width:760px">
    <div style="text-align:center; margin-bottom:1.5rem">
      <div style="font-size:1rem; font-weight:700; color:var(--text)">PERBANDINGAN PERIODE</div>
      <div style="font-size:.8rem; color:var(--text-dim)">
        P1: {tglFmt(p1.periode.dari)} — {tglFmt(p1.periode.sampai)} &nbsp;vs&nbsp; P2: {tglFmt(p2.periode.dari)} — {tglFmt(p2.periode.sampai)}
      </div>
    </div>

    <div style="overflow-x:auto">
      <table style="width:100%; border-collapse:collapse; font-size:.84rem; min-width:500px">
        <thead>
          <tr style="background:var(--surface2)">
            <th style="padding:.45rem .75rem; text-align:left; color:var(--text-dim); font-weight:600">Metrik</th>
            <th style="padding:.45rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">P1</th>
            <th style="padding:.45rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">P2</th>
            <th style="padding:.45rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Selisih</th>
            <th style="padding:.45rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Δ%</th>
          </tr>
        </thead>
        <tbody>
          {#each [
            { label: 'Penjualan Bersih', v1: p1.penjualan.bersih, v2: p2.penjualan.bersih, isRp: true, higher: true },
            { label: 'Jumlah Transaksi', v1: p1.penjualan.jumlah_transaksi, v2: p2.penjualan.jumlah_transaksi, isRp: false, higher: true },
            { label: 'HPP (estimasi)', v1: p1.hpp, v2: p2.hpp, isRp: true, higher: false },
            { label: 'Laba Kotor', v1: p1.laba_kotor, v2: p2.laba_kotor, isRp: true, higher: true },
            { label: 'Margin Kotor %', v1: p1.margin_kotor_persen, v2: p2.margin_kotor_persen, isRp: false, isPct: true, higher: true },
            { label: 'Biaya Operasional', v1: p1.biaya_operasional.total, v2: p2.biaya_operasional.total, isRp: true, higher: false },
            { label: 'Laba Bersih', v1: p1.laba_bersih, v2: p2.laba_bersih, isRp: true, higher: true },
            { label: 'Margin Bersih %', v1: p1.margin_bersih_persen, v2: p2.margin_bersih_persen, isRp: false, isPct: true, higher: true },
          ] as row}
            {@const d = delta(row.v1, row.v2)}
            {@const dp = deltaPct(row.v1, row.v2)}
            {@const warna = warnaSelisih(d, row.higher)}
            <tr style="border-top:1px solid var(--border)">
              <td style="padding:.4rem .75rem; color:var(--text)">{row.label}</td>
              <td style="padding:.4rem .75rem; text-align:right; color:var(--text-dim)">
                {#if row.isPct}{row.v1.toFixed(1)}%{:else if row.isRp}Rp {fmt(row.v1)}{:else}{fmt(row.v1)}{/if}
              </td>
              <td style="padding:.4rem .75rem; text-align:right; color:var(--text); font-weight:600">
                {#if row.isPct}{row.v2.toFixed(1)}%{:else if row.isRp}Rp {fmt(row.v2)}{:else}{fmt(row.v2)}{/if}
              </td>
              <td style="padding:.4rem .75rem; text-align:right; font-weight:600; color:{warna}">
                {#if row.isPct}{d > 0 ? '+' : ''}{d.toFixed(1)}pp{:else if row.isRp}{d >= 0 ? '+' : ''}Rp {fmt(Math.abs(d))}{#if d < 0}*{/if}{:else}{d >= 0 ? '+' : ''}{fmt(d)}{/if}
              </td>
              <td style="padding:.4rem .75rem; text-align:right; color:{row.isPct ? 'var(--text-dim)' : warna}">
                {row.isPct ? '—' : `${dp >= 0 ? '+' : ''}${dp.toFixed(1)}%`}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p style="font-size:.72rem; color:var(--text-dim); margin-top:.6rem">* Margin merupakan estimasi berdasarkan HPP rata-rata saat ini.</p>
  </div>

<!-- ═══════════════════════════════════════ PERSEDIAAN ════ -->
{:else if tab === 'persediaan' && persediaan}
  {@const p = persediaan}
  <div style="padding:0 1.25rem 2rem">
    <div style="text-align:center; margin-bottom:1.5rem">
      <div style="font-size:1rem; font-weight:700; color:var(--text)">LAPORAN NILAI PERSEDIAAN</div>
      <div style="font-size:.8rem; color:var(--text-dim)">Per {tglFmt(p.per_tanggal)}</div>
    </div>
    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:.6rem; margin-bottom:1.5rem">
      {#each [
        { label: 'Total Nilai Stok', val: fmtRp(p.total_nilai), color: 'var(--accent)' },
        { label: 'Jumlah SKU Aktif', val: String(p.jumlah_sku), color: 'var(--text)' },
        { label: 'SKU Tanpa Stok', val: String(p.sku_tanpa_stok), color: p.sku_tanpa_stok > 0 ? 'var(--warn)' : 'var(--text-dim)' },
      ] as card}
        <div style="padding:.75rem 1rem; background:var(--surface); border:1px solid var(--border); border-radius:6px">
          <div style="font-size:.7rem; color:var(--text-dim); margin-bottom:.25rem">{card.label}</div>
          <div style="font-size:.9rem; font-weight:700; color:{card.color}">{card.val}</div>
        </div>
      {/each}
    </div>
    <div style="overflow-x:auto">
      <table style="width:100%; border-collapse:collapse; font-size:.82rem; min-width:480px">
        <thead>
          <tr style="background:var(--surface2)">
            <th style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600">#</th>
            <th style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600">Produk</th>
            <th style="padding:.4rem .5rem; text-align:left; color:var(--text-dim); font-weight:600" class="hidden sm:table-cell">Kategori</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Stok</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600" class="hidden sm:table-cell">HPP</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Nilai Stok</th>
          </tr>
        </thead>
        <tbody>
          {#each p.produk as pr, i}
            <tr style="border-top:1px solid var(--border); opacity:{pr.stok <= 0 ? 0.4 : 1}">
              <td style="padding:.35rem .75rem; color:var(--text-dim); font-size:.75rem">{i + 1}</td>
              <td style="padding:.35rem .75rem; color:var(--text); font-weight:500">{pr.nama_barang}</td>
              <td style="padding:.35rem .5rem; color:var(--text-dim); font-size:.78rem" class="hidden sm:table-cell">{pr.kategori}</td>
              <td style="padding:.35rem .75rem; text-align:right; color:{pr.stok <= 0 ? 'var(--danger)' : 'var(--text)'}; font-weight:600">{fmt(pr.stok)}</td>
              <td style="padding:.35rem .75rem; text-align:right; color:var(--text-dim)" class="hidden sm:table-cell">Rp {fmt(pr.hpp)}</td>
              <td style="padding:.35rem .75rem; text-align:right; color:var(--text); font-weight:600">Rp {fmt(pr.nilai_stok)}</td>
            </tr>
          {/each}
          <tr style="border-top:2px solid var(--border); background:var(--surface2)">
            <td colspan="5" style="padding:.4rem .75rem; font-weight:700; color:var(--text)">TOTAL NILAI</td>
            <td style="padding:.4rem .75rem; text-align:right; font-weight:700; color:var(--accent)">Rp {fmt(p.total_nilai)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p style="font-size:.72rem; color:var(--text-dim); margin-top:.6rem">* HPP menggunakan harga beli rata-rata (WAC). Nilai stok adalah estimasi modal tertanam.</p>
  </div>

<!-- ═══════════════════════════════════════ TOP PELANGGAN ════ -->
{:else if tab === 'top-pelanggan' && topPelanggan}
  {@const tp = topPelanggan}
  <div style="padding:0 1.25rem 2rem">
    <div style="text-align:center; margin-bottom:1.5rem">
      <div style="font-size:1rem; font-weight:700; color:var(--text)">TOP PELANGGAN</div>
      <div style="font-size:.8rem; color:var(--text-dim)">
        Periode {tglFmt(tp.periode.dari)} — {tglFmt(tp.periode.sampai)}
      </div>
    </div>
    {#if tp.pelanggan.length === 0}
      <p style="color:var(--text-dim); font-size:.85rem">Tidak ada transaksi pelanggan terdaftar di periode ini.</p>
    {:else}
      <div style="overflow-x:auto">
        <table style="width:100%; border-collapse:collapse; font-size:.82rem; min-width:480px">
          <thead>
            <tr style="background:var(--surface2)">
              <th style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600">#</th>
              <th style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600">Nama</th>
              <th style="padding:.4rem .5rem; text-align:left; color:var(--text-dim); font-weight:600" class="hidden sm:table-cell">Tipe</th>
              <th style="padding:.4rem .5rem; text-align:right; color:var(--text-dim); font-weight:600" class="hidden sm:table-cell">Transaksi</th>
              <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Omset</th>
              <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">%</th>
            </tr>
          </thead>
          <tbody>
            {#each tp.pelanggan as pl, i}
              <tr style="border-top:1px solid var(--border)">
                <td style="padding:.35rem .75rem; color:var(--text-dim); font-size:.75rem">{i + 1}</td>
                <td style="padding:.35rem .75rem; color:var(--text); font-weight:500">{pl.nama}</td>
                <td style="padding:.35rem .5rem; color:var(--text-dim); font-size:.78rem; text-transform:capitalize" class="hidden sm:table-cell">{pl.tipe}</td>
                <td style="padding:.35rem .5rem; text-align:right; color:var(--text-dim)" class="hidden sm:table-cell">{pl.jumlah_transaksi}x</td>
                <td style="padding:.35rem .75rem; text-align:right; color:var(--text); font-weight:600">Rp {fmt(pl.total_omset)}</td>
                <td style="padding:.35rem .75rem; text-align:right; color:var(--text-dim)">{pl.pct_omset.toFixed(1)}%</td>
              </tr>
            {/each}
            <tr style="border-top:2px solid var(--border); background:var(--surface2)">
              <td colspan="4" style="padding:.4rem .75rem; font-weight:700; color:var(--text)">TOTAL</td>
              <td style="padding:.4rem .75rem; text-align:right; font-weight:700; color:var(--accent)">Rp {fmt(tp.total_omset)}</td>
              <td style="padding:.4rem .75rem; text-align:right; font-weight:700; color:var(--text-dim)">100%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style="font-size:.72rem; color:var(--text-dim); margin-top:.6rem">* Hanya pelanggan yang terdaftar di sistem. Transaksi walk-in tidak termasuk.</p>
    {/if}
  </div>

<!-- ═══════════════════════════════════════ PEMBELIAN SUPPLIER ════ -->
{:else if tab === 'pembelian-supplier' && pembelianSupplier}
  {@const ps = pembelianSupplier}
  <div style="padding:0 1.25rem 2rem">
    <div style="text-align:center; margin-bottom:1.5rem">
      <div style="font-size:1rem; font-weight:700; color:var(--text)">PEMBELIAN PER SUPPLIER</div>
      <div style="font-size:.8rem; color:var(--text-dim)">
        Periode {tglFmt(ps.periode.dari)} — {tglFmt(ps.periode.sampai)}
      </div>
    </div>
    {#if ps.supplier.length === 0}
      <p style="color:var(--text-dim); font-size:.85rem">Tidak ada penerimaan barang di periode ini.</p>
    {:else}
      <div style="margin-bottom:1rem; padding:.75rem 1rem; background:var(--surface); border:1px solid var(--border); border-radius:6px; display:inline-block">
        <div style="font-size:.7rem; color:var(--text-dim); margin-bottom:.25rem">Total Pembelian</div>
        <div style="font-size:.95rem; font-weight:700; color:var(--text)">Rp {fmt(ps.total_pembelian)}</div>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%; border-collapse:collapse; font-size:.82rem; min-width:440px">
          <thead>
            <tr style="background:var(--surface2)">
              <th style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600">#</th>
              <th style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600">Supplier</th>
              <th style="padding:.4rem .5rem; text-align:right; color:var(--text-dim); font-weight:600" class="hidden sm:table-cell">Penerimaan</th>
              <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Total</th>
              <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">%</th>
            </tr>
          </thead>
          <tbody>
            {#each ps.supplier as s, i}
              <tr style="border-top:1px solid var(--border)">
                <td style="padding:.35rem .75rem; color:var(--text-dim); font-size:.75rem">{i + 1}</td>
                <td style="padding:.35rem .75rem; color:var(--text); font-weight:500">{s.nama_supplier}</td>
                <td style="padding:.35rem .5rem; text-align:right; color:var(--text-dim)" class="hidden sm:table-cell">{s.jumlah_penerimaan}x</td>
                <td style="padding:.35rem .75rem; text-align:right; color:var(--text); font-weight:600">Rp {fmt(s.total_pembelian)}</td>
                <td style="padding:.35rem .75rem; text-align:right; color:var(--text-dim)">{s.pct_pembelian.toFixed(1)}%</td>
              </tr>
            {/each}
            <tr style="border-top:2px solid var(--border); background:var(--surface2)">
              <td colspan="3" style="padding:.4rem .75rem; font-weight:700; color:var(--text)">TOTAL</td>
              <td style="padding:.4rem .75rem; text-align:right; font-weight:700; color:var(--text)">Rp {fmt(ps.total_pembelian)}</td>
              <td style="padding:.4rem .75rem; text-align:right; font-weight:700; color:var(--text-dim)">100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    {/if}
  </div>

<!-- ═══════════════════════════════════════ REKAP PENGGAJIAN ════ -->
{:else if tab === 'rekap-penggajian' && rekapPenggajian}
  {@const rp = rekapPenggajian}
  {@const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']}
  <div style="padding:0 1.25rem 2rem; max-width:680px">
    <div style="text-align:center; margin-bottom:1.5rem">
      <div style="font-size:1rem; font-weight:700; color:var(--text)">REKAP PENGGAJIAN</div>
      <div style="font-size:.8rem; color:var(--text-dim)">Tahun {rp.tahun} — status approved/dibayar</div>
    </div>
    <div style="margin-bottom:1.5rem; padding:.85rem 1.25rem; background:var(--surface); border:1px solid var(--border); border-radius:6px; display:inline-block">
      <div style="font-size:.72rem; color:var(--text-dim); margin-bottom:.25rem">Total Beban Gaji {rp.tahun}</div>
      <div style="font-size:1.05rem; font-weight:700; color:var(--accent)">Rp {fmt(rp.total_gaji_tahun)}</div>
    </div>
    <div style="overflow-x:auto">
      <table style="width:100%; border-collapse:collapse; font-size:.82rem; min-width:520px">
        <thead>
          <tr style="background:var(--surface2)">
            <th style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600">Bulan</th>
            <th style="padding:.4rem .5rem; text-align:right; color:var(--text-dim); font-weight:600" class="hidden sm:table-cell">Kary.</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600" class="hidden sm:table-cell">Gaji Pokok</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600" class="hidden sm:table-cell">Tunjangan</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600" class="hidden sm:table-cell">Potongan</th>
            <th style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600">Total Gaji</th>
          </tr>
        </thead>
        <tbody>
          {#each rp.bulan as b, i}
            <tr style="border-top:1px solid var(--border); opacity:{b.total_gaji === 0 ? 0.4 : 1}">
              <td style="padding:.4rem .75rem; color:var(--text)">{BULAN[i]}</td>
              <td style="padding:.4rem .5rem; text-align:right; color:var(--text-dim)" class="hidden sm:table-cell">{b.jumlah_karyawan > 0 ? b.jumlah_karyawan : '—'}</td>
              <td style="padding:.4rem .75rem; text-align:right; color:var(--text-dim)" class="hidden sm:table-cell">{b.total_gaji_pokok > 0 ? `Rp ${fmt(b.total_gaji_pokok)}` : '—'}</td>
              <td style="padding:.4rem .75rem; text-align:right; color:var(--text-dim)" class="hidden sm:table-cell">{b.total_tunjangan > 0 ? `Rp ${fmt(b.total_tunjangan)}` : '—'}</td>
              <td style="padding:.4rem .75rem; text-align:right; color:{b.total_potongan > 0 ? 'var(--danger)' : 'var(--text-dim)'}" class="hidden sm:table-cell">{b.total_potongan > 0 ? `(Rp ${fmt(b.total_potongan)})` : '—'}</td>
              <td style="padding:.4rem .75rem; text-align:right; font-weight:{b.total_gaji > 0 ? '600' : '400'}; color:{b.total_gaji > 0 ? 'var(--text)' : 'var(--text-dim)'}">
                {b.total_gaji > 0 ? `Rp ${fmt(b.total_gaji)}` : '—'}
              </td>
            </tr>
          {/each}
          <tr style="border-top:2px solid var(--border); background:var(--surface2)">
            <td colspan="5" style="padding:.45rem .75rem; font-weight:700; color:var(--text)">TOTAL {rp.tahun}</td>
            <td style="padding:.45rem .75rem; text-align:right; font-weight:700; color:var(--accent)">Rp {fmt(rp.total_gaji_tahun)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

{:else if !loading}
  <p style="padding:1.25rem; color:var(--text-dim); font-size:.85rem">Pilih tab dan klik Tampilkan.</p>
{/if}
