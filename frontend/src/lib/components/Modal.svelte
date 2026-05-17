<script lang="ts">
	let { open = $bindable(false), title = '', children } = $props<{
		open?: boolean;
		title?: string;
		children: import('svelte').Snippet;
	}>();

	function tutup() { open = false; }

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') tutup();
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<!-- backdrop -->
	<div
		class="fixed inset-0 z-40 flex items-center justify-center"
		style="background:rgba(0,0,0,0.6)"
		role="dialog"
		aria-modal="true"
		onclick={tutup}
	>
		<!-- panel -->
		<div
			class="w-full max-w-md rounded-lg border p-6 shadow-xl"
			style="background:var(--surface);border-color:var(--border)"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex items-center justify-between mb-4">
				<h3 class="font-bold text-sm">{title}</h3>
				<button onclick={tutup} class="text-lg leading-none" style="color:var(--text-dim)">&times;</button>
			</div>
			{@render children()}
		</div>
	</div>
{/if}
