<script lang="ts">
	import { onMount } from 'svelte';
	import { createPromoStore } from './promo.store.svelte';
	import PromoTable from './components/PromoTable.svelte';
	import FormPromo from './components/FormPromo.svelte';

	const store = createPromoStore();
	onMount(() => {
		store.muat();
		store.muatMeta();
	});
</script>

<svelte:head><title>Promo — Stokasir</title></svelte:head>

<div class="flex flex-col gap-4">
	<h1 class="font-bold">Promo & Diskon</h1>
	<div class="flex items-center gap-3">
		<button
			onclick={() => store.bukaForm()}
			class="rounded px-3 py-1 text-sm font-bold"
			style="background:var(--accent);color:var(--bg)"
		>
			+ Buat Promo
		</button>
		<span class="ml-auto text-xs" style="color:var(--text-dim)">
			{store.aktifHariIni} promo aktif hari ini
		</span>
	</div>

	<PromoTable {store} />
</div>

<FormPromo {store} />
