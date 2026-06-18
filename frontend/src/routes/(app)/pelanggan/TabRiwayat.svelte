<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { debounce } from '$lib/utils/async';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import DateRangePicker2 from '$lib/components/ui/DateRangePicker2.svelte';

	let {
		pelangganId = null,
		namaPelanggan = null
	}: {
		pelangganId?: number | null;
		namaPelanggan?: string | null;
	} = $props();

	type Trx = {
		id: number;
		no_transaksi: string;
		tanggal: string;
		tipe: 'eceran' | 'grosir';
		total: number;
		diskon_total: number;
		metode_bayar: string;
		status: 'lunas' | 'hutang';
	};

	type DetailItem = {
		id: number;
		nama_barang: string;
		jumlah: number;
		harga_jual: number;
		diskon_item: number;
		subtotal: number;
	};

	type Summary = {
		total_transaksi: number;
		total_belanja: number;
		rata_per_trx: number;
		terakhir_belanja: string | null;
	};

	type PlgResult = { id: number; nama: string; kontak: string | null };

	// ── State ──
	let selectedId = $state<number | null>(null);
	let selectedNama = $state<string | null>(null);

	let rows = $state<Trx[]>([]);
	let total = $state(0);
	let summary = $state<Summary | null>(null);
	let loading = $state(false);
	let error = $state('');

	let dari = $state('');
	let sampai = $state('');
	const LIMIT = 20;
	let offset = $state(0);

	let expandedId = $state<number | null>(null);
	let detailMap = $state<Record<number, DetailItem[]>>({});
	let detailLoading = $state<Record<number, boolean>>({});

	// ── Pelanggan search ──
	let plgQ = $state('');
	let plgResults = $state<PlgResult[]>([]);
	let plgLoading = $state(false);
	let plgDropdownBuka = $state(false);

	const cariPlg = debounce(async (q: string) => {
		if (q.length < 2) {
			plgResults = [];
			plgDropdownBuka = false;
			return;
		}
		plgLoading = true;
		const res = await api.get<PlgResult[]>(`/pelanggan?q=${encodeURIComponent(q)}&aktif=1`);
		plgLoading = false;
		if (res.success) {
			plgResults = res.data.slice(0, 8);
			plgDropdownBuka = plgResults.length > 0;
		}
	}, 200);

	function pilihPlg(p: PlgResult) {
		selectedId = p.id;
		selectedNama = p.nama;
		plgQ = '';
		plgResults = [];
		plgDropdownBuka = false;
	}

	$effect(() => {
		cariPlg(plgQ);
		return () => cariPlg.cancel();
	});

	// ── Helpers ──
	function fmt(n: number) {
		return new Intl.NumberFormat('id-ID').format(Math.round(n));
	}

	function tglFmt(t: string) {
		return new Date(t).toLocaleDateString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function jamFmt(t: string) {
		return t.slice(11, 16);
	}

	const METODE_LABEL: Record<string, string> = {
		tunai: 'Tunai',
		transfer: 'Transfer',
		qris: 'QRIS',
		hutang: 'Hutang'
	};

	// ── Data loading ──
	async function muat(resetOffset = true) {
		if (!selectedId) return;
		if (resetOffset) offset = 0;
		loading = true;
		error = '';
		const q = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
		if (dari) q.set('dari', dari);
		if (sampai) q.set('sampai', sampai);
		const res = await api.get<{ rows: Trx[]; total: number; summary: Summary }>(
			`/pelanggan/${selectedId}/riwayat?${q}`
		);
		loading = false;
		if (res.success) {
			rows = res.data.rows;
			total = res.data.total;
			summary = res.data.summary;
		} else {
			error = res.error ?? 'Gagal memuat riwayat';
		}
	}

	async function toggleDetail(id: number) {
		if (expandedId === id) {
			expandedId = null;
			return;
		}
		expandedId = id;
		if (detailMap[id]) return;
		detailLoading = { ...detailLoading, [id]: true };
		const res = await api.get<DetailItem[]>(`/pelanggan/${selectedId}/riwayat/${id}/detail`);
		detailLoading = { ...detailLoading, [id]: false };
		if (res.success) detailMap = { ...detailMap, [id]: res.data };
	}

	function halamanSebelum() {
		if (offset === 0) return;
		offset = Math.max(0, offset - LIMIT);
		muat(false);
	}

	function halamanBerikut() {
		if (offset + LIMIT >= total) return;
		offset += LIMIT;
		muat(false);
	}

	$effect(() => {
		selectedId = pelangganId ?? null;
		selectedNama = namaPelanggan ?? null;
	});

	$effect(() => {
		if (selectedId) muat();
	});
</script>

<div class="space-y-4">
	{#if !selectedId}
		<!-- Pelanggan search -->
		<div class="relative">
			<input
				type="text"
				bind:value={plgQ}
				placeholder="Cari pelanggan..."
				class="w-full rounded-lg border px-3 py-2 text-sm"
				style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				onfocus={() => {
					if (plgResults.length > 0) plgDropdownBuka = true;
				}}
				onblur={() => setTimeout(() => (plgDropdownBuka = false), 150)}
			/>
			{#if plgDropdownBuka && plgResults.length > 0}
				<div
					class="absolute z-10 mt-1 w-full rounded-lg border shadow-lg"
					style="background:var(--surface);border-color:var(--border)"
				>
					{#each plgResults as p (p.id)}
						<button
							class="w-full px-3 py-2 text-left text-sm hover:opacity-80"
							style="color:var(--text)"
							onmousedown={() => pilihPlg(p)}
						>
							<div class="font-medium">{p.nama}</div>
							{#if p.kontak}
								<div class="text-xs" style="color:var(--text-dim)">{p.kontak}</div>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
			{#if plgLoading}
				<div class="absolute top-2 right-3"><Spinner size={14} /></div>
			{/if}
		</div>
	{:else}
		<!-- Selected header -->
		<div class="flex items-center gap-2">
			<span class="text-sm font-semibold" style="color:var(--text)">{selectedNama}</span>
			<Button
				variant="ghost"
				size="xs"
				onclick={() => {
					selectedId = null;
					selectedNama = null;
					rows = [];
					summary = null;
				}}>✕</Button
			>
		</div>

		<!-- Summary cards -->
		{#if summary && summary.total_transaksi > 0}
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{#each [{ label: 'Total Transaksi', val: String(summary.total_transaksi), accent: false }, { label: 'Total Belanja', val: `Rp ${fmt(summary.total_belanja)}`, accent: true }, { label: 'Rata-rata/Transaksi', val: `Rp ${fmt(summary.rata_per_trx)}`, accent: false }, { label: 'Terakhir Belanja', val: summary.terakhir_belanja ? tglFmt(summary.terakhir_belanja) : '—', accent: false }] as card (card.label)}
					<div
						class="rounded-lg border p-3"
						style="background:var(--surface);border-color:var(--border)"
					>
						<div class="mb-1 text-xs" style="color:var(--text-dim)">{card.label}</div>
						<div
							class="text-sm font-bold"
							style="color:{card.accent ? 'var(--accent)' : 'var(--text)'}"
						>
							{card.val}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Filter -->
		<div class="flex flex-wrap items-center gap-2">
			<DateRangePicker2 bind:from={dari} bind:to={sampai} onchange={() => muat()} />
			{#if dari || sampai}
				<Button
					variant="ghost"
					size="sm"
					onclick={() => {
						dari = '';
						sampai = '';
						muat();
					}}>Reset</Button
				>
			{/if}
			<span class="ml-auto text-xs" style="color:var(--text-dim)">{total} transaksi</span>
		</div>

		{#if error}
			<div
				class="rounded border px-3 py-2 text-sm"
				style="background:rgba(255,82,82,.1);border-color:var(--danger);color:var(--danger)"
			>
				{error}
			</div>
		{/if}

		{#if loading}
			<div class="flex justify-center py-6"><Spinner /></div>
		{:else if rows.length === 0}
			<EmptyState
				pesan={summary?.total_transaksi === 0
					? `${selectedNama} belum pernah bertransaksi.`
					: 'Tidak ada transaksi di periode ini.'}
			/>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full" style="border-collapse:collapse;font-size:.82rem">
					<thead>
						<tr style="background:var(--surface2)">
							<th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)"
								>No. Transaksi</th
							>
							<th class="px-3 py-2 text-left text-xs font-semibold" style="color:var(--text-dim)"
								>Tanggal</th
							>
							<th
								class="hidden px-2 py-2 text-left text-xs font-semibold sm:table-cell"
								style="color:var(--text-dim)">Metode</th
							>
							<th
								class="hidden px-2 py-2 text-left text-xs font-semibold sm:table-cell"
								style="color:var(--text-dim)">Tipe</th
							>
							<th class="px-3 py-2 text-right text-xs font-semibold" style="color:var(--text-dim)"
								>Total</th
							>
							<th class="px-3 py-2 text-center text-xs font-semibold" style="color:var(--text-dim)"
								>Detail</th
							>
						</tr>
					</thead>
					<tbody>
						{#each rows as trx (trx.id)}
							<tr style="border-top:1px solid var(--border)">
								<td class="px-3 py-2" style="color:var(--text-dim);font-size:.75rem"
									>{trx.no_transaksi}</td
								>
								<td class="px-3 py-2" style="color:var(--text)">
									<div>{tglFmt(trx.tanggal)}</div>
									<div class="text-xs" style="color:var(--text-dim)">{jamFmt(trx.tanggal)}</div>
								</td>
								<td class="hidden px-2 py-2 sm:table-cell" style="color:var(--text-dim)">
									{METODE_LABEL[trx.metode_bayar] ?? trx.metode_bayar}
								</td>
								<td class="hidden px-2 py-2 sm:table-cell">
									<Badge tipe={trx.tipe === 'grosir' ? 'info' : 'netral'}>{trx.tipe}</Badge>
								</td>
								<td class="px-3 py-2 text-right font-semibold" style="color:var(--text)">
									Rp {fmt(trx.total)}
									{#if trx.diskon_total > 0}
										<div class="text-xs font-normal" style="color:var(--warn)">
											hemat Rp {fmt(trx.diskon_total)}
										</div>
									{/if}
								</td>
								<td class="px-3 py-2 text-center">
									<Button variant="ghost" size="xs" onclick={() => toggleDetail(trx.id)}>
										{expandedId === trx.id ? '▲' : '▼'}
									</Button>
								</td>
							</tr>

							{#if expandedId === trx.id}
								<tr style="border-top:1px solid var(--border);background:var(--surface)">
									<td colspan="6" class="px-3 py-2">
										{#if detailLoading[trx.id]}
											<div class="flex justify-center py-1"><Spinner size={14} /></div>
										{:else if detailMap[trx.id]}
											<div class="overflow-x-auto">
												<table class="min-w-full" style="border-collapse:collapse;font-size:.78rem">
													<thead>
														<tr>
															<th
																class="pr-4 pb-1 text-left font-semibold"
																style="color:var(--text-dim)">Barang</th
															>
															<th
																class="pr-3 pb-1 text-right font-semibold"
																style="color:var(--text-dim)">Qty</th
															>
															<th
																class="pr-3 pb-1 text-right font-semibold"
																style="color:var(--text-dim)">Harga</th
															>
															<th
																class="pb-1 text-right font-semibold"
																style="color:var(--text-dim)">Subtotal</th
															>
														</tr>
													</thead>
													<tbody>
														{#each detailMap[trx.id] as item (item.id)}
															<tr>
																<td class="py-0.5 pr-4" style="color:var(--text)"
																	>{item.nama_barang}</td
																>
																<td class="py-0.5 pr-3 text-right" style="color:var(--text-dim)"
																	>{item.jumlah}</td
																>
																<td class="py-0.5 pr-3 text-right" style="color:var(--text-dim)"
																	>Rp {fmt(item.harga_jual)}</td
																>
																<td class="py-0.5 text-right font-medium" style="color:var(--text)"
																	>Rp {fmt(item.subtotal)}</td
																>
															</tr>
														{/each}
													</tbody>
												</table>
											</div>
										{/if}
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			{#if total > LIMIT}
				<div class="flex items-center justify-between gap-3 pt-1">
					<Button variant="ghost" size="sm" disabled={offset === 0} onclick={halamanSebelum}
						>← Sebelum</Button
					>
					<span class="text-xs" style="color:var(--text-dim)">
						{offset + 1}–{Math.min(offset + LIMIT, total)} dari {total}
					</span>
					<Button
						variant="ghost"
						size="sm"
						disabled={offset + LIMIT >= total}
						onclick={halamanBerikut}>Berikut →</Button
					>
				</div>
			{/if}
		{/if}
	{/if}
</div>
