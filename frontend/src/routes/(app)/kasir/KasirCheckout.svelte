<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/state'
  import ModalWindow from '$lib/components/ModalWindow.svelte'
  import StrukPreview from '$lib/components/ui/StrukPreview.svelte'
  import { api } from '$lib/utils/api.js'
  import { renderStrukHtml, cetakStrukPopup, type StrukData } from '$lib/utils/struk'
  import { rupiah, METODE, METODE_LABEL } from './kasir.logic'
  import {
    keranjang, tipeTransaksi, metodeBayar, nominalBayar, kembalian,
    pelangganDipilih, subtotal, total, kasirMode,
  } from '$lib/stores/kasir'
  import {
    snap, popupCheckout, tutupCheckout,
    prosesLoading, prosesBayar,
    pelangganList, pelangganSelectedIdx, pelangganQuery,
    muatPelanggan, pilihPelanggan,
    promoTotalBerlaku, diskonPromoTotal,
    kasBankDipilih,
    noTransaksi, checkoutTime,
    kirimStrukWA, kirimNotifHutangWA,
  } from './kasir.store'

  let {
    namaToko  = 'Stokasir',
    alamatToko = '',
    strHeader  = '',
    strFooter  = 'Terima kasih sudah berbelanja!',
    strUkuran  = '80',
  }: {
    namaToko?: string
    alamatToko?: string
    strHeader?: string
    strFooter?: string
    strUkuran?: string
  } = $props()

  // ── State lokal ────────────────────────────────────────────────────────────
  let pelangganExpanded = $state(false)
  let bayarInputEl = $state<HTMLInputElement | undefined>()
  let pelangganTimer: ReturnType<typeof setTimeout>

  let daftarKasBank = $state<{ id: number; nama: string; tipe: string }[]>([])

  // ── Derived struk ─────────────────────────────────────────────────────────
  const strukItems    = $derived($snap?.items    ?? $keranjang)
  const strukSubtotal = $derived($snap?.subtotal ?? $subtotal)
  const strukTotal    = $derived($snap?.total    ?? $total)
  const strukMetode   = $derived($snap?.metode   ?? $metodeBayar)
  const strukNominal  = $derived($snap ? $snap.nominal   : $nominalBayar)
  const strukKembali  = $derived($snap ? $snap.kembalian : $kembalian)
  const strukPelanggan = $derived($snap?.pelanggan ?? $pelangganDipilih)

  const liveStrukData: StrukData = $derived.by(() => {
    const diskonItem = strukItems.reduce((s: number, i) => s + i.diskon_item, 0)
    return {
      ukuran:        strUkuran as '58' | '80',
      namaToko,
      alamat:        alamatToko,
      header:        strHeader,
      footer:        strFooter,
      noTransaksi:   $noTransaksi,
      waktu:         $checkoutTime,
      kasirNama:     page.data.user?.nama ?? '',
      kasirKode:     page.data.user?.kode_karyawan ?? null,
      pelangganNama: strukPelanggan?.nama ?? null,
      items: strukItems.map((i: { nama_barang?: string | null; jumlah: number; singkatan_satuan?: string | null; harga_jual: number; diskon_item: number }) => ({
        nama:        i.nama_barang ?? '-',
        qty:         i.jumlah,
        satuan:      i.singkatan_satuan ?? null,
        harga:       i.harga_jual,
        diskon_item: i.diskon_item,
      })),
      subtotalKotor: strukSubtotal,
      diskonItem,
      diskonLain:    Math.max(0, strukSubtotal - diskonItem - strukTotal),
      ppn:           0,
      total:         strukTotal,
      metode:        strukMetode,
      nominal:       strukNominal,
      kembali:       strukKembali,
    }
  })

  // ── Effects ────────────────────────────────────────────────────────────────
  $effect(() => {
    if ($popupCheckout) setTimeout(() => bayarInputEl?.focus(), 50)
  })

  $effect(() => {
    if ($pelangganDipilih) pelangganExpanded = true
    else if ($keranjang.length === 0) pelangganExpanded = false
  })

  // ── Functions ──────────────────────────────────────────────────────────────
  function handlePelangganInput(q: string) {
    clearTimeout(pelangganTimer)
    pelangganTimer = setTimeout(() => muatPelanggan(q), 200)
  }

  function onPelangganKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      pelangganSelectedIdx.update((i) => Math.min(i + 1, $pelangganList.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      pelangganSelectedIdx.update((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && $pelangganSelectedIdx >= 0) {
      e.preventDefault()
      const p = $pelangganList[$pelangganSelectedIdx]
      if (p) pilihPelanggan(p)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      pelangganList.set([])
    }
  }

  function cetakStruk() {
    cetakStrukPopup(
      renderStrukHtml(liveStrukData),
      () => alert('Popup diblokir browser — izinkan popup untuk halaman ini')
    )
  }

  onMount(() => {
    void api.get<{ id: number; nama: string; tipe: string }[]>('/keuangan/kas-bank').then((res) => {
      if (res.success) daftarKasBank = res.data
    })
  })
</script>

<ModalWindow
  open={$popupCheckout}
  ontutup={tutupCheckout}
  maxWidth="3xl"
  noPadding={true}
>
  <div class="flex w-full flex-col overflow-y-auto sm:flex-row sm:overflow-hidden" style="max-height:calc(90svh - 4rem)">

    <!-- ── Kolom 1: Input / Sukses ── -->
    <div class="flex min-w-0 flex-1 flex-col gap-4 p-6 sm:overflow-y-auto">
      {#if $snap}
        <!-- sukses state -->
        <div class="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
          <div class="text-5xl" style="color:var(--accent)">✓</div>
          <p class="text-lg font-bold">Transaksi Berhasil</p>
          <p class="font-mono text-sm" style="color:var(--text-dim)">{$snap.noTransaksi}</p>
          <button
            onclick={tutupCheckout}
            class="mt-4 rounded px-6 py-2 text-sm font-bold transition-all active:scale-95"
            style="background:var(--accent);color:var(--bg)"
          >
            Transaksi Baru (ESC)
          </button>
        </div>
      {:else}
        <!-- tipe + judul -->
        <div class="flex flex-wrap items-center justify-between gap-y-1">
          <h2 class="text-base font-bold">Proses Pembayaran</h2>
          <div class="flex gap-1">
            {#each ['eceran', 'grosir'] as const as t (t)}
              <button
                onclick={() => tipeTransaksi.set(t)}
                class="rounded border px-2 py-0.5 text-xs font-bold transition-all"
                style={$tipeTransaksi === t
                  ? 'background:var(--accent);color:var(--bg);border-color:var(--accent)'
                  : 'border-color:var(--border);color:var(--text-dim)'}>{t.toUpperCase()}</button
              >
            {/each}
          </div>
        </div>

        <!-- pelanggan -->
        <div class="flex flex-col gap-1.5">
          <button
            onclick={() => { pelangganExpanded = !pelangganExpanded }}
            class="flex items-center justify-between text-xs"
            style="color:var(--text-dim)"
          >
            <span>
              PELANGGAN <span style="opacity:0.5">(opsional)</span>
              {#if $pelangganDipilih}
                <span class="ml-1.5 font-semibold" style="color:var(--accent)"
                  >— {$pelangganDipilih.nama}</span
                >
              {/if}
            </span>
            <span style="opacity:0.6">{pelangganExpanded ? '▲' : '▼'}</span>
          </button>

          {#if pelangganExpanded}
            {#if $pelangganDipilih}
              <div
                class="flex items-center justify-between rounded border px-3 py-2"
                style="background:var(--surface2);border-color:var(--border)"
              >
                <span class="text-sm">
                  {$pelangganDipilih.nama}
                  {#if $pelangganDipilih.gender === 'pria'}<span class="ml-1" style="color:#40c4ff">♂</span>
                  {:else if $pelangganDipilih.gender === 'wanita'}<span class="ml-1" style="color:#ff80ab">♀</span>{/if}
                  {#if $pelangganDipilih.diskon_member && $pelangganDipilih.diskon_member > 0}
                    <span class="ml-2 text-xs" style="color:var(--accent)">−{$pelangganDipilih.diskon_member}%</span>
                  {/if}
                </span>
                <button
                  onclick={() => { pelangganDipilih.set(null); pelangganExpanded = false }}
                  class="ml-2 text-xs"
                  style="color:var(--danger)">✕</button
                >
              </div>
            {:else}
              <div class="relative">
                <input
                  type="text"
                  placeholder="Cari nama/kartu pelanggan (min. 3 karakter)"
                  value={$pelangganQuery}
                  oninput={(e) => handlePelangganInput((e.target as HTMLInputElement).value)}
                  onkeydown={onPelangganKeydown}
                  class="w-full rounded border px-3 py-2 text-sm outline-none"
                  style="background:var(--surface2);border-color:var(--border);color:var(--text)"
                />
                {#if $pelangganList.length > 0}
                  <div
                    class="absolute top-full right-0 left-0 z-10 mt-1 max-h-40 overflow-y-auto rounded border shadow-lg"
                    style="background:var(--surface);border-color:var(--border)"
                  >
                    {#each $pelangganList as p, i (p.id)}
                      <button
                        onclick={() => pilihPelanggan(p)}
                        class="w-full border-t px-3 py-2 text-left text-sm"
                        style="border-color:var(--border);background:{$pelangganSelectedIdx === i
                          ? 'var(--surface2)'
                          : 'transparent'}"
                      >
                        {p.nama}
                        {#if p.gender === 'pria'}<span class="ml-1" style="color:#40c4ff">♂</span>
                        {:else if p.gender === 'wanita'}<span class="ml-1" style="color:#ff80ab">♀</span>{/if}
                        {#if p.no_kartu}<span class="ml-2 font-mono text-xs" style="color:var(--accent)">{p.no_kartu}</span>{/if}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}
          {/if}
        </div>

        <!-- metode bayar -->
        <div class="flex flex-col gap-1.5">
          <p class="text-xs" style="color:var(--text-dim)">METODE BAYAR</p>
          <div class="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {#each METODE as m (m)}
              <button
                onclick={() => metodeBayar.set(m)}
                class="rounded border py-2 text-sm font-bold transition-all"
                style={$metodeBayar === m
                  ? 'background:var(--accent);color:var(--bg);border-color:var(--accent)'
                  : 'border-color:var(--border);color:var(--text-dim)'}>{METODE_LABEL[m]}</button
              >
            {/each}
          </div>
        </div>

        <!-- akun kas/bank (hanya untuk transfer/QRIS) -->
        {#if $metodeBayar === 'transfer' || $metodeBayar === 'qris'}
          <div class="flex flex-col gap-1.5">
            <p class="text-xs" style="color:var(--text-dim)">
              AKUN TUJUAN
              <span style="opacity:0.5;font-weight:normal"> — rekening yang menerima</span>
            </p>
            <div class="flex flex-wrap gap-1.5">
              {#each daftarKasBank as kb (kb.id)}
                <button
                  onclick={() => kasBankDipilih.set(kb.id)}
                  class="rounded border px-3 py-1.5 text-xs font-bold transition-all"
                  style={$kasBankDipilih === kb.id
                    ? 'background:var(--info);color:var(--bg);border-color:var(--info)'
                    : 'border-color:var(--border);color:var(--text-dim)'}>{kb.nama}</button
                >
              {/each}
              {#if daftarKasBank.length === 0}
                <a
                  href="/keuangan?tab=kasbank"
                  class="rounded border px-3 py-1.5 text-xs transition-all"
                  style="border-color:var(--warn);color:var(--warn)"
                >
                  + Tambah akun di Keuangan → tab Kas/Bank
                </a>
              {/if}
            </div>
          </div>
        {/if}

        <!-- nominal bayar -->
        {#if $metodeBayar !== 'hutang'}
          <div class="flex flex-col gap-1.5">
            <label for="nominal-checkout" class="text-xs" style="color:var(--text-dim)">NOMINAL BAYAR</label>
            <input
              id="nominal-checkout"
              bind:this={bayarInputEl}
              type="number"
              step="500"
              min="0"
              max="999999999"
              inputmode="numeric"
              value={$nominalBayar || ''}
              oninput={(e) => {
                const el = e.target as HTMLInputElement
                const angka = Math.min(999_999_999, Math.max(0, Number(el.value) || 0))
                nominalBayar.set(angka)
                if (angka !== Number(el.value)) el.value = String(angka)
              }}
              placeholder="0"
              class="w-full rounded border px-3 py-3 text-right font-mono text-xl font-bold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              style="background:var(--surface2);border-color:var(--border);color:var(--text)"
            />
            <div class="flex justify-between px-1 text-sm">
              <span style="color:var(--text-dim)">Kembalian</span>
              <span class="font-mono font-bold" style="color:var(--accent)">Rp {rupiah($kembalian)}</span>
            </div>
          </div>
        {/if}

        <!-- Promo total berlaku -->
        {#if $promoTotalBerlaku.length > 0}
          <div class="flex flex-col gap-1">
            {#each $promoTotalBerlaku as p (p.id)}
              <div
                class="flex items-center gap-2 rounded px-2 py-1.5 text-xs"
                style="background:var(--surface2);border:1px solid var(--accent);color:var(--accent)"
              >
                <span>🎁</span>
                <span class="font-bold">{p.nama}</span>
                <span style="color:var(--text-dim)">—</span>
                <span>Hemat Rp {rupiah($diskonPromoTotal)}</span>
              </div>
            {/each}
          </div>
        {/if}

        <!-- actions -->
        <div class="mt-auto flex flex-col gap-2 pt-2 sm:flex-row">
          <button
            onclick={tutupCheckout}
            class="w-full rounded border py-2 text-sm transition-all sm:flex-1"
            style="border-color:var(--border);color:var(--text-dim)"
          >
            Batal (ESC)
          </button>
          <button
            onclick={() => void prosesBayar()}
            disabled={$prosesLoading}
            class="w-full rounded py-2.5 text-sm font-bold transition-all active:scale-95 disabled:opacity-40 sm:flex-1"
            style="background:var(--accent);color:var(--bg)"
          >
            {$prosesLoading ? 'MEMPROSES...' : 'SELESAI ✓'}
          </button>
        </div>

        <!-- GUIDED: step hint -->
        {#if $kasirMode === 'guided'}
          <div class="flex gap-1 text-xs" style="color:var(--text-dim)">
            <span class="rounded px-1.5" style="background:var(--surface2)">① Pilih metode</span>
            <span>→</span>
            <span class="rounded px-1.5" style="background:var(--surface2)">② Input nominal</span>
            <span>→</span>
            <span class="rounded px-1.5" style="background:var(--surface2)">③ Klik SELESAI</span>
          </div>
        {/if}
      {/if}
    </div>

    <!-- ── Kolom 2: Preview Struk ── -->
    <div
      class="flex w-full shrink-0 flex-col border-t sm:w-64 sm:border-t-0 sm:border-l"
      style="border-color:var(--border);background:var(--surface2)"
    >
      <div class="flex flex-1 justify-center overflow-auto p-2">
        <StrukPreview data={liveStrukData} />
      </div>

      <!-- cetak / wa -->
      <div class="flex shrink-0 flex-col gap-2 border-t p-3" style="border-color:var(--border)">
        <button
          onclick={cetakStruk}
          class="w-full rounded border py-2 text-xs font-medium transition-all hover:opacity-80"
          style="border-color:var(--border);color:var(--text-dim)"
        >
          Cetak Struk
        </button>
        <button
          disabled={!$snap}
          onclick={() => $snap && kirimStrukWA($snap)}
          class="w-full rounded border py-2 text-xs font-medium transition-all hover:opacity-80 disabled:opacity-30"
          style="border-color:var(--border);color:var(--text-dim)"
        >
          Kirim Struk WA
        </button>
        {#if strukMetode === 'hutang'}
          <button
            disabled={!$snap}
            onclick={() => $snap && kirimNotifHutangWA($snap)}
            class="w-full rounded border py-2 text-xs font-medium transition-all hover:opacity-80 disabled:opacity-30"
            style="border-color:var(--warn);color:var(--warn)"
          >
            Notif Hutang WA
          </button>
        {/if}
      </div>
    </div>

  </div>
</ModalWindow>
