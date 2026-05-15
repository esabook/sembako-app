<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, subtitle = '', children }: {
		title: string;
		subtitle?: string;
		children: Snippet;
	} = $props();

	let open = $state(false);
</script>

<button
	onclick={() => open = true}
	title={title}
	class="fixed bottom-6 right-6 z-30 w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shadow-lg border-2"
	style="background:var(--surface);border-color:var(--accent);color:var(--accent)">
	?
</button>

{#if open}
<div
	class="fixed inset-0 z-50 flex items-center justify-center p-4"
	style="background:rgba(0,0,0,0.7)"
	role="dialog"
	aria-modal="true">
	<div
		class="w-full max-w-2xl rounded-lg border shadow-xl flex flex-col"
		style="background:var(--surface);border-color:var(--border);max-height:90vh">

		<div class="flex items-center justify-between px-5 py-4 border-b shrink-0" style="border-color:var(--border)">
			<div>
				<h3 class="font-bold text-sm">{title}</h3>
				{#if subtitle}<p class="text-xs mt-0.5" style="color:var(--text-dim)">{subtitle}</p>{/if}
			</div>
			<button onclick={() => open = false} class="text-xl leading-none w-8 h-8 flex items-center justify-center rounded hover:opacity-70" style="color:var(--text-dim)">×</button>
		</div>

		<div class="overflow-y-auto px-5 py-4 text-sm flex flex-col gap-5" style="color:var(--text)">
			{@render children()}
		</div>

		<div class="px-5 py-3 border-t shrink-0 flex justify-end" style="border-color:var(--border)">
			<button onclick={() => open = false} class="px-4 py-1.5 rounded text-xs font-bold" style="background:var(--accent);color:var(--bg)">Tutup</button>
		</div>
	</div>
</div>
{/if}
