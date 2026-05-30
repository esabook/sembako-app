<script lang="ts">
  import ModalWindow from '$lib/components/ModalWindow.svelte'

  let {
    open = $bindable(false),
    oncariBara,
  }: {
    open?: boolean;
    oncariBara?: () => void;
  } = $props()

  let closeBtnEl: HTMLButtonElement | undefined = $state()

  $effect(() => {
    if (open) setTimeout(() => closeBtnEl?.focus(), 0)
  })

  // F1 / F3 ditangani di window level agar bisa intercept sebelum SlideOver/ModalWindow
  function onWindowKey(e: KeyboardEvent) {
    if (!open) return
    if (e.key === 'F1') { e.preventDefault(); e.stopPropagation(); open = false }
    else if (e.key === 'F3') { e.preventDefault(); e.stopPropagation(); open = false; oncariBara?.() }
  }

  const shortcuts: [string, string][] = [
    ['F1',        'Panduan ini'],
    ['ESC',       'Tutup / batal'],
    ['F3',        'Cari barang'],
    ['Tab',       'Fokus ke kanan'],
    ['F7',        'Riwayat transaksi'],
    ['Shift+Tab', 'Fokus ke kiri'],
    ['F8',        'Retur penjualan'],
    ['↑ ↓',       'Navigasi item'],
    ['F10',       'Proses bayar'],
    ['← →',       'Qty − / +'],
    ['F11',       'Buka / tutup shift'],
    ['ENTER',     'Pilih / konfirmasi'],
    ['F12',       'Reset keranjang'],
  ]
</script>

<svelte:window onkeydown={onWindowKey} />

<ModalWindow bind:open title="Shortcut Keyboard" maxWidth="md">
  {#snippet children()}
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
    {#each shortcuts as [key, label] (key)}
      <div class="flex items-center gap-3 py-0.5">
        <span
          class="w-24 shrink-0 rounded px-2 py-1 text-center font-mono text-xs"
          style="background:var(--surface2);color:var(--accent);border:1px solid var(--border)"
        >{key}</span>
        <span class="text-sm" style="color:var(--text-dim)">{label}</span>
      </div>
    {/each}
  </div>
  <p class="mt-4 text-center text-xs" style="color:var(--text-dim)">
    Tekan ESC atau F1 untuk tutup
  </p>
  {/snippet}
</ModalWindow>
