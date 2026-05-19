<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import { user } from '$lib/stores/auth.js';
	import { connectScannerSse } from '$lib/utils/scannerSse.js';
	import Modal from '$lib/components/Modal.svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import type { Column } from '$lib/components/DataTable.svelte';
	import TabStokGuide from './TabStokGuide.svelte';

	type StokItem = { id: number; kode_barang: string; nama_barang: string; stok_sekarang: number; stok_minimum: number; lokasi_rak: string | null; nama_kategori: string | null; singkatan_satuan: string | null; };
	type MutasiItem = {
		id: number;
		tanggal: string;
		jenis: string;
		referensi_tipe: string | null;
		referensi_id: number | null;
		jumlah_sebelum: number;
		jumlah_perubahan: number;
		jumlah_sesudah: number;
		dicatat_oleh_nama: string | null;
	};

	const kolStok: Column[] = [
		{ key: 'kode_barang',    label: 'Kode',     width: 100, priority: 2 },
		{ key: 'nama_barang',    label: 'Nama',     minWidth: 120 },
		{ key: 'nama_kategori',  label: 'Kategori', minWidth: 90, priority: 3 },
		{ key: 'lokasi_rak',     label: 'Rak',      width: 80, priority: 3 },
		{ key: 'stok_sekarang',  label: 'Stok',     width: 90, align: 'right' },
		{ key: 'stok_minimum',   label: 'Min',      width: 70, align: 'right', priority: 2 },
		{ key: 'status_stok',    label: 'Status',   width: 110 },
		{ key: 'aksi',           label: '',         width: 80, sortable: false, hideable: false, align: 'right' },
	];

	let pageStok = $state(1);
	let pageSizeStok = $state(25);
	let sortKeyStok = $state('nama_barang');
	let sortDirStok = $state<'asc' | 'desc'>('asc');

	let stokList = $state<StokItem[]>([]);
	let mutasiList = $state<MutasiItem[]>([]);
	let mutasiNama = $state('');
	let mutasiBarangId = $state(0);
	let showMutasi = $state(false);
	let mutasiDari = $state('');
	let mutasiSampai = $state('');
	let mutasiLoading = $state(false);
	let query = $state('');
	let loading = $state(false);

	function sortStok(list: StokItem[], key: string, dir: 'asc' | 'desc') {
		if (!key) return list;
		return [...list].sort((a, b) => {
			const va = String((a as Record<string, unknown>)[key] ?? '');
			const vb = String((b as Record<string, unknown>)[key] ?? '');
			const cmp = va.localeCompare(vb, 'id', { numeric: true });
			return dir === 'asc' ? cmp : -cmp;
		});
	}

	let filteredStok = $derived(
		!query
			? stokList
			: stokList.filter((s) =>
				s.nama_barang.toLowerCase().includes(query.toLowerCase()) ||
				s.kode_barang.includes(query)
			)
	);
	let sortedStok = $derived(sortStok(filteredStok, sortKeyStok, sortDirStok));
	let pagedStok = $derived(
		pageSizeStok === 0
			? sortedStok
			: sortedStok.slice((pageStok - 1) * pageSizeStok, pageStok * pageSizeStok)
	);

	async function muatStok() { loading = true; const r = await api.get<StokItem[]>('/stok'); if (r.success) stokList = r.data; loading = false; }

	async function muatMutasi(id: number, nama: string) {
		mutasiBarangId = id;
		mutasiNama = nama;
		mutasiDari = '';
		mutasiSampai = '';
		mutasiLoading = true;
		showMutasi = true;
		const r = await api.get<MutasiItem[]>(`/stok/${id}/mutasi`);
		if (r.success) mutasiList = r.data;
		mutasiLoading = false;
	}

	async function filterMutasi() {
		mutasiLoading = true;
		const params = new URLSearchParams();
		if (mutasiDari) params.set('dari', mutasiDari);
		if (mutasiSampai) params.set('sampai', mutasiSampai);
		const r = await api.get<MutasiItem[]>(`/stok/${mutasiBarangId}/mutasi?${params}`);
		if (r.success) mutasiList = r.data;
		mutasiLoading = false;
	}

	function labelReferensi(tipe: string | null): string {
		const map: Record<string, string> = {
			penjualan: 'Jual', pembelian: 'Beli', purchase_order: 'PO',
			retur_penjualan: 'Retur Jual', retur_pembelian: 'Retur Beli',
			stok_opname: 'Opname', koreksi_manual: 'Koreksi',
			barang_masuk: 'Terima Barang',
		};
		return tipe ? (map[tipe] ?? tipe) : '—';
	}

	function warnaMutasi(jenis: string): string {
		if (jenis === 'masuk') return 'var(--accent)';
		if (jenis === 'keluar') return 'var(--danger)';
		return 'var(--warn)';
	}

	function statusStok(item: { stok_sekarang: number; stok_minimum: number }) { if (item.stok_sekarang <= 0) return { label: 'HABIS', color: 'var(--danger)' }; if (item.stok_sekarang <= item.stok_minimum) return { label: 'HAMPIR HABIS', color: 'var(--warn)' }; return { label: 'AMAN', color: 'var(--accent)' }; }

	onMount(() => {
		muatStok();
		return connectScannerSse(`barang${$user?.id ?? 0}`, (kode) => { query = kode; });
	});
</script>

<div class="flex flex-col gap-3">
	<div class="flex items-center gap-3">
		<input type="search" placeholder="Filter nama/kode..." bind:value={query} oninput={() => { pageStok = 1; }} class="px-3 py-1 rounded border text-sm max-w-xs outline-none" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
		<span class="text-xs" style="color:var(--text-dim)">{filteredStok.length} barang</span>
	</div>
	<DataTable
		columns={kolStok}
		tableId="gudang_stok"
		bind:sortKey={sortKeyStok}
		bind:sortDir={sortDirStok}
		bind:currentPage={pageStok}
		bind:pageSize={pageSizeStok}
		totalRows={filteredStok.length}
		rowCount={pagedStok.length}
		emptyText={loading ? 'Memuat...' : 'Tidak ada data'}
		maxRows={14}
	>
		{#snippet body(hidden)}
			{#each pagedStok as item}
				{@const st = statusStok(item)}
				<tr class="border-t" style="border-color:var(--border)">
					{#if !hidden.has('kode_barang')}
						<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.kode_barang}</td>
					{/if}
					{#if !hidden.has('nama_barang')}
						<td class="px-3 py-2">{item.nama_barang}</td>
					{/if}
					{#if !hidden.has('nama_kategori')}
						<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.nama_kategori ?? '-'}</td>
					{/if}
					{#if !hidden.has('lokasi_rak')}
						<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.lokasi_rak ?? '-'}</td>
					{/if}
					{#if !hidden.has('stok_sekarang')}
						<td class="px-3 py-2 text-right font-bold" style="color:{st.color}">{item.stok_sekarang} {item.singkatan_satuan ?? ''}</td>
					{/if}
					{#if !hidden.has('stok_minimum')}
						<td class="px-3 py-2 text-right text-xs" style="color:var(--text-dim)">{item.stok_minimum}</td>
					{/if}
					{#if !hidden.has('status_stok')}
						<td class="px-3 py-2"><span class="text-xs font-bold" style="color:{st.color}">{st.label}</span></td>
					{/if}
					{#if !hidden.has('aksi')}
						<td class="px-3 py-2 text-right">
							<button onclick={() => muatMutasi(item.id, item.nama_barang)} class="text-xs" style="color:var(--info)">Riwayat</button>
						</td>
					{/if}
				</tr>
			{/each}
		{/snippet}
	</DataTable>
</div>

<Modal bind:open={showMutasi} title="Riwayat Mutasi — {mutasiNama}">
	{#snippet children()}
	<div class="space-y-3">
		<!-- Filter tanggal -->
		<div class="flex flex-wrap gap-2 items-center">
			<input type="date" bind:value={mutasiDari}
				class="rounded border px-2 py-1 text-xs outline-none"
				style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			<span class="text-xs" style="color:var(--text-dim)">s/d</span>
			<input type="date" bind:value={mutasiSampai}
				class="rounded border px-2 py-1 text-xs outline-none"
				style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			<button
				onclick={filterMutasi}
				class="rounded px-3 py-1 text-xs font-medium"
				style="background:var(--accent);color:#000"
			>Filter</button>
			{#if mutasiDari || mutasiSampai}
				<button
					onclick={() => { mutasiDari = ''; mutasiSampai = ''; filterMutasi(); }}
					class="text-xs"
					style="color:var(--text-dim)"
				>Reset</button>
			{/if}
			<span class="text-xs ml-auto" style="color:var(--text-dim)">{mutasiList.length} baris</span>
		</div>

		<!-- Tabel -->
		<div class="overflow-x-auto max-h-96 overflow-y-auto rounded border" style="border-color:var(--border)">
			{#if mutasiLoading}
				<p class="text-xs text-center py-6" style="color:var(--text-dim)">Memuat...</p>
			{:else if mutasiList.length === 0}
				<p class="text-xs text-center py-6" style="color:var(--text-dim)">Tidak ada data mutasi</p>
			{:else}
				<table class="w-full text-xs min-w-[480px]">
					<thead class="sticky top-0" style="background:var(--surface2)">
						<tr style="color:var(--text-dim)">
							<th class="text-left px-3 py-2 font-medium">Tanggal</th>
							<th class="text-left px-3 py-2 font-medium">Jenis</th>
							<th class="text-left px-3 py-2 font-medium">Referensi</th>
							<th class="text-right px-3 py-2 font-medium">Sebelum</th>
							<th class="text-right px-3 py-2 font-medium">Δ</th>
							<th class="text-right px-3 py-2 font-medium">Sesudah</th>
							<th class="text-left px-3 py-2 font-medium hidden sm:table-cell">Oleh</th>
						</tr>
					</thead>
					<tbody>
						{#each mutasiList as m}
						<tr class="border-t" style="border-color:var(--border)">
							<td class="px-3 py-1.5 font-mono" style="color:var(--text-dim)">{m.tanggal.slice(0, 16)}</td>
							<td class="px-3 py-1.5">
								<span class="font-bold" style="color:{warnaMutasi(m.jenis)}">{m.jenis}</span>
							</td>
							<td class="px-3 py-1.5" style="color:var(--text-dim)">
								{labelReferensi(m.referensi_tipe)}
								{#if m.referensi_id}<span class="font-mono">#{m.referensi_id}</span>{/if}
							</td>
							<td class="px-3 py-1.5 text-right font-mono" style="color:var(--text-dim)">{m.jumlah_sebelum}</td>
							<td class="px-3 py-1.5 text-right font-mono font-bold" style="color:{m.jumlah_perubahan >= 0 ? 'var(--accent)' : 'var(--danger)'}">
								{m.jumlah_perubahan >= 0 ? '+' : ''}{m.jumlah_perubahan}
							</td>
							<td class="px-3 py-1.5 text-right font-mono font-bold">{m.jumlah_sesudah}</td>
							<td class="px-3 py-1.5 hidden sm:table-cell" style="color:var(--text-dim)">{m.dicatat_oleh_nama ?? '—'}</td>
						</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	</div>
	{/snippet}
</Modal>

<TabStokGuide />
