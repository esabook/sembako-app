<script lang="ts">
	let {
		size = 20,
		warna = 'var(--text-dim)',
	}: {
		size?: number;
		warna?: string;
	} = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke={warna}
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	class="spinner"
	role="status"
	aria-label="Memuat"
>
	<path stroke="none" d="M0 0h24v24H0z" fill="none" />
	<path d="M12 6l0 -3" />
	<path d="M16.25 7.75l2.15 -2.15" />
	<path d="M18 12l3 0" />
	<path d="M16.25 16.25l2.15 2.15" />
	<path d="M12 18l0 3" />
	<path d="M7.75 16.25l-2.15 2.15" />
	<path d="M6 12l-3 0" />
	<path d="M7.75 7.75l-2.15 -2.15" />
</svg>

<style>
	.spinner {
		animation: putar 1.2s ease-in-out infinite;
		will-change: transform;
		display: inline-block;
		vertical-align: middle;
		flex-shrink: 0;
	}
	@keyframes putar {
		to {
			transform: rotate(360deg);
		}
	}
</style>
