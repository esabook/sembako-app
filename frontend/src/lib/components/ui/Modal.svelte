<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		judul,
		lebar = 'md',
		bisaTutup = true,
		ontutup,
		children,
		footer
	}: {
		judul: string;
		lebar?: 'sm' | 'md' | 'lg';
		bisaTutup?: boolean;
		ontutup?: () => void;
		children: Snippet;
		footer?: Snippet;
	} = $props();

	const lebarCls = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' } as const;

	function tutup() {
		if (bisaTutup) ontutup?.();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') tutup();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div
	class="fixed inset-0 z-50 flex items-center justify-center p-4"
	style="background:rgba(0,0,0,0.6)"
>
	<!-- backdrop: klik untuk tutup -->
	<button class="absolute inset-0 cursor-default" aria-label="Tutup" tabindex="-1" onclick={tutup}
	></button>

	<div
		class="relative w-full {lebarCls[lebar]} rounded-lg border shadow-xl"
		style="background:var(--surface);border-color:var(--border);color:var(--text)"
		role="dialog"
		aria-modal="true"
		aria-label={judul}
	>
		<div
			class="flex items-center justify-between border-b px-4 py-3"
			style="border-color:var(--border)"
		>
			<h3 class="text-sm font-bold">{judul}</h3>
			{#if bisaTutup}
				<button
					onclick={tutup}
					class="text-lg leading-none"
					style="color:var(--text-dim)"
					aria-label="Tutup">&times;</button
				>
			{/if}
		</div>

		<div class="px-4 py-4">
			{@render children()}
		</div>

		{#if footer}
			<div class="flex justify-end gap-2 border-t px-4 py-3" style="border-color:var(--border)">
				{@render footer()}
			</div>
		{/if}
	</div>
</div>
