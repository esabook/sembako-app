<script lang="ts">
	// Platform analytics — KPI bisnis SaaS: toko per status, revenue, pertumbuhan.
	import { onMount } from 'svelte';
	import { padmin } from '../platform.api';
	import ChartBatang from '$lib/components/chart/ChartBatang.svelte';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Activity from '@lucide/svelte/icons/activity';

	type PerBulan = { bulan: string; pendapatan: number; toko_baru: number };
	type Ringkasan = {
		total_toko: number;
		per_status: Record<string, number>;
		toko_baru_7d: number;
		toko_baru_30d: number;
		pendapatan_bulan_ini: number;
		pendapatan_total: number;
		per_bulan: PerBulan[];
	};

	let loading = $state(true);
	let err = $state<string | null>(null);
	let data = $state<Ringkasan | null>(null);

	const chartRevenue = $derived(
		(data?.per_bulan ?? []).map((b) => ({ bulan: b.bulan.slice(5), jumlah: b.pendapatan }))
	);
	const chartTokoBaru = $derived(
		(data?.per_bulan ?? []).map((b) => ({ bulan: b.bulan.slice(5), jumlah: b.toko_baru }))
	);

	const STATUS_WARNA: Record<string, string> = {
		aktif: 'var(--success)',
		trial: 'var(--info)',
		suspended: 'var(--danger)',
		deactivated: 'var(--warning)',
		deleted: 'var(--text-dim)'
	};

	function rupiah(n: number): string {
		if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1) + 'jt';
		if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
		return 'Rp ' + n.toLocaleString('id-ID');
	}

	function rupiahFull(n: number): string {
		return 'Rp ' + n.toLocaleString('id-ID');
	}

	async function load() {
		loading = true;
		err = null;
		const res = await padmin.get<Ringkasan>('/platform/ringkasan');
		if (res.success) data = res.data;
		else err = res.error;
		loading = false;
	}

	onMount(load);
</script>

<svelte:head>
	<title>Analytics Platform · Admin Platform</title>
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
		<div class="flex items-center gap-2">
			<a class="btn btn-ghost btn-sm" href="/platform/analytics/toko">
				<Activity class="size-4" />
				<span class="hidden sm:inline">Usage per Toko</span>
			</a>
			<button class="btn btn-ghost btn-sm" onclick={load} disabled={loading}>
				<RefreshCw class="size-4" />
				<span class="hidden sm:inline">Muat ulang</span>
			</button>
		</div>
	</div>
</header>

<main class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
	{#if loading}
		<p class="text-sm" style="color:var(--text-dim)">Memuat…</p>
	{:else if err}
		<p class="text-sm" style="color:var(--danger)">{err}</p>
	{:else if data}
		<!-- KPI baris atas -->
		<div class="grid gap-3" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">
			<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
				<p class="mb-1 text-xs font-semibold uppercase tracking-wider" style="color:var(--text-dim)">
					Total Toko
				</p>
				<p class="text-2xl font-bold" style="color:var(--accent)">{data.total_toko}</p>
			</div>
			<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
				<p class="mb-1 text-xs font-semibold uppercase tracking-wider" style="color:var(--text-dim)">
					Baru 30 Hari
				</p>
				<p class="text-2xl font-bold">{data.toko_baru_30d}</p>
				<p class="mt-1 text-xs" style="color:var(--text-dim)">{data.toko_baru_7d} dalam 7 hari</p>
			</div>
			<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
				<p class="mb-1 text-xs font-semibold uppercase tracking-wider" style="color:var(--text-dim)">
					Pendapatan Bulan Ini
				</p>
				<p class="text-2xl font-bold" style="color:var(--success)">{rupiah(data.pendapatan_bulan_ini)}</p>
			</div>
			<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
				<p class="mb-1 text-xs font-semibold uppercase tracking-wider" style="color:var(--text-dim)">
					Total Pendapatan
				</p>
				<p class="text-2xl font-bold">{rupiah(data.pendapatan_total)}</p>
				<p class="mt-1 text-xs" style="color:var(--text-dim)">{rupiahFull(data.pendapatan_total)}</p>
			</div>
		</div>

		<!-- Status toko -->
		<div class="flex flex-col gap-2">
			<h3 class="text-xs font-bold uppercase tracking-wider" style="color:var(--text-dim)">
				Toko per Status
			</h3>
			<div
				class="grid gap-3 rounded border p-4"
				style="background:var(--surface);border-color:var(--border);grid-template-columns:repeat(auto-fill,minmax(110px,1fr))"
			>
				{#each Object.entries(data.per_status) as [status, jumlah] (status)}
					<div class="flex flex-col gap-1">
						<p
							class="text-xs font-semibold capitalize"
							style="color:{STATUS_WARNA[status] ?? 'var(--text-dim)'}"
						>
							{status}
						</p>
						<p class="text-xl font-bold tabular-nums">{jumlah}</p>
					</div>
				{/each}
			</div>
		</div>

		<!-- Chart pendapatan per bulan -->
		<div class="flex flex-col gap-2">
			<h3 class="text-xs font-bold uppercase tracking-wider" style="color:var(--text-dim)">
				Pendapatan per Bulan (6 bulan terakhir)
			</h3>
			<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
				{#if chartRevenue.every((r) => r.jumlah === 0)}
					<p class="text-center text-xs" style="color:var(--text-dim)">Belum ada pembayaran disetujui.</p>
				{:else}
					<ChartBatang
						data={chartRevenue}
						x="bulan"
						y="jumlah"
						warna="var(--success)"
						formatNilai={rupiah}
					/>
				{/if}
			</div>
		</div>

		<!-- Chart toko baru per bulan -->
		<div class="flex flex-col gap-2">
			<h3 class="text-xs font-bold uppercase tracking-wider" style="color:var(--text-dim)">
				Registrasi Toko Baru per Bulan (6 bulan terakhir)
			</h3>
			<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
				{#if chartTokoBaru.every((r) => r.jumlah === 0)}
					<p class="text-center text-xs" style="color:var(--text-dim)">Belum ada registrasi.</p>
				{:else}
					<ChartBatang data={chartTokoBaru} x="bulan" y="jumlah" />
				{/if}
			</div>
		</div>
	{/if}
</main>
