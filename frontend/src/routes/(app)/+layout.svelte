<script lang="ts">
	import { user } from '$lib/stores/auth.js';
	import { api } from '$lib/utils/api.js';
	import { onMount } from 'svelte';
	import { font, FONT_CSS } from '$lib/stores/font.js';
	import { ukuranFont } from '$lib/stores/ukuran-font.js';
	import NavClock from '$lib/components/NavClock.svelte';
	import NavUser from '$lib/components/NavUser.svelte';
	import AppSidebar from '$lib/components/layout/AppSidebar.svelte';
	import SyncIndicator from '$lib/components/SyncIndicator.svelte';
	import PanelLeft from '@lucide/svelte/icons/panel-left';

	let { children, data } = $props();

	$effect(() => {
		user.set(data.user as import('$lib/stores/auth.js').User);
	});

	let namaToko = $state('');
	let namaCabang = $state('');
	let sidebarMobileOpen = $state(false);
	let sidebarWidth = $state(0);
	let sidebarAbsolute = $state(false);

	onMount(() => {
		api.get<{ nama_toko: string }>('/pengaturan/publik').then((res) => {
			if (res.success && res.data.nama_toko) namaToko = res.data.nama_toko;
		});
		const u = data.user;
		if (u?.cabang_id) {
			api.get<{ id: number; nama: string }[]>('/toko/cabang').then((res) => {
				if (res.success) {
					const cab = res.data.find((c) => c.id === u.cabang_id);
					if (cab) namaCabang = cab.nama;
				}
			});
		}
	});
</script>

<div
	class="app-root flex h-screen flex-col overflow-hidden"
	style="background:var(--bg);color:var(--text);font-family:{FONT_CSS[
		$font
	]};font-size:{$ukuranFont}px"
>
	<!-- Top Navbar -->
	<nav
		class="app-nav sticky top-0 z-50 flex h-11 shrink-0 items-center gap-2 border-b px-1.5 text-sm"
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
			<img src="/logo.png" alt="Logo Stokasir" class="h-[32px] w-[32px]" />
			<span class="font-bold" style="color:var(--accent)">{namaToko}</span>
			{#if namaCabang}
				<span class="text-xs" style="color:var(--text-dim)">· {namaCabang}</span>
			{/if}
		</div>

		<div class="ml-auto flex shrink-0 items-center gap-2">
			<SyncIndicator />
			<NavClock />
			<NavUser />
		</div>
	</nav>
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
