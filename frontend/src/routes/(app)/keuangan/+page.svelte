<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { api } from '$lib/utils/api'
  import { user } from '$lib/stores/auth.js'
  import DataTable from '$lib/components/DataTable.svelte'
  import type { Column } from '$lib/components/DataTable.svelte'
  import { createBudgetStore } from './budget/budget.store.svelte.js'
  import {
    rupiah, pctRealisasi, statusPenjualan, statusPengeluaran,
    warnaDariStatus, labelStatus, bulanSebelumnya, bulanBerikutnya,
    labelBulan,
  } from './budget/budget.logic.js'
  import { KATEGORI_LABEL, SEMUA_KATEGORI } from './budget/budget.types.js'
  import type { StatusMetrik } from './budget/budget.types.js'

  $effect(() => {
    if ($user && !['pemilik', 'manajer'].includes($user.role)) goto('/kasir')
  })

  type TabKey = 'hutang' | 'piutang' | 'jurnal' | 'kasbank' | 'budget'
  let tab = $derived<TabKey>(
    (page.url.searchParams.get('tab') as TabKey) ?? 'hutang'
  )

  // ── Types ─────────────────────────────────────────────────────────────────

  type Hutang = {
    id: number; supplier_id: number; nama_supplier: string
    barang_masuk_id: number; tanggal_hutang: string
    tanggal_jatuh_tempo: string | null
    total_hutang: number; sisa_hutang: number
    status: 'belum' | 'sebagian' | 'lunas'
  }

  type Piutang = {
    id: number; pelanggan_id: number; nama_pelanggan: string
    penjualan_id: number; no_transaksi: string
    tanggal_piutang: string; tanggal_jatuh_tempo: string | null
    total_piutang: number; sisa_piutang: number
    status: 'belum' | 'sebagian' | 'lunas'
  }

  type Jurnal = {
    id: number; tanggal: string; kas_bank_id: number; nama_akun: string
    jenis: 'masuk' | 'keluar'; kategori: string
    keterangan: string | null; jumlah: number
    referensi_tipe: string | null; referensi_id: number | null
  }

  type KasBank = { id: number; nama: string; tipe: 'kas' | 'bank'; saldo_awal: number }
  type KasBankSaldo = KasBank & { total_masuk: number; total_keluar: number; saldo: number }

  // ── State ─────────────────────────────────────────────────────────────────

  // ── Table columns ─────────────────────────────────────────────────────────

  const kolHutang: Column[] = [
    { key: 'nama_supplier',       label: 'Supplier',     minWidth: 120 },
    { key: 'tanggal_hutang',      label: 'Tgl Hutang',   width: 100, priority: 2 },
    { key: 'tanggal_jatuh_tempo', label: 'Jatuh Tempo',  width: 110 },
    { key: 'total_hutang',        label: 'Total',        width: 110, align: 'right', priority: 3 },
    { key: 'sisa_hutang',         label: 'Sisa',         width: 110, align: 'right' },
    { key: 'status_hutang',       label: 'Status',       width: 90 },
    { key: 'aksi_hutang',         label: '',             width: 70, sortable: false, hideable: false },
  ]

  const kolPiutang: Column[] = [
    { key: 'nama_pelanggan',      label: 'Pelanggan',    minWidth: 120 },
    { key: 'no_transaksi',        label: 'No Trx',       width: 110, priority: 3 },
    { key: 'tanggal_piutang',     label: 'Tgl Piutang',  width: 100, priority: 2 },
    { key: 'tanggal_jatuh_tempo', label: 'Jatuh Tempo',  width: 110 },
    { key: 'total_piutang',       label: 'Total',        width: 110, align: 'right', priority: 3 },
    { key: 'sisa_piutang',        label: 'Sisa',         width: 110, align: 'right' },
    { key: 'status_piutang',      label: 'Status',       width: 90 },
    { key: 'aksi_piutang',        label: '',             width: 70, sortable: false, hideable: false },
  ]

  const kolJurnal: Column[] = [
    { key: 'tanggal',    label: 'Tanggal',   width: 100, priority: 2 },
    { key: 'nama_akun',  label: 'Akun',      width: 110, priority: 2 },
    { key: 'jenis',      label: 'Jenis',     width: 90 },
    { key: 'kategori',   label: 'Kategori',  width: 110, priority: 3 },
    { key: 'keterangan', label: 'Keterangan', minWidth: 100, priority: 3 },
    { key: 'jumlah',     label: 'Jumlah',    width: 120, align: 'right' },
  ]

  // ── Pagination state ──────────────────────────────────────────────────────

  let pageHutang = $state(1); let pageSizeHutang = $state(25)
  let pagePiutang = $state(1); let pageSizePiutang = $state(25)
  let pageJurnal = $state(1); let pageSizeJurnal = $state(25)

  // ── State ─────────────────────────────────────────────────────────────────

  let hutangList = $state<Hutang[]>([])
  let piutangList = $state<Piutang[]>([])
  let jurnalList = $state<Jurnal[]>([])
  let kasBankList = $state<KasBank[]>([])
  let kasBankSaldo = $state<KasBankSaldo[]>([])

  let loading = $state(false)
  let error = $state('')

  // ── Filter ────────────────────────────────────────────────────────────────

  let filterStatusHutang = $state<'semua' | 'belum' | 'sebagian' | 'lunas'>('belum')
  let filterStatusPiutang = $state<'semua' | 'belum' | 'sebagian' | 'lunas'>('belum')

  // Jurnal filters
  const bulanIni = new Date().toISOString().slice(0, 7)
  let filterDari = $state(bulanIni + '-01')
  let filterSampai = $state(hariIni())
  let filterKasBankId = $state(0)

  let hutangFiltered = $derived(
    filterStatusHutang === 'semua'
      ? hutangList
      : hutangList.filter((h) => h.status === filterStatusHutang)
  )

  let piutangFiltered = $derived(
    filterStatusPiutang === 'semua'
      ? piutangList
      : piutangList.filter((p) => p.status === filterStatusPiutang)
  )

  let pagedHutang = $derived(
    pageSizeHutang === 0 ? hutangFiltered : hutangFiltered.slice((pageHutang - 1) * pageSizeHutang, pageHutang * pageSizeHutang)
  )
  let pagedPiutang = $derived(
    pageSizePiutang === 0 ? piutangFiltered : piutangFiltered.slice((pagePiutang - 1) * pageSizePiutang, pagePiutang * pageSizePiutang)
  )
  let pagedJurnal = $derived(
    pageSizeJurnal === 0 ? jurnalList : jurnalList.slice((pageJurnal - 1) * pageSizeJurnal, pageJurnal * pageSizeJurnal)
  )

  // ── Ringkasan ─────────────────────────────────────────────────────────────

  let totalHutangBelum = $derived(
    hutangList.filter((h) => h.status !== 'lunas').reduce((s, h) => s + h.sisa_hutang, 0)
  )
  let totalPiutangBelum = $derived(
    piutangList.filter((p) => p.status !== 'lunas').reduce((s, p) => s + p.sisa_piutang, 0)
  )
  let totalSaldo = $derived(kasBankSaldo.reduce((s, kb) => s + kb.saldo, 0))

  let jurnalMasuk = $derived(jurnalList.filter(j => j.jenis === 'masuk').reduce((s, j) => s + j.jumlah, 0))
  let jurnalKeluar = $derived(jurnalList.filter(j => j.jenis === 'keluar').reduce((s, j) => s + j.jumlah, 0))

  // ── Budget & Target ───────────────────────────────────────────────────────

  const budgetStore = createBudgetStore()
  let budgetTabAktif = $state<'periode' | 'histori'>('periode')
  const periodeIni = bulanIni

  const budgetMap = $derived(
    Object.fromEntries((budgetStore.data?.budgets ?? []).map(b => [b.kategori, b.nilai_budget]))
  )
  const pctOmzet = $derived(
    pctRealisasi(budgetStore.realisasi?.realisasi_omzet ?? 0, budgetStore.data?.target?.target_omzet ?? 0)
  )
  const pctTransaksi = $derived(
    pctRealisasi(budgetStore.realisasi?.realisasi_transaksi ?? 0, budgetStore.data?.target?.target_transaksi ?? 0)
  )
  const pctMargin = $derived(
    pctRealisasi(budgetStore.realisasi?.realisasi_margin_pct ?? 0, budgetStore.data?.target?.target_margin_pct ?? 0)
  )
  const adaTarget = $derived(budgetStore.data?.target != null)
  const statusOmzet = $derived(statusPenjualan(pctOmzet, adaTarget))
  const statusTransaksi = $derived(statusPenjualan(pctTransaksi, adaTarget))
  const statusMargin = $derived(
    statusPenjualan(pctMargin, adaTarget && (budgetStore.data?.target?.target_margin_pct ?? 0) > 0)
  )
  const proyeksiPct = $derived(
    budgetStore.proyeksi && budgetStore.data?.target?.target_omzet
      ? pctRealisasi(budgetStore.proyeksi.proyeksi_omzet, budgetStore.data.target.target_omzet)
      : 0
  )

  async function navigasiBulan(arah: 'prev' | 'next') {
    const p = arah === 'prev' ? bulanSebelumnya(budgetStore.periode) : bulanBerikutnya(budgetStore.periode)
    await budgetStore.muatPeriode(p)
  }

  // ── Modal Bayar Hutang ────────────────────────────────────────────────────

  let modalBayarHutang = $state(false)
  let hutangDipilih = $state<Hutang | null>(null)
  let formBayarHutang = $state({ jumlah_bayar: 0, kas_bank_id: 0, tanggal_bayar: '' })
  let savingBayarHutang = $state(false)

  function bukaBayarHutang(h: Hutang) {
    hutangDipilih = h
    formBayarHutang = { jumlah_bayar: h.sisa_hutang, kas_bank_id: kasBankList[0]?.id ?? 0, tanggal_bayar: hariIni() }
    modalBayarHutang = true
  }

  async function simpanBayarHutang() {
    if (!hutangDipilih) return
    savingBayarHutang = true
    const res = await api.post<{ sisa_hutang: number; status: string }>(
      `/keuangan/hutang/${hutangDipilih.id}/bayar`, formBayarHutang
    )
    savingBayarHutang = false
    if (!res.success) { error = res.error ?? 'Gagal menyimpan'; return }
    modalBayarHutang = false
    await Promise.all([muatHutang(), muatKasBankSaldo()])
  }

  // ── Modal Bayar Piutang ───────────────────────────────────────────────────

  let modalBayarPiutang = $state(false)
  let piutangDipilih = $state<Piutang | null>(null)
  let formBayarPiutang = $state({ jumlah_bayar: 0, kas_bank_id: 0, tanggal_bayar: '' })
  let savingBayarPiutang = $state(false)

  function bukaBayarPiutang(p: Piutang) {
    piutangDipilih = p
    formBayarPiutang = { jumlah_bayar: p.sisa_piutang, kas_bank_id: kasBankList[0]?.id ?? 0, tanggal_bayar: hariIni() }
    modalBayarPiutang = true
  }

  async function simpanBayarPiutang() {
    if (!piutangDipilih) return
    savingBayarPiutang = true
    const res = await api.post<{ sisa_piutang: number; status: string }>(
      `/keuangan/piutang/${piutangDipilih.id}/bayar`, formBayarPiutang
    )
    savingBayarPiutang = false
    if (!res.success) { error = res.error ?? 'Gagal menyimpan'; return }
    modalBayarPiutang = false
    await Promise.all([muatPiutang(), muatKasBankSaldo()])
  }

  // ── Modal Jurnal Manual ───────────────────────────────────────────────────

  let modalJurnal = $state(false)
  let formJurnal = $state({
    kas_bank_id: 0, jenis: 'masuk' as 'masuk' | 'keluar',
    kategori: '', keterangan: '', jumlah: 0, tanggal: '',
  })
  let savingJurnal = $state(false)

  function bukaModalJurnal() {
    formJurnal = { kas_bank_id: kasBankList[0]?.id ?? 0, jenis: 'masuk', kategori: '', keterangan: '', jumlah: 0, tanggal: hariIni() }
    modalJurnal = true
  }

  async function simpanJurnal() {
    savingJurnal = true
    const res = await api.post('/keuangan/jurnal', formJurnal)
    savingJurnal = false
    if (!res.success) { error = res.error ?? 'Gagal menyimpan'; return }
    modalJurnal = false
    await Promise.all([muatJurnal(), muatKasBankSaldo()])
  }

  // ── Modal Tambah/Edit Kas Bank ────────────────────────────────────────────

  let modalKasBank = $state(false)
  let editKasBank = $state<KasBank | null>(null)
  let formKasBank = $state({ nama: '', tipe: 'kas' as 'kas' | 'bank', saldo_awal: 0 })
  let savingKasBank = $state(false)

  function bukaTambahKasBank() {
    editKasBank = null
    formKasBank = { nama: '', tipe: 'kas', saldo_awal: 0 }
    modalKasBank = true
  }

  function bukaEditKasBank(kb: KasBankSaldo) {
    editKasBank = kb
    formKasBank = { nama: kb.nama, tipe: kb.tipe, saldo_awal: kb.saldo_awal }
    modalKasBank = true
  }

  async function simpanKasBank() {
    if (!formKasBank.nama.trim()) { error = 'Nama akun wajib diisi'; return }
    savingKasBank = true
    let res
    if (editKasBank) {
      res = await api.put(`/keuangan/kas-bank/${editKasBank.id}`, { nama: formKasBank.nama, saldo_awal: formKasBank.saldo_awal })
    } else {
      res = await api.post('/keuangan/kas-bank', formKasBank)
    }
    savingKasBank = false
    if (!res.success) { error = res.error ?? 'Gagal menyimpan'; return }
    modalKasBank = false
    await muatKasBankSaldo()
    const kb = await api.get<KasBank[]>('/keuangan/kas-bank')
    if (kb.success) kasBankList = kb.data!
  }

  async function nonaktifkanKasBank(id: number) {
    if (!confirm('Nonaktifkan akun ini?')) return
    await api.delete(`/keuangan/kas-bank/${id}`)
    await muatKasBankSaldo()
    const kb = await api.get<KasBank[]>('/keuangan/kas-bank')
    if (kb.success) kasBankList = kb.data!
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function hariIni(): string {
    return new Date().toLocaleDateString('sv-SE')
  }

  function fmt(n: number): string {
    return new Intl.NumberFormat('id-ID').format(n)
  }

  function tglFmt(t: string | null): string {
    if (!t) return '—'
    return new Date(t).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function isJatuhTempo(tgl: string | null): boolean {
    if (!tgl) return false
    return new Date(tgl) < new Date()
  }

  function statusBadge(s: string): string {
    if (s === 'lunas') return 'color:var(--accent)'
    if (s === 'sebagian') return 'color:var(--warn)'
    return 'color:var(--danger)'
  }

  // ── Load data ─────────────────────────────────────────────────────────────

  async function muatHutang() {
    const res = await api.get<Hutang[]>('/keuangan/hutang')
    if (res.success) hutangList = res.data!
  }

  async function muatPiutang() {
    const res = await api.get<Piutang[]>('/keuangan/piutang')
    if (res.success) piutangList = res.data!
  }

  async function muatJurnal() {
    const params = new URLSearchParams()
    if (filterDari) params.set('dari', filterDari)
    if (filterSampai) params.set('sampai', filterSampai)
    if (filterKasBankId) params.set('kas_bank_id', String(filterKasBankId))
    const res = await api.get<Jurnal[]>(`/keuangan/jurnal?${params}`)
    if (res.success) jurnalList = res.data!
  }

  async function muatKasBankSaldo() {
    const res = await api.get<KasBankSaldo[]>('/keuangan/kas-bank/saldo')
    if (res.success) kasBankSaldo = res.data!
  }

  onMount(async () => {
    loading = true
    const kb = await api.get<KasBank[]>('/keuangan/kas-bank')
    if (kb.success) kasBankList = kb.data!
    await Promise.all([muatHutang(), muatPiutang(), muatJurnal(), muatKasBankSaldo()])
    loading = false
  })

  let budgetInit = false
  $effect(() => {
    if (tab === 'hutang') muatHutang()
    else if (tab === 'piutang') muatPiutang()
    else if (tab === 'jurnal') muatJurnal()
    else if (tab === 'kasbank') muatKasBankSaldo()
    else if (tab === 'budget' && !budgetInit) {
      budgetInit = true
      Promise.all([budgetStore.muatPeriode(periodeIni), budgetStore.muatHistori()])
    }
  })
</script>

<!-- ───────────────────────────────────────────────── HEADER ── -->
<div style="padding:1rem 1.25rem 0">
  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem">
    <h1 style="font-size:1.1rem; font-weight:700; color:var(--text)">Keuangan</h1>
    <button
      onclick={() => tab === 'jurnal' ? bukaModalJurnal() : bukaTambahKasBank()}
      style="padding:.4rem .9rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer; visibility:{tab === 'jurnal' || tab === 'kasbank' ? 'visible' : 'hidden'}"
    >{tab === 'kasbank' ? '+ Tambah Akun' : '+ Catat Jurnal'}</button>
  </div>

  <!-- Ringkasan -->
  <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:.6rem; margin-bottom:1rem">
    <div style="background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:.65rem .9rem">
      <div style="font-size:.65rem; color:var(--text-dim); margin-bottom:.2rem">HUTANG SUPPLIER</div>
      <div style="font-size:1rem; font-weight:700; color:var(--danger)">Rp {fmt(totalHutangBelum)}</div>
    </div>
    <div style="background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:.65rem .9rem">
      <div style="font-size:.65rem; color:var(--text-dim); margin-bottom:.2rem">PIUTANG PELANGGAN</div>
      <div style="font-size:1rem; font-weight:700; color:var(--warn)">Rp {fmt(totalPiutangBelum)}</div>
    </div>
    <div style="background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:.65rem .9rem">
      <div style="font-size:.65rem; color:var(--text-dim); margin-bottom:.2rem">TOTAL SALDO KAS</div>
      <div style="font-size:1rem; font-weight:700; color:var(--info)">Rp {fmt(totalSaldo)}</div>
    </div>
  </div>

  <!-- Tabs -->
  <div style="border-bottom:1px solid var(--border); margin-bottom:1rem">
    <div style="display:flex; gap:.5rem; overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch; margin-bottom:-1px">
      {#each ([['hutang','Hutang'],['piutang','Piutang'],['jurnal','Jurnal Kas'],['kasbank','Kas/Bank'],['budget','Budget & Target']] as [TabKey, string][]) as [t, label]}
        <button
          onclick={() => goto(`?tab=${t}`, { replaceState: true, keepFocus: true, noScroll: true })}
          style="padding:.5rem 1rem; background:none; border:none; border-bottom:2px solid {tab===t ? 'var(--accent)' : 'transparent'}; color:{tab===t ? 'var(--accent)' : 'var(--text-dim)'}; font-family:inherit; font-size:.8rem; font-weight:600; cursor:pointer; text-transform:uppercase; letter-spacing:.05em; white-space:nowrap; flex-shrink:0"
        >{label}</button>
      {/each}
    </div>
  </div>
</div>

{#if error}
  <div style="margin:0 1.25rem 1rem; padding:.6rem .9rem; background:rgba(255,82,82,.15); border:1px solid var(--danger); border-radius:4px; color:var(--danger); font-size:.8rem">
    {error}
    <button onclick={() => error = ''} style="float:right; background:none; border:none; color:var(--danger); cursor:pointer">✕</button>
  </div>
{/if}

<div style="padding:0 1.25rem 2rem">

  <!-- ═══════════════════════════════════════ TAB HUTANG ═══ -->
  {#if tab === 'hutang'}
    <div style="display:flex; gap:.5rem; margin-bottom:.75rem; align-items:center">
      <span style="font-size:.75rem; color:var(--text-dim)">Status:</span>
      {#each (['semua','belum','sebagian','lunas'] as const) as s}
        <button
          onclick={() => filterStatusHutang = s}
          style="padding:.25rem .6rem; border:1px solid {filterStatusHutang===s ? 'var(--accent)' : 'var(--border)'}; background:{filterStatusHutang===s ? 'rgba(0,230,118,.15)' : 'transparent'}; color:{filterStatusHutang===s ? 'var(--accent)' : 'var(--text-dim)'}; border-radius:4px; font-family:inherit; font-size:.72rem; cursor:pointer"
        >{s}</button>
      {/each}
    </div>

    <DataTable
      columns={kolHutang}
      tableId="keuangan_hutang"
      bind:currentPage={pageHutang}
      bind:pageSize={pageSizeHutang}
      totalRows={hutangFiltered.length}
      rowCount={pagedHutang.length}
      emptyText={loading ? 'Memuat...' : 'Tidak ada data hutang.'}
      maxRows={12}
    >
      {#snippet body(hidden)}
        {#each pagedHutang as h}
          <tr style="border-bottom:1px solid var(--border)">
            {#if !hidden.has('nama_supplier')}
              <td style="padding:.55rem .6rem; color:var(--text)">{h.nama_supplier ?? '—'}</td>
            {/if}
            {#if !hidden.has('tanggal_hutang')}
              <td style="padding:.55rem .6rem; color:var(--text-dim)">{tglFmt(h.tanggal_hutang)}</td>
            {/if}
            {#if !hidden.has('tanggal_jatuh_tempo')}
              <td style="padding:.55rem .6rem; color:{isJatuhTempo(h.tanggal_jatuh_tempo) && h.status !== 'lunas' ? 'var(--danger)' : 'var(--text-dim)'}">
                {tglFmt(h.tanggal_jatuh_tempo)}
                {#if isJatuhTempo(h.tanggal_jatuh_tempo) && h.status !== 'lunas'} ⚠{/if}
              </td>
            {/if}
            {#if !hidden.has('total_hutang')}
              <td style="padding:.55rem .6rem; color:var(--text); text-align:right">Rp {fmt(h.total_hutang)}</td>
            {/if}
            {#if !hidden.has('sisa_hutang')}
              <td style="padding:.55rem .6rem; font-weight:700; text-align:right; color:{h.sisa_hutang > 0 ? 'var(--danger)' : 'var(--text-dim)'}">
                Rp {fmt(h.sisa_hutang)}
              </td>
            {/if}
            {#if !hidden.has('status_hutang')}
              <td style="padding:.55rem .6rem">
                <span style="font-size:.7rem; font-weight:700; text-transform:uppercase; {statusBadge(h.status)}">{h.status}</span>
              </td>
            {/if}
            {#if !hidden.has('aksi_hutang')}
              <td style="padding:.55rem .6rem">
                {#if h.status !== 'lunas'}
                  <button
                    onclick={() => bukaBayarHutang(h)}
                    style="padding:.25rem .65rem; background:var(--accent); color:var(--bg); border:none; border-radius:3px; font-family:inherit; font-size:.72rem; font-weight:700; cursor:pointer"
                  >Bayar</button>
                {/if}
              </td>
            {/if}
          </tr>
        {/each}
      {/snippet}
    </DataTable>
  {/if}

  <!-- ═══════════════════════════════════════ TAB PIUTANG ══ -->
  {#if tab === 'piutang'}
    <div style="display:flex; gap:.5rem; margin-bottom:.75rem; align-items:center">
      <span style="font-size:.75rem; color:var(--text-dim)">Status:</span>
      {#each (['semua','belum','sebagian','lunas'] as const) as s}
        <button
          onclick={() => filterStatusPiutang = s}
          style="padding:.25rem .6rem; border:1px solid {filterStatusPiutang===s ? 'var(--accent)' : 'var(--border)'}; background:{filterStatusPiutang===s ? 'rgba(0,230,118,.15)' : 'transparent'}; color:{filterStatusPiutang===s ? 'var(--accent)' : 'var(--text-dim)'}; border-radius:4px; font-family:inherit; font-size:.72rem; cursor:pointer"
        >{s}</button>
      {/each}
    </div>

    <DataTable
      columns={kolPiutang}
      tableId="keuangan_piutang"
      bind:currentPage={pagePiutang}
      bind:pageSize={pageSizePiutang}
      totalRows={piutangFiltered.length}
      rowCount={pagedPiutang.length}
      emptyText={loading ? 'Memuat...' : 'Tidak ada data piutang.'}
      maxRows={12}
    >
      {#snippet body(hidden)}
        {#each pagedPiutang as p}
          <tr style="border-bottom:1px solid var(--border)">
            {#if !hidden.has('nama_pelanggan')}
              <td style="padding:.55rem .6rem; color:var(--text)">{p.nama_pelanggan ?? '—'}</td>
            {/if}
            {#if !hidden.has('no_transaksi')}
              <td style="padding:.55rem .6rem; color:var(--text-dim); font-size:.75rem">{p.no_transaksi ?? '—'}</td>
            {/if}
            {#if !hidden.has('tanggal_piutang')}
              <td style="padding:.55rem .6rem; color:var(--text-dim)">{tglFmt(p.tanggal_piutang)}</td>
            {/if}
            {#if !hidden.has('tanggal_jatuh_tempo')}
              <td style="padding:.55rem .6rem; color:{isJatuhTempo(p.tanggal_jatuh_tempo) && p.status !== 'lunas' ? 'var(--danger)' : 'var(--text-dim)'}">
                {tglFmt(p.tanggal_jatuh_tempo)}
                {#if isJatuhTempo(p.tanggal_jatuh_tempo) && p.status !== 'lunas'} ⚠{/if}
              </td>
            {/if}
            {#if !hidden.has('total_piutang')}
              <td style="padding:.55rem .6rem; color:var(--text); text-align:right">Rp {fmt(p.total_piutang)}</td>
            {/if}
            {#if !hidden.has('sisa_piutang')}
              <td style="padding:.55rem .6rem; font-weight:700; text-align:right; color:{p.sisa_piutang > 0 ? 'var(--warn)' : 'var(--text-dim)'}">
                Rp {fmt(p.sisa_piutang)}
              </td>
            {/if}
            {#if !hidden.has('status_piutang')}
              <td style="padding:.55rem .6rem">
                <span style="font-size:.7rem; font-weight:700; text-transform:uppercase; {statusBadge(p.status)}">{p.status}</span>
              </td>
            {/if}
            {#if !hidden.has('aksi_piutang')}
              <td style="padding:.55rem .6rem">
                {#if p.status !== 'lunas'}
                  <button
                    onclick={() => bukaBayarPiutang(p)}
                    style="padding:.25rem .65rem; background:var(--accent); color:var(--bg); border:none; border-radius:3px; font-family:inherit; font-size:.72rem; font-weight:700; cursor:pointer"
                  >Terima</button>
                {/if}
              </td>
            {/if}
          </tr>
        {/each}
      {/snippet}
    </DataTable>
  {/if}

  <!-- ═══════════════════════════════════════ TAB JURNAL ═══ -->
  {#if tab === 'jurnal'}
    <!-- Filter -->
    <div style="display:flex; gap:.6rem; margin-bottom:.75rem; flex-wrap:wrap; align-items:flex-end">
      <div>
        <div style="font-size:.68rem; color:var(--text-dim); margin-bottom:.2rem">Dari</div>
        <input type="date" bind:value={filterDari} onchange={muatJurnal}
          style="padding:.35rem .6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.8rem" />
      </div>
      <div>
        <div style="font-size:.68rem; color:var(--text-dim); margin-bottom:.2rem">Sampai</div>
        <input type="date" bind:value={filterSampai} onchange={muatJurnal}
          style="padding:.35rem .6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.8rem" />
      </div>
      <div>
        <div style="font-size:.68rem; color:var(--text-dim); margin-bottom:.2rem">Akun</div>
        <select bind:value={filterKasBankId} onchange={muatJurnal}
          style="padding:.35rem .6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.8rem">
          <option value={0}>Semua Akun</option>
          {#each kasBankList as kb}
            <option value={kb.id}>{kb.nama}</option>
          {/each}
        </select>
      </div>
    </div>

    <!-- Ringkasan periode -->
    <div style="display:flex; gap:.6rem; margin-bottom:.75rem">
      <div style="background:rgba(0,230,118,.08); border:1px solid rgba(0,230,118,.25); border-radius:4px; padding:.45rem .8rem; font-size:.78rem">
        <span style="color:var(--text-dim)">Masuk: </span>
        <span style="color:var(--accent); font-weight:700">Rp {fmt(jurnalMasuk)}</span>
      </div>
      <div style="background:rgba(255,82,82,.08); border:1px solid rgba(255,82,82,.25); border-radius:4px; padding:.45rem .8rem; font-size:.78rem">
        <span style="color:var(--text-dim)">Keluar: </span>
        <span style="color:var(--danger); font-weight:700">Rp {fmt(jurnalKeluar)}</span>
      </div>
      <div style="background:var(--surface); border:1px solid var(--border); border-radius:4px; padding:.45rem .8rem; font-size:.78rem">
        <span style="color:var(--text-dim)">Selisih: </span>
        <span style="color:{jurnalMasuk - jurnalKeluar >= 0 ? 'var(--accent)' : 'var(--danger)'}; font-weight:700">Rp {fmt(jurnalMasuk - jurnalKeluar)}</span>
      </div>
    </div>

    <DataTable
      columns={kolJurnal}
      tableId="keuangan_jurnal"
      bind:currentPage={pageJurnal}
      bind:pageSize={pageSizeJurnal}
      totalRows={jurnalList.length}
      rowCount={pagedJurnal.length}
      emptyText={loading ? 'Memuat...' : 'Tidak ada jurnal untuk periode ini.'}
      maxRows={14}
    >
      {#snippet body(hidden)}
        {#each pagedJurnal as j}
          <tr style="border-bottom:1px solid var(--border)">
            {#if !hidden.has('tanggal')}
              <td style="padding:.55rem .6rem; color:var(--text-dim)">{tglFmt(j.tanggal)}</td>
            {/if}
            {#if !hidden.has('nama_akun')}
              <td style="padding:.55rem .6rem; color:var(--text)">{j.nama_akun ?? '—'}</td>
            {/if}
            {#if !hidden.has('jenis')}
              <td style="padding:.55rem .6rem">
                <span style="font-size:.7rem; font-weight:700; color:{j.jenis === 'masuk' ? 'var(--accent)' : 'var(--danger)'}">
                  {j.jenis === 'masuk' ? '▲ MASUK' : '▼ KELUAR'}
                </span>
              </td>
            {/if}
            {#if !hidden.has('kategori')}
              <td style="padding:.55rem .6rem; color:var(--text-dim); font-size:.78rem">{j.kategori}</td>
            {/if}
            {#if !hidden.has('keterangan')}
              <td style="padding:.55rem .6rem; color:var(--text-dim); font-size:.78rem">{j.keterangan ?? '—'}</td>
            {/if}
            {#if !hidden.has('jumlah')}
              <td style="padding:.55rem .6rem; text-align:right; font-weight:700; color:{j.jenis === 'masuk' ? 'var(--accent)' : 'var(--danger)'}">
                Rp {fmt(j.jumlah)}
              </td>
            {/if}
          </tr>
        {/each}
      {/snippet}
    </DataTable>
  {/if}

  <!-- ═══════════════════════════════════════ TAB KAS/BANK ═ -->
  {#if tab === 'kasbank'}
    {#if loading}
      <p style="color:var(--text-dim); font-size:.85rem">Memuat...</p>
    {:else if kasBankSaldo.length === 0}
      <p style="color:var(--text-dim); font-size:.85rem">Belum ada akun kas/bank.</p>
    {:else}
      <div style="display:grid; gap:.75rem; margin-bottom:1rem">
        {#each kasBankSaldo as kb}
          <div style="background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:.9rem 1rem">
            <div style="display:flex; justify-content:space-between; align-items:flex-start">
              <div>
                <div style="display:flex; align-items:center; gap:.5rem; margin-bottom:.2rem">
                  <span style="font-weight:700; color:var(--text)">{kb.nama}</span>
                  <span style="font-size:.65rem; padding:.1rem .4rem; background:var(--surface2); border:1px solid var(--border); border-radius:3px; color:var(--text-dim); text-transform:uppercase">{kb.tipe}</span>
                </div>
                <div style="font-size:.75rem; color:var(--text-dim)">Saldo awal: Rp {fmt(kb.saldo_awal)}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:1.1rem; font-weight:700; color:var(--info)">Rp {fmt(kb.saldo)}</div>
                <div style="font-size:.7rem; color:var(--text-dim); margin-top:.15rem">saldo saat ini</div>
              </div>
            </div>
            <div style="display:flex; gap:.75rem; margin-top:.75rem; padding-top:.6rem; border-top:1px solid var(--border)">
              <div style="font-size:.75rem">
                <span style="color:var(--text-dim)">Masuk: </span>
                <span style="color:var(--accent); font-weight:600">+Rp {fmt(kb.total_masuk)}</span>
              </div>
              <div style="font-size:.75rem">
                <span style="color:var(--text-dim)">Keluar: </span>
                <span style="color:var(--danger); font-weight:600">-Rp {fmt(kb.total_keluar)}</span>
              </div>
              <div style="margin-left:auto; display:flex; gap:.5rem">
                <button
                  onclick={() => bukaEditKasBank(kb)}
                  style="padding:.25rem .6rem; background:transparent; border:1px solid var(--border); border-radius:3px; color:var(--text-dim); font-family:inherit; font-size:.72rem; cursor:pointer"
                >Edit</button>
                <button
                  onclick={() => nonaktifkanKasBank(kb.id)}
                  style="padding:.25rem .6rem; background:transparent; border:1px solid var(--danger); border-radius:3px; color:var(--danger); font-family:inherit; font-size:.72rem; cursor:pointer"
                >Nonaktifkan</button>
              </div>
            </div>
          </div>
        {/each}
      </div>

      <!-- Total footer -->
      <div style="background:var(--surface2); border:1px solid var(--border); border-radius:6px; padding:.75rem 1rem; display:flex; justify-content:space-between; align-items:center">
        <span style="font-size:.8rem; color:var(--text-dim); font-weight:600">TOTAL SEMUA AKUN</span>
        <span style="font-size:1.1rem; font-weight:700; color:var(--info)">Rp {fmt(totalSaldo)}</span>
      </div>
    {/if}
  {/if}

  <!-- ════════════════════════════ TAB BUDGET & TARGET ══════════ -->
  {#if tab === 'budget'}

    <!-- Navigasi Bulan -->
    <div style="display:flex; align-items:center; gap:.5rem; margin-bottom:1rem; flex-wrap:wrap">
      <button
        onclick={() => navigasiBulan('prev')}
        style="padding:.3rem .6rem; border:1px solid var(--border); border-radius:4px; background:var(--surface); color:var(--text-dim); font-family:inherit; font-size:.85rem; cursor:pointer"
      >←</button>
      <span style="font-size:.85rem; font-weight:600; color:var(--text); min-width:130px; text-align:center">
        {labelBulan(budgetStore.periode)}
      </span>
      <button
        onclick={() => navigasiBulan('next')}
        disabled={budgetStore.periode >= periodeIni}
        style="padding:.3rem .6rem; border:1px solid var(--border); border-radius:4px; background:var(--surface); color:var(--text-dim); font-family:inherit; font-size:.85rem; cursor:pointer; opacity:{budgetStore.periode >= periodeIni ? .4 : 1}"
      >→</button>
      {#if budgetStore.periode !== periodeIni}
        <button
          onclick={() => budgetStore.muatPeriode(periodeIni)}
          style="padding:.3rem .6rem; border:1px solid var(--accent); border-radius:4px; color:var(--accent); font-family:inherit; font-size:.75rem; background:none; cursor:pointer"
        >Bulan Ini</button>
      {/if}
    </div>

    <!-- Sub-tab -->
    <div style="display:flex; gap:.5rem; border-bottom:1px solid var(--border); margin-bottom:1rem">
      {#each ([['periode','Periode Ini'],['histori','6 Bulan Terakhir']] as const) as [key, label] (key)}
        <button
          onclick={() => budgetTabAktif = key}
          style="padding:.5rem 1rem; background:none; border:none; border-bottom:2px solid {budgetTabAktif===key ? 'var(--accent)' : 'transparent'}; color:{budgetTabAktif===key ? 'var(--accent)' : 'var(--text-dim)'}; font-family:inherit; font-size:.8rem; font-weight:600; cursor:pointer; white-space:nowrap"
        >{label}</button>
      {/each}
    </div>

    {#if budgetTabAktif === 'periode'}

      <!-- Target Penjualan -->
      <div style="margin-bottom:1rem">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:.5rem; flex-wrap:wrap; gap:.5rem">
          <span style="font-size:.72rem; color:var(--text-dim); font-weight:600; text-transform:uppercase; letter-spacing:.05em">Target Penjualan</span>
          <div style="display:flex; gap:.5rem">
            {#if !adaTarget && budgetStore.histori.length > 1}
              <button
                onclick={() => budgetStore.salinBulan(bulanSebelumnya(budgetStore.periode))}
                style="padding:.25rem .6rem; border:1px solid var(--info); border-radius:3px; color:var(--info); font-family:inherit; font-size:.72rem; background:none; cursor:pointer"
              >Salin bulan lalu</button>
            {/if}
            <button
              onclick={() => budgetStore.bukaEditTarget()}
              style="padding:.25rem .6rem; border:1px solid var(--accent); border-radius:3px; color:var(--accent); font-family:inherit; font-size:.72rem; background:none; cursor:pointer"
            >{adaTarget ? 'Edit Target' : '+ Set Target'}</button>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:.6rem">
          {@render kartuTarget('Omzet',
            rupiah(budgetStore.realisasi?.realisasi_omzet ?? 0),
            adaTarget ? rupiah(budgetStore.data!.target!.target_omzet) : null,
            pctOmzet, statusOmzet)}
          {@render kartuTarget('Transaksi',
            String(budgetStore.realisasi?.realisasi_transaksi ?? 0),
            adaTarget ? String(budgetStore.data!.target!.target_transaksi) : null,
            pctTransaksi, statusTransaksi)}
          {@render kartuTarget('Margin Kotor',
            `${(budgetStore.realisasi?.realisasi_margin_pct ?? 0).toFixed(1)}%`,
            (adaTarget && (budgetStore.data?.target?.target_margin_pct ?? 0) > 0)
              ? `${budgetStore.data!.target!.target_margin_pct}%` : null,
            pctMargin, statusMargin)}
        </div>
      </div>

      <!-- Form Edit Target -->
      {#if budgetStore.editTarget}
        <div style="border:1px solid var(--accent); border-radius:6px; padding:1rem; background:var(--surface); margin-bottom:1rem">
          <div style="font-size:.8rem; font-weight:600; color:var(--accent); margin-bottom:.75rem">
            Set Target — {labelBulan(budgetStore.periode)}
          </div>
          <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:.75rem; margin-bottom:.75rem">
            <div>
              <div style="font-size:.72rem; color:var(--text-dim); margin-bottom:.25rem">Target Omzet (Rp)</div>
              <input type="number" min="0" bind:value={budgetStore.draftOmzet}
                style="width:100%; padding:.4rem .6rem; border:1px solid var(--border); border-radius:4px; background:var(--surface2); color:var(--text); font-family:inherit; font-size:.82rem; box-sizing:border-box" />
            </div>
            <div>
              <div style="font-size:.72rem; color:var(--text-dim); margin-bottom:.25rem">Target Transaksi</div>
              <input type="number" min="0" bind:value={budgetStore.draftTransaksi}
                style="width:100%; padding:.4rem .6rem; border:1px solid var(--border); border-radius:4px; background:var(--surface2); color:var(--text); font-family:inherit; font-size:.82rem; box-sizing:border-box" />
            </div>
            <div>
              <div style="font-size:.72rem; color:var(--text-dim); margin-bottom:.25rem">Target Margin (%)</div>
              <input type="number" min="0" max="100" step="0.5" bind:value={budgetStore.draftMargin}
                style="width:100%; padding:.4rem .6rem; border:1px solid var(--border); border-radius:4px; background:var(--surface2); color:var(--text); font-family:inherit; font-size:.82rem; box-sizing:border-box" />
            </div>
          </div>
          <div style="display:flex; gap:.5rem; justify-content:flex-end">
            <button onclick={() => budgetStore.tutupEditTarget()}
              style="padding:.35rem .75rem; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.8rem; background:none; cursor:pointer">Batal</button>
            <button onclick={() => budgetStore.simpanTarget()}
              style="padding:.35rem .75rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer">Simpan</button>
          </div>
        </div>
      {/if}

      <!-- Proyeksi Akhir Bulan -->
      {#if budgetStore.proyeksi && budgetStore.data?.target}
        <div style="border:1px solid var(--border); border-radius:6px; padding:.75rem 1rem; background:var(--surface); display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:1rem; flex-wrap:wrap">
          <div>
            <div style="font-size:.68rem; color:var(--text-dim); font-weight:600; text-transform:uppercase">Proyeksi Akhir Bulan</div>
            <div style="font-size:1rem; font-weight:700; color:var(--info); margin-top:.2rem">
              {rupiah(budgetStore.proyeksi.proyeksi_omzet)}
            </div>
            <div style="font-size:.72rem; color:var(--text-dim); margin-top:.15rem">
              Hari ke-{budgetStore.proyeksi.hari_sekarang} / {budgetStore.proyeksi.hari_dalam_bulan}
              {#if budgetStore.proyeksi.hari_sekarang > 0}
                · {rupiah(Math.round(budgetStore.proyeksi.omzet_saat_ini / budgetStore.proyeksi.hari_sekarang))}/hari
              {/if}
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:1.5rem; font-weight:700; color:{warnaDariStatus(statusPenjualan(proyeksiPct, true))}">{proyeksiPct}%</div>
            <div style="font-size:.7rem; color:var(--text-dim)">dari target</div>
          </div>
        </div>
      {/if}

      <!-- Budget Operasional -->
      <div style="font-size:.72rem; color:var(--text-dim); font-weight:600; text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem">Budget Operasional</div>
      <div style="overflow-x:auto">
        <table style="width:100%; border-collapse:collapse; font-size:.82rem">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              {#each ['Kategori','Budget','Realisasi','Sisa','Status',''] as h, i}
                <th style="padding:.5rem .6rem; text-align:{i > 0 && i < 5 ? 'right' : 'left'}; color:var(--text-dim); font-weight:600; font-size:.72rem; white-space:nowrap">{h}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each SEMUA_KATEGORI as kat (kat)}
              {@const bgt = budgetMap[kat] ?? 0}
              {@const real = budgetStore.realisasi?.realisasi_budget[kat] ?? 0}
              {@const sisa = bgt - real}
              {@const st = statusPengeluaran(real, bgt)}
              <tr style="border-bottom:1px solid var(--border)">
                <td style="padding:.55rem .6rem; color:var(--text)">{KATEGORI_LABEL[kat]}</td>
                <td style="padding:.55rem .6rem; text-align:right; color:{bgt > 0 ? 'var(--text)' : 'var(--text-dim)'}">{bgt > 0 ? rupiah(bgt) : '—'}</td>
                <td style="padding:.55rem .6rem; text-align:right; color:{real > 0 ? 'var(--text)' : 'var(--text-dim)'}">{real > 0 ? rupiah(real) : '—'}</td>
                <td style="padding:.55rem .6rem; text-align:right; color:{bgt > 0 ? (sisa < 0 ? 'var(--danger)' : 'var(--text)') : 'var(--text-dim)'}">{bgt > 0 ? rupiah(sisa) : '—'}</td>
                <td style="padding:.55rem .6rem">
                  {#if st !== 'kosong'}
                    <span style="font-size:.7rem; font-weight:700; color:{warnaDariStatus(st)}; border:1px solid {warnaDariStatus(st)}; padding:.1rem .4rem; border-radius:3px">{labelStatus(st)}</span>
                  {:else}
                    <span style="color:var(--text-dim)">—</span>
                  {/if}
                </td>
                <td style="padding:.55rem .4rem">
                  <button
                    onclick={() => budgetStore.bukaEditBudget(kat)}
                    style="padding:.2rem .5rem; border:1px solid var(--border); border-radius:3px; color:var(--text-dim); font-family:inherit; font-size:.72rem; background:none; cursor:pointer"
                  >Edit</button>
                </td>
              </tr>
              {#if budgetStore.editBudgetKategori === kat}
                <tr style="background:var(--surface2)">
                  <td colspan="6" style="padding:.6rem .8rem">
                    <div style="display:flex; flex-wrap:wrap; align-items:center; gap:.5rem">
                      <span style="font-size:.75rem; color:var(--accent); flex-shrink:0">{KATEGORI_LABEL[kat]}</span>
                      <input type="number" min="0" bind:value={budgetStore.draftBudget}
                        style="width:9rem; padding:.35rem .6rem; border:1px solid var(--accent); border-radius:4px; background:var(--bg); color:var(--text); font-family:inherit; font-size:.82rem"
                        placeholder="Budget (Rp)" />
                      <input type="text" bind:value={budgetStore.draftBudgetCatatan}
                        style="flex:1; min-width:0; padding:.35rem .6rem; border:1px solid var(--border); border-radius:4px; background:var(--bg); color:var(--text); font-family:inherit; font-size:.82rem"
                        placeholder="Catatan (opsional)" />
                      <button onclick={() => budgetStore.simpanBudget()}
                        style="padding:.35rem .75rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer; flex-shrink:0">Simpan</button>
                      <button onclick={() => budgetStore.tutupEditBudget()}
                        style="padding:.35rem .6rem; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.8rem; background:none; cursor:pointer; flex-shrink:0">Batal</button>
                    </div>
                  </td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      </div>

    {:else}

      <!-- Histori 6 Bulan -->
      <div style="font-size:.72rem; color:var(--text-dim); font-weight:600; text-transform:uppercase; letter-spacing:.05em; margin-bottom:.75rem">6 Bulan Terakhir</div>
      <div style="overflow-x:auto">
        <table style="width:100%; border-collapse:collapse; font-size:.82rem">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              {#each ['Bulan','Target Omzet','Realisasi','Capaian','Transaksi',''] as h, i}
                <th style="padding:.5rem .6rem; text-align:{i > 0 && i < 5 ? 'right' : 'left'}; color:var(--text-dim); font-weight:600; font-size:.72rem; white-space:nowrap">{h}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each budgetStore.histori as h (h.periode)}
              {@const pct = h.target ? pctRealisasi(h.realisasi.omzet, h.target.target_omzet) : 0}
              {@const st = statusPenjualan(pct, h.target !== null)}
              <tr style="border-bottom:1px solid var(--border)">
                <td style="padding:.55rem .6rem; color:var(--text)">
                  {labelBulan(h.periode)}
                  {#if h.periode === periodeIni}
                    <span style="font-size:.68rem; color:var(--accent); margin-left:.3rem">← ini</span>
                  {/if}
                </td>
                <td style="padding:.55rem .6rem; text-align:right; color:{h.target ? 'var(--text)' : 'var(--text-dim)'}">
                  {h.target ? rupiah(h.target.target_omzet) : '—'}
                </td>
                <td style="padding:.55rem .6rem; text-align:right; color:{h.realisasi.omzet > 0 ? 'var(--text)' : 'var(--text-dim)'}">
                  {h.realisasi.omzet > 0 ? rupiah(h.realisasi.omzet) : '—'}
                </td>
                <td style="padding:.55rem .6rem; text-align:right; font-weight:700; color:{warnaDariStatus(st)}">
                  {h.target ? `${pct}%` : '—'}
                </td>
                <td style="padding:.55rem .6rem; text-align:right; color:var(--text)">{h.realisasi.transaksi}</td>
                <td style="padding:.55rem .4rem">
                  <button
                    onclick={() => { budgetStore.muatPeriode(h.periode); budgetTabAktif = 'periode' }}
                    style="padding:.2rem .5rem; border:1px solid var(--info); border-radius:3px; color:var(--info); font-family:inherit; font-size:.72rem; background:none; cursor:pointer"
                  >Buka</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

    {/if}
  {/if}
</div>

<!-- ═══════════════════════════════════ MODAL BAYAR HUTANG ═══ -->
{#if modalBayarHutang && hutangDipilih}
  <div
    role="dialog" aria-modal="true" tabindex="-1"
    style="position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:50;padding:1rem"
    onkeydown={(e) => { if (e.key === 'Escape') modalBayarHutang = false }}
  >
    <div
      style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:1.5rem;width:100%;max-width:420px"
      role="presentation" onclick={(e) => e.stopPropagation()}
    >
      <h2 style="font-size:1rem; font-weight:700; margin:0 0 1rem; color:var(--text)">Bayar Hutang</h2>
      <p style="font-size:.82rem; color:var(--text-dim); margin:0 0 1rem">
        {hutangDipilih.nama_supplier} — Sisa <strong style="color:var(--danger)">Rp {fmt(hutangDipilih.sisa_hutang)}</strong>
      </p>
      <div style="display:flex; flex-direction:column; gap:.75rem">
        <div>
          <label for="bh-tgl" style="display:block; font-size:.75rem; color:var(--text-dim); margin-bottom:.3rem">Tanggal Bayar</label>
          <input id="bh-tgl" type="date" bind:value={formBayarHutang.tanggal_bayar}
            style="width:100%; padding:.5rem .7rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.85rem; box-sizing:border-box" />
        </div>
        <div>
          <label for="bh-jumlah" style="display:block; font-size:.75rem; color:var(--text-dim); margin-bottom:.3rem">Jumlah Bayar</label>
          <input id="bh-jumlah" type="number" bind:value={formBayarHutang.jumlah_bayar} min="1"
            style="width:100%; padding:.5rem .7rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.85rem; box-sizing:border-box" />
        </div>
        <div>
          <label for="bh-akun" style="display:block; font-size:.75rem; color:var(--text-dim); margin-bottom:.3rem">Akun Kas/Bank</label>
          <select id="bh-akun" bind:value={formBayarHutang.kas_bank_id}
            style="width:100%; padding:.5rem .7rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.85rem; box-sizing:border-box">
            {#each kasBankList as kb}
              <option value={kb.id}>{kb.nama}</option>
            {/each}
          </select>
        </div>
      </div>
      <div style="display:flex; gap:.75rem; justify-content:flex-end; margin-top:1.25rem">
        <button onclick={() => modalBayarHutang = false}
          style="padding:.45rem .9rem; background:transparent; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.82rem; cursor:pointer">Batal</button>
        <button onclick={simpanBayarHutang} disabled={savingBayarHutang}
          style="padding:.45rem .9rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.82rem; font-weight:700; cursor:pointer; opacity:{savingBayarHutang ? .6 : 1}">
          {savingBayarHutang ? 'Menyimpan...' : 'Bayar'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ══════════════════════════════════ MODAL BAYAR PIUTANG ══ -->
{#if modalBayarPiutang && piutangDipilih}
  <div
    role="dialog" aria-modal="true" tabindex="-1"
    style="position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:50;padding:1rem"
    onkeydown={(e) => { if (e.key === 'Escape') modalBayarPiutang = false }}
  >
    <div
      style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:1.5rem;width:100%;max-width:420px"
      role="presentation" onclick={(e) => e.stopPropagation()}
    >
      <h2 style="font-size:1rem; font-weight:700; margin:0 0 1rem; color:var(--text)">Terima Pembayaran Piutang</h2>
      <p style="font-size:.82rem; color:var(--text-dim); margin:0 0 1rem">
        {piutangDipilih.nama_pelanggan} — Sisa <strong style="color:var(--warn)">Rp {fmt(piutangDipilih.sisa_piutang)}</strong>
      </p>
      <div style="display:flex; flex-direction:column; gap:.75rem">
        <div>
          <label for="bp-tgl" style="display:block; font-size:.75rem; color:var(--text-dim); margin-bottom:.3rem">Tanggal Terima</label>
          <input id="bp-tgl" type="date" bind:value={formBayarPiutang.tanggal_bayar}
            style="width:100%; padding:.5rem .7rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.85rem; box-sizing:border-box" />
        </div>
        <div>
          <label for="bp-jumlah" style="display:block; font-size:.75rem; color:var(--text-dim); margin-bottom:.3rem">Jumlah Diterima</label>
          <input id="bp-jumlah" type="number" bind:value={formBayarPiutang.jumlah_bayar} min="1"
            style="width:100%; padding:.5rem .7rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.85rem; box-sizing:border-box" />
        </div>
        <div>
          <label for="bp-akun" style="display:block; font-size:.75rem; color:var(--text-dim); margin-bottom:.3rem">Akun Kas/Bank</label>
          <select id="bp-akun" bind:value={formBayarPiutang.kas_bank_id}
            style="width:100%; padding:.5rem .7rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.85rem; box-sizing:border-box">
            {#each kasBankList as kb}
              <option value={kb.id}>{kb.nama}</option>
            {/each}
          </select>
        </div>
      </div>
      <div style="display:flex; gap:.75rem; justify-content:flex-end; margin-top:1.25rem">
        <button onclick={() => modalBayarPiutang = false}
          style="padding:.45rem .9rem; background:transparent; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.82rem; cursor:pointer">Batal</button>
        <button onclick={simpanBayarPiutang} disabled={savingBayarPiutang}
          style="padding:.45rem .9rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.82rem; font-weight:700; cursor:pointer; opacity:{savingBayarPiutang ? .6 : 1}">
          {savingBayarPiutang ? 'Menyimpan...' : 'Terima'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ══════════════════════════════════ MODAL JURNAL MANUAL ══ -->
{#if modalJurnal}
  <div
    role="dialog" aria-modal="true" tabindex="-1"
    style="position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:50;padding:1rem"
    onkeydown={(e) => { if (e.key === 'Escape') modalJurnal = false }}
  >
    <div
      style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:1.5rem;width:100%;max-width:440px"
      role="presentation" onclick={(e) => e.stopPropagation()}
    >
      <h2 style="font-size:1rem; font-weight:700; margin:0 0 1rem; color:var(--text)">Catat Jurnal Kas</h2>
      <div style="display:flex; flex-direction:column; gap:.75rem">
        <div>
          <label for="jm-tgl" style="display:block; font-size:.75rem; color:var(--text-dim); margin-bottom:.3rem">Tanggal</label>
          <input id="jm-tgl" type="date" bind:value={formJurnal.tanggal}
            style="width:100%; padding:.5rem .7rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.85rem; box-sizing:border-box" />
        </div>
        <div>
          <label for="jm-akun" style="display:block; font-size:.75rem; color:var(--text-dim); margin-bottom:.3rem">Akun Kas/Bank</label>
          <select id="jm-akun" bind:value={formJurnal.kas_bank_id}
            style="width:100%; padding:.5rem .7rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.85rem; box-sizing:border-box">
            {#each kasBankList as kb}
              <option value={kb.id}>{kb.nama}</option>
            {/each}
          </select>
        </div>
        <div>
          <label for="jm-jenis" style="display:block; font-size:.75rem; color:var(--text-dim); margin-bottom:.3rem">Jenis</label>
          <select id="jm-jenis" bind:value={formJurnal.jenis}
            style="width:100%; padding:.5rem .7rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.85rem; box-sizing:border-box">
            <option value="masuk">Masuk</option>
            <option value="keluar">Keluar</option>
          </select>
        </div>
        <div>
          <label for="jm-kategori" style="display:block; font-size:.75rem; color:var(--text-dim); margin-bottom:.3rem">Kategori</label>
          <input id="jm-kategori" type="text" bind:value={formJurnal.kategori} placeholder="contoh: operasional, gaji..."
            style="width:100%; padding:.5rem .7rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.85rem; box-sizing:border-box" />
        </div>
        <div>
          <label for="jm-ket" style="display:block; font-size:.75rem; color:var(--text-dim); margin-bottom:.3rem">Keterangan</label>
          <input id="jm-ket" type="text" bind:value={formJurnal.keterangan}
            style="width:100%; padding:.5rem .7rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.85rem; box-sizing:border-box" />
        </div>
        <div>
          <label for="jm-jumlah" style="display:block; font-size:.75rem; color:var(--text-dim); margin-bottom:.3rem">Jumlah</label>
          <input id="jm-jumlah" type="number" bind:value={formJurnal.jumlah} min="1"
            style="width:100%; padding:.5rem .7rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.85rem; box-sizing:border-box" />
        </div>
      </div>
      <div style="display:flex; gap:.75rem; justify-content:flex-end; margin-top:1.25rem">
        <button onclick={() => modalJurnal = false}
          style="padding:.45rem .9rem; background:transparent; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.82rem; cursor:pointer">Batal</button>
        <button onclick={simpanJurnal} disabled={savingJurnal}
          style="padding:.45rem .9rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.82rem; font-weight:700; cursor:pointer; opacity:{savingJurnal ? .6 : 1}">
          {savingJurnal ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ══════════════════════════════════ MODAL KAS/BANK ════════ -->
{#if modalKasBank}
  <div
    role="dialog" aria-modal="true" tabindex="-1"
    style="position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:50;padding:1rem"
    onkeydown={(e) => { if (e.key === 'Escape') modalKasBank = false }}
  >
    <div
      style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:1.5rem;width:100%;max-width:400px"
      role="presentation" onclick={(e) => e.stopPropagation()}
    >
      <h2 style="font-size:1rem; font-weight:700; margin:0 0 1rem; color:var(--text)">
        {editKasBank ? 'Edit Akun' : 'Tambah Akun Kas/Bank'}
      </h2>
      <div style="display:flex; flex-direction:column; gap:.75rem">
        <div>
          <label for="kb-nama" style="display:block; font-size:.75rem; color:var(--text-dim); margin-bottom:.3rem">Nama Akun</label>
          <input id="kb-nama" type="text" bind:value={formKasBank.nama} placeholder="contoh: Kas Toko, BCA 1234"
            style="width:100%; padding:.5rem .7rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.85rem; box-sizing:border-box" />
        </div>
        {#if !editKasBank}
          <div>
            <label for="kb-tipe" style="display:block; font-size:.75rem; color:var(--text-dim); margin-bottom:.3rem">Tipe</label>
            <select id="kb-tipe" bind:value={formKasBank.tipe}
              style="width:100%; padding:.5rem .7rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.85rem; box-sizing:border-box">
              <option value="kas">Kas (uang tunai)</option>
              <option value="bank">Bank (rekening)</option>
            </select>
          </div>
        {/if}
        <div>
          <label for="kb-saldo" style="display:block; font-size:.75rem; color:var(--text-dim); margin-bottom:.3rem">Saldo Awal</label>
          <input id="kb-saldo" type="number" bind:value={formKasBank.saldo_awal} min="0"
            style="width:100%; padding:.5rem .7rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:inherit; font-size:.85rem; box-sizing:border-box" />
        </div>
      </div>
      <div style="display:flex; gap:.75rem; justify-content:flex-end; margin-top:1.25rem">
        <button onclick={() => modalKasBank = false}
          style="padding:.45rem .9rem; background:transparent; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.82rem; cursor:pointer">Batal</button>
        <button onclick={simpanKasBank} disabled={savingKasBank}
          style="padding:.45rem .9rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.82rem; font-weight:700; cursor:pointer; opacity:{savingKasBank ? .6 : 1}">
          {savingKasBank ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </div>
  </div>
{/if}

{#snippet kartuTarget(label: string, nilai: string, target: string | null, pct: number, status: StatusMetrik)}
  <div style="border:1px solid var(--border); border-radius:6px; padding:.75rem .9rem; background:var(--surface)">
    <div style="font-size:.68rem; color:var(--text-dim); font-weight:600; text-transform:uppercase; margin-bottom:.4rem">{label}</div>
    <div style="font-size:1.05rem; font-weight:700; color:var(--text); margin-bottom:.4rem">{nilai}</div>
    <div style="display:flex; align-items:center; justify-content:space-between; gap:.5rem">
      {#if target}
        <span style="font-size:.72rem; color:var(--text-dim)">Target: {target}</span>
        <span style="font-size:.8rem; font-weight:700; color:{warnaDariStatus(status)}">{pct}%</span>
      {:else}
        <span style="font-size:.72rem; color:var(--text-dim)">Belum ada target</span>
      {/if}
    </div>
    {#if target}
      <div style="height:5px; border-radius:3px; background:var(--surface2); margin-top:.4rem; overflow:hidden">
        <div style="height:100%; border-radius:3px; width:{Math.min(pct, 100)}%; background:{warnaDariStatus(status)}"></div>
      </div>
    {/if}
  </div>
{/snippet}
