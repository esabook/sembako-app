<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { api } from '$lib/utils/api.js';
	import { user, type Role } from '$lib/stores/auth.js';
	import { onMount } from 'svelte';
	import NavClock from '$lib/components/NavClock.svelte';
	import NavUser from '$lib/components/NavUser.svelte';

	let { children } = $props();

	let navExpanded = $state(false);
	let idleTimer: ReturnType<typeof setTimeout> | null = null;

	const IDLE_MS = 10_000;

	function resetIdle() {
		if (idleTimer) clearTimeout(idleTimer);
		idleTimer = setTimeout(() => {
			navExpanded = false;
		}, IDLE_MS);
	}

	function toggleNav() {
		navExpanded = !navExpanded;
		if (navExpanded) resetIdle();
		else if (idleTimer) {
			clearTimeout(idleTimer);
			idleTimer = null;
		}
	}

	onMount(async () => {
		if (!$user) {
			const res = await api.get<{ id: number; nama: string; role: string }>('/auth/me');
			if (res.success) {
				user.set(res.data as import('$lib/stores/auth.js').User);
			} else {
				goto('/login');
			}
		}
		resetIdle();
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

	const NAV: { href: string; label: string; roles: Role[] }[] = [
		{ href: '/dashboard', label: 'Dashboard', roles: ['pemilik', 'manajer'] },
		{ href: '/kasir', label: 'Kasir', roles: ['pemilik', 'manajer', 'kasir', 'gudang'] },
		{ href: '/pelanggan', label: 'Pelanggan', roles: ['pemilik', 'manajer', 'kasir'] },
		{ href: '/gudang', label: 'Gudang', roles: ['pemilik', 'manajer', 'gudang'] },
		{ href: '/karyawan', label: 'Karyawan', roles: ['pemilik', 'manajer'] },
		{ href: '/keuangan', label: 'Keuangan', roles: ['pemilik', 'manajer'] },
		{ href: '/laporan', label: 'Laporan', roles: ['pemilik', 'manajer'] }
	];

	function bolehAkses(roles: Role[]): boolean {
		return $user !== null && roles.includes($user.role);
	}
</script>

<div class="flex min-h-screen flex-col" style="background:var(--bg);color:var(--text)">
	<!-- Navbar -->
	<nav
		class="flex h-11 shrink-0 items-center gap-2 border-b px-3 text-sm"
		style="background:var(--surface);border-color:var(--border)"
	>
		<!-- Logo + Brand -->
		<div class="flex shrink-0 items-center gap-1.5">
			<img src="logo.png" alt="Logo Sembako" class="h-[32px] w-[32px]" />
			<span class="font-bold" style="color:var(--accent)">SEMBAKO</span>
		</div>

		<!-- Toggle button -->
		<button
			onclick={toggleNav}
			title={navExpanded ? 'Sembunyikan menu' : 'Tampilkan menu'}
			class="flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors"
			style="color:var(--text-dim)"
		>
			<svg
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				{#if navExpanded}
					<path
						d="M15 18l-6-6 6-6"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				{:else}
					<path
						d="M9 18l6-6-6-6"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				{/if}
			</svg>
		</button>

		<!-- Nav links -->
		{#if navExpanded}
			<div class="flex items-center gap-1 overflow-x-auto">
				{#each NAV as item}
					{#if bolehAkses(item.roles)}
						<a
							href={item.href}
							class="rounded px-2 py-1 whitespace-nowrap transition-colors"
							style={page.url.pathname.startsWith(item.href)
								? 'background:var(--surface2);color:var(--text)'
								: 'color:var(--text-dim)'}>{item.label}</a
						>
					{/if}
				{/each}
			</div>
		{/if}

		<div class="ml-auto flex shrink-0 items-center gap-2">
			<NavClock />
			<NavUser />
		</div>
	</nav>

	<!-- Konten -->
	<main class="flex min-h-0 flex-1 flex-col p-4">
		{@render children()}
	</main>
</div>
