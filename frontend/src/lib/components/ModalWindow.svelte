<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    open = $bindable(false),
    title = '',
    maxWidth = 'md',
    noPadding = false,
    ontutup = undefined,
    children,
  }: {
    open?: boolean;
    title?: string;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '3xl';
    noPadding?: boolean;
    ontutup?: () => void;
    children: Snippet;
  } = $props()

  function tutup() { if (ontutup) { ontutup(); return } open = false }
  function onKeydown(e: KeyboardEvent) { if (e.key === 'Escape') tutup() }
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-2 sm:px-0"
    style="background:rgba(0,0,0,0.5)"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={tutup}
    onkeydown={(e) => { if (e.key === 'Escape') tutup() }}
  >
    <!-- Panel -->
    <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
    <div
      class="relative flex flex-col overflow-hidden border w-full rounded-t-2xl sm:rounded-2xl
             {maxWidth === 'sm'  ? 'sm:max-w-sm'
             : maxWidth === 'lg'  ? 'sm:max-w-lg'
             : maxWidth === 'xl'  ? 'sm:max-w-xl'
             : maxWidth === '3xl' ? 'sm:max-w-3xl'
             : 'sm:max-w-md'}"
      style="background:var(--surface);border-color:var(--border);max-height:90svh"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <!-- Close button -->
      <button
        onclick={tutup}
        class="absolute w-7 h-7 flex items-center justify-center rounded-full text-base leading-none z-10"
        style="top:4px;right:4px;background:var(--surface2);color:var(--text-dim)"
        aria-label="Tutup"
      >&times;</button>

      <!-- Drag handle (mobile only) -->
      <div class="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
        <div class="w-10 h-1 rounded-full" style="background:var(--border)"></div>
      </div>

      <!-- Header -->
      {#if title}
        <div class="border-b shrink-0" style="border-color:var(--border);padding:16px;padding-right:48px">
          <h3 class="text-sm font-bold" style="color:var(--text)">{title}</h3>
        </div>
      {/if}

      <!-- Body -->
      <div class="{noPadding ? 'overflow-hidden flex-1' : 'overflow-y-auto flex-1 px-4 sm:px-6 py-4'}">
        {@render children()}
      </div>
    </div>
  </div>
{/if}
