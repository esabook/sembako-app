<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/auth.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { createPengaturanStore } from './pengaturan.store.svelte';
	import SectionIdentitas from './components/SectionIdentitas.svelte';
	import SectionStruk from './components/SectionStruk.svelte';
	import SectionWhatsApp from './components/SectionWhatsApp.svelte';
	import SectionPreferensi from './components/SectionPreferensi.svelte';
	import SectionAudio from './components/SectionAudio.svelte';
	import SectionBackupRestore from './components/SectionBackupRestore.svelte';
	import SectionDemo from './components/SectionDemo.svelte';

	// Hanya pemilik yang bisa akses
	$effect(() => {
		if ($user && $user.role !== 'pemilik') goto('/dashboard');
	});

	const store = createPengaturanStore();

	onMount(() => store.muat());
</script>

<svelte:head><title>Pengaturan — Stokasir</title></svelte:head>

<div class="space-y-6">
	{#if store.loading}
		<div class="flex justify-center py-16">
			<Spinner />
		</div>
	{:else}
		<SectionIdentitas {store} />
		<SectionStruk {store} />
		<SectionWhatsApp {store} />
		<SectionPreferensi {store} />
		<SectionAudio {store} />
		<SectionBackupRestore {store} />
		<SectionDemo />

		<div class="flex justify-end">
			<Button onclick={() => store.simpan()} loading={store.saving}>Simpan Pengaturan</Button>
		</div>
	{/if}
</div>
