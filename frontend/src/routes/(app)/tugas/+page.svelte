<script lang="ts">
	import { user } from '$lib/stores/auth.js';
	import { createTugasStore } from './tugas.store.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import TabBar from '$lib/components/ui/TabBar.svelte';
	import SlideOver from '$lib/components/SlideOver.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import TabHarian from './components/TabHarian.svelte';
	import TabTemplate from './components/TabTemplate.svelte';

	const store = createTugasStore();
	const isManager = $derived($user?.role === 'pemilik' || $user?.role === 'manajer');

	const tab = $derived<'harian' | 'template'>(
		(page.url.searchParams.get('tab') as any) ?? store.tab ?? 'harian'
	);

	const TABS = [
		{ key: 'harian', label: 'Checklist Hari Ini' },
		{ key: 'template', label: 'Kelola Item' }
	];

	// auto-load
	$effect(() => {
		if (tab === 'harian') store.muatLog();
	});
	$effect(() => {
		if (tab === 'template') store.muatItems();
	});
</script>

<svelte:head><title>Tugas — Stokasir</title></svelte:head>

<div class="space-y-4">
	<PageHeader judul="Tugas Harian" />

	<TabBar
		tabs={TABS}
		active={tab}
		storageKey="tugas"
		onchange={(key) => goto(`?tab=${key}`, { replaceState: true, keepFocus: true, noScroll: true })}
	/>

	{#if tab === 'harian'}
		<TabHarian {store} {isManager} />
	{:else}
		<TabTemplate {store} {isManager} />
	{/if}
</div>

<SlideOver bind:open={store.formOpen} title={store.editItem ? 'Edit Item' : 'Tambah Item Tugas'}>
	<div class="space-y-4">
		<Input
			bind:value={store.form.nama}
			label="Nama Tugas *"
			placeholder="Misal: Sapu lantai toko"
		/>
		<Input
			bind:value={store.form.kategori}
			label="Kategori"
			placeholder="kebersihan / keamanan / dll"
		/>
		<Input bind:value={store.form.urutan} type="number" label="Urutan" />
		<div class="flex gap-2 pt-2">
			<Button variant="dim" onclick={() => (store.formOpen = false)}>Batal</Button>
			<Button onclick={() => store.simpanItem()}>Simpan</Button>
		</div>
	</div>
</SlideOver>

<ConfirmDialog
	bind:open={store.konfirmHapus.buka}
	pesan="Hapus item tugas ini?"
	warnaKanan="var(--danger)"
	onkanan={() => store.hapusItem()}
	onkiri={() => (store.konfirmHapus = { buka: false, id: null })}
/>
