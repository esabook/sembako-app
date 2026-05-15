<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { api } from '$lib/utils/api'
  import { user } from '$lib/stores/auth.js'

  $effect(() => {
    if ($user && !['pemilik', 'manajer'].includes($user.role)) goto('/kasir')
  })

  type TabKey = 'hutang' | 'piutang' | 'jurnal'
  let tab = $state<TabKey>('hutang')

  // ── Data ──────────────────────────────────────────────────────────────────

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

  type KasBank = { id: number; nama: string; tipe: 'kas' | 'bank' }

  let hutangList = $state<Hutang[]>([])
  let piutangList = $state<Piutang[]>([])
  let jurnalList = $state<Jurnal[]>([])
  let kasBankList = $state<KasBank[]>([])

  let loading = $state(false)
  let error = $state('')

  // ── Filter ────────────────────────────────────────────────────────────────

  let filterStatusHutang = $state<'semua' | 'belum' | 'sebagian' | 'lunas'>('belum')
  let filterStatusPiutang = $state<'semua' | 'belum' | 'sebagian' | 'lunas'>('belum')

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

  // ── Ringkasan ─────────────────────────────────────────────────────────────

  let totalHutangBelum = $derived(
    hutangList.filter((h) => h.status !== 'lunas').reduce((s, h) => s + h.sisa_hutang, 0)
  )
  let totalPiutangBelum = $derived(
    piutangList.filter((p) => p.status !== 'lunas').reduce((s, p) => s + p.sisa_piutang, 0)
  )

  // ── Modal Bayar Hutang ────────────────────────────────────────────────────

  let modalBayarHutang = $state(false)
  let hutangDipilih = $state<Hutang | null>(null)
  let formBayarHutang = $state({ jumlah_bayar: 0, kas_bank_id: 0, tanggal_bayar: '' })
  let savingBayarHutang = $state(false)

  function bukaBayarHutang(h: Hutang) {
    hutangDipilih = h
    formBayarHutang = {
      jumlah_bayar: h.sisa_hutang,
      kas_bank_id: kasBankList[0]?.id ?? 0,
      tanggal_bayar: hariIni(),
    }
    modalBayarHutang = true
  }

  async function simpanBayarHutang() {
    if (!hutangDipilih) return
    savingBayarHutang = true
    const res = await api.post<{ sisa_hutang: number; status: string }>(
      `/keuangan/hutang/${hutangDipilih.id}/bayar`,
      formBayarHutang
    )
    savingBayarHutang = false
    if (!res.success) { error = res.error ?? 'Gagal menyimpan'; return }
    modalBayarHutang = false
    await muatHutang()
  }

  // ── Modal Bayar Piutang ───────────────────────────────────────────────────

  let modalBayarPiutang = $state(false)
  let piutangDipilih = $state<Piutang | null>(null)
  let formBayarPiutang = $state({ jumlah_bayar: 0, kas_bank_id: 0, tanggal_bayar: '' })
  let savingBayarPiutang = $state(false)

  function bukaBayarPiutang(p: Piutang) {
    piutangDipilih = p
    formBayarPiutang = {
      jumlah_bayar: p.sisa_piutang,
      kas_bank_id: kasBankList[0]?.id ?? 0,
      tanggal_bayar: hariIni(),
    }
    modalBayarPiutang = true
  }

  async function simpanBayarPiutang() {
    if (!piutangDipilih) return
    savingBayarPiutang = true
    const res = await api.post<{ sisa_piutang: number; status: string }>(
      `/keuangan/piutang/${piutangDipilih.id}/bayar`,
      formBayarPiutang
    )
    savingBayarPiutang = false
    if (!res.success) { error = res.error ?? 'Gagal menyimpan'; return }
    modalBayarPiutang = false
    await muatPiutang()
  }

  // ── Modal Jurnal Manual ───────────────────────────────────────────────────

  let modalJurnal = $state(false)
  let formJurnal = $state({
    kas_bank_id: 0, jenis: 'masuk' as 'masuk' | 'keluar',
    kategori: '', keterangan: '', jumlah: 0, tanggal: '',
  })
  let savingJurnal = $state(false)

  function bukaModalJurnal() {
    formJurnal = {
      kas_bank_id: kasBankList[0]?.id ?? 0,
      jenis: 'masuk', kategori: '', keterangan: '', jumlah: 0, tanggal: hariIni(),
    }
    modalJurnal = true
  }

  async function simpanJurnal() {
    savingJurnal = true
    const res = await api.post('/keuangan/jurnal', formJurnal)
    savingJurnal = false
    if (!res.success) { error = res.error ?? 'Gagal menyimpan'; return }
    modalJurnal = false
    await muatJurnal()
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
    const res = await api.get<Jurnal[]>('/keuangan/jurnal')
    if (res.success) jurnalList = res.data!
  }

  onMount(async () => {
    loading = true
    const kb = await api.get<KasBank[]>('/keuangan/kas-bank')
    if (kb.success) kasBankList = kb.data!
    await Promise.all([muatHutang(), muatPiutang(), muatJurnal()])
    loading = false
  })

  $effect(() => {
    if (tab === 'hutang') muatHutang()
    else if (tab === 'piutang') muatPiutang()
    else if (tab === 'jurnal') muatJurnal()
  })
</script>

<!-- ───────────────────────────────────────────────── HEADER ── -->
<div style="padding:1rem 1.25rem 0">
  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem">
    <h1 style="font-size:1.1rem; font-weight:700; color:var(--text)">Keuangan</h1>
    {#if tab === 'jurnal'}
      <button
        onclick={bukaModalJurnal}
        style="padding:.4rem .9rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
      >+ Catat Jurnal</button>
    {/if}
  </div>

  <!-- Ringkasan -->
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:.75rem; margin-bottom:1rem">
    <div style="background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:.75rem 1rem">
      <div style="font-size:.7rem; color:var(--text-dim); margin-bottom:.25rem">HUTANG SUPPLIER</div>
      <div style="font-size:1.1rem; font-weight:700; color:var(--danger)">Rp {fmt(totalHutangBelum)}</div>
    </div>
    <div style="background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:.75rem 1rem">
      <div style="font-size:.7rem; color:var(--text-dim); margin-bottom:.25rem">PIUTANG PELANGGAN</div>
      <div style="font-size:1.1rem; font-weight:700; color:var(--warn)">Rp {fmt(totalPiutangBelum)}</div>
    </div>
  </div>

  <!-- Tabs -->
  <div style="display:flex; gap:.5rem; border-bottom:1px solid var(--border); margin-bottom:1rem">
    {#each (['hutang','piutang','jurnal'] as TabKey[]) as t}
      <button
        onclick={() => tab = t}
        style="padding:.5rem 1rem; background:none; border:none; border-bottom:2px solid {tab===t ? 'var(--accent)' : 'transparent'}; color:{tab===t ? 'var(--accent)' : 'var(--text-dim)'}; font-family:inherit; font-size:.8rem; font-weight:600; cursor:pointer; text-transform:uppercase; letter-spacing:.05em"
      >{t === 'hutang' ? 'Hutang Supplier' : t === 'piutang' ? 'Piutang Pelanggan' : 'Jurnal Kas'}</button>
    {/each}
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

    {#if loading}
      <p style="color:var(--text-dim); font-size:.85rem">Memuat...</p>
    {:else if hutangFiltered.length === 0}
      <p style="color:var(--text-dim); font-size:.85rem">Tidak ada data hutang.</p>
    {:else}
      <div style="overflow-x:auto">
        <table style="width:100%; border-collapse:collapse; font-size:.82rem">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              {#each ['Supplier','Tgl Hutang','Jatuh Tempo','Total','Sisa','Status',''] as h}
                <th style="padding:.5rem .6rem; text-align:left; color:var(--text-dim); font-weight:600; font-size:.72rem; white-space:nowrap">{h}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each hutangFiltered as h}
              <tr style="border-bottom:1px solid var(--border)">
                <td style="padding:.55rem .6rem; color:var(--text)">{h.nama_supplier ?? '—'}</td>
                <td style="padding:.55rem .6rem; color:var(--text-dim)">{tglFmt(h.tanggal_hutang)}</td>
                <td style="padding:.55rem .6rem; color:{isJatuhTempo(h.tanggal_jatuh_tempo) && h.status !== 'lunas' ? 'var(--danger)' : 'var(--text-dim)'}">
                  {tglFmt(h.tanggal_jatuh_tempo)}
                  {#if isJatuhTempo(h.tanggal_jatuh_tempo) && h.status !== 'lunas'} ⚠{/if}
                </td>
                <td style="padding:.55rem .6rem; color:var(--text); text-align:right">Rp {fmt(h.total_hutang)}</td>
                <td style="padding:.55rem .6rem; font-weight:700; text-align:right; color:{h.sisa_hutang > 0 ? 'var(--danger)' : 'var(--text-dim)'}">
                  Rp {fmt(h.sisa_hutang)}
                </td>
                <td style="padding:.55rem .6rem">
                  <span style="font-size:.7rem; font-weight:700; text-transform:uppercase; {statusBadge(h.status)}">{h.status}</span>
                </td>
                <td style="padding:.55rem .6rem">
                  {#if h.status !== 'lunas'}
                    <button
                      onclick={() => bukaBayarHutang(h)}
                      style="padding:.25rem .65rem; background:var(--accent); color:var(--bg); border:none; border-radius:3px; font-family:inherit; font-size:.72rem; font-weight:700; cursor:pointer"
                    >Bayar</button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
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

    {#if loading}
      <p style="color:var(--text-dim); font-size:.85rem">Memuat...</p>
    {:else if piutangFiltered.length === 0}
      <p style="color:var(--text-dim); font-size:.85rem">Tidak ada data piutang.</p>
    {:else}
      <div style="overflow-x:auto">
        <table style="width:100%; border-collapse:collapse; font-size:.82rem">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              {#each ['Pelanggan','No Transaksi','Tgl Piutang','Jatuh Tempo','Total','Sisa','Status',''] as h}
                <th style="padding:.5rem .6rem; text-align:left; color:var(--text-dim); font-weight:600; font-size:.72rem; white-space:nowrap">{h}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each piutangFiltered as p}
              <tr style="border-bottom:1px solid var(--border)">
                <td style="padding:.55rem .6rem; color:var(--text)">{p.nama_pelanggan ?? '—'}</td>
                <td style="padding:.55rem .6rem; color:var(--text-dim); font-size:.75rem">{p.no_transaksi ?? '—'}</td>
                <td style="padding:.55rem .6rem; color:var(--text-dim)">{tglFmt(p.tanggal_piutang)}</td>
                <td style="padding:.55rem .6rem; color:{isJatuhTempo(p.tanggal_jatuh_tempo) && p.status !== 'lunas' ? 'var(--danger)' : 'var(--text-dim)'}">
                  {tglFmt(p.tanggal_jatuh_tempo)}
                  {#if isJatuhTempo(p.tanggal_jatuh_tempo) && p.status !== 'lunas'} ⚠{/if}
                </td>
                <td style="padding:.55rem .6rem; color:var(--text); text-align:right">Rp {fmt(p.total_piutang)}</td>
                <td style="padding:.55rem .6rem; font-weight:700; text-align:right; color:{p.sisa_piutang > 0 ? 'var(--warn)' : 'var(--text-dim)'}">
                  Rp {fmt(p.sisa_piutang)}
                </td>
                <td style="padding:.55rem .6rem">
                  <span style="font-size:.7rem; font-weight:700; text-transform:uppercase; {statusBadge(p.status)}">{p.status}</span>
                </td>
                <td style="padding:.55rem .6rem">
                  {#if p.status !== 'lunas'}
                    <button
                      onclick={() => bukaBayarPiutang(p)}
                      style="padding:.25rem .65rem; background:var(--accent); color:var(--bg); border:none; border-radius:3px; font-family:inherit; font-size:.72rem; font-weight:700; cursor:pointer"
                    >Terima</button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}

  <!-- ═══════════════════════════════════════ TAB JURNAL ═══ -->
  {#if tab === 'jurnal'}
    {#if loading}
      <p style="color:var(--text-dim); font-size:.85rem">Memuat...</p>
    {:else if jurnalList.length === 0}
      <p style="color:var(--text-dim); font-size:.85rem">Belum ada jurnal kas.</p>
    {:else}
      <div style="overflow-x:auto">
        <table style="width:100%; border-collapse:collapse; font-size:.82rem">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              {#each ['Tanggal','Akun','Jenis','Kategori','Keterangan','Jumlah'] as h}
                <th style="padding:.5rem .6rem; text-align:left; color:var(--text-dim); font-weight:600; font-size:.72rem; white-space:nowrap">{h}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each jurnalList as j}
              <tr style="border-bottom:1px solid var(--border)">
                <td style="padding:.55rem .6rem; color:var(--text-dim)">{tglFmt(j.tanggal)}</td>
                <td style="padding:.55rem .6rem; color:var(--text)">{j.nama_akun ?? '—'}</td>
                <td style="padding:.55rem .6rem">
                  <span style="font-size:.7rem; font-weight:700; color:{j.jenis === 'masuk' ? 'var(--accent)' : 'var(--danger)'}">
                    {j.jenis === 'masuk' ? '▲ MASUK' : '▼ KELUAR'}
                  </span>
                </td>
                <td style="padding:.55rem .6rem; color:var(--text-dim); font-size:.78rem">{j.kategori}</td>
                <td style="padding:.55rem .6rem; color:var(--text-dim); font-size:.78rem">{j.keterangan ?? '—'}</td>
                <td style="padding:.55rem .6rem; text-align:right; font-weight:700; color:{j.jenis === 'masuk' ? 'var(--accent)' : 'var(--danger)'}">
                  Rp {fmt(j.jumlah)}
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
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    style="position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:50;padding:1rem"
    onkeydown={(e) => { if (e.key === 'Escape') modalBayarHutang = false }}
  >
    <div
      style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:1.5rem;width:100%;max-width:420px"
      role="presentation"
      onclick={(e) => e.stopPropagation()}
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
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    style="position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:50;padding:1rem"
    onkeydown={(e) => { if (e.key === 'Escape') modalBayarPiutang = false }}
  >
    <div
      style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:1.5rem;width:100%;max-width:420px"
      role="presentation"
      onclick={(e) => e.stopPropagation()}
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
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    style="position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:50;padding:1rem"
    onkeydown={(e) => { if (e.key === 'Escape') modalJurnal = false }}
  >
    <div
      style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:1.5rem;width:100%;max-width:440px"
      role="presentation"
      onclick={(e) => e.stopPropagation()}
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
