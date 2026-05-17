<script lang="ts">
	let {
		size = 16,
		warna = 'var(--accent)',
	}: {
		size?: number;
		warna?: string;
	} = $props();
</script>

<span
	class="spinner inline-block rounded-full align-middle"
	style="width:{size}px;height:{size}px;border:2px solid var(--border);border-top-color:{warna}"
	role="status"
	aria-label="Memuat"
></span>

<style>
	.spinner {
		animation: putar 0.7s linear infinite;
		will-change: transform;
	}
	@keyframes putar {
		to {
			transform: rotate(360deg);
		}
	}
</style>
