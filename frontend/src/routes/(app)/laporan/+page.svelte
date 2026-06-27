<script lang="ts">
	import { untrack, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { user } from '$lib/stores/auth.js';
	import TabBar from '$lib/components/ui/TabBar.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { createLaporanStore } from './laporan.store.svelte';
	import type { TabKey } from './laporan.types';
	import TabLabaRugi from './components/TabLabaRugi.svelte';
	import TabArusKas from './components/TabArusKas.svelte';
	import TabNeraca from './components/TabNeraca.svelte';
	import TabAging from './components/TabAging.svelte';
	import TabBudgetRealisasi from './components/TabBudgetRealisasi.svelte';
	import TabPajakUmkm from './components/TabPajakUmkm.svelte';
	import TabMarginProduk from './components/TabMarginProduk.svelte';
	import TabPerbandingan from './components/TabPerbandingan.svelte';
	import TabPersediaan from './components/TabPersediaan.svelte';
	import TabTopPelanggan from './components/TabTopPelanggan.svelte';
	import TabPembelianSupplier from './components/TabPembelianSupplier.svelte';
	import TabRekapPenggajian from './components/TabRekapPenggajian.svelte';
	import TabAnalitikJam from './components/TabAnalitikJam.svelte';

	$effect(() => {
		if ($user && !['pemilik', 'manajer'].includes($user.role)) goto('/kasir');
	});

	const store = createLaporanStore();

	let tab = $derived<TabKey>((page.url.searchParams.get('tab') as TabKey) ?? 'laba-rugi');

	onMount(() => store.muatCabang());

	$effect(() => {
		tab;
		untrack(() => store.muat(tab));
	});
</script>

<svelte:head><title>Laporan — Stokasir</title></svelte:head>

<!-- ───────────────────────────────────────────── HEADER ── -->
<div class="no-print mb-4">
	<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem">
		<h1 style="font-size:1.1rem; font-weight:700; color:var(--text)">Laporan</h1>
		<div style="display:flex; gap:.5rem">
			<button
				onclick={() => store.exportCsv(tab)}
				style="padding:.4rem .9rem; background:var(--surface2); border:1px solid var(--border); color:var(--text); border-radius:4px; font-family:inherit; font-size:.8rem; cursor:pointer"
				>Export CSV</button
			>
			<button
				onclick={() => window.print()}
				style="padding:.4rem .9rem; background:var(--surface2); border:1px solid var(--border); color:var(--text); border-radius:4px; font-family:inherit; font-size:.8rem; cursor:pointer"
				>Print / PDF</button
			>
		</div>
	</div>

	<!-- Filter Cabang (hanya jika ada >1 cabang) -->
	{#if store.cabangList.length > 0}
		<div
			style="display:flex; gap:.5rem; align-items:center; margin-bottom:.5rem; flex-wrap:wrap"
			class="no-print"
		>
			<span style="font-size:.75rem; color:var(--text-dim)">Cabang:</span>
			<Select
				bind:value={store.selectedCabang}
				placeholder="Semua Cabang"
				options={store.cabangList.map(c => ({ value: c.id, label: c.nama }))}
			/>
		</div>
	{/if}

	<!-- Tabs -->
	<TabBar
		tabs={[
			{ key: 'laba-rugi', label: 'Laba Rugi' },
			{ key: 'arus-kas', label: 'Arus Kas' },
			{ key: 'neraca', label: 'Neraca' },
			{ key: 'aging', label: 'Aging' },
			{ key: 'budget-realisasi', label: 'Budget vs Aktual' },
			{ key: 'pajak-umkm', label: 'Pajak UMKM' },
			{ key: 'margin-produk', label: 'Margin Produk' },
			{ key: 'perbandingan', label: 'Perbandingan' },
			{ key: 'persediaan', label: 'Persediaan' },
			{ key: 'top-pelanggan', label: 'Top Pelanggan' },
			{ key: 'pembelian-supplier', label: 'Pembelian Supplier' },
			{ key: 'rekap-penggajian', label: 'Rekap Penggajian' },
			{ key: 'analitik-jam', label: 'Analitik Per Jam' }
		]}
		active={tab}
		storageKey="laporan"
		onchange={(key) => goto(`?tab=${key}`, { replaceState: true, keepFocus: true, noScroll: true })}
	/>
</div>

{#if tab === 'laba-rugi'}
	<TabLabaRugi {store} />
{:else if tab === 'arus-kas'}
	<TabArusKas {store} />
{:else if tab === 'neraca'}
	<TabNeraca {store} />
{:else if tab === 'aging'}
	<TabAging {store} />
{:else if tab === 'budget-realisasi'}
	<TabBudgetRealisasi {store} />
{:else if tab === 'pajak-umkm'}
	<TabPajakUmkm {store} />
{:else if tab === 'margin-produk'}
	<TabMarginProduk {store} />
{:else if tab === 'perbandingan'}
	<TabPerbandingan {store} />
{:else if tab === 'persediaan'}
	<TabPersediaan {store} />
{:else if tab === 'top-pelanggan'}
	<TabTopPelanggan {store} />
{:else if tab === 'pembelian-supplier'}
	<TabPembelianSupplier {store} />
{:else if tab === 'rekap-penggajian'}
	<TabRekapPenggajian {store} />
{:else if tab === 'analitik-jam'}
	<TabAnalitikJam {store} />
{:else}
	<p style="padding:1.25rem; color:var(--text-dim); font-size:.85rem">
		Pilih tab dan klik Tampilkan.
	</p>
{/if}

<style>
	@media print {
		@page {
			margin: 1.5cm;
		}

		:global(nav),
		:global(.no-print) {
			display: none !important;
		}

		:global(:root),
		:global([data-theme]) {
			--bg: #ffffff !important;
			--surface: #ffffff !important;
			--surface2: #f4f4f4 !important;
			--border: #999999 !important;
			--text: #000000 !important;
			--text-dim: #444444 !important;
			--accent: #006600 !important;
			--danger: #cc0000 !important;
			--info: #004499 !important;
		}

		:global(body) {
			background: white !important;
			color: black !important;
			font-size: 11pt !important;
		}

		:global(table) {
			border-collapse: collapse !important;
			width: 100% !important;
		}
		:global(td),
		:global(th) {
			border: 1px solid #999 !important;
			padding: 0.3rem 0.5rem !important;
		}
	}
</style>
