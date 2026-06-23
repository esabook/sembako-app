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
			<span>© Stokasir ◉ manajemen stok &amp; kasir untuk grosir &amp; eceran.</span>
			<div class="flex gap-4">
				<a href="https://wa.me/6282248396070" class="hover:underline">WhatsApp</a>
				<a href="/syarat" class="hover:underline">Syarat</a>
				<a href="/privasi" class="hover:underline">Privasi</a>
			</div>
		</div>
	</footer>
</div>
