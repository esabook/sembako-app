<script lang="ts">
  import { onMount } from 'svelte'
  import { api } from '$lib/utils/api.js'

  let { pelangganId, namaPelanggan }: { pelangganId: number; namaPelanggan: string } = $props()

  type Trx = {
    id: number
    no_transaksi: string
    tanggal: string
    tipe: 'eceran' | 'grosir'
    total: number
    diskon_total: number
    metode_bayar: string
    status: 'lunas' | 'hutang'
  }

  type DetailItem = {
    id: number
    nama_barang: string
    jumlah: number
    harga_jual: number
    diskon_item: number
    subtotal: number
  }

  type Summary = {
    total_transaksi: number
    total_belanja: number
    rata_per_trx: number
    terakhir_belanja: string | null
  }

  let rows = $state<Trx[]>([])
  let total = $state(0)
  let summary = $state<Summary | null>(null)
  let loading = $state(false)
  let error = $state('')

  let dari = $state('')
  let sampai = $state('')
  let limit = 20
  let offset = $state(0)

  let expandedId = $state<number | null>(null)
  let detailMap = $state<Record<number, DetailItem[]>>({})
  let detailLoading = $state<Record<number, boolean>>({})

  function fmt(n: number) {
    return new Intl.NumberFormat('id-ID').format(Math.round(n))
  }

  function tglFmt(t: string) {
    return new Date(t).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function jamFmt(t: string) {
    return t.slice(11, 16)
  }

  async function muat(resetOffset = true) {
    if (resetOffset) offset = 0
    loading = true; error = ''
    const q = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (dari) q.set('dari', dari)
    if (sampai) q.set('sampai', sampai)
    const res = await api.get<{ rows: Trx[]; total: number; summary: Summary }>(
      `/pelanggan/${pelangganId}/riwayat?${q}`
    )
    loading = false
    if (res.success) {
      rows = res.data.rows
      total = res.data.total
      summary = res.data.summary
    } else {
      error = res.error ?? 'Gagal memuat riwayat'
    }
  }

  async function toggleDetail(id: number) {
    if (expandedId === id) { expandedId = null; return }
    expandedId = id
    if (detailMap[id]) return
    detailLoading = { ...detailLoading, [id]: true }
    const res = await api.get<DetailItem[]>(`/pelanggan/${pelangganId}/riwayat/${id}/detail`)
    detailLoading = { ...detailLoading, [id]: false }
    if (res.success) detailMap = { ...detailMap, [id]: res.data }
  }

  function halamanSebelum() {
    if (offset === 0) return
    offset = Math.max(0, offset - limit)
    muat(false)
  }

  function halamanBerikut() {
    if (offset + limit >= total) return
    offset += limit
    muat(false)
  }

  const METODE_LABEL: Record<string, string> = {
    tunai: 'Tunai', transfer: 'Transfer', qris: 'QRIS', hutang: 'Hutang',
  }

  onMount(() => muat())
</script>

<div class="space-y-4">
  <!-- Summary cards -->
  {#if summary && summary.total_transaksi > 0}
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {#each [
        { label: 'Total Transaksi', val: String(summary.total_transaksi), accent: false },
        { label: 'Total Belanja', val: `Rp ${fmt(summary.total_belanja)}`, accent: true },
        { label: 'Rata-rata/Transaksi', val: `Rp ${fmt(summary.rata_per_trx)}`, accent: false },
        { label: 'Terakhir Belanja', val: summary.terakhir_belanja ? tglFmt(summary.terakhir_belanja) : '—', accent: false },
      ] as card (card.label)}
        <div class="rounded-lg border p-3" style="background:var(--surface);border-color:var(--border)">
          <div class="text-xs mb-1" style="color:var(--text-dim)">{card.label}</div>
          <div class="text-sm font-bold" style="color:{card.accent ? 'var(--accent)' : 'var(--text)'}">
            {card.val}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Filter -->
  <div class="flex flex-wrap gap-2 items-center">
    <div class="flex gap-1 items-center">
      <label for="rw-dari" class="text-xs" style="color:var(--text-dim)">Dari</label>
      <input id="rw-dari" type="date" bind:value={dari}
        class="rounded border px-2 py-1 text-xs"
        style="background:var(--surface2);border-color:var(--border);color:var(--text);font-family:inherit" />
    </div>
    <div class="flex gap-1 items-center">
      <label for="rw-sampai" class="text-xs" style="color:var(--text-dim)">Sampai</label>
      <input id="rw-sampai" type="date" bind:value={sampai}
        class="rounded border px-2 py-1 text-xs"
        style="background:var(--surface2);border-color:var(--border);color:var(--text);font-family:inherit" />
    </div>
    <button onclick={() => muat()}
      class="rounded px-3 py-1.5 text-xs font-bold"
      style="background:var(--accent);color:var(--bg);border:none;cursor:pointer">
      Filter
    </button>
    {#if dari || sampai}
      <button onclick={() => { dari = ''; sampai = ''; muat() }}
        class="rounded px-2 py-1.5 text-xs"
        style="background:transparent;border:1px solid var(--border);color:var(--text-dim);cursor:pointer">
        Reset
      </button>
    {/if}
    <span class="text-xs ml-auto" style="color:var(--text-dim)">{total} transaksi</span>
  </div>

  {#if error}
    <div class="rounded border px-3 py-2 text-sm" style="background:rgba(255,82,82,.1);border-color:var(--danger);color:var(--danger)">
      {error}
    </div>
  {/if}

  {#if loading}
    <p class="text-sm py-4" style="color:var(--text-dim)">Memuat...</p>
  {:else if rows.length === 0}
    <p class="text-sm py-4" style="color:var(--text-dim)">
      {summary?.total_transaksi === 0 ? `${namaPelanggan} belum pernah bertransaksi.` : 'Tidak ada transaksi di periode ini.'}
    </p>
  {:else}
    <div class="overflow-x-auto">
      <table class="min-w-full" style="border-collapse:collapse;font-size:.82rem">
        <thead>
          <tr style="background:var(--surface2)">
            <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">No. Transaksi</th>
            <th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)">Tanggal</th>
            <th class="px-2 py-2 text-left text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Metode</th>
            <th class="px-2 py-2 text-left text-xs font-semibold hidden sm:table-cell" style="color:var(--text-dim)">Tipe</th>
            <th class="px-3 py-2 text-right text-xs font-semibold" style="color:var(--text-dim)">Total</th>
            <th class="px-3 py-2 text-center text-xs font-semibold" style="color:var(--text-dim)">Detail</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as trx (trx.id)}
            <tr style="border-top:1px solid var(--border)">
              <td class="px-3 py-2" style="color:var(--text-dim);font-size:.75rem">{trx.no_transaksi}</td>
              <td class="px-3 py-2" style="color:var(--text)">
                <div>{tglFmt(trx.tanggal)}</div>
                <div class="text-xs" style="color:var(--text-dim)">{jamFmt(trx.tanggal)}</div>
              </td>
              <td class="px-2 py-2 hidden sm:table-cell" style="color:var(--text-dim)">
                {METODE_LABEL[trx.metode_bayar] ?? trx.metode_bayar}
              </td>
              <td class="px-2 py-2 hidden sm:table-cell">
                <span class="text-xs px-1.5 py-0.5 rounded"
                  style="background:{trx.tipe === 'grosir' ? 'rgba(99,102,241,.15)' : 'var(--surface2)'};color:{trx.tipe === 'grosir' ? '#818cf8' : 'var(--text-dim)'}">
                  {trx.tipe}
                </span>
              </td>
              <td class="px-3 py-2 text-right font-semibold" style="color:var(--text)">
                Rp {fmt(trx.total)}
                {#if trx.diskon_total > 0}
                  <div class="text-xs font-normal" style="color:var(--warn)">hemat Rp {fmt(trx.diskon_total)}</div>
                {/if}
              </td>
              <td class="px-3 py-2 text-center">
                <button onclick={() => toggleDetail(trx.id)}
                  class="text-xs px-2 py-1 rounded"
                  style="background:var(--surface2);border:1px solid var(--border);color:var(--text-dim);cursor:pointer">
                  {expandedId === trx.id ? '▲' : '▼'}
                </button>
              </td>
            </tr>

            {#if expandedId === trx.id}
              <tr style="border-top:1px solid var(--border);background:var(--surface)">
                <td colspan="6" class="px-3 py-2">
                  {#if detailLoading[trx.id]}
                    <p class="text-xs py-1" style="color:var(--text-dim)">Memuat item...</p>
                  {:else if detailMap[trx.id]}
                    <div class="overflow-x-auto">
                      <table class="min-w-full" style="border-collapse:collapse;font-size:.78rem">
                        <thead>
                          <tr>
                            <th class="pb-1 pr-4 text-left font-semibold" style="color:var(--text-dim)">Barang</th>
                            <th class="pb-1 pr-3 text-right font-semibold" style="color:var(--text-dim)">Qty</th>
                            <th class="pb-1 pr-3 text-right font-semibold" style="color:var(--text-dim)">Harga</th>
                            <th class="pb-1 text-right font-semibold" style="color:var(--text-dim)">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {#each detailMap[trx.id] as item (item.id)}
                            <tr>
                              <td class="py-0.5 pr-4" style="color:var(--text)">{item.nama_barang}</td>
                              <td class="py-0.5 pr-3 text-right" style="color:var(--text-dim)">{item.jumlah}</td>
                              <td class="py-0.5 pr-3 text-right" style="color:var(--text-dim)">Rp {fmt(item.harga_jual)}</td>
                              <td class="py-0.5 text-right font-medium" style="color:var(--text)">Rp {fmt(item.subtotal)}</td>
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  {/if}
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if total > limit}
      <div class="flex items-center gap-3 justify-between pt-1">
        <button onclick={halamanSebelum} disabled={offset === 0}
          class="text-xs px-3 py-1.5 rounded"
          style="background:var(--surface2);border:1px solid var(--border);color:{offset === 0 ? 'var(--text-dim)' : 'var(--text)'};cursor:{offset === 0 ? 'default' : 'pointer'};opacity:{offset === 0 ? '.5' : '1'}">
          ← Sebelum
        </button>
        <span class="text-xs" style="color:var(--text-dim)">
          {offset + 1}–{Math.min(offset + limit, total)} dari {total}
        </span>
        <button onclick={halamanBerikut} disabled={offset + limit >= total}
          class="text-xs px-3 py-1.5 rounded"
          style="background:var(--surface2);border:1px solid var(--border);color:{offset + limit >= total ? 'var(--text-dim)' : 'var(--text)'};cursor:{offset + limit >= total ? 'default' : 'pointer'};opacity:{offset + limit >= total ? '.5' : '1'}">
          Berikut →
        </button>
      </div>
    {/if}
  {/if}
</div>
