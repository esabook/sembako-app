<script lang="ts">
	import { onMount } from 'svelte';
	import { user } from '$lib/stores/auth.js';
	import { font, FONT_CSS } from '$lib/stores/font.js';
	import { ukuranFont } from '$lib/stores/ukuran-font.js';
	import { api } from '$lib/utils/api.js';
	import { initKasirScan, cleanupKasirScan, loadPromoAktif } from './kasir/kasir.store';
	import KasirTabBar from './kasir/KasirTabBar.svelte';
	import BannerDemo from '$lib/components/layout/BannerDemo.svelte';
	import Fullscreen from '@lucide/svelte/icons/fullscreen';

	let { children, data } = $props();

	$effect(() => {
		user.set(data.user as import('$lib/stores/auth.js').User);
	});

	let namaToko = $state('');
	let isFullscreen = $state(false);
	let showFullscreenGate = $state(false);

	onMount(() => {
		void api.get<{ nama_toko: string }>(`/pengaturan/publik?toko_id=${data.user?.tenant_id ?? 1}`).then((res) => {
			if (res.success && res.data.nama_toko) namaToko = res.data.nama_toko;
		});

		void loadPromoAktif();
		void initKasirScan(data.user?.id ?? 0, location.host, location.protocol);

		isFullscreen = !!document.fullscreenElement;
		const alreadyHandled = sessionStorage.getItem('kasir-fs') === '1';
		if (!isFullscreen && !alreadyHandled) showFullscreenGate = true;

		function onFSChange() {
			isFullscreen = !!document.fullscreenElement;
			if (isFullscreen) showFullscreenGate = false;
		}
		document.addEventListener('fullscreenchange', onFSChange);
		return () => {
			document.removeEventListener('fullscreenchange', onFSChange);
			cleanupKasirScan();
		};
	});

	async function enterFullscreen() {
		await document.documentElement.requestFullscreen().catch(() => {});
		sessionStorage.setItem('kasir-fs', '1');
		showFullscreenGate = false;
	}

	function skipGate() {
		sessionStorage.setItem('kasir-fs', '1');
		showFullscreenGate = false;
	}
</script>

<div
	class="kasir-pos flex h-dvh flex-col overflow-hidden"
	style="background:var(--bg);color:var(--text);font-family:{FONT_CSS[
		$font
	]};font-size:{$ukuranFont}px;{isFullscreen ? 'padding-top:env(safe-area-inset-top)' : ''}"
>
	<BannerDemo />
	<!-- Content -->
	<main class="min-h-0 flex-1 overflow-hidden">
		{@render children()}
	</main>

	<!-- Bottom tab bar -->
	<KasirTabBar />

	<!-- Fullscreen gate: muncul jika belum fullscreen, butuh klik user -->
	{#if showFullscreenGate}
		<div
			class="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4"
			style="background:var(--bg)"
		>
			<enhanced:img src="$lib/assets/logo.webp" alt="Logo" class="h-16 w-16 opacity-80" />
			<p class="text-lg font-semibold" style="color:var(--text)">{namaToko || 'Kasir POS'}</p>
			<button
				onclick={enterFullscreen}
				class="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white"
				style="background:var(--accent)"
			>
				<Fullscreen size={16} />
				Masuk Mode Fullscreen
			</button>
			<button onclick={skipGate} class="text-xs" style="color:var(--text-dim)">
				Lanjut tanpa fullscreen
			</button>
		</div>
	{/if}
</div>
