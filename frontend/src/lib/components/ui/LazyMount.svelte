<script lang="ts">
  import { withIdle } from '$lib/utils/async'
  import Skeleton from './Skeleton.svelte'

  let {
    when = 'visible',
    rootMargin = '200px',
    tinggi = 220,
    children
  }: {
    when?: 'visible' | 'idle'
    rootMargin?: string
    tinggi?: number
    children: import('svelte').Snippet
  } = $props()

  let mounted = $state(false)
  let el: HTMLDivElement | undefined = $state()

  $effect(() => {
    if (mounted) return

    if (when === 'idle') {
      const cancel = withIdle(() => { mounted = true })
      return cancel
    }

    // 'visible' — IntersectionObserver
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          mounted = true
          observer.disconnect()
        }
      },
      { rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  })
</script>

{#if mounted}
  {@render children()}
{:else}
  <div bind:this={el}>
    <Skeleton h="{tinggi}px" />
  </div>
{/if}
