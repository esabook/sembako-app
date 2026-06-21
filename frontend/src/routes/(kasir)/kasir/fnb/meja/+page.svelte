<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { createMejaStore } from '../fnb.store.svelte';
	import type { Meja, StatusMeja } from '../fnb.types';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';

	const store = createMejaStore();

	const warnaMeja: Record<StatusMeja, string> = {
		kosong: 'bg-[var(--accent)] text-black',
		terisi: 'bg-[var(--warn)] text-black',
		reserved: 'bg-[var(--info)] text-black',
		dibersihkan: 'bg-[var(--surface2)] text-[var(--text-dim)]',
	};

	const labelStatus: Record<StatusMeja, string> = {
		kosong: 'Kosong',
		terisi: 'Terisi',
		reserved: 'Reserved',
		dibersihkan: 'Bersih',
	};

	function pilihMeja(m: Meja) {
		if (m.status === 'dibersihkan') return;
		// Buka kasir dgn meja ini — store kasir akan handle meja_id
		goto(`/kasir?meja=${m.id}`);
	}

	let intervalId: ReturnType<typeof setInterval>;
	onMount(() => {
		store.muat();
		intervalId = setInterval(() => store.muat(), 10_000);
		return () => clearInterval(intervalId);
	});
</script>

<div class="p-3 md:p-6">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-base font-semibold md:text-lg">Pilih Meja</h1>
		<button class="btn btn-sm btn-outline" onclick={() => store.muat()}>Refresh</button>
	</div>

	{#if store.loading && store.meja.length === 0}
		<div class="flex justify-center py-12"><Spinner /></div>
	{:else if store.meja.length === 0}
		<EmptyState pesan="Belum ada meja. Tambahkan di pengaturan." />
	{:else}
		<!-- Legend -->
		<div class="mb-4 flex flex-wrap gap-2 text-xs">
			{#each Object.entries(labelStatus) as [k, v]}
				<span class="flex items-center gap-1.5">
					<span class="h-3 w-3 rounded-sm {warnaMeja[k as StatusMeja]}"></span>
					{v}
				</span>
			{/each}
		</div>

		<!-- Grid meja -->
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
			{#each store.meja.filter((m) => m.is_active) as m (m.id)}
				<button
					class="relative flex min-h-[6rem] flex-col items-center justify-center rounded-lg border border-[var(--border)] p-3 text-center transition-opacity
						{m.status === 'dibersihkan' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-80 active:scale-95'}
						{warnaMeja[m.status]}"
					onclick={() => pilihMeja(m)}
					disabled={m.status === 'dibersihkan'}
				>
					<span class="text-lg font-bold">{m.kode_meja}</span>
					{#if m.nama}
						<span class="mt-0.5 text-xs opacity-80">{m.nama}</span>
					{/if}
					<span class="mt-1 text-xs opacity-70">
						{m.kapasitas} org · {labelStatus[m.status]}
					</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
