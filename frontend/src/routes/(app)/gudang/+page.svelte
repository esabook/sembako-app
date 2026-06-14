<svelte:head><title>Gudang — Stokasir</title></svelte:head>

<script lang="ts">
	import { goto } from '$app/navigation'
	import { page } from '$app/state'
	import { user } from '$lib/stores/auth.js'
	import TabStok from './TabStok.svelte';
	import TabTerima from './TabTerima.svelte';
	import TabPO from './TabPO.svelte';
	import TabOpname from './TabOpname.svelte';
	import TabBarang from './TabBarang.svelte';
	import TabSupplier from './TabSupplier.svelte';
	import TabPengaturan from './TabPengaturan.svelte';
	import TabLabel from './TabLabel.svelte';
	import TabReturSupplier from './TabReturSupplier.svelte';
	import TabBar from '$lib/components/ui/TabBar.svelte';

	$effect(() => {
		if ($user && !['pemilik', 'manajer', 'gudang'].includes($user.role)) goto('/kasir')
	})

	type TabId = 'stok' | 'terima' | 'po' | 'opname' | 'barang' | 'supplier' | 'retur-supplier' | 'label' | 'pengaturan';
	let tab = $derived<TabId>(
		(page.url.searchParams.get('tab') as TabId) ?? 'stok'
	);

	const TABS = [
		{ key: 'stok',           label: 'STOK' },
		{ key: 'terima',         label: 'TERIMA BARANG' },
		{ key: 'po',             label: 'PURCHASE ORDER' },
		{ key: 'opname',         label: 'STOK OPNAME' },
		{ key: 'barang',         label: 'MASTER BARANG' },
		{ key: 'supplier',       label: 'SUPPLIER' },
		{ key: 'retur-supplier', label: 'RETUR SUPPLIER' },
		{ key: 'label',          label: 'CETAK LABEL' },
		{ key: 'pengaturan',     label: 'PENGATURAN' },
	];
</script>

<TabBar
	tabs={TABS}
	active={tab}
	storageKey="gudang"
	onchange={(key) => goto(`?tab=${key}`, { replaceState: true, keepFocus: true, noScroll: true })}
/>

{#if tab === 'stok'}      <TabStok />{/if}
{#if tab === 'terima'}    <TabTerima />{/if}
{#if tab === 'po'}        <TabPO />{/if}
{#if tab === 'opname'}    <TabOpname />{/if}
{#if tab === 'barang'}    <TabBarang />{/if}
{#if tab === 'supplier'}        <TabSupplier />{/if}
{#if tab === 'retur-supplier'}  <TabReturSupplier />{/if}
{#if tab === 'label'}           <TabLabel />{/if}
{#if tab === 'pengaturan'}<TabPengaturan />{/if}
