<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { font, FONT_CSS } from '$lib/stores/font.js';
	import { ukuranFont } from '$lib/stores/ukuran-font.js';
	import { temaMode, temaSkin } from '$lib/stores/tema';
	import { onMount } from 'svelte';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import LogOut from '@lucide/svelte/icons/log-out';

	let { children, data } = $props();

	const gelap = $derived($temaMode === 'dark');
	const user = $derived(data.user);

	function toggleGelap() {
		temaSkin.set('normal');
		temaMode.set($temaMode === 'dark' ? 'light' : 'dark');
	}

	let buka = $state(false);
	let ref = $state<HTMLDivElement>();

	function tutupJikaLuar(e: MouseEvent) {
		if (ref && !ref.contains(e.target as Node)) buka = false;
	}

	onMount(() => {
		document.addEventListener('click', tutupJikaLuar);
		return () => document.removeEventListener('click', tutupJikaLuar);
	});

	async function logout() {
		buka = false;
		await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
		await invalidateAll();
		goto('/');
	}
</script>

<div
	class="flex min-h-dvh w-full flex-col overflow-auto"
	style="background:var(--bg);color:var(--text);font-family:{FONT_CSS[$font]};font-size:{$ukuranFont}px"
>
	<header
		class="sticky top-0 z-20 border-b backdrop-blur"
		style="border-color:var(--border);background:color-mix(in srgb, var(--bg) 85%, transparent)"
	>
		<nav class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
			<a href="/" class="flex items-center gap-2">
				<enhanced:img src="$lib/assets/logo.webp" alt="" class="h-8 w-8" fetchpriority="auto" />
				<span class="text-lg font-bold tracking-tight" style="color:var(--accent)">Stokasir</span>
			</a>
			<div class="flex items-center gap-2">
				<button
					class="btn btn-square btn-ghost btn-sm"
					title="Ganti tema"
					aria-label="Ganti tema"
					onclick={toggleGelap}
				>
					{#if gelap}<Sun class="size-4" />{:else}<Moon class="size-4" />{/if}
				</button>

				{#if user}
					<div class="relative" bind:this={ref}>
						<button
							onclick={() => (buka = !buka)}
							class="flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors"
							aria-label="Menu akun"
						>
							<span
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[0.7em] font-bold"
								style="background:var(--surface);color:var(--accent)"
								>{user.nama?.[0]?.toUpperCase() ?? '?'}</span
							>
						</button>

						{#if buka}
							<div
								class="absolute top-full right-0 z-50 mt-1 w-48 rounded border shadow-lg"
								style="background:var(--surface);border-color:var(--border)"
							>
								<div class="border-b px-3 py-2.5" style="border-color:var(--border)">
									<div class="truncate text-sm font-medium" style="color:var(--text)">
										{user.nama ?? '—'}
									</div>
								</div>
								<div class="flex flex-col gap-0.5 px-2 py-2">
									<button
										onclick={() => { buka = false; goto('/dashboard'); }}
										class="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-[var(--surface2)]"
										style="color:var(--text-dim)"
									>
										<span>Dashboard</span>
										<LayoutDashboard size="1rem" />
									</button>
								</div>
								<div class="border-t px-2 py-2" style="border-color:var(--border)">
									<button
										onclick={logout}
										class="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors hover:opacity-80"
										style="color:var(--danger)"
									>
										<span>Keluar</span>
										<LogOut size="1rem" />
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</nav>
	</header>

	<main class="flex-grow">
		<div class="mx-auto max-w-2xl px-4 py-8">
			{@render children()}
		</div>
	</main>

	<footer class="footer border-t" style="border-color:var(--border)">
		<div
			class="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between"
			style="color:var(--text-dim)"
		>
			<span>© Stokasir | Aplikasi manajemen stok &amp; kasir untuk grosir &amp; eceran.</span>
			<div class="flex gap-4">
				<a
					href="https://t.me/stokasir"
					class="flex gap-1"
					target="_blank"
					aria-label="Contact us on Telegram"
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="1rem" height="1rem" fill="#229ED9">
						<path
							d="M25,1C11.7,1,1,11.7,1,25S11.7,49,25,49S49,38.3,49,25S38.3,1,25,1z M39.4,15.7l-4.7,22.1 c-0.3,1.3-1,1.6-2.1,1.1l-5.9-4.3l-2.8,2.7c-0.3,0.3-0.6,0.5-1.1,0.5l0.4-5.8l10.5-9.5c0.1-0.1,0-0.3-0.2-0.4 c-0.2-0.1-0.5,0-0.7,0.1l-13,8.2l-5.5-1.7c-1.2-0.4-1.2-1.2,0.3-1.8l21.3-8.2C39,15.1,39.6,15.3,39.4,15.7z"
						/>
					</svg>
					Telegram
				</a>
				<a href="/syarat" class="hover:underline">Syarat</a>
				<a href="/privasi" class="hover:underline">Privasi</a>
			</div>
		</div>
	</footer>
</div>
