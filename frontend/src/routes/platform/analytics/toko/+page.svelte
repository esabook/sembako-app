<script lang="ts">
	// Platform analytics — usage lintas-tenant per toko. Auth platform (padmin).
	import { onMount } from 'svelte';
	import { padmin } from '../../platform.api';
	import ChartBatang from '$lib/components/chart/ChartBatang.svelte';
	import ChartGaris from '$lib/components/chart/ChartGaris.svelte';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	type PerToko = { toko_id: number; nama: string; kode_toko: string; total: number; terakhir: string };
	type Data = {
		dari: string;
		sampai: string;
		total_global: number;
		per_toko: PerToko[];
		per_hari: { tanggal: string; jumlah: number }[];
	};

	let loading = $state(true);
	let err = $state<string | null>(null);
	let data = $state<Data | null>(null);

	const chartToko = $derived(
		(data?.per_toko ?? []).slice(0, 12).map((t) => ({ nama: t.nama, jumlah: t.total }))
	);
	const chartHari = $derived(
		(data?.per_hari ?? []).map((r) => ({ tanggal: r.tanggal.slice(5), jumlah: r.jumlah }))
	);

	function tanggal(s: string): string {
		return s ? new Date(s).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
	}

	async function load() {
		loading = true;
		err = null;
		const res = await padmin.get<Data>('/platform/analytics');
		if (res.success) data = res.data;
		else err = res.error;
		loading = false;
	}

	onMount(load);
</script>

<svelte:head>
	<title>Analytics Toko · Admin Platform</title>
</svelte:head>

<header
	class="sticky top-0 z-20 border-b backdrop-blur"
	style="border-color:var(--border);background:color-mix(in srgb, var(--bg) 85%, transparent)"
>
	<div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
		<div class="flex items-center gap-3">
			<a href="/platform/toko" class="btn btn-ghost btn-sm" aria-label="Kembali">
				<ArrowLeft class="size-4" />
			</a>
			<span class="text-lg font-bold tracking-tight" style="color:var(--accent)">
				Stokasir · Analytics
			</span>
		</div>
		<button class="btn btn-ghost btn-sm" onclick={load} disabled={loading}>
			<RefreshCw class="size-4" />
			<span class="hidden sm:inline">Muat ulang</span>
		</button>
	</div>
</header>

<main class="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6">
	{#if loading}
		<p class="text-sm" style="color:var(--text-dim)">Memuat…</p>
	{:else if err}
		<p class="text-sm" style="color:var(--danger)">{err}</p>
	{:else if data}
		<div class="grid gap-3" style="grid-template-columns:repeat(auto-fill,minmax(175px,1fr))">
			<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
				<p class="mb-1 text-xs" style="color:var(--text-dim)">TOTAL EVENT</p>
				<p class="text-2xl font-bold" style="color:var(--accent)">{data.total_global}</p>
				<p class="mt-1 text-xs" style="color:var(--text-dim)">{data.dari} → {data.sampai}</p>
			</div>
			<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
				<p class="mb-1 text-xs" style="color:var(--text-dim)">TOKO AKTIF</p>
				<p class="text-2xl font-bold">{data.per_toko.length}</p>
				<p class="mt-1 text-xs" style="color:var(--text-dim)">punya aktivitas</p>
			</div>
		</div>

		{#if data.total_global === 0}
			<p
				class="rounded border p-4 text-center text-xs"
				style="background:var(--surface);border-color:var(--border);color:var(--text-dim)"
			>
				Belum ada aktivitas tercatat di rentang ini.
			</p>
		{:else}
			<div class="flex flex-col gap-2">
				<h3 class="text-xs font-bold tracking-wider uppercase" style="color:var(--text-dim)">
					Tren Harian (semua toko)
				</h3>
				<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
					<ChartGaris data={chartHari} x="tanggal" y="jumlah" />
				</div>
			</div>

			<div class="flex flex-col gap-2">
				<h3 class="text-xs font-bold tracking-wider uppercase" style="color:var(--text-dim)">
					Event per Toko (top 12)
				</h3>
				<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
					<ChartBatang data={chartToko} x="nama" y="jumlah" />
				</div>
			</div>

			<div
				class="overflow-hidden rounded border"
				style="background:var(--surface);border-color:var(--border)"
			>
				<div class="overflow-x-auto">
					<table class="w-full text-xs">
						<thead>
							<tr style="background:var(--surface2);border-bottom:1px solid var(--border)">
								<th class="px-3 py-2 text-left font-semibold" style="color:var(--text-dim)">Toko</th>
								<th class="px-3 py-2 text-right font-semibold" style="color:var(--text-dim)">Event</th>
								<th
									class="hidden px-3 py-2 text-right font-semibold sm:table-cell"
									style="color:var(--text-dim)">Aktivitas Terakhir</th
								>
							</tr>
						</thead>
						<tbody>
							{#each data.per_toko as t (t.toko_id)}
								<tr class="border-t" style="border-color:var(--border)">
									<td class="px-3 py-2" style="color:var(--text)">
										{t.nama}
										<span style="color:var(--text-dim)">· {t.kode_toko}</span>
									</td>
									<td class="px-3 py-2 text-right font-mono tabular-nums">{t.total}</td>
									<td
										class="hidden px-3 py-2 text-right tabular-nums sm:table-cell"
										style="color:var(--text-dim)">{tanggal(t.terakhir)}</td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{/if}
</main>
