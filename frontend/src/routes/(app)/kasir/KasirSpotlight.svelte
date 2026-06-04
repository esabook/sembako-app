<script lang="ts">
	import { onMount } from 'svelte';
	import { tipeTransaksi } from '$lib/stores/kasir';
	import {
		searchVal,
		searchResults,
		searchSelectedIdx,
		cariLoading,
		qrLarge,
		closeSearch,
		tambahKeKeranjang,
		cariBarang,
		dummyJumlah
	} from './kasir.store';
	import { rupiah } from './kasir.logic';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	let inputEl: HTMLInputElement | undefined = $state();

	let cariTimer: ReturnType<typeof setTimeout>;

	function handleSearchInput() {
		clearTimeout(cariTimer);
		cariTimer = setTimeout(() => cariBarang($searchVal), 200);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.ctrlKey && e.altKey && e.key === 'e') {
			e.preventDefault();
			tipeTransaksi.set('eceran');
			return;
		}
		if (e.ctrlKey && e.altKey && e.key === 'g') {
			e.preventDefault();
			tipeTransaksi.set('grosir');
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			searchSelectedIdx.update((i) => Math.min(i + 1, Math.min(7, $searchResults.length - 1)));
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			searchSelectedIdx.update((i) => Math.max(i - 1, 0));
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const idx = $searchSelectedIdx >= 0 ? $searchSelectedIdx : 0;
			const sel = $searchResults[idx];
			if (sel) pilihBarang(sel);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			if ($qrLarge) { qrLarge.set(false); return; }
			closeSearch();
		}
	}

	function pilihBarang(br: (typeof $searchResults)[number]) {
		tambahKeKeranjang(br, $dummyJumlah);
	}

	onMount(() => {
		setTimeout(() => inputEl?.focus(), 0);
		return () => clearTimeout(cariTimer);
	});
</script>

<!-- spotlight box -->
<div
	class="min-w-0 flex-1 overflow-hidden rounded-xl border shadow-2xl"
	style="background:var(--surface);border-color:var(--border)"
	role="none"
>
	<!-- input row -->
	<div class="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:gap-3" style="border-color:var(--border)">
		<!-- tipe toggle -->
		<div class="flex shrink-0 gap-1">
			{#each ['eceran', 'grosir'] as const as t (t)}
				<button
					onclick={() => tipeTransaksi.set(t)}
					class="rounded border px-2 py-0.5 text-xs font-bold transition-all"
					style={$tipeTransaksi === t
						? 'background:var(--accent);color:var(--bg);border-color:var(--accent)'
						: 'border-color:var(--border);color:var(--text-dim)'}
					>{t === 'eceran' ? 'ECR' : 'GRS'}</button
				>
			{/each}
		</div>
		<!-- input + badge -->
		<div class="flex min-w-0 flex-1 items-center gap-2">
			<input
				bind:this={inputEl}
				type="text"
				placeholder="Nama atau kode barang..."
				bind:value={$searchVal}
				oninput={handleSearchInput}
				onkeydown={onKeydown}
				class="min-w-0 flex-1 bg-transparent text-base outline-none"
				style="color:var(--text)"
			/>
			{#if $cariLoading}
				<Spinner size={14} />
			{/if}
		</div>
	</div>

	<!-- results -->
	{#if $searchResults.length > 0}
		<div class="max-h-96 overflow-y-auto">
			{#each $searchResults.slice(0, 8) as br, i (br.id)}
				<button
					onclick={() => pilihBarang(br)}
					class="w-full border-t px-2 py-3 text-left transition-colors"
					style="border-color:var(--border);background:{$searchSelectedIdx === i
						? 'var(--surface2)'
						: 'transparent'}"
				>
					<div class="flex items-center gap-2">
						<!-- Kol 1: foto -->
						{#if br.foto_path}
							<img
								src="/uploads/{br.foto_path.replace('med_', 'thumb_')}"
								alt={br.nama_barang}
								class="h-8 w-8 shrink-0 rounded object-cover"
								style="border:1px solid var(--border)"
							/>
						{:else}
							<div
								class="h-8 w-8 shrink-0 rounded"
								style="background:var(--surface2);border:1px solid var(--border)"
							></div>
						{/if}
						<!-- info: flex-col mobile, grid 2-kol desktop -->
						<div class="flex min-w-0 flex-1 flex-col gap-0.5 sm:grid sm:grid-cols-[1fr_auto] sm:gap-x-4">
							<!-- nama (desktop: baris 1 kol 1) -->
							<span class="min-w-0 truncate font-medium sm:col-start-1 sm:row-start-1">{br.nama_barang}</span>
							<!-- kode + stok (desktop: baris 2 kol 1) -->
							<div class="flex items-center gap-3 sm:col-start-1 sm:row-start-2">
								<span class="text-xs" style="color:var(--text-dim)">{br.kode_barang}</span>
								<span class="text-xs" style="color:{br.stok_sekarang <= 0 ? 'var(--danger)' : 'var(--text-dim)'}">stok {br.stok_sekarang} {br.singkatan_satuan ?? ''}</span>
							</div>
							<!-- ECR (mobile: baris 3; desktop: baris 1 kol 2, angka-dulu) -->
							<span
								class="flex items-center gap-1 text-xs sm:col-start-2 sm:row-start-1 sm:flex-row-reverse"
								style="color:{$tipeTransaksi === 'eceran' ? 'var(--accent)' : 'var(--text-dim)'}"
							><span class="text-xs" style="color:var(--text-dim)">ECR</span>{rupiah(br.harga_jual_eceran)}</span>
							<!-- GRS (mobile: baris 4; desktop: baris 2 kol 2, angka-dulu) -->
							<span
								class="flex items-center gap-1 text-xs sm:col-start-2 sm:row-start-2 sm:flex-row-reverse"
								style="color:{$tipeTransaksi === 'grosir' ? 'var(--accent)' : 'var(--text-dim)'}"
							><span class="text-xs" style="color:var(--text-dim)">GRS</span>{rupiah(br.harga_jual_grosir)}</span>
						</div>
					</div>
				</button>
			{/each}
		</div>
	{:else if $searchVal && !$cariLoading}
		<p class="px-4 py-6 text-center text-sm" style="color:var(--text-dim)">
			Barang tidak ditemukan
		</p>
	{:else}
		<p class="px-4 py-4 text-center text-xs" style="color:var(--text-dim)">
			Ketik nama, kode, atau scan barcode — harga aktif: <span style="color:var(--accent)"
				>{$tipeTransaksi.toUpperCase()}</span
			>
		</p>
	{/if}
</div>
