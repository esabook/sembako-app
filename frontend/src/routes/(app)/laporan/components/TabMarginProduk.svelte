<script lang="ts">
	import type { createLaporanStore } from '../laporan.store.svelte';
	import { fmt, fmtRp, tglFmt } from '../laporan.logic';
	import DateRangePicker from '$lib/components/ui/daterangepicker/daterangepicker.svelte';
	import ChartKartu from '$lib/components/chart/ChartKartu.svelte';
	import ChartBatang from '$lib/components/chart/ChartBatang.svelte';
	import ChartDonat from '$lib/components/chart/ChartDonat.svelte';
	import DataTable, { type Column } from '$lib/components/DataTable.svelte';
	import LazyMount from '$lib/components/ui/LazyMount.svelte';

	let { store }: { store: ReturnType<typeof createLaporanStore> } = $props();

	const columns: Column[] = [
		{ key: 'rank', label: '#', width: 48 },
		{ key: 'produk', label: 'Produk', sortable: true },
		{ key: 'kategori', label: 'Kategori', hideable: true, priority: 2 },
		{ key: 'qty', label: 'Qty', align: 'right', hideable: true, priority: 2 },
		{ key: 'omset', label: 'Omset', align: 'right', sortable: true },
		{ key: 'hpp', label: 'HPP', align: 'right', hideable: true, priority: 3 },
		{ key: 'margin', label: 'Margin', align: 'right', sortable: true },
		{ key: 'pct', label: '%', align: 'right', width: 70 },
	];

	let currentPage = $state(1);
	let pageSize = $state(25);

	$effect(() => {
		store.marginProdukPromise;
		currentPage = 1;
	});
</script>

<!-- Filter Margin -->
<div style="display:flex; gap:.75rem; align-items:center; margin-bottom:1rem; flex-wrap:wrap">
	<DateRangePicker bind:from={store.periodeMargin.dari} bind:to={store.periodeMargin.sampai} />
	<button
		onclick={() => store.muatMarginProduk()}
		style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
		>Tampilkan</button
	>
	{#each [{ label: 'Bulan ini', fn: () => {
				store.periodeMargin = store.defaultPeriode();
				store.muatMarginProduk();
			} }, { label: 'Bulan lalu', fn: () => {
				store.periodeMargin = store.periodeSebelumnya();
				store.muatMarginProduk();
			} }] as s (s.label)}
		<button
			onclick={s.fn}
			style="padding:.25rem .6rem; background:transparent; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.72rem; cursor:pointer"
			>{s.label}</button
		>
	{/each}
</div>

{#await store.marginProdukPromise}
	<div style="padding:1.25rem; background:var(--surface); border:1px solid var(--border); border-radius:8px">
		<DataTable {columns} loading={true} rowCount={6} emptyText="">
			{#snippet body(_hidden)}{/snippet}
		</DataTable>
	</div>
{:then data}
	<ChartKartu kosong={!data} pesanKosong="Pilih periode lalu klik Tampilkan.">
		{#if data}
			{@const allRows = data.produk}
			{@const slicedRows = allRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
			{@const topOmset = allRows.slice(0, 10)}
			{@const topMargin = allRows.filter((p) => p.margin > 0)}
			<div>
				<div style="text-align:center; margin-bottom:1.5rem">
					<div style="font-size:1rem; font-weight:700; color:var(--text)">LAPORAN MARGIN PER PRODUK</div>
					<div style="font-size:.8rem; color:var(--text-dim)">
						Periode {tglFmt(data.periode.dari)} — {tglFmt(data.periode.sampai)}
					</div>
				</div>

				<div
					style="display:grid; grid-template-columns:repeat(2,1fr); gap:.6rem; margin-bottom:1.5rem"
					class="sm:grid-cols-4"
				>
					{#each [
						{ label: 'Total Omset', val: fmtRp(data.total_omset), color: 'var(--text)' },
						{ label: 'Total HPP', val: fmtRp(data.total_hpp), color: 'var(--text-dim)' },
						{ label: 'Total Margin', val: fmtRp(data.total_margin), color: data.total_margin >= 0 ? 'var(--accent)' : 'var(--danger)' },
						{ label: 'Rata-rata Margin %', val: `${data.margin_pct_rata.toFixed(1)}%`, color: data.margin_pct_rata >= 15 ? 'var(--accent)' : data.margin_pct_rata >= 8 ? 'var(--warn)' : 'var(--danger)' },
					] as card (card.label)}
						<div style="padding:.75rem 1rem; background:var(--surface); border:1px solid var(--border); border-radius:6px">
							<div style="font-size:.7rem; color:var(--text-dim); margin-bottom:.25rem">{card.label}</div>
							<div style="font-size:.9rem; font-weight:700; color:{card.color}">{card.val}</div>
						</div>
					{/each}
				</div>

				<DataTable
					{columns}
					rowCount={slicedRows.length}
					totalRows={allRows.length}
					bind:currentPage
					bind:pageSize
					tableId="laporan-margin-produk"
				>
					{#snippet body(hidden)}
						{#each slicedRows as p, i (p.barang_id)}
							{@const rank = (currentPage - 1) * pageSize + i + 1}
							{@const warnaMargin = p.margin_pct >= 15 ? 'var(--accent)' : p.margin_pct >= 8 ? 'var(--warn)' : 'var(--danger)'}
							<tr style="border-top:1px solid var(--border)">
								<td style="padding:.35rem .75rem; color:var(--text-dim); font-size:.75rem">{rank}</td>
								<td style="padding:.35rem .75rem; color:var(--text); font-weight:500">{p.nama_barang}</td>
								{#if !hidden.has('kategori')}
									<td style="padding:.35rem .5rem; color:var(--text-dim); font-size:.78rem">{p.kategori}</td>
								{/if}
								{#if !hidden.has('qty')}
									<td style="padding:.35rem .5rem; text-align:right; color:var(--text-dim)">{fmt(p.qty_terjual)}</td>
								{/if}
								<td style="padding:.35rem .75rem; text-align:right; color:var(--text)">Rp {fmt(p.omset)}</td>
								{#if !hidden.has('hpp')}
									<td style="padding:.35rem .75rem; text-align:right; color:var(--text-dim)">Rp {fmt(p.hpp)}</td>
								{/if}
								<td style="padding:.35rem .75rem; text-align:right; color:{p.margin >= 0 ? 'var(--accent)' : 'var(--danger)'}; font-weight:600">Rp {fmt(p.margin)}</td>
								<td style="padding:.35rem .75rem; text-align:right; font-weight:700; color:{warnaMargin}">{p.margin_pct.toFixed(1)}%</td>
							</tr>
						{/each}
					{/snippet}
				</DataTable>
				<div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:.25rem; padding:.4rem .75rem; background:var(--surface2); border:1px solid var(--border); border-top:2px solid var(--border); border-radius:0 0 4px 4px; margin-top:-1px; font-size:.82rem">
					<span style="font-weight:700; color:var(--text)">TOTAL</span>
					<span style="text-align:right; font-weight:700; color:var(--text)">Rp {fmt(data.total_omset)}</span>
					<span style="text-align:right; font-weight:700; color:var(--accent)">Rp {fmt(data.total_margin)}</span>
					<span style="text-align:right; font-weight:700; color:var(--accent)">{data.margin_pct_rata.toFixed(1)}%</span>
				</div>
				<p style="font-size:.72rem; color:var(--text-dim); margin-top:.6rem">
					* HPP dihitung menggunakan harga beli rata-rata (WAC) saat ini. Nilai margin adalah estimasi.
				</p>

				<LazyMount when="visible" tinggi={200}>
					<div style="margin-top:2rem">
						<div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.75rem">Top 10 Omset Produk</div>
						<ChartBatang data={topOmset} x="nama_barang" y="omset" formatNilai={(v) => `Rp ${fmt(v)}`} tinggi={180} />
					</div>
					{#if topMargin.length > 1}
						<div style="margin-top:1.5rem">
							<div style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.75rem">Distribusi Margin (produk positif)</div>
							<ChartDonat data={topMargin} label="nama_barang" nilai="margin" formatNilai={(v) => `Rp ${fmt(v)}`} tinggi={160} />
						</div>
					{/if}
				</LazyMount>
			</div>
		{/if}
	</ChartKartu>
{/await}
