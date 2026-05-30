<!--
  SlideOver — panel geser kanan (desktop) / sheet bawah (mobile)

  Props:
    open   $bindable(false)  — buka/tutup panel
    title  string ''         — teks header
    children Snippet         — konten body (wajib)

  Penggunaan:
    <SlideOver bind:open={buka} title="Detail">
      <p>Konten</p>
    </SlideOver>

  Perilaku:
    - Desktop (≥640px): geser dari kanan, drag tepi kiri untuk resize (min 260px, max 85vw)
    - Mobile (<640px) : sheet dari bawah, drag handle atas untuk resize (32–93vh) atau dismiss
    - Ukuran persisten: localStorage keys `so_width` & `so_height_vh`
    - Tutup: klik backdrop | Escape | drag mobile ke bawah ≥80px

  Notes:
    - Body sudah overflow-y-auto — konten panjang langsung scroll
    - Tidak ada footer bawaan; taruh tombol aksi di dalam children
-->
<script lang="ts">
  import { onMount, tick } from 'svelte'
  import type { Snippet } from 'svelte'

  let {
    open = $bindable(false),
    title = '',
    children,
  }: {
    open?: boolean;
    title?: string;
    children: Snippet;
  } = $props()

  // ── Persisted sizes ───────────────────────────────────────────────────────
  const KEY_W  = 'so_width'
  const KEY_H  = 'so_height_vh'
  const MIN_W  = 260
  const MIN_H  = 32   // vh
  const MAX_H  = 93   // vh

  let panelWidth   = $state(384)
  let panelHeightVh = $state(88)
  let isDesktop    = $state(false)

  onMount(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    isDesktop = mq.matches
    const onMq = (e: MediaQueryListEvent) => { isDesktop = e.matches }
    mq.addEventListener('change', onMq)

    const savedW = parseInt(localStorage.getItem(KEY_W) ?? '', 10)
    if (savedW >= MIN_W) panelWidth = savedW

    const savedH = parseFloat(localStorage.getItem(KEY_H) ?? '')
    if (savedH >= MIN_H && savedH <= MAX_H) panelHeightVh = savedH

    return () => mq.removeEventListener('change', onMq)
  })

  // ── Close ─────────────────────────────────────────────────────────────────
  function tutup() { open = false }
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      e.stopImmediatePropagation()
      tutup()
    }
  }

  // ── Desktop: drag left edge → resize width ────────────────────────────────
  let wDragging = $state(false)
  let wStart = { x: 0, w: 0 }

  function startWidthDrag(e: MouseEvent) {
    wDragging = true
    wStart = { x: e.clientX, w: panelWidth }
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    e.preventDefault()
  }

  function onMouseMove(e: MouseEvent) {
    if (!wDragging) return
    panelWidth = Math.min(
      Math.max(wStart.w + (wStart.x - e.clientX), MIN_W),
      window.innerWidth * 0.85,
    )
  }

  function onMouseUp() {
    if (!wDragging) return
    wDragging = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    localStorage.setItem(KEY_W, String(Math.round(panelWidth)))
  }

  // ── Mobile: drag top handle → resize height / dismiss ─────────────────────
  let hDragging = $state(false)
  let dismissOffset = $state(0)
  let hStart = { y: 0, h: 0 }

  function startHeightDrag(e: TouchEvent) {
    hDragging = true
    dismissOffset = 0
    hStart = { y: e.touches[0].clientY, h: panelHeightVh }
    e.preventDefault()
  }

  function onTouchMove(e: TouchEvent) {
    if (!hDragging) return
    const dy   = e.touches[0].clientY - hStart.y       // positive = finger down
    const dvh  = (dy / window.innerHeight) * 100
    const newH = hStart.h - dvh                         // drag up = taller

    if (newH < MIN_H) {
      dismissOffset = Math.max(0, ((MIN_H - newH) / 100) * window.innerHeight)
    } else {
      dismissOffset  = 0
      panelHeightVh  = Math.min(MAX_H, newH)
    }
  }

  async function onTouchEnd() {
    if (!hDragging) return
    const shouldDismiss = dismissOffset > 80
    hDragging = false          // re-enable CSS transition
    await tick()               // wait for transition to apply in DOM

    if (shouldDismiss) {
      dismissOffset = window.innerHeight    // animate off-screen
      setTimeout(() => { open = false; dismissOffset = 0 }, 300)
    } else {
      dismissOffset = 0                     // snap back
      localStorage.setItem(KEY_H, String(Math.round(panelHeightVh)))
    }
  }

  // ── Derived: transform & transition ───────────────────────────────────────
  const panelTransform = $derived(
    !open
      ? (isDesktop ? 'translateX(100%)' : 'translateY(100%)')
      : dismissOffset > 0
        ? `translateY(${dismissOffset}px)`
        : (isDesktop ? 'translateX(0)' : 'translateY(0)')
  )

  const isDragging = $derived(hDragging || wDragging)
</script>

<svelte:window
  onkeydown={onKeydown}
  onmousemove={onMouseMove}
  onmouseup={onMouseUp}
/>

<!-- Backdrop -->
<!-- svelte-ignore a11y_interactive_supports_focus a11y_click_events_have_key_events -->
<div class="backdrop" class:open onclick={tutup} role="presentation"></div>

<!-- Panel -->
<div
  class="so-panel fixed z-50 flex flex-col
         bottom-0 left-0 right-0 rounded-t-2xl border-t
         sm:inset-y-0 sm:left-auto sm:right-0 sm:rounded-none sm:border-t-0 sm:border-l"
  style="
    background:var(--surface);
    border-color:var(--border);
    transform:{panelTransform};
    transition:{isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32,0.72,0,1)'};
    max-height:{panelHeightVh}vh;
    {isDesktop ? `width:${panelWidth}px;` : ''}
    will-change:transform;
  "
  role="dialog"
  aria-modal="true"
  tabindex="-1"
  onclick={(e) => e.stopPropagation()}
  onkeydown={(e) => e.stopPropagation()}
>
  <!-- Desktop resize handle (left edge) ─────────────────────────────────── -->
  <button
    type="button"
    class="resize-handle hidden sm:flex absolute inset-y-0 left-0 w-2 cursor-ew-resize items-center z-10"
    class:active={wDragging}
    onmousedown={startWidthDrag}
    onkeydown={(e) => {
      if (e.key === 'ArrowLeft') { panelWidth = Math.min(panelWidth + 8, Math.round(window.innerWidth * 0.85)); localStorage.setItem(KEY_W, String(panelWidth)); e.preventDefault() }
      if (e.key === 'ArrowRight') { panelWidth = Math.max(panelWidth - 8, MIN_W); localStorage.setItem(KEY_W, String(panelWidth)); e.preventDefault() }
    }}
    aria-label="Ubah lebar panel ({Math.round(panelWidth)}px)"
  >
    <div class="indicator w-0.5 h-10 rounded-full ml-0.5" style="background:var(--accent)"></div>
  </button>

  <!-- Mobile drag handle (top) ───────────────────────────────────────────── -->
  <div
    class="flex justify-center pt-3 pb-1 sm:hidden shrink-0 touch-none cursor-ns-resize"
    ontouchstart={startHeightDrag}
    ontouchmove={onTouchMove}
    ontouchend={onTouchEnd}
    role="separator"
    aria-orientation="horizontal"
    aria-label="Geser untuk resize atau tutup"
  >
    <div class="w-10 h-1 rounded-full transition-colors"
      style="background:{hDragging ? 'var(--accent)' : 'var(--border)'}"></div>
  </div>

  <!-- Close button — 16px dari tepi panel, bukan dari header -->
  <button
    onclick={tutup}
    class="absolute w-7 h-7 flex items-center justify-center rounded-full text-base leading-none z-10"
    style="top:4px;right:4px;background:var(--surface2);color:var(--text-dim)"
    aria-label="Tutup"
  >&times;</button>

  <!-- Header ─────────────────────────────────────────────────────────────── -->
  <div class="border-b shrink-0" style="border-color:var(--border);padding:16px;padding-right:48px">
    <h3 class="text-sm font-bold" style="color:var(--text)">{title}</h3>
  </div>

  <!-- Body (scrollable) ──────────────────────────────────────────────────── -->
  <div class="overflow-y-auto flex-1 px-4 py-4">
    {@render children()}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(0, 0, 0, 0);
    pointer-events: none;
    transition: background 0.25s;
  }
  .backdrop.open {
    background: rgba(0, 0, 0, 0.45);
    pointer-events: auto;
  }

  /* Desktop: remove max-height constraint */
  @media (min-width: 640px) {
    .so-panel {
      max-height: none !important;
    }
  }

  /* Resize handle — visible on hover & while dragging */
  .resize-handle {
    padding: 0;
    border: none;
    background: transparent;
    outline: none;
  }
  .resize-handle .indicator {
    opacity: 0;
    transition: opacity 0.2s;
  }
  .resize-handle:hover .indicator,
  .resize-handle.active .indicator {
    opacity: 0.5;
  }
</style>
