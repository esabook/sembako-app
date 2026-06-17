<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { api } from '$lib/utils/api.js';
	import { user } from '$lib/stores/auth.js';
	import { temaSkin, temaMode, MODE_LIST, SKIN_LIST } from '$lib/stores/tema.js';
	import { onMount } from 'svelte';

	let buka = $state(false);
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

	async function logout() {
		buka = false;
		await api.post('/auth/logout', {});
		user.set(null);
		goto('/login');
	}

	function tutupJikaLuar(e: MouseEvent) {
		if (ref && !ref.contains(e.target as Node)) buka = false;
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
		onclick={() => (buka = !buka)}
		class="flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors"
		style="color:var(--text-dim)"
	>
		<!-- Ikon user sederhana -->
		<span
			class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.7em] font-bold"
			style="background:var(--surface2);color:var(--accent)"
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
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
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

			<!-- Pilihan tema -->
			<div class="border-b px-3 py-2" style="border-color:var(--border)">
				<div class="mb-1.5 flex items-center justify-between">
					<span class="text-[0.7em] tracking-wider uppercase" style="color:var(--text-dim)"
						>Tema</span
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

			<!-- Scanner + Fullscreen + Keluar -->
			<div class="flex flex-col gap-0.5 px-3 py-2">
				{#if page.url.pathname !== '/scanner'}
					<a
						href="/scanner"
						onclick={() => (buka = false)}
						class="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors"
						style="color:var(--accent)"
					>
						<span>Mode Scanner</span>
						<span>📷</span>
					</a>
				{/if}
				<button
					onclick={toggleFullscreen}
					class="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors"
					style="color:var(--text-dim)"
				>
					<span>{isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen'}</span>
					<span>{isFullscreen ? '⊠' : '⊡'}</span>
				</button>

				<!-- Tombol panduan -->
				<a
					href="/panduan"
					target="_blank"
					class="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors"
					style="color:var(--text-dim)"
				>
					<span>Panduan Penggunaan</span>
					<span>❓</span>
				</a>

				<button
					onclick={logout}
					class="w-full rounded px-2 py-1.5 text-left text-xs transition-colors"
					style="color:var(--danger)">Keluar</button
				>
			</div>
		</div>
	{/if}
</div>
