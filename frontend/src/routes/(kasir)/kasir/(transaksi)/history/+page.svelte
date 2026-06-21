<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/auth.js';
	import DataTable, { type Column } from '$lib/components/DataTable.svelte';
	import SlideOver from '$lib/components/SlideOver.svelte';
	import ReturDetailSlideOver from '../retur/ReturDetailSlideOver.svelte';
	import DateRangePicker from '$lib/components/ui/daterangepicker/daterangepicker.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { rupiah } from '../../kasir.logic';
	import { createHistoryStore } from './history.store.svelte';

	$effect(() => {
		if ($user && !['pemilik', 'manajer', 'kasir'].includes($user.role)) goto('/kasir');
	});

	const store = createHistoryStore();

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

	onMount(() => {
		void store.muatPengaturan();
		void store.muatHistori();
	});
</script>

<svelte:head><title>Riwayat Transaksi — Stokasir</title></svelte:head>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') history.back();
	}}
/>

<div class="flex min-h-[calc(100vh-44px)] flex-col gap-4">
	<div class="flex items-center justify-between">
		<h1 class="font-bold" style="color:var(--text)">Riwayat Transaksi</h1>
	</div>

	<div class="flex min-h-0 flex-1 overflow-hidden">
		<div class="flex w-full min-w-0 flex-col overflow-y-auto py-3">
			<DataTable
				columns={COLS}
				bind:sortKey={store.sortKey}
				bind:sortDir={store.sortDir}
				maxRows={999}
				rowCount={store.sortedList.length}
				loading={store.historiLoading}
				emptyText="Tidak ada transaksi"
				tableId="kasir-histori"
			>
				{#snippet toolbarStart()}
					<div class="flex flex-wrap items-center gap-2">
						<DateRangePicker bind:from={store.historiDari} bind:to={store.historiSampai} />
						<button
							onclick={store.muatHistori}
							disabled={store.historiLoading}
							class="rounded px-3 py-1 text-sm font-bold disabled:opacity-60"
							style="background:var(--accent);color:var(--bg)"
						>
							{#if store.historiLoading}<Spinner size={14} warna="currentColor" />{:else}Cari{/if}
						</button>
					</div>
				{/snippet}
				{#snippet body(hidden)}
					{#each store.sortedList as trx (trx.id)}
						<tr
							class="cursor-pointer border-t transition-colors hover:brightness-110"
							style={store.historiDetail?.id === trx.id
								? 'background:color-mix(in srgb,var(--accent) 15%,var(--surface));border-color:var(--border)'
								: `border-color:var(--border);${trx.status === 'void' ? 'opacity:0.5' : ''}`}
							onclick={() => store.pilihHistori(trx.id)}
						>
							<td class="px-3 py-2 font-mono text-xs">
								<span>{trx.no_transaksi}</span>
								{#if trx.retur_id}
									<button
										onclick={(e) => store.bukaRetur(trx.retur_id!, e)}
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
<SlideOver bind:open={store.detailOpen} title={store.historiDetail?.no_transaksi ?? 'Detail'}>
	{#if store.historiDetail}
		{@const d = store.historiDetail}
		{@const totalQty = d.items.reduce((s, i) => s + i.jumlah, 0)}
		{@const subtotalKotor = d.items.reduce((s, i) => s + i.jumlah * i.harga_jual, 0)}
		{@const diskonItem = d.items.reduce((s, i) => s + i.diskon_item, 0)}

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
				onclick={() => store.cetakStrukHistori(d)}
				class="ml-auto rounded border px-3 py-1 text-xs font-bold transition-all active:scale-95"
				style="border-color:var(--accent);color:var(--accent)">Cetak Ulang</button
			>
		</div>

		<DataTable
			columns={ITEM_COLS}
			maxRows={999}
			rowCount={d.items.length}
			tableId="kasir-histori-item"
		>
			{#snippet body(hidden)}
				{#each d.items as item (item.id)}
					<tr class="border-t" style="border-color:var(--border)">
						{#if !hidden.has('nama_barang')}
							<td class="px-3 py-1.5">
								<div>{item.nama_barang ?? '-'}</div>
								<div class="text-xs" style="color:var(--warn)">−{rupiah(item.diskon_item)}</div>
							</td>
						{/if}
						{#if !hidden.has('harga_jual')}
							<td class="px-3 py-1.5 text-right font-mono text-xs">{rupiah(item.harga_jual)}</td>
						{/if}
						{#if !hidden.has('jumlah')}
							<td class="px-3 py-1.5 text-center">{item.jumlah}</td>
						{/if}
						{#if !hidden.has('subtotal')}
							<td class="px-3 py-1.5 text-right font-mono">{rupiah(item.subtotal)}</td>
						{/if}
					</tr>
				{/each}
			{/snippet}
		</DataTable>

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

<ReturDetailSlideOver
	bind:open={store.returOpen}
	data={store.returDetail}
	loading={store.returLoading}
/>
