<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/auth';
	import { createProfilStore } from './profil.store.svelte';
	import TabProfil from './components/TabProfil.svelte';
	import TabToko from './components/TabToko.svelte';
	import TabPerangkat from './components/TabPerangkat.svelte';
	import TabBar from '$lib/components/ui/TabBar.svelte';

	const store = createProfilStore();

	const tab = $derived(page.url.searchParams.get('tab') ?? 'profil');
	const isPemilik = $derived($user?.role === 'pemilik');
	const tabs = $derived([
		{ key: 'profil', label: 'Profil & Akun' },
		{ key: 'perangkat', label: 'Perangkat & Sesi' },
		...(isPemilik ? [{ key: 'toko', label: 'Toko & Cabang' }] : [])
	]);

	onMount(store.muat);
</script>

<svelte:head><title>Profil & Akun — Stokasir</title></svelte:head>

<div class="flex max-w-2xl flex-col gap-4">
	<div>
		<h2 class="text-base font-bold">Profil & Akun</h2>
		<p class="mt-0.5 text-xs" style="color:var(--text-dim)">Kelola data diri, keamanan akun & pengaturan toko</p>
	</div>

	<TabBar
		{tabs}
		active={tab}
		storageKey="profil"
		onchange={(key) => goto(`?tab=${key}`, { replaceState: true, noScroll: true })}
	/>

	{#if tab === 'toko' && isPemilik}
		<TabToko />
	{:else if tab === 'perangkat'}
		<TabPerangkat />
	{:else}
		<TabProfil {store} />
	{/if}
</div>
