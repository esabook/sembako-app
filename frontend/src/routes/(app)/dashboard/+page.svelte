<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { api } from '$lib/utils/api.js'
  import { user } from '$lib/stores/auth.js'

  $effect(() => {
    if ($user && !['pemilik', 'manajer'].includes($user.role)) goto('/kasir')
  })

  type PenjualanHari = { total: number; jumlah_trx: number; rata_per_trx: number }
  type PenjualanSimple = { total: number; jumlah_trx: number }
  type Trend = { tanggal: string; total: number; jumlah_trx: number }
  type AkunKas = { id: number; nama: string; tipe: string; saldo: number }
  type StokKritis = { id: number; kode_barang: string; nama_barang: string; stok_sekarang: number; stok_minimum: number }
  type StokPrediktif = { id: number; nama_barang: string; stok_sekarang: number; satuan: string | null; avg_harian: number; hari_tersisa: number }
  type PiutangMacet = { id: number; nama_pelanggan: string; kontak: string | null; sisa_piutang: number; tanggal_jatuh_tempo: string | null }
  type HutangJT = { id: number; nama_supplier: string; sisa_hutang: number; tanggal_jatuh_tempo: string | null }
  type TopBarang = { barang_id: number; nama_barang: string; total_qty: number; total_omset: number }
  type BelumAbsen = { id: number; nama: string; role: string }

  type DashboardData = {
    today: string
    penjualan_hari_ini: PenjualanHari | null
    penjualan_kemarin: PenjualanSimple | null
    penjualan_30hari: Trend[]
    saldo_kas: { akun: AkunKas[]; total: number }
    stok_kritis: StokKritis[]
    piutang_macet: { list: PiutangMacet[]; total: number }
    hutang_jatuh_tempo: { list: HutangJT[]; total: number }
    top_barang: TopBarang[]
    belum_absen: BelumAbsen[]
    ringkasan: { total_piutang: number; total_hutang: number }
  }

  let data = $state<DashboardData | null>(null)
  let stokPrediktif = $state<StokPrediktif[]>([])
  let loading = $state(true)

  onMount(async () => {
    const [resMain, resPrediktif] = await Promise.all([
      api.get<DashboardData>('/dashboard'),
      api.get<StokPrediktif[]>('/stok/alert-prediktif?hari=7'),
    ])
    if (resMain.success) data = resMain.data
    if (resPrediktif.success) stokPrediktif = resPrediktif.data
    loading = false
  })

  function rp(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}rb`
    return String(Math.round(n))
  }

  function rpFull(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
  }

  function delta(today: number, yesterday: number): string {
    if (yesterday === 0) return today > 0 ? '+100%' : '0%'
    const pct = ((today - yesterday) / yesterday) * 100
    return (pct >= 0 ? '+' : '') + pct.toFixed(0) + '%'
  }

  function deltaColor(today: number, yesterday: number): string {
    if (today > yesterday) return 'var(--accent)'
    if (today < yesterday) return 'var(--danger)'
    return 'var(--text-dim)'
  }

  let chartPeriode = $state<7 | 30>(30)

  function buildChartDays(penjualan30: Trend[], today: string, n: 7 | 30 = 30) {
    const map = new Map(penjualan30.map(r => [r.tanggal, r]))
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(Date.now() - (n - 1 - i) * 86400000)
      const tgl = d.toISOString().slice(0, 10)
      const mid = Math.floor(n / 2)
      const label = i === 0 || i === mid || i === n - 1 || tgl === today
        ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        : String(d.getDate())
      return { tanggal: tgl, total: map.get(tgl)?.total ?? 0, label, isToday: tgl === today }
    })
  }

  let chartDaysComputed = $derived(
    data ? buildChartDays(data.penjualan_30hari, data.today, chartPeriode) : []
  )
  let chartMax = $derived(Math.max(...chartDaysComputed.map(r => r.total), 1))
  let chartAvg = $derived(
    chartDaysComputed.length > 0
      ? chartDaysComputed.reduce((s, d) => s + d.total, 0) / chartDaysComputed.length
      : 0
  )
  let chartAvgPct = $derived(chartMax > 0 ? (chartAvg / chartMax) * 100 : 0)

  function hariDariToday(tgl: string): number {
    return Math.round((new Date(tgl).getTime() - Date.now()) / 86400000)
  }
</script>

{#if loading}
  <div class="flex items-center justify-center h-40 text-sm" style="color:var(--text-dim)">Memuat dashboard...</div>
{:else if data}
  <div class="flex flex-col gap-5">

    <!-- ── Header ───────────────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-base font-bold">Dashboard</h2>
        <p class="text-xs mt-0.5" style="color:var(--text-dim)">
          Selamat datang, <strong>{$user?.nama}</strong> —
          {new Date(data.today + 'T00:00:00').toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </p>
      </div>
      <button onclick={() => window.location.reload()}
        class="text-xs px-2 py-1 rounded border"
        style="border-color:var(--border);color:var(--text-dim)">Refresh</button>
    </div>

    <!-- ── ALERT ZONE ────────────────────────────────────────────────────────── -->
    {#if data.stok_kritis.length > 0 || data.piutang_macet.list.length > 0 || data.belum_absen.length > 0 || stokPrediktif.length > 0}
      <div class="flex flex-col gap-2">
        <h3 class="text-xs font-bold uppercase tracking-wider" style="color:var(--danger)">Alert</h3>
        <div class="grid gap-2" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">

          {#if data.stok_kritis.length > 0}
            <div class="rounded border p-3" style="background:var(--surface);border-left:3px solid var(--danger)">
              <p class="text-xs font-bold mb-2" style="color:var(--danger)">STOK KRITIS — {data.stok_kritis.length} item</p>
              {#each data.stok_kritis.slice(0, 4) as item}
                <div class="flex justify-between text-xs py-0.5">
                  <span class="truncate mr-2" style="max-width:170px">{item.nama_barang}</span>
                  <span class="font-bold shrink-0" style="color:{item.stok_sekarang <= 0 ? 'var(--danger)' : 'var(--warn)'}">
                    {item.stok_sekarang <= 0 ? 'HABIS' : item.stok_sekarang}
                  </span>
                </div>
              {/each}
              {#if data.stok_kritis.length > 4}
                <p class="text-xs mt-1" style="color:var(--text-dim)">+{data.stok_kritis.length - 4} lainnya →
                  <a href="/gudang" style="color:var(--info)">Lihat stok</a>
                </p>
              {/if}
            </div>
          {/if}

          {#if stokPrediktif.length > 0}
            {@const prediktifBaru = stokPrediktif.filter(p => !data?.stok_kritis.some(k => k.id === p.id))}
            {#if prediktifBaru.length > 0}
              <div class="rounded border p-3" style="background:var(--surface);border-left:3px solid var(--info)">
                <p class="text-xs font-bold mb-2" style="color:var(--info)">
                  PREDIKSI HABIS ≤7 HARI — {prediktifBaru.length} item
                </p>
                {#each prediktifBaru.slice(0, 5) as item}
                  <div class="flex justify-between text-xs py-0.5 gap-2">
                    <span class="truncate" style="max-width:150px">{item.nama_barang}</span>
                    <span class="shrink-0 font-bold tabular-nums"
                      style="color:{item.hari_tersisa <= 2 ? 'var(--danger)' : item.hari_tersisa <= 4 ? 'var(--warn)' : 'var(--info)'}">
                      ~{item.hari_tersisa}h
                    </span>
                  </div>
                {/each}
                {#if prediktifBaru.length > 5}
                  <p class="text-xs mt-1" style="color:var(--text-dim)">
                    +{prediktifBaru.length - 5} lainnya →
                    <a href="/gudang" style="color:var(--info)">Lihat stok</a>
                  </p>
                {/if}
              </div>
            {/if}
          {/if}

          {#if data.piutang_macet.list.length > 0}
            <div class="rounded border p-3" style="background:var(--surface);border-left:3px solid var(--warn)">
              <p class="text-xs font-bold mb-2" style="color:var(--warn)">PIUTANG MACET — {rpFull(data.piutang_macet.total)}</p>
              {#each data.piutang_macet.list.slice(0, 4) as item}
                <div class="flex justify-between text-xs py-0.5">
                  <span class="truncate mr-2" style="max-width:170px">{item.nama_pelanggan}</span>
                  <span class="font-bold shrink-0" style="color:var(--warn)">{rp(item.sisa_piutang)}</span>
                </div>
              {/each}
            </div>
          {/if}

          {#if data.belum_absen.length > 0}
            <div class="rounded border p-3" style="background:var(--surface);border-left:3px solid var(--border)">
              <p class="text-xs font-bold mb-2" style="color:var(--text-dim)">BELUM ABSEN — {data.belum_absen.length} karyawan</p>
              {#each data.belum_absen.slice(0, 4) as k}
                <div class="flex gap-2 text-xs py-0.5">
                  <span>{k.nama}</span>
                  <span style="color:var(--text-dim)">{k.role}</span>
                </div>
              {/each}
            </div>
          {/if}

        </div>
      </div>
    {:else}
      <div class="text-xs px-3 py-2 rounded border" style="border-color:var(--accent);color:var(--accent);background:var(--surface)">
        ✓ Tidak ada alert — semua aman hari ini
      </div>
    {/if}

    <!-- ── TODAY ZONE ────────────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-2">
      <h3 class="text-xs font-bold uppercase tracking-wider" style="color:var(--text-dim)">Hari Ini</h3>
      <div class="grid gap-3" style="grid-template-columns:repeat(auto-fill,minmax(175px,1fr))">

        <div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
          <p class="text-xs mb-1" style="color:var(--text-dim)">PENJUALAN</p>
          <p class="text-2xl font-bold" style="color:var(--accent)">{rp(data.penjualan_hari_ini?.total ?? 0)}</p>
          <p class="text-xs mt-1" style="color:{deltaColor(data.penjualan_hari_ini?.total ?? 0, data.penjualan_kemarin?.total ?? 0)}">
            {delta(data.penjualan_hari_ini?.total ?? 0, data.penjualan_kemarin?.total ?? 0)} vs kemarin
          </p>
        </div>

        <div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
          <p class="text-xs mb-1" style="color:var(--text-dim)">TRANSAKSI</p>
          <p class="text-2xl font-bold">{data.penjualan_hari_ini?.jumlah_trx ?? 0}</p>
          <p class="text-xs mt-1" style="color:var(--text-dim)">
            rata {rp(data.penjualan_hari_ini?.rata_per_trx ?? 0)}/trx
          </p>
        </div>

        <div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
          <p class="text-xs mb-1" style="color:var(--text-dim)">SALDO KAS</p>
          <p class="text-2xl font-bold" style="color:var(--info)">{rp(data.saldo_kas.total)}</p>
          <div class="text-xs mt-1 flex flex-col gap-0.5">
            {#each data.saldo_kas.akun as akun}
              <span style="color:var(--text-dim)">{akun.nama}: {rp(akun.saldo)}</span>
            {/each}
            {#if data.saldo_kas.akun.length === 0}
              <span style="color:var(--text-dim)">Belum ada akun kas</span>
            {/if}
          </div>
        </div>

        <div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
          <p class="text-xs mb-1" style="color:var(--text-dim)">PIUTANG</p>
          <p class="text-2xl font-bold" style="color:var(--warn)">{rp(data.ringkasan.total_piutang)}</p>
          {#if data.piutang_macet.total > 0}
            <p class="text-xs mt-1" style="color:var(--danger)">macet: {rp(data.piutang_macet.total)}</p>
          {:else}
            <p class="text-xs mt-1" style="color:var(--accent)">tidak ada macet</p>
          {/if}
        </div>

        <div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
          <p class="text-xs mb-1" style="color:var(--text-dim)">HUTANG</p>
          <p class="text-2xl font-bold">{rp(data.ringkasan.total_hutang)}</p>
          {#if data.hutang_jatuh_tempo.total > 0}
            <p class="text-xs mt-1" style="color:var(--warn)">jatuh tempo 7hr: {rp(data.hutang_jatuh_tempo.total)}</p>
          {:else}
            <p class="text-xs mt-1" style="color:var(--text-dim)">tidak ada jatuh tempo</p>
          {/if}
        </div>

      </div>
    </div>

    <!-- ── GRAFIK PENJUALAN ──────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-bold uppercase tracking-wider" style="color:var(--text-dim)">
          Penjualan {chartPeriode} Hari
        </h3>
        <div class="flex gap-1">
          {#each [7, 30] as n (n)}
            <button
              onclick={() => { chartPeriode = n as 7 | 30 }}
              class="text-xs px-2 py-0.5 rounded border"
              style="{chartPeriode === n ? 'background:var(--accent);color:#000;border-color:var(--accent)' : 'background:transparent;color:var(--text-dim);border-color:var(--border)'}"
            >{n}h</button>
          {/each}
        </div>
      </div>
      <div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
        <div class="relative" style="height:72px">
          <!-- Garis rata-rata -->
          {#if chartAvg > 0}
            <div
              class="absolute left-0 right-0 border-t border-dashed"
              style="bottom:{chartAvgPct}%;border-color:var(--warn);opacity:.6;pointer-events:none"
              title="Rata-rata: {rpFull(chartAvg)}"
            ></div>
          {/if}
          <div class="flex items-end gap-px h-full">
            {#each chartDaysComputed as day}
              {@const pct = chartMax > 0 ? (day.total / chartMax) * 100 : 0}
              <div class="flex-1 flex flex-col justify-end h-full" style="min-width:0" title="{day.tanggal}: {rpFull(day.total)}">
                <div style="
                  width:100%;
                  background:{day.isToday ? 'var(--accent)' : day.total > 0 ? 'var(--surface2)' : 'transparent'};
                  height:{Math.max(pct, day.total > 0 ? 3 : 0)}%;
                  border-radius:1px 1px 0 0;
                  border-top:{day.isToday ? 'none' : day.total > 0 ? '1px solid var(--border)' : 'none'}
                "></div>
              </div>
            {/each}
          </div>
        </div>
        <div class="flex gap-px mt-1">
          {#each chartDaysComputed as day, i}
            {@const n = chartDaysComputed.length}
            {@const showLabel = i === 0 || i === Math.floor(n/2) || i === n - 1 || day.isToday}
            <div class="flex-1 text-center overflow-hidden" style="min-width:0;font-size:9px;color:{day.isToday ? 'var(--accent)' : 'var(--text-dim)'}">
              {showLabel ? day.label : ''}
            </div>
          {/each}
        </div>
        {#if chartAvg > 0}
          <p class="text-xs mt-1" style="color:var(--warn)">— rata-rata: {rpFull(chartAvg)}/hari</p>
        {/if}
        {#if data.penjualan_30hari.length === 0}
          <p class="text-xs text-center mt-2" style="color:var(--text-dim)">Belum ada data penjualan</p>
        {/if}
      </div>
    </div>

    <!-- ── BOTTOM: Top Barang + Hutang JT ────────────────────────────────────── -->
    <div class="grid gap-4" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">

      <div class="flex flex-col gap-2">
        <h3 class="text-xs font-bold uppercase tracking-wider" style="color:var(--text-dim)">Top Barang (30 hari)</h3>
        <div class="rounded border" style="background:var(--surface);border-color:var(--border)">
          {#if data.top_barang.length === 0}
            <p class="text-xs p-4" style="color:var(--text-dim)">Belum ada data</p>
          {:else}
            {#each data.top_barang as item, i}
              {@const maxOmset = data.top_barang[0]?.total_omset ?? 1}
              <div class="px-3 py-2 {i > 0 ? 'border-t' : ''}" style="border-color:var(--border)">
                <div class="flex justify-between items-center text-xs mb-1">
                  <span class="font-medium truncate mr-2" style="max-width:160px">
                    <span style="color:var(--text-dim)" class="mr-1">#{i + 1}</span>{item.nama_barang}
                  </span>
                  <span class="shrink-0" style="color:var(--accent)">{rp(item.total_omset)}</span>
                </div>
                <div class="h-1 rounded-full" style="background:var(--surface2)">
                  <div class="h-1 rounded-full" style="background:var(--accent);width:{(item.total_omset / maxOmset) * 100}%"></div>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <h3 class="text-xs font-bold uppercase tracking-wider" style="color:var(--text-dim)">Hutang Jatuh Tempo (7 hari)</h3>
        <div class="rounded border" style="background:var(--surface);border-color:var(--border)">
          {#if data.hutang_jatuh_tempo.list.length === 0}
            <p class="text-xs p-4" style="color:var(--accent)">✓ Tidak ada hutang jatuh tempo minggu ini</p>
          {:else}
            {#each data.hutang_jatuh_tempo.list as item}
              {@const hari = hariDariToday(item.tanggal_jatuh_tempo ?? '')}
              <div class="px-3 py-2 border-b last:border-0 flex justify-between items-start text-xs"
                style="border-color:var(--border)">
                <div>
                  <p class="font-medium">{item.nama_supplier}</p>
                  <p style="color:var(--text-dim)">{item.tanggal_jatuh_tempo}
                    ({hari === 0 ? 'hari ini' : hari === 1 ? 'besok' : `${hari} hari`})</p>
                </div>
                <span class="font-bold ml-2 shrink-0" style="color:{hari <= 1 ? 'var(--danger)' : 'var(--warn)'}">
                  {rp(item.sisa_hutang)}
                </span>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      {#if data.piutang_macet.list.length > 0}
        <div class="flex flex-col gap-2">
          <h3 class="text-xs font-bold uppercase tracking-wider" style="color:var(--text-dim)">Piutang Macet</h3>
          <div class="rounded border" style="background:var(--surface);border-color:var(--border)">
            {#each data.piutang_macet.list as item}
              {@const hari = Math.abs(hariDariToday(item.tanggal_jatuh_tempo ?? ''))}
              <div class="px-3 py-2 border-b last:border-0 flex justify-between items-start text-xs"
                style="border-color:var(--border)">
                <div>
                  <p class="font-medium">{item.nama_pelanggan}</p>
                  <p style="color:var(--danger)">lewat {hari} hari</p>
                </div>
                <span class="font-bold ml-2 shrink-0" style="color:var(--danger)">{rp(item.sisa_piutang)}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

    </div>

  </div>
{:else}
  <p class="text-sm" style="color:var(--danger)">Gagal memuat data dashboard.</p>
{/if}
