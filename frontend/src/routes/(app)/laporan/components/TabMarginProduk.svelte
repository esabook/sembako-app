<script lang="ts">
	import type { createLaporanStore } from '../laporan.store.svelte';
	import { fmt, fmtRp, tglFmt } from '../laporan.logic';
	import DateRangePicker from '$lib/components/ui/daterangepicker/daterangepicker.svelte';

	let { store }: { store: ReturnType<typeof createLaporanStore> } = $props();
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

{#if store.marginProduk}
	{@const mp = store.marginProduk}
	<div style="padding:0 1.25rem 2rem">
		<div style="text-align:center; margin-bottom:1.5rem">
			<div style="font-size:1rem; font-weight:700; color:var(--text)">
				LAPORAN MARGIN PER PRODUK
			</div>
			<div style="font-size:.8rem; color:var(--text-dim)">
				Periode {tglFmt(mp.periode.dari)} — {tglFmt(mp.periode.sampai)}
			</div>
		</div>

		<!-- Ringkasan -->
		<div
			style="display:grid; grid-template-columns:repeat(2,1fr); gap:.6rem; margin-bottom:1.5rem"
			class="sm:grid-cols-4"
		>
			{#each [{ label: 'Total Omset', val: fmtRp(mp.total_omset), color: 'var(--text)' }, { label: 'Total HPP', val: fmtRp(mp.total_hpp), color: 'var(--text-dim)' }, { label: 'Total Margin', val: fmtRp(mp.total_margin), color: mp.total_margin >= 0 ? 'var(--accent)' : 'var(--danger)' }, { label: 'Rata-rata Margin %', val: `${mp.margin_pct_rata.toFixed(1)}%`, color: mp.margin_pct_rata >= 15 ? 'var(--accent)' : mp.margin_pct_rata >= 8 ? 'var(--warn)' : 'var(--danger)' }] as card (card.label)}
				<div
					style="padding:.75rem 1rem; background:var(--surface); border:1px solid var(--border); border-radius:6px"
				>
					<div style="font-size:.7rem; color:var(--text-dim); margin-bottom:.25rem">
						{card.label}
					</div>
					<div style="font-size:.9rem; font-weight:700; color:{card.color}">{card.val}</div>
				</div>
			{/each}
		</div>

		<!-- Tabel produk -->
		<div style="overflow-x:auto">
			<table style="width:100%; border-collapse:collapse; font-size:.82rem; min-width:600px">
				<thead>
					<tr style="background:var(--surface2)">
						<th
							style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600"
							>#</th
						>
						<th
							style="padding:.4rem .75rem; text-align:left; color:var(--text-dim); font-weight:600"
							>Produk</th
						>
						<th
							style="padding:.4rem .5rem; text-align:left; color:var(--text-dim); font-weight:600"
							class="hidden sm:table-cell">Kategori</th
						>
						<th
							style="padding:.4rem .5rem; text-align:right; color:var(--text-dim); font-weight:600"
							class="hidden sm:table-cell">Qty</th
						>
						<th
							style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600"
							>Omset</th
						>
						<th
							style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600"
							class="hidden sm:table-cell">HPP</th
						>
						<th
							style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600"
							>Margin</th
						>
						<th
							style="padding:.4rem .75rem; text-align:right; color:var(--text-dim); font-weight:600"
							>%</th
						>
					</tr>
				</thead>
				<tbody>
					{#each mp.produk as p, i (p.barang_id)}
						{@const warnaMargin =
							p.margin_pct >= 15
								? 'var(--accent)'
								: p.margin_pct >= 8
									? 'var(--warn)'
									: 'var(--danger)'}
						<tr style="border-top:1px solid var(--border)">
							<td style="padding:.35rem .75rem; color:var(--text-dim); font-size:.75rem">{i + 1}</td
							>
							<td style="padding:.35rem .75rem; color:var(--text); font-weight:500"
								>{p.nama_barang}</td
							>
							<td
								style="padding:.35rem .5rem; color:var(--text-dim); font-size:.78rem"
								class="hidden sm:table-cell">{p.kategori}</td
							>
							<td
								style="padding:.35rem .5rem; text-align:right; color:var(--text-dim)"
								class="hidden sm:table-cell">{fmt(p.qty_terjual)}</td
							>
							<td style="padding:.35rem .75rem; text-align:right; color:var(--text)"
								>Rp {fmt(p.omset)}</td
							>
							<td
								style="padding:.35rem .75rem; text-align:right; color:var(--text-dim)"
								class="hidden sm:table-cell">Rp {fmt(p.hpp)}</td
							>
							<td
								style="padding:.35rem .75rem; text-align:right; color:{p.margin >= 0
									? 'var(--accent)'
									: 'var(--danger)'}; font-weight:600">Rp {fmt(p.margin)}</td
							>
							<td
								style="padding:.35rem .75rem; text-align:right; font-weight:700; color:{warnaMargin}"
								>{p.margin_pct.toFixed(1)}%</td
							>
						</tr>
					{/each}
					<tr style="border-top:2px solid var(--border); background:var(--surface2)">
						<td colspan="4" style="padding:.4rem .75rem; font-weight:700; color:var(--text)"
							>TOTAL</td
						>
						<td style="padding:.4rem .75rem; text-align:right; font-weight:700; color:var(--text)"
							>Rp {fmt(mp.total_omset)}</td
						>
						<td
							style="padding:.4rem .75rem; text-align:right; font-weight:700; color:var(--text-dim)"
							class="hidden sm:table-cell">Rp {fmt(mp.total_hpp)}</td
						>
						<td style="padding:.4rem .75rem; text-align:right; font-weight:700; color:var(--accent)"
							>Rp {fmt(mp.total_margin)}</td
						>
						<td style="padding:.4rem .75rem; text-align:right; font-weight:700; color:var(--accent)"
							>{mp.margin_pct_rata.toFixed(1)}%</td
						>
					</tr>
				</tbody>
			</table>
		</div>
		<p style="font-size:.72rem; color:var(--text-dim); margin-top:.6rem">
			* HPP dihitung menggunakan harga beli rata-rata (WAC) saat ini. Nilai margin adalah estimasi.
		</p>
	</div>
{/if}
