<script lang="ts">
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

{#if open}
  <!-- svelte-ignore a11y_interactive_supports_focus a11y_click_events_have_key_events -->
  <div
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    style="background:rgba(0,0,0,0.6)"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={() => open = false}
    onkeydown={(e) => {
      if (e.key === 'Escape' || e.key === 'F1') {
        e.preventDefault(); e.stopPropagation(); open = false
      } else if (e.key === 'F3') {
        e.preventDefault(); e.stopPropagation(); open = false; oncariBara?.()
      } else if (e.key === 'Tab') {
        e.preventDefault()
      }
    }}
  >
    <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
    <div
      class="w-full sm:max-w-xl rounded-t-2xl sm:rounded-xl border overflow-hidden flex flex-col"
      style="background:var(--surface);border-color:var(--border);max-height:90svh"
      onclick={(e) => e.stopPropagation()}
      onkeydown={() => {}}
    >
      <!-- drag handle (mobile) -->
      <div class="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
        <div class="w-10 h-1 rounded-full" style="background:var(--border)"></div>
      </div>

      <div class="overflow-y-auto flex-1 px-4 sm:px-6 py-4">
        <div class="mb-4 flex items-center justify-between">
          <span class="font-bold text-sm">Shortcut Keyboard</span>
          <button
            bind:this={closeBtnEl}
            onclick={() => open = false}
            class="px-1 text-xl leading-none"
            style="color:var(--text-dim)">&times;</button>
        </div>

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
      </div>
    </div>
  </div>
{/if}
