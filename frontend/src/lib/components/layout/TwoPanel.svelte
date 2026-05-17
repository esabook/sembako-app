<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		rasio = '1fr 1fr',
		kiri,
		kanan,
	}: {
		// lebar grid kolom; di mobile otomatis bertumpuk
		rasio?: string;
		kiri: Snippet;
		kanan: Snippet;
	} = $props();
</script>

<div class="panel grid min-h-0 flex-1 gap-4" style="--rasio:{rasio}">
	<div class="min-w-0">{@render kiri()}</div>
	<div class="min-w-0">{@render kanan()}</div>
</div>

<style>
	.panel {
		grid-template-columns: 1fr;
	}
	@media (min-width: 768px) {
		.panel {
			grid-template-columns: var(--rasio);
		}
	}
</style>
