<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import SlideOver from '$lib/components/SlideOver.svelte';
	import DateRangePicker from '$lib/components/ui/DateRangePicker.svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import type { Column } from '$lib/components/DataTable.svelte';

	type ReturRow = {
		id: number;
		no_retur: string;
		tanggal: string;
		supplier_id: number;
		nama_supplier: string | null;
		total_retur: number;
		alasan: string | null;
		metode_refund: 'kurang_hutang' | 'tunai';
		pencatat_nama: string | null;
	};

	type BarangMasuk = { id: number; no_penerimaan: string; tanggal_terima: string; nama_supplier: string | null; };
	type Supplier = { id: number; nama_supplier: string; };
	type Hutang = { id: number; total_hutang: number; sisa_hutang: number; status: string; };
	type KasBank = { id: number; nama: string; tipe: string; };
	type SisaItem = {
		barang_id: number;
		nama_barang: string;
		kode_barang: string;
		jumlah_terima: number;
		harga_beli: number;
		sisa_retur: number;
	};
	type DetailItem = {
		barang_id: number;
		nama_barang: string;
		kode_barang: string;
		jumlah_retur: number;
		harga_beli: number;
		subtotal: number;
	};
	type ReturDetail = ReturRow & { no_penerimaan: string | null; items: DetailItem[]; };

	const kolom: Column[] = [
		{ key: 'no_retur',      label: 'No Retur',   width: 160, priority: 1 },
		{ key: 'tanggal',       label: 'Tanggal',    width: 150 },
		{ key: 'nama_supplier', label: 'Supplier',   minWidth: 120 },
		{ key: 'total_retur',   label: 'Total',      width: 120, align: 'right' },
		{ key: 'metode_refund', label: 'Metode',     width: 110, priority: 2 },
		{ key: 'aksi',          label: '',           width: 80, sortable: false, hideable: false, align: 'right' },
	];

	let rows = $state<ReturRow[]>([]);
	let dari = $state('');
	let sampai = $state('');
	let filterSupplier = $state('');

	$effect(() => { dari; sampai; muat() })
	let loading = $state(false);
	let error = $state('');

	// Sort & paginate
	let sortKey = $state('tanggal');
	let sortDir = $state<'asc' | 'desc'>('desc');
	let currentPage = $state(1);
	let pageSize = $state(25);

	let sorted = $derived.by(() => {
		const k = sortKey as keyof ReturRow;
		return [...rows].sort((a, b) => {
			const va = String(a[k] ?? '');
			const vb = String(b[k] ?? '');
			const cmp = va.localeCompare(vb, 'id', { numeric: true });
			return sortDir === 'asc' ? cmp : -cmp;
		});
	});
	let paged = $derived(
		pageSize === 0 ? sorted : sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize),
	);

	// Detail slide-over
	let detailOpen = $state(false);
	let detailData = $state<ReturDetail | null>(null);

	// Form buat retur
	let formOpen = $state(false);
	let bmList = $state<BarangMasuk[]>([]);
	let supplierList = $state<Supplier[]>([]);
	let hutangList = $state<Hutang[]>([]);
	let kasList = $state<KasBank[]>([]);
	let sisaItems = $state<SisaItem[]>([]);
	let formItems = $state<{ barang_id: number; nama_barang: string; kode_barang: string; jumlah: string; harga_beli: number; sisa_retur: number }[]>([]);
	let fBmId = $state('');
	let fMetode = $state<'kurang_hutang' | 'tunai'>('kurang_hutang');
	let fHutangId = $state('');
	let fKasBankId = $state('');
	let fAlasan = $state('');
	let fCatatan = $state('');
	let formLoading = $state(false);
	let formError = $state('');

	function rupiah(n: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
	}

	function fmtTgl(s: string) {
		return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	async function muat() {
		loading = true;
		const q = new URLSearchParams();
		if (dari) q.set('dari', dari);
		if (sampai) q.set('sampai', sampai);
		if (filterSupplier) q.set('supplier_id', filterSupplier);
		const r = await api.get<ReturRow[]>(`/retur-supplier?${q}`);
		if (r.success) rows = r.data;
		loading = false;
	}

	async function bukaDetail(id: number) {
		const r = await api.get<ReturDetail>(`/retur-supplier/${id}`);
		if (r.success) { detailData = r.data; detailOpen = true; }
	}

	async function bukaForm() {
		formError = '';
		fBmId = ''; fMetode = 'kurang_hutang'; fHutangId = ''; fKasBankId = '';
		fAlasan = ''; fCatatan = ''; sisaItems = []; formItems = [];

		const [bm, sup, kas] = await Promise.all([
			api.get<BarangMasuk[]>('/barang-masuk'),
			api.get<Supplier[]>('/supplier'),
			api.get<KasBank[]>('/keuangan/kas-bank'),
		]);
		if (bm.success) bmList = bm.data;
		if (sup.success) supplierList = sup.data;
		if (kas.success) kasList = kas.data;
		formOpen = true;
	}

	async function onBmChange() {
		if (!fBmId) { sisaItems = []; formItems = []; hutangList = []; return; }
		const [sisa] = await Promise.all([
			api.get<SisaItem[]>(`/retur-supplier/sisa/${fBmId}`),
		]);
		if (sisa.success) {
			sisaItems = sisa.data;
			formItems = sisa.data.map((s) => ({
				barang_id: s.barang_id,
				nama_barang: s.nama_barang,
				kode_barang: s.kode_barang,
				jumlah: '0',
				harga_beli: s.harga_beli,
				sisa_retur: s.sisa_retur,
			}));
		}
		// Ambil hutang supplier dari barang_masuk yang dipilih
		const bm = bmList.find((b) => b.id === Number(fBmId));
		if (bm) {
			// Hitung supplier_id dari barang_masuk (tersedia di backend via detail)
			// Ambil daftar hutang belum lunas — filter berdasarkan retur supplier endpoint
			const h = await api.get<Hutang[]>(`/keuangan/hutang?status=belum`);
			if (h.success) hutangList = h.data;
		}
	}

	let totalRetur = $derived(
		formItems.reduce((s, i) => s + i.harga_beli * (Number(i.jumlah) || 0), 0),
	);

	async function simpan() {
		formError = '';
		const items = formItems
			.filter((i) => Number(i.jumlah) > 0)
			.map((i) => ({ barang_id: i.barang_id, jumlah_retur: Number(i.jumlah), harga_beli: i.harga_beli }));

		if (!fBmId) { formError = 'Pilih dokumen penerimaan'; return; }
		if (!items.length) { formError = 'Minimal satu item dengan jumlah > 0'; return; }
		if (fMetode === 'kurang_hutang' && !fHutangId) { formError = 'Pilih hutang yang akan dikurangi'; return; }
		if (fMetode === 'tunai' && !fKasBankId) { formError = 'Pilih kas/bank penerima'; return; }

		formLoading = true;
		const r = await api.post('/retur-supplier', {
			barang_masuk_id: Number(fBmId),
			metode_refund: fMetode,
			hutang_id: fHutangId ? Number(fHutangId) : undefined,
			kas_bank_id: fKasBankId ? Number(fKasBankId) : undefined,
			alasan: fAlasan || undefined,
			catatan: fCatatan || undefined,
			items,
		});
		formLoading = false;
		if (!r.success) { formError = (r as { success: false; error: string }).error; return; }
		formOpen = false;
		muat();
	}

	onMount(muat);
</script>

<!-- Toolbar -->
<div class="flex flex-wrap gap-2 mb-3 items-end">
	<DateRangePicker label="Periode" bind:from={dari} bind:to={sampai} />
	<button onclick={muat} class="px-3 py-1 rounded text-sm border" style="border-color:var(--border);color:var(--text)">Muat</button>
	<button onclick={bukaForm} class="px-3 py-1 rounded text-sm font-bold ml-auto" style="background:var(--accent);color:var(--bg)">+ Retur Supplier</button>
</div>

<!-- Tabel -->
<div class="overflow-x-auto">
	<DataTable
		columns={kolom}
		tableId="gudang_retur_supplier"
		bind:sortKey
		bind:sortDir
		bind:currentPage
		bind:pageSize
		totalRows={rows.length}
		rowCount={paged.length}
		emptyText="Belum ada retur supplier"
		maxRows={12}
	>
		{#snippet body()}
		{#each paged as row (row.id)}
			<tr class="border-b text-sm" style="border-color:var(--border)">
				<td class="px-3 py-2 font-mono text-xs">{row.no_retur}</td>
				<td class="px-3 py-2">{fmtTgl(row.tanggal)}</td>
				<td class="px-3 py-2">{row.nama_supplier ?? '-'}</td>
				<td class="px-3 py-2 text-right">{rupiah(row.total_retur)}</td>
				<td class="px-3 py-2">
					{#if row.metode_refund === 'kurang_hutang'}
						<span class="px-2 py-0.5 rounded-full text-xs" style="background:var(--info);color:var(--bg);opacity:0.85">Kurang Hutang</span>
					{:else}
						<span class="px-2 py-0.5 rounded-full text-xs" style="background:var(--warn);color:var(--bg)">Tunai</span>
					{/if}
				</td>
				<td class="px-3 py-2 text-right">
					<button onclick={() => bukaDetail(row.id)} class="text-xs px-2 py-1 rounded border" style="border-color:var(--border);color:var(--text-dim)">Detail</button>
				</td>
			</tr>
		{/each}
		{/snippet}
	</DataTable>
</div>

<!-- Detail Slide-over -->
<SlideOver bind:open={detailOpen} title="Detail Retur Supplier">
	{#if detailData}
		<div class="flex flex-col gap-4 text-sm">
			<div class="grid grid-cols-2 gap-2">
				<div><span style="color:var(--text-dim)">No Retur</span><br><strong>{detailData.no_retur}</strong></div>
				<div><span style="color:var(--text-dim)">Tanggal</span><br>{fmtTgl(detailData.tanggal)}</div>
				<div><span style="color:var(--text-dim)">Supplier</span><br>{detailData.nama_supplier ?? '-'}</div>
				<div><span style="color:var(--text-dim)">Penerimaan</span><br>{detailData.no_penerimaan ?? '-'}</div>
				<div><span style="color:var(--text-dim)">Metode</span><br>{detailData.metode_refund === 'kurang_hutang' ? 'Kurang Hutang' : 'Tunai'}</div>
				<div><span style="color:var(--text-dim)">Total Retur</span><br><strong>{rupiah(detailData.total_retur)}</strong></div>
			</div>
			{#if detailData.alasan}
				<div><span style="color:var(--text-dim)">Alasan</span><br>{detailData.alasan}</div>
			{/if}
			<div>
				<p class="font-bold mb-2">Item Diretur</p>
				<div class="overflow-x-auto">
					<table class="min-w-full text-xs">
						<thead><tr style="color:var(--text-dim)">
							<th class="text-left py-1 pr-3">Barang</th>
							<th class="text-right py-1 pr-3">Qty</th>
							<th class="text-right py-1 pr-3">Harga Beli</th>
							<th class="text-right py-1">Subtotal</th>
						</tr></thead>
						<tbody>
							{#each detailData.items as it (it.barang_id)}
								<tr class="border-t" style="border-color:var(--border)">
									<td class="py-1 pr-3">{it.nama_barang}</td>
									<td class="py-1 pr-3 text-right">{it.jumlah_retur}</td>
									<td class="py-1 pr-3 text-right">{rupiah(it.harga_beli)}</td>
									<td class="py-1 text-right">{rupiah(it.subtotal)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{/if}
</SlideOver>

<!-- Form Retur Baru -->
<SlideOver bind:open={formOpen} title="Buat Retur Supplier">
	<div class="flex flex-col gap-4 text-sm">
		{#if formError}
			<p class="text-sm p-2 rounded" style="background:color-mix(in srgb,var(--danger) 15%,transparent);color:var(--danger)">{formError}</p>
		{/if}

		<!-- Pilih dokumen penerimaan -->
		<div class="flex flex-col gap-1">
			<label for="rs-bm" class="text-xs font-bold" style="color:var(--text-dim)">Dokumen Penerimaan *</label>
			<select id="rs-bm" bind:value={fBmId} onchange={onBmChange}
				class="border rounded px-2 py-2" style="background:var(--surface);border-color:var(--border);color:var(--text)">
				<option value="">-- Pilih --</option>
				{#each bmList as bm (bm.id)}
					<option value={String(bm.id)}>{bm.no_penerimaan} — {bm.nama_supplier ?? '-'} ({bm.tanggal_terima?.slice(0,10)})</option>
				{/each}
			</select>
		</div>

		<!-- Tabel item yang bisa diretur -->
		{#if formItems.length > 0}
			<div>
				<p class="text-xs font-bold mb-2" style="color:var(--text-dim)">Item yang bisa diretur</p>
				<div class="overflow-x-auto">
					<table class="min-w-full text-xs">
						<thead><tr style="color:var(--text-dim)">
							<th class="text-left py-1 pr-2">Barang</th>
							<th class="text-right py-1 pr-2">Sisa Retur</th>
							<th class="text-right py-1 pr-2">Harga Beli</th>
							<th class="text-right py-1 w-20">Qty Retur</th>
						</tr></thead>
						<tbody>
							{#each formItems as it, i (it.barang_id)}
								<tr class="border-t" style="border-color:var(--border)">
									<td class="py-1 pr-2">{it.nama_barang}</td>
									<td class="py-1 pr-2 text-right">{it.sisa_retur}</td>
									<td class="py-1 pr-2 text-right">{rupiah(it.harga_beli)}</td>
									<td class="py-1 text-right">
										<input type="number" min="0" max={it.sisa_retur} step="1"
											bind:value={formItems[i].jumlah}
											class="w-16 border rounded px-1 py-0.5 text-right" style="background:var(--surface);border-color:var(--border);color:var(--text)">
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<div class="text-right font-bold mt-2">Total: {rupiah(totalRetur)}</div>
			</div>
		{/if}

		<!-- Metode refund -->
		<div class="flex flex-col gap-1">
			<p class="text-xs font-bold" style="color:var(--text-dim)">Metode Refund *</p>
			<div class="flex gap-3">
				<label class="flex items-center gap-1 cursor-pointer">
					<input type="radio" bind:group={fMetode} value="kurang_hutang"> Kurang Hutang
				</label>
				<label class="flex items-center gap-1 cursor-pointer">
					<input type="radio" bind:group={fMetode} value="tunai"> Tunai
				</label>
			</div>
		</div>

		{#if fMetode === 'kurang_hutang'}
			<div class="flex flex-col gap-1">
				<label for="rs-hutang" class="text-xs font-bold" style="color:var(--text-dim)">Hutang yang Dikurangi *</label>
				<select id="rs-hutang" bind:value={fHutangId}
					class="border rounded px-2 py-2" style="background:var(--surface);border-color:var(--border);color:var(--text)">
					<option value="">-- Pilih hutang --</option>
					{#each hutangList as h (h.id)}
						<option value={String(h.id)}>#{h.id} — sisa {rupiah(h.sisa_hutang)}</option>
					{/each}
				</select>
			</div>
		{:else}
			<div class="flex flex-col gap-1">
				<label for="rs-kasbank" class="text-xs font-bold" style="color:var(--text-dim)">Kas/Bank Penerima *</label>
				<select id="rs-kasbank" bind:value={fKasBankId}
					class="border rounded px-2 py-2" style="background:var(--surface);border-color:var(--border);color:var(--text)">
					<option value="">-- Pilih --</option>
					{#each kasList as k (k.id)}
						<option value={String(k.id)}>{k.nama} ({k.tipe})</option>
					{/each}
				</select>
			</div>
		{/if}

		<div class="flex flex-col gap-1">
			<label for="rs-alasan" class="text-xs font-bold" style="color:var(--text-dim)">Alasan Retur</label>
			<input id="rs-alasan" type="text" bind:value={fAlasan} placeholder="mis. barang rusak, salah kirim"
				class="border rounded px-2 py-2" style="background:var(--surface);border-color:var(--border);color:var(--text)">
		</div>

		<div class="flex flex-col gap-1">
			<label for="rs-catatan" class="text-xs font-bold" style="color:var(--text-dim)">Catatan</label>
			<textarea id="rs-catatan" bind:value={fCatatan} rows="2"
				class="border rounded px-2 py-2 resize-none" style="background:var(--surface);border-color:var(--border);color:var(--text)"></textarea>
		</div>

		<button onclick={simpan} disabled={formLoading}
			class="w-full py-2 rounded font-bold text-sm" style="background:var(--accent);color:var(--bg);opacity:{formLoading ? 0.6 : 1}">
			{formLoading ? 'Menyimpan...' : 'Simpan Retur'}
		</button>
	</div>
</SlideOver>
