<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Package from '@lucide/svelte/icons/package';
	import X from '@lucide/svelte/icons/x';
	import Fullscreen from '@lucide/svelte/icons/fullscreen';
	import Shrink from '@lucide/svelte/icons/shrink';

	type StokMenipis = {
		id: number;
		nama_barang: string;
		stok_sekarang: number;
		stok_minimum: number;
		satuan: string | null;
	};

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let stokMenipis = $state<StokMenipis[]>([]);

	let isFullscreen = $state(false);

	$effect(() => {
		if (open) {
			api.get<StokMenipis[]>('/barang/stok-menipis').then((res) => {
				if (res.success) stokMenipis = res.data;
			});
		}
	});

	function exitPOS() {
		if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
		goto('/dashboard');
	}

	function nav(href: string) {
		open = false;
		if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
		goto(href);
	}

	function toggleFullscreen() {
		if (document.fullscreenElement) {
			document.exitFullscreen().catch(() => {});
		} else {
			document.documentElement.requestFullscreen().catch(() => {});
		}
	}

	onMount(() => {
		isFullscreen = !!document.fullscreenElement;

		function onFSChange() {
			isFullscreen = !!document.fullscreenElement;
		}
		document.addEventListener('fullscreenchange', onFSChange);
		return () => document.removeEventListener('fullscreenchange', onFSChange);
	});
</script>

{#if open}
	<div
		class="fixed inset-0 z-40 bg-black/40"
		style="backdrop-filter:blur(3px);"
		onclick={() => (open = false)}
		role="presentation"
	></div>

	<!-- Phone: bottom sheet / Desktop: right side panel -->
	<div
		class="fixed right-0 bottom-0 left-0 z-50
		       flex max-h-[99vh] flex-col overflow-hidden rounded-t-2xl
		       sm:top-auto sm:right-0 sm:bottom-0 sm:left-auto sm:max-h-[99vh] sm:w-80 sm:rounded-none sm:rounded-tl-2xl"
		style="background:var(--surface);"
	>
		<div
			class="flex shrink-0 items-center justify-between border-b px-4 py-3"
			style="border-color:var(--border)"
		>
			<span class="text-sm font-semibold">Notifikasi & Menu</span>
			<button onclick={() => (open = false)} class="rounded p-1 active:opacity-60">
				<X size={16} />
			</button>
		</div>

		<div class="flex-1 overflow-y-auto">
			<!-- Notifikasi -->
			<div class="px-4 pt-3 pb-2">
				<p
					class="mb-2 text-[11px] font-semibold tracking-wider uppercase"
					style="color:var(--text-dim)"
				>
					Notifikasi
				</p>
				{#if stokMenipis.length === 0}
					<p class="py-2 text-sm" style="color:var(--text-dim)">Tidak ada notifikasi</p>
				{:else}
					<div class="flex flex-col gap-1.5">
						{#each stokMenipis as item (item.id)}
							<div
								class="flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs"
								style="background:var(--bg)"
							>
								<Package size={14} class="mt-0.5 shrink-0 text-amber-500" />
								<div class="min-w-0">
									<p class="text-[10px] font-semibold tracking-wide text-amber-500 uppercase">
										Stok Menipis
									</p>
									<p class="truncate font-medium">{item.nama_barang}</p>
									<p style="color:var(--text-dim)">
										Stok: {item.stok_sekarang}{item.satuan ? ' ' + item.satuan : ''} · Min: {item.stok_minimum}
									</p>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="mx-4 border-t" style="border-color:var(--border)"></div>

			<!-- Shortcuts -->
			<div class="px-4 pt-3 pb-5">
				<p
					class="mb-2 text-[11px] font-semibold tracking-wider uppercase"
					style="color:var(--text-dim)"
				>
					Menu
				</p>
				<div class="flex flex-col gap-1">
					<button
						onclick={toggleFullscreen}
						class="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-opacity active:opacity-60"
						style="background:var(--bg)"
						title={isFullscreen ? 'Keluar fullscreen' : 'Masuk fullscreen'}
						aria-label={isFullscreen ? 'Keluar fullscreen' : 'Masuk fullscreen'}
					>
						{#if isFullscreen}
							<Shrink size={15} style="color:var(--accent)" />
							<span>Keluar fullscreen</span>
						{:else}
							<Fullscreen size={15} style="color:var(--accent)" />
							<span>Masuk fullscreen</span>
						{/if}
					</button>
					<button
						onclick={exitPOS}
						class="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-opacity active:opacity-60"
						style="background:var(--bg)"
					>
						<LogOut size={16} style="color:var(--text-dim)" />
						<span>Dashboard</span>
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
