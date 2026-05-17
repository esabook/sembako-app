<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import { user } from '$lib/stores/auth.js';
	import { connectScannerSse } from '$lib/utils/scannerSse.js';
	import Modal from '$lib/components/Modal.svelte';
	import TabBarangGuide from './TabBarangGuide.svelte';

	type Barang = {
		id: number;
		kode_barang: string;
		nama_barang: string;
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

	let barangList = $state<Barang[]>([]);
	let kategoriList = $state<Kategori[]>([]);
	let satuanList = $state<Satuan[]>([]);
	let query = $state('');
	let tampilNonAktif = $state(false);
	let loading = $state(false);
	let error = $state('');
	let modalBarang = $state(false);
	let editBarang = $state<Partial<Barang> | null>(null);
	let fb = $state({
		kode_barang: '',
		nama_barang: '',
		kategori_id: null as number | null,
		satuan_dasar_id: null as number | null,
		harga_beli_terakhir: '',
		harga_jual_eceran: '',
		harga_jual_grosir: '',
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

	function rupiah(n: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
	}
	function statusStok(item: { stok_sekarang: number; stok_minimum: number }) {
		if (item.stok_sekarang <= 0) return { label: 'HABIS', color: 'var(--danger)' };
		if (item.stok_sekarang <= item.stok_minimum) return { label: 'HAMPIR HABIS', color: 'var(--warn)' };
		return { label: 'AMAN', color: 'var(--accent)' };
	}

	async function muatBarang(q = '') {
		const r = await api.get<Barang[]>(`/barang?q=${q}${tampilNonAktif ? '&aktif=0' : ''}`);
		if (r.success) barangList = r.data;
	}
	async function muatMeta() {
		const [k, s] = await Promise.all([
			api.get<Kategori[]>('/barang/kategori'),
			api.get<Satuan[]>('/barang/satuan'),
		]);
		if (k.success) kategoriList = k.data;
		if (s.success) satuanList = s.data;
	}

	function handleFotoChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0] ?? null;
		fotoFile = file;
		if (file) fotoPreviewUrl = URL.createObjectURL(file);
	}

	async function uploadFoto(barangId: number, file: File) {
		const formData = new FormData();
		formData.append('foto', file);
		const baseUrl = import.meta.env.PUBLIC_API_URL ?? '/api';
		const res = await fetch(`${baseUrl}/barang/${barangId}/foto`, {
			method: 'POST',
			credentials: 'include',
			body: formData,
		});
		return res.json() as Promise<{ success: boolean; error?: string }>;
	}

	function bukaFormBarang(item?: Barang) {
		editBarang = item ?? null;
		fotoFile = null;
		fotoPreviewUrl = item?.foto_path ? `/uploads/${item.foto_path}` : '';
		searchKategori = '';
		searchSatuan = '';
		fb = {
			kode_barang: item?.kode_barang ?? '',
			nama_barang: item?.nama_barang ?? '',
			kategori_id: item?.kategori_id ?? null,
			satuan_dasar_id: item?.satuan_dasar_id ?? null,
			harga_beli_terakhir: String(item?.harga_beli_terakhir ?? ''),
			harga_jual_eceran: String(item?.harga_jual_eceran ?? ''),
			harga_jual_grosir: String(item?.harga_jual_grosir ?? ''),
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
			kategori_id: fb.kategori_id ?? undefined,
			satuan_dasar_id: fb.satuan_dasar_id ?? undefined,
			harga_beli_terakhir: Number(fb.harga_beli_terakhir) || 0,
			harga_jual_eceran: Number(fb.harga_jual_eceran) || 0,
			harga_jual_grosir: Number(fb.harga_jual_grosir) || 0,
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

	async function hapusBarang(id: number) {
		if (!confirm('Nonaktifkan?')) return;
		await api.delete(`/barang/${id}`);
		muatBarang(query);
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
		<input type="search" placeholder="Cari..." bind:value={query} oninput={() => muatBarang(query)} class="px-3 py-1 rounded border text-sm flex-1 max-w-xs outline-none" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
		<button
			onclick={() => { tampilNonAktif = !tampilNonAktif; muatBarang(query) }}
			class="px-3 py-1 rounded text-sm border"
			style="{tampilNonAktif ? 'background:var(--surface2);color:var(--text);border-color:var(--warn)' : 'color:var(--text-dim);border-color:var(--border)'}">
			{tampilNonAktif ? 'Sembunyikan Non-Aktif' : 'Tampilkan Non-Aktif'}
		</button>
		<button onclick={() => bukaFormBarang()} class="px-3 py-1 rounded text-sm font-bold" style="background:var(--accent);color:var(--bg)">+ Tambah</button>
	</div>
	<div class="rounded border overflow-x-auto" style="border-color:var(--border)">
		<table class="w-full text-sm">
			<thead><tr style="background:var(--surface2);color:var(--text-dim)">
				<th class="px-3 py-2 w-10"></th>
				<th class="text-left px-3 py-2 font-medium">Kode</th>
				<th class="text-left px-3 py-2 font-medium">Nama</th>
				<th class="text-left px-3 py-2 font-medium">Kategori</th>
				<th class="text-right px-3 py-2 font-medium">Stok</th>
				<th class="text-left px-3 py-2 font-medium">Status</th>
				<th class="text-right px-3 py-2 font-medium">Harga Jual</th>
				<th class="px-3 py-2"></th>
			</tr></thead>
			<tbody>
				{#if loading}<tr><td colspan="8" class="px-3 py-4 text-center" style="color:var(--text-dim)">Memuat...</td></tr>
				{:else if barangList.length === 0}<tr><td colspan="8" class="px-3 py-4 text-center" style="color:var(--text-dim)">Tidak ada data</td></tr>
				{:else}
					{#each barangList as item (item.id)}
						{@const st = statusStok(item)}
						<tr class="border-t" style="border-color:var(--border);opacity:{item.is_active ? 1 : 0.45}">
							<td class="px-2 py-1">
								{#if item.foto_path}
									<img src="/uploads/{item.foto_path.replace('med_', 'thumb_')}" alt={item.nama_barang} class="w-9 h-9 rounded object-cover" style="border:1px solid var(--border)" />
								{:else}
									<div class="w-9 h-9 rounded flex items-center justify-center text-xs" style="background:var(--surface2);border:1px solid var(--border);color:var(--text-dim)">—</div>
								{/if}
							</td>
							<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.kode_barang}</td>
							<td class="px-3 py-2">
								{item.nama_barang}
								{#if !item.is_active}<span class="ml-1 text-xs" style="color:var(--text-dim)">[non-aktif]</span>{/if}
							</td>
							<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.nama_kategori ?? '-'}</td>
							<td class="px-3 py-2 text-right">{item.stok_sekarang} {item.singkatan_satuan ?? ''}</td>
							<td class="px-3 py-2"><span class="text-xs font-bold" style="color:{st.color}">{st.label}</span></td>
							<td class="px-3 py-2 text-right">{rupiah(item.harga_jual_eceran)}</td>
							<td class="px-3 py-2 text-right">
								{#if item.is_active}
									<button onclick={() => bukaFormBarang(item)} class="text-xs mr-2" style="color:var(--info)">Edit</button>
									<button onclick={() => hapusBarang(item.id)} class="text-xs" style="color:var(--danger)">Nonaktif</button>
								{:else}
									<button onclick={async () => { await api.put(`/barang/${item.id}`, { is_active: true }); muatBarang(query) }} class="text-xs" style="color:var(--accent)">Aktifkan</button>
								{/if}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

<TabBarangGuide />

<Modal bind:open={modalBarang} title={editBarang?.id ? 'Edit Barang' : 'Tambah Barang'}>
	{#snippet children()}
	<form onsubmit={(e) => { e.preventDefault(); simpanBarang(); }} class="flex flex-col gap-3 text-sm">
		{#if error}<p class="text-xs p-2 rounded" style="background:var(--surface2);color:var(--danger)">{error}</p>{/if}
		<div class="grid grid-cols-2 gap-3">
			<div class="flex flex-col gap-1">
				<label for="fb-kode" class="text-xs" style="color:var(--text-dim)">KODE *</label>
				<input id="fb-kode" bind:value={fb.kode_barang} required class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1">
				<label for="fb-nama" class="text-xs" style="color:var(--text-dim)">NAMA *</label>
				<input id="fb-nama" bind:value={fb.nama_barang} required class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1">
				<label for="fb-hb" class="text-xs" style="color:var(--text-dim)">HARGA BELI</label>
				<input id="fb-hb" type="number" min="0" bind:value={fb.harga_beli_terakhir} class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1">
				<label for="fb-he" class="text-xs" style="color:var(--text-dim)">HARGA ECERAN</label>
				<input id="fb-he" type="number" min="0" bind:value={fb.harga_jual_eceran} class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1">
				<label for="fb-hg" class="text-xs" style="color:var(--text-dim)">HARGA GROSIR</label>
				<input id="fb-hg" type="number" min="0" bind:value={fb.harga_jual_grosir} class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1">
				<label for="fb-min" class="text-xs" style="color:var(--text-dim)">STOK MINIMUM</label>
				<input id="fb-min" type="number" min="0" bind:value={fb.stok_minimum} class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>

			<!-- Kategori dengan filter -->
			<div class="flex flex-col gap-1">
				<label for="fb-kat" class="text-xs" style="color:var(--text-dim)">KATEGORI</label>
				{#if kategoriList.length === 0}
					<p class="text-xs px-2 py-1.5 rounded" style="background:var(--surface2);color:var(--warn)">Belum ada kategori — tambah di tab Pengaturan.</p>
				{:else}
					<input type="text" placeholder="Filter kategori..." bind:value={searchKategori} class="px-2 py-1 rounded border outline-none text-xs" style="background:var(--surface2);border-color:var(--border);color:var(--text-dim)" />
					<select id="fb-kat" bind:value={fb.kategori_id} class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)">
						<option value={null}>— pilih —</option>
						{#each filteredKategori as k (k.id)}
							<option value={k.id}>{k.nama}{k.contoh ? ` — ${k.contoh}` : ''}</option>
						{/each}
					</select>
				{/if}
			</div>

			<!-- Satuan dengan filter -->
			<div class="flex flex-col gap-1">
				<label for="fb-sat" class="text-xs" style="color:var(--text-dim)">SATUAN</label>
				{#if satuanList.length === 0}
					<p class="text-xs px-2 py-1.5 rounded" style="background:var(--surface2);color:var(--warn)">Belum ada satuan — tambah di tab Pengaturan.</p>
				{:else}
					<input type="text" placeholder="Filter satuan..." bind:value={searchSatuan} class="px-2 py-1 rounded border outline-none text-xs" style="background:var(--surface2);border-color:var(--border);color:var(--text-dim)" />
					<select id="fb-sat" bind:value={fb.satuan_dasar_id} class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)">
						<option value={null}>— pilih —</option>
						{#each filteredSatuan as s (s.id)}
							<option value={s.id}>{s.nama} ({s.singkatan}){s.contoh ? ` — ${s.contoh}` : ''}</option>
						{/each}
					</select>
				{/if}
			</div>

			<div class="flex flex-col gap-1 col-span-2">
				<label for="fb-rak" class="text-xs" style="color:var(--text-dim)">LOKASI RAK</label>
				<input id="fb-rak" bind:value={fb.lokasi_rak} class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>

			<!-- Foto produk -->
			<div class="flex flex-col gap-1 col-span-2">
				<label for="fb-foto" class="text-xs" style="color:var(--text-dim)">FOTO PRODUK</label>
				<div class="flex items-center gap-3">
					{#if fotoPreviewUrl}
						<img src={fotoPreviewUrl} alt="preview" class="w-16 h-16 rounded object-cover shrink-0" style="border:1px solid var(--border)" />
					{:else}
						<div class="w-16 h-16 rounded flex items-center justify-center shrink-0 text-xs" style="background:var(--surface2);border:1px dashed var(--border);color:var(--text-dim)"></div>
					{/if}
					<div class="flex flex-col gap-1">
						<input id="fb-foto" type="file" accept="image/*" onchange={handleFotoChange} class="text-xs" style="color:var(--text-color)" />
						<span class="text-xs" style="color:var(--text-dim)">JPG/PNG, maks 5MB. Akan di-resize otomatis.</span>
					</div>
				</div>
			</div>
		</div>
		<div class="flex justify-end gap-2">
			<button type="button" onclick={() => modalBarang = false} class="px-3 py-1 rounded text-sm" style="color:var(--text-dim)">Batal</button>
			<button type="submit" class="px-3 py-1 rounded text-sm font-bold" style="background:var(--accent);color:var(--bg)">Simpan</button>
		</div>
	</form>
	{/snippet}
</Modal>
