<script lang="ts">
	import type { Snippet } from 'svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';

	let {
		judul,
		loading = false,
		kosong = false,
		pesanKosong = 'Belum ada data.',
		tinggi = 220,
		children
	}: {
		judul?: string;
		loading?: boolean;
		kosong?: boolean;
		pesanKosong?: string;
		tinggi?: number;
		children: Snippet;
	} = $props();
</script>

<div class="flex flex-col gap-2">
	{#if judul}
		<h3 class="text-xs font-bold tracking-wider uppercase" style="color:var(--text-dim)">
			{judul}
		</h3>
	{/if}
	<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
		{#if loading}
			<Skeleton w="100%" h="{tinggi}px" />
		{:else if kosong}
			<p
				class="flex items-center justify-center text-xs"
				style="height:{tinggi}px;color:var(--text-dim)"
			>
				{pesanKosong}
			</p>
		{:else}
			{@render children()}
		{/if}
	</div>
</div>
