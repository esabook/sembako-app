<script lang="ts">
	import Check from '@lucide/svelte/icons/check';

	// Multi-tier; beda antar-tier cuma kuota, semua fitur sama.
	let {
		nama = 'Starter',
		harga = 'Gratis',
		periode = '',
		fitur = [] as string[],
		catatan = '',
		highlight = false,
		cta = 'Mulai Gratis',
		href = '/daftar'
	}: {
		nama?: string;
		harga?: string;
		periode?: string;
		fitur?: string[];
		catatan?: string;
		highlight?: boolean;
		cta?: string;
		href?: string;
	} = $props();
</script>

<div
	class="flex w-full max-w-sm flex-col rounded-2xl border p-5"
	style="border-color:{highlight ? 'var(--accent)' : 'var(--border)'};background:var(--surface, var(--bg))"
>
	<h3 class="text-sm font-semibold" style="color:var(--text-dim)">{nama}</h3>
	<div class="mt-2 flex items-baseline gap-1">
		<span class="text-2xl font-bold" style="color:var(--text)">{harga}</span>
		{#if periode}<span class="text-sm" style="color:var(--text-dim)">{periode}</span>{/if}
	</div>
	{#if catatan}<p class="mt-1 text-xs" style="color:var(--text-dim)">{catatan}</p>{/if}

	<ul class="mt-4 flex flex-1 flex-col gap-2 text-sm">
		{#each fitur as f (f)}
			<li class="flex items-start gap-2">
				<Check class="mt-0.5 size-4 shrink-0" style="color:var(--accent)" />
				<span>{f}</span>
			</li>
		{/each}
	</ul>

	<a
		{href}
		class="btn mt-6"
		style="background:var(--accent);color:var(--bg);border-color:var(--accent)"
	>
		{cta}
	</a>
</div>
