<script lang="ts">
  import ModalWindow from '$lib/components/ModalWindow.svelte'

  let {
    open = $bindable(false),
    oncariBara,
  }: {
    open?: boolean;
    oncariBara?: () => void;
  } = $props()


  const shortcuts: [string, string][] = [
    ['F1',           'Panduan ini'],
    ['Ctrl+Alt+E',   'Tipe → Eceran'],
    ['Ctrl+Alt+G',   'Tipe → Grosir'],
    ['F3',           'Cari barang'],
    ['F7',        'Riwayat transaksi'],
    ['F8',        'Retur penjualan'],
    ['F10',       'Proses bayar'],
    ['F11',       'Buka / tutup shift'],
    ['F12',       'Reset keranjang'],
    ['ESC',       'Tutup / batal'],
    ['Tab',       'Fokus ke kanan'],
    ['Shift+Tab', 'Fokus ke kiri'],
    ['↑ ↓',       'Navigasi item'],
    ['← →',       'Qty − / +'],
    ['ENTER',     'Pilih / konfirmasi'],
  ]

  const half = Math.ceil(shortcuts.length / 2)
  const col1 = shortcuts.slice(0, half)
  const col2 = shortcuts.slice(half)
</script>

<ModalWindow bind:open title="Shortcut Keyboard" maxWidth="xl">
  {#snippet children()}
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6">
    {#each [col1, col2] as col, i}
      <div class="flex flex-col">
        {#each col as [key, label] (key)}
          <div class="flex items-center justify-between gap-3 py-2" style="border-bottom:1px solid var(--border)">
            <span class="text-sm" style="color:var(--text-dim)">{label}</span>
            <span
              class="shrink-0 rounded px-2 py-1 text-center font-mono text-xs"
              style="background:var(--surface2);color:var(--accent);"
            >{key}</span>
          </div>
        {/each}
      </div>
    {/each}
  </div>
  <p class="mt-4 text-center text-xs" style="color:var(--text-dim)">
    Tekan ESC atau F1 untuk tutup
  </p>
  {/snippet}
</ModalWindow>
