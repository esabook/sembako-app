<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { user } from '$lib/stores/auth.js';
	import { resizeImage } from '$lib/utils/image.js';
	import { connectScannerSse } from '$lib/utils/scannerSse.js';
	import { thumbUrl } from '$lib/utils/upload.js';
	import { rupiah } from '$lib/utils/format.js';
	import SlideOver from '$lib/components/SlideOver.svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import type { Column } from '$lib/components/DataTable.svelte';
	import TabBarangGuide from './TabBarangGuide.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import FotoThumb from '$lib/components/data/FotoThumb.svelte';
	import SearchInput from '$lib/components/data/SearchInput.svelte';
	import InputRupiah from '$lib/components/form/InputRupiah.svelte';
	import Select from '$lib/components/ui/Select.svelte';

	type Barang = {
		id: number;
		kode_barang: string;
		nama_barang: string;
		tipe_produk: 'physical_good' | 'menu_item' | 'service';
		kategori_id: number | null;
		satuan_dasar_id: number | null;
		harga_jual_eceran: number;
		harga_jual_grosir: number;
		harga_beli_terakhir: number;
		stok_sekarang: number;
		stok_minimum: number;
		lokasi_rak: string | null;
		foto_path: string | null;
		nama_kategori: string | null;
		nama_satuan: string | null;
		singkatan_satuan: string | null;
		is_active: boolean;
	};
	type Kategori = { id: number; nama: string; contoh: string | null; is_preset: boolean };
	type Satuan = { id: number; nama: string; singkatan: string; contoh: string | null; is_preset: boolean };

	const kolBarang: Column[] = [
		{ key: 'foto',              label: '',          width: 52, sortable: false, hideable: false },
		{ key: 'kode_barang',       label: 'Kode',      width: 100, priority: 2 },
		{ key: 'nama_barang',       label: 'Nama',      minWidth: 120 },
		{ key: 'nama_kategori',     label: 'Kategori',  minWidth: 100, priority: 2 },
		{ key: 'stok_sekarang',     label: 'Stok',      width: 90, align: 'right' },
		{ key: 'status_stok',       label: 'Status',    width: 110, priority: 2 },
		{ key: 'harga_jual_eceran', label: 'Harga',     width: 110, align: 'right', priority: 3 },
		{ key: 'aksi',              label: '',          width: 90, sortable: false, hideable: false, align: 'right' },
	];

	let pageBarang = $state(1);
	let pageSizeBarang = $state(25);
	let sortKeyBarang = $state('nama_barang');
	let sortDirBarang = $state<'asc' | 'desc'>('asc');

	let barangList = $state<Barang[]>([]);
	let kategoriList = $state<Kategori[]>([]);
	let satuanList = $state<Satuan[]>([]);
	let query = $state('');
	let tampilNonAktif = $state(false);
	let error = $state('');
	let modalBarang = $state(false);
	let editBarang = $state<Partial<Barang> | null>(null);
	let fb = $state({
		kode_barang: '',
		nama_barang: '',
		tipe_produk: 'physical_good' as 'physical_good' | 'menu_item' | 'service',
		kategori_id: null as number | null,
		satuan_dasar_id: null as number | null,
		harga_beli_terakhir: 0,
		harga_jual_eceran: 0,
		harga_jual_grosir: 0,
		stok_minimum: '',
		lokasi_rak: '',
	});

	let fotoFile = $state<File | null>(null);
	let fotoPreviewUrl = $state('');
	let searchKategori = $state('');
	let searchSatuan = $state('');
	let filteredKategori = $derived(
		searchKategori
			? kategoriList.filter((k) => k.nama.toLowerCase().includes(searchKategori.toLowerCase()))
			: kategoriList
	);
	let filteredSatuan = $derived(
		searchSatuan
			? satuanList.filter((s) => s.nama.toLowerCase().includes(searchSatuan.toLowerCase()))
			: satuanList
	);

	function stokTipe(item: { stok_sekarang: number; stok_minimum: number }): string {
		if (item.stok_sekarang <= 0) return 'habis';
		if (item.stok_sekarang <= item.stok_minimum) return 'hampir';
		return 'aman';
	}
	function stokLabel(item: { stok_sekarang: number; stok_minimum: number }): string {
		if (item.stok_sekarang <= 0) return 'HABIS';
		if (item.stok_sekarang <= item.stok_minimum) return 'HAMPIR HABIS';
		return 'AMAN';
	}

	function sortBarang(list: Barang[], key: string, dir: 'asc' | 'desc') {
		if (!key) return list;
		return [...list].sort((a, b) => {
			const va = String((a as Record<string, unknown>)[key] ?? '');
			const vb = String((b as Record<string, unknown>)[key] ?? '');
			const cmp = va.localeCompare(vb, 'id', { numeric: true });
			return dir === 'asc' ? cmp : -cmp;
		});
	}

	let sortedBarang = $derived(sortBarang(barangList, sortKeyBarang, sortDirBarang));
	let pagedBarang = $derived(
		pageSizeBarang === 0
			? sortedBarang
			: sortedBarang.slice((pageBarang - 1) * pageSizeBarang, pageBarang * pageSizeBarang)
	);

	async function muatBarang(q = '') {
		const r = await api.get<Barang[]>(`/barang?q=${q}${tampilNonAktif ? '&aktif=0' : ''}`);
		if (r.success) { barangList = r.data; pageBarang = 1; }
	}
	async function muatMeta() {
		const [k, s] = await Promise.all([
			api.get<Kategori[]>('/barang/kategori'),
			api.get<Satuan[]>('/barang/satuan'),
		]);
		if (k.success) kategoriList = k.data;
		if (s.success) satuanList = s.data;
	}

	async function handleFotoChange(e: Event) {
		const raw = (e.target as HTMLInputElement).files?.[0] ?? null;
		if (!raw) { fotoFile = null; return; }
		// Resize di FE sebelum upload — kurangi bandwidth
		fotoFile = await resizeImage(raw, 800, 800, 0.9, 'inside');
		fotoPreviewUrl = URL.createObjectURL(fotoFile);
	}

	async function uploadFoto(barangId: number, file: File) {
		const formData = new FormData();
		formData.append('foto', file);
		return api.upload<{ foto_path: string }>(`/barang/${barangId}/foto`, formData);
	}

	function bukaFormBarang(item?: Barang) {
		editBarang = item ?? null;
		fotoFile = null;
		fotoPreviewUrl = thumbUrl(item?.foto_path) ?? '';
		searchKategori = '';
		searchSatuan = '';
		fb = {
			kode_barang: item?.kode_barang ?? '',
			nama_barang: item?.nama_barang ?? '',
			tipe_produk: item?.tipe_produk ?? 'physical_good',
			kategori_id: item?.kategori_id ?? null,
			satuan_dasar_id: item?.satuan_dasar_id ?? null,
			harga_beli_terakhir: item?.harga_beli_terakhir ?? 0,
			harga_jual_eceran: item?.harga_jual_eceran ?? 0,
			harga_jual_grosir: item?.harga_jual_grosir ?? 0,
			stok_minimum: String(item?.stok_minimum ?? ''),
			lokasi_rak: item?.lokasi_rak ?? '',
		};
		modalBarang = true;
	}

	async function simpanBarang() {
		error = '';
		const p = {
			kode_barang: fb.kode_barang,
			nama_barang: fb.nama_barang,
			tipe_produk: fb.tipe_produk,
			kategori_id: fb.kategori_id ?? undefined,
			satuan_dasar_id: fb.satuan_dasar_id ?? undefined,
			harga_beli_terakhir: fb.harga_beli_terakhir,
			harga_jual_eceran: fb.harga_jual_eceran,
			harga_jual_grosir: fb.harga_jual_grosir,
			stok_minimum: Number(fb.stok_minimum) || 0,
			lokasi_rak: fb.lokasi_rak || undefined,
		};
		const r = editBarang?.id
			? await api.put(`/barang/${editBarang.id}`, p)
			: await api.post('/barang', p);
		if (!r.success) { error = (r as { success: false; error: string }).error; return; }

		const savedId = editBarang?.id ?? (r as { success: true; data: { id: number } }).data.id;
		if (fotoFile && savedId) {
			const fr = await uploadFoto(savedId, fotoFile);
			if (!fr.success) { error = fr.error ?? 'Gagal upload foto'; return; }
		}

		modalBarang = false;
		muatBarang(query);
	}

	let konfirmHapusId = $state<number | null>(null)
	let konfirmHapusBuka = $state(false)

	async function doHapusBarang() {
		if (!konfirmHapusId) return
		const res = await api.delete(`/barang/${konfirmHapusId}`)
		konfirmHapusId = null
		if (!res.success) return
		muatBarang(query)
	}

	onMount(() => {
		muatBarang();
		muatMeta();
		return connectScannerSse(`barang${$user?.id ?? 0}`, (kode) => {
			if (modalBarang) fb.kode_barang = kode;
			else { query = kode; muatBarang(kode); }
		});
	});
</script>

<div class="flex flex-col gap-3">
	<div class="flex items-center gap-3 flex-wrap">
		<SearchInput bind:value={query} placeholder="Cari barang..." onsearch={(q) => muatBarang(q)} />
		<Toggle bind:aktif={tampilNonAktif} onchange={() => muatBarang(query)} />
		{#if $user && ['pemilik', 'manajer', 'gudang'].includes($user.role)}
			<Button variant="ghost" onclick={() => goto('/gudang/import')}>↑ Import CSV</Button>
		{/if}
		<Button onclick={() => bukaFormBarang()}>+ Tambah</Button>
	</div>
	<DataTable
		columns={kolBarang}
		tableId="gudang_barang"
		bind:sortKey={sortKeyBarang}
		bind:sortDir={sortDirBarang}
		bind:currentPage={pageBarang}
		bind:pageSize={pageSizeBarang}
		totalRows={sortedBarang.length}
		rowCount={pagedBarang.length}
		emptyText="Tidak ada data"
		maxRows={12}
	>
		{#snippet body(hidden)}
			{#each pagedBarang as item (item.id)}
				<tr class="border-t" style="border-color:var(--border);opacity:{item.is_active ? 1 : 0.45}">
					{#if !hidden.has('foto')}
						<td class="px-2 py-1">
							<FotoThumb src={thumbUrl(item.foto_path) ?? null} nama={item.nama_barang} size={36} />
						</td>
					{/if}
					{#if !hidden.has('kode_barang')}
						<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.kode_barang}</td>
					{/if}
					{#if !hidden.has('nama_barang')}
						<td class="px-3 py-2">
							{item.nama_barang}
							{#if !item.is_active}<span class="ml-1 text-xs" style="color:var(--text-dim)">[non-aktif]</span>{/if}
						</td>
					{/if}
					{#if !hidden.has('nama_kategori')}
						<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.nama_kategori ?? '-'}</td>
					{/if}
					{#if !hidden.has('stok_sekarang')}
						<td class="px-3 py-2 text-right">{item.stok_sekarang} {item.singkatan_satuan ?? ''}</td>
					{/if}
					{#if !hidden.has('status_stok')}
						<td class="px-3 py-2"><Badge tipe={stokTipe(item)}>{stokLabel(item)}</Badge></td>
					{/if}
					{#if !hidden.has('harga_jual_eceran')}
						<td class="px-3 py-2 text-right">{rupiah(item.harga_jual_eceran)}</td>
					{/if}
					{#if !hidden.has('aksi')}
						<td class="px-3 py-2 text-right">
							{#if item.is_active}
								<Button variant="ghost" size="xs" onclick={() => bukaFormBarang(item)}>Edit</Button>
								<Button variant="danger" size="xs" onclick={() => { konfirmHapusId = item.id; konfirmHapusBuka = true }}>Nonaktif</Button>
							{:else}
								<Button variant="ghost" size="xs" onclick={async () => { await api.put(`/barang/${item.id}`, { is_active: true }); muatBarang(query) }}>Aktifkan</Button>
							{/if}
						</td>
					{/if}
				</tr>
			{/each}
		{/snippet}
	</DataTable>
</div>

<TabBarangGuide />

<SlideOver bind:open={modalBarang} title={editBarang?.id ? 'Edit Barang' : 'Tambah Barang'}>
	<form onsubmit={(e) => { e.preventDefault(); simpanBarang(); }} class="flex flex-col gap-3 text-sm">
		{#if error}<p class="text-xs p-2 rounded" style="background:var(--surface2);color:var(--danger)">{error}</p>{/if}
		<div class="grid grid-cols-2 gap-3">
			<div class="flex flex-col gap-1">
				<label for="fb-kode" class="text-xs" style="color:var(--text-dim)">KODE *</label>
				<input id="fb-kode" bind:value={fb.kode_barang} required placeholder="Cth: BRG001" class="input input-bordered w-full text-sm" />
			</div>
			<div class="flex flex-col gap-1">
				<label for="fb-nama" class="text-xs" style="color:var(--text-dim)">NAMA *</label>
				<input id="fb-nama" bind:value={fb.nama_barang} required placeholder="Nama barang" class="input input-bordered w-full text-sm" />
			</div>

			<div class="col-span-2 flex flex-col gap-1">
				<label for="fb-tipe" class="text-xs" style="color:var(--text-dim)">TIPE PRODUK</label>
				<select id="fb-tipe" bind:value={fb.tipe_produk} class="w-full rounded border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-1" style="background:var(--bg);border-color:var(--border);color:var(--text);--tw-ring-color:var(--accent)">
					<option value="physical_good">Barang Fisik (retail)</option>
					<option value="menu_item">Menu (F&B / dapur)</option>
					<option value="service">Layanan (jasa / booking)</option>
				</select>
			</div>

			<InputRupiah bind:value={fb.harga_beli_terakhir} label="HARGA BELI" />
			<InputRupiah bind:value={fb.harga_jual_eceran} label="HARGA ECERAN" />
			<InputRupiah bind:value={fb.harga_jual_grosir} label="HARGA GROSIR" />

			<div class="flex flex-col gap-1">
				<label for="fb-min" class="text-xs" style="color:var(--text-dim)">STOK MINIMUM</label>
				<input id="fb-min" type="number" min="0" bind:value={fb.stok_minimum} placeholder="0" class="input input-bordered w-full text-sm" />
			</div>

			<!-- Kategori dengan filter -->
			<div class="flex flex-col gap-1">
				<label for="fb-kat" class="text-xs" style="color:var(--text-dim)">KATEGORI</label>
				{#if kategoriList.length === 0}
					<p class="text-xs px-2 py-1.5 rounded" style="background:var(--surface2);color:var(--warn)">Belum ada kategori — tambah di tab Pengaturan.</p>
				{:else}
					<input type="text" placeholder="Filter kategori..." bind:value={searchKategori} class="input input-bordered w-full text-xs" />
					<Select bind:value={fb.kategori_id} options={filteredKategori.map(k => ({ value: k.id, label: k.nama + (k.contoh ? ` — ${k.contoh}` : '') }))} placeholder="— pilih —" />
				{/if}
			</div>

			<!-- Satuan dengan filter -->
			<div class="flex flex-col gap-1">
				<label for="fb-sat" class="text-xs" style="color:var(--text-dim)">SATUAN</label>
				{#if satuanList.length === 0}
					<p class="text-xs px-2 py-1.5 rounded" style="background:var(--surface2);color:var(--warn)">Belum ada satuan — tambah di tab Pengaturan.</p>
				{:else}
					<input type="text" placeholder="Filter satuan..." bind:value={searchSatuan} class="input input-bordered w-full text-xs" />
					<Select bind:value={fb.satuan_dasar_id} options={filteredSatuan.map(s => ({ value: s.id, label: s.nama + ' (' + s.singkatan + ')' + (s.contoh ? ` — ${s.contoh}` : '') }))} placeholder="— pilih —" />
				{/if}
			</div>

			<div class="flex flex-col gap-1 col-span-2">
				<label for="fb-rak" class="text-xs" style="color:var(--text-dim)">LOKASI RAK</label>
				<input id="fb-rak" bind:value={fb.lokasi_rak} placeholder="Cth: A1-Rak3" class="input input-bordered w-full text-sm" />
			</div>

			<!-- Foto produk -->
			<div class="flex flex-col gap-1 col-span-2">
				<label for="fb-foto" class="text-xs" style="color:var(--text-dim)">FOTO PRODUK</label>
				<div class="flex items-center gap-3">
					<FotoThumb src={fotoPreviewUrl || null} nama={fb.nama_barang} size={64} />
					<div class="flex flex-col gap-1">
						<input id="fb-foto" type="file" accept="image/*" onchange={handleFotoChange} class="text-xs" style="color:var(--text-color)" />
						<span class="text-xs" style="color:var(--text-dim)">JPG/PNG, maks 5MB. Akan di-resize otomatis.</span>
					</div>
				</div>
			</div>
		</div>
		<div class="flex justify-end gap-2">
			<Button type="button" variant="ghost" onclick={() => modalBarang = false}>Batal</Button>
			<Button type="submit">Simpan</Button>
		</div>
	</form>
</SlideOver>

<ConfirmDialog
	bind:open={konfirmHapusBuka}
	judul="Nonaktifkan barang?"
	pesan="Barang tidak akan tampil di kasir. Bisa diaktifkan kembali."
	labelKanan="Nonaktifkan"
	warnaKanan="var(--danger)"
	onkiri={() => konfirmHapusId = null}
	onkanan={doHapusBarang}
/>
