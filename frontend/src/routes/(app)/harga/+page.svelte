<svelte:head><title>Harga — Stokasir</title></svelte:head>

<script lang="ts">
	import { goto } from '$app/navigation'
	import { page } from '$app/state'
	import { user } from '$lib/stores/auth.js'
	import { createHargaStore } from './harga.store.svelte.js'
	import TabDaftarHarga from './components/TabDaftarHarga.svelte'
	import TabMassalHarga from './components/TabMassalHarga.svelte'
	import SlideOverEditHarga from './components/SlideOverEditHarga.svelte'
	import SlideOverHistoriHarga from './components/SlideOverHistoriHarga.svelte'
	import type { Tab } from './harga.types.js'

	$effect(() => {
		if ($user && !['pemilik', 'manajer'].includes($user.role)) goto('/kasir')
	})

	const store = createHargaStore()
	const tab = $derived<Tab>((page.url.searchParams.get('tab') as Tab) ?? 'daftar')

	$effect(() => { if (tab === 'daftar') store.muat() })
</script>

<div class="p-4 space-y-4">
	<div class="flex items-center justify-between">
		<h1 class="text-lg font-bold" style="color:var(--text)">Manajemen Harga</h1>
	</div>

	<!-- Tab -->
	<div class="flex gap-1 border-b" style="border-color:var(--border)">
		{#each [['daftar', 'DAFTAR HARGA'], ['massal', 'UPDATE MASSAL']] as [id, label] (id)}
			<button
				onclick={() => goto(`?tab=${id}`, { replaceState: true, keepFocus: true, noScroll: true })}
				class="px-3 py-2 text-xs font-bold border-b-2 -mb-px"
				style="{tab === id ? 'border-color:var(--accent);color:var(--accent)' : 'border-color:transparent;color:var(--text-dim)'}"
			>
				{label}
			</button>
		{/each}
	</div>

	{#if tab === 'daftar'}
		<TabDaftarHarga {store} />
	{:else if tab === 'massal'}
		<TabMassalHarga {store} onDone={() => goto('?tab=daftar', { replaceState: true, noScroll: true })} />
	{/if}
</div>

<SlideOverEditHarga {store} />
<SlideOverHistoriHarga {store} />
