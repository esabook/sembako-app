<script lang="ts">
	import type { createLaporanStore } from '../laporan.store.svelte';
	import { fmt, tglFmt } from '../laporan.logic';
	import DateRangePicker from '$lib/components/ui/daterangepicker/daterangepicker.svelte';
	import ChartKartu from '$lib/components/chart/ChartKartu.svelte';
	import ChartBatang from '$lib/components/chart/ChartBatang.svelte';
	import DataTable, { type Column } from '$lib/components/DataTable.svelte';
	import LazyMount from '$lib/components/ui/LazyMount.svelte';

	let { store }: { store: ReturnType<typeof createLaporanStore> } = $props();

	const columns: Column[] = [
		{ key: 'rank', label: '#', width: 48 },
		{ key: 'nama', label: 'Nama', sortable: true },
		{ key: 'tipe', label: 'Tipe', hideable: true, priority: 2 },
		{ key: 'transaksi', label: 'Transaksi', align: 'right', hideable: true, priority: 2 },
		{ key: 'omset', label: 'Omset', align: 'right', sortable: true },
		{ key: 'pct', label: '%', align: 'right', width: 70 },
	];

	let currentPage = $state(1);
	let pageSize = $state(25);

	$effect(() => {
		store.topPelangganPromise;
		currentPage = 1;
	});
</script>

<!-- Filter Pelanggan -->
<div style="display:flex; gap:.75rem; align-items:center; margin-bottom:1rem; flex-wrap:wrap">
	<DateRangePicker
		bind:from={store.periodePelanggan.dari}
		bind:to={store.periodePelanggan.sampai}
	/>
	<button
		onclick={() => store.muatTopPelanggan()}
		style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
		>Tampilkan</button
	>
	{#each [{ label: 'Bulan ini', fn: () => {
				store.periodePelanggan = store.defaultPeriode();
				store.muatTopPelanggan();
			} }, { label: 'Bulan lalu', fn: () => {
				store.periodePelanggan = store.periodeSebelumnya();
				store.muatTopPelanggan();
			} }] as s (s.label)}
		<button
			onclick={s.fn}
			style="padding:.25rem .6rem; background:transparent; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.72rem; cursor:pointer"
			>{s.label}</button
		>
	{/each}
</div>

{#await store.topPelangganPromise}
	<div style="padding:1.25rem; background:var(--surface); border:1px solid var(--border); border-radius:8px">
		<DataTable {columns} loading={true} rowCount={6} emptyText="">
			{#snippet body(_hidden)}{/snippet}
		</DataTable>
	</div>
{:then data}
	<ChartKartu kosong={!data} pesanKosong="Pilih periode lalu klik Tampilkan.">
		{#if data}
			{@const allRows = data.pelanggan}
			{@const slicedRows = allRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
			<div>
				<div style="text-align:center; margin-bottom:1.5rem">
					<div style="font-size:1rem; font-weight:700; color:var(--text)">TOP PELANGGAN</div>
					<div style="font-size:.8rem; color:var(--text-dim)">
						Periode {tglFmt(data.periode.dari)} — {tglFmt(data.periode.sampai)}
					</div>
				</div>
				{#if allRows.length === 0}
					<p style="color:var(--text-dim); font-size:.85rem">
						Tidak ada transaksi pelanggan terdaftar di periode ini.
					</p>
				{:else}
					<DataTable
						{columns}
						rowCount={slicedRows.length}
						totalRows={allRows.length}
						bind:currentPage
						bind:pageSize
						tableId="laporan-top-pelanggan"
					>
						{#snippet body(hidden)}
							{#each slicedRows as pl, i (pl.pelanggan_id)}
								{@const rank = (currentPage - 1) * pageSize + i + 1}
								<tr style="border-top:1px solid var(--border)">
									<td style="padding:.35rem .75rem; color:var(--text-dim); font-size:.75rem">{rank}</td>
									<td style="padding:.35rem .75rem; color:var(--text); font-weight:500">{pl.nama}</td>
									{#if !hidden.has('tipe')}
										<td style="padding:.35rem .5rem; color:var(--text-dim); font-size:.78rem; text-transform:capitalize">{pl.tipe}</td>
									{/if}
									{#if !hidden.has('transaksi')}
										<td style="padding:.35rem .5rem; text-align:right; color:var(--text-dim)">{pl.jumlah_transaksi}x</td>
									{/if}
									<td style="padding:.35rem .75rem; text-align:right; color:var(--text); font-weight:600">Rp {fmt(pl.total_omset)}</td>
									<td style="padding:.35rem .75rem; text-align:right; color:var(--text-dim)">{pl.pct_omset.toFixed(1)}%</td>
								</tr>
							{/each}
						{/snippet}
					</DataTable>
					<div style="display:flex; justify-content:space-between; padding:.4rem .75rem; background:var(--surface2); border:1px solid var(--border); border-top:2px solid var(--border); border-radius:0 0 4px 4px; margin-top:-1px">
						<span style="font-weight:700; color:var(--text)">TOTAL</span>
						<span style="font-weight:700; color:var(--accent)">Rp {fmt(data.total_omset)}</span>
					</div>
					<p style="font-size:.72rem; color:var(--text-dim); margin-top:.6rem">
						* Hanya pelanggan yang terdaftar di sistem. Transaksi walk-in tidak termasuk.
					</p>

					{#if allRows.length > 0}
						<LazyMount when="visible" tinggi={200}>
							<div style="margin-top:2rem">
								<div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.75rem">Omset per Pelanggan</div>
								<ChartBatang data={allRows} x="nama" y="total_omset" formatNilai={(v) => `Rp ${fmt(v)}`} tinggi={180} />
							</div>
						</LazyMount>
					{/if}
				{/if}
			</div>
		{/if}
	</ChartKartu>
{/await}
