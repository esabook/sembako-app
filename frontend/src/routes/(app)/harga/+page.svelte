<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { user } from '$lib/stores/auth.js';
	import { createHargaStore } from './harga.store.svelte.js';
	import TabDaftarHarga from './components/TabDaftarHarga.svelte';
	import TabMassalHarga from './components/TabMassalHarga.svelte';
	import SlideOverEditHarga from './components/SlideOverEditHarga.svelte';
	import SlideOverHistoriHarga from './components/SlideOverHistoriHarga.svelte';
	import type { Tab } from './harga.types.js';
	import TabBar from '$lib/components/ui/TabBar.svelte';

	const TABS = [
		{ key: 'daftar', label: 'DAFTAR HARGA' },
		{ key: 'massal', label: 'UPDATE MASSAL' }
	];

	$effect(() => {
		if ($user && !['pemilik', 'manajer'].includes($user.role)) goto('/kasir');
	});

	const store = createHargaStore();
	const tab = $derived<Tab>((page.url.searchParams.get('tab') as Tab) ?? 'daftar');

	$effect(() => {
		if (tab === 'daftar') store.muat();
	});
</script>

<svelte:head><title>Harga — Stokasir</title></svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h1 class="font-bold" style="color:var(--text)">Manajemen Harga</h1>
	</div>

	<TabBar
		tabs={TABS}
		active={tab}
		storageKey="harga"
		onchange={(key) => goto(`?tab=${key}`, { replaceState: true, keepFocus: true, noScroll: true })}
	/>

	{#if tab === 'daftar'}
		<TabDaftarHarga {store} />
	{:else if tab === 'massal'}
		<TabMassalHarga
			{store}
			onDone={() => goto('?tab=daftar', { replaceState: true, noScroll: true })}
		/>
	{/if}
</div>

<SlideOverEditHarga {store} />
<SlideOverHistoriHarga {store} />
