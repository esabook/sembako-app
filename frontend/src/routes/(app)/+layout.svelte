<script lang="ts">
	import { page } from '$app/state';
	import { user, type Role } from '$lib/stores/auth.js';
	import { api } from '$lib/utils/api.js';
	import { onMount } from 'svelte';
	import NavClock from '$lib/components/NavClock.svelte';
	import NavUser from '$lib/components/NavUser.svelte';

	let { children, data } = $props();

	$effect(() => {
		user.set(data.user as import('$lib/stores/auth.js').User);
	});

	type SidebarState = 'expanded' | 'icon' | 'hidden';
	const SIDEBAR_KEY = 'sidebar_state';
	let sidebarState = $state<SidebarState>('icon');
	let sidebarReady = $state(false);
	let idleTimer: ReturnType<typeof setTimeout> | null = null;
	let namaToko = $state('');

	const IDLE_MS = 10_000;

	function resetIdle() {
		if (idleTimer) clearTimeout(idleTimer);
		idleTimer = setTimeout(() => {
			if (sidebarState === 'expanded') sidebarState = 'icon';
		}, IDLE_MS);
	}

	function toggleSidebar() {
		if (sidebarState === 'expanded') {
			sidebarState = 'icon';
			if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
		} else if (sidebarState === 'icon') {
			sidebarState = 'hidden';
			if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
		} else {
			sidebarState = 'expanded';
			resetIdle();
		}
		localStorage.setItem(SIDEBAR_KEY, sidebarState);
	}

	function restoreSidebar() {
		sidebarState = 'expanded';
		localStorage.setItem(SIDEBAR_KEY, 'expanded');
		resetIdle();
	}

	onMount(() => {
		api.get<{ nama_toko: string }>('/pengaturan/publik').then((res) => {
			if (res.success && res.data.nama_toko) namaToko = res.data.nama_toko;
		});

		// Baca preferensi sidebar dari localStorage tanpa transisi (instant)
		const saved = localStorage.getItem(SIDEBAR_KEY);
		if (saved === 'expanded' || saved === 'icon' || saved === 'hidden') {
			sidebarState = saved;
		}
		sidebarReady = true;

		if (sidebarState === 'expanded') resetIdle();
		window.addEventListener('mousemove', resetIdle, { passive: true });
		window.addEventListener('keydown', resetIdle, { passive: true });
		window.addEventListener('pointerdown', resetIdle, { passive: true });
		return () => {
			if (idleTimer) clearTimeout(idleTimer);
			window.removeEventListener('mousemove', resetIdle);
			window.removeEventListener('keydown', resetIdle);
			window.removeEventListener('pointerdown', resetIdle);
		};
	});

	const NAV: { href: string; label: string; roles: Role[]; icon: string }[] = [
		{
			href: '/dashboard', label: 'Dashboard', roles: ['pemilik', 'manajer'],
			icon: 'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 3h2v-2h2v2h2v2h-2v2h-2v-2h-2z'
		},
		{
			href: '/kasir', label: 'Kasir', roles: ['pemilik', 'manajer', 'kasir', 'gudang'],
			icon: 'M7 4V2H5v2H3a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2V2h-2v2H7zm-3 5h16v9H4V9zm2 2v2h2v-2H6zm4 0v2h2v-2h-2zm4 0v2h2v-2h-2zm-8 4v2h2v-2H6zm4 0v2h2v-2h-2z'
		},
		{
			href: '/pelanggan', label: 'Pelanggan', roles: ['pemilik', 'manajer', 'kasir'],
			icon: 'M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z'
		},
		{
			href: '/gudang', label: 'Gudang', roles: ['pemilik', 'manajer', 'gudang'],
			icon: 'M2 7l10-5 10 5v2H2V7zm1 3h18v11H3V10zm4 2v7h2v-7H7zm4 0v7h2v-7h-2zm4 0v7h2v-7h-2z'
		},
		{
			href: '/karyawan', label: 'Karyawan', roles: ['pemilik', 'manajer'],
			icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z'
		},
		{
			href: '/keuangan', label: 'Keuangan', roles: ['pemilik', 'manajer'],
			icon: 'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z'
		},
		{
			href: '/laporan', label: 'Laporan', roles: ['pemilik', 'manajer'],
			icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15h8v2H8zm0-4h8v2H8zm0-4h4v2H8z'
		},
		{
			href: '/harga', label: 'Harga', roles: ['pemilik', 'manajer'],
			icon: 'M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4a2 2 0 0 0-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z'
		},
		{
			href: '/promo', label: 'Promo', roles: ['pemilik', 'manajer'],
			icon: 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z'
		},
		{
			href: '/pengaturan', label: 'Pengaturan', roles: ['pemilik'],
			icon: 'M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96a7.06 7.06 0 0 0-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.477.477 0 0 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 0 0-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z'
		}
	];

	function bolehAkses(roles: Role[]): boolean {
		return $user !== null && roles.includes($user.role);
	}

	let visibleNav = $derived(NAV.filter((item) => bolehAkses(item.roles)));
</script>

<div class="flex min-h-screen flex-col" style="background:var(--bg);color:var(--text)">
	<!-- Top Navbar -->
	<nav
		class="flex h-11 shrink-0 items-center gap-2 border-b px-1.5 text-sm"
		style="background:var(--surface);border-color:var(--border)"
	>
		<div class="flex shrink-0 items-center gap-1.5">
			<img src="/logo.png" alt="Logo Sembako" class="h-[32px] w-[32px]" />
			<span class="hidden font-bold sm:inline" style="color:var(--accent)">{namaToko}</span>
		</div>

		<div class="ml-auto flex shrink-0 items-center gap-2">
			<NavClock />
			<NavUser />
		</div>
	</nav>

	<!-- Body: sidebar selalu tampil + konten -->
	<div class="flex min-h-0 flex-1">
		<!-- Sidebar -->
		{#if sidebarState !== 'hidden'}
		<aside
			class="relative flex shrink-0 flex-col border-r {sidebarReady ? 'transition-all duration-200' : ''}"
			style="background:var(--surface);border-color:var(--border);width:{sidebarState === 'expanded' ? '11rem' : '2.75rem'}"
		>
			<!-- Tombol toggle: pojok kanan atas (cycle: expanded→icon→hidden) -->
			<button
				onclick={toggleSidebar}
				title={sidebarState === 'expanded' ? 'Ciutkan' : sidebarState === 'icon' ? 'Sembunyikan' : ''}
				aria-label={sidebarState === 'expanded' ? 'Ciutkan menu' : 'Sembunyikan menu'}
				class="absolute -right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition-colors"
				style="background:var(--surface);border-color:var(--border);color:var(--text-dim)"
			>
				<svg width="10" height="10" viewBox="0 0 24 24" fill="none">
					{#if sidebarState === 'expanded'}
						<path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
					{:else}
						<path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
					{/if}
				</svg>
			</button>

			<!-- Nav links -->
			<nav class="flex flex-col overflow-y-auto overflow-x-hidden py-2">
				{#each visibleNav as item}
					{@const isActive = page.url.pathname.startsWith(item.href)}
					<a
						href={item.href}
						title={sidebarState === 'icon' ? item.label : undefined}
						class="relative flex h-8 items-center text-sm transition-colors hover-nav-item"
						style={isActive
							? 'color:var(--accent);background:var(--surface2)'
							: 'color:var(--text-dim)'}
						aria-current={isActive ? 'page' : undefined}
					>
						<!-- Vertical line indicator kiri -->
						<span
							class="absolute left-0 top-0 bottom-0 w-0.5 shrink-0"
							style={isActive ? 'background:var(--accent)' : 'background:var(--border)'}
						></span>

						<!-- Icon — posisi kiri selalu sama -->
						<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"
							class="shrink-0 {sidebarState === 'expanded' ? 'ml-4' : 'mx-auto'} {isActive ? 'opacity-100' : 'opacity-70'}">
							<path d={item.icon} />
						</svg>
						<!-- Label hanya saat expanded -->
						{#if sidebarState === 'expanded'}
							<span class="ml-2 truncate font-medium">{item.label}</span>
						{/if}
					</a>
				{/each}
			</nav>
		</aside>
		{/if}

		<!-- Tombol restore saat sidebar hidden -->
		{#if sidebarState === 'hidden'}
			<button
				onclick={restoreSidebar}
				title="Tampilkan menu"
				aria-label="Tampilkan menu"
				class="fixed left-0 top-1/2 z-20 flex h-40 w-1 -translate-y-1/2 items-center justify-center rounded-r border-y border-r shadow-sm transition-colors"
				style="background:var(--surface);border-color:var(--border);color:var(--text-dim)"
			>	</button>
		{/if}

		<!-- Konten utama -->
		<main class="min-h-0 flex-1 overflow-auto p-4">
			{@render children()}
		</main>
	</div>
</div>

<style>
	.hover-nav-item:not([aria-current='page']):hover {
		background: var(--surface2);
		color: var(--text);
	}
</style>
