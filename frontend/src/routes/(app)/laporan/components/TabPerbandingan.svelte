<script lang="ts">
	import type { createLaporanStore } from '../laporan.store.svelte';
	import { fmt, tglFmt } from '../laporan.logic';

	import DateRangePicker from '$lib/components/ui/daterangepicker/daterangepicker.svelte';
	import ChartKartu from '$lib/components/chart/ChartKartu.svelte';
	import ChartBatang from '$lib/components/chart/ChartBatang.svelte';
	let { store }: { store: ReturnType<typeof createLaporanStore> } = $props();

	const delta = (a: number, b: number) => b - a;
	const deltaPct = (a: number, b: number): number => (a !== 0 ? ((b - a) / a) * 100 : 0);
	const warnaSelisih = (d: number, higherBetter = true) =>
		d === 0
			? 'var(--text-dim)'
			: (higherBetter ? d > 0 : d < 0)
				? 'var(--accent)'
				: 'var(--danger)';
</script>

<!-- Filter Perbandingan -->
<div style="display:flex; gap:.75rem; align-items:flex-end; margin-bottom:1rem; flex-wrap:wrap">
	<div style="display:flex; flex-direction:column; gap:.3rem">
		<div style="font-size:.72rem; color:var(--text-dim); font-weight:600">Periode 1</div>
		<DateRangePicker bind:from={store.periodeP1.dari} bind:to={store.periodeP1.sampai} />
	</div>
	<div style="display:flex; flex-direction:column; gap:.3rem">
		<div style="font-size:.72rem; color:var(--text-dim); font-weight:600">Periode 2</div>
		<DateRangePicker bind:from={store.periodeP2.dari} bind:to={store.periodeP2.sampai} />
	</div>
	<button
		onclick={() => store.muatPerbandingan()}
		style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
		>Bandingkan</button
	>
</div>

{#await store.perbandinganPromise}
	<div style="display:flex; flex-direction:column; gap:.75rem; padding:1.25rem">
		<div style="height:.75rem; border-radius:4px; background:var(--surface2); width:70%"></div>
		<div style="height:.75rem; border-radius:4px; background:var(--surface2); width:45%"></div>
		<div style="height:.75rem; border-radius:4px; background:var(--surface2); width:58%"></div>
		<div style="height:.75rem; border-radius:4px; background:var(--surface2); width:30%"></div>
		<div style="height:.75rem; border-radius:4px; background:var(--surface2); width:65%"></div>
	</div>
{:then}
<ChartKartu kosong={!store.perbandingan} pesanKosong="Pilih dua periode lalu klik Bandingkan.">
	{#if store.perbandingan}
		{@const { p1, p2 } = store.perbandingan}
		{@const p1Data = [
			{ label: 'Penjualan', nilai: p1.penjualan.bersih },
			{ label: 'Laba Kotor', nilai: p1.laba_kotor },
			{ label: 'Laba Bersih', nilai: Math.max(0, p1.laba_bersih) }
		]}
		{@const p2Data = [
			{ label: 'Penjualan', nilai: p2.penjualan.bersih },
			{ label: 'Laba Kotor', nilai: p2.laba_kotor },
			{ label: 'Laba Bersih', nilai: Math.max(0, p2.laba_bersih) }
		]}
		<div style="max-width:760px">
		<div style="text-align:center; margin-bottom:1.5rem">
			<div style="font-size:1rem; font-weight:700; color:var(--text)">PERBANDINGAN PERIODE</div>
			<div style="font-size:.8rem; color:var(--text-dim)">
				P1: {tglFmt(p1.periode.dari)} — {tglFmt(p1.periode.sampai)} &nbsp;vs&nbsp; P2: {tglFmt(
					p2.periode.dari
				)} — {tglFmt(p2.periode.sampai)}
			</div>
		</div>

		<div style="overflow-x:auto">
			<table style="width:100%; border-collapse:collapse; font-size:.84rem; min-width:500px">
				<thead>
					<tr style="background:var(--surface2)">
						<th
							style="padding:.45rem .75rem; text-align:left; color:var(--text-dim); font-weight:600"
							>Metrik</th
						>
						<th
							style="padding:.45rem .75rem; text-align:right; color:var(--text-dim); font-weight:600"
							>P1</th
						>
						<th
							style="padding:.45rem .75rem; text-align:right; color:var(--text-dim); font-weight:600"
							>P2</th
						>
						<th
							style="padding:.45rem .75rem; text-align:right; color:var(--text-dim); font-weight:600"
							>Selisih</th
						>
						<th
							style="padding:.45rem .75rem; text-align:right; color:var(--text-dim); font-weight:600"
							>Δ%</th
						>
					</tr>
				</thead>
				<tbody>
					{#each [{ label: 'Penjualan Bersih', v1: p1.penjualan.bersih, v2: p2.penjualan.bersih, isRp: true, higher: true }, { label: 'Jumlah Transaksi', v1: p1.penjualan.jumlah_transaksi, v2: p2.penjualan.jumlah_transaksi, isRp: false, higher: true }, { label: 'HPP (estimasi)', v1: p1.hpp, v2: p2.hpp, isRp: true, higher: false }, { label: 'Laba Kotor', v1: p1.laba_kotor, v2: p2.laba_kotor, isRp: true, higher: true }, { label: 'Margin Kotor %', v1: p1.margin_kotor_persen, v2: p2.margin_kotor_persen, isRp: false, isPct: true, higher: true }, { label: 'Biaya Operasional', v1: p1.biaya_operasional.total, v2: p2.biaya_operasional.total, isRp: true, higher: false }, { label: 'Laba Bersih', v1: p1.laba_bersih, v2: p2.laba_bersih, isRp: true, higher: true }, { label: 'Margin Bersih %', v1: p1.margin_bersih_persen, v2: p2.margin_bersih_persen, isRp: false, isPct: true, higher: true }] as row (row.label)}
						{@const d = delta(row.v1, row.v2)}
						{@const dp = deltaPct(row.v1, row.v2)}
						{@const warna = warnaSelisih(d, row.higher)}
						<tr style="border-top:1px solid var(--border)">
							<td style="padding:.4rem .75rem; color:var(--text)">{row.label}</td>
							<td style="padding:.4rem .75rem; text-align:right; color:var(--text-dim)">
								{#if row.isPct}{row.v1.toFixed(1)}%{:else if row.isRp}Rp {fmt(row.v1)}{:else}{fmt(
										row.v1
									)}{/if}
							</td>
							<td
								style="padding:.4rem .75rem; text-align:right; color:var(--text); font-weight:600"
							>
								{#if row.isPct}{row.v2.toFixed(1)}%{:else if row.isRp}Rp {fmt(row.v2)}{:else}{fmt(
										row.v2
									)}{/if}
							</td>
							<td style="padding:.4rem .75rem; text-align:right; font-weight:600; color:{warna}">
								{#if row.isPct}{d > 0 ? '+' : ''}{d.toFixed(1)}pp{:else if row.isRp}{d >= 0
										? '+'
										: ''}Rp {fmt(Math.abs(d))}{#if d < 0}*{/if}{:else}{d >= 0 ? '+' : ''}{fmt(
										d
									)}{/if}
							</td>
							<td
								style="padding:.4rem .75rem; text-align:right; color:{row.isPct
									? 'var(--text-dim)'
									: warna}"
							>
								{row.isPct ? '—' : `${dp >= 0 ? '+' : ''}${dp.toFixed(1)}%`}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p style="font-size:.72rem; color:var(--text-dim); margin-top:.6rem">
			* Margin merupakan estimasi berdasarkan HPP rata-rata saat ini.
		</p>

		<!-- Visual P1 vs P2 -->
		<div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-top:2rem">
			<div>
				<div style="font-size:.72rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem">P1 — {tglFmt(p1.periode.dari)}</div>
				<ChartBatang data={p1Data} x="label" y="nilai" formatNilai={(v) => `Rp ${fmt(v)}`} tinggi={140} />
			</div>
			<div>
				<div style="font-size:.72rem; font-weight:700; color:var(--info); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem">P2 — {tglFmt(p2.periode.dari)}</div>
				<ChartBatang data={p2Data} x="label" y="nilai" formatNilai={(v) => `Rp ${fmt(v)}`} tinggi={140} warna="var(--info)" />
			</div>
		</div>
		</div>
	{/if}
</ChartKartu>
{/await}
