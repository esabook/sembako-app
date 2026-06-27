<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		judul = null,
		aksi,
		children
	}: {
		judul?: string | null;
		aksi?: Snippet;
		children: Snippet;
	} = $props();
</script>

<section class="rounded border" style="background:var(--surface);border-color:var(--border)">
	{#if judul || aksi}
		<div
			class="flex items-center justify-between border-b px-4 py-2.5"
			style="border-color:var(--border)"
		>
			{#if judul}
				<h2 class="text-xs font-bold tracking-wide uppercase" style="color:var(--text-dim)">
					{judul}
				</h2>
			{/if}
			{#if aksi}
				<div class="flex items-center gap-2">{@render aksi()}</div>
			{/if}
		</div>
	{/if}
	<div class="p-4">
		{@render children()}
	</div>
</section>
