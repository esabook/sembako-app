<script lang="ts">
  let {
    open = $bindable(false),
    judul = 'Konfirmasi',
    pesan = '',
    labelKiri = 'Batal',
    labelKanan = 'OK',
    warnaKiri = undefined,
    warnaKanan = undefined,
    onkiri,
    onkanan,
  }: {
    open?: boolean
    judul?: string
    pesan?: string
    labelKiri?: string
    labelKanan?: string
    warnaKiri?: string  // warna teks tombol kiri  (default: #007AFF)
    warnaKanan?: string // warna teks tombol kanan (default: #007AFF)
    onkiri?: () => void
    onkanan?: () => void
  } = $props()

  let fokusKanan = $state(true)
  let btnKiri = $state<HTMLButtonElement | null>(null)
  let btnKanan = $state<HTMLButtonElement | null>(null)

  function tutup() { open = false }
  function klikKiri() { onkiri?.(); tutup() }
  function klikKanan() { onkanan?.(); tutup() }

  // onkeydown di panel — event bubbles dari tombol → panel → stopPropagation
  function handleKeydown(e: KeyboardEvent) {
    switch (e.key) {
      case 'Escape':
        e.stopPropagation()
        klikKiri()
        break
      case 'Enter':
        e.preventDefault()
        e.stopPropagation()
        if (fokusKanan) klikKanan()
        else klikKiri()
        break
      case 'ArrowLeft':
        e.preventDefault()
        e.stopPropagation()
        fokusKanan = false
        break
      case 'ArrowRight':
        e.preventDefault()
        e.stopPropagation()
        fokusKanan = true
        break
    }
  }

  let prevOpen = false
  $effect(() => {
    if (open && !prevOpen) fokusKanan = true
    prevOpen = open
  })

  $effect(() => {
    if (!open) return
    const btn = fokusKanan ? btnKanan : btnKiri
    const t = setTimeout(() => btn?.focus(), 0)
    return () => clearTimeout(t)
  })
</script>

{#if open}
  <!-- Backdrop -->
  <div
    class="backdrop"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={tutup}
    onkeydown={(e) => { if (e.key === 'Escape') klikKiri() }}
  >
    <!-- Panel iOS -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="panel"
      onclick={(e) => e.stopPropagation()}
      onkeydown={handleKeydown}
    >
      <!-- Teks -->
      <div class="ios-body">
        <h3 class="ios-title text-sm font-semibold">{judul}</h3>
        {#if pesan}<p class="ios-msg text-xs">{pesan}</p>{/if}
      </div>

      <!-- Tombol — hairline top + vertical divider tengah -->
      <div class="ios-actions">
        <button
          bind:this={btnKiri}
          onclick={klikKiri}
          class="ios-btn text-sm py-3"
          class:ios-focused={!fokusKanan}
          style="color:{warnaKiri ?? '#007AFF'}"
        >{labelKiri}</button>
        <div class="ios-vline"></div>
        <button
          bind:this={btnKanan}
          onclick={klikKanan}
          class="ios-btn text-sm py-3"
          class:ios-focused={fokusKanan}
          style="color:{warnaKanan ?? '#007AFF'}"
        >{labelKanan}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(3px);
  }

  .panel {
    /* 16px margin tiap sisi di HP */
    width: calc(100% - 32px);
    max-width: 360px;
    border-radius: 14px;
    overflow: hidden;
    background: var(--surface);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.35);
    animation: ios-pop 0.22s cubic-bezier(0.36, 0.66, 0.04, 1) both;
  }

  .ios-body {
    padding: 20px 16px 16px;
    text-align: center;
  }

  .ios-title {
    line-height: 1.3;
    color: var(--text);
  }

  .ios-msg {
    margin-top: 6px;
    line-height: 1.45;
    color: var(--text-dim);
    white-space: pre-wrap;
  }

  .ios-actions {
    display: flex;
    border-top: 1px solid var(--border);
  }

  .ios-vline {
    width: 1px;
    flex-shrink: 0;
    background: var(--border);
  }

  .ios-btn {
    flex: 1;
    background: transparent;
    border: none;
    cursor: pointer;
    outline: none;
    transition: background 0.1s;
  }

  /* fokus keyboard — tint halus */
  .ios-btn.ios-focused {
    background: var(--surface2);
  }

  .ios-btn:active {
    background: var(--surface2);
    opacity: 0.8;
  }

  @keyframes ios-pop {
    from {
      opacity: 0;
      transform: scale(0.88);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
