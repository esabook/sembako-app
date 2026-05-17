<script lang="ts">
  import { untrack } from 'svelte'
  import { goto } from '$app/navigation'
  import { api } from '$lib/utils/api'
  import { user } from '$lib/stores/auth.js'

  $effect(() => {
    if ($user && !['pemilik', 'manajer'].includes($user.role)) goto('/kasir')
  })

  type TabKey = 'laba-rugi' | 'arus-kas' | 'neraca'
  let tab = $state<TabKey>('laba-rugi')

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

  // ── State ─────────────────────────────────────────────────────────────────

  let labaRugi = $state<LabaRugi | null>(null)
  let arusKas = $state<ArusKas | null>(null)
  let neraca = $state<Neraca | null>(null)
  let loading = $state(false)
  let error = $state('')

  function defaultPeriode() {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const last = new Date(y, now.getMonth() + 1, 0).getDate()
    return { dari: `${y}-${m}-01`, sampai: `${y}-${m}-${last}` }
  }

  let periode = $state(defaultPeriode())

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
    const res = await api.get<Neraca>('/laporan/neraca')
    loading = false
    if (res.success) neraca = res.data!
    else error = res.error ?? 'Gagal memuat laporan'
  }

  async function muat() {
    if (tab === 'laba-rugi') await muatLabaRugi()
    else if (tab === 'arus-kas') await muatArusKas()
    else await muatNeraca()
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

  function exportCsv() {
    if (tab === 'laba-rugi') exportLabaRugiCsv()
    else if (tab === 'arus-kas') exportArusKasCsv()
    else exportNeracaCsv()
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
  {#if tab !== 'neraca'}
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
  {/if}

  <!-- Tabs -->
  <div style="display:flex; gap:.5rem; border-bottom:1px solid var(--border); margin-bottom:1rem">
    {#each ([['laba-rugi','Laba Rugi'],['arus-kas','Arus Kas'],['neraca','Neraca']] as [TabKey, string][]) as [t, label]}
      <button
        onclick={() => tab = t}
        style="padding:.5rem 1rem; background:none; border:none; border-bottom:2px solid {tab===t ? 'var(--accent)' : 'transparent'}; color:{tab===t ? 'var(--accent)' : 'var(--text-dim)'}; font-family:inherit; font-size:.8rem; font-weight:600; cursor:pointer; text-transform:uppercase; letter-spacing:.05em"
      >{label}</button>
    {/each}
  </div>
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

{:else if !loading}
  <p style="padding:1.25rem; color:var(--text-dim); font-size:.85rem">Pilih tab dan klik Tampilkan.</p>
{/if}
