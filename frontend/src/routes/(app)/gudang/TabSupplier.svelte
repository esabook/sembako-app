<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import Modal from '$lib/components/Modal.svelte';

	type Supplier = { id: number; kode_supplier: string; nama_supplier: string; kontak: string | null; alamat: string | null; terms_bayar: number; limit_hutang: number; is_active: boolean; };

	let supplierList = $state<Supplier[]>([]);
	let error = $state('');
	let modalSupplier = $state(false);
	let editSupplier = $state<Partial<Supplier> | null>(null);
	let fs = $state({ kode_supplier: '', nama_supplier: '', kontak: '', alamat: '', terms_bayar: '', limit_hutang: '' });

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
	<div class="rounded border overflow-x-auto" style="border-color:var(--border)">
		<table class="w-full text-sm">
			<thead><tr style="background:var(--surface2);color:var(--text-dim)">
				<th class="text-left px-3 py-2 font-medium">Kode</th>
				<th class="text-left px-3 py-2 font-medium">Nama</th>
				<th class="text-left px-3 py-2 font-medium">Kontak</th>
				<th class="text-right px-3 py-2 font-medium">Tempo</th>
				<th class="px-3 py-2"></th>
			</tr></thead>
			<tbody>
				{#if supplierList.length === 0}<tr><td colspan="5" class="px-3 py-4 text-center" style="color:var(--text-dim)">Tidak ada data</td></tr>
				{:else}
					{#each supplierList as item}
					<tr class="border-t" style="border-color:var(--border)">
						<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.kode_supplier}</td>
						<td class="px-3 py-2">{item.nama_supplier}</td>
						<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.kontak ?? '-'}</td>
						<td class="px-3 py-2 text-right text-xs">{item.terms_bayar} hari</td>
						<td class="px-3 py-2 text-right">
							<button onclick={() => bukaFormSupplier(item)} class="text-xs mr-2" style="color:var(--info)">Edit</button>
							<button onclick={() => hapusSupplier(item.id)} class="text-xs" style="color:var(--danger)">Nonaktif</button>
						</td>
					</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
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
