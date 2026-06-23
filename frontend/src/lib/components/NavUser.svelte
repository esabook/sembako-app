<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { api } from '$lib/utils/api.js';
	import { user } from '$lib/stores/auth.js';
	import { cabangListVersion } from '$lib/stores/cabang-version.js';
	import { temaSkin, temaMode, MODE_LIST, SKIN_LIST } from '$lib/stores/tema.js';
	import { onMount } from 'svelte';
	import Fullscreen from '@lucide/svelte/icons/fullscreen';
	import Shrink from '@lucide/svelte/icons/shrink';
	import ScanBarcode from '@lucide/svelte/icons/scan-barcode';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import Store from '@lucide/svelte/icons/store';
	import Palette from '@lucide/svelte/icons/palette';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	let buka = $state(false);
	let bukaKonteks = $state(false);
	let bukaTema = $state(false);
	let ref: HTMLDivElement;
	let isFullscreen = $state(false);

	function toggleFullscreen() {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen();
		} else {
			document.exitFullscreen();
		}
	}

	function onFullscreenChange() {
		isFullscreen = !!document.fullscreenElement;
	}

	const ROLE_LABEL: Record<string, string> = {
		pemilik: 'Pemilik',
		manajer: 'Manajer',
		kasir: 'Kasir',
		gudang: 'Gudang'
	};

	type CabangItem = { id: number; nama: string };
	type TokoItem = { id: number; nama: string; cabang: CabangItem[] };

	let konteksList = $state<TokoItem[]>([]);
	let loadingSwitch = $state(false);

	const bisaSwitch = $derived($user?.role === 'pemilik' || $user?.role === 'manajer');

	$effect(() => {
		if ($cabangListVersion > 0) konteksList = [];
	});
	// Mode SaaS: 1 email = 1 toko → switcher fokus cabang saja (tanpa pindah toko).
	const saas = $derived($user?.saas ?? false);

	async function muatKonteks() {
		if (konteksList.length > 0) return;
		const res = await api.get<TokoItem[]>('/auth/accessible-context');
		if (res.success) konteksList = res.data;
	}

	async function switchKonteks(tokoId: number, cabangId: number | null) {
		if (loadingSwitch) return;
		loadingSwitch = true;
		try {
			const res = await api.post<{ tenant_id: number; cabang_id: number | null }>(
				'/auth/switch-context',
				{ toko_id: tokoId, cabang_id: cabangId }
			);
			if (res.success) {
				buka = false;
				bukaKonteks = false;
				location.reload();
			}
		} finally {
			loadingSwitch = false;
		}
	}

	async function logout() {
		buka = false;
		await api.post('/auth/logout', {});
		user.set(null);
		goto('/login');
	}

	function tutupJikaLuar(e: MouseEvent) {
		if (ref && !ref.contains(e.target as Node)) {
			buka = false;
			bukaKonteks = false;
			bukaTema = false;
		}
	}

	function toggleKonteks() {
		bukaKonteks = !bukaKonteks;
		if (bukaKonteks) muatKonteks();
	}

	function toggleTema() {
		bukaTema = !bukaTema;
	}

	onMount(() => {
		document.addEventListener('click', tutupJikaLuar);
		document.addEventListener('fullscreenchange', onFullscreenChange);
		return () => {
			document.removeEventListener('click', tutupJikaLuar);
			document.removeEventListener('fullscreenchange', onFullscreenChange);
		};
	});
</script>

<div class="relative" bind:this={ref}>
	<button
		onclick={() => {
			buka = !buka;
			if (!buka) bukaKonteks = false;
		}}
		class="flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors"
		style="color:var(--text-dim)"
	>
		<span
			class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[0.7em] font-bold"
			style="background:var(--surface);color:var(--accent)"
			>{$user?.nama?.[0]?.toUpperCase() ?? '?'}</span
		>
	</button>

	{#if buka}
		<div
			class="absolute top-full right-0 z-50 mt-1 w-52 rounded border shadow-lg"
			style="background:var(--surface);border-color:var(--border)"
		>
			<!-- Header: info user -->
			<div class="border-b px-3 py-2.5" style="border-color:var(--border)">
				<div class="flex items-center gap-2">
					<span
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold"
						style="background:var(--surface2);color:var(--accent)"
						>{$user?.nama?.[0]?.toUpperCase() ?? '?'}</span
					>
					<div class="min-w-0">
						<div class="truncate text-sm font-medium" style="color:var(--text)">
							{$user?.nama ?? '—'}
						</div>
						<div class="text-[0.7em]" style="color:var(--text-dim)">
							{ROLE_LABEL[$user?.role ?? ''] ?? $user?.role}
						</div>
					</div>
				</div>
			</div>

			<!-- Sub-dropdown: Toko & Cabang — hanya pemilik & manajer -->
			{#if bisaSwitch}
				<div class="border-b" style="border-color:var(--border)">
					<button
						onclick={toggleKonteks}
						class="flex w-full items-center justify-between rounded px-3 py-2 text-xs transition-colors hover:bg-[var(--surface2)]"
						style="color:var(--text-dim)"
					>
						<span class="flex items-center gap-1.5">
							<Store size="0.85rem" />
							{saas ? 'Cabang' : 'Toko & Cabang'}
						</span>
						{#if bukaKonteks}
							<ChevronDown size="0.85rem" />
						{:else}
							<ChevronRight size="0.85rem" />
						{/if}
					</button>

					{#if bukaKonteks}
						<div class="space-y-1.5 border-t p-2" style="border-color:var(--border)">
							{#if konteksList.length === 0}
								<div class="px-2 py-2 text-[0.7em]" style="color:var(--text-dim)">Memuat…</div>
							{:else}
								{#each konteksList as t (t.id)}
									{@const tokoAktif = $user?.tenant_id === t.id}
									{@const semuaAktif = tokoAktif && $user?.cabang_id === null}
									<div class="overflow-hidden rounded border" style="border-color:var(--border)">
										<button
											onclick={() => switchKonteks(t.id, null)}
											disabled={loadingSwitch}
											class="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-[var(--surface2)]"
											style={semuaAktif
												? 'background:var(--surface2);color:var(--accent)'
												: 'color:var(--text)'}
										>
											<span>{saas ? 'Semua Cabang' : t.nama}</span>
											{#if semuaAktif}<span class="text-[0.8em]">✓</span>{/if}
										</button>
										{#if t.cabang.length > 0}
											<div class="border-t" style="border-color:var(--border)">
												{#each t.cabang as cb (cb.id)}
													{@const cabangAktif =
														tokoAktif && (semuaAktif || $user?.cabang_id === cb.id)}
													<button
														onclick={() => switchKonteks(t.id, cb.id)}
														disabled={loadingSwitch}
														class="flex w-full items-center justify-between py-1.5 pr-3 pl-3 text-left text-[0.7em] transition-colors hover:bg-[var(--surface2)]"
														style={cabangAktif ? 'color:var(--accent)' : 'color:var(--text-dim)'}
													>
														<span>{cb.nama}</span>
														{#if cabangAktif}<span>✓</span>{/if}
													</button>
												{/each}
											</div>
										{/if}
									</div>
								{/each}
							{/if}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Pilihan tema — sub-dropdown -->
			<div class="border-b" style="border-color:var(--border)">
				<button
					onclick={toggleTema}
					class="flex w-full items-center justify-between rounded px-3 py-2 text-xs transition-colors hover:bg-[var(--surface2)]"
					style="color:var(--text-dim)"
				>
					<span class="flex items-center gap-1.5">
						<Palette size="0.85rem" />
						Tema
					</span>
					{#if bukaTema}
						<ChevronDown size="0.85rem" />
					{:else}
						<ChevronRight size="0.85rem" />
					{/if}
				</button>

				{#if bukaTema}
					<div class="border-t px-3 pt-1.5 pb-2" style="border-color:var(--border)">
						<div class="mb-1.5 flex items-center justify-between">
							<span class="text-[0.65em] tracking-wider uppercase" style="color:var(--text-dim)"
								>Mode</span
							>
							<div class="flex gap-0.5">
								{#each MODE_LIST as m (m.nilai)}
									<button
										onclick={() => temaMode.set(m.nilai)}
										title={m.label}
										class="rounded px-1.5 py-0.5 text-xs transition-colors"
										style={$temaMode === m.nilai
											? 'background:var(--surface2);color:var(--accent)'
											: 'color:var(--text-dim)'}
									>
										{m.ikon}
									</button>
								{/each}
							</div>
						</div>
						<div class="flex flex-col gap-0.5">
							{#each SKIN_LIST as s (s.nilai)}
								<button
									onclick={() => temaSkin.set(s.nilai)}
									class="flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs transition-colors"
									style={$temaSkin === s.nilai
										? 'background:var(--surface2);color:var(--accent)'
										: 'color:var(--text-dim)'}
								>
									<span>{s.label}</span>
									<span class="text-[0.7em]" style="color:var(--text-dim)">{s.deskripsi}</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Scanner + Fullscreen + Keluar -->
			<div class="flex flex-col gap-0.5 px-3 py-2">
				{#if page.url.pathname !== '/scanner'}
					<a
						href="/scanner"
						onclick={() => (buka = false)}
						class="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-[var(--surface2)]"
						style="color:var(--text-dim)"
					>
						<span>Mode Scanner</span>
						<ScanBarcode size="1rem" />
					</a>
				{/if}
				<button
					onclick={toggleFullscreen}
					class="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-[var(--surface2)]"
					style="color:var(--text-dim)"
				>
					<span>{isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen'}</span>
					{#if isFullscreen}
						<Shrink size="1rem" />
					{:else}
						<Fullscreen size="1rem" />
					{/if}
				</button>

				<a
					href="/panduan"
					target="_blank"
					class="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-[var(--surface2)]"
					style="color:var(--text-dim)"
				>
					<span>Panduan Penggunaan</span>
					<Lightbulb size="1rem" />
				</a>

				<button
					onclick={logout}
					class="w-full rounded px-2 py-1.5 text-left text-xs transition-colors hover:opacity-80"
					style="color:var(--danger)">Keluar</button
				>
			</div>
		</div>
	{/if}
</div>
