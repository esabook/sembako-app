<script lang="ts">
	import { user } from '$lib/stores/auth.js';
	import { api } from '$lib/utils/api.js';
	import { goto } from '$app/navigation';
	import { font, FONT_CSS } from '$lib/stores/font.js';
	import { ukuranFont } from '$lib/stores/ukuran-font.js';
	import NavClock from '$lib/components/NavClock.svelte';
	import NavUser from '$lib/components/NavUser.svelte';
	import AppSidebar from '$lib/components/layout/AppSidebar.svelte';
	import SyncIndicator from '$lib/components/SyncIndicator.svelte';
	import BannerLangganan from '$lib/components/layout/BannerLangganan.svelte';
	import BannerDemo from '$lib/components/layout/BannerDemo.svelte';
	import BannerCabangMati from '$lib/components/layout/BannerCabangMati.svelte';
	import PanelLeft from '@lucide/svelte/icons/panel-left';
	import Banknote from '@lucide/svelte/icons/banknote';

	let { children, data } = $props();

	$effect(() => {
		user.set(data.user as import('$lib/stores/auth.js').User);
	});

	let namaToko = $state('');
	let namaCabang = $state('');
	let sidebarMobileOpen = $state(false);
	let sidebarWidth = $state(0);
	let sidebarAbsolute = $state(false);

	const KASIR_ROLES = ['pemilik', 'manajer', 'kasir', 'gudang', 'sales', 'pelayanan'];
	const boleKasir = $derived(KASIR_ROLES.includes($user?.role ?? ''));

	async function bukaKasirPOS() {
		try {
			await document.documentElement.requestFullscreen();
		} catch {
			/* ignored */
		}
		goto('/kasir');
	}

	$effect(() => {
		const cabangId = $user?.cabang_id;

		api.get<{ nama_toko: string }>(`/pengaturan/publik?toko_id=${$user?.tenant_id ?? 1}`).then((res) => {
			if (res.success && res.data.nama_toko) namaToko = res.data.nama_toko;
		});

		if (cabangId) {
			api.get<{ id: number; nama: string }[]>('/toko/cabang').then((res) => {
				if (res.success) {
					const cab = res.data.find((c) => c.id === cabangId);
					namaCabang = cab ? cab.nama : '';
				}
			});
		} else {
			namaCabang = '';
		}
	});
</script>

<div
	class="app-root flex h-dvh flex-col overflow-hidden"
	style="background:var(--bg);color:var(--text);font-family:{FONT_CSS[
		$font
	]};font-size:{$ukuranFont}px"
>
	<!-- Top Navbar -->
	<nav
		class="app-nav sticky top-0 z-40 flex h-11 shrink-0 items-center gap-2 border-b px-1.5 text-sm"
		style="background:var(--surface);border-color:var(--border)"
	>
		<!-- Mobile: tombol buka sidebar (SVG + nama toko) -->
		<button
			class="flex items-center gap-1.5 rounded px-1 active:opacity-70 sm:hidden"
			onclick={() => (sidebarMobileOpen = true)}
			aria-label="Buka navigasi"
		>
			<PanelLeft size="1rem" color="var(--text-dim)" />
		</button>
		<!-- Desktop: logo + nama toko -->
		<div class="hidden shrink-0 items-center gap-1.5 sm:flex">
			<enhanced:img src="$lib/assets/logo.webp" alt="Logo Stokasir" class="h-[32px] w-[32px]" />
			<span class="font-bold" style="color:var(--accent)">{namaToko}</span>
			{#if namaCabang}
				<span class="text-xs" style="color:var(--text-dim)">· {namaCabang}</span>
			{/if}
		</div>

		<div class="ml-auto flex shrink-0 items-center gap-2">
			<SyncIndicator />
			<NavClock />
			{#if boleKasir}
				<button
					onclick={bukaKasirPOS}
					class="flex items-center gap-1 rounded px-2 py-1 text-xs active:opacity-70"
					style="background:var(--accent);color:#fff"
					title="Buka Kasir POS"
				>
					<Banknote size={14} />
					<span class="hidden sm:inline">Kasir</span>
				</button>
			{/if}
			<NavUser />
		</div>
	</nav>
	<BannerLangganan />
	<BannerDemo />
	<BannerCabangMati />
	<!-- Body: sidebar selalu tampil + konten -->
	<div class="app-body relative flex min-h-0 flex-1">
		<AppSidebar
			bind:mobileOpen={sidebarMobileOpen}
			bind:sidebarWidth
			bind:sidebarAbsolute
			{namaToko}
		/>

		<!-- Konten utama -->
		<main
			class="app-main min-h-0 flex-1 overflow-auto p-2 sm:p-4 md:p-6"
			style={sidebarAbsolute ? `margin-left:${sidebarWidth}rem` : ''}
		>
			{@render children()}
		</main>
	</div>
</div>
