<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import { user } from '$lib/stores/auth.js';
	import { resizeImage } from '$lib/utils/image.js';
	import { connectScannerSse } from '$lib/utils/scannerSse.js';
	import { imgUrl } from '$lib/utils/upload.js';
	import TabTerimaGuide from './TabTerimaGuide.svelte';
	import { rupiah } from '$lib/utils/format'
	import Button from '$lib/components/ui/Button.svelte';

	type Barang = { id: number; kode_barang: string; nama_barang: string; harga_beli_terakhir: number; stok_sekarang: number; };
	type Supplier = { id: number; nama_supplier: string; is_active: boolean; };
	type BarangMasuk = { id: number; no_penerimaan: string; tanggal_terima: string; nama_supplier: string | null; no_faktur_supplier: string | null; total_nilai: number; foto_faktur_path: string | null; };

	let bmList = $state<BarangMasuk[]>([]);
	let supplierList = $state<Supplier[]>([]);
	let bmSupplier = $state('');
	let bmNoFaktur = $state('');
	let bmTerms = $state('');
	let bmItems = $state<{ barang_id: number; nama_barang: string; kode: string; jumlah: string; harga: string; exp: string }[]>([]);
	let bmSearchVal = $state('');
	let bmSearchRes = $state<Barang[]>([]);
	let bmLoading = $state(false);
	let error = $state('');
	let fotoFakturFile = $state<File | null>(null);
	let fotoFakturPreview = $state('');

	async function handleFotoFakturChange(e: Event) {
		const raw = (e.target as HTMLInputElement).files?.[0] ?? null;
		if (!raw) { fotoFakturFile = null; return; }
		// Invoice: max 1920px, kualitas tinggi agar teks faktur tetap terbaca
		fotoFakturFile = await resizeImage(raw, 1920, 1920, 0.92, 'inside');
		fotoFakturPreview = URL.createObjectURL(fotoFakturFile);
	}

	async function muatBM() { const r = await api.get<BarangMasuk[]>('/barang-masuk'); if (r.success) bmList = r.data; }
	async function muatSupplier() { const r = await api.get<Supplier[]>('/supplier'); if (r.success) supplierList = r.data; }

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

		const savedId = (r as { success: true; data: { id: number } }).data.id;
		if (fotoFakturFile && savedId) {
			const fd = new FormData();
			fd.append('foto', fotoFakturFile);
			await api.upload(`/barang-masuk/${savedId}/foto`, fd);
		}

		bmSupplier = ''; bmNoFaktur = ''; bmTerms = ''; bmItems = [];
		fotoFakturFile = null; fotoFakturPreview = '';
		muatBM();
	}

	onMount(() => {
		muatBM();
		muatSupplier();
		return connectScannerSse(`barang${$user?.id ?? 0}`, (kode) => {
			bmSearchVal = kode;
			cariBM(kode);
		});
	});
</script>

<div class="flex flex-col gap-6 lg:flex-row">
	<div class="flex-1 flex flex-col gap-4">
		<h3 class="font-bold text-sm">Form Penerimaan Barang</h3>
		{#if error}<p class="text-xs p-2 rounded" style="background:var(--surface);color:var(--danger)">{error}</p>{/if}
		<div class="grid grid-cols-3 gap-3 text-sm">
			<div class="flex flex-col gap-1">
				<label for="bm-sup" class="text-xs" style="color:var(--text-dim)">SUPPLIER *</label>
				<select id="bm-sup" bind:value={bmSupplier} class="px-2 py-1.5 rounded border outline-none" style="background:var(--surface);border-color:var(--border);color:var(--text)">
					<option value="">— pilih —</option>
					{#each supplierList as s (s.id)}<option value={s.id}>{s.nama_supplier}</option>{/each}
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
		<!-- Foto faktur -->
		<div class="flex items-center gap-3">
			<div class="flex flex-col gap-1">
				<label for="bm-foto" class="text-xs" style="color:var(--text-dim)">FOTO FAKTUR</label>
				<input id="bm-foto" type="file" accept="image/*" onchange={handleFotoFakturChange} class="text-xs" style="color:var(--text)" />
			</div>
			{#if fotoFakturPreview}
				<img src={fotoFakturPreview} alt="preview faktur"
					class="rounded object-contain mt-4 shrink-0"
					style="height:64px;max-width:100px;border:1px solid var(--border);background:var(--surface2)" />
			{/if}
		</div>
		<div class="relative">
			<input type="text" placeholder="Cari / scan barang..." bind:value={bmSearchVal} oninput={() => cariBM(bmSearchVal)} class="w-full px-3 py-1.5 rounded border text-sm outline-none" style="background:var(--surface);border-color:var(--border);color:var(--text)" />
			{#if bmSearchRes.length > 0}
			<div class="absolute z-10 top-full left-0 right-0 mt-1 rounded border shadow-lg" style="background:var(--surface);border-color:var(--border)">
				{#each bmSearchRes.slice(0, 6) as br (br.id)}
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
					{#each bmItems as item, idx (item.barang_id)}
					<tr class="border-t" style="border-color:var(--border)">
						<td class="px-3 py-2"><div>{item.nama_barang}</div><div class="text-xs" style="color:var(--text-dim)">{item.kode}</div></td>
						<td class="px-2 py-1 text-right"><input type="number" min="0.01" step="0.01" bind:value={item.jumlah} class="w-20 text-right px-2 py-0.5 rounded border text-sm outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" /></td>
						<td class="px-2 py-1 text-right"><input type="number" min="0" bind:value={item.harga} class="w-28 text-right px-2 py-0.5 rounded border text-sm outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" /></td>
						<td class="px-2 py-1"><input type="date" bind:value={item.exp} class="px-2 py-0.5 rounded border text-xs outline-none" style="background:var(--surface2);border-color:var(--border);color:var(--text)" /></td>
						<td class="px-2 text-center"><Button variant="danger" size="xs" onclick={() => bmItems = bmItems.filter((_, i) => i !== idx)}>✕</Button></td>
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
		<div class="self-end"><Button onclick={simpanBM} loading={bmLoading}>Simpan & Tambah Stok</Button></div>
		{/if}
	</div>
	<div class="lg:w-64 lg:shrink-0">
		<h3 class="font-bold text-sm mb-3">Riwayat Penerimaan</h3>
		<div class="flex flex-col gap-2">
			{#each bmList.slice(0, 10) as bm (bm.id)}
			<div class="rounded border p-3 text-xs" style="background:var(--surface);border-color:var(--border)">
				<div class="flex justify-between items-start">
					<div class="font-bold" style="color:var(--accent)">{bm.no_penerimaan}</div>
					{#if bm.foto_faktur_path}
						<a href={imgUrl(bm.foto_faktur_path) ?? '#'} target="_blank" title="Lihat faktur"
							style="color:var(--info)">🧾</a>
					{/if}
				</div>
				<div style="color:var(--text-dim)">{bm.nama_supplier ?? '-'} · {bm.tanggal_terima.slice(0, 10)}</div>
				<div class="mt-1 font-bold">{rupiah(bm.total_nilai)}</div>
			</div>
			{/each}
			{#if bmList.length === 0}<p class="text-xs" style="color:var(--text-dim)">Belum ada penerimaan</p>{/if}
		</div>
	</div>
</div>

<TabTerimaGuide />
