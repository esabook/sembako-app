<script lang="ts">
	import { goto } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { user } from '$lib/stores/auth.js';
	import { tema, type Tema } from '$lib/stores/tema.js';
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

	const TEMA_LIST: { nilai: Tema; label: string; deskripsi: string }[] = [
		{ nilai: 'dark',  label: 'DARK',  deskripsi: 'Terminal gelap' },
		{ nilai: 'light', label: 'LIGHT', deskripsi: 'Siang hari' },
		{ nilai: 'eye',   label: 'EYE',   deskripsi: 'Malam, nyaman' },
		{ nilai: 'bww',   label: 'BW ☯',  deskripsi: 'Hitam-putih terang' },
		{ nilai: 'bwb',   label: 'BW ☯',  deskripsi: 'Hitam-putih gelap' },
	];

	const ROLE_LABEL: Record<string, string> = {
		pemilik: 'Pemilik',
		manajer: 'Manajer',
		kasir:   'Kasir',
		gudang:  'Gudang',
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
		onclick={() => buka = !buka}
		class="flex items-center gap-1.5 px-2 py-1 rounded transition-colors text-xs"
		style="color:var(--text-dim)"
	>
		<!-- Ikon user sederhana -->
		<span
			class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
			style="background:var(--surface2);color:var(--accent)"
		>{$user?.nama?.[0]?.toUpperCase() ?? '?'}</span>
		<span class="max-w-24 truncate" style="color:var(--text)">{$user?.nama ?? '—'}</span>
	</button>

	{#if buka}
		<div
			class="absolute right-0 top-full mt-1 z-50 rounded border shadow-lg w-52"
			style="background:var(--surface);border-color:var(--border)"
		>
			<!-- Header: info user -->
			<div class="px-3 py-2.5 border-b" style="border-color:var(--border)">
				<div class="flex items-center gap-2">
					<span
						class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
						style="background:var(--surface2);color:var(--accent)"
					>{$user?.nama?.[0]?.toUpperCase() ?? '?'}</span>
					<div class="min-w-0">
						<div class="text-sm font-medium truncate" style="color:var(--text)">{$user?.nama ?? '—'}</div>
						<div class="text-[10px]" style="color:var(--text-dim)">{ROLE_LABEL[$user?.role ?? ''] ?? $user?.role}</div>
					</div>
				</div>
			</div>

			<!-- Pilihan tema -->
			<div class="px-3 py-2 border-b" style="border-color:var(--border)">
				<div class="text-[10px] uppercase mb-1.5 tracking-wider" style="color:var(--text-dim)">Tema</div>
				<div class="flex flex-col gap-0.5">
					{#each TEMA_LIST as t}
						<button
							onclick={() => tema.set(t.nilai)}
							class="flex items-center justify-between px-2 py-1 rounded text-xs transition-colors w-full text-left"
							style={$tema === t.nilai
								? 'background:var(--surface2);color:var(--accent)'
								: 'color:var(--text-dim)'}
						>
							<span>{t.label}</span>
							<span class="text-[10px]" style="color:var(--text-dim)">{t.deskripsi}</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Fullscreen + Keluar -->
			<div class="px-3 py-2 flex flex-col gap-0.5">
				<button
					onclick={toggleFullscreen}
					class="w-full text-left text-xs px-2 py-1.5 rounded transition-colors flex items-center justify-between"
					style="color:var(--text-dim)"
				>
					<span>{isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen'}</span>
					<span>{isFullscreen ? '⊠' : '⊡'}</span>
				</button>
				<button
					onclick={logout}
					class="w-full text-left text-xs px-2 py-1.5 rounded transition-colors"
					style="color:var(--danger)"
				>Keluar</button>
			</div>
		</div>
	{/if}
</div>
