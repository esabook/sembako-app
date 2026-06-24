<script lang="ts">
	// Shell minimal panel admin platform — tanpa sidebar/nav tenant.
	let { children } = $props();
</script>

<div class="min-h-screen" style="background:var(--bg);color:var(--text)">
	{@render children()}
</div>
