<script lang="ts">
  let { w = '100%', h = '0.875rem', br = 'rounded' }: {
    w?: string; h?: string; br?: string
  } = $props()
</script>
<div class="animate-pulse {br}"
  style="width:{w};height:{h};background:var(--skeleton)"></div>
