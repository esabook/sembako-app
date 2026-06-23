<script lang="ts">
	import { tema, nextTema } from '$lib/stores/tema';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';

	let { children } = $props();

	const gelap = $derived(['dark', 'bwb', 'island', 'klasik', 'lambo'].includes($tema));
</script>

<div class="flex min-h-screen flex-col" style="background:var(--bg);color:var(--text)">
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
					onclick={() => nextTema($tema)}
				>
					{#if gelap}<Sun class="size-4" />{:else}<Moon class="size-4" />{/if}
				</button>
				<a href="/login" class="btn btn-ghost btn-sm">Masuk</a>
				<a
					href="/daftar"
					class="btn btn-sm"
					style="background:var(--accent);color:var(--bg);border-color:var(--accent)"
				>
					Daftar
				</a>
			</div>
		</nav>
	</header>

	<main class="flex-grow">
		{@render children()}
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
					<svg xmlns="http://w3.org" viewBox="0 0 50 50" width="1rem" height="1rem" fill="#229ED9">
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
