<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import Modal from '$lib/components/Modal.svelte';

	type Barang = { id: number; kode_barang: string; nama_barang: string; harga_jual_eceran: number; harga_beli_terakhir: number; stok_sekarang: number; stok_minimum: number; nama_kategori: string | null; nama_satuan: string | null; singkatan_satuan: string | null; is_active: boolean; };
	type Supplier = { id: number; kode_supplier: string; nama_supplier: string; kontak: string | null; terms_bayar: number; is_active: boolean; };
	type StokItem = { id: number; kode_barang: string; nama_barang: string; stok_sekarang: number; stok_minimum: number; lokasi_rak: string | null; nama_kategori: string | null; singkatan_satuan: string | null; };
	type MutasiItem = { id: number; tanggal: string; jenis: string; referensi_tipe: string | null; jumlah_perubahan: number; jumlah_sesudah: number; };
	type BarangMasuk = { id: number; no_penerimaan: string; tanggal_terima: string; nama_supplier: string | null; no_faktur_supplier: string | null; total_nilai: number; };
	type PORow = { id: number; no_po: string; tanggal_po: string; nama_supplier: string | null; status: string; total_nilai: number; };
	type SuggestItem = { id: number; kode_barang: string; nama_barang: string; stok_sekarang: number; stok_minimum: number; harga_beli_terakhir: number; saran_pesan: number; };
	type Kategori = { id: number; nama: string };
	type Satuan = { id: number; nama: string; singkatan: string };
	type OpnameRow = { id: number; no_opname: string; tanggal_mulai: string; tanggal_selesai: string | null; status: string };
	type OpnameDetail = OpnameRow & {
		progress: number; sudah_dihitung: number;
		items: { id: number; barang_id: number; kode_barang: string; nama_barang: string; nama_kategori: string | null; singkatan_satuan: string | null; lokasi_rak: string | null; stok_sistem: number; stok_fisik: number | null; selisih: number | null; alasan_selisih: string | null }[]
	};

	let tab = $state<'stok' | 'terima' | 'po' | 'opname' | 'barang' | 'supplier'>('stok');
	let query = $state('');
	let loading = $state(false);
	let error = $state('');

	let stokList = $state<StokItem[]>([]);
	let mutasiList = $state<MutasiItem[]>([]);
	let mutasiNama = $state('');
	let showMutasi = $state(false);
	let bmList = $state<BarangMasuk[]>([]);
	let supplierList = $state<Supplier[]>([]);
	let barangList = $state<Barang[]>([]);
	let satuanList = $state<Satuan[]>([]);
	let kategoriList = $state<Kategori[]>([]);
	let poList = $state<PORow[]>([]);
	let suggestList = $state<SuggestItem[]>([]);
	let opnameList = $state<OpnameRow[]>([]);
	let opnameAktif = $state<OpnameDetail | null>(null);
	let opnameSaving = $state(false);
	let opnameFilter = $state('');

	let bmSupplier = $state('');
	let bmNoFaktur = $state('');
	let bmTerms = $state('');
	let bmItems = $state<{ barang_id: number; nama_barang: string; kode: string; jumlah: string; harga: string; exp: string }[]>([]);
	let bmSearchVal = $state('');
	let bmSearchRes = $state<Barang[]>([]);
	let bmLoading = $state(false);

	let poSupplier = $state('');
	let poEta = $state('');
	let poItems = $state<{ barang_id: number; nama_barang: string; jumlah: string; harga_est: string }[]>([]);
	let poShowForm = $state(false);
	let poLoading = $state(false);
	let poDetail = $state<PORow | null>(null);
	let showPoDetail = $state(false);

	let modalBarang = $state(false);
	let editBarang = $state<Partial<Barang> | null>(null);
	let fb = $state({ kode_barang: '', nama_barang: '', kategori_id: '', satuan_dasar_id: '', harga_beli_terakhir: '', harga_jual_eceran: '', harga_jual_grosir: '', stok_minimum: '', lokasi_rak: '' });

	let modalSupplier = $state(false);
	let editSupplier = $state<Partial<Supplier> | null>(null);
	let fs = $state({ kode_supplier: '', nama_supplier: '', kontak: '', alamat: '', terms_bayar: '', limit_hutang: '' });

	async function muatStok() { loading = true; const r = await api.get<StokItem[]>('/stok'); if (r.success) stokList = r.data; loading = false; }
	async function muatBM() { loading = true; const r = await api.get<BarangMasuk[]>('/barang-masuk'); if (r.success) bmList = r.data; loading = false; }
	async function muatPO() { loading = true; const r = await api.get<PORow[]>('/purchase-order'); if (r.success) poList = r.data; loading = false; }
	async function muatSuggest() { const r = await api.get<SuggestItem[]>('/purchase-order/suggest/items'); if (r.success) suggestList = r.data; }
	async function muatBarang(q = '') { const r = await api.get<Barang[]>(`/barang?q=${q}`); if (r.success) barangList = r.data; }
	async function muatSupplier() { const r = await api.get<Supplier[]>('/supplier'); if (r.success) supplierList = r.data; }
	async function muatOpname() { const r = await api.get<OpnameRow[]>('/stok-opname'); if (r.success) opnameList = r.data; }
	async function muatOpnameAktif() {
		const aktif = opnameList.find((o) => o.status === 'proses' || o.status === 'draft');
		if (!aktif) { opnameAktif = null; return; }
		const r = await api.get<OpnameDetail>(`/stok-opname/${aktif.id}`);
		if (r.success) opnameAktif = r.data;
	}
	async function buatOpname() {
		if (!confirm('Buat stok opname baru? Semua stok sistem akan di-snapshot sekarang.')) return;
		opnameSaving = true;
		const r = await api.post('/stok-opname', {});
		opnameSaving = false;
		if (!r.success) { error = (r as { success: false; error: string }).error; return; }
		await muatOpname(); await muatOpnameAktif();
	}
	async function inputFisik(itemId: number, stokFisik: number, alasan?: string) {
		if (!opnameAktif) return;
		await api.put(`/stok-opname/${opnameAktif.id}/item/${itemId}`, { stok_fisik: stokFisik, alasan_selisih: alasan });
		const r = await api.get<OpnameDetail>(`/stok-opname/${opnameAktif.id}`);
		if (r.success) opnameAktif = r.data;
	}
	async function approveOpname() {
		if (!opnameAktif) return;
		if (!confirm('Approve opname? Stok sistem akan diperbarui sesuai stok fisik.')) return;
		opnameSaving = true;
		const r = await api.post(`/stok-opname/${opnameAktif.id}/approve`, {});
		opnameSaving = false;
		if (!r.success) { error = (r as { success: false; error: string }).error; return; }
		opnameAktif = null; await muatOpname(); await muatStok();
	}
	async function batalOpname() {
		if (!opnameAktif) return;
		if (!confirm('Batalkan opname ini?')) return;
		await api.delete(`/stok-opname/${opnameAktif.id}`);
		opnameAktif = null; await muatOpname();
	}
	async function muatMeta() {
		const [k, s] = await Promise.all([api.get<Kategori[]>('/barang/kategori'), api.get<Satuan[]>('/barang/satuan')]);
		if (k.success) kategoriList = k.data;
		if (s.success) satuanList = s.data;
	}

	onMount(() => { muatStok(); muatSupplier(); muatMeta(); muatBarang(); });

	$effect(() => {
		if (tab === 'stok') muatStok();
		else if (tab === 'terima') muatBM();
		else if (tab === 'po') { muatPO(); muatSuggest(); }
		else if (tab === 'opname') { muatOpname().then(() => muatOpnameAktif()); }
	else if (tab === 'barang') muatBarang(query);
	});

	async function muatMutasi(id: number, nama: string) {
		mutasiNama = nama;
		const r = await api.get<MutasiItem[]>(`/stok/${id}/mutasi`);
		if (r.success) { mutasiList = r.data; showMutasi = true; }
	}

	let bmTimer: ReturnType<typeof setTimeout>;
	function cariBM(q: string) {
		clearTimeout(bmTimer);
		bmTimer = setTimeout(async () => {
			if (!q.trim()) { bmSearchRes = []; return; }
			const r = await api.get<Barang[]>(`/barang?q=${encodeURIComponent(q)}`);
			if (r.success) bmSearchRes = r.data;
		}, 200);
	}

	function tambahBM(br: Barang) {
		if (bmItems.find((i) => i.barang_id === br.id)) return;
		bmItems = [...bmItems, { barang_id: br.id, nama_barang: br.nama_barang, kode: br.kode_barang, jumlah: '1', harga: String(br.harga_beli_terakhir || ''), exp: '' }];
		bmSearchVal = ''; bmSearchRes = [];
	}

	async function simpanBM() {
		error = '';
		if (!bmSupplier) { error = 'Pilih supplier'; return; }
		if (!bmItems.length) { error = 'Tambah item barang'; return; }
		bmLoading = true;
		const r = await api.post('/barang-masuk', {
			supplier_id: Number(bmSupplier), no_faktur_supplier: bmNoFaktur || undefined,
			terms_bayar: bmTerms ? Number(bmTerms) : undefined,
			items: bmItems.map((i) => ({ barang_id: i.barang_id, jumlah_terima: Number(i.jumlah), harga_beli: Number(i.harga), tgl_kadaluarsa: i.exp || undefined })),
		});
		bmLoading = false;
		if (!r.success) { error = (r as { success: false; error: string }).error; return; }
		bmSupplier = ''; bmNoFaktur = ''; bmTerms = ''; bmItems = [];
		muatBM(); muatStok();
	}

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

	function bukaFormBarang(item?: Barang) {
		editBarang = item ?? null;
		fb = {
			kode_barang: item?.kode_barang ?? '', nama_barang: item?.nama_barang ?? '',
			kategori_id: String((item as Record<string, unknown>)?.['kategori_id'] ?? ''),
			satuan_dasar_id: String((item as Record<string, unknown>)?.['satuan_dasar_id'] ?? ''),
			harga_beli_terakhir: String(item?.harga_beli_terakhir ?? ''),
			harga_jual_eceran: String(item?.harga_jual_eceran ?? ''),
			harga_jual_grosir: String((item as Record<string, unknown>)?.['harga_jual_grosir'] ?? ''),
			stok_minimum: String(item?.stok_minimum ?? ''),
			lokasi_rak: String((item as Record<string, unknown>)?.['lokasi_rak'] ?? ''),
		};
		modalBarang = true;
	}

	async function simpanBarang() {
		error = '';
		const p = { kode_barang: fb.kode_barang, nama_barang: fb.nama_barang, kategori_id: fb.kategori_id ? Number(fb.kategori_id) : undefined, satuan_dasar_id: fb.satuan_dasar_id ? Number(fb.satuan_dasar_id) : undefined, harga_beli_terakhir: Number(fb.harga_beli_terakhir) || 0, harga_jual_eceran: Number(fb.harga_jual_eceran) || 0, harga_jual_grosir: Number(fb.harga_jual_grosir) || 0, stok_minimum: Number(fb.stok_minimum) || 0, lokasi_rak: fb.lokasi_rak || undefined };
		const r = editBarang?.id ? await api.put(`/barang/${editBarang.id}`, p) : await api.post('/barang', p);
		if (!r.success) { error = (r as { success: false; error: string }).error; return; }
		modalBarang = false; muatBarang(query);
	}

	async function hapusBarang(id: number) { if (!confirm('Nonaktifkan?')) return; await api.delete(`/barang/${id}`); muatBarang(query); }

	function bukaFormSupplier(item?: Supplier) {
		editSupplier = item ?? null;
		fs = { kode_supplier: item?.kode_supplier ?? '', nama_supplier: item?.nama_supplier ?? '', kontak: item?.kontak ?? '', alamat: '', terms_bayar: String(item?.terms_bayar ?? ''), limit_hutang: '' };
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

	function rupiah(n: number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n); }
	function statusStok(item: { stok_sekarang: number; stok_minimum: number }) { if (item.stok_sekarang <= 0) return { label: 'HABIS', color: 'var(--danger)' }; if (item.stok_sekarang <= item.stok_minimum) return { label: 'HAMPIR HABIS', color: 'var(--warn)' }; return { label: 'AMAN', color: 'var(--accent)' }; }
	const SPC: Record<string, string> = { draft: 'var(--text-dim)', dikirim: 'var(--info)', sebagian: 'var(--warn)', lunas: 'var(--accent)', batal: 'var(--danger)' };
	const TABS = [{ id: 'stok', label: 'STOK' }, { id: 'terima', label: 'TERIMA BARANG' }, { id: 'po', label: 'PURCHASE ORDER' }, { id: 'opname', label: 'STOK OPNAME' }, { id: 'barang', label: 'MASTER BARANG' }, { id: 'supplier', label: 'SUPPLIER' }] as const;
</script>

<div class="flex gap-1 mb-4 border-b" style="border-color:var(--border)">
	{#each TABS as t}
		<button onclick={() => { tab = t.id; query = ''; error = ''; }} class="px-3 py-2 text-xs font-bold border-b-2 -mb-px"
			style="{tab === t.id ? 'border-color:var(--accent);color:var(--accent)' : 'border-color:transparent;color:var(--text-dim)'}">{t.label}</button>
	{/each}
</div>

<!-- TAB STOK -->
{#if tab === 'stok'}
<div class="flex flex-col gap-3">
	<div class="flex items-center gap-3">
		<input type="search" placeholder="Filter nama..." bind:value={query} class="px-3 py-1 rounded border text-sm max-w-xs outline-none" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
		<span class="text-xs" style="color:var(--text-dim)">{stokList.length} barang aktif</span>
	</div>
	<div class="rounded border overflow-x-auto" style="border-color:var(--border)">
		<table class="w-full text-sm">
			<thead><tr style="background:var(--surface2);color:var(--text-dim)">
				<th class="text-left px-3 py-2 font-medium">Kode</th>
				<th class="text-left px-3 py-2 font-medium">Nama</th>
				<th class="text-left px-3 py-2 font-medium">Kategori</th>
				<th class="text-left px-3 py-2 font-medium">Rak</th>
				<th class="text-right px-3 py-2 font-medium">Stok</th>
				<th class="text-right px-3 py-2 font-medium">Min</th>
				<th class="text-left px-3 py-2 font-medium">Status</th>
				<th class="px-3 py-2"></th>
			</tr></thead>
			<tbody>
				{#if loading}
					<tr><td colspan="8" class="px-3 py-4 text-center" style="color:var(--text-dim)">Memuat...</td></tr>
				{:else}
					{#each stokList.filter((s) => !query || s.nama_barang.toLowerCase().includes(query.toLowerCase()) || s.kode_barang.includes(query)) as item}
						{@const st = statusStok(item)}
						<tr class="border-t" style="border-color:var(--border)">
							<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.kode_barang}</td>
							<td class="px-3 py-2">{item.nama_barang}</td>
							<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.nama_kategori ?? '-'}</td>
							<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.lokasi_rak ?? '-'}</td>
							<td class="px-3 py-2 text-right font-bold" style="color:{st.color}">{item.stok_sekarang} {item.singkatan_satuan ?? ''}</td>
							<td class="px-3 py-2 text-right text-xs" style="color:var(--text-dim)">{item.stok_minimum}</td>
							<td class="px-3 py-2"><span class="text-xs font-bold" style="color:{st.color}">{st.label}</span></td>
							<td class="px-3 py-2 text-right">
								<button onclick={() => muatMutasi(item.id, item.nama_barang)} class="text-xs" style="color:var(--info)">Riwayat</button>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>
{/if}

<!-- TAB TERIMA BARANG -->
{#if tab === 'terima'}
<div class="flex gap-6">
	<div class="flex-1 flex flex-col gap-4">
		<h3 class="font-bold text-sm">Form Penerimaan Barang</h3>
		{#if error}<p class="text-xs p-2 rounded" style="background:var(--surface);color:var(--danger)">{error}</p>{/if}
		<div class="grid grid-cols-3 gap-3 text-sm">
			<div class="flex flex-col gap-1">
				<label for="bm-sup" class="text-xs" style="color:var(--text-dim)">SUPPLIER *</label>
				<select id="bm-sup" bind:value={bmSupplier} class="px-2 py-1.5 rounded border outline-none" style="background:var(--surface);border-color:var(--border);color:var(--text)">
					<option value="">— pilih —</option>
					{#each supplierList as s}<option value={s.id}>{s.nama_supplier}</option>{/each}
				</select>
			</div>
			<div class="flex flex-col gap-1">
				<label for="bm-faktur" class="text-xs" style="color:var(--text-dim)">NO FAKTUR</label>
				<input id="bm-faktur" bind:value={bmNoFaktur} placeholder="opsional" class="px-2 py-1.5 rounded border outline-none text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1">
				<label for="bm-terms" class="text-xs" style="color:var(--text-dim)">TEMPO BAYAR (hari)</label>
				<input id="bm-terms" type="number" min="0" bind:value={bmTerms} placeholder="dari supplier" class="px-2 py-1.5 rounded border outline-none text-sm" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
			</div>
		</div>
		<div class="relative">
			<input type="text" placeholder="Cari / scan barang..." bind:value={bmSearchVal} oninput={() => cariBM(bmSearchVal)} class="w-full px-3 py-1.5 rounded border text-sm outline-none" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
			{#if bmSearchRes.length > 0}
			<div class="absolute z-10 top-full left-0 right-0 mt-1 rounded border shadow-lg" style="background:var(--surface);border-color:var(--border)">
				{#each bmSearchRes.slice(0, 6) as br}
					<button onclick={() => tambahBM(br)} class="w-full text-left px-3 py-2 text-sm border-t flex justify-between" style="border-color:var(--border)">
						<span>{br.kode_barang} — {br.nama_barang}</span>
						<span class="text-xs" style="color:var(--text-dim)">stok {br.stok_sekarang}</span>
					</button>
				{/each}
			</div>
			{/if}
		</div>
		{#if bmItems.length > 0}
		<div class="rounded border overflow-x-auto" style="border-color:var(--border)">
			<table class="w-full text-sm">
				<thead><tr style="background:var(--surface2);color:var(--text-dim)">
					<th class="text-left px-3 py-2 font-medium">Barang</th>
					<th class="text-right px-3 py-2 font-medium w-24">Jumlah</th>
					<th class="text-right px-3 py-2 font-medium w-32">Harga Beli</th>
					<th class="text-left px-3 py-2 font-medium w-32">Exp</th>
					<th class="px-2 py-2 w-8"></th>
				</tr></thead>
				<tbody>
					{#each bmItems as item, idx}
					<tr class="border-t" style="border-color:var(--border)">
						<td class="px-3 py-2"><div>{item.nama_barang}</div><div class="text-xs" style="color:var(--text-dim)">{item.kode}</div></td>
						<td class="px-2 py-1 text-right"><input type="number" min="0.01" step="0.01" bind:value={item.jumlah} class="w-20 text-right px-2 py-0.5 rounded border text-sm outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" /></td>
						<td class="px-2 py-1 text-right"><input type="number" min="0" bind:value={item.harga} class="w-28 text-right px-2 py-0.5 rounded border text-sm outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" /></td>
						<td class="px-2 py-1"><input type="date" bind:value={item.exp} class="px-2 py-0.5 rounded border text-xs outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" /></td>
						<td class="px-2 text-center"><button onclick={() => bmItems = bmItems.filter((_, i) => i !== idx)} class="text-xs" style="color:var(--danger)">✕</button></td>
					</tr>
					{/each}
					<tr class="border-t font-bold" style="border-color:var(--border);background:var(--surface2)">
						<td colspan="2" class="px-3 py-2 text-right text-xs" style="color:var(--text-dim)">TOTAL</td>
						<td class="px-3 py-2 text-right">{rupiah(bmItems.reduce((s, i) => s + Number(i.jumlah) * Number(i.harga), 0))}</td>
						<td colspan="2"></td>
					</tr>
				</tbody>
			</table>
		</div>
		<button onclick={simpanBM} disabled={bmLoading} class="self-end px-6 py-2 rounded font-bold text-sm disabled:opacity-40" style="background:var(--accent);color:var(--bg)">{bmLoading ? 'Menyimpan...' : 'Simpan & Tambah Stok'}</button>
		{/if}
	</div>
	<div class="w-64 shrink-0">
		<h3 class="font-bold text-sm mb-3">Riwayat Penerimaan</h3>
		<div class="flex flex-col gap-2">
			{#each bmList.slice(0, 10) as bm}
			<div class="rounded border p-3 text-xs" style="background:var(--surface);border-color:var(--border)">
				<div class="font-bold" style="color:var(--accent)">{bm.no_penerimaan}</div>
				<div style="color:var(--text-dim)">{bm.nama_supplier ?? '-'} · {bm.tanggal_terima.slice(0, 10)}</div>
				<div class="mt-1 font-bold">{rupiah(bm.total_nilai)}</div>
			</div>
			{/each}
			{#if bmList.length === 0}<p class="text-xs" style="color:var(--text-dim)">Belum ada penerimaan</p>{/if}
		</div>
	</div>
</div>
{/if}

<!-- TAB PURCHASE ORDER -->
{#if tab === 'po'}
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
{/if}

<!-- TAB STOK OPNAME -->
{#if tab === 'opname'}
<div class="flex flex-col gap-4">

	{#if error}<p class="text-xs p-2 rounded" style="background:var(--surface2);color:var(--danger)">{error}
		<button onclick={() => error = ''} class="float-right" style="background:none;border:none;color:var(--danger);cursor:pointer">✕</button>
	</p>{/if}

	<!-- Tidak ada opname aktif — tombol buat baru + histori -->
	{#if !opnameAktif}
		<div class="flex items-center justify-between">
			<p class="text-sm" style="color:var(--text-dim)">
				{opnameList.filter(o => o.status === 'approved').length} opname selesai
			</p>
			<button onclick={buatOpname} disabled={opnameSaving}
				class="px-3 py-1 rounded text-sm font-bold"
				style="background:var(--accent);color:var(--bg);opacity:{opnameSaving ? .6 : 1}">
				{opnameSaving ? 'Membuat...' : '+ Buat Opname Baru'}
			</button>
		</div>

		{#if opnameList.length > 0}
		<div class="rounded border overflow-x-auto" style="border-color:var(--border)">
			<table class="w-full text-sm">
				<thead><tr style="background:var(--surface2);color:var(--text-dim)">
					<th class="text-left px-3 py-2 font-medium">No Opname</th>
					<th class="text-left px-3 py-2 font-medium">Tanggal Mulai</th>
					<th class="text-left px-3 py-2 font-medium">Selesai</th>
					<th class="text-left px-3 py-2 font-medium">Status</th>
				</tr></thead>
				<tbody>
					{#each opnameList as op}
					<tr class="border-t" style="border-color:var(--border)">
						<td class="px-3 py-2 text-xs font-mono">{op.no_opname}</td>
						<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{op.tanggal_mulai.slice(0,10)}</td>
						<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{op.tanggal_selesai?.slice(0,10) ?? '—'}</td>
						<td class="px-3 py-2">
							<span class="text-xs font-bold uppercase" style="color:{op.status === 'approved' ? 'var(--accent)' : op.status === 'proses' ? 'var(--warn)' : 'var(--text-dim)'}">
								{op.status}
							</span>
						</td>
					</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{/if}

	<!-- Opname sedang berjalan -->
	{:else}
		<!-- Header progress -->
		<div class="rounded border p-3 flex items-center justify-between gap-3" style="border-color:var(--border);background:var(--surface)">
			<div>
				<div class="text-xs font-bold" style="color:var(--text)">{opnameAktif.no_opname}</div>
				<div class="text-xs" style="color:var(--text-dim)">
					Mulai: {opnameAktif.tanggal_mulai.slice(0,16)} &nbsp;|&nbsp;
					{opnameAktif.sudah_dihitung}/{opnameAktif.items.length} item dihitung
				</div>
				<!-- Progress bar -->
				<div class="mt-1 rounded-full overflow-hidden" style="height:4px;background:var(--surface2);width:200px">
					<div style="height:100%;width:{opnameAktif.progress}%;background:var(--accent);transition:width .3s"></div>
				</div>
			</div>
			<div class="flex gap-2">
				{#if opnameAktif.sudah_dihitung === opnameAktif.items.length && opnameAktif.items.length > 0}
					<button onclick={approveOpname} disabled={opnameSaving}
						class="px-3 py-1 rounded text-xs font-bold"
						style="background:var(--accent);color:var(--bg);opacity:{opnameSaving ? .6 : 1}">
						{opnameSaving ? '...' : 'Approve'}
					</button>
				{/if}
				<button onclick={batalOpname} class="px-2 py-1 rounded text-xs border" style="border-color:var(--danger);color:var(--danger)">
					Batal
				</button>
			</div>
		</div>

		<!-- Filter -->
		<input type="text" bind:value={opnameFilter} placeholder="Cari nama/kode barang..."
			class="px-3 py-1.5 rounded border outline-none text-sm w-full"
			style="background:var(--surface2);border-color:var(--border);color:var(--text)" />

		<!-- Tabel input -->
		<div class="rounded border overflow-x-auto" style="border-color:var(--border)">
			<table class="w-full text-xs">
				<thead><tr style="background:var(--surface2);color:var(--text-dim)">
					<th class="text-left px-3 py-2 font-medium">Kode</th>
					<th class="text-left px-3 py-2 font-medium">Nama Barang</th>
					<th class="text-left px-3 py-2 font-medium">Rak</th>
					<th class="text-right px-3 py-2 font-medium">Sistem</th>
					<th class="text-right px-3 py-2 font-medium">Fisik</th>
					<th class="text-right px-3 py-2 font-medium">Selisih</th>
				</tr></thead>
				<tbody>
					{#each opnameAktif.items.filter(i =>
						!opnameFilter || i.nama_barang.toLowerCase().includes(opnameFilter.toLowerCase()) || i.kode_barang.toLowerCase().includes(opnameFilter.toLowerCase())
					) as item}
					<tr class="border-t" style="border-color:var(--border);background:{item.stok_fisik !== null ? 'transparent' : 'rgba(255,179,0,.04)'}">
						<td class="px-3 py-2 font-mono" style="color:var(--text-dim)">{item.kode_barang}</td>
						<td class="px-3 py-2">
							<div>{item.nama_barang}</div>
							{#if item.nama_kategori}<div class="text-xs" style="color:var(--text-dim)">{item.nama_kategori}</div>{/if}
						</td>
						<td class="px-3 py-2" style="color:var(--text-dim)">{item.lokasi_rak ?? '—'}</td>
						<td class="px-3 py-2 text-right font-bold">{item.stok_sistem} {item.singkatan_satuan ?? ''}</td>
						<td class="px-3 py-2 text-right">
							<input
								type="number" min="0"
								value={item.stok_fisik ?? ''}
								onchange={(e) => {
									const v = Number((e.target as HTMLInputElement).value);
									const selisih = v - item.stok_sistem;
									const alasan = selisih !== 0 ? (item.alasan_selisih ?? '') : undefined;
									if (selisih !== 0 && !alasan) {
										const a = prompt(`Selisih ${selisih > 0 ? '+' : ''}${selisih}. Alasan koreksi?`);
										inputFisik(item.id, v, a ?? '');
									} else {
										inputFisik(item.id, v, alasan);
									}
								}}
								class="w-20 px-2 py-0.5 rounded border outline-none text-right"
								style="background:var(--surface2);border-color:{item.stok_fisik !== null ? 'var(--border)' : 'var(--warn)' };color:var(--text)"
							/>
						</td>
						<td class="px-3 py-2 text-right font-bold" style="color:{item.selisih === null ? 'var(--text-dim)' : item.selisih === 0 ? 'var(--accent)' : item.selisih! > 0 ? 'var(--info)' : 'var(--danger)'}">
							{#if item.selisih !== null}
								{item.selisih > 0 ? '+' : ''}{item.selisih}
							{:else}—{/if}
						</td>
					</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
{/if}

<!-- TAB MASTER BARANG -->
{#if tab === 'barang'}
<div class="flex flex-col gap-3">
	<div class="flex items-center gap-3">
		<input type="search" placeholder="Cari..." bind:value={query} oninput={() => muatBarang(query)} class="px-3 py-1 rounded border text-sm flex-1 max-w-xs outline-none" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
		<button onclick={() => bukaFormBarang()} class="px-3 py-1 rounded text-sm font-bold" style="background:var(--accent);color:var(--bg)">+ Tambah</button>
	</div>
	<div class="rounded border overflow-x-auto" style="border-color:var(--border)">
		<table class="w-full text-sm">
			<thead><tr style="background:var(--surface2);color:var(--text-dim)">
				<th class="text-left px-3 py-2 font-medium">Kode</th>
				<th class="text-left px-3 py-2 font-medium">Nama</th>
				<th class="text-left px-3 py-2 font-medium">Kategori</th>
				<th class="text-right px-3 py-2 font-medium">Stok</th>
				<th class="text-left px-3 py-2 font-medium">Status</th>
				<th class="text-right px-3 py-2 font-medium">Harga Jual</th>
				<th class="px-3 py-2"></th>
			</tr></thead>
			<tbody>
				{#if loading}<tr><td colspan="7" class="px-3 py-4 text-center" style="color:var(--text-dim)">Memuat...</td></tr>
				{:else if barangList.length === 0}<tr><td colspan="7" class="px-3 py-4 text-center" style="color:var(--text-dim)">Tidak ada data</td></tr>
				{:else}
					{#each barangList as item}
						{@const st = statusStok(item)}
						<tr class="border-t" style="border-color:var(--border)">
							<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.kode_barang}</td>
							<td class="px-3 py-2">{item.nama_barang}</td>
							<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">{item.nama_kategori ?? '-'}</td>
							<td class="px-3 py-2 text-right">{item.stok_sekarang} {item.singkatan_satuan ?? ''}</td>
							<td class="px-3 py-2"><span class="text-xs font-bold" style="color:{st.color}">{st.label}</span></td>
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
</div>
{/if}

<!-- TAB SUPPLIER -->
{#if tab === 'supplier'}
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
{/if}

<!-- MODAL: Riwayat Mutasi -->
<Modal bind:open={showMutasi} title="Riwayat Mutasi — {mutasiNama}">
	{#snippet children()}
	<div class="max-h-80 overflow-y-auto">
		{#if mutasiList.length === 0}
			<p class="text-sm text-center py-4" style="color:var(--text-dim)">Belum ada mutasi</p>
		{:else}
			<table class="w-full text-xs">
				<thead><tr style="color:var(--text-dim)">
					<th class="text-left py-1 font-medium">Tanggal</th>
					<th class="text-left py-1 font-medium">Jenis</th>
					<th class="text-right py-1 font-medium">Δ</th>
					<th class="text-right py-1 font-medium">Sesudah</th>
				</tr></thead>
				<tbody>
					{#each mutasiList as m}
					<tr class="border-t" style="border-color:var(--border)">
						<td class="py-1.5" style="color:var(--text-dim)">{m.tanggal.slice(0, 16)}</td>
						<td class="py-1.5">{m.jenis}</td>
						<td class="py-1.5 text-right font-bold" style="color:{m.jumlah_perubahan >= 0 ? 'var(--accent)' : 'var(--danger)'}">{m.jumlah_perubahan >= 0 ? '+' : ''}{m.jumlah_perubahan}</td>
						<td class="py-1.5 text-right">{m.jumlah_sesudah}</td>
					</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
	{/snippet}
</Modal>

<!-- MODAL: Detail PO -->
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

<!-- MODAL: Form Barang -->
<Modal bind:open={modalBarang} title={editBarang?.id ? 'Edit Barang' : 'Tambah Barang'}>
	{#snippet children()}
	<form onsubmit={(e) => { e.preventDefault(); simpanBarang(); }} class="flex flex-col gap-3 text-sm">
		{#if error}<p class="text-xs p-2 rounded" style="background:var(--surface2);color:var(--danger)">{error}</p>{/if}
		<div class="grid grid-cols-2 gap-3">
			<div class="flex flex-col gap-1"><label for="fb-kode" class="text-xs" style="color:var(--text-dim)">KODE *</label><input id="fb-kode" bind:value={fb.kode_barang} required class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" /></div>
			<div class="flex flex-col gap-1"><label for="fb-nama" class="text-xs" style="color:var(--text-dim)">NAMA *</label><input id="fb-nama" bind:value={fb.nama_barang} required class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" /></div>
			<div class="flex flex-col gap-1"><label for="fb-hb" class="text-xs" style="color:var(--text-dim)">HARGA BELI</label><input id="fb-hb" type="number" min="0" bind:value={fb.harga_beli_terakhir} class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" /></div>
			<div class="flex flex-col gap-1"><label for="fb-he" class="text-xs" style="color:var(--text-dim)">HARGA ECERAN</label><input id="fb-he" type="number" min="0" bind:value={fb.harga_jual_eceran} class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" /></div>
			<div class="flex flex-col gap-1"><label for="fb-hg" class="text-xs" style="color:var(--text-dim)">HARGA GROSIR</label><input id="fb-hg" type="number" min="0" bind:value={fb.harga_jual_grosir} class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" /></div>
			<div class="flex flex-col gap-1"><label for="fb-min" class="text-xs" style="color:var(--text-dim)">STOK MINIMUM</label><input id="fb-min" type="number" min="0" bind:value={fb.stok_minimum} class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" /></div>
			<div class="flex flex-col gap-1"><label for="fb-kat" class="text-xs" style="color:var(--text-dim)">KATEGORI</label><select id="fb-kat" bind:value={fb.kategori_id} class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)"><option value="">— pilih —</option>{#each kategoriList as k}<option value={k.id}>{k.nama}</option>{/each}</select></div>
			<div class="flex flex-col gap-1"><label for="fb-sat" class="text-xs" style="color:var(--text-dim)">SATUAN</label><select id="fb-sat" bind:value={fb.satuan_dasar_id} class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)"><option value="">— pilih —</option>{#each satuanList as s}<option value={s.id}>{s.nama}</option>{/each}</select></div>
			<div class="flex flex-col gap-1 col-span-2"><label for="fb-rak" class="text-xs" style="color:var(--text-dim)">LOKASI RAK</label><input id="fb-rak" bind:value={fb.lokasi_rak} class="px-2 py-1 rounded border outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" /></div>
		</div>
		<div class="flex justify-end gap-2">
			<button type="button" onclick={() => modalBarang = false} class="px-3 py-1 rounded text-sm" style="color:var(--text-dim)">Batal</button>
			<button type="submit" class="px-3 py-1 rounded text-sm font-bold" style="background:var(--accent);color:var(--bg)">Simpan</button>
		</div>
	</form>
	{/snippet}
</Modal>

<!-- MODAL: Form Supplier -->
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
