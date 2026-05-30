<script lang="ts">
  import ModalWindow from '$lib/components/ModalWindow.svelte'
  import { toast } from '$lib/stores/ui.store'
  import { renderStrukHtml, cetakStrukPopup, type StrukData } from '$lib/utils/struk'
  import { rupiah } from './kasir.logic'
  import {
    fetchHistoriPenjualan, fetchDetailPenjualan,
    type HistoriPenjualan, type HistoriDetail,
  } from './kasir.api'

  let {
    open = $bindable(false),
    namaToko   = 'Stokasir',
    alamatToko = '',
    strHeader  = '',
    strFooter  = 'Terima kasih sudah berbelanja!',
    strUkuran  = '80',
  }: {
    open?: boolean
    namaToko?: string
    alamatToko?: string
    strHeader?: string
    strFooter?: string
    strUkuran?: string
  } = $props()

  function todayStr() { return new Date().toLocaleDateString('sv-SE') }

  let historiDari    = $state(todayStr())
  let historiSampai  = $state(todayStr())
  let historiList    = $state<HistoriPenjualan[]>([])
  let historiDetail  = $state<HistoriDetail | null>(null)
  let historiLoading = $state(false)

  $effect(() => {
    if (open) {
      historiDari   = todayStr()
      historiSampai = todayStr()
      historiDetail = null
      void muatHistori()
    }
  })

  async function muatHistori() {
    historiLoading = true
    historiDetail  = null
    try {
      historiList = await fetchHistoriPenjualan(historiDari, historiSampai)
    } catch {
      toast.error('Gagal memuat riwayat transaksi')
    } finally {
      historiLoading = false
    }
  }

  async function pilihHistori(id: number) {
    try {
      historiDetail = await fetchDetailPenjualan(id)
    } catch {
      toast.error('Gagal memuat detail transaksi')
    }
  }

  function cetakStrukHistori(d: HistoriDetail) {
    const subtotalKotor = d.items.reduce((s, i) => s + i.jumlah * i.harga_jual, 0)
    const diskonItem    = d.items.reduce((s, i) => s + i.diskon_item, 0)
    const data: StrukData = {
      ukuran:        strUkuran as '58' | '80',
      namaToko,
      alamat:        alamatToko,
      header:        strHeader,
      footer:        strFooter,
      noTransaksi:   d.no_transaksi,
      waktu:         new Date(d.tanggal),
      kasirNama:     d.kasir_nama ?? '',
      kasirKode:     d.kode_karyawan ?? null,
      pelangganNama: d.nama_pelanggan,
      items: d.items.map((i) => ({
        nama:        i.nama_barang ?? '-',
        qty:         i.jumlah,
        satuan:      null,
        harga:       i.harga_jual,
        diskon_item: i.diskon_item,
      })),
      subtotalKotor,
      diskonItem,
      diskonLain: d.diskon_total,
      ppn:        0,
      total:      d.total,
      metode:     d.metode_bayar,
      nominal:    d.bayar,
      kembali:    d.kembalian,
    }
    cetakStrukPopup(renderStrukHtml(data), () =>
      toast.error('Popup diblokir browser — izinkan popup untuk halaman ini')
    )
  }
</script>

<ModalWindow bind:open title="Riwayat Transaksi" maxWidth="4xl" noPadding={true}>
  <div class="flex h-full flex-col">

    <!-- Filter -->
    <div class="flex shrink-0 flex-wrap items-center gap-3 border-b px-5 py-3" style="border-color:var(--border)">
      <div class="flex items-center gap-2 text-sm">
        <label for="histori-dari" style="color:var(--text-dim)">Dari</label>
        <input
          id="histori-dari"
          type="date"
          bind:value={historiDari}
          class="rounded border px-2 py-1 text-sm outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)"
        />
      </div>
      <div class="flex items-center gap-2 text-sm">
        <label for="histori-sampai" style="color:var(--text-dim)">Sampai</label>
        <input
          id="histori-sampai"
          type="date"
          bind:value={historiSampai}
          class="rounded border px-2 py-1 text-sm outline-none"
          style="background:var(--surface2);border-color:var(--border);color:var(--text)"
        />
      </div>
      <button
        onclick={muatHistori}
        disabled={historiLoading}
        class="rounded px-3 py-1 text-sm font-bold disabled:opacity-60"
        style="background:var(--accent);color:var(--bg)"
      >
        {historiLoading ? 'Memuat...' : 'Cari'}
      </button>
      {#if historiList.length > 0}
        <span class="text-xs" style="color:var(--text-dim)">{historiList.length} transaksi</span>
      {/if}
    </div>

    <!-- Content: list + detail -->
    <div class="flex min-h-0 flex-1 overflow-hidden">

      <!-- List transaksi -->
      <div
        class="flex w-full min-w-0 flex-col overflow-y-auto {historiDetail ? 'hidden sm:flex sm:w-2/5 sm:border-r' : ''}"
        style="border-color:var(--border)"
      >
        {#if historiLoading}
          <div class="flex flex-1 items-center justify-center py-10 text-sm" style="color:var(--text-dim)">Memuat...</div>
        {:else if historiList.length === 0}
          <div class="flex flex-1 items-center justify-center py-10 text-sm" style="color:var(--text-dim)">Tidak ada transaksi</div>
        {:else}
          <table class="w-full text-sm">
            <thead class="sticky top-0" style="background:var(--surface2)">
              <tr style="color:var(--text-dim)">
                <th class="px-3 py-2 text-left font-medium">No. Transaksi</th>
                <th class="px-3 py-2 text-left font-medium">Waktu</th>
                <th class="hidden px-3 py-2 text-left font-medium sm:table-cell">Metode</th>
                <th class="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {#each historiList as trx (trx.id)}
                <tr
                  class="cursor-pointer border-t transition-colors hover:brightness-110"
                  style={historiDetail?.id === trx.id
                    ? 'background:color-mix(in srgb,var(--accent) 15%,var(--surface));border-color:var(--border)'
                    : `border-color:var(--border);${trx.status === 'void' ? 'opacity:0.5' : ''}`}
                  onclick={() => pilihHistori(trx.id)}
                >
                  <td class="px-3 py-2 font-mono text-xs">{trx.no_transaksi}</td>
                  <td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{trx.tanggal.slice(11, 16)}</td>
                  <td class="hidden px-3 py-2 text-xs sm:table-cell" style="color:var(--text-dim)">
                    {trx.metode_bayar}
                    {#if trx.status === 'void'}<span style="color:var(--danger)"> [VOID]</span>{/if}
                  </td>
                  <td class="px-3 py-2 text-right font-mono font-bold">{rupiah(trx.total)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>

      <!-- Detail transaksi -->
      {#if historiDetail}
        <div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4">
          <div class="mb-3 flex items-center justify-between">
            <div>
              <div class="font-bold">{historiDetail.no_transaksi}</div>
              <div class="text-xs" style="color:var(--text-dim)">
                {historiDetail.tanggal.slice(0, 16).replace('T', ' ')}
                {#if historiDetail.nama_pelanggan} · {historiDetail.nama_pelanggan}{/if}
              </div>
            </div>
            <div class="flex items-center gap-2">
              {#if historiDetail.status === 'void'}
                <span class="rounded px-2 py-0.5 text-xs font-bold" style="background:var(--danger);color:#fff">VOID</span>
              {/if}
              <button
                onclick={() => cetakStrukHistori(historiDetail!)}
                class="rounded border px-3 py-1 text-xs font-bold transition-all active:scale-95"
                style="border-color:var(--accent);color:var(--accent)"
              >
                Cetak Ulang Struk
              </button>
              <button
                onclick={() => { historiDetail = null }}
                class="rounded border px-2 py-1 text-xs sm:hidden"
                style="border-color:var(--border);color:var(--text-dim)"
              >← Kembali</button>
            </div>
          </div>

          <!-- Items -->
          <table class="w-full text-sm">
            <thead style="background:var(--surface2)">
              <tr style="color:var(--text-dim)">
                <th class="px-3 py-1.5 text-left font-medium">Barang</th>
                <th class="px-3 py-1.5 text-right font-medium">Harga</th>
                <th class="px-3 py-1.5 text-center font-medium">Jml</th>
                <th class="px-3 py-1.5 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {#each historiDetail.items as item (item.id)}
                <tr class="border-t" style="border-color:var(--border)">
                  <td class="px-3 py-1.5">
                    <div>{item.nama_barang ?? '-'}</div>
                    {#if item.diskon_item > 0}
                      <div class="text-xs" style="color:var(--warn)">diskon −{rupiah(item.diskon_item)}</div>
                    {/if}
                  </td>
                  <td class="px-3 py-1.5 text-right font-mono text-xs">{rupiah(item.harga_jual)}</td>
                  <td class="px-3 py-1.5 text-center">{item.jumlah}</td>
                  <td class="px-3 py-1.5 text-right font-mono">{rupiah(item.subtotal)}</td>
                </tr>
              {/each}
            </tbody>
          </table>

          <!-- Ringkasan -->
          <div class="mt-4 space-y-1 border-t pt-3 text-sm" style="border-color:var(--border)">
            {#if historiDetail.diskon_total > 0}
              <div class="flex justify-between">
                <span style="color:var(--text-dim)">Diskon</span>
                <span class="font-mono">−{rupiah(historiDetail.diskon_total)}</span>
              </div>
            {/if}
            <div class="flex justify-between font-bold">
              <span>Total</span>
              <span class="font-mono" style="color:var(--accent)">{rupiah(historiDetail.total)}</span>
            </div>
            <div class="flex justify-between text-xs" style="color:var(--text-dim)">
              <span>{historiDetail.metode_bayar}</span>
              <span class="font-mono">{rupiah(historiDetail.bayar)}</span>
            </div>
            {#if historiDetail.kembalian > 0}
              <div class="flex justify-between text-xs" style="color:var(--text-dim)">
                <span>Kembali</span>
                <span class="font-mono">{rupiah(historiDetail.kembalian)}</span>
              </div>
            {/if}
          </div>
        </div>
      {:else if !historiLoading && historiList.length > 0}
        <div class="hidden flex-1 items-center justify-center text-sm sm:flex" style="color:var(--text-dim)">
          Pilih transaksi untuk melihat detail
        </div>
      {/if}

    </div>
  </div>
</ModalWindow>
