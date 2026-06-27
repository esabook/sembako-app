<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import { user } from '$lib/stores/auth.js';
	import { connectScannerRelay } from '$lib/utils/scannerSse';
	import DataTable from '$lib/components/DataTable.svelte';
	import type { Column } from '$lib/components/DataTable.svelte';
	import TabOpnameGuide from './TabOpnameGuide.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	type OpnameRow = {
		id: number;
		no_opname: string;
		tanggal_mulai: string;
		tanggal_selesai: string | null;
		status: string;
	};
	type OpnameDetail = OpnameRow & {
		progress: number;
		sudah_dihitung: number;
		items: {
			id: number;
			barang_id: number;
			kode_barang: string;
			nama_barang: string;
			nama_kategori: string | null;
			singkatan_satuan: string | null;
			lokasi_rak: string | null;
			stok_sistem: number;
			stok_fisik: number | null;
			selisih: number | null;
			alasan_selisih: string | null;
		}[];
	};

	const kolOpname: Column[] = [
		{ key: 'no_opname', label: 'No Opname', width: 140 },
		{ key: 'tanggal_mulai', label: 'Mulai', width: 100 },
		{ key: 'tanggal_selesai', label: 'Selesai', width: 100, priority: 2 },
		{ key: 'status', label: 'Status', width: 90 }
	];

	const kolItem: Column[] = [
		{ key: 'kode_barang', label: 'Kode', width: 90, priority: 2 },
		{ key: 'nama_barang', label: 'Nama', minWidth: 120 },
		{ key: 'lokasi_rak', label: 'Rak', width: 70, priority: 3 },
		{ key: 'stok_sistem', label: 'Sistem', width: 80, align: 'right' },
		{ key: 'stok_fisik', label: 'Fisik', width: 100, align: 'right', sortable: false },
		{ key: 'selisih', label: 'Selisih', width: 80, align: 'right' }
	];

	let sortKeyOpname = $state('tanggal_mulai');
	let sortDirOpname = $state<'asc' | 'desc'>('desc');
	let sortKeyItem = $state('nama_barang');
	let sortDirItem = $state<'asc' | 'desc'>('asc');
	let pageItem = $state(1);
	let pageSizeItem = $state(25);

	let opnameList = $state<OpnameRow[]>([]);
	let opnameAktif = $state<OpnameDetail | null>(null);
	let opnameSaving = $state(false);
	let opnameFilter = $state('');
	let opnameItemSaving = $state<Set<number>>(new Set());
	let error = $state('');

	type ItemRow = OpnameDetail['items'][number];

	let sortedOpname = $derived.by(() => {
		const key = sortKeyOpname as keyof OpnameRow;
		return [...opnameList].sort((a, b) => {
			const va = String(a[key] ?? '');
			const vb = String(b[key] ?? '');
			const cmp = va.localeCompare(vb, 'id', { numeric: true });
			return sortDirOpname === 'asc' ? cmp : -cmp;
		});
	});

	let filteredItems = $derived(
		!opnameAktif
			? []
			: !opnameFilter
				? opnameAktif.items
				: opnameAktif.items.filter(
						(i) =>
							i.nama_barang.toLowerCase().includes(opnameFilter.toLowerCase()) ||
							i.kode_barang.toLowerCase().includes(opnameFilter.toLowerCase())
					)
	);

	let sortedItems = $derived.by(() => {
		const key = sortKeyItem as keyof ItemRow;
		return [...filteredItems].sort((a, b) => {
			const va = String((a as Record<string, unknown>)[key as string] ?? '');
			const vb = String((b as Record<string, unknown>)[key as string] ?? '');
			const cmp = va.localeCompare(vb, 'id', { numeric: true });
			return sortDirItem === 'asc' ? cmp : -cmp;
		});
	});

	let pagedItems = $derived(
		pageSizeItem === 0
			? sortedItems
			: sortedItems.slice((pageItem - 1) * pageSizeItem, pageItem * pageSizeItem)
	);

	async function muatOpname() {
		const r = await api.get<OpnameRow[]>('/stok-opname');
		if (r.success) opnameList = r.data;
	}

	async function muatOpnameAktif() {
		const aktif = opnameList.find((o) => o.status === 'proses' || o.status === 'draft');
		if (!aktif) {
			opnameAktif = null;
			return;
		}
		const r = await api.get<OpnameDetail>(`/stok-opname/${aktif.id}`);
		if (r.success) opnameAktif = r.data;
	}

	type KonfirmMode = 'buat' | 'approve' | 'batal';
	let konfirmMode = $state<KonfirmMode | null>(null);
	let konfirmBuka = $state(false);

	function bukaKonfirm(mode: KonfirmMode) {
		konfirmMode = mode;
		konfirmBuka = true;
	}
	function tutupKonfirm() {
		konfirmMode = null;
		konfirmBuka = false;
	}

	async function buatOpname() {
		opnameSaving = true;
		const r = await api.post('/stok-opname', {});
		opnameSaving = false;
		if (!r.success) {
			error = (r as { success: false; error: string }).error;
			return;
		}
		await muatOpname();
		await muatOpnameAktif();
	}

	async function inputFisik(itemId: number, stokFisik: number, alasan?: string) {
		if (!opnameAktif) return;
		opnameItemSaving = new Set([...opnameItemSaving, itemId]);
		const put = await api.put(`/stok-opname/${opnameAktif.id}/item/${itemId}`, {
			stok_fisik: stokFisik,
			alasan_selisih: alasan
		});
		if (!put.success) {
			opnameItemSaving = new Set([...opnameItemSaving].filter((id) => id !== itemId));
			error = (put as { success: false; error: string }).error;
			return;
		}
		const r = await api.get<OpnameDetail>(`/stok-opname/${opnameAktif.id}`);
		if (r.success) opnameAktif = r.data;
		opnameItemSaving = new Set([...opnameItemSaving].filter((id) => id !== itemId));
	}

	async function approveOpname() {
		if (!opnameAktif) return;
		opnameSaving = true;
		const r = await api.post(`/stok-opname/${opnameAktif.id}/approve`, {});
		opnameSaving = false;
		if (!r.success) {
			error = (r as { success: false; error: string }).error;
			return;
		}
		opnameAktif = null;
		await muatOpname();
	}

	async function batalOpname() {
		if (!opnameAktif) return;
		await api.delete(`/stok-opname/${opnameAktif.id}`);
		opnameAktif = null;
		await muatOpname();
	}

	onMount(() => {
		muatOpname().then(() => muatOpnameAktif());
		const relay = connectScannerRelay(`barang${$user?.id ?? 0}`, {
			onScan: (kode) => {
				opnameFilter = kode;
			}
		});
		return () => relay.close();
	});
</script>

<div class="flex flex-col gap-4">
	{#if error}<p class="rounded p-2 text-xs" style="background:var(--surface2);color:var(--danger)">
			{error}
			<Button variant="danger" size="xs" onclick={() => (error = '')}>✕</Button>
		</p>{/if}

	{#if !opnameAktif}
		<div class="flex items-center justify-between">
			<p class="text-sm" style="color:var(--text-dim)">
				{opnameList.filter((o) => o.status === 'approved').length} opname selesai
			</p>
			<Button onclick={() => bukaKonfirm('buat')} loading={opnameSaving}>+ Buat Opname Baru</Button>
		</div>

		{#if opnameList.length > 0}
			<DataTable
				columns={kolOpname}
				tableId="gudang_opname"
				bind:sortKey={sortKeyOpname}
				bind:sortDir={sortDirOpname}
				rowCount={sortedOpname.length}
				emptyText="Belum ada opname"
				maxRows={10}
			>
				{#snippet body(hidden)}
					{#each sortedOpname as op (op.id)}
						<tr class="border-t" style="border-color:var(--border)">
							{#if !hidden.has('no_opname')}
								<td class="px-3 py-2 font-mono text-xs">{op.no_opname}</td>
							{/if}
							{#if !hidden.has('tanggal_mulai')}
								<td class="px-3 py-2 text-xs" style="color:var(--text-dim)"
									>{op.tanggal_mulai.slice(0, 10)}</td
								>
							{/if}
							{#if !hidden.has('tanggal_selesai')}
								<td class="px-3 py-2 text-xs" style="color:var(--text-dim)"
									>{op.tanggal_selesai?.slice(0, 10) ?? '—'}</td
								>
							{/if}
							{#if !hidden.has('status')}
								<td class="px-3 py-2">
									<span
										class="text-xs font-bold uppercase"
										style="color:{op.status === 'approved'
											? 'var(--accent)'
											: op.status === 'proses'
												? 'var(--warn)'
												: 'var(--text-dim)'}"
									>
										{op.status}
									</span>
								</td>
							{/if}
						</tr>
					{/each}
				{/snippet}
			</DataTable>
		{/if}
	{:else}
		<div
			class="flex items-center justify-between gap-3 rounded border p-3"
			style="border-color:var(--border);background:var(--surface)"
		>
			<div>
				<div class="text-xs font-bold" style="color:var(--text)">{opnameAktif.no_opname}</div>
				<div class="text-xs" style="color:var(--text-dim)">
					Mulai: {opnameAktif.tanggal_mulai.slice(0, 16)} &nbsp;|&nbsp;
					{opnameAktif.sudah_dihitung}/{opnameAktif.items.length} item dihitung
				</div>
				<div
					class="mt-1 overflow-hidden rounded-full"
					style="height:4px;background:var(--surface2);width:200px"
				>
					<div
						style="height:100%;width:{opnameAktif.progress}%;background:var(--accent);transition:width .3s"
					></div>
				</div>
			</div>
			<div class="flex flex-col items-end gap-1">
				{#if opnameAktif.sudah_dihitung === opnameAktif.items.length && opnameAktif.items.length > 0}
					<Button size="sm" onclick={() => bukaKonfirm('approve')} loading={opnameSaving}
						>Approve & Perbarui Stok</Button
					>
				{:else}
					<div class="text-xs" style="color:var(--text-dim)">Isi semua item untuk Approve</div>
				{/if}
				<Button variant="danger" size="xs" onclick={() => bukaKonfirm('batal')}
					>Batalkan Opname</Button
				>
			</div>
		</div>

		<input
			type="text"
			bind:value={opnameFilter}
			placeholder="Cari nama/kode barang..."
			oninput={() => {
				pageItem = 1;
			}}
			class="w-full rounded border px-3 py-1.5 text-sm outline-none"
			style="background:var(--surface2);border-color:var(--border);color:var(--text)"
		/>

		<DataTable
			columns={kolItem}
			tableId="gudang_opname_item"
			bind:sortKey={sortKeyItem}
			bind:sortDir={sortDirItem}
			bind:currentPage={pageItem}
			bind:pageSize={pageSizeItem}
			totalRows={filteredItems.length}
			rowCount={pagedItems.length}
			emptyText="Tidak ada item"
			maxRows={14}
		>
			{#snippet body(hidden)}
				{#each pagedItems as item (item.id)}
					<tr
						class="border-t"
						style="border-color:var(--border);background:{item.stok_fisik !== null
							? 'transparent'
							: 'rgba(255,179,0,.04)'}"
					>
						{#if !hidden.has('kode_barang')}
							<td class="px-3 py-2 font-mono text-xs" style="color:var(--text-dim)"
								>{item.kode_barang}</td
							>
						{/if}
						{#if !hidden.has('nama_barang')}
							<td class="px-3 py-2">
								<div>{item.nama_barang}</div>
								{#if item.nama_kategori}<div class="text-xs" style="color:var(--text-dim)">
										{item.nama_kategori}
									</div>{/if}
							</td>
						{/if}
						{#if !hidden.has('lokasi_rak')}
							<td class="px-3 py-2 text-xs" style="color:var(--text-dim)"
								>{item.lokasi_rak ?? '—'}</td
							>
						{/if}
						{#if !hidden.has('stok_sistem')}
							<td class="px-3 py-2 text-right text-xs font-bold"
								>{item.stok_sistem} {item.singkatan_satuan ?? ''}</td
							>
						{/if}
						{#if !hidden.has('stok_fisik')}
							<td class="px-3 py-2 text-right">
								<input
									type="number"
									min="0"
									value={item.stok_fisik ?? ''}
									disabled={opnameItemSaving.has(item.id)}
									onkeydown={(e) => {
										if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
									}}
									onchange={(e) => {
										const v = Number((e.target as HTMLInputElement).value);
										const selisih = v - item.stok_sistem;
										const alasan = selisih !== 0 ? (item.alasan_selisih ?? '') : undefined;
										if (selisih !== 0 && !alasan) {
											const a = prompt(
												`Selisih ${selisih > 0 ? '+' : ''}${selisih}. Alasan koreksi?`
											);
											inputFisik(item.id, v, a ?? '');
										} else {
											inputFisik(item.id, v, alasan);
										}
									}}
									placeholder="0"
									class="input-bordered input w-20 text-right text-xs"
									style="border-color:{item.stok_fisik !== null
										? 'var(--border)'
										: 'var(--warn)'};opacity:{opnameItemSaving.has(item.id) ? 0.5 : 1}"
								/>
							</td>
						{/if}
						{#if !hidden.has('selisih')}
							<td
								class="px-3 py-2 text-right text-xs font-bold"
								style="color:{item.selisih === null
									? 'var(--text-dim)'
									: item.selisih === 0
										? 'var(--accent)'
										: item.selisih! > 0
											? 'var(--info)'
											: 'var(--danger)'}"
							>
								{#if opnameItemSaving.has(item.id)}
									<span style="color:var(--text-dim)">...</span>
								{:else if item.selisih !== null}
									{item.selisih > 0 ? '+' : ''}{item.selisih}
								{:else}—{/if}
							</td>
						{/if}
					</tr>
				{/each}
			{/snippet}
		</DataTable>
	{/if}
</div>

<TabOpnameGuide />

<ConfirmDialog
	bind:open={konfirmBuka}
	judul={konfirmMode === 'buat'
		? 'Buat Stok Opname?'
		: konfirmMode === 'approve'
			? 'Approve Opname?'
			: 'Batalkan Opname?'}
	pesan={konfirmMode === 'buat'
		? 'Semua stok sistem akan di-snapshot sekarang.'
		: konfirmMode === 'approve'
			? 'Stok sistem akan diperbarui sesuai stok fisik yang sudah dihitung.'
			: 'Opname yang sedang berjalan akan dibatalkan.'}
	labelKanan={konfirmMode === 'buat' ? 'Buat' : konfirmMode === 'approve' ? 'Approve' : 'Batalkan'}
	warnaKanan={konfirmMode === 'batal' ? 'var(--danger)' : 'var(--accent)'}
	onkiri={tutupKonfirm}
	onkanan={() => {
		const m = konfirmMode;
		tutupKonfirm();
		if (m === 'buat') buatOpname();
		else if (m === 'approve') approveOpname();
		else if (m === 'batal') batalOpname();
	}}
/>
