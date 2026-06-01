<script lang="ts">
	import {
		rp,
		rpFull,
		buildSummaryRows,
		buildSummaryStats,
		delta,
		deltaColor,
		buildChartDays
	} from './dashboard.logic';
	import type { ChartDay, SummaryRow, SummaryStats } from './dashboard.logic';
	import type { DashboardData } from './dashboard.types';
	import { untrack } from 'svelte';
	import { withIdle } from '$lib/utils/async';

	let { data }: { data: DashboardData } = $props();

	let periode = $state<7 | 30>(7);
	let loading = $state(false);

	// untrack: baca data prop sekali untuk init — tidak perlu reaktif di sini
	const _r0 = untrack(() => buildSummaryRows(data.penjualan_30hari, data.today, 7));
	const _s0 = buildSummaryStats(_r0);
	const _c0 = untrack(() => buildChartDays(data.penjualan_30hari, data.today, 7));
	const _cmax0 = Math.max(..._c0.map((r) => r.total), 1);
	const _cavg0 = _c0.reduce((s, d) => s + d.total, 0) / _c0.length;

	let rows = $state<SummaryRow[]>(_r0);
	let stats = $state<SummaryStats>(_s0);
	let chartDays = $state<ChartDay[]>(_c0);
	let chartMax = $state(_cmax0);
	let chartAvg = $state(_cavg0);
	let chartAvgPct = $state(_cmax0 > 0 ? (_cavg0 / _cmax0) * 100 : 0);

	// Skip run pertama — state sudah benar dari inisialisasi di atas
	let firstRun = true;

	$effect(() => {
		const p = periode;
		const d = data;

		if (firstRun) {
			firstRun = false;
			return;
		}

		// loading = true → browser repaint → idle callback hitung data baru
		loading = true;
		return withIdle(() => {
			const r = buildSummaryRows(d.penjualan_30hari, d.today, p);
			const s = buildSummaryStats(r);
			const c = buildChartDays(d.penjualan_30hari, d.today, p);
			const max = Math.max(...c.map((x) => x.total), 1);
			const avg = c.reduce((sum, x) => sum + x.total, 0) / c.length;

			rows = r;
			stats = s;
			chartDays = c;
			chartMax = max;
			chartAvg = avg;
			chartAvgPct = max > 0 ? (avg / max) * 100 : 0;
			loading = false;
		});
	});
</script>

<div class="flex flex-col gap-5">
	<!-- ── TODAY ZONE ────────────────────────────────────────────────────────── -->
	<div class="flex flex-col gap-2">
		<h3 class="text-xs font-bold tracking-wider uppercase" style="color:var(--text-dim)">
			Hari Ini
		</h3>
		<div class="grid gap-3" style="grid-template-columns:repeat(auto-fill,minmax(175px,1fr))">
			<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
				<p class="mb-1 text-xs" style="color:var(--text-dim)">PENJUALAN</p>
				<p class="text-2xl font-bold" style="color:var(--accent)">
					{rp(data.penjualan_hari_ini?.total ?? 0)}
				</p>
				<p
					class="mt-1 text-xs"
					style="color:{deltaColor(
						data.penjualan_hari_ini?.total ?? 0,
						data.penjualan_kemarin?.total ?? 0
					)}"
				>
					{delta(data.penjualan_hari_ini?.total ?? 0, data.penjualan_kemarin?.total ?? 0)} vs kemarin
				</p>
			</div>

			<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
				<p class="mb-1 text-xs" style="color:var(--text-dim)">TRANSAKSI</p>
				<p class="text-2xl font-bold">{data.penjualan_hari_ini?.jumlah_trx ?? 0}</p>
				<p class="mt-1 text-xs" style="color:var(--text-dim)">
					rata {rp(data.penjualan_hari_ini?.rata_per_trx ?? 0)}/trx
				</p>
			</div>

			<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
				<p class="mb-1 text-xs" style="color:var(--text-dim)">SALDO KAS</p>
				<p class="text-2xl font-bold" style="color:var(--info)">{rp(data.saldo_kas.total)}</p>
				<div class="mt-1 flex flex-col gap-0.5 text-xs">
					{#each data.saldo_kas.akun as akun (akun.id)}
						<span style="color:var(--text-dim)">{akun.nama}: {rp(akun.saldo)}</span>
					{/each}
					{#if data.saldo_kas.akun.length === 0}
						<span style="color:var(--text-dim)">Belum ada akun kas</span>
					{/if}
				</div>
			</div>

			<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
				<p class="mb-1 text-xs" style="color:var(--text-dim)">PIUTANG</p>
				<p class="text-2xl font-bold" style="color:var(--warn)">
					{rp(data.ringkasan.total_piutang)}
				</p>
				{#if data.piutang_macet.total > 0}
					<p class="mt-1 text-xs" style="color:var(--danger)">
						macet: {rp(data.piutang_macet.total)}
					</p>
				{:else}
					<p class="mt-1 text-xs" style="color:var(--accent)">tidak ada macet</p>
				{/if}
			</div>

			<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
				<p class="mb-1 text-xs" style="color:var(--text-dim)">HUTANG</p>
				<p class="text-2xl font-bold">{rp(data.ringkasan.total_hutang)}</p>
				{#if data.hutang_jatuh_tempo.total > 0}
					<p class="mt-1 text-xs" style="color:var(--warn)">
						jatuh tempo 7hr: {rp(data.hutang_jatuh_tempo.total)}
					</p>
				{:else}
					<p class="mt-1 text-xs" style="color:var(--text-dim)">tidak ada jatuh tempo</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- Summary cards -->
	<div class="flex items-center justify-between">
		<h3 class="text-xs font-bold tracking-wider uppercase" style="color:var(--text-dim)">
			Ringkasan Penjualan {periode} Hari Terakhir
		</h3>
		<div class="flex items-center gap-2">
			{#if loading}
				<span class="text-xs" style="color:var(--text-dim)">Memuat…</span>
			{/if}
			<div class="flex gap-1">
				{#each [7, 30] as n (n)}
					<button
						onclick={() => {
							periode = n as 7 | 30;
						}}
						class="rounded border px-2 py-0.5 text-xs"
						style={periode === n
							? 'background:var(--accent);color:#000;border-color:var(--accent)'
							: 'background:transparent;color:var(--text-dim);border-color:var(--border)'}
						>{n}h</button
					>
				{/each}
			</div>
		</div>
	</div>
	<div class="grid gap-3" style="grid-template-columns:repeat(auto-fill,minmax(175px,1fr))">
		<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
			<p class="mb-1 text-xs" style="color:var(--text-dim)">TOTAL OMSET</p>
			<p class="text-2xl font-bold" style="color:var(--accent)">{rp(stats.total)}</p>
			<p class="mt-1 text-xs" style="color:var(--text-dim)">{rpFull(stats.total)}</p>
		</div>
		<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
			<p class="mb-1 text-xs" style="color:var(--text-dim)">TOTAL TRANSAKSI</p>
			<p class="text-2xl font-bold">{stats.trx}</p>
			<p class="mt-1 text-xs" style="color:var(--text-dim)">rata {rp(stats.avgPerTrx)}/trx</p>
		</div>
		<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
			<p class="mb-1 text-xs" style="color:var(--text-dim)">RATA-RATA/HARI</p>
			<p class="text-2xl font-bold" style="color:var(--info)">{rp(stats.avgHarian)}</p>
			<p class="mt-1 text-xs" style="color:var(--text-dim)">{rpFull(stats.avgHarian)}</p>
		</div>
		{#if stats.best}
			<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
				<p class="mb-1 text-xs" style="color:var(--text-dim)">HARI TERBAIK</p>
				<p class="text-2xl font-bold" style="color:var(--warn)">{rp(stats.best.total)}</p>
				<p class="mt-1 text-xs" style="color:var(--text-dim)">{stats.best.label}</p>
			</div>
		{/if}
	</div>

	<!-- ── GRAFIK PENJUALAN ──────────────────────────────────────────────────── -->
	<div class="flex flex-col gap-2">
		<div class="flex items-center justify-between">
			<h3 class="text-xs font-bold tracking-wider uppercase" style="color:var(--text-dim)">
				Penjualan {periode} Hari
			</h3>
			<div class="flex gap-1">
				{#each [7, 30] as n (n)}
					<button
						onclick={() => {
							periode = n as 7 | 30;
						}}
						class="rounded border px-2 py-0.5 text-xs"
						style={periode === n
							? 'background:var(--accent);color:#000;border-color:var(--accent)'
							: 'background:transparent;color:var(--text-dim);border-color:var(--border)'}
						>{n}h</button
					>
				{/each}
			</div>
		</div>
		<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
			<div class="relative" style="height:72px">
				{#if chartAvg > 0}
					<div
						class="absolute right-0 left-0 border-t border-dashed"
						style="bottom:{chartAvgPct}%;border-color:var(--warn);opacity:.6;pointer-events:none"
						title="Rata-rata: {rpFull(chartAvg)}"
					></div>
				{/if}
				<div class="flex h-full items-end gap-px">
					{#each chartDays as day (day.tanggal)}
						{@const pct = chartMax > 0 ? (day.total / chartMax) * 100 : 0}
						<div
							class="flex h-full flex-1 flex-col justify-end"
							style="min-width:0"
							title="{day.tanggal}: {rpFull(day.total)}"
						>
							<div
								style="
                width:100%;
                background:{day.isToday
									? 'var(--accent)'
									: day.total > 0
										? 'var(--surface2)'
										: 'transparent'};
                height:{Math.max(pct, day.total > 0 ? 3 : 0)}%;
                border-radius:1px 1px 0 0;
                border-top:{day.isToday
									? 'none'
									: day.total > 0
										? '1px solid var(--border)'
										: 'none'}
              "
							></div>
						</div>
					{/each}
				</div>
			</div>
			<div class="mt-1 flex gap-px">
				{#each chartDays as day, i (day.tanggal)}
					{@const n = chartDays.length}
					{@const showLabel = i === 0 || i === Math.floor(n / 2) || i === n - 1 || day.isToday}
					<div
						class="flex-1 overflow-hidden text-center"
						style="min-width:0;font-size:9px;color:{day.isToday
							? 'var(--accent)'
							: 'var(--text-dim)'}"
					>
						{showLabel ? day.label : ''}
					</div>
				{/each}
			</div>
			{#if chartAvg > 0}
				<p class="mt-1 text-xs" style="color:var(--warn)">— rata-rata: {rpFull(chartAvg)}/hari</p>
			{/if}
			{#if data.penjualan_30hari.length === 0}
				<p class="mt-2 text-center text-xs" style="color:var(--text-dim)">
					Belum ada data penjualan
				</p>
			{/if}
		</div>
	</div>

	<!-- Daily table -->
	<div
		class="overflow-hidden rounded border"
		style="background:var(--surface);border-color:var(--border)"
	>
		<div class="overflow-x-auto">
			<table class="w-full text-xs">
				<thead>
					<tr style="background:var(--surface2);border-bottom:1px solid var(--border)">
						<th class="px-3 py-2 text-left font-semibold" style="color:var(--text-dim)">Tanggal</th>
						<th class="px-3 py-2 text-right font-semibold" style="color:var(--text-dim)">Omset</th>
						<th class="px-3 py-2 text-right font-semibold" style="color:var(--text-dim)">Trx</th>
						<th
							class="hidden px-3 py-2 text-right font-semibold sm:table-cell"
							style="color:var(--text-dim)">Rata/Trx</th
						>
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.tanggal)}
						<tr
							class="border-t"
							style="border-color:var(--border);background:{row.isToday
								? 'color-mix(in srgb,var(--accent) 6%,transparent)'
								: 'transparent'}"
						>
							<td class="px-3 py-2" style="color:{row.isToday ? 'var(--accent)' : 'var(--text)'}">
								{row.label}{row.isToday ? ' ★' : ''}
							</td>
							<td
								class="px-3 py-2 text-right font-mono tabular-nums"
								style="color:{row.total > 0 ? 'var(--text)' : 'var(--text-dim)'}"
							>
								{row.total > 0 ? rpFull(row.total) : '—'}
							</td>
							<td
								class="px-3 py-2 text-right tabular-nums"
								style="color:{row.jumlah_trx > 0 ? 'var(--text)' : 'var(--text-dim)'}"
							>
								{row.jumlah_trx > 0 ? row.jumlah_trx : '—'}
							</td>
							<td
								class="hidden px-3 py-2 text-right font-mono tabular-nums sm:table-cell"
								style="color:var(--text-dim)"
							>
								{row.jumlah_trx > 0 ? rp(row.total / row.jumlah_trx) : '—'}
							</td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr style="background:var(--surface2);border-top:2px solid var(--border)">
						<td class="px-3 py-2 font-bold" style="color:var(--text)">Total</td>
						<td
							class="px-3 py-2 text-right font-mono font-bold tabular-nums"
							style="color:var(--accent)">{rpFull(stats.total)}</td
						>
						<td class="px-3 py-2 text-right font-bold tabular-nums">{stats.trx}</td>
						<td
							class="hidden px-3 py-2 text-right font-mono tabular-nums sm:table-cell"
							style="color:var(--text-dim)"
						>
							{stats.trx > 0 ? rp(stats.total / stats.trx) : '—'}
						</td>
					</tr>
				</tfoot>
			</table>
		</div>
	</div>
</div>
