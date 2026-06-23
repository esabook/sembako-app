<script lang="ts">
	// Product/usage analytics — konsumen endpoint GET /analytics/usage (Layer A).
	// Visualisasi pakai wrapper chart LayerChart (Layer C).
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/auth.js';
	import { api } from '$lib/utils/api';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import ChartGaris from '$lib/components/chart/ChartGaris.svelte';
	import ChartBatang from '$lib/components/chart/ChartBatang.svelte';

	type UsageData = {
		dari: string;
		sampai: string;
		total: number;
		per_aksi: { aksi: string; jumlah: number }[];
		per_hari: { tanggal: string; jumlah: number }[];
	};

	const LABEL_AKSI: Record<string, string> = {
		checkout: 'Transaksi Kasir',
		barang_masuk: 'Barang Masuk',
		stok_kritis: 'Stok Kritis',
		absensi_masuk: 'Absen Masuk',
		absensi_pulang: 'Absen Pulang',
		approval_disetujui: 'Approval Disetujui',
		approval_ditolak: 'Approval Ditolak'
	};

	$effect(() => {
		if ($user && !['pemilik', 'manajer'].includes($user.role)) goto('/kasir');
	});

	let loading = $state(true);
	let data = $state<UsageData | null>(null);
	let err = $state<string | null>(null);

	// Bentuk data untuk chart — label aksi dimanusiakan, tanggal dipendekkan.
	const perAksi = $derived(
		(data?.per_aksi ?? []).map((r) => ({ aksi: LABEL_AKSI[r.aksi] ?? r.aksi, jumlah: r.jumlah }))
	);
	const perHari = $derived(
		(data?.per_hari ?? []).map((r) => ({ tanggal: r.tanggal.slice(5), jumlah: r.jumlah }))
	);

	async function muat() {
		loading = true;
		err = null;
		try {
			const res = await api.get<UsageData>('/analytics/usage');
			if (!res.success) throw new Error('Gagal memuat analitik');
			data = res.data;
		} catch (e) {
			err = e instanceof Error ? e.message : 'Gagal memuat analitik';
		} finally {
			loading = false;
		}
	}

	onMount(muat);
</script>

<svelte:head><title>Analitik Penggunaan — Stokasir</title></svelte:head>

<div class="flex flex-col gap-5">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-base font-bold">Analitik Penggunaan</h2>
			<p class="mt-0.5 text-xs" style="color:var(--text-dim)">
				Aktivitas aplikasi 30 hari terakhir
			</p>
		</div>
		<button
			onclick={muat}
			class="rounded border px-2 py-1 text-xs"
			style="border-color:var(--border);color:var(--text-dim)">Refresh</button
		>
	</div>

	{#if loading}
		<div
			class="space-y-3 rounded border p-4"
			style="background:var(--surface);border-color:var(--border)"
		>
			<Skeleton w="35%" h="0.875rem" />
			<Skeleton w="100%" h="13rem" />
		</div>
	{:else if err}
		<p class="text-sm" style="color:var(--danger)">{err}</p>
	{:else if data}
		<div class="grid gap-3" style="grid-template-columns:repeat(auto-fill,minmax(175px,1fr))">
			<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
				<p class="mb-1 text-xs" style="color:var(--text-dim)">TOTAL EVENT</p>
				<p class="text-2xl font-bold" style="color:var(--accent)">{data.total}</p>
				<p class="mt-1 text-xs" style="color:var(--text-dim)">{data.dari} → {data.sampai}</p>
			</div>
			<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
				<p class="mb-1 text-xs" style="color:var(--text-dim)">JENIS AKTIVITAS</p>
				<p class="text-2xl font-bold">{data.per_aksi.length}</p>
			</div>
		</div>

		{#if data.total === 0}
			<p
				class="rounded border p-4 text-center text-xs"
				style="background:var(--surface);border-color:var(--border);color:var(--text-dim)"
			>
				Belum ada aktivitas tercatat di rentang ini.
			</p>
		{:else}
			<div class="flex flex-col gap-2">
				<h3 class="text-xs font-bold tracking-wider uppercase" style="color:var(--text-dim)">
					Tren Harian
				</h3>
				<div
					class="rounded border p-4"
					style="background:var(--surface);border-color:var(--border)"
				>
					<ChartGaris data={perHari} x="tanggal" y="jumlah" />
				</div>
			</div>

			<div class="flex flex-col gap-2">
				<h3 class="text-xs font-bold tracking-wider uppercase" style="color:var(--text-dim)">
					Per Jenis Aktivitas
				</h3>
				<div
					class="rounded border p-4"
					style="background:var(--surface);border-color:var(--border)"
				>
					<ChartBatang data={perAksi} x="aksi" y="jumlah" />
				</div>
			</div>
		{/if}
	{/if}
</div>
