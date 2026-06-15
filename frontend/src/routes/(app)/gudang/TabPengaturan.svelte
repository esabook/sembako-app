<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import DataTable from '$lib/components/DataTable.svelte';
	import type { Column } from '$lib/components/DataTable.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	type Kategori = {
		id: number;
		nama: string;
		contoh: string | null;
		kode: string | null;
		is_preset: boolean;
	};
	type Satuan = {
		id: number;
		nama: string;
		singkatan: string;
		contoh: string | null;
		is_preset: boolean;
	};

	const PREDEFINED_KATEGORI: { nama: string; kode: string; contoh: string }[] = [
		{ nama: 'Beras & Serealia', kode: 'BERAS', contoh: 'beras putih, beras merah, jagung pipil' },
		{ nama: 'Tepung & Olahan Biji', kode: 'TEPNG', contoh: 'tepung terigu, tepung beras, maizena' },
		{ nama: 'Minyak & Lemak', kode: 'MNYAK', contoh: 'minyak goreng, margarin, mentega' },
		{ nama: 'Gula & Pemanis', kode: 'GULA', contoh: 'gula pasir, gula merah, gula aren' },
		{ nama: 'Garam & Bumbu Dasar', kode: 'BUMBU', contoh: 'garam, terasi, penyedap, kaldu blok' },
		{ nama: 'Kacang-kacangan', kode: 'KACNG', contoh: 'kedelai, kacang tanah, kacang hijau' },
		{ nama: 'Telur', kode: 'TELUR', contoh: 'telur ayam ras, kampung, bebek' },
		{ nama: 'Daging & Unggas', kode: 'DAGNG', contoh: 'daging sapi, ayam potong, kambing' },
		{ nama: 'Ikan & Hasil Laut', kode: 'IKAN', contoh: 'ikan bandeng, udang, cumi, ikan asin' },
		{ nama: 'Sayuran Segar', kode: 'SAYUR', contoh: 'kangkung, bayam, wortel, tomat' },
		{ nama: 'Buah Segar', kode: 'BUAH', contoh: 'pisang, jeruk, mangga, semangka' },
		{ nama: 'Susu & Produk Susu', kode: 'SUSU', contoh: 'SKM, susu UHT, susu bubuk, keju' },
		{ nama: 'Mie & Pasta', kode: 'MIE', contoh: 'mie instan, bihun, soun, spageti' },
		{ nama: 'Kecap, Saus & Sambal', kode: 'SAUS', contoh: 'kecap manis, saus tomat, sambal botol' },
		{ nama: 'Minuman Pokok', kode: 'MINUM', contoh: 'air galon, teh, kopi, serbuk minuman' },
		{ nama: 'Roti & Makanan Jadi', kode: 'ROTI', contoh: 'roti tawar, biskuit, cracker, bubur' },
		{ nama: 'Sabun & Pembersih Badan', kode: 'SABUN', contoh: 'sabun mandi, body wash, lulur' },
		{ nama: 'Sampo & Perawatan Rambut', kode: 'SAMPO', contoh: 'sampo, kondisioner, pomade' },
		{ nama: 'Pasta Gigi & Sikat Gigi', kode: 'GIGI', contoh: 'pasta gigi, sikat gigi, obat kumur' },
		{
			nama: 'Detergen & Pencuci Pakaian',
			kode: 'DETRG',
			contoh: 'detergen, pelembut, pewangi baju'
		},
		{ nama: 'Pembersih Rumah', kode: 'BRSIH', contoh: 'karbol, pembersih lantai, sabun piring' },
		{
			nama: 'Tisu & Perlengkapan Mandi',
			kode: 'TISU',
			contoh: 'tisu meja, tisu basah, kapas, cotton bud'
		},
		{ nama: 'Pembalut & Popok', kode: 'POPOK', contoh: 'pembalut, popok bayi, adult diapers' },
		{ nama: 'Obat-obatan Bebas', kode: 'OBAT', contoh: 'paracetamol, antasida, minyak kayu putih' },
		{ nama: 'Vitamin & Suplemen', kode: 'VITMN', contoh: 'vitamin C, madu, jahe instan, suplemen' },
		{
			nama: 'Lilin & Penerangan',
			kode: 'PNRNG',
			contoh: 'lilin, baterai, bohlam, lampu emergency'
		},
		{ nama: 'Korek & Bahan Bakar', kode: 'KOREK', contoh: 'korek api, spiritus, minyak tanah' },
		{
			nama: 'Plastik & Kemasan',
			kode: 'PLSTK',
			contoh: 'kantong plastik, plastik wrap, tali rafia'
		},
		{ nama: 'Alat Tulis & Kertas', kode: 'ALTKLS', contoh: 'bolpoin, pensil, buku tulis, amplop' },
		{ nama: 'Rokok & Tembakau', kode: 'ROKOK', contoh: 'rokok filter, rokok kretek, tembakau' },
		{ nama: 'Permen & Snack Ringan', kode: 'SNACK', contoh: 'permen, coklat, keripik, wafer' },
		{ nama: 'Minuman Kemasan', kode: 'MINKMN', contoh: 'minuman botol, kaleng, jus kotak' },
		{ nama: 'Isi Ulang & Galon', kode: 'ISULNG', contoh: 'air galon isi ulang, gas elpiji' },
		{ nama: 'Aksesori Dapur', kode: 'DAPUR', contoh: 'aluminium foil, kertas roti, sumpit' },
		{ nama: 'Perlengkapan Bayi', kode: 'BAYI', contoh: 'bedak bayi, minyak bayi, losion bayi' }
	];

	const PREDEFINED_SATUAN: { nama: string; singkatan: string; contoh: string }[] = [
		{ nama: 'Kilogram', singkatan: 'KG', contoh: 'beras, gula, minyak curah' },
		{ nama: 'Gram', singkatan: 'GR', contoh: 'bumbu, rempah' },
		{ nama: 'Liter', singkatan: 'LTR', contoh: 'minyak goreng, kecap' },
		{ nama: 'Mililiter', singkatan: 'ML', contoh: 'saus sachet' },
		{ nama: 'Karung', singkatan: 'KRG', contoh: 'beras 25kg/50kg' },
		{ nama: 'Sak', singkatan: 'SAK', contoh: 'beras, tepung terigu' },
		{ nama: 'Bungkus', singkatan: 'BGS', contoh: 'mie instan, teh celup' },
		{ nama: 'Pcs / Buah', singkatan: 'PCS', contoh: 'telur, bawang per butir' },
		{ nama: 'Krat / Tray', singkatan: 'TRAY', contoh: 'telur 30 butir' },
		{ nama: 'Karton / Dus', singkatan: 'KTN', contoh: 'mie instan per karton' },
		{ nama: 'Pak', singkatan: 'PAK', contoh: 'gula pasir 1kg/pack' },
		{ nama: 'Sachet', singkatan: 'SCH', contoh: 'kopi, gula sachet' },
		{ nama: 'Botol', singkatan: 'BTL', contoh: 'kecap, saus botol' },
		{ nama: 'Jerigen', singkatan: 'JRG', contoh: 'minyak goreng 5L/18L' },
		{ nama: 'Kaleng', singkatan: 'KLG', contoh: 'sarden, susu kental manis' },
		{ nama: 'Ikat', singkatan: 'IKT', contoh: 'sayur mayur, kangkung' },
		{ nama: 'Sisir', singkatan: 'SSR', contoh: 'pisang' },
		{ nama: 'Tandan', singkatan: 'TDN', contoh: 'pisang, kurma' },
		{ nama: 'Rol', singkatan: 'ROL', contoh: 'tisu gulung, plastik wrap' },
		{ nama: 'Lembar', singkatan: 'LBR', contoh: 'tisu muka, aluminium foil' },
		{ nama: 'Lusin', singkatan: 'LSN', contoh: 'sabun, baterai, korek' },
		{ nama: 'Gross', singkatan: 'GRS', contoh: 'korek api, pensil' },
		{ nama: 'Rim', singkatan: 'RIM', contoh: 'kertas A4, stiker' },
		{ nama: 'Set', singkatan: 'SET', contoh: 'alat makan, perlengkapan' },
		{ nama: 'Pasang', singkatan: 'PSG', contoh: 'sandal, sepatu' },
		{ nama: 'Tube', singkatan: 'TUB', contoh: 'pasta gigi, krim' },
		{ nama: 'Pouch', singkatan: 'PCH', contoh: 'detergen refill, sampo refill' },
		{ nama: 'Refill', singkatan: 'RFL', contoh: 'isi ulang galon, tinta' },
		{ nama: 'Galon', singkatan: 'GLN', contoh: 'air minum galon 19L' },
		{ nama: 'Kubus / Cube', singkatan: 'KBS', contoh: 'kaldu blok' },
		{ nama: 'Keping', singkatan: 'KPG', contoh: 'batu baterai, disk' },
		{ nama: 'Batang', singkatan: 'BTG', contoh: 'sabun batang, lilin' },
		{ nama: 'Biji', singkatan: 'BJI', contoh: 'kancing, permen per biji' },
		{ nama: 'Meter', singkatan: 'MTR', contoh: 'tali rafia, karet' },
		{ nama: 'Gulung', singkatan: 'GLG', contoh: 'kabel, selang, benang' },
		{ nama: 'Ekor', singkatan: 'EKR', contoh: 'ikan, ayam potong' },
		{ nama: 'Potong', singkatan: 'PTG', contoh: 'ayam potong per bagian' },
		{ nama: 'Kotak', singkatan: 'KTK', contoh: 'susu kotak, jus kotak' },
		{ nama: 'Stoples', singkatan: 'STP', contoh: 'biskuit, kopi toples' }
	];

	let kategoriList = $state<Kategori[]>([]);
	let satuanList = $state<Satuan[]>([]);
	let errorPengaturan = $state('');
	let importingPreset = $state(false);
	let showPredefinedKategori = $state(false);
	let showPredefinedSatuan = $state(false);

	let sortKeyKategori = $state('nama');
	let sortDirKategori = $state<'asc' | 'desc'>('asc');
	let sortKeySatuan = $state('nama');
	let sortDirSatuan = $state<'asc' | 'desc'>('asc');

	const kolKategori: Column[] = [
		{ key: 'nama', label: 'Nama Kategori' },
		{ key: 'kode', label: 'Kode', width: 80, sortable: true },
		{ key: 'contoh', label: 'Contoh Penggunaan' },
		{ key: 'aksi', label: '', width: 116, sortable: false, align: 'right', hideable: false }
	];

	const kolSatuan: Column[] = [
		{ key: 'nama', label: 'Nama Satuan' },
		{ key: 'singkatan', label: 'Singkatan', width: 90 },
		{ key: 'contoh', label: 'Contoh Penggunaan' },
		{ key: 'aksi', label: '', width: 116, sortable: false, align: 'right', hideable: false }
	];

	function sortList<T extends Record<string, unknown>>(
		list: T[],
		key: string,
		dir: 'asc' | 'desc'
	): T[] {
		if (!key) return list;
		return [...list].sort((a, b) => {
			const va = String(a[key] ?? '');
			const vb = String(b[key] ?? '');
			const cmp = va.localeCompare(vb, 'id', { numeric: true });
			return dir === 'asc' ? cmp : -cmp;
		});
	}

	let sortedKategori = $derived(sortList(kategoriList, sortKeyKategori, sortDirKategori));
	let sortedSatuan = $derived(sortList(satuanList, sortKeySatuan, sortDirSatuan));

	let newKategori = $state('');
	let newKategoriKode = $state('');
	let newKategoriContoh = $state('');
	let editKategoriId = $state<number | null>(null);
	let editKategoriNama = $state('');
	let editKategoriKode = $state('');
	let editKategoriContoh = $state('');

	let newSatuanNama = $state('');
	let newSatuanSingkatan = $state('');
	let newSatuanContoh = $state('');
	let editSatuanId = $state<number | null>(null);
	let editSatuanNama = $state('');
	let editSatuanSingkatan = $state('');
	let editSatuanContoh = $state('');

	async function muatMeta() {
		const [k, s] = await Promise.all([
			api.get<Kategori[]>('/barang/kategori'),
			api.get<Satuan[]>('/barang/satuan')
		]);
		if (k.success) kategoriList = k.data;
		if (s.success) satuanList = s.data;
	}

	async function tambahKategori() {
		errorPengaturan = '';
		if (!newKategori.trim()) return;
		const r = await api.post('/barang/kategori', {
			nama: newKategori.trim(),
			kode: newKategoriKode.trim() || undefined,
			contoh: newKategoriContoh.trim() || undefined
		});
		if (!r.success) {
			errorPengaturan = (r as { success: false; error: string }).error;
			return;
		}
		newKategori = '';
		newKategoriKode = '';
		newKategoriContoh = '';
		muatMeta();
	}

	async function simpanEditKategori(id: number) {
		errorPengaturan = '';
		const r = await api.put(`/barang/kategori/${id}`, {
			nama: editKategoriNama.trim(),
			kode: editKategoriKode.trim() || undefined,
			contoh: editKategoriContoh.trim() || undefined
		});
		if (!r.success) {
			errorPengaturan = (r as { success: false; error: string }).error;
			return;
		}
		editKategoriId = null;
		muatMeta();
	}

	async function hapusKategori(id: number) {
		errorPengaturan = '';
		const r = await api.delete(`/barang/kategori/${id}`);
		if (!r.success) {
			errorPengaturan = (r as { success: false; error: string }).error;
			return;
		}
		muatMeta();
	}

	async function tambahSatuan() {
		errorPengaturan = '';
		if (!newSatuanNama.trim() || !newSatuanSingkatan.trim()) return;
		const r = await api.post('/barang/satuan', {
			nama: newSatuanNama.trim(),
			singkatan: newSatuanSingkatan.trim(),
			contoh: newSatuanContoh.trim() || undefined
		});
		if (!r.success) {
			errorPengaturan = (r as { success: false; error: string }).error;
			return;
		}
		newSatuanNama = '';
		newSatuanSingkatan = '';
		newSatuanContoh = '';
		muatMeta();
	}

	async function simpanEditSatuan(id: number) {
		errorPengaturan = '';
		const r = await api.put(`/barang/satuan/${id}`, {
			nama: editSatuanNama.trim(),
			singkatan: editSatuanSingkatan.trim(),
			contoh: editSatuanContoh.trim() || undefined
		});
		if (!r.success) {
			errorPengaturan = (r as { success: false; error: string }).error;
			return;
		}
		editSatuanId = null;
		muatMeta();
	}

	async function hapusSatuan(id: number) {
		errorPengaturan = '';
		const r = await api.delete(`/barang/satuan/${id}`);
		if (!r.success) {
			errorPengaturan = (r as { success: false; error: string }).error;
			return;
		}
		muatMeta();
	}

	async function importPresetKategori() {
		importingPreset = true;
		const r = await api.post('/barang/kategori/import-preset', {
			items: PREDEFINED_KATEGORI.map((p) => ({ nama: p.nama, kode: p.kode, contoh: p.contoh }))
		});
		importingPreset = false;
		if (!r.success) {
			errorPengaturan = (r as { success: false; error: string }).error;
			return;
		}
		const { inserted, updated } = (
			r as { success: true; data: { inserted: number; updated: number } }
		).data;
		if (inserted === 0 && updated === 0) errorPengaturan = 'Tidak ada perubahan.';
		muatMeta();
	}

	async function importPresetSatuan() {
		importingPreset = true;
		const r = await api.post('/barang/satuan/import-preset', {
			items: PREDEFINED_SATUAN.map((p) => ({
				nama: p.nama,
				singkatan: p.singkatan,
				contoh: p.contoh
			}))
		});
		importingPreset = false;
		if (!r.success) {
			errorPengaturan = (r as { success: false; error: string }).error;
			return;
		}
		const { inserted, updated } = (
			r as { success: true; data: { inserted: number; updated: number } }
		).data;
		if (inserted === 0 && updated === 0) errorPengaturan = 'Tidak ada perubahan.';
		muatMeta();
	}

	onMount(muatMeta);
</script>

<div class="flex flex-col gap-8">
	{#if errorPengaturan}
		<p class="rounded p-2 text-xs" style="background:var(--surface2);color:var(--danger)">
			{errorPengaturan}
			<Button variant="ghost" size="xs" onclick={() => (errorPengaturan = '')}>✕</Button>
		</p>
	{/if}

	<!-- Kategori Barang -->
	<div class="flex flex-col gap-3">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h3 class="text-sm font-bold">Kategori Barang</h3>
			<div class="flex gap-2">
				<Button variant="ghost" size="xs" onclick={importPresetKategori} loading={importingPreset}
					>↓ Import Data Bawaan ke DB</Button
				>
				<Button
					variant="dim"
					size="xs"
					onclick={() => (showPredefinedKategori = !showPredefinedKategori)}
					>{showPredefinedKategori ? 'Sembunyikan' : 'Lihat'} Referensi ({PREDEFINED_KATEGORI.length})</Button
				>
			</div>
		</div>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				tambahKategori();
			}}
			class="flex flex-wrap gap-2"
		>
			<input
				bind:value={newKategori}
				placeholder="Nama kategori baru..."
				required
				class="rounded border px-2 py-1 text-sm outline-none"
				style="background:var(--surface);border-color:var(--border);color:var(--text);min-width:160px;flex:1"
			/>
			<input
				bind:value={newKategoriKode}
				placeholder="Kode (mis: BERAS)"
				maxlength="8"
				class="rounded border px-2 py-1 font-mono text-sm uppercase outline-none"
				style="background:var(--surface);border-color:var(--border);color:var(--text);flex-shrink:0"
			/>
			<input
				bind:value={newKategoriContoh}
				placeholder="Contoh penggunaan (opsional)"
				class="rounded border px-2 py-1 text-sm outline-none"
				style="background:var(--surface);border-color:var(--border);color:var(--text);min-width:200px;flex:2"
			/>
			<Button type="submit" size="sm">+ Tambah</Button>
		</form>

		<DataTable
			columns={kolKategori}
			bind:sortKey={sortKeyKategori}
			bind:sortDir={sortDirKategori}
			rowCount={sortedKategori.length + (showPredefinedKategori ? PREDEFINED_KATEGORI.length : 0)}
			emptyText="Belum ada kategori. Tambah di atas atau tampilkan data bawaan."
		>
			{#snippet body(hidden)}
				{#each sortedKategori as item (item.id)}
					<tr class="border-t" style="border-color:var(--border)">
						{#if editKategoriId === item.id}
							{#if !hidden.has('nama')}
								<td class="px-2 py-1.5">
									<input
										bind:value={editKategoriNama}
										class="w-full rounded border px-2 py-0.5 text-sm outline-none"
										style="background:var(--surface2);border-color:var(--border);color:var(--text)"
									/>
								</td>
							{/if}
							{#if !hidden.has('kode')}
								<td class="px-2 py-1.5">
									<input
										bind:value={editKategoriKode}
										placeholder="kode..."
										class="w-full rounded border px-2 py-0.5 font-mono text-sm outline-none"
										style="background:var(--surface2);border-color:var(--border);color:var(--text)"
									/>
								</td>
							{/if}
							{#if !hidden.has('contoh')}
								<td class="px-2 py-1.5">
									<input
										bind:value={editKategoriContoh}
										placeholder="contoh penggunaan..."
										class="w-full rounded border px-2 py-0.5 text-sm outline-none"
										style="background:var(--surface2);border-color:var(--border);color:var(--text)"
									/>
								</td>
							{/if}
							<td class="px-2 py-1.5">
								<div class="flex justify-end gap-1.5">
									<Button size="xs" onclick={() => simpanEditKategori(item.id)}>simpan</Button>
									<Button variant="dim" size="xs" onclick={() => (editKategoriId = null)}
										>batal</Button
									>
								</div>
							</td>
						{:else}
							{#if !hidden.has('nama')}
								<td class="px-3 py-2">
									{item.nama}
									{#if item.is_preset}<span
											class="ml-1 rounded px-1 py-0.5 text-xs"
											style="background:var(--surface2);color:var(--text-dim)">bawaan</span
										>{/if}
								</td>
							{/if}
							{#if !hidden.has('kode')}
								<td class="px-3 py-2 font-mono text-xs" style="color:var(--text-dim)"
									>{item.kode ?? '—'}</td
								>
							{/if}
							{#if !hidden.has('contoh')}
								<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.contoh ?? '—'}</td
								>
							{/if}
							<td class="px-2 py-2">
								{#if !item.is_preset}
									<div class="flex justify-end gap-1.5">
										<Button
											variant="ghost"
											size="xs"
											onclick={() => {
												editKategoriId = item.id;
												editKategoriNama = item.nama;
												editKategoriKode = item.kode ?? '';
												editKategoriContoh = item.contoh ?? '';
												errorPengaturan = '';
											}}>edit</Button
										>
										<Button variant="danger" size="xs" onclick={() => hapusKategori(item.id)}
											>hapus</Button
										>
									</div>
								{/if}
							</td>
						{/if}
					</tr>
				{/each}
				{#if showPredefinedKategori}
					{#each PREDEFINED_KATEGORI as p (p.kode)}
						<tr
							class="border-t"
							style="border-color:var(--border);background:color-mix(in srgb, var(--surface2) 60%, transparent)"
						>
							{#if !hidden.has('nama')}
								<td class="px-3 py-2 text-xs">
									{p.nama}
									<span
										class="ml-1 rounded px-1 py-0.5 text-xs"
										style="background:var(--surface2);color:var(--text-dim)">bawaan</span
									>
								</td>
							{/if}
							{#if !hidden.has('kode')}
								<td class="px-3 py-2 font-mono text-xs" style="color:var(--text-dim)">{p.kode}</td>
							{/if}
							{#if !hidden.has('contoh')}
								<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{p.contoh}</td>
							{/if}
							<td class="px-3 py-2"></td>
						</tr>
					{/each}
				{/if}
			{/snippet}
		</DataTable>
	</div>

	<!-- Satuan Barang -->
	<div class="flex flex-col gap-3">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h3 class="text-sm font-bold">Satuan Barang</h3>
			<div class="flex gap-2">
				<Button variant="ghost" size="xs" onclick={importPresetSatuan} loading={importingPreset}
					>↓ Import Data Bawaan ke DB</Button
				>
				<Button
					variant="dim"
					size="xs"
					onclick={() => (showPredefinedSatuan = !showPredefinedSatuan)}
					>{showPredefinedSatuan ? 'Sembunyikan' : 'Lihat'} Referensi ({PREDEFINED_SATUAN.length})</Button
				>
			</div>
		</div>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				tambahSatuan();
			}}
			class="flex flex-wrap gap-2"
		>
			<input
				bind:value={newSatuanNama}
				placeholder="Nama satuan (mis: Karton)"
				required
				class="rounded border px-2 py-1 text-sm outline-none"
				style="background:var(--surface);border-color:var(--border);color:var(--text);min-width:140px;flex:1"
			/>
			<input
				bind:value={newSatuanSingkatan}
				placeholder="Singkatan"
				required
				class="rounded border px-2 py-1 font-mono text-sm uppercase outline-none"
				style="background:var(--surface);border-color:var(--border);color:var(--text);width:150px;flex-shrink:0"
			/>
			<input
				bind:value={newSatuanContoh}
				placeholder="Contoh penggunaan (opsional)"
				class="rounded border px-2 py-1 text-sm outline-none"
				style="background:var(--surface);border-color:var(--border);color:var(--text);min-width:200px;flex:2"
			/>
			<Button type="submit" size="sm">+ Tambah</Button>
		</form>

		<DataTable
			columns={kolSatuan}
			bind:sortKey={sortKeySatuan}
			bind:sortDir={sortDirSatuan}
			rowCount={sortedSatuan.length + (showPredefinedSatuan ? PREDEFINED_SATUAN.length : 0)}
			emptyText="Belum ada satuan. Tambah di atas atau tampilkan data bawaan."
		>
			{#snippet body(hidden)}
				{#each sortedSatuan as item (item.id)}
					<tr class="border-t" style="border-color:var(--border)">
						{#if editSatuanId === item.id}
							{#if !hidden.has('nama')}
								<td class="px-2 py-1.5">
									<input
										bind:value={editSatuanNama}
										class="w-full rounded border px-2 py-0.5 text-sm outline-none"
										style="background:var(--surface2);border-color:var(--border);color:var(--text)"
									/>
								</td>
							{/if}
							{#if !hidden.has('singkatan')}
								<td class="px-2 py-1.5">
									<input
										bind:value={editSatuanSingkatan}
										class="w-full rounded border px-2 py-0.5 text-sm outline-none"
										style="background:var(--surface2);border-color:var(--border);color:var(--text)"
									/>
								</td>
							{/if}
							{#if !hidden.has('contoh')}
								<td class="px-2 py-1.5">
									<input
										bind:value={editSatuanContoh}
										placeholder="contoh penggunaan..."
										class="w-full rounded border px-2 py-0.5 text-sm outline-none"
										style="background:var(--surface2);border-color:var(--border);color:var(--text)"
									/>
								</td>
							{/if}
							<td class="px-2 py-1.5">
								<div class="flex justify-end gap-1.5">
									<Button size="xs" onclick={() => simpanEditSatuan(item.id)}>simpan</Button>
									<Button variant="dim" size="xs" onclick={() => (editSatuanId = null)}
										>batal</Button
									>
								</div>
							</td>
						{:else}
							{#if !hidden.has('nama')}
								<td class="px-3 py-2">
									{item.nama}
									{#if item.is_preset}<span
											class="ml-1 rounded px-1 py-0.5 text-xs"
											style="background:var(--surface2);color:var(--text-dim)">bawaan</span
										>{/if}
								</td>
							{/if}
							{#if !hidden.has('singkatan')}
								<td class="px-3 py-2">
									<span
										class="rounded px-1.5 py-0.5 font-mono text-xs"
										style="background:var(--surface2);color:var(--text-dim)">{item.singkatan}</span
									>
								</td>
							{/if}
							{#if !hidden.has('contoh')}
								<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.contoh ?? '—'}</td
								>
							{/if}
							<td class="px-2 py-2">
								{#if !item.is_preset}
									<div class="flex justify-end gap-1.5">
										<Button
											variant="ghost"
											size="xs"
											onclick={() => {
												editSatuanId = item.id;
												editSatuanNama = item.nama;
												editSatuanSingkatan = item.singkatan;
												editSatuanContoh = item.contoh ?? '';
												errorPengaturan = '';
											}}>edit</Button
										>
										<Button variant="danger" size="xs" onclick={() => hapusSatuan(item.id)}
											>hapus</Button
										>
									</div>
								{/if}
							</td>
						{/if}
					</tr>
				{/each}
				{#if showPredefinedSatuan}
					{#each PREDEFINED_SATUAN as p (p.singkatan)}
						<tr
							class="border-t"
							style="border-color:var(--border);background:color-mix(in srgb, var(--surface2) 60%, transparent)"
						>
							{#if !hidden.has('nama')}
								<td class="px-3 py-2 text-xs">
									{p.nama}
									<span
										class="ml-1 rounded px-1 py-0.5 text-xs"
										style="background:var(--surface2);color:var(--text-dim)">bawaan</span
									>
								</td>
							{/if}
							{#if !hidden.has('singkatan')}
								<td class="px-3 py-2">
									<span
										class="rounded px-1.5 py-0.5 font-mono text-xs"
										style="background:var(--surface2);color:var(--text-dim)">{p.singkatan}</span
									>
								</td>
							{/if}
							{#if !hidden.has('contoh')}
								<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{p.contoh}</td>
							{/if}
							<td class="px-3 py-2"></td>
						</tr>
					{/each}
				{/if}
			{/snippet}
		</DataTable>
	</div>
</div>
