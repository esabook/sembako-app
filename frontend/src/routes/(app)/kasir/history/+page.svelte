<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/auth.js';
	import DataTable, { type Column } from '$lib/components/DataTable.svelte';
	import SlideOver from '$lib/components/SlideOver.svelte';
	import ReturDetailSlideOver from '../retur/ReturDetailSlideOver.svelte';
	import { api } from '$lib/utils/api';
	import { withLoading } from '$lib/utils/async.js';
	import { toast } from '$lib/stores/ui.store';
	import { renderStrukHtml, cetakStrukPopup, type StrukData } from '$lib/utils/struk';
	import { rupiah } from '../kasir.logic';
	import Button from '$lib/components/ui/Button.svelte';
	import DateRangePicker from '$lib/components/ui/daterangepicker/daterangepicker.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import {
		fetchHistoriPenjualan,
		fetchDetailPenjualan,
		type HistoriPenjualan,
		type HistoriDetail
	} from '../kasir.api';
	import type { ReturDetail } from '../retur/retur.types.js';

	$effect(() => {
		if ($user && !['pemilik', 'manajer', 'kasir'].includes($user.role)) goto('/kasir');
	});

	// ── Pengaturan toko (untuk cetak struk) ──────────────────────────────────
	let namaToko = $state('Stokasir');
	let alamatToko = $state('');
	let strHeader = $state('');
	let strFooter = $state('Terima kasih sudah berbelanja!');
	let strUkuran = $state('80');

	// ── State ──────────────────────────────────────────────────────────────
	function todayStr() {
		return new Date().toLocaleDateString('sv-SE');
	}

	let historiDari = $state(todayStr());
	let historiSampai = $state(todayStr());
	let historiList = $state<HistoriPenjualan[]>([]);
	let historiDetail = $state<HistoriDetail | null>(null);
	let historiLoading = $state(false);
	let detailOpen = $state(false);
	let returDetail = $state<ReturDetail | null>(null);
	let returLoading = $state(false);
	let returOpen = $state(false);

	$effect(() => {
		if (!detailOpen) historiDetail = null;
	});
	$effect(() => {
		if (!returOpen) returDetail = null;
	});

	// ── DataTable ──────────────────────────────────────────────────────────
	const ITEM_COLS: Column[] = [
		{ key: 'nama_barang', label: 'Barang', sortable: false, hideable: false },
		{ key: 'harga_jual', label: 'Harga', sortable: false, align: 'right', priority: 2 },
		{ key: 'jumlah', label: 'Jml', sortable: false, align: 'center', hideable: false },
		{ key: 'subtotal', label: 'Subtotal', sortable: false, align: 'right', hideable: false }
	];

	const COLS: Column[] = [
		{ key: 'no_transaksi', label: 'No. Transaksi', sortable: true, hideable: false },
		{ key: 'tanggal', label: 'Waktu', sortable: true, hideable: false },
		{ key: 'tipe', label: 'Tipe', sortable: true, priority: 2 },
		{ key: 'metode_bayar', label: 'Metode', sortable: true, priority: 2 },
		{ key: 'status', label: 'Status', sortable: true, priority: 2 },
		{ key: 'total', label: 'Total', sortable: true, align: 'right', hideable: false }
	];

	let sortKey = $state('tanggal');
	let sortDir = $state<'asc' | 'desc'>('desc');

	const sortedList = $derived.by(() => {
		const list = [...historiList];
		list.sort((a, b) => {
			let av: string | number = '';
			let bv: string | number = '';
			if (sortKey === 'total') {
				av = a.total;
				bv = b.total;
			} else if (sortKey === 'tanggal') {
				av = a.tanggal;
				bv = b.tanggal;
			} else if (sortKey === 'no_transaksi') {
				av = a.no_transaksi;
				bv = b.no_transaksi;
			} else if (sortKey === 'metode_bayar') {
				av = a.metode_bayar;
				bv = b.metode_bayar;
			} else if (sortKey === 'tipe') {
				av = a.tipe;
				bv = b.tipe;
			} else if (sortKey === 'status') {
				av = a.status;
				bv = b.status;
			}
			const cmp = av < bv ? -1 : av > bv ? 1 : 0;
			return sortDir === 'asc' ? cmp : -cmp;
		});
		return list;
	});

	// ── Data fetch ────────────────────────────────────────────────────────
	async function muatHistori() {
		historiLoading = true;
		historiDetail = null;
		detailOpen = false;
		const hasil = await withLoading(() => fetchHistoriPenjualan(historiDari, historiSampai), {
			loadingKey: 'history-muat',
			modul: 'kasir',
			aksi: 'lihat_history',
			errorPesan: 'Gagal memuat riwayat transaksi',
			bisaRetry: true
		});
		if (hasil !== null) historiList = hasil;
		historiLoading = false;
	}

	async function pilihHistori(id: number) {
		const hasil = await withLoading(() => fetchDetailPenjualan(id), {
			loadingKey: 'history-detail',
			modul: 'kasir',
			aksi: 'lihat_detail',
			errorPesan: 'Gagal memuat detail transaksi',
			bisaRetry: true
		});
		if (hasil !== null) {
			historiDetail = hasil;
			detailOpen = true;
		}
	}

	async function bukaRetur(returId: number, e: MouseEvent) {
		e.stopPropagation();
		returLoading = true;
		returOpen = true;
		const res = await withLoading(() => api.get<ReturDetail>(`/retur-penjualan/${returId}`), {
			loadingKey: 'retur-detail',
			modul: 'kasir',
			aksi: 'lihat_retur',
			errorPesan: 'Gagal memuat detail retur',
			bisaRetry: true
		});
		if (res?.success) returDetail = res.data;
		returLoading = false;
	}

	function cetakStrukHistori(d: HistoriDetail) {
		const subtotalKotor = d.items.reduce((s, i) => s + i.jumlah * i.harga_jual, 0);
		const diskonItem = d.items.reduce((s, i) => s + i.diskon_item, 0);
		const data: StrukData = {
			ukuran: strUkuran as '58' | '80',
			namaToko,
			alamat: alamatToko,
			header: strHeader,
			footer: strFooter,
			noTransaksi: d.no_transaksi,
			waktu: new Date(d.tanggal),
			kasirNama: d.kasir_nama ?? '',
			kasirKode: d.kode_karyawan ?? null,
			pelangganNama: d.nama_pelanggan,
			items: d.items.map((i) => ({
				nama: i.nama_barang ?? '-',
				qty: i.jumlah,
				satuan: null,
				harga: i.harga_jual,
				diskon_item: i.diskon_item
			})),
			subtotalKotor,
			diskonItem,
			diskonLain: d.diskon_total,
			ppn: 0,
			total: d.total,
			metode: d.metode_bayar,
			nominal: d.bayar,
			kembali: d.kembalian
		};
		cetakStrukPopup(renderStrukHtml(data), () =>
			toast.error('Popup diblokir browser — izinkan popup untuk halaman ini')
		);
	}

	onMount(() => {
		void api.get<Record<string, string>>('/pengaturan').then((res) => {
			if (!res.success) return;
			const s = res.data;
			if (s.nama_toko) namaToko = s.nama_toko;
			if (s.alamat) alamatToko = s.alamat;
			if (s.struk_header) strHeader = s.struk_header;
			if (s.struk_footer) strFooter = s.struk_footer;
			if (s.struk_ukuran) strUkuran = s.struk_ukuran;
		});
		void muatHistori();
	});
</script>

<svelte:head><title>Riwayat Transaksi — Stokasir</title></svelte:head>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') history.back();
	}}
/>

<div class="flex h-full flex-col gap-0">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="font-bold" style="color:var(--text)">Riwayat Transaksi</h1>
		</div>
		<div class="flex gap-2">
			<Button variant="ghost" size="sm" onclick={() => goto('/kasir')}>← Kasir</Button>
		</div>
	</div>

	<!-- Filter -->
	<div
		class="flex shrink-0 flex-wrap items-center gap-3 border-b py-3"
		style="border-color:var(--border)"
	>
		<DateRangePicker bind:from={historiDari} bind:to={historiSampai} />
		<button
			onclick={muatHistori}
			disabled={historiLoading}
			class="rounded px-3 py-1 text-sm font-bold disabled:opacity-60"
			style="background:var(--accent);color:var(--bg)"
		>
			{#if historiLoading}<Spinner size={14} warna="currentColor" />{:else}Cari{/if}
		</button>
	</div>

	<!-- Content: list -->
	<div class="flex min-h-0 flex-1 overflow-hidden">
		<div class="flex w-full min-w-0 flex-col overflow-y-auto py-3">
			<DataTable
				columns={COLS}
				bind:sortKey
				bind:sortDir
				maxRows={999}
				rowCount={sortedList.length}
				loading={historiLoading}
				emptyText="Tidak ada transaksi"
				tableId="kasir-histori"
			>
				{#snippet body(hidden)}
					{#each sortedList as trx (trx.id)}
						<tr
							class="cursor-pointer border-t transition-colors hover:brightness-110"
							style={historiDetail?.id === trx.id
								? 'background:color-mix(in srgb,var(--accent) 15%,var(--surface));border-color:var(--border)'
								: `border-color:var(--border);${trx.status === 'void' ? 'opacity:0.5' : ''}`}
							onclick={() => pilihHistori(trx.id)}
						>
							<td class="px-3 py-2 font-mono text-xs">
								<span>{trx.no_transaksi}</span>
								{#if trx.retur_id}
									<button
										onclick={(e) => bukaRetur(trx.retur_id!, e)}
										class="ml-1.5 rounded px-1.5 py-0.5 text-xs font-bold transition-all hover:opacity-80"
										style="background:var(--warn);color:#000">RETUR</button
									>
								{/if}
							</td>
							<td class="px-3 py-2 text-xs" style="color:var(--text-dim)"
								>{trx.tanggal.slice(11, 16)}</td
							>
							{#if !hidden.has('tipe')}
								<td class="px-3 py-2 text-xs" style="color:var(--text-dim)"
									>{trx.tipe.toUpperCase()}</td
								>
							{/if}
							{#if !hidden.has('metode_bayar')}
								<td class="px-3 py-2 text-xs" style="color:var(--text-dim)"
									>{trx.metode_bayar.toUpperCase()}</td
								>
							{/if}
							{#if !hidden.has('status')}
								<td class="px-3 py-2 text-xs">
									{#if trx.status === 'void'}<span style="color:var(--danger)">VOID</span>
									{:else if trx.status === 'hutang'}<span style="color:var(--warn)">HUTANG</span>
									{:else}<span style="color:var(--text-dim)">LUNAS</span>{/if}
								</td>
							{/if}
							<td class="px-3 py-2 text-right font-mono font-bold">{rupiah(trx.total)}</td>
						</tr>
					{/each}
				{/snippet}
			</DataTable>
		</div>
	</div>
</div>

<!-- Detail transaksi: SlideOver -->
<SlideOver bind:open={detailOpen} title={historiDetail?.no_transaksi ?? 'Detail'}>
	{#if historiDetail}
		{@const d = historiDetail}
		{@const totalQty = d.items.reduce((s, i) => s + i.jumlah, 0)}
		{@const subtotalKotor = d.items.reduce((s, i) => s + i.jumlah * i.harga_jual, 0)}
		{@const diskonItem = d.items.reduce((s, i) => s + i.diskon_item, 0)}
		{@const adaDiskon = diskonItem > 0 || d.diskon_total > 0}

		<!-- Info grid -->
		<div class="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
			<div>
				<div style="color:var(--text-dim)">Waktu</div>
				<div class="font-medium">{d.tanggal.slice(0, 16).replace('T', ' ')}</div>
			</div>
			<div>
				<div style="color:var(--text-dim)">Kasir</div>
				<div class="font-medium">
					{d.kasir_nama ? (d.kode_karyawan ? d.kode_karyawan + ' · ' : '') + d.kasir_nama : '—'}
				</div>
			</div>
			<div>
				<div style="color:var(--text-dim)">Pelanggan</div>
				<div class="font-medium">{d.nama_pelanggan ?? '—'}</div>
			</div>
			<div>
				<div style="color:var(--text-dim)">Tipe</div>
				<div class="font-medium uppercase">{d.tipe}</div>
			</div>
		</div>

		<!-- Status + cetak -->
		<div class="mb-4 flex items-center gap-2">
			{#if d.status === 'void'}
				<span
					class="rounded px-2 py-0.5 text-xs font-bold"
					style="background:var(--danger);color:#fff">VOID</span
				>
			{:else if d.status === 'hutang'}
				<span
					class="rounded px-2 py-0.5 text-xs font-bold"
					style="background:var(--warn);color:#000">HUTANG</span
				>
			{:else}
				<span
					class="rounded px-2 py-0.5 text-xs font-bold"
					style="background:var(--accent);color:var(--bg)">LUNAS</span
				>
			{/if}
			<button
				onclick={() => cetakStrukHistori(d)}
				class="ml-auto rounded border px-3 py-1 text-xs font-bold transition-all active:scale-95"
				style="border-color:var(--accent);color:var(--accent)">Cetak Ulang</button
			>
		</div>

		<!-- Items -->
		<DataTable
			columns={ITEM_COLS}
			maxRows={999}
			rowCount={d.items.length}
			tableId="kasir-histori-item"
		>
			{#snippet body(hidden)}
				{#each d.items as item (item.id)}
					<tr class="border-t" style="border-color:var(--border)">
						<td class="px-3 py-1.5">
							<div>{item.nama_barang ?? '-'}</div>
							<div class="text-xs" style="color:var(--warn)">−{rupiah(item.diskon_item)}</div>
						</td>
						<td class="px-3 py-1.5 text-right font-mono text-xs">{rupiah(item.harga_jual)}</td>
						<td class="px-3 py-1.5 text-center">{item.jumlah}</td>
						<td class="px-3 py-1.5 text-right font-mono">{rupiah(item.subtotal)}</td>
					</tr>
				{/each}
			{/snippet}
		</DataTable>

		<!-- Ringkasan -->
		<div class="mt-4 space-y-1 border-t pt-3 text-sm" style="border-color:var(--border)">
			<div class="flex justify-between text-xs" style="color:var(--text-dim)">
				<span>Total Qty</span>
				<span>{totalQty}</span>
			</div>
			<div class="flex justify-between text-xs" style="color:var(--text-dim)">
				<span>Subtotal</span>
				<span class="font-mono">{rupiah(subtotalKotor)}</span>
			</div>
			<div class="flex justify-between text-xs" style="color:var(--warn)">
				<span>Diskon item</span>
				<span class="font-mono">−{rupiah(diskonItem)}</span>
			</div>

			<div class="flex justify-between text-xs" style="color:var(--warn)">
				<span>Diskon lain</span>
				<span class="font-mono">−{rupiah(d.diskon_total)}</span>
			</div>
			<div class="flex justify-between pt-1 font-bold">
				<span>TOTAL</span>
				<span class="font-mono" style="color:var(--accent)">{rupiah(d.total)}</span>
			</div>
			<div class="flex justify-between text-xs" style="color:var(--text-dim)">
				<span>{d.metode_bayar.toUpperCase()}</span>
				<span class="font-mono">{rupiah(d.bayar)}</span>
			</div>
			<div class="flex justify-between text-xs" style="color:var(--text-dim)">
				<span>Kembali</span>
				<span class="font-mono">{rupiah(d.kembalian)}</span>
			</div>
		</div>
	{/if}
</SlideOver>

<!-- Retur detail -->
<ReturDetailSlideOver bind:open={returOpen} data={returDetail} loading={returLoading} />
