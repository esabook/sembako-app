<svelte:head><title>Error — Stokasir</title></svelte:head>

<script lang="ts">
	import { page } from '$app/state'
</script>

<div class="flex flex-col items-center justify-center py-24 gap-5 text-center">
	<span style="font-size:3rem;line-height:1">
		{page.status === 404 ? '🔍' : '⚠️'}
	</span>
	<div class="space-y-1">
		<h1 class="text-lg font-bold" style="color:var(--text)">
			{page.status === 404 ? 'Halaman tidak ditemukan' : 'Terjadi kesalahan'}
		</h1>
		<p class="text-sm" style="color:var(--text-dim)">
			{page.error?.message ?? `Error ${page.status}`}
		</p>
	</div>
	<a href="/"
		class="px-5 py-2 rounded text-sm font-bold"
		style="background:var(--accent);color:var(--bg)">
		Kembali ke beranda
	</a>
</div>
