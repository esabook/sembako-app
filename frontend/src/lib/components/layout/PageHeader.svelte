<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		judul,
		sub = null,
		aksi,
	}: {
		judul: string;
		sub?: string | null;
		aksi?: Snippet;
	} = $props();
</script>

<div
	class="mb-4 flex items-end justify-between gap-3 border-b pb-3"
	style="border-color:var(--border)"
>
	<div class="min-w-0">
		<h1 class="text-base font-bold" style="color:var(--text)">{judul}</h1>
		{#if sub}
			<p class="mt-0.5 text-xs" style="color:var(--text-dim)">{sub}</p>
		{/if}
	</div>
	{#if aksi}
		<div class="flex shrink-0 items-center gap-2">{@render aksi()}</div>
	{/if}
</div>
