<script lang="ts">
	import { isLoading, pesanLoading } from '$lib/stores/ui.store';
</script>

{#if $isLoading}
	<div class="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden" style="background:transparent">
		<div class="bar h-full" style="background:var(--accent)"></div>
	</div>
	{#if $pesanLoading}
		<div
			class="fixed top-8 left-1/2 z-[60] -translate-x-1/2 rounded px-3 py-1 text-xs"
			style="background:var(--surface);color:var(--text-dim);border:1px solid var(--border)"
		>
			{$pesanLoading}
		</div>
	{/if}
{/if}

<style>
	.bar {
		width: 40%;
		animation: slide 1.1s ease-in-out infinite;
		will-change: transform;
	}
	@keyframes slide {
		0% {
			transform: translateX(-100%);
		}
		50% {
			transform: translateX(120%);
		}
		100% {
			transform: translateX(260%);
		}
	}
</style>
