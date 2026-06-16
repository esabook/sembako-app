<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { user } from '$lib/stores/auth.js';
	import TabBar from '$lib/components/ui/TabBar.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import { createDashboardStore } from './dashboard.store.svelte';
	import DashboardOverview from './DashboardOverview.svelte';
	import DashboardSalesSummary from './DashboardSalesSummary.svelte';

	$effect(() => {
		if ($user && !['pemilik', 'manajer'].includes($user.role)) goto('/kasir');
	});

	const store = createDashboardStore();
	onMount(() => store.muat());

	const TABS = [
		{ key: 'overview', label: 'Overview' },
		{ key: 'sales-summary', label: 'Sales Summary' }
	];
	const activeTab = $derived(page.url.searchParams.get('tab') ?? 'overview');
</script>

<svelte:head><title>Dashboard — Stokasir</title></svelte:head>

{#if store.loading}
	<div class="flex flex-col gap-5">
		<div class="flex items-center justify-between">
			<div class="space-y-2">
				<Skeleton w="7rem" h="1.25rem" />
				<Skeleton w="18rem" h="0.75rem" />
			</div>
		</div>
		<div class="flex gap-2">
			<Skeleton w="5.5rem" h="2rem" br="rounded-full" />
			<Skeleton w="7.5rem" h="2rem" br="rounded-full" />
		</div>
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each { length: 4 } as _, i (i)}
				<div
					class="space-y-2 rounded border p-3"
					style="background:var(--surface);border-color:var(--border)"
				>
					<Skeleton w="55%" h="0.7rem" />
					<Skeleton w="75%" h="1.4rem" />
					<Skeleton w="45%" h="0.65rem" />
				</div>
			{/each}
		</div>
		<div
			class="space-y-3 rounded border p-4"
			style="background:var(--surface);border-color:var(--border)"
		>
			<Skeleton w="35%" h="0.875rem" />
			<Skeleton w="100%" h="7rem" />
		</div>
	</div>
{:else if store.data}
	<div class="flex flex-col gap-5">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-base font-bold">Dashboard</h2>
				<p class="mt-0.5 text-xs" style="color:var(--text-dim)">
					Selamat datang, <strong>{$user?.nama}</strong> —
					{new Date(store.data.today + 'T00:00:00').toLocaleDateString('id-ID', {
						weekday: 'long',
						day: 'numeric',
						month: 'long',
						year: 'numeric'
					})}
				</p>
			</div>
			<button
				onclick={() => store.muat()}
				class="rounded border px-2 py-1 text-xs"
				style="border-color:var(--border);color:var(--text-dim)">Refresh</button
			>
		</div>

		<TabBar
			tabs={TABS}
			active={activeTab}
			storageKey="dashboard"
			onchange={(key) => goto(`?tab=${key}`, { replaceState: true })}
		/>

		{#if activeTab === 'overview'}
			<DashboardOverview data={store.data} stokPrediktif={store.stokPrediktif} />
		{:else if activeTab === 'sales-summary'}
			<DashboardSalesSummary data={store.data} />
		{/if}
	</div>
{:else}
	<p class="text-sm" style="color:var(--danger)">Gagal memuat data dashboard.</p>
{/if}
