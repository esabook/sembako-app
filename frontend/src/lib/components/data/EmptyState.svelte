<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		pesan = 'Tidak ada data',
		ikon = '∅',
		aksi,
	}: {
		pesan?: string;
		ikon?: string;
		aksi?: Snippet;
	} = $props();
</script>

<div
	class="flex flex-col items-center justify-center gap-2 py-10 text-center"
	style="color:var(--text-dim)"
>
	<span class="text-2xl">{ikon}</span>
	<p class="text-sm">{pesan}</p>
	{#if aksi}
		<div class="mt-2">{@render aksi()}</div>
	{/if}
</div>
