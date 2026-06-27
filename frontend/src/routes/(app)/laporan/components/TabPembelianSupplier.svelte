<script lang="ts">
	import type { createLaporanStore } from '../laporan.store.svelte';
	import { fmt, tglFmt } from '../laporan.logic';
	import DateRangePicker from '$lib/components/ui/daterangepicker/daterangepicker.svelte';
	import ChartKartu from '$lib/components/chart/ChartKartu.svelte';
	import ChartBatang from '$lib/components/chart/ChartBatang.svelte';
	import ChartDonat from '$lib/components/chart/ChartDonat.svelte';
	import DataTable, { type Column } from '$lib/components/DataTable.svelte';
	import LazyMount from '$lib/components/ui/LazyMount.svelte';

	let { store }: { store: ReturnType<typeof createLaporanStore> } = $props();

	const columns: Column[] = [
		{ key: 'rank', label: '#', width: 48 },
		{ key: 'supplier', label: 'Supplier', sortable: true },
		{ key: 'penerimaan', label: 'Penerimaan', align: 'right', hideable: true, priority: 2 },
		{ key: 'total', label: 'Total', align: 'right', sortable: true },
		{ key: 'pct', label: '%', align: 'right', width: 70 },
	];

	let currentPage = $state(1);
	let pageSize = $state(25);

	$effect(() => {
		store.pembelianSupplierPromise;
		currentPage = 1;
	});
</script>

<!-- Filter Supplier -->
<div style="display:flex; gap:.75rem; align-items:center; margin-bottom:1rem; flex-wrap:wrap">
	<DateRangePicker bind:from={store.periodeSupplier.dari} bind:to={store.periodeSupplier.sampai} />
	<button
		onclick={() => store.muatPembelianSupplier()}
		style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
		>Tampilkan</button
	>
	{#each [{ label: 'Bulan ini', fn: () => {
				store.periodeSupplier = store.defaultPeriode();
				store.muatPembelianSupplier();
			} }, { label: 'Bulan lalu', fn: () => {
				store.periodeSupplier = store.periodeSebelumnya();
				store.muatPembelianSupplier();
			} }] as s (s.label)}
		<button
			onclick={s.fn}
			style="padding:.25rem .6rem; background:transparent; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.72rem; cursor:pointer"
			>{s.label}</button
		>
	{/each}
</div>

{#await store.pembelianSupplierPromise}
	<div style="padding:1.25rem; background:var(--surface); border:1px solid var(--border); border-radius:8px">
		<DataTable {columns} loading={true} rowCount={6} emptyText="">
			{#snippet body(_hidden)}{/snippet}
		</DataTable>
	</div>
{:then data}
	<ChartKartu kosong={!data} pesanKosong="Pilih periode lalu klik Tampilkan.">
		{#if data}
			{@const allRows = data.supplier}
			{@const slicedRows = allRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
			<div>
				<div style="text-align:center; margin-bottom:1.5rem">
					<div style="font-size:1rem; font-weight:700; color:var(--text)">PEMBELIAN PER SUPPLIER</div>
					<div style="font-size:.8rem; color:var(--text-dim)">
						Periode {tglFmt(data.periode.dari)} — {tglFmt(data.periode.sampai)}
					</div>
				</div>
				{#if allRows.length === 0}
					<p style="color:var(--text-dim); font-size:.85rem">Tidak ada penerimaan barang di periode ini.</p>
				{:else}
					<div style="margin-bottom:1rem; padding:.75rem 1rem; background:var(--surface); border:1px solid var(--border); border-radius:6px; display:inline-block">
						<div style="font-size:.7rem; color:var(--text-dim); margin-bottom:.25rem">Total Pembelian</div>
						<div style="font-size:.95rem; font-weight:700; color:var(--text)">Rp {fmt(data.total_pembelian)}</div>
					</div>

					<DataTable
						{columns}
						rowCount={slicedRows.length}
						totalRows={allRows.length}
						bind:currentPage
						bind:pageSize
						tableId="laporan-pembelian-supplier"
					>
						{#snippet body(hidden)}
							{#each slicedRows as s, i (s.supplier_id)}
								{@const rank = (currentPage - 1) * pageSize + i + 1}
								<tr style="border-top:1px solid var(--border)">
									<td style="padding:.35rem .75rem; color:var(--text-dim); font-size:.75rem">{rank}</td>
									<td style="padding:.35rem .75rem; color:var(--text); font-weight:500">{s.nama_supplier}</td>
									{#if !hidden.has('penerimaan')}
										<td style="padding:.35rem .5rem; text-align:right; color:var(--text-dim)">{s.jumlah_penerimaan}x</td>
									{/if}
									<td style="padding:.35rem .75rem; text-align:right; color:var(--text); font-weight:600">Rp {fmt(s.total_pembelian)}</td>
									<td style="padding:.35rem .75rem; text-align:right; color:var(--text-dim)">{s.pct_pembelian.toFixed(1)}%</td>
								</tr>
							{/each}
						{/snippet}
					</DataTable>
					<div style="display:flex; justify-content:space-between; padding:.4rem .75rem; background:var(--surface2); border:1px solid var(--border); border-top:2px solid var(--border); border-radius:0 0 4px 4px; margin-top:-1px">
						<span style="font-weight:700; color:var(--text)">TOTAL</span>
						<span style="font-weight:700; color:var(--text)">Rp {fmt(data.total_pembelian)}</span>
					</div>

					{#if allRows.length > 0}
						<LazyMount when="visible" tinggi={200}>
							<div style="margin-top:2rem">
								<div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.75rem">Pembelian per Supplier</div>
								<ChartBatang data={allRows} x="nama_supplier" y="total_pembelian" formatNilai={(v) => `Rp ${fmt(v)}`} tinggi={180} />
							</div>
							{#if allRows.length > 1}
								<div style="margin-top:1.5rem">
									<div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.75rem">Distribusi Pembelian</div>
									<ChartDonat data={allRows} label="nama_supplier" nilai="total_pembelian" formatNilai={(v) => `Rp ${fmt(v)}`} tinggi={160} />
								</div>
							{/if}
						</LazyMount>
					{/if}
				{/if}
			</div>
		{/if}
	</ChartKartu>
{/await}
