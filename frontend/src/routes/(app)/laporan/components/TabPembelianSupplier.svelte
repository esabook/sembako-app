<script lang="ts">
	import type { createLaporanStore } from '../laporan.store.svelte';
	import { fmt, tglFmt } from '../laporan.logic';
	import DateRangePicker from '$lib/components/ui/daterangepicker/daterangepicker.svelte';
	import ChartKartu from '$lib/components/chart/ChartKartu.svelte';

	let { store }: { store: ReturnType<typeof createLaporanStore> } = $props();
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

<ChartKartu kosong={!store.pembelianSupplier} pesanKosong="Pilih periode lalu klik Tampilkan.">
{#if store.pembelianSupplier}
	{@const ps = store.pembelianSupplier}
	<div>
		<div style="text-align:center; margin-bottom:1.5rem">
			<div style="font-size:1rem; font-weight:700; color:var(--text)">PEMBELIAN PER SUPPLIER</div>
			<div style="font-size:.8rem; color:var(--text-dim)">
				Periode {tglFmt(ps.periode.dari)} — {tglFmt(ps.periode.sampai)}
			</div>
		</div>
		{#if ps.supplier.length === 0}
			<p style="color:var(--text-dim); font-size:.85rem">
				Tidak ada penerimaan barang di periode ini.
			</p>
		{:else}
			<div
				style="margin-bottom:1rem; padding:.75rem 1rem; background:var(--surface); border:1px solid var(--border); border-radius:6px; display:inline-block"
			>
				<div style="font-size:.7rem; color:var(--text-dim); margin-bottom:.25rem">
					Total Pembelian
				</div>
				<div style="font-size:.95rem; font-weight:700; color:var(--text)">
					Rp {fmt(ps.total_pembelian)}
				</div>
			</div>
			<div style="overflow-x:auto">
				<table style="width:100%; border-collapse:collapse; font-size:.82rem; min-width:440px">
					<thead>
						<tr style="background:var(--surface2)">
							<th
								style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600"
								>#</th
							>
							<th
								style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600"
								>Supplier</th
							>
							<th
								style="padding:.4rem .5rem; text-align:right; color:var(--text-dim); font-weight:600"
								class="hidden sm:table-cell">Penerimaan</th
							>
							<th
								style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600"
								>Total</th
							>
							<th
								style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600"
								>%</th
							>
						</tr>
					</thead>
					<tbody>
						{#each ps.supplier as s, i (s.supplier_id)}
							<tr style="border-top:1px solid var(--border)">
								<td style="padding:.35rem .75rem; color:var(--text-dim); font-size:.75rem"
									>{i + 1}</td
								>
								<td style="padding:.35rem .75rem; color:var(--text); font-weight:500"
									>{s.nama_supplier}</td
								>
								<td
									style="padding:.35rem .5rem; text-align:right; color:var(--text-dim)"
									class="hidden sm:table-cell">{s.jumlah_penerimaan}x</td
								>
								<td
									style="padding:.35rem .75rem; text-align:right; color:var(--text); font-weight:600"
									>Rp {fmt(s.total_pembelian)}</td
								>
								<td style="padding:.35rem .75rem; text-align:right; color:var(--text-dim)"
									>{s.pct_pembelian.toFixed(1)}%</td
								>
							</tr>
						{/each}
						<tr style="border-top:2px solid var(--border); background:var(--surface2)">
							<td colspan="3" style="padding:.4rem .75rem; font-weight:700; color:var(--text)"
								>TOTAL</td
							>
							<td style="padding:.4rem .75rem; text-align:right; font-weight:700; color:var(--text)"
								>Rp {fmt(ps.total_pembelian)}</td
							>
							<td
								style="padding:.4rem .75rem; text-align:right; font-weight:700; color:var(--text-dim)"
								>100%</td
							>
						</tr>
					</tbody>
				</table>
			</div>
		{/if}
	</div>
{/if}
</ChartKartu>
