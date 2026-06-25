<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { user } from '$lib/stores/auth.js';
	import TabBar from '$lib/components/ui/TabBar.svelte';
	import TabBahan from './bahan/+page.svelte';
	import Meja from './meja/+page.svelte';
	import Modifier from './modifier/+page.svelte';

	type TabKey = 'meja' | 'modifier' | 'bahan';

	const TABS: { key: TabKey; label: string }[] = [
		{ key: 'meja', label: 'Meja' },
		{ key: 'modifier', label: 'Modifier' },
		{ key: 'bahan', label: 'Bahan & Resep' }
	];

	const tabKeys = new Set(TABS.map((t) => t.key));
	let tab = $derived<TabKey>(
		tabKeys.has(page.url.searchParams.get('tab') as TabKey)
			? (page.url.searchParams.get('tab') as TabKey)
			: 'meja'
	);

	$effect(() => {
		if ($user && !['pemilik', 'manajer'].includes($user.role)) goto('/kasir');
	});

	function pindahTab(key: string) {
		goto(`?tab=${key}`, { replaceState: true, keepFocus: true, noScroll: true });
	}
</script>

<svelte:head><title>Food & Beverages — Stokasir</title></svelte:head>

<div>
	<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem">
		<h1 style="font-weight:700; color:var(--text)">Food & Beverages</h1>
	</div>
</div>

<div class="flex flex-col gap-4">
	<TabBar tabs={TABS} active={tab} storageKey="fnb" onchange={pindahTab} />
	{#if tab === 'meja'}
		<Meja />
	{:else if tab === 'modifier'}
		<Modifier />
	{:else if tab === 'bahan'}
		<TabBahan />
	{/if}
</div>
