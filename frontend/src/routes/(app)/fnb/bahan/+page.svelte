<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api';
	import { withLoading } from '$lib/utils/async';
	import {
		fetchBahan,
		createBahan,
		updateBahan,
		deleteBahan,
		fetchResep,
		saveResep,
		fetchHpp,
		fetchMenuList,
		type Bahan,
		type ResepLine,
		type HppRow,
		type MenuRingkas
	} from './bom.api';
	import DataTable from '$lib/components/DataTable.svelte';
	import ModalWindow from '$lib/components/ModalWindow.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	type Satuan = { id: number; nama: string; singkatan: string };

	let tab = $state<'bahan' | 'resep' | 'hpp'>('bahan');
	let bahan = $state<Bahan[]>([]);
	let satuan = $state<Satuan[]>([]);
	let menus = $state<MenuRingkas[]>([]);
	let loading = $state(false);

	// form bahan
	let bahanOpen = $state(false);
	let editBahanId = $state<number | null>(null);
	let bNama = $state('');
	let bSatuanId = $state<number | null>(null);
	let bStok = $state(0);
	let bStokMin = $state(0);
	let bHarga = $state(0);
	let bErr = $state('');

	// resep
	let resepMenuId = $state<number | null>(null);
	let resepLines = $state<ResepLine[]>([]);
	let resepHpp = $state(0);

	// hpp
	let hppRows = $state<HppRow[]>([]);

	const bahanCols = [
		{ key: 'kode_bahan', label: 'Kode', width: 110 },
		{ key: 'nama', label: 'Nama' },
		{ key: 'stok_sekarang', label: 'Stok', width: 110 },
		{ key: 'harga_beli_rata', label: 'Harga/Unit', width: 120 },
		{ key: 'aksi', label: '', width: 130 }
	];
	const hppCols = [
		{ key: 'nama_barang', label: 'Menu' },
		{ key: 'hpp', label: 'HPP', width: 110 },
		{ key: 'harga_jual', label: 'Harga Jual', width: 120 },
		{ key: 'margin', label: 'Margin', width: 110 },
		{ key: 'margin_persen', label: '%', width: 70 }
	];

	async function muat() {
		loading = true;
		bahan = await fetchBahan();
		loading = false;
	}
	async function muatMeta() {
		const r = await api.get<Satuan[]>('/barang/satuan');
		if (r.success) satuan = r.data;
		menus = await fetchMenuList();
	}

	function satuanLabel(id: number | null): string {
		return satuan.find((s) => s.id === id)?.singkatan ?? '';
	}

	// ── Bahan ──
	function bukaBahan(b?: Bahan) {
		editBahanId = b?.id ?? null;
		bNama = b?.nama ?? '';
		bSatuanId = b?.satuan_id ?? null;
		bStok = b?.stok_sekarang ?? 0;
		bStokMin = b?.stok_minimum ?? 0;
		bHarga = b?.harga_beli_rata ?? 0;
		bErr = '';
		bahanOpen = true;
	}
	async function simpanBahan() {
		bErr = '';
		if (!bNama.trim()) {
			bErr = 'Nama bahan wajib diisi';
			return;
		}
		const body = {
			nama: bNama.trim(),
			satuan_id: bSatuanId,
			stok_sekarang: bStok,
			stok_minimum: bStokMin,
			harga_beli_rata: bHarga
		};
		const ok = editBahanId
			? await withLoading(() => updateBahan(editBahanId!, body), {
					loadingKey: 'bahan-save',
					modul: 'gudang',
					aksi: 'bahan',
					errorPesan: 'Gagal simpan bahan'
				})
			: await withLoading(() => createBahan(body), {
					loadingKey: 'bahan-save',
					modul: 'gudang',
					aksi: 'bahan',
					errorPesan: 'Gagal simpan bahan'
				});
		if (ok !== null) {
			bahanOpen = false;
			muat();
		}
	}
	async function hapusBahan(id: number) {
		await withLoading(() => deleteBahan(id), {
			loadingKey: `bahan-del-${id}`,
			modul: 'gudang',
			aksi: 'bahan',
			errorPesan: 'Gagal hapus bahan'
		});
		muat();
	}

	// ── Resep ──
	async function pilihMenu(id: number | null) {
		resepMenuId = id;
		if (!id) {
			resepLines = [];
			resepHpp = 0;
			return;
		}
		const r = await fetchResep(id);
		resepLines = r.lines;
		resepHpp = r.hpp;
	}
	function tambahLine() {
		resepLines = [...resepLines, { bahan_baku_id: 0, jumlah: 1 }];
	}
	function hapusLine(i: number) {
		resepLines = resepLines.filter((_, idx) => idx !== i);
		hitungHpp();
	}
	function hitungHpp() {
		resepHpp = resepLines.reduce((s, l) => {
			const b = bahan.find((x) => x.id === l.bahan_baku_id);
			return s + (b ? b.harga_beli_rata * l.jumlah : 0);
		}, 0);
	}
	async function simpanResep() {
		if (!resepMenuId) return;
		const lines = resepLines
			.filter((l) => l.bahan_baku_id && l.jumlah > 0)
			.map((l) => ({
				bahan_baku_id: l.bahan_baku_id,
				jumlah: l.jumlah,
				satuan_id: bahan.find((b) => b.id === l.bahan_baku_id)?.satuan_id ?? null
			}));
		const ok = await withLoading(() => saveResep(resepMenuId!, lines), {
			loadingKey: 'resep-save',
			modul: 'gudang',
			aksi: 'resep',
			errorPesan: 'Gagal simpan resep'
		});
		if (ok !== null) pilihMenu(resepMenuId);
	}

	// ── HPP ──
	async function muatHpp() {
		hppRows = await fetchHpp();
	}

	function rupiah(n: number) {
		return 'Rp ' + n.toLocaleString('id-ID');
	}

	$effect(() => {
		if (tab === 'hpp') muatHpp();
	});

	onMount(() => {
		muat();
		muatMeta();
	});
</script>

<div>
	<div class="mb-4 flex w-fit overflow-hidden rounded-lg border border-[var(--border)]">
		{#each [['bahan', 'Bahan Baku'], ['resep', 'Resep Menu'], ['hpp', 'Laporan HPP']] as [v, l] (v)}
			<button
				class="px-4 py-2 text-sm transition-colors
				{tab === v ? 'bg-[var(--accent)] font-semibold text-black' : 'text-[var(--text)]'}"
				onclick={() => (tab = v as 'bahan' | 'resep' | 'hpp')}>{l}</button
			>
		{/each}
	</div>

	{#if loading && tab === 'bahan'}
		<div class="flex justify-center py-10"><Spinner /></div>
	{:else if tab === 'bahan'}
		<div class="mb-3">
			<button class="btn btn-sm btn-primary" onclick={() => bukaBahan()}>+ Bahan Baku</button>
		</div>
		<DataTable
			columns={bahanCols}
			rowCount={bahan.length}
			pageSize={25}
			emptyText="Belum ada bahan baku."
		>
			{#snippet body(hidden)}
				{#each bahan as b (b.id)}
					<tr>
						{#if !hidden.has('kode_bahan')}<td class="px-3 py-2 font-mono text-xs"
								>{b.kode_bahan}</td
							>{/if}
						{#if !hidden.has('nama')}<td class="px-3 py-2">{b.nama}</td>{/if}
						{#if !hidden.has('stok_sekarang')}
							<td
								class="px-3 py-2 text-right"
								style="color:{b.stok_sekarang <= b.stok_minimum ? 'var(--danger)' : 'var(--text)'}"
							>
								{b.stok_sekarang}
								{b.satuan_singkatan ?? ''}
							</td>
						{/if}
						{#if !hidden.has('harga_beli_rata')}<td class="px-3 py-2 text-right font-mono"
								>{rupiah(b.harga_beli_rata)}</td
							>{/if}
						{#if !hidden.has('aksi')}
							<td class="px-3 py-2 text-right whitespace-nowrap">
								<button class="btn btn-ghost btn-xs" onclick={() => bukaBahan(b)}>Edit</button>
								<button
									class="btn text-[var(--danger)] btn-ghost btn-xs"
									onclick={() => hapusBahan(b.id)}>Hapus</button
								>
							</td>
						{/if}
					</tr>
				{/each}
			{/snippet}
		</DataTable>
	{:else if tab === 'resep'}
		<div class="max-w-2xl space-y-3">
			<div>
				<label class="label text-sm" for="r-menu">Menu</label>
				<select
					id="r-menu"
					class="select-bordered select w-full text-sm"
					onchange={(e) => pilihMenu(Number((e.target as HTMLSelectElement).value) || null)}
				>
					<option value="">— pilih menu —</option>
					{#each menus as m (m.id)}<option value={m.id}>{m.nama_barang}</option>{/each}
				</select>
				{#if menus.length === 0}<p class="mt-1 text-xs text-[var(--warn)]">
						Belum ada barang tipe Menu. Buat di Gudang → Barang.
					</p>{/if}
			</div>

			{#if resepMenuId}
				<div class="rounded-lg border border-[var(--border)] p-3">
					<div class="space-y-2">
						{#each resepLines as line, i (i)}
							<div class="flex items-center gap-2">
								<select
									class="select-bordered select flex-1 select-sm text-sm"
									bind:value={line.bahan_baku_id}
									onchange={hitungHpp}
								>
									<option value={0}>— pilih bahan —</option>
									{#each bahan as b (b.id)}<option value={b.id}
											>{b.nama} ({b.satuan_singkatan ?? ''})</option
										>{/each}
								</select>
								<input
									type="number"
									min="0"
									step="0.01"
									placeholder="0"
									class="input-bordered input input-sm w-24 text-sm"
									bind:value={line.jumlah}
									oninput={hitungHpp}
								/>
								<span class="w-10 text-xs text-[var(--text-dim)]"
									>{satuanLabel(
										bahan.find((b) => b.id === line.bahan_baku_id)?.satuan_id ?? null
									)}</span
								>
								<button
									class="btn text-[var(--danger)] btn-ghost btn-xs"
									onclick={() => hapusLine(i)}>×</button
								>
							</div>
						{/each}
					</div>
					<button class="btn mt-2 btn-outline btn-xs" onclick={tambahLine}>+ Bahan</button>

					<div class="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
						<span class="text-sm text-[var(--text-dim)]">HPP per porsi</span>
						<span class="font-mono font-semibold">{rupiah(resepHpp)}</span>
					</div>
					<button class="btn mt-2 w-full btn-sm btn-primary" onclick={simpanResep}
						>Simpan Resep</button
					>
				</div>
			{/if}
		</div>
	{:else}
		<DataTable
			columns={hppCols}
			rowCount={hppRows.length}
			pageSize={50}
			emptyText="Belum ada menu."
		>
			{#snippet body(hidden)}
				{#each hppRows as r (r.id)}
					<tr>
						{#if !hidden.has('nama_barang')}<td class="px-3 py-2">{r.nama_barang}</td>{/if}
						{#if !hidden.has('hpp')}<td class="px-3 py-2 text-right font-mono">{rupiah(r.hpp)}</td
							>{/if}
						{#if !hidden.has('harga_jual')}<td class="px-3 py-2 text-right font-mono"
								>{rupiah(r.harga_jual)}</td
							>{/if}
						{#if !hidden.has('margin')}<td
								class="px-3 py-2 text-right font-mono"
								style="color:{r.margin < 0 ? 'var(--danger)' : 'var(--accent)'}"
								>{rupiah(r.margin)}</td
							>{/if}
						{#if !hidden.has('margin_persen')}<td class="px-3 py-2 text-center"
								>{r.margin_persen}%</td
							>{/if}
					</tr>
				{/each}
			{/snippet}
		</DataTable>
	{/if}
</div>

<!-- Modal Bahan -->
<ModalWindow
	bind:open={bahanOpen}
	title="{editBahanId ? 'Edit' : 'Tambah'} Bahan Baku"
	maxWidth="sm"
>
	<div class="space-y-3">
		<div>
			<label class="label text-sm" for="b-nama">Nama Bahan</label>
			<input
				id="b-nama"
				class="input-bordered input w-full text-sm"
				bind:value={bNama}
				placeholder="mis. Beras"
			/>
		</div>
		<div>
			<label class="label text-sm" for="b-satuan">Satuan</label>
			<select id="b-satuan" class="select-bordered select w-full text-sm" bind:value={bSatuanId}>
				<option value={null}>— pilih satuan —</option>
				{#each satuan as s (s.id)}<option value={s.id}>{s.nama} ({s.singkatan})</option>{/each}
			</select>
		</div>
		<div class="flex gap-3">
			<div class="flex-1">
				<label class="label text-sm" for="b-stok">Stok</label>
				<input
					id="b-stok"
					type="number"
					min="0"
					step="0.01"
					placeholder="0"
					class="input-bordered input w-full text-sm"
					bind:value={bStok}
				/>
			</div>
			<div class="flex-1">
				<label class="label text-sm" for="b-min">Stok Minimum</label>
				<input
					id="b-min"
					type="number"
					min="0"
					step="0.01"
					placeholder="0"
					class="input-bordered input w-full text-sm"
					bind:value={bStokMin}
				/>
			</div>
		</div>
		<div>
			<label class="label text-sm" for="b-harga">Harga Beli per Unit (Rp)</label>
			<input
				id="b-harga"
				type="number"
				min="0"
				placeholder="0"
				class="input-bordered input w-full text-sm"
				bind:value={bHarga}
			/>
		</div>
		{#if bErr}<p class="text-sm text-[var(--danger)]">{bErr}</p>{/if}
		<div class="flex gap-2 pt-1">
			<button class="btn flex-1 btn-ghost" onclick={() => (bahanOpen = false)}>Batal</button>
			<button class="btn flex-1 btn-primary" onclick={simpanBahan}>Simpan</button>
		</div>
	</div>
</ModalWindow>
