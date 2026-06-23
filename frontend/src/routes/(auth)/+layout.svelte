<script lang="ts">
	// Trigger font store subscribe → muat font + set documentElement fontFamily.
	// Sinkron dengan grup (app)/(kasir) lewat localStorage 'font'.
	import '$lib/stores/font.js';

	let { children } = $props();
</script>

{@render children()}
