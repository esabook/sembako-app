<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>Error — Stokasir</title></svelte:head>

<div
	class="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center"
	style="background:var(--bg,#111);color:var(--text,#eee)"
>
	<span style="font-size:3.5rem;line-height:1">
		{page.status === 404 ? '🔍' : '⚠️'}
	</span>
	<div class="space-y-1">
		<h1 class="font-bold">
			{page.status === 404 ? 'Halaman tidak ditemukan' : 'Terjadi kesalahan'}
		</h1>
		<p class="text-sm" style="color:var(--text-dim,#888)">
			{page.error?.message ?? `Error ${page.status}`}
		</p>
	</div>
	<a
		href="/"
		class="rounded px-5 py-2 text-sm font-bold"
		style="background:var(--accent,#22c55e);color:var(--bg,#111)"
	>
		Kembali ke beranda
	</a>
</div>
