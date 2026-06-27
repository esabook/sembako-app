<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { api } from '$lib/utils/api';
	import { toast } from '$lib/stores/ui.store';

	let { data } = $props();
	const user = $derived(data.user);

	const isPemilik = $derived(user?.role === 'pemilik');
	const isHapus = $derived(user?.sisa_hari_hapus !== null && user?.sisa_hari_hapus !== undefined);
	const isNonaktif = $derived(user?.status_toko === 'deactivated' && !isHapus);

	let loading = $state(false);

	async function batalkanOperasi() {
		loading = true;
		const path = isHapus ? 'batal-hapus' : 'aktifkan';
		const res = await api.post(`/akun/toko/${path}`, {});
		loading = false;
		if (res.success) {
			toast.sukses(isHapus ? 'Penghapusan dibatalkan.' : 'Toko diaktifkan kembali.');
			await invalidateAll();
			goto('/dashboard');
		} else {
			toast.error(res.error || 'Gagal memproses');
		}
	}
</script>

<svelte:head>
	<title>Status Toko — Stokasir</title>
</svelte:head>

<div
	class="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center"
>
	<!-- Status icon -->
	<div
		class="mb-8 flex h-20 w-20 items-center justify-center rounded-full"
		style={isHapus
			? 'background:color-mix(in srgb,var(--danger) 10%,transparent)'
			: 'background:color-mix(in srgb,var(--warn,#f59e0b) 12%,transparent)'}
	>
		{#if isHapus}
			<!-- Trash icon -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="36"
				height="36"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				style="color:var(--danger)"
			>
				<polyline points="3 6 5 6 21 6" />
				<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
				<path d="M10 11v6" />
				<path d="M14 11v6" />
				<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
			</svg>
		{:else}
			<!-- Pause icon -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="36"
				height="36"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				style="color:var(--warn,#f59e0b)"
			>
				<circle cx="12" cy="12" r="10" />
				<line x1="10" y1="15" x2="10" y2="9" />
				<line x1="14" y1="15" x2="14" y2="9" />
			</svg>
		{/if}
	</div>

	<!-- Headline -->
	<h1
		class="mb-3 text-4xl leading-tight font-semibold"
		style="color:var(--text);letter-spacing:-0.374px"
	>
		{#if isHapus}
			Toko Dijadwalkan Dihapus
		{:else}
			Toko Sedang Nonaktif
		{/if}
	</h1>

	<!-- Subtext -->
	<p
		class="mb-2 max-w-md text-[17px] leading-[1.47] tracking-[-0.374px]"
		style="color:var(--text-dim)"
	>
		{#if isHapus}
			Toko ini dijadwalkan untuk dihapus dalam
			<strong style="color:var(--text)">{user?.sisa_hari_hapus} hari</strong>. Seluruh akses
			dibekukan selama masa tenggang.
		{:else}
			Akses ke semua fitur toko dibekukan sementara. Toko bisa diaktifkan kembali kapan saja.
		{/if}
	</p>

	{#if isPemilik}
		<p class="mb-10 text-sm" style="color:var(--text-dim)">
			Kamu bisa membatalkan operasi ini dan memulihkan akses penuh.
		</p>
	{:else}
		<p class="mb-10 text-sm" style="color:var(--text-dim)">
			Hubungi pemilik toko untuk memulihkan akses.
		</p>
	{/if}

	<!-- CTA group -->
	<div class="mt-4 flex flex-col items-center gap-3 sm:flex-row">
		{#if isPemilik}
			<button
				onclick={batalkanOperasi}
				disabled={loading}
				class="btn rounded-full px-[22px] py-[11px] text-[17px] leading-none font-normal transition-transform active:scale-95 disabled:opacity-60"
				style="background:var(--primary,#0066cc);color:#ffffff"
			>
				{#if loading}
					Memproses…
				{:else if isHapus}
					Batalkan Penghapusan
				{:else}
					Aktifkan Toko Kembali
				{/if}
			</button>
		{/if}

		<a
			href="/"
			class="btn rounded-full border px-[22px] py-[11px] text-[17px] leading-none font-normal transition-transform active:scale-95"
			style="color:var(--primary,#0066cc);border-color:var(--primary,#0066cc)"
		>
			Kembali ke Beranda
		</a>
	</div>

	<!-- Fine print -->
	{#if isPemilik && isHapus}
		<p class="mt-12 text-xs" style="color:var(--text-dim);letter-spacing:-0.12px">
			Jika masa tenggang habis, seluruh data toko dihapus permanen dan tidak bisa dipulihkan.
		</p>
	{/if}
</div>
