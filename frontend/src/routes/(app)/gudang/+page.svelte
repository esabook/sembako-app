<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import Modal from '$lib/components/Modal.svelte';

	type Barang = {
		id: number; kode_barang: string; nama_barang: string;
		harga_jual_eceran: number; harga_beli_terakhir: number;
		stok_sekarang: number; stok_minimum: number;
		nama_kategori: string | null; nama_satuan: string | null; singkatan_satuan: string | null;
		is_active: boolean;
	};
	type Supplier = {
		id: number; kode_supplier: string; nama_supplier: string;
		kontak: string | null; terms_bayar: number; is_active: boolean;
	};
	type Kategori = { id: number; nama: string };
	type Satuan = { id: number; nama: string; singkatan: string };

	let tab = $state<'barang' | 'supplier'>('barang');
	let barangList = $state<Barang[]>([]);
	let supplierList = $state<Supplier[]>([]);
	let kategoriList = $state<Kategori[]>([]);
	let satuanList = $state<Satuan[]>([]);
	let query = $state('');
	let loading = $state(false);
	let error = $state('');

	// Modal barang
	let modalBarang = $state(false);
	let editBarang = $state<Partial<Barang> | null>(null);
	let formBarang = $state({ kode_barang: '', nama_barang: '', kategori_id: '', satuan_dasar_id: '',
		harga_beli_terakhir: '', harga_jual_eceran: '', harga_jual_grosir: '', stok_minimum: '', lokasi_rak: '' });

	// Modal supplier
	let modalSupplier = $state(false);
	let editSupplier = $state<Partial<Supplier> | null>(null);
	let formSupplier = $state({ kode_supplier: '', nama_supplier: '', kontak: '', alamat: '', terms_bayar: '', limit_hutang: '' });

	async function muatBarang() {
		loading = true;
		const res = await api.get<Barang[]>(`/barang?q=${query}`);
		if (res.success) barangList = res.data;
		loading = false;
	}

	async function muatSupplier() {
		loading = true;
		const res = await api.get<Supplier[]>(`/supplier?q=${query}`);
		if (res.success) supplierList = res.data;
		loading = false;
	}

	async function muatMeta() {
		const [k, s] = await Promise.all([
			api.get<Kategori[]>('/barang/kategori'),
			api.get<Satuan[]>('/barang/satuan'),
		]);
		if (k.success) kategoriList = k.data;
		if (s.success) satuanList = s.data;
	}

	onMount(() => { muatBarang(); muatSupplier(); muatMeta(); });

	$effect(() => { query; tab === 'barang' ? muatBarang() : muatSupplier(); });

	function bukaFormBarang(item?: Barang) {
		editBarang = item ?? null;
		formBarang = {
			kode_barang: item?.kode_barang ?? '',
			nama_barang: item?.nama_barang ?? '',
			kategori_id: String(item?.['kategori_id' as keyof Barang] ?? ''),
			satuan_dasar_id: String(item?.['satuan_dasar_id' as keyof Barang] ?? ''),
			harga_beli_terakhir: String(item?.harga_beli_terakhir ?? ''),
			harga_jual_eceran: String(item?.harga_jual_eceran ?? ''),
			harga_jual_grosir: String(item?.['harga_jual_grosir' as keyof Barang] ?? ''),
			stok_minimum: String(item?.stok_minimum ?? ''),
			lokasi_rak: String(item?.['lokasi_rak' as keyof Barang] ?? ''),
		};
		modalBarang = true;
	}

	async function simpanBarang() {
		error = '';
		const payload = {
			kode_barang: formBarang.kode_barang,
			nama_barang: formBarang.nama_barang,
			kategori_id: formBarang.kategori_id ? Number(formBarang.kategori_id) : undefined,
			satuan_dasar_id: formBarang.satuan_dasar_id ? Number(formBarang.satuan_dasar_id) : undefined,
			harga_beli_terakhir: Number(formBarang.harga_beli_terakhir) || 0,
			harga_jual_eceran: Number(formBarang.harga_jual_eceran) || 0,
			harga_jual_grosir: Number(formBarang.harga_jual_grosir) || 0,
			stok_minimum: Number(formBarang.stok_minimum) || 0,
			lokasi_rak: formBarang.lokasi_rak || undefined,
		};
		const res = editBarang?.id
			? await api.put(`/barang/${editBarang.id}`, payload)
			: await api.post('/barang', payload);
		if (!res.success) { error = (res as { success: false; error: string }).error; return; }
		modalBarang = false;
		muatBarang();
	}

	async function hapusBarang(id: number) {
		if (!confirm('Nonaktifkan barang ini?')) return;
		await api.delete(`/barang/${id}`);
		muatBarang();
	}

	function bukaFormSupplier(item?: Supplier) {
		editSupplier = item ?? null;
		formSupplier = {
			kode_supplier: item?.kode_supplier ?? '',
			nama_supplier: item?.nama_supplier ?? '',
			kontak: item?.kontak ?? '',
			alamat: '',
			terms_bayar: String(item?.terms_bayar ?? ''),
			limit_hutang: '',
		};
		modalSupplier = true;
	}

	async function simpanSupplier() {
		error = '';
		const payload = {
			kode_supplier: formSupplier.kode_supplier,
			nama_supplier: formSupplier.nama_supplier,
			kontak: formSupplier.kontak || undefined,
			alamat: formSupplier.alamat || undefined,
			terms_bayar: Number(formSupplier.terms_bayar) || 0,
			limit_hutang: Number(formSupplier.limit_hutang) || 0,
		};
		const res = editSupplier?.id
			? await api.put(`/supplier/${editSupplier.id}`, payload)
			: await api.post('/supplier', payload);
		if (!res.success) { error = (res as { success: false; error: string }).error; return; }
		modalSupplier = false;
		muatSupplier();
	}

	async function hapusSupplier(id: number) {
		if (!confirm('Nonaktifkan supplier ini?')) return;
		await api.delete(`/supplier/${id}`);
		muatSupplier();
	}

	function rupiah(n: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
	}

	function statusStok(item: Barang) {
		if (item.stok_sekarang <= 0) return { label: 'HABIS', color: 'var(--danger)' };
		if (item.stok_sekarang <= item.stok_minimum) return { label: 'HAMPIR HABIS', color: 'var(--warn)' };
		return { label: 'AMAN', color: 'var(--accent)' };
	}
</script>

<div class="flex flex-col gap-4">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<div class="flex gap-1">
			{#each ['barang', 'supplier'] as t}
				<button
					onclick={() => { tab = t as typeof tab; query = ''; }}
					class="px-3 py-1 rounded text-sm"
					style="{tab === t ? 'background:var(--surface2);color:var(--text)' : 'color:var(--text-dim)'}"
				>{t.toUpperCase()}</button>
			{/each}
		</div>
		<input
			type="search"
			placeholder="Cari..."
			bind:value={query}
			class="px-3 py-1 rounded border text-sm flex-1 max-w-xs outline-none"
			style="background:var(--surface);border-color:var(--border);color:var(--text)"
		/>
		<button
			onclick={() => tab === 'barang' ? bukaFormBarang() : bukaFormSupplier()}
			class="px-3 py-1 rounded text-sm font-bold"
			style="background:var(--accent);color:var(--bg)"
		>+ Tambah</button>
	</div>

	<!-- Tabel Barang -->
	{#if tab === 'barang'}
		<div class="rounded border overflow-x-auto" style="border-color:var(--border)">
			<table class="w-full text-sm">
				<thead>
					<tr style="background:var(--surface2);color:var(--text-dim)">
						<th class="text-left px-3 py-2 font-medium">Kode</th>
						<th class="text-left px-3 py-2 font-medium">Nama</th>
						<th class="text-left px-3 py-2 font-medium">Kategori</th>
						<th class="text-right px-3 py-2 font-medium">Stok</th>
						<th class="text-left px-3 py-2 font-medium">Status</th>
						<th class="text-right px-3 py-2 font-medium">Harga Jual</th>
						<th class="px-3 py-2"></th>
					</tr>
				</thead>
				<tbody>
					{#if loading}
						<tr><td colspan="7" class="px-3 py-4 text-center" style="color:var(--text-dim)">Memuat...</td></tr>
					{:else if barangList.length === 0}
						<tr><td colspan="7" class="px-3 py-4 text-center" style="color:var(--text-dim)">Tidak ada data</td></tr>
					{:else}
						{#each barangList as item}
							{@const stok = statusStok(item)}
							<tr class="border-t" style="border-color:var(--border)">
								<td class="px-3 py-2" style="color:var(--text-dim)">{item.kode_barang}</td>
								<td class="px-3 py-2">{item.nama_barang}</td>
								<td class="px-3 py-2" style="color:var(--text-dim)">{item.nama_kategori ?? '-'}</td>
								<td class="px-3 py-2 text-right">{item.stok_sekarang} {item.singkatan_satuan ?? ''}</td>
								<td class="px-3 py-2">
									<span class="text-xs font-bold" style="color:{stok.color}">{stok.label}</span>
								</td>
								<td class="px-3 py-2 text-right">{rupiah(item.harga_jual_eceran)}</td>
								<td class="px-3 py-2 text-right">
									<button onclick={() => bukaFormBarang(item)} class="text-xs mr-2" style="color:var(--info)">Edit</button>
									<button onclick={() => hapusBarang(item.id)} class="text-xs" style="color:var(--danger)">Nonaktif</button>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- Tabel Supplier -->
	{#if tab === 'supplier'}
		<div class="rounded border overflow-x-auto" style="border-color:var(--border)">
			<table class="w-full text-sm">
				<thead>
					<tr style="background:var(--surface2);color:var(--text-dim)">
						<th class="text-left px-3 py-2 font-medium">Kode</th>
						<th class="text-left px-3 py-2 font-medium">Nama</th>
						<th class="text-left px-3 py-2 font-medium">Kontak</th>
						<th class="text-right px-3 py-2 font-medium">Tempo (hari)</th>
						<th class="px-3 py-2"></th>
					</tr>
				</thead>
				<tbody>
					{#if loading}
						<tr><td colspan="5" class="px-3 py-4 text-center" style="color:var(--text-dim)">Memuat...</td></tr>
					{:else if supplierList.length === 0}
						<tr><td colspan="5" class="px-3 py-4 text-center" style="color:var(--text-dim)">Tidak ada data</td></tr>
					{:else}
						{#each supplierList as item}
							<tr class="border-t" style="border-color:var(--border)">
								<td class="px-3 py-2" style="color:var(--text-dim)">{item.kode_supplier}</td>
								<td class="px-3 py-2">{item.nama_supplier}</td>
								<td class="px-3 py-2" style="color:var(--text-dim)">{item.kontak ?? '-'}</td>
								<td class="px-3 py-2 text-right">{item.terms_bayar}</td>
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
	{/if}
</div>

<!-- Modal Barang -->
<Modal bind:open={modalBarang} title={editBarang?.id ? 'Edit Barang' : 'Tambah Barang'}>
	{#snippet children()}
	<form onsubmit={(e) => { e.preventDefault(); simpanBarang(); }} class="flex flex-col gap-3 text-sm">
		{#if error}<p class="text-xs p-2 rounded" style="background:var(--surface2);color:var(--danger)">{error}</p>{/if}
		<div class="grid grid-cols-2 gap-3">
			<div class="flex flex-col gap-1">
				<label for="f1" style="color:var(--text-dim)" class="text-xs">KODE *</label>				<input id="f1" bind:value={formBarang.kode_barang} required class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1">
				<label for="f2" style="color:var(--text-dim)" class="text-xs">NAMA *</label>				<input id="f2" bind:value={formBarang.nama_barang} required class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1">
				<label for="f3" style="color:var(--text-dim)" class="text-xs">KATEGORI</label>				<select id="f3" bind:value={formBarang.kategori_id} class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)">
					<option value="">— pilih —</option>
					{#each kategoriList as k}<option value={k.id}>{k.nama}</option>{/each}
				</select>
			</div>
			<div class="flex flex-col gap-1">
				<label for="f4" style="color:var(--text-dim)" class="text-xs">SATUAN</label>				<select id="f4" bind:value={formBarang.satuan_dasar_id} class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)">
					<option value="">— pilih —</option>
					{#each satuanList as s}<option value={s.id}>{s.nama} ({s.singkatan})</option>{/each}
				</select>
			</div>
			<div class="flex flex-col gap-1">
				<label for="f5" style="color:var(--text-dim)" class="text-xs">HARGA BELI</label>				<input id="f5" type="number" min="0" bind:value={formBarang.harga_beli_terakhir} class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1">
				<label for="f6" style="color:var(--text-dim)" class="text-xs">HARGA ECERAN</label>				<input id="f6" type="number" min="0" bind:value={formBarang.harga_jual_eceran} class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1">
				<label for="f7" style="color:var(--text-dim)" class="text-xs">HARGA GROSIR</label>				<input id="f7" type="number" min="0" bind:value={formBarang.harga_jual_grosir} class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1">
				<label for="f8" style="color:var(--text-dim)" class="text-xs">STOK MINIMUM</label>				<input id="f8" type="number" min="0" bind:value={formBarang.stok_minimum} class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1 col-span-2">
				<label for="f9" style="color:var(--text-dim)" class="text-xs">LOKASI RAK</label>				<input id="f9" bind:value={formBarang.lokasi_rak} placeholder="cth: A1, B3" class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
		</div>
		<div class="flex justify-end gap-2 mt-1">
			<button type="button" onclick={() => modalBarang = false} class="px-3 py-1 rounded text-sm"
				style="color:var(--text-dim)">Batal</button>
			<button type="submit" class="px-3 py-1 rounded text-sm font-bold"
				style="background:var(--accent);color:var(--bg)">Simpan</button>
		</div>
	</form>
	{/snippet}
</Modal>

<!-- Modal Supplier -->
<Modal bind:open={modalSupplier} title={editSupplier?.id ? 'Edit Supplier' : 'Tambah Supplier'}>
	{#snippet children()}
	<form onsubmit={(e) => { e.preventDefault(); simpanSupplier(); }} class="flex flex-col gap-3 text-sm">
		{#if error}<p class="text-xs p-2 rounded" style="background:var(--surface2);color:var(--danger)">{error}</p>{/if}
		<div class="grid grid-cols-2 gap-3">
			<div class="flex flex-col gap-1">
				<label for="f10" style="color:var(--text-dim)" class="text-xs">KODE *</label>				<input id="f10" bind:value={formSupplier.kode_supplier} required class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1">
				<label for="f11" style="color:var(--text-dim)" class="text-xs">NAMA *</label>				<input id="f11" bind:value={formSupplier.nama_supplier} required class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1">
				<label for="f12" style="color:var(--text-dim)" class="text-xs">KONTAK</label>				<input id="f12" bind:value={formSupplier.kontak} class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1">
				<label for="f13" style="color:var(--text-dim)" class="text-xs">TEMPO BAYAR (hari)</label>				<input id="f13" type="number" min="0" bind:value={formSupplier.terms_bayar} class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1 col-span-2">
				<label for="f14" style="color:var(--text-dim)" class="text-xs">ALAMAT</label>				<input id="f14" bind:value={formSupplier.alamat} class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1 col-span-2">
				<label for="f15" style="color:var(--text-dim)" class="text-xs">LIMIT HUTANG</label>				<input id="f15" type="number" min="0" bind:value={formSupplier.limit_hutang} class="px-2 py-1 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
		</div>
		<div class="flex justify-end gap-2 mt-1">
			<button type="button" onclick={() => modalSupplier = false} class="px-3 py-1 rounded text-sm"
				style="color:var(--text-dim)">Batal</button>
			<button type="submit" class="px-3 py-1 rounded text-sm font-bold"
				style="background:var(--accent);color:var(--bg)">Simpan</button>
		</div>
	</form>
	{/snippet}
</Modal>
