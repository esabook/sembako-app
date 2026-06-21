<script lang="ts">
	import { onMount } from 'svelte';
	import { withLoading, withIdle } from '$lib/utils/async';
	import { fetchKomisi, bayarKomisi } from '../jasa.api';
	import type { KomisiStaf } from '../jasa.types';
	import DataTable from '$lib/components/DataTable.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import DateRangePicker from '$lib/components/form/DateRangePicker.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	let rows = $state<KomisiStaf[]>([]);
	let loading = $state(false);
	let loadingRekap = $state(false);
	let dari = $state(new Date().toISOString().slice(0, 7) + '-01');
	let sampai = $state(new Date().toISOString().slice(0, 10));
	let konfirmBayar = $state(false);

	type RekapRow = { karyawan_id: number; nama: string; pending: number; total: number };
	let rekap = $state<RekapRow[]>([]);

	$effect(() => {
		const snap = [...rows];
		loadingRekap = true;
		return withIdle(() => {
			const map = new Map<number, RekapRow>();
			for (const r of snap) {
				const ex = map.get(r.karyawan_id) ?? { karyawan_id: r.karyawan_id, nama: r.karyawan_nama, pending: 0, total: 0 };
				ex.total += r.nilai_komisi;
				if (r.status === 'pending') ex.pending += r.nilai_komisi;
				map.set(r.karyawan_id, ex);
			}
			rekap = [...map.values()].sort((a, b) => b.pending - a.pending);
			loadingRekap = false;
		});
	});

	const columns = [
		{ key: 'tanggal', label: 'Tanggal', width: 100 },
		{ key: 'karyawan_nama', label: 'Staf' },
		{ key: 'layanan_nama', label: 'Layanan' },
		{ key: 'nilai_komisi', label: 'Komisi', width: 110 },
		{ key: 'persen', label: '%', width: 60 },
		{ key: 'status', label: 'Status', width: 90 },
	];

	async function muat() {
		loading = true;
		const hasil = await withLoading(() => fetchKomisi(dari, sampai), {
			loadingKey: 'komisi-muat',
			modul: 'jasa', aksi: 'muat-komisi',
			errorPesan: 'Gagal memuat komisi',
		});
		if (hasil) rows = hasil;
		loading = false;
	}

	async function bayar() {
		const pendingIds = rows.filter((r) => r.status === 'pending').map((r) => r.id);
		await withLoading(() => bayarKomisi(pendingIds), {
			loadingKey: 'komisi-bayar',
			modul: 'jasa', aksi: 'bayar-komisi',
			errorPesan: 'Gagal bayar komisi',
		});
		konfirmBayar = false;
		muat();
	}

	const totalPending = $derived(
		rows.filter((r) => r.status === 'pending').reduce((s, r) => s + r.nilai_komisi, 0)
	);

	onMount(muat);
	$effect(() => { dari; sampai; muat(); });
</script>

<div class="p-3 md:p-6">
	<div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<h1 class="text-base font-semibold md:text-lg">Komisi Staf</h1>
		{#if totalPending > 0}
			<button class="btn btn-primary btn-sm w-full sm:w-auto" onclick={() => (konfirmBayar = true)}>
				Bayar Semua Pending (Rp {totalPending.toLocaleString('id-ID')})
			</button>
		{/if}
	</div>

	<div class="mb-4">
		<DateRangePicker bind:dari bind:sampai />
	</div>

	{#if !loadingRekap && rekap.length > 0}
		<div class="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
			{#each rekap as r (r.karyawan_id)}
				<div class="rounded-lg border border-[var(--border)] p-3" style="background:var(--surface)">
					<p class="text-xs text-[var(--text-dim)]">{r.nama}</p>
					<p class="font-mono text-sm font-semibold">Rp {r.pending.toLocaleString('id-ID')}</p>
					<p class="text-xs text-[var(--text-dim)]">pending</p>
				</div>
			{/each}
		</div>
	{/if}

	{#if loading}
		<div class="flex justify-center py-8"><Spinner /></div>
	{:else}
		<DataTable {columns} rowCount={rows.length} pageSize={30} emptyText="Belum ada data komisi.">
			{#snippet body(hidden)}
				{#each rows as r (r.id)}
					<tr>
						{#if !hidden.has('tanggal')}<td class="px-3 py-2 text-sm">{r.tanggal}</td>{/if}
						{#if !hidden.has('karyawan_nama')}<td class="px-3 py-2 font-medium">{r.karyawan_nama}</td>{/if}
						{#if !hidden.has('layanan_nama')}<td class="px-3 py-2 text-sm">{r.layanan_nama ?? '—'}</td>{/if}
						{#if !hidden.has('nilai_komisi')}<td class="px-3 py-2 text-right font-mono">Rp {r.nilai_komisi.toLocaleString('id-ID')}</td>{/if}
						{#if !hidden.has('persen')}<td class="px-3 py-2 text-center text-sm">{r.persen ? `${r.persen}%` : '—'}</td>{/if}
						{#if !hidden.has('status')}
							<td class="px-3 py-2">
								<span class="rounded-full px-2 py-0.5 text-xs font-medium text-black"
									style="background:{r.status === 'pending' ? 'var(--warn)' : 'var(--accent)'}">
									{r.status}
								</span>
							</td>
						{/if}
					</tr>
				{/each}
			{/snippet}
		</DataTable>
	{/if}
</div>

<ConfirmDialog
	bind:open={konfirmBayar}
	judul="Bayar Semua Komisi Pending?"
	pesan="Semua komisi dengan status 'pending' akan ditandai sebagai dibayar."
	onkanan={bayar}
/>
