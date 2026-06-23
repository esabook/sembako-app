<script lang="ts">
	import type { createLaporanStore } from '../laporan.store.svelte';
	import { fmt, fmtPct, tglFmt } from '../laporan.logic';
	import DateRangePicker from '$lib/components/ui/daterangepicker/daterangepicker.svelte';
	import ChartKartu from '$lib/components/chart/ChartKartu.svelte';

	let { store }: { store: ReturnType<typeof createLaporanStore> } = $props();
</script>

<!-- Filter Periode -->
<div style="display:flex; gap:.75rem; align-items:center; margin-bottom:1rem; flex-wrap:wrap">
	<DateRangePicker bind:from={store.periode.dari} bind:to={store.periode.sampai} />
	<button
		onclick={() => store.muat('laba-rugi')}
		style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
		>Tampilkan</button
	>
	{#each [{ label: 'Hari ini', fn: () => {
				const t = new Date().toLocaleDateString('sv-SE');
				store.periode = { dari: t, sampai: t };
				store.muat('laba-rugi');
			} }, { label: 'Minggu ini', fn: () => {
				const now = new Date();
				const mon = new Date(now);
				mon.setDate(now.getDate() - now.getDay() + 1);
				const sun = new Date(mon);
				sun.setDate(mon.getDate() + 6);
				store.periode = { dari: mon.toLocaleDateString('sv-SE'), sampai: sun.toLocaleDateString('sv-SE') };
				store.muat('laba-rugi');
			} }, { label: 'Bulan ini', fn: () => {
				store.periode = store.defaultPeriode();
				store.muat('laba-rugi');
			} }] as s (s.label)}
		<button
			onclick={s.fn}
			style="padding:.25rem .6rem; background:transparent; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.72rem; cursor:pointer"
			>{s.label}</button
		>
	{/each}
</div>

<ChartKartu kosong={!store.labaRugi} pesanKosong="Pilih periode lalu klik Tampilkan.">
	{#if store.labaRugi}
		{@const labaRugi = store.labaRugi}
		<div style="max-width:680px">
		<div style="text-align:center; margin-bottom:1.5rem">
			<div style="font-size:1rem; font-weight:700; color:var(--text)">LAPORAN LABA RUGI</div>
			<div style="font-size:.8rem; color:var(--text-dim)">
				Periode {tglFmt(labaRugi.periode.dari)} — {tglFmt(labaRugi.periode.sampai)}
			</div>
		</div>

		<!-- Penjualan -->
		<div style="margin-bottom:1.25rem">
			<div
				style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem; padding-bottom:.3rem; border-bottom:1px solid var(--border)"
			>
				Penjualan ({labaRugi.penjualan.jumlah_transaksi} transaksi)
			</div>
			{#each [['Penjualan Bruto', labaRugi.penjualan.bruto, false], ['Diskon', labaRugi.penjualan.diskon, true], ['Penjualan Bersih', labaRugi.penjualan.bersih, false]] as [label, val, minus] (label)}
				<div
					style="display:flex; justify-content:space-between; padding:.3rem 0; font-size:.85rem; color:{label ===
					'Penjualan Bersih'
						? 'var(--text)'
						: 'var(--text-dim)'}; font-weight:{label === 'Penjualan Bersih' ? '600' : '400'}"
				>
					<span>{label}</span>
					<span>{minus ? '(' : ''}Rp {fmt(val as number)}{minus ? ')' : ''}</span>
				</div>
			{/each}
		</div>

		<!-- HPP & Laba Kotor -->
		<div style="margin-bottom:1.25rem">
			<div
				style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem; padding-bottom:.3rem; border-bottom:1px solid var(--border)"
			>
				Harga Pokok Penjualan
			</div>
			<div
				style="display:flex; justify-content:space-between; padding:.3rem 0; font-size:.85rem; color:var(--text-dim)"
			>
				<span>HPP (estimasi)</span>
				<span>(Rp {fmt(labaRugi.hpp)})</span>
			</div>
			<div
				style="display:flex; justify-content:space-between; padding:.4rem 0; font-size:.9rem; font-weight:700; color:var(--accent); border-top:1px solid var(--border); margin-top:.3rem"
			>
				<span>Laba Kotor</span>
				<span
					>Rp {fmt(labaRugi.laba_kotor)}
					<span style="font-size:.72rem; font-weight:400"
						>({fmtPct(labaRugi.margin_kotor_persen)})</span
					></span
				>
			</div>
		</div>

		<!-- Biaya Operasional -->
		{#if labaRugi.biaya_operasional.total > 0}
			<div style="margin-bottom:1.25rem">
				<div
					style="font-size:.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem; padding-bottom:.3rem; border-bottom:1px solid var(--border)"
				>
					Biaya Operasional
				</div>
				{#each Object.entries(labaRugi.biaya_operasional.per_kategori) as [kat, jml] (kat)}
					<div
						style="display:flex; justify-content:space-between; padding:.3rem 0; font-size:.85rem; color:var(--text-dim)"
					>
						<span style="text-transform:capitalize">{kat.replace(/_/g, ' ')}</span>
						<span>(Rp {fmt(jml)})</span>
					</div>
				{/each}
				<div
					style="display:flex; justify-content:space-between; padding:.3rem 0 0; font-size:.85rem; font-weight:600; color:var(--text); border-top:1px solid var(--border); margin-top:.3rem"
				>
					<span>Total Biaya</span>
					<span>(Rp {fmt(labaRugi.biaya_operasional.total)})</span>
				</div>
			</div>
		{/if}

		<!-- Laba Bersih -->
		<div
			style="background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:.9rem 1rem; display:flex; justify-content:space-between; align-items:center"
		>
			<span style="font-size:.9rem; font-weight:700; color:var(--text)">LABA BERSIH</span>
			<div style="text-align:right">
				<div
					style="font-size:1.2rem; font-weight:700; color:{labaRugi.laba_bersih >= 0
						? 'var(--accent)'
						: 'var(--danger)'}"
				>
					Rp {fmt(labaRugi.laba_bersih)}
				</div>
				<div style="font-size:.72rem; color:var(--text-dim)">
					{fmtPct(labaRugi.margin_bersih_persen)} dari penjualan
				</div>
			</div>
		</div>
	</div>
	{/if}
</ChartKartu>
