<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import { bukaWhatsApp } from '$lib/utils/wa.js';
	import SlideOver from '$lib/components/SlideOver.svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import type { Column } from '$lib/components/DataTable.svelte';
	import TabPOGuide from './TabPOGuide.svelte';
	import { rupiah } from '$lib/utils/format';
	import Button from '$lib/components/ui/Button.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import DatePicker2 from '$lib/components/ui/DatePicker2.svelte';

	type Supplier = { id: number; nama_supplier: string; is_active: boolean };
	type PORow = {
		id: number;
		no_po: string;
		tanggal_po: string;
		nama_supplier: string | null;
		kontak_supplier: string | null;
		status: string;
		total_nilai: number;
	};
	type SuggestItem = {
		id: number;
		kode_barang: string;
		nama_barang: string;
		stok_sekarang: number;
		stok_minimum: number;
		harga_beli_terakhir: number;
		saran_pesan: number;
	};

	const kolPO: Column[] = [
		{ key: 'no_po', label: 'No PO', width: 130 },
		{ key: 'tanggal_po', label: 'Tanggal', width: 100, priority: 2 },
		{ key: 'nama_supplier', label: 'Supplier', minWidth: 100 },
		{ key: 'status', label: 'Status', width: 90 },
		{ key: 'total_nilai', label: 'Total', width: 130, align: 'right' },
		{ key: 'aksi', label: '', width: 130, sortable: false, hideable: false, align: 'right' }
	];

	let pagePO = $state(1);
	let pageSizePO = $state(25);
	let sortKeyPO = $state('tanggal_po');
	let sortDirPO = $state<'asc' | 'desc'>('desc');

	let poList = $state<PORow[]>([]);
	let supplierList = $state<Supplier[]>([]);
	let suggestList = $state<SuggestItem[]>([]);
	let poSupplier = $state('');
	let poEta = $state('');
	let poItems = $state<
		{ barang_id: number; nama_barang: string; jumlah: string; harga_est: string }[]
	>([]);
	let poShowForm = $state(false);
	let poLoading = $state(false);
	let loading = $state(false);
	let error = $state('');
	let poDetail = $state<PORow | null>(null);
	let showPoDetail = $state(false);

	const SPC: Record<string, string> = {
		draft: 'var(--text-dim)',
		dikirim: 'var(--info)',
		sebagian: 'var(--warn)',
		lunas: 'var(--accent)',
		batal: 'var(--danger)'
	};

	async function muatPO() {
		loading = true;
		const r = await api.get<PORow[]>('/purchase-order');
		if (r.success) poList = r.data;
		loading = false;
	}
	async function muatSupplier() {
		const r = await api.get<Supplier[]>('/supplier');
		if (r.success) supplierList = r.data;
	}
	async function muatSuggest() {
		const r = await api.get<SuggestItem[]>('/purchase-order/suggest/items');
		if (r.success) suggestList = r.data;
	}

	function isiDariSuggest() {
		poItems = suggestList.map((s) => ({
			barang_id: s.id,
			nama_barang: s.nama_barang,
			jumlah: String(s.saran_pesan),
			harga_est: String(s.harga_beli_terakhir)
		}));
	}

	async function simpanPO() {
		error = '';
		if (!poSupplier) {
			error = 'Pilih supplier';
			return;
		}
		if (!poItems.length) {
			error = 'Tambah item PO';
			return;
		}
		poLoading = true;
		const r = await api.post('/purchase-order', {
			supplier_id: Number(poSupplier),
			tanggal_estimasi_datang: poEta || undefined,
			items: poItems.map((i) => ({
				barang_id: i.barang_id,
				jumlah_pesan: Number(i.jumlah),
				harga_beli_estimasi: Number(i.harga_est) || 0
			}))
		});
		poLoading = false;
		if (!r.success) {
			error = (r as { success: false; error: string }).error;
			return;
		}
		poSupplier = '';
		poEta = '';
		poItems = [];
		poShowForm = false;
		muatPO();
	}

	async function lihatPO(id: number) {
		const r = await api.get<PORow>(`/purchase-order/${id}`);
		if (r.success) {
			poDetail = r.data;
			showPoDetail = true;
		}
	}

	async function ubahStatusPO(id: number, status: string) {
		await api.put(`/purchase-order/${id}/status`, { status });
		muatPO();
		if (poDetail?.id === id) poDetail = { ...poDetail, status };
	}

	function kirimPOWA(po: PORow) {
		const rp = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n));
		const pesan = [
			'*PURCHASE ORDER*',
			`No PO : ${po.no_po}`,
			`Tgl   : ${po.tanggal_po}`,
			`Total : Rp ${rp(po.total_nilai)}`,
			'',
			'Mohon konfirmasi ketersediaan dan estimasi pengiriman.',
			'Terima kasih.'
		].join('\n');
		bukaWhatsApp(po.kontak_supplier, pesan);
	}

	let sortedPO = $derived.by(() => {
		const key = sortKeyPO as keyof PORow;
		return [...poList].sort((a, b) => {
			const va = String(a[key] ?? '');
			const vb = String(b[key] ?? '');
			const cmp = va.localeCompare(vb, 'id', { numeric: true });
			return sortDirPO === 'asc' ? cmp : -cmp;
		});
	});
	let pagedPO = $derived(
		pageSizePO === 0 ? sortedPO : sortedPO.slice((pagePO - 1) * pageSizePO, pagePO * pageSizePO)
	);

	onMount(() => {
		muatPO();
		muatSupplier();
		muatSuggest();
	});
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-center gap-3">
		<h3 class="text-sm font-bold">Purchase Order</h3>
		<Button
			onclick={() => {
				poShowForm = !poShowForm;
				error = '';
			}}>{poShowForm ? '✕ Tutup' : '+ Buat PO'}</Button
		>
		{#if suggestList.length > 0}<span class="rounded px-2 py-1 text-xs" style="color:var(--warn)"
				>⚠ {suggestList.length} stok kritis</span
			>{/if}
	</div>
	{#if poShowForm}
		<div class="rounded border p-4" style="border-color:var(--border)">
			{#if error}<p
					class="mb-3 rounded p-2 text-xs"
					style="background:var(--surface2);color:var(--danger)"
				>
					{error}
				</p>{/if}
			<div class="mb-3 grid grid-cols-3 gap-3 text-sm">
				<div class="flex flex-col gap-1">
					<label for="po-sup" class="text-xs" style="color:var(--text-dim)">SUPPLIER *</label>
					<Select
						bind:value={poSupplier}
						options={supplierList.map(s => ({ value: s.id, label: s.nama_supplier }))}
						placeholder="— pilih —"
					/>
				</div>
				<DatePicker2 label="EST. DATANG" bind:value={poEta} />
				<div class="flex items-end">
					{#if suggestList.length > 0}
						<Button variant="ghost" size="sm" onclick={isiDariSuggest}
							>Isi dari Stok Kritis ({suggestList.length})</Button
						>
					{/if}
				</div>
			</div>
			{#if poItems.length > 0}
				<div class="mb-3 overflow-x-auto rounded border" style="border-color:var(--border)">
					<table class="w-full text-sm">
						<thead
							><tr style="background:var(--surface2);color:var(--text-dim)">
								<th class="px-3 py-2 text-left font-medium">Barang</th>
								<th class="w-28 px-3 py-2 text-right font-medium">Jumlah Pesan</th>
								<th class="w-32 px-3 py-2 text-right font-medium">Harga Est.</th>
								<th class="w-8 px-2 py-2"></th>
							</tr></thead
						>
						<tbody>
							{#each poItems as item, idx (item.barang_id)}
								<tr class="border-t" style="border-color:var(--border)">
									<td class="px-3 py-2">{item.nama_barang}</td>
									<td class="px-2 py-1 text-right"
										><input
											type="number"
											min="1"
											bind:value={item.jumlah}
											class="w-24 rounded border px-2 py-0.5 text-right text-sm outline-none"
											style="background:var(--surface2);border-color:var(--border);color:var(--text)"
										/></td
									>
									<td class="px-2 py-1 text-right"
										><input
											type="number"
											min="0"
											bind:value={item.harga_est}
											class="w-28 rounded border px-2 py-0.5 text-right text-sm outline-none"
											style="background:var(--surface2);border-color:var(--border);color:var(--text)"
										/></td
									>
									<td class="px-2 text-center"
										><Button
											variant="danger"
											size="xs"
											onclick={() => (poItems = poItems.filter((_, i) => i !== idx))}>✕</Button
										></td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="mb-3 text-xs" style="color:var(--text-dim)">
					Klik "Isi dari Stok Kritis" atau tambah item manual.
				</p>
			{/if}
			<div class="flex justify-end gap-2">
				<Button variant="dim" onclick={() => (poShowForm = false)}>Batal</Button>
				<Button onclick={simpanPO} loading={poLoading}>Buat PO</Button>
			</div>
		</div>
	{/if}
	<DataTable
		columns={kolPO}
		tableId="gudang_po"
		bind:sortKey={sortKeyPO}
		bind:sortDir={sortDirPO}
		bind:currentPage={pagePO}
		bind:pageSize={pageSizePO}
		totalRows={poList.length}
		rowCount={pagedPO.length}
		emptyText="Belum ada PO"
		maxRows={12}
	>
		{#snippet body(hidden)}
			{#each pagedPO as po (po.id)}
				<tr class="border-t" style="border-color:var(--border)">
					{#if !hidden.has('no_po')}
						<td class="px-3 py-2 font-mono text-xs">{po.no_po}</td>
					{/if}
					{#if !hidden.has('tanggal_po')}
						<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{po.tanggal_po}</td>
					{/if}
					{#if !hidden.has('nama_supplier')}
						<td class="px-3 py-2">{po.nama_supplier ?? '-'}</td>
					{/if}
					{#if !hidden.has('status')}
						<td class="px-3 py-2"
							><span class="text-xs font-bold" style="color:{SPC[po.status] ?? 'var(--text-dim)'}"
								>{po.status.toUpperCase()}</span
							></td
						>
					{/if}
					{#if !hidden.has('total_nilai')}
						<td class="px-3 py-2 text-right">{rupiah(po.total_nilai)}</td>
					{/if}
					{#if !hidden.has('aksi')}
						<td class="px-3 py-2 text-right">
							<Button variant="ghost" size="xs" onclick={() => lihatPO(po.id)}>Detail</Button>
							{#if po.status === 'draft'}<Button
									variant="ghost"
									size="xs"
									onclick={() => ubahStatusPO(po.id, 'dikirim')}>Kirim</Button
								>{/if}
							<Button variant="ghost" size="xs" onclick={() => kirimPOWA(po)}>WA</Button>
						</td>
					{/if}
				</tr>
			{/each}
		{/snippet}
	</DataTable>
</div>

<SlideOver bind:open={showPoDetail} title="Detail PO — {poDetail?.no_po ?? ''}">
	{#if poDetail}
		<div class="flex flex-col gap-3 text-sm">
			<div class="grid grid-cols-2 gap-2 text-xs" style="color:var(--text-dim)">
				<div>Supplier: <span style="color:var(--text)">{poDetail.nama_supplier ?? '-'}</span></div>
				<div>
					Status: <span class="font-bold" style="color:{SPC[poDetail.status]}"
						>{poDetail.status.toUpperCase()}</span
					>
				</div>
				<div>Tanggal: <span style="color:var(--text)">{poDetail.tanggal_po}</span></div>
				<div>Total: <span style="color:var(--text)">{rupiah(poDetail.total_nilai)}</span></div>
			</div>
			<div class="flex flex-wrap gap-2">
				{#each ['draft', 'dikirim', 'sebagian', 'lunas', 'batal'] as s (s)}
					{#if s !== poDetail.status}
						<Button variant="ghost" size="xs" onclick={() => ubahStatusPO(poDetail!.id, s)}
							>→ {s}</Button
						>
					{/if}
				{/each}
				<Button variant="ghost" size="xs" onclick={() => kirimPOWA(poDetail!)}
					>Kirim WA ke Supplier</Button
				>
			</div>
		</div>
	{/if}
</SlideOver>

<TabPOGuide />
