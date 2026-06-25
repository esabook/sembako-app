<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>Error — Stokasir</title></svelte:head>

<div class="flex flex-col items-center justify-center gap-5 py-24 text-center">
	<span style="font-size:3rem;line-height:1">
		{page.status === 404 ? '🔍' : '⚠️'}
	</span>
	<div class="space-y-1">
		<h1 class="font-bold" style="color:var(--text)">
			{page.status === 404 ? 'Halaman tidak ditemukan' : 'Terjadi kesalahan'}
		</h1>
		<p class="text-sm" style="color:var(--text-dim)">
			{page.error?.message ?? `Error ${page.status}`}
		</p>
	</div>
	<a
		href="/"
		class="rounded px-5 py-2 text-sm font-bold"
		style="background:var(--accent);color:var(--bg)"
	>
		Kembali ke beranda
	</a>
</div>
