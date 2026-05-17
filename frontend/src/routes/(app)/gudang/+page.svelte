<script lang="ts">
	import { goto } from '$app/navigation'
	import { user } from '$lib/stores/auth.js'
	import TabStok from './TabStok.svelte';

	$effect(() => {
		if ($user && !['pemilik', 'manajer', 'gudang'].includes($user.role)) goto('/kasir')
	})
	import TabTerima from './TabTerima.svelte';
	import TabPO from './TabPO.svelte';
	import TabOpname from './TabOpname.svelte';
	import TabBarang from './TabBarang.svelte';
	import TabSupplier from './TabSupplier.svelte';
	import TabPengaturan from './TabPengaturan.svelte';
	import TabLabel from './TabLabel.svelte';

	type TabId = 'stok' | 'terima' | 'po' | 'opname' | 'barang' | 'supplier' | 'label' | 'pengaturan';
	let tab = $state<TabId>('stok');

	const TABS: { id: TabId; label: string }[] = [
		{ id: 'stok',        label: 'STOK' },
		{ id: 'terima',      label: 'TERIMA BARANG' },
		{ id: 'po',          label: 'PURCHASE ORDER' },
		{ id: 'opname',      label: 'STOK OPNAME' },
		{ id: 'barang',      label: 'MASTER BARANG' },
		{ id: 'supplier',    label: 'SUPPLIER' },
		{ id: 'label',       label: 'CETAK LABEL' },
		{ id: 'pengaturan',  label: 'PENGATURAN' },
	];
</script>

<div class="flex gap-1 mb-4 border-b" style="border-color:var(--border)">
	{#each TABS as t}
		<button
			onclick={() => tab = t.id}
			class="px-3 py-2 text-xs font-bold border-b-2 -mb-px"
			style="{tab === t.id ? 'border-color:var(--accent);color:var(--accent)' : 'border-color:transparent;color:var(--text-dim)'}">
			{t.label}
		</button>
	{/each}
</div>

{#if tab === 'stok'}      <TabStok />{/if}
{#if tab === 'terima'}    <TabTerima />{/if}
{#if tab === 'po'}        <TabPO />{/if}
{#if tab === 'opname'}    <TabOpname />{/if}
{#if tab === 'barang'}    <TabBarang />{/if}
{#if tab === 'supplier'}  <TabSupplier />{/if}
{#if tab === 'label'}     <TabLabel />{/if}
{#if tab === 'pengaturan'}<TabPengaturan />{/if}
