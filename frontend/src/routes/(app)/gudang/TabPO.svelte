<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import Modal from '$lib/components/Modal.svelte';
	import TabPOGuide from './TabPOGuide.svelte';

	type Supplier = { id: number; nama_supplier: string; is_active: boolean; };
	type PORow = { id: number; no_po: string; tanggal_po: string; nama_supplier: string | null; status: string; total_nilai: number; };
	type SuggestItem = { id: number; kode_barang: string; nama_barang: string; stok_sekarang: number; stok_minimum: number; harga_beli_terakhir: number; saran_pesan: number; };

	let poList = $state<PORow[]>([]);
	let supplierList = $state<Supplier[]>([]);
	let suggestList = $state<SuggestItem[]>([]);
	let poSupplier = $state('');
	let poEta = $state('');
	let poItems = $state<{ barang_id: number; nama_barang: string; jumlah: string; harga_est: string }[]>([]);
	let poShowForm = $state(false);
	let poLoading = $state(false);
	let loading = $state(false);
	let error = $state('');
	let poDetail = $state<PORow | null>(null);
	let showPoDetail = $state(false);

	const SPC: Record<string, string> = { draft: 'var(--text-dim)', dikirim: 'var(--info)', sebagian: 'var(--warn)', lunas: 'var(--accent)', batal: 'var(--danger)' };

	function rupiah(n: number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n); }

	async function muatPO() { loading = true; const r = await api.get<PORow[]>('/purchase-order'); if (r.success) poList = r.data; loading = false; }
	async function muatSupplier() { const r = await api.get<Supplier[]>('/supplier'); if (r.success) supplierList = r.data; }
	async function muatSuggest() { const r = await api.get<SuggestItem[]>('/purchase-order/suggest/items'); if (r.success) suggestList = r.data; }

	function isiDariSuggest() { poItems = suggestList.map((s) => ({ barang_id: s.id, nama_barang: s.nama_barang, jumlah: String(s.saran_pesan), harga_est: String(s.harga_beli_terakhir) })); }

	async function simpanPO() {
		error = '';
		if (!poSupplier) { error = 'Pilih supplier'; return; }
		if (!poItems.length) { error = 'Tambah item PO'; return; }
		poLoading = true;
		const r = await api.post('/purchase-order', {
			supplier_id: Number(poSupplier), tanggal_estimasi_datang: poEta || undefined,
			items: poItems.map((i) => ({ barang_id: i.barang_id, jumlah_pesan: Number(i.jumlah), harga_beli_estimasi: Number(i.harga_est) || 0 })),
		});
		poLoading = false;
		if (!r.success) { error = (r as { success: false; error: string }).error; return; }
		poSupplier = ''; poEta = ''; poItems = []; poShowForm = false; muatPO();
	}

	async function lihatPO(id: number) {
		const r = await api.get<PORow>(`/purchase-order/${id}`);
		if (r.success) { poDetail = r.data; showPoDetail = true; }
	}

	async function ubahStatusPO(id: number, status: string) {
		await api.put(`/purchase-order/${id}/status`, { status });
		muatPO();
		if (poDetail?.id === id) poDetail = { ...poDetail, status };
	}

	onMount(() => { muatPO(); muatSupplier(); muatSuggest(); });
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-center gap-3">
		<h3 class="font-bold text-sm">Purchase Order</h3>
		<button onclick={() => { poShowForm = !poShowForm; error = ''; }} class="px-3 py-1 rounded text-sm font-bold" style="background:var(--accent);color:var(--bg)">{poShowForm ? '✕ Tutup' : '+ Buat PO'}</button>
		{#if suggestList.length > 0}<span class="text-xs px-2 py-1 rounded" style="background:var(--surface);color:var(--warn)">⚠ {suggestList.length} stok kritis</span>{/if}
	</div>
	{#if poShowForm}
	<div class="rounded border p-4" style="background:var(--surface);border-color:var(--border)">
		{#if error}<p class="text-xs p-2 rounded mb-3" style="background:var(--surface2);color:var(--danger)">{error}</p>{/if}
		<div class="grid grid-cols-3 gap-3 mb-3 text-sm">
			<div class="flex flex-col gap-1">
				<label for="po-sup" class="text-xs" style="color:var(--text-dim)">SUPPLIER *</label>
				<select id="po-sup" bind:value={poSupplier} class="px-2 py-1.5 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)">
					<option value="">— pilih —</option>
					{#each supplierList as s}<option value={s.id}>{s.nama_supplier}</option>{/each}
				</select>
			</div>
			<div class="flex flex-col gap-1">
				<label for="po-eta" class="text-xs" style="color:var(--text-dim)">EST. DATANG</label>
				<input id="po-eta" type="date" bind:value={poEta} class="px-2 py-1.5 rounded border outline-none text-sm" style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex items-end">
				{#if suggestList.length > 0}
				<button onclick={isiDariSuggest} class="px-3 py-1.5 rounded text-xs border" style="border-color:var(--warn);color:var(--warn)">Isi dari Stok Kritis ({suggestList.length})</button>
				{/if}
			</div>
		</div>
		{#if poItems.length > 0}
		<div class="rounded border overflow-x-auto mb-3" style="border-color:var(--border)">
			<table class="w-full text-sm">
				<thead><tr style="background:var(--surface2);color:var(--text-dim)">
					<th class="text-left px-3 py-2 font-medium">Barang</th>
					<th class="text-right px-3 py-2 font-medium w-28">Jumlah Pesan</th>
					<th class="text-right px-3 py-2 font-medium w-32">Harga Est.</th>
					<th class="px-2 py-2 w-8"></th>
				</tr></thead>
				<tbody>
					{#each poItems as item, idx}
					<tr class="border-t" style="border-color:var(--border)">
						<td class="px-3 py-2">{item.nama_barang}</td>
						<td class="px-2 py-1 text-right"><input type="number" min="1" bind:value={item.jumlah} class="w-24 text-right px-2 py-0.5 rounded border text-sm outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" /></td>
						<td class="px-2 py-1 text-right"><input type="number" min="0" bind:value={item.harga_est} class="w-28 text-right px-2 py-0.5 rounded border text-sm outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" /></td>
						<td class="px-2 text-center"><button onclick={() => poItems = poItems.filter((_, i) => i !== idx)} class="text-xs" style="color:var(--danger)">✕</button></td>
					</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{:else}
		<p class="text-xs mb-3" style="color:var(--text-dim)">Klik "Isi dari Stok Kritis" atau tambah item manual.</p>
		{/if}
		<div class="flex justify-end gap-2">
			<button onclick={() => poShowForm = false} class="px-3 py-1.5 rounded text-sm" style="color:var(--text-dim)">Batal</button>
			<button onclick={simpanPO} disabled={poLoading} class="px-6 py-1.5 rounded text-sm font-bold disabled:opacity-40" style="background:var(--accent);color:var(--bg)">{poLoading ? 'Menyimpan...' : 'Buat PO'}</button>
		</div>
	</div>
	{/if}
	<div class="rounded border overflow-x-auto" style="border-color:var(--border)">
		<table class="w-full text-sm">
			<thead><tr style="background:var(--surface2);color:var(--text-dim)">
				<th class="text-left px-3 py-2 font-medium">No PO</th>
				<th class="text-left px-3 py-2 font-medium">Tanggal</th>
				<th class="text-left px-3 py-2 font-medium">Supplier</th>
				<th class="text-left px-3 py-2 font-medium">Status</th>
				<th class="text-right px-3 py-2 font-medium">Total</th>
				<th class="px-3 py-2"></th>
			</tr></thead>
			<tbody>
				{#if loading}<tr><td colspan="6" class="px-3 py-4 text-center" style="color:var(--text-dim)">Memuat...</td></tr>
				{:else if poList.length === 0}<tr><td colspan="6" class="px-3 py-4 text-center" style="color:var(--text-dim)">Belum ada PO</td></tr>
				{:else}
					{#each poList as po}
					<tr class="border-t" style="border-color:var(--border)">
						<td class="px-3 py-2 font-mono text-xs">{po.no_po}</td>
						<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{po.tanggal_po}</td>
						<td class="px-3 py-2">{po.nama_supplier ?? '-'}</td>
						<td class="px-3 py-2"><span class="text-xs font-bold" style="color:{SPC[po.status] ?? 'var(--text-dim)'}">{po.status.toUpperCase()}</span></td>
						<td class="px-3 py-2 text-right">{rupiah(po.total_nilai)}</td>
						<td class="px-3 py-2 text-right">
							<button onclick={() => lihatPO(po.id)} class="text-xs mr-2" style="color:var(--info)">Detail</button>
							{#if po.status === 'draft'}<button onclick={() => ubahStatusPO(po.id, 'dikirim')} class="text-xs" style="color:var(--warn)">Kirim</button>{/if}
						</td>
					</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

<Modal bind:open={showPoDetail} title="Detail PO — {poDetail?.no_po ?? ''}">
	{#snippet children()}
	{#if poDetail}
	<div class="text-sm flex flex-col gap-3">
		<div class="grid grid-cols-2 gap-2 text-xs" style="color:var(--text-dim)">
			<div>Supplier: <span style="color:var(--text)">{poDetail.nama_supplier ?? '-'}</span></div>
			<div>Status: <span class="font-bold" style="color:{SPC[poDetail.status]}">{poDetail.status.toUpperCase()}</span></div>
			<div>Tanggal: <span style="color:var(--text)">{poDetail.tanggal_po}</span></div>
			<div>Total: <span style="color:var(--text)">{rupiah(poDetail.total_nilai)}</span></div>
		</div>
		<div class="flex gap-2 flex-wrap">
			{#each ['draft', 'dikirim', 'sebagian', 'lunas', 'batal'] as s}
				{#if s !== poDetail.status}
				<button onclick={() => ubahStatusPO(poDetail!.id, s)} class="px-2 py-1 rounded text-xs border" style="border-color:var(--border);color:{SPC[s]}">→ {s}</button>
				{/if}
			{/each}
		</div>
	</div>
	{/if}
	{/snippet}
</Modal>

<TabPOGuide />
