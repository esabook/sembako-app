<script lang="ts">
	import { onMount } from 'svelte'
	import { createBudgetStore } from './budget.store.js'
	import {
		rupiah,
		pctRealisasi,
		statusPenjualan,
		statusPengeluaran,
		warnaDariStatus,
		labelStatus,
		bulanSebelumnya,
		bulanBerikutnya,
		labelBulan,
		bulanIni,
	} from './budget.logic.js'
	import {
		KATEGORI_LABEL,
		SEMUA_KATEGORI,
	} from './budget.types.js'
	import type { StatusMetrik } from './budget.types.js'

	const store = createBudgetStore()
	let tabAktif = $state<'periode' | 'histori'>('periode')
	const periodeIni = bulanIni()

	onMount(async () => {
		await store.muatPeriode(store.periode)
		await store.muatHistori()
	})

	async function navigasiBulan(arah: 'prev' | 'next') {
		const p = arah === 'prev'
			? bulanSebelumnya(store.periode)
			: bulanBerikutnya(store.periode)
		await store.muatPeriode(p)
	}

	const budgetMap = $derived(
		Object.fromEntries((store.data?.budgets ?? []).map(b => [b.kategori, b.nilai_budget]))
	)
	const pctOmzet = $derived(
		pctRealisasi(store.realisasi?.realisasi_omzet ?? 0, store.data?.target?.target_omzet ?? 0)
	)
	const pctTransaksi = $derived(
		pctRealisasi(store.realisasi?.realisasi_transaksi ?? 0, store.data?.target?.target_transaksi ?? 0)
	)
	const pctMargin = $derived(
		pctRealisasi(store.realisasi?.realisasi_margin_pct ?? 0, store.data?.target?.target_margin_pct ?? 0)
	)
	const adaTarget = $derived(store.data?.target != null)
	const statusOmzet = $derived(statusPenjualan(pctOmzet, adaTarget))
	const statusTransaksi = $derived(statusPenjualan(pctTransaksi, adaTarget))
	const statusMargin = $derived(
		statusPenjualan(pctMargin, adaTarget && (store.data?.target?.target_margin_pct ?? 0) > 0)
	)
	const proyeksiPct = $derived(
		store.proyeksi && store.data?.target?.target_omzet
			? pctRealisasi(store.proyeksi.proyeksi_omzet, store.data.target.target_omzet)
			: 0
	)
</script>

<div class="p-4 max-w-4xl mx-auto space-y-5">

	<!-- Header + Navigasi Bulan -->
	<div class="flex items-center justify-between gap-4 flex-wrap">
		<h1 class="text-lg font-bold" style="color: var(--text)">Budget &amp; Target</h1>
		<div class="flex items-center gap-2">
			<button
				onclick={() => navigasiBulan('prev')}
				class="px-2 py-1 rounded border text-sm"
				style="border-color: var(--border); color: var(--text-dim); background: var(--surface)"
			>←</button>
			<span class="text-sm font-mono min-w-[140px] text-center" style="color: var(--text)">
				{labelBulan(store.periode)}
			</span>
			<button
				onclick={() => navigasiBulan('next')}
				class="px-2 py-1 rounded border text-sm"
				style="border-color: var(--border); color: var(--text-dim); background: var(--surface)"
				disabled={store.periode >= periodeIni}
			>→</button>
			{#if store.periode !== periodeIni}
				<button
					onclick={() => store.muatPeriode(periodeIni)}
					class="px-2 py-1 rounded text-xs"
					style="color: var(--accent); border: 1px solid var(--accent)"
				>Bulan Ini</button>
			{/if}
		</div>
	</div>

	<!-- Tab -->
	<div class="flex gap-1 border-b" style="border-color: var(--border)">
		{#each ([['periode', 'Periode Ini'], ['histori', '6 Bulan Terakhir']] as const) as [key, label] (key)}
			<button
				onclick={() => tabAktif = key}
				class="px-4 py-2 text-sm font-mono border-b-2 -mb-px"
				style="border-color: {tabAktif === key ? 'var(--accent)' : 'transparent'}; color: {tabAktif === key ? 'var(--accent)' : 'var(--text-dim)'}"
			>{label}</button>
		{/each}
	</div>

	{#if tabAktif === 'periode'}

		<!-- Target Penjualan: 3 kartu progress -->
		<section>
			<div class="flex items-center justify-between mb-2 flex-wrap gap-2">
				<h2 class="text-sm font-mono uppercase tracking-wider" style="color: var(--text-dim)">
					Target Penjualan
				</h2>
				<div class="flex gap-2">
					{#if !adaTarget && store.histori.length > 1}
						<button
							onclick={() => store.salinBulan(bulanSebelumnya(store.periode))}
							class="text-xs px-2 py-1 rounded"
							style="color: var(--info); border: 1px solid var(--info)"
						>Salin bulan lalu</button>
					{/if}
					<button
						onclick={() => store.bukaEditTarget()}
						class="text-xs px-2 py-1 rounded"
						style="color: var(--accent); border: 1px solid var(--accent)"
					>{adaTarget ? 'Edit Target' : '+ Set Target'}</button>
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
				{@render kartuTarget(
					'Omzet',
					rupiah(store.realisasi?.realisasi_omzet ?? 0),
					adaTarget ? rupiah(store.data!.target!.target_omzet) : null,
					pctOmzet,
					statusOmzet,
				)}
				{@render kartuTarget(
					'Transaksi',
					String(store.realisasi?.realisasi_transaksi ?? 0),
					adaTarget ? String(store.data!.target!.target_transaksi) : null,
					pctTransaksi,
					statusTransaksi,
				)}
				{@render kartuTarget(
					'Margin Kotor',
					`${(store.realisasi?.realisasi_margin_pct ?? 0).toFixed(1)}%`,
					(adaTarget && (store.data?.target?.target_margin_pct ?? 0) > 0)
						? `${store.data!.target!.target_margin_pct}%`
						: null,
					pctMargin,
					statusMargin,
				)}
			</div>
		</section>

		<!-- Form Edit Target -->
		{#if store.editTarget}
			<div class="rounded-lg border p-4 space-y-3" style="border-color: var(--accent); background: var(--surface)">
				<h3 class="text-sm font-mono" style="color: var(--accent)">
					Set Target — {labelBulan(store.periode)}
				</h3>
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<label class="space-y-1">
						<span class="text-xs block" style="color: var(--text-dim)">Target Omzet (Rp)</span>
						<input
							type="number" min="0"
							bind:value={store.draftOmzet}
							class="w-full px-2 py-1.5 rounded border text-sm font-mono"
							style="border-color: var(--border); background: var(--surface2); color: var(--text)"
						/>
					</label>
					<label class="space-y-1">
						<span class="text-xs block" style="color: var(--text-dim)">Target Transaksi</span>
						<input
							type="number" min="0"
							bind:value={store.draftTransaksi}
							class="w-full px-2 py-1.5 rounded border text-sm font-mono"
							style="border-color: var(--border); background: var(--surface2); color: var(--text)"
						/>
					</label>
					<label class="space-y-1">
						<span class="text-xs block" style="color: var(--text-dim)">Target Margin (%)</span>
						<input
							type="number" min="0" max="100" step="0.5"
							bind:value={store.draftMargin}
							class="w-full px-2 py-1.5 rounded border text-sm font-mono"
							style="border-color: var(--border); background: var(--surface2); color: var(--text)"
						/>
					</label>
				</div>
				<div class="flex gap-2 justify-end">
					<button
						onclick={() => store.tutupEditTarget()}
						class="px-3 py-1.5 rounded text-sm"
						style="color: var(--text-dim); border: 1px solid var(--border)"
					>Batal</button>
					<button
						onclick={() => store.simpanTarget()}
						class="px-3 py-1.5 rounded text-sm font-mono"
						style="background: var(--accent); color: var(--bg)"
					>Simpan</button>
				</div>
			</div>
		{/if}

		<!-- Proyeksi Akhir Bulan -->
		{#if store.proyeksi && store.data?.target}
			<div class="rounded-lg border p-3 flex items-center justify-between gap-4" style="border-color: var(--border); background: var(--surface)">
				<div>
					<div class="text-xs font-mono uppercase" style="color: var(--text-dim)">Proyeksi Akhir Bulan</div>
					<div class="text-base font-mono font-bold mt-0.5" style="color: var(--info)">
						{rupiah(store.proyeksi.proyeksi_omzet)}
					</div>
					<div class="text-xs mt-0.5" style="color: var(--text-dim)">
						Hari ke-{store.proyeksi.hari_sekarang} / {store.proyeksi.hari_dalam_bulan}
						{#if store.proyeksi.hari_sekarang > 0}
							· {rupiah(Math.round(store.proyeksi.omzet_saat_ini / store.proyeksi.hari_sekarang))}/hari
						{/if}
					</div>
				</div>
				<div class="text-right shrink-0">
					<div class="text-2xl font-mono font-bold"
						style="color: {warnaDariStatus(statusPenjualan(proyeksiPct, true))}"
					>{proyeksiPct}%</div>
					<div class="text-xs" style="color: var(--text-dim)">dari target</div>
				</div>
			</div>
		{/if}

		<!-- Budget Operasional -->
		<section>
			<h2 class="text-sm font-mono uppercase tracking-wider mb-2" style="color: var(--text-dim)">
				Budget Operasional
			</h2>
			<div class="rounded-lg border overflow-hidden" style="border-color: var(--border)">
				<table class="w-full text-sm">
					<thead>
						<tr style="background: var(--surface2)">
							<th class="text-left px-3 py-2 font-mono text-xs" style="color: var(--text-dim)">Kategori</th>
							<th class="text-right px-3 py-2 font-mono text-xs" style="color: var(--text-dim)">Budget</th>
							<th class="text-right px-3 py-2 font-mono text-xs" style="color: var(--text-dim)">Realisasi</th>
							<th class="text-right px-3 py-2 font-mono text-xs" style="color: var(--text-dim)">Sisa</th>
							<th class="px-3 py-2 font-mono text-xs" style="color: var(--text-dim)">Status</th>
							<th class="px-2 py-2"></th>
						</tr>
					</thead>
					<tbody>
						{#each SEMUA_KATEGORI as kat (kat)}
							{@const budget = budgetMap[kat] ?? 0}
							{@const real = store.realisasi?.realisasi_budget[kat] ?? 0}
							{@const sisa = budget - real}
							{@const st = statusPengeluaran(real, budget)}
							<tr class="border-t" style="border-color: var(--border); background: var(--surface)">
								<td class="px-3 py-2.5" style="color: var(--text)">{KATEGORI_LABEL[kat]}</td>
								<td class="px-3 py-2.5 text-right font-mono">
									{#if budget > 0}
										<span style="color: var(--text)">{rupiah(budget)}</span>
									{:else}
										<span style="color: var(--text-dim)">—</span>
									{/if}
								</td>
								<td class="px-3 py-2.5 text-right font-mono">
									{#if real > 0}
										<span style="color: var(--text)">{rupiah(real)}</span>
									{:else}
										<span style="color: var(--text-dim)">—</span>
									{/if}
								</td>
								<td class="px-3 py-2.5 text-right font-mono">
									{#if budget > 0}
										<span style="color: {sisa < 0 ? 'var(--danger)' : 'var(--text)'}">{rupiah(sisa)}</span>
									{:else}
										<span style="color: var(--text-dim)">—</span>
									{/if}
								</td>
								<td class="px-3 py-2.5">
									{#if st !== 'kosong'}
										<span
											class="text-xs font-mono px-1.5 py-0.5 rounded"
											style="color: {warnaDariStatus(st)}; border: 1px solid {warnaDariStatus(st)}"
										>{labelStatus(st)}</span>
									{:else}
										<span style="color: var(--text-dim)">—</span>
									{/if}
								</td>
								<td class="px-2 py-2.5">
									<button
										onclick={() => store.bukaEditBudget(kat)}
										class="text-xs px-2 py-1 rounded"
										style="color: var(--text-dim); border: 1px solid var(--border)"
									>Edit</button>
								</td>
							</tr>

							<!-- Form edit inline per kategori -->
							{#if store.editBudgetKategori === kat}
								<tr style="background: var(--surface2)">
									<td colspan="6" class="px-3 py-3">
										<div class="flex flex-wrap items-center gap-2">
											<span class="text-xs shrink-0" style="color: var(--accent)">{KATEGORI_LABEL[kat]}</span>
											<input
												type="number" min="0"
												bind:value={store.draftBudget}
												class="w-36 px-2 py-1 rounded border text-sm font-mono"
												style="border-color: var(--accent); background: var(--bg); color: var(--text)"
												placeholder="Budget (Rp)"
											/>
											<input
												type="text"
												bind:value={store.draftBudgetCatatan}
												class="flex-1 min-w-0 px-2 py-1 rounded border text-sm"
												style="border-color: var(--border); background: var(--bg); color: var(--text)"
												placeholder="Catatan (opsional)"
											/>
											<button
												onclick={() => store.simpanBudget()}
												class="px-3 py-1 rounded text-sm font-mono shrink-0"
												style="background: var(--accent); color: var(--bg)"
											>Simpan</button>
											<button
												onclick={() => store.tutupEditBudget()}
												class="px-2 py-1 rounded text-sm shrink-0"
												style="color: var(--text-dim); border: 1px solid var(--border)"
											>Batal</button>
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		</section>

	{:else}

		<!-- Histori 6 Bulan -->
		<section>
			<h2 class="text-sm font-mono uppercase tracking-wider mb-3" style="color: var(--text-dim)">
				6 Bulan Terakhir
			</h2>
			<div class="rounded-lg border overflow-hidden" style="border-color: var(--border)">
				<table class="w-full text-sm">
					<thead>
						<tr style="background: var(--surface2)">
							<th class="text-left px-3 py-2 font-mono text-xs" style="color: var(--text-dim)">Bulan</th>
							<th class="text-right px-3 py-2 font-mono text-xs" style="color: var(--text-dim)">Target Omzet</th>
							<th class="text-right px-3 py-2 font-mono text-xs" style="color: var(--text-dim)">Realisasi</th>
							<th class="text-right px-3 py-2 font-mono text-xs" style="color: var(--text-dim)">Capaian</th>
							<th class="text-right px-3 py-2 font-mono text-xs hidden sm:table-cell" style="color: var(--text-dim)">Transaksi</th>
							<th class="px-2 py-2"></th>
						</tr>
					</thead>
					<tbody>
						{#each store.histori as h (h.periode)}
							{@const pct = h.target ? pctRealisasi(h.realisasi.omzet, h.target.target_omzet) : 0}
							{@const st = statusPenjualan(pct, h.target !== null)}
							<tr class="border-t" style="border-color: var(--border); background: var(--surface)">
								<td class="px-3 py-2.5 font-mono" style="color: var(--text)">
									{labelBulan(h.periode)}
									{#if h.periode === periodeIni}
										<span class="text-xs ml-1" style="color: var(--accent)">← ini</span>
									{/if}
								</td>
								<td class="px-3 py-2.5 text-right font-mono">
									{#if h.target}
										<span style="color: var(--text)">{rupiah(h.target.target_omzet)}</span>
									{:else}
										<span style="color: var(--text-dim)">—</span>
									{/if}
								</td>
								<td class="px-3 py-2.5 text-right font-mono">
									{#if h.realisasi.omzet > 0}
										<span style="color: var(--text)">{rupiah(h.realisasi.omzet)}</span>
									{:else}
										<span style="color: var(--text-dim)">—</span>
									{/if}
								</td>
								<td class="px-3 py-2.5 text-right font-mono font-bold"
									style="color: {warnaDariStatus(st)}"
								>
									{#if h.target}
										{pct}%
									{:else}
										<span style="color: var(--text-dim)">—</span>
									{/if}
								</td>
								<td class="px-3 py-2.5 text-right font-mono hidden sm:table-cell" style="color: var(--text)">
									{h.realisasi.transaksi}
								</td>
								<td class="px-2 py-2.5">
									<button
										onclick={() => { store.muatPeriode(h.periode); tabAktif = 'periode' }}
										class="text-xs px-2 py-1 rounded"
										style="color: var(--info); border: 1px solid var(--info)"
									>Buka</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

	{/if}

</div>

{#snippet kartuTarget(label: string, nilai: string, target: string | null, pct: number, status: StatusMetrik)}
	<div class="rounded-lg border p-3 space-y-2" style="border-color: var(--border); background: var(--surface)">
		<div class="text-xs font-mono uppercase" style="color: var(--text-dim)">{label}</div>
		<div class="text-lg font-mono font-bold" style="color: var(--text)">{nilai}</div>
		<div class="flex items-center justify-between gap-2">
			{#if target}
				<div class="text-xs" style="color: var(--text-dim)">Target: {target}</div>
				<span class="text-xs font-mono font-bold" style="color: {warnaDariStatus(status)}">{pct}%</span>
			{:else}
				<div class="text-xs" style="color: var(--text-dim)">Belum ada target</div>
			{/if}
		</div>
		{#if target}
			<div class="h-1.5 rounded-full overflow-hidden" style="background: var(--surface2)">
				<div
					class="h-full rounded-full"
					style="width: {Math.min(pct, 100)}%; background: {warnaDariStatus(status)}"
				></div>
			</div>
		{/if}
	</div>
{/snippet}
