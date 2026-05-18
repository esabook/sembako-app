<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import Modal from '$lib/components/Modal.svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import type { Column } from '$lib/components/DataTable.svelte';

	type Supplier = { id: number; kode_supplier: string; nama_supplier: string; kontak: string | null; alamat: string | null; terms_bayar: number; limit_hutang: number; is_active: boolean; };

	const kolSupplier: Column[] = [
		{ key: 'kode_supplier',  label: 'Kode',    width: 100, priority: 2 },
		{ key: 'nama_supplier',  label: 'Nama',    minWidth: 120 },
		{ key: 'kontak',         label: 'Kontak',  minWidth: 100, priority: 2 },
		{ key: 'terms_bayar',    label: 'Tempo',   width: 80, align: 'right' },
		{ key: 'aksi',           label: '',        width: 110, sortable: false, hideable: false, align: 'right' },
	];

	let pageSupplier = $state(1);
	let pageSizeSupplier = $state(25);
	let sortKeySupplier = $state('nama_supplier');
	let sortDirSupplier = $state<'asc' | 'desc'>('asc');

	let supplierList = $state<Supplier[]>([]);
	let error = $state('');
	let modalSupplier = $state(false);
	let editSupplier = $state<Partial<Supplier> | null>(null);
	let fs = $state({ kode_supplier: '', nama_supplier: '', kontak: '', alamat: '', terms_bayar: '', limit_hutang: '' });

	let sortedSupplier = $derived.by(() => {
		const key = sortKeySupplier as keyof Supplier;
		return [...supplierList].sort((a, b) => {
			const va = String(a[key] ?? '');
			const vb = String(b[key] ?? '');
			const cmp = va.localeCompare(vb, 'id', { numeric: true });
			return sortDirSupplier === 'asc' ? cmp : -cmp;
		});
	});
	let pagedSupplier = $derived(
		pageSizeSupplier === 0
			? sortedSupplier
			: sortedSupplier.slice((pageSupplier - 1) * pageSizeSupplier, pageSupplier * pageSizeSupplier)
	);

	async function muatSupplier() { const r = await api.get<Supplier[]>('/supplier'); if (r.success) supplierList = r.data; }

	function bukaFormSupplier(item?: Supplier) {
		editSupplier = item ?? null;
		fs = { kode_supplier: item?.kode_supplier ?? '', nama_supplier: item?.nama_supplier ?? '', kontak: item?.kontak ?? '', alamat: item?.alamat ?? '', terms_bayar: String(item?.terms_bayar ?? ''), limit_hutang: String(item?.limit_hutang ?? '') };
		modalSupplier = true;
	}

	async function simpanSupplier() {
		error = '';
		const p = { kode_supplier: fs.kode_supplier, nama_supplier: fs.nama_supplier, kontak: fs.kontak || undefined, alamat: fs.alamat || undefined, terms_bayar: Number(fs.terms_bayar) || 0, limit_hutang: Number(fs.limit_hutang) || 0 };
		const r = editSupplier?.id ? await api.put(`/supplier/${editSupplier.id}`, p) : await api.post('/supplier', p);
		if (!r.success) { error = (r as { success: false; error: string }).error; return; }
		modalSupplier = false; muatSupplier();
	}

	async function hapusSupplier(id: number) { if (!confirm('Nonaktifkan?')) return; await api.delete(`/supplier/${id}`); muatSupplier(); }

	onMount(muatSupplier);
</script>

<div class="flex flex-col gap-3">
	<div class="flex justify-end">
		<button onclick={() => bukaFormSupplier()} class="px-3 py-1 rounded text-sm font-bold" style="background:var(--accent);color:var(--bg)">+ Tambah</button>
	</div>
	<DataTable
		columns={kolSupplier}
		tableId="gudang_supplier"
		bind:sortKey={sortKeySupplier}
		bind:sortDir={sortDirSupplier}
		bind:currentPage={pageSupplier}
		bind:pageSize={pageSizeSupplier}
		totalRows={supplierList.length}
		rowCount={pagedSupplier.length}
		emptyText="Tidak ada data"
		maxRows={12}
	>
		{#snippet body(hidden)}
			{#each pagedSupplier as item}
			<tr class="border-t" style="border-color:var(--border)">
				{#if !hidden.has('kode_supplier')}
					<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.kode_supplier}</td>
				{/if}
				{#if !hidden.has('nama_supplier')}
					<td class="px-3 py-2">{item.nama_supplier}</td>
				{/if}
				{#if !hidden.has('kontak')}
					<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.kontak ?? '-'}</td>
				{/if}
				{#if !hidden.has('terms_bayar')}
					<td class="px-3 py-2 text-right text-xs">{item.terms_bayar} hari</td>
				{/if}
				{#if !hidden.has('aksi')}
					<td class="px-3 py-2 text-right">
						<button onclick={() => bukaFormSupplier(item)} class="text-xs mr-2" style="color:var(--info)">Edit</button>
						<button onclick={() => hapusSupplier(item.id)} class="text-xs" style="color:var(--danger)">Nonaktif</button>
					</td>
				{/if}
			</tr>
			{/each}
		{/snippet}
	</DataTable>
</div>

<Modal bind:open={modalSupplier} title={editSupplier?.id ? 'Edit Supplier' : 'Tambah Supplier'}>
	{#snippet children()}
	<form onsubmit={(e) => { e.preventDefault(); simpanSupplier(); }} class="flex flex-col gap-3 text-sm">
		{#if error}<p class="text-xs p-2 rounded" style="background:var(--surface2);color:var(--danger)">{error}</p>{/if}
		<div class="grid grid-cols-2 gap-3">
			<div class="flex flex-col gap-1"><label for="fs-kode" class="text-xs" style="color:var(--text-dim)">KODE *</label><input id="fs-kode" bind:value={fs.kode_supplier} required class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" /></div>
			<div class="flex flex-col gap-1"><label for="fs-nama" class="text-xs" style="color:var(--text-dim)">NAMA *</label><input id="fs-nama" bind:value={fs.nama_supplier} required class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" /></div>
			<div class="flex flex-col gap-1"><label for="fs-kontak" class="text-xs" style="color:var(--text-dim)">KONTAK</label><input id="fs-kontak" bind:value={fs.kontak} class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" /></div>
			<div class="flex flex-col gap-1"><label for="fs-terms" class="text-xs" style="color:var(--text-dim)">TEMPO (hari)</label><input id="fs-terms" type="number" min="0" bind:value={fs.terms_bayar} class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" /></div>
			<div class="flex flex-col gap-1 col-span-2"><label for="fs-alamat" class="text-xs" style="color:var(--text-dim)">ALAMAT</label><input id="fs-alamat" bind:value={fs.alamat} class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" /></div>
		</div>
		<div class="flex justify-end gap-2">
			<button type="button" onclick={() => modalSupplier = false} class="px-3 py-1 rounded text-sm" style="color:var(--text-dim)">Batal</button>
			<button type="submit" class="px-3 py-1 rounded text-sm font-bold" style="background:var(--accent);color:var(--bg)">Simpan</button>
		</div>
	</form>
	{/snippet}
</Modal>
