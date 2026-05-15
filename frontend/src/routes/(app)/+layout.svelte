<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { api } from '$lib/utils/api.js';
	import { user, type Role } from '$lib/stores/auth.js';
	import { tema, type Tema } from '$lib/stores/tema.js';
	import { onMount } from 'svelte';

	let { children } = $props();

	const TEMA_LABELS: Record<Tema, string> = { dark: 'DARK', light: 'LIGHT', eye: 'EYE', bww: '☯', bwb: '☯' };
	const TEMA_URUTAN: Tema[] = ['dark', 'light', 'eye', 'bww', 'bwb'];

	function gantiTema() {
		const idx = TEMA_URUTAN.indexOf($tema);
		tema.set(TEMA_URUTAN[(idx + 1) % TEMA_URUTAN.length]!);
	}

	async function logout() {
		await api.post('/auth/logout', {});
		user.set(null);
		goto('/login');
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
	});

	const NAV: { href: string; label: string; roles: Role[] }[] = [
		{ href: '/dashboard', label: 'Dashboard', roles: ['pemilik', 'manajer'] },
		{ href: '/kasir',     label: 'Kasir',     roles: ['pemilik', 'manajer', 'kasir', 'gudang'] },
		{ href: '/pelanggan', label: 'Pelanggan', roles: ['pemilik', 'manajer', 'kasir'] },
		{ href: '/gudang',    label: 'Gudang',    roles: ['pemilik', 'manajer', 'gudang'] },
		{ href: '/karyawan',  label: 'Karyawan',  roles: ['pemilik', 'manajer'] },
		{ href: '/keuangan',  label: 'Keuangan',  roles: ['pemilik', 'manajer'] },
		{ href: '/laporan',   label: 'Laporan',   roles: ['pemilik', 'manajer'] },
	];

	function bolehAkses(roles: Role[]): boolean {
		return $user !== null && roles.includes($user.role);
	}
</script>

<div class="min-h-screen flex flex-col" style="background:var(--bg);color:var(--text)">
	<!-- Navbar -->
	<nav class="flex items-center gap-2 px-4 h-11 border-b text-sm shrink-0"
		style="background:var(--surface);border-color:var(--border)">
		<span class="font-bold mr-3" style="color:var(--accent)">SEMBAKO</span>

		{#each NAV as item}
			{#if bolehAkses(item.roles)}
				<a
					href={item.href}
					class="px-2 py-1 rounded transition-colors"
					style="{$page.url.pathname.startsWith(item.href)
						? 'background:var(--surface2);color:var(--text)'
						: 'color:var(--text-dim)'}"
				>{item.label}</a>
			{/if}
		{/each}

		<div class="ml-auto flex items-center gap-3">
			<button
				onclick={gantiTema}
				class="text-xs px-2 py-1 rounded border"
				style="border-color:var(--border);color:var(--text-dim)"
			>{TEMA_LABELS[$tema]}</button>

			{#if $user}
				<span class="text-xs" style="color:var(--text-dim)">{$user.nama}</span>
				<button
					onclick={logout}
					class="text-xs px-2 py-1 rounded"
					style="color:var(--danger)"
				>Keluar</button>
			{/if}
		</div>
	</nav>

	<!-- Konten -->
	<main class="flex-1 p-4 flex flex-col min-h-0">
		{@render children()}
	</main>
</div>
