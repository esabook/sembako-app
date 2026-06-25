<script lang="ts">
	import type { createLaporanStore } from '../laporan.store.svelte';
	import { fmt, tglFmt } from '../laporan.logic';
	import DateRangePicker from '$lib/components/ui/daterangepicker/daterangepicker.svelte';
	import ChartKartu from '$lib/components/chart/ChartKartu.svelte';

	let { store }: { store: ReturnType<typeof createLaporanStore> } = $props();
</script>

<!-- Filter Analitik -->
<div style="display:flex; gap:.75rem; align-items:center; margin-bottom:1rem; flex-wrap:wrap">
	<DateRangePicker bind:from={store.periodeJam.dari} bind:to={store.periodeJam.sampai} />
	<button
		onclick={() => store.muatAnalitikJam()}
		style="padding:.35rem .8rem; background:var(--accent); color:var(--bg); border:none; border-radius:4px; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer"
		>Tampilkan</button
	>
	{#each [{ label: 'Bulan ini', fn: () => {
				store.periodeJam = store.defaultPeriode();
				store.muatAnalitikJam();
			} }, { label: 'Bulan lalu', fn: () => {
				store.periodeJam = store.periodeSebelumnya();
				store.muatAnalitikJam();
			} }] as s (s.label)}
		<button
			onclick={s.fn}
			style="padding:.25rem .6rem; background:transparent; border:1px solid var(--border); border-radius:4px; color:var(--text-dim); font-family:inherit; font-size:.72rem; cursor:pointer"
			>{s.label}</button
		>
	{/each}
</div>

<ChartKartu kosong={!store.analitikJam} pesanKosong="Pilih periode lalu klik Tampilkan.">
	{#if store.analitikJam}
		{@const aj = store.analitikJam}
		{@const maxTrx = Math.max(...aj.per_jam.map((r) => r.jumlah_transaksi), 1)}
		{@const maxOmzet = Math.max(...aj.per_jam.map((r) => r.omzet), 1)}
		<div>
		<div style="text-align:center; margin-bottom:1.5rem">
			<div style="font-size:1rem; font-weight:700; color:var(--text)">
				ANALITIK TRANSAKSI PER JAM
			</div>
			<div style="font-size:.8rem; color:var(--text-dim)">
				{tglFmt(aj.dari)} — {tglFmt(aj.sampai)}
			</div>
		</div>

		<!-- Summary -->
		<div style="display:flex; gap:1rem; margin-bottom:1.5rem; flex-wrap:wrap">
			<div
				style="padding:.65rem 1rem; background:var(--surface); border:1px solid var(--border); border-radius:6px"
			>
				<div style="font-size:.7rem; color:var(--text-dim); margin-bottom:.2rem">
					Total Transaksi
				</div>
				<div style="font-size:.95rem; font-weight:700; color:var(--text)">
					{aj.total_transaksi.toLocaleString('id-ID')}
				</div>
			</div>
			<div
				style="padding:.65rem 1rem; background:var(--surface); border:1px solid var(--border); border-radius:6px"
			>
				<div style="font-size:.7rem; color:var(--text-dim); margin-bottom:.2rem">Total Omzet</div>
				<div style="font-size:.95rem; font-weight:700; color:var(--accent)">
					Rp {fmt(aj.total_omzet)}
				</div>
			</div>
			{#if aj.jam_sibuk.length > 0}
				<div
					style="padding:.65rem 1rem; background:var(--surface); border:1px solid var(--border); border-radius:6px"
				>
					<div style="font-size:.7rem; color:var(--text-dim); margin-bottom:.2rem">
						Jam Sibuk (≥70% peak)
					</div>
					<div style="font-size:.9rem; font-weight:700; color:var(--warn)">
						{aj.jam_sibuk.map((j) => j + ':00').join(', ')}
					</div>
				</div>
			{/if}
		</div>

		<!-- Bar chart: jumlah transaksi per jam -->
		<div style="margin-bottom:2rem">
			<div
				style="font-size:.75rem; font-weight:600; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.75rem"
			>
				Jumlah Transaksi per Jam
			</div>
			<div
				style="display:flex; align-items:flex-end; gap:2px; height:140px; padding-bottom:1.5rem; position:relative"
			>
				{#each aj.per_jam as jam (jam.jam)}
					{@const pct = maxTrx > 0 ? (jam.jumlah_transaksi / maxTrx) * 100 : 0}
					{@const isSibuk = aj.jam_sibuk.includes(jam.jam)}
					<div
						style="flex:1; display:flex; flex-direction:column; align-items:center; height:100%; position:relative; min-width:0"
						title="{jam.jam}:00 — {jam.jumlah_transaksi} transaksi, Rp {fmt(jam.omzet)}"
					>
						<div style="flex:1; width:100%; display:flex; align-items:flex-end">
							<div
								style="width:100%; height:{pct}%; min-height:{pct > 0 ? 2 : 0}px;
                background:{isSibuk ? 'var(--warn)' : 'var(--accent)'};
                opacity:{pct === 0 ? 0.2 : 1}; border-radius:2px 2px 0 0;
                transition:height .3s"
							></div>
						</div>
						<div
							style="position:absolute; bottom:-1.4rem; font-size:.55rem; color:var(--text-dim); white-space:nowrap"
						>
							{jam.jam}
						</div>
					</div>
				{/each}
			</div>
			<div
				style="display:flex; gap:1rem; margin-top:.5rem; font-size:.72rem; color:var(--text-dim)"
			>
				<span style="display:flex; align-items:center; gap:.3rem">
					<span
						style="display:inline-block; width:.65rem; height:.65rem; background:var(--warn); border-radius:2px"
					></span>
					Jam sibuk
				</span>
				<span style="display:flex; align-items:center; gap:.3rem">
					<span
						style="display:inline-block; width:.65rem; height:.65rem; background:var(--accent); border-radius:2px"
					></span>
					Normal
				</span>
			</div>
		</div>

		<!-- Bar chart: omzet per jam -->
		<div style="margin-bottom:2rem">
			<div
				style="font-size:.75rem; font-weight:600; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.75rem"
			>
				Omzet per Jam
			</div>
			<div
				style="display:flex; align-items:flex-end; gap:2px; height:100px; padding-bottom:1.5rem; position:relative"
			>
				{#each aj.per_jam as jam (jam.jam)}
					{@const pct = maxOmzet > 0 ? (jam.omzet / maxOmzet) * 100 : 0}
					{@const isSibuk = aj.jam_sibuk.includes(jam.jam)}
					<div
						style="flex:1; display:flex; flex-direction:column; align-items:center; height:100%; position:relative; min-width:0"
						title="{jam.jam}:00 — Rp {fmt(jam.omzet)}"
					>
						<div style="flex:1; width:100%; display:flex; align-items:flex-end">
							<div
								style="width:100%; height:{pct}%; min-height:{pct > 0 ? 2 : 0}px;
                background:{isSibuk
									? 'rgba(245,197,24,.7)'
									: 'rgba(var(--accent-rgb, 0,128,0),.4)'};
                opacity:{pct === 0 ? 0.15 : 1}; border-radius:2px 2px 0 0;
                transition:height .3s"
							></div>
						</div>
						<div
							style="position:absolute; bottom:-1.4rem; font-size:.55rem; color:var(--text-dim); white-space:nowrap"
						>
							{jam.jam}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Tabel detail -->
		<div style="margin-top:1rem">
			<div
				style="font-size:.75rem; font-weight:600; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem"
			>
				Detail per Jam
			</div>
			<div style="overflow-x:auto">
				<table style="width:100%; border-collapse:collapse; font-size:.8rem; min-width:380px">
					<thead>
						<tr style="background:var(--surface2)">
							<th
								style="padding:.35rem .75rem; text-align:left; color:var(--text-dim); font-weight:600"
								>Jam</th
							>
							<th
								style="padding:.35rem .75rem; text-align:right; color:var(--text-dim); font-weight:600"
								>Transaksi</th
							>
							<th
								style="padding:.35rem .75rem; text-align:right; color:var(--text-dim); font-weight:600"
								>Omzet</th
							>
							<th
								style="padding:.35rem .75rem; text-align:right; color:var(--text-dim); font-weight:600 "
								class="hidden sm:table-cell">Rata-rata/Trx</th
							>
							<th
								style="padding:.35rem .75rem; text-align:left; color:var(--text-dim); font-weight:600"
								class="hidden sm:table-cell">Volume</th
							>
						</tr>
					</thead>
					<tbody>
						{#each aj.per_jam.filter((r) => r.jumlah_transaksi > 0) as jam (jam.jam)}
							{@const isSibuk = aj.jam_sibuk.includes(jam.jam)}
							{@const pct = maxTrx > 0 ? (jam.jumlah_transaksi / maxTrx) * 100 : 0}
							<tr
								style="border-top:1px solid var(--border); background:{isSibuk
									? 'rgba(245,197,24,.06)'
									: 'transparent'}"
							>
								<td
									style="padding:.35rem .75rem; font-weight:600; color:{isSibuk
										? 'var(--warn)'
										: 'var(--text)'}"
								>
									{jam.jam}:00
									{#if isSibuk}<span style="font-size:.65rem; margin-left:.25rem">🔥</span>{/if}
								</td>
								<td style="padding:.35rem .75rem; text-align:right; color:var(--text)"
									>{jam.jumlah_transaksi}</td
								>
								<td
									style="padding:.35rem .75rem; text-align:right; font-weight:600; color:var(--text)"
									>Rp {fmt(jam.omzet)}</td
								>
								<td
									style="padding:.35rem .75rem; text-align:right; color:var(--text-dim)"
									class="hidden sm:table-cell">Rp {fmt(jam.rata_per_trx)}</td
								>
								<td style="padding:.35rem .75rem" class="hidden sm:table-cell">
									<div
										style="background:var(--surface2); border-radius:2px; height:6px; width:100%; min-width:60px"
									>
										<div
											style="background:{isSibuk
												? 'var(--warn)'
												: 'var(--accent)'}; height:100%; width:{pct}%; border-radius:2px"
										></div>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
		</div>
	{/if}
</ChartKartu>
