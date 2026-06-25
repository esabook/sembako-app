<script lang="ts">
	import { isLoading, pesanLoading } from '$lib/stores/ui.store';
	import { navigating } from '$app/stores';
</script>

{#if $isLoading || $navigating}
	<div
		class="fixed inset-x-0 top-0 z-[60] h-[4px] overflow-hidden"
		style="background:var(--surface2)"
	>
		<div class="bar"></div>
	</div>
	<!-- {#if $pesanLoading}
		<div
			class="fixed top-8 left-1/2 z-[60] -translate-x-1/2 rounded px-3 py-1 text-xs"
			style="background:var(--surface);color:var(--text-dim);border:1px solid var(--border)"
		>
			{$pesanLoading}
		</div>
	{/if} -->
{/if}

<style>
	.bar {
		width: 100%;
		height: 100%;
		background: linear-gradient(
			90deg,
			var(--surface2) 0%,
			var(--text-dim) 15%,
			var(--accent) 40%,
			var(--info) 60%,
			var(--accent) 80%,
			var(--surface2) 100%
		);
		background-size: 200% 100%;
		animation: shimmer 1.8s ease-in-out infinite;
		will-change: background-position;
	}
	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style>
