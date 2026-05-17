<script lang="ts">
	let {
		src = null,
		nama = '',
		size = 40,
	}: {
		src?: string | null;
		nama?: string;
		size?: number;
	} = $props();

	let gagal = $state(false);

	const inisial = $derived(
		nama
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0] ?? '')
			.join('')
			.toUpperCase() || '?'
	);

	const tampilFoto = $derived(src && !gagal);
</script>

{#if tampilFoto}
	<img
		src={src}
		alt={nama}
		loading="lazy"
		onerror={() => (gagal = true)}
		class="shrink-0 rounded object-cover"
		style="width:{size}px;height:{size}px;background:var(--surface2)"
	/>
{:else}
	<span
		class="flex shrink-0 items-center justify-center rounded font-bold"
		style="width:{size}px;height:{size}px;background:var(--surface2);color:var(--text-dim);font-size:{size *
			0.35}px"
		aria-label={nama}
	>
		{inisial}
	</span>
{/if}
