<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { user } from '$lib/stores/auth.js';
	import TabBar from '$lib/components/ui/TabBar.svelte';
	import {
		createKunjunganStore,
		createAgendaStore,
		createPipelineStore
	} from './sales.store.svelte.js';
	import TabKunjungan from './components/TabKunjungan.svelte';
	import TabAgenda from './components/TabAgenda.svelte';
	import TabPipeline from './components/TabPipeline.svelte';

	const TABS = [
		{ key: 'kunjungan', label: 'Kunjungan Warung' },
		{ key: 'agenda', label: 'Agenda Supplier' },
		{ key: 'pipeline', label: 'Pipeline Grosir' }
	];

	$effect(() => {
		if ($user && !['pemilik', 'manajer', 'sales'].includes($user.role)) goto('/kasir');
	});

	const tab = $derived<'kunjungan' | 'agenda' | 'pipeline'>(
		(page.url.searchParams.get('tab') as any) ?? 'kunjungan'
	);

	const kStore = createKunjunganStore();
	const aStore = createAgendaStore();
	const pStore = createPipelineStore();

	$effect(() => {
		if (tab === 'kunjungan') {
			kStore.bulan;
			kStore.status;
			kStore.muat();
		}
	});
	$effect(() => {
		if (tab === 'agenda') {
			aStore.bulan;
			aStore.status;
			aStore.muat();
		}
	});
	$effect(() => {
		if (tab === 'pipeline') {
			pStore.tahap;
			pStore.muat();
		}
	});
</script>

<svelte:head><title>Sales — Stokasir</title></svelte:head>

<div class="flex flex-col gap-4">
	<div class="flex items-center justify-between">
		<h1 class="font-bold" style="color:var(--text)">Sales & Kunjungan</h1>
	</div>
	<TabBar
		tabs={TABS}
		active={tab}
		storageKey="sales"
		onchange={(key) => goto(`?tab=${key}`, { replaceState: true, keepFocus: true, noScroll: true })}
	/>

	{#if tab === 'kunjungan'}
		<TabKunjungan store={kStore} />
	{:else if tab === 'agenda'}
		<TabAgenda store={aStore} />
	{:else if tab === 'pipeline'}
		<TabPipeline store={pStore} />
	{/if}
</div>
