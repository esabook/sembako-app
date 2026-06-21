<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/auth.js';
	import { createReturStore } from './retur.store.svelte.js';
	import { fmtTgl, LABEL_METODE, fmt } from './retur.logic.js';
	import Button from '$lib/components/ui/Button.svelte';
	import DateRangePicker from '$lib/components/ui/daterangepicker/daterangepicker.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import ReturBuatSlideOver from './ReturBuatSlideOver.svelte';
	import ReturDetailSlideOver from './ReturDetailSlideOver.svelte';

	$effect(() => {
		if ($user && !['pemilik', 'manajer', 'kasir'].includes($user.role)) goto('/kasir');
	});

	const s = createReturStore();

	onMount(() => {
		s.init();
	});
</script>

<svelte:head><title>Retur Penjualan — Stokasir</title></svelte:head>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') history.back();
	}}
/>

<div class="flex min-h-[calc(100vh-44px)] flex-col gap-4">
	<!-- Header -->
	<div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="font-bold" style="color:var(--text)">Retur Penjualan</h1>
			<p class="text-xs" style="color:var(--text-dim)">
				Kembalikan barang dari transaksi penjualan
			</p>
		</div>
		<div class="flex">
			<Button variant="primary" size="sm" onclick={s.bukaBuat} clasz="w-full md:w-auto"
				>+ Buat Retur</Button
			>
		</div>
	</div>

	<!-- Filter -->
	<div
		class="flex flex-col gap-2 rounded border p-3 text-sm sm:flex-row sm:items-center"
		style="background:var(--surface);border-color:var(--border)"
	>
		<DateRangePicker clasz="w-full sm:w-auto" bind:from={s.filterDari} bind:to={s.filterSampai} />
		<button
			onclick={s.muat}
			disabled={s.loading}
			class="rounded px-3 py-1 text-sm font-bold disabled:opacity-60"
			style="background:var(--accent);color:var(--bg)"
		>
			{#if s.loading}<Spinner size={14} warna="currentColor" />{:else}Cari{/if}
		</button>
	</div>

	{#if s.returList.length > 0}
		<div
			class="flex items-center justify-between rounded border px-3 py-2 text-xs"
			style="border-color:var(--border);color:var(--text-dim);background:var(--surface)"
		>
			<span>{s.returList.length} retur ditemukan</span>
			<span class="font-bold" style="color:var(--danger)">
				Total: -Rp {fmt(s.returList.reduce((acc, r) => acc + r.total_retur, 0))}
			</span>
		</div>
	{/if}

	<!-- Tabel retur -->
	<div class="-mt-3 rounded border" style="background:var(--surface);border-color:var(--border)">
		{#if s.loading}
			<div class="flex justify-center py-6"><Spinner /></div>
		{:else if s.error}
			<p class="p-6 text-center text-sm" style="color:var(--danger)">{s.error}</p>
		{:else if s.returList.length === 0}
			<p class="p-8 text-center text-sm" style="color:var(--text-dim)">
				Belum ada retur pada periode ini.
			</p>
		{:else}
			<!-- Card view — mobile -->
			<div class="md:hidden">
				{#each s.returList as r (r.id)}
					<div class="border-b px-3 py-3" style="border-color:var(--border)">
						<!-- Row 1: no_retur | kasir -->
						<div class="flex items-center justify-between">
							<span class="font-mono text-xs font-bold" style="color:var(--accent)"
								>{r.no_retur}</span
							>
							<span class="text-xs" style="color:var(--text-dim)">{r.kasir_nama ?? '-'}</span>
						</div>
						<!-- Row 2: no_transaksi | metode -->
						<div class="mt-0.5 flex items-center justify-between">
							<span class="font-mono text-xs" style="color:var(--text-dim)"
								>{r.no_transaksi ?? '-'}</span
							>
							<span
								class="rounded px-1.5 py-0.5 text-[10px] font-bold"
								style={r.metode_refund === 'tunai'
									? 'background:rgba(0,230,118,0.12);color:var(--accent)'
									: r.metode_refund === 'kurang_piutang'
										? 'background:rgba(64,196,255,0.12);color:var(--info)'
										: 'background:rgba(255,179,0,0.12);color:var(--warn)'}
								>{LABEL_METODE[r.metode_refund]}</span
							>
						</div>
						<!-- Gap -->
						<div class="mt-2 flex items-center justify-between">
							<span class="font-mono text-xs font-bold" style="color:var(--danger)"
								>-Rp {fmt(r.total_retur)}</span
							>
							<span class="text-xs" style="color:var(--text-dim)">{fmtTgl(r.tanggal)}</span>
						</div>
						<!-- Alasan -->
						{#if r.alasan}
							<p class="mt-0.5 truncate text-xs" style="color:var(--text)">{r.alasan}</p>
						{/if}
						<!-- Detail button -->
						<div class="mt-2 border-t pt-2" style="border-color:var(--border)">
							<button onclick={() => s.lihatDetail(r.id)} class="btn w-full btn-xs">Detail</button>
						</div>
					</div>
				{/each}
			</div>

			<!-- Table view — desktop -->
			<div class="hidden overflow-x-auto md:block">
				<table class="w-full text-xs">
					<thead>
						<tr class="border-b" style="border-color:var(--border)">
							<th
								class="w-px px-3 py-2 text-left font-semibold whitespace-nowrap"
								style="color:var(--text-dim)">No Retur</th
							>
							<th
								class="w-px px-3 py-2 text-left font-semibold whitespace-nowrap"
								style="color:var(--text-dim)">No Transaksi Asal</th
							>
							<th
								class="w-px px-3 py-2 text-left font-semibold whitespace-nowrap"
								style="color:var(--text-dim)">Tanggal</th
							>
							<th class="px-3 py-2 text-left font-semibold" style="color:var(--text-dim)">Metode</th
							>
							<th
								class="w-px px-3 py-2 text-right font-semibold whitespace-nowrap"
								style="color:var(--text-dim)">Total Retur</th
							>
							<th
								class="w-px px-3 py-2 text-left font-semibold whitespace-nowrap"
								style="color:var(--text-dim)">Kasir</th
							>
							<th class="px-3 py-2 text-left font-semibold" style="color:var(--text-dim)">Alasan</th
							>
							<th class="px-3 py-2"></th>
						</tr>
					</thead>
					<tbody>
						{#each s.returList as r (r.id)}
							<tr
								class="border-b transition-colors hover:bg-[var(--surface2)]"
								style="border-color:var(--border)"
							>
								<td
									class="w-px px-3 py-2 font-mono font-bold whitespace-nowrap"
									style="color:var(--accent)">{r.no_retur}</td
								>
								<td class="w-px px-3 py-2 font-mono whitespace-nowrap" style="color:var(--text-dim)"
									>{r.no_transaksi ?? '-'}</td
								>
								<td class="w-px px-3 py-2 whitespace-nowrap" style="color:var(--text)"
									>{fmtTgl(r.tanggal)}</td
								>
								<td class="w-px px-3 py-2 whitespace-nowrap">
									<span
										class="rounded px-1.5 py-0.5 text-[10px] font-bold"
										style={r.metode_refund === 'tunai'
											? 'background:rgba(0,230,118,0.12);color:var(--accent)'
											: r.metode_refund === 'kurang_piutang'
												? 'background:rgba(64,196,255,0.12);color:var(--info)'
												: 'background:rgba(255,179,0,0.12);color:var(--warn)'}
									>
										{LABEL_METODE[r.metode_refund]}
									</span>
								</td>
								<td
									class="w-px px-3 py-2 text-right font-mono font-bold whitespace-nowrap"
									style="color:var(--danger)"
								>
									-Rp {fmt(r.total_retur)}
								</td>
								<td class="w-px px-3 py-2 whitespace-nowrap" style="color:var(--text-dim)"
									>{r.kasir_nama ?? '-'}</td
								>
								<td class="max-w-[140px] truncate px-3 py-2" style="color:var(--text)"
									>{r.alasan ?? '-'}</td
								>
								<td class="w-px px-3 py-2 whitespace-nowrap">
									<button onclick={() => s.lihatDetail(r.id)} class="btn btn-xs">Detail</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<ReturBuatSlideOver {s} />

<!-- ═══ SlideOver Detail Retur ══════════════════════════════════════════════ -->

<ReturDetailSlideOver bind:open={s.modalDetail} data={s.detailData} loading={s.loadingDetail} />
