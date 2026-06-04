<svelte:head><title>Promo — Stokasir</title></svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import SlideOver from '$lib/components/SlideOver.svelte';
	import DataTable, { type Column } from '$lib/components/DataTable.svelte';

	type PromoTarget = { id?: number; target_tipe: 'barang' | 'kategori'; target_id: number; nama?: string };
	type Promo = {
		id: number; nama: string; deskripsi: string | null;
		tipe: 'item' | 'kategori' | 'total';
		nilai: number; tipe_nilai: 'persen' | 'rupiah';
		min_qty: number; min_total: number;
		berlaku_mulai: string | null; berlaku_sampai: string | null;
		max_penggunaan: number | null; jumlah_dipakai: number;
		aktif: boolean;
		targets: { target_tipe: 'barang' | 'kategori'; target_id: number }[];
	};
	type BarangOption = { id: number; kode_barang: string; nama_barang: string; kategori_id: number | null };
	type KategoriOption = { id: number; nama: string };

	const PROMO_COLUMNS: Column[] = [
		{ key: 'nama', label: 'Nama', sortable: true, minWidth: 130 },
		{ key: 'tipe', label: 'Tipe', sortable: true, priority: 2, minWidth: 90 },
		{ key: 'nilai', label: 'Diskon', align: 'right', sortable: true, priority: 2, minWidth: 80 },
		{ key: 'targets', label: 'Target', sortable: false, priority: 3 },
		{ key: 'berlaku_mulai', label: 'Berlaku', sortable: true, priority: 3 },
		{ key: 'aktif_status', label: 'Status', align: 'center', sortable: false },
		{ key: 'aksi', label: '', align: 'right', sortable: false, hideable: false, minWidth: 80 },
	]

	let pSortKey = $state('')
	let pSortDir = $state<'asc' | 'desc'>('asc')
	let sortedPromo = $derived.by(() => {
		if (!pSortKey) return promoList
		const list = [...promoList]
		list.sort((a, b) => {
			const av = a[pSortKey as keyof Promo]
			const bv = b[pSortKey as keyof Promo]
			if (av == null) return 1
			if (bv == null) return -1
			const cmp = typeof av === 'number' && typeof bv === 'number'
				? av - bv
				: String(av).localeCompare(String(bv), 'id')
			return pSortDir === 'asc' ? cmp : -cmp
		})
		return list
	})

	let promoList = $state<Promo[]>([]);
	let barangList = $state<BarangOption[]>([]);
	let kategoriList = $state<KategoriOption[]>([]);
	let loading = $state(false);
	let modalOpen = $state(false);
	let editPromo = $state<Promo | null>(null);
	let error = $state('');
	let saving = $state(false);

	// form fields
	let fb = $state({
		nama: '', deskripsi: '',
		tipe: 'item' as 'item' | 'kategori' | 'total',
		nilai: '', tipe_nilai: 'persen' as 'persen' | 'rupiah',
		min_qty: '1', min_total: '0',
		berlaku_mulai: '', berlaku_sampai: '',
		max_penggunaan: '',
	});
	let fbTargets = $state<PromoTarget[]>([]);
	let targetQuery = $state('');

	// target search
	let filteredBarang = $derived(
		targetQuery.length >= 2
			? barangList.filter((b) =>
				b.nama_barang.toLowerCase().includes(targetQuery.toLowerCase()) ||
				b.kode_barang.toLowerCase().includes(targetQuery.toLowerCase())
			).slice(0, 8)
			: []
	);
	let filteredKategori = $derived(
		fb.tipe === 'kategori' && targetQuery.length >= 1
			? kategoriList.filter((k) => k.nama.toLowerCase().includes(targetQuery.toLowerCase()))
			: []
	);

	function rupiah(n: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
	}

	function badgeTipe(tipe: string) {
		if (tipe === 'item') return { label: 'Per Barang', color: 'var(--info)' };
		if (tipe === 'kategori') return { label: 'Per Kategori', color: 'var(--warn)' };
		return { label: 'Min. Total', color: 'var(--accent)' };
	}

	function tglStr(s: string | null) {
		if (!s) return '—';
		return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function isAktifHariIni(p: Promo): boolean {
		if (!p.aktif) return false;
		const hari = new Date().toISOString().slice(0, 10);
		if (p.berlaku_mulai && p.berlaku_mulai > hari) return false;
		if (p.berlaku_sampai && p.berlaku_sampai < hari) return false;
		if (p.max_penggunaan !== null && p.jumlah_dipakai >= p.max_penggunaan) return false;
		return true;
	}

	async function muatPromo() {
		loading = true;
		const r = await api.get<Promo[]>('/promo');
		if (r.success) promoList = r.data;
		loading = false;
	}

	async function muatMeta() {
		const [br, kat] = await Promise.all([
			api.get<BarangOption[]>('/barang'),
			api.get<KategoriOption[]>('/barang/kategori'),
		]);
		if (br.success) barangList = br.data;
		if (kat.success) kategoriList = kat.data;
	}

	function bukaForm(p?: Promo) {
		editPromo = p ?? null;
		error = '';
		targetQuery = '';
		if (p) {
			fb = {
				nama: p.nama, deskripsi: p.deskripsi ?? '',
				tipe: p.tipe, nilai: String(p.nilai),
				tipe_nilai: p.tipe_nilai,
				min_qty: String(p.min_qty), min_total: String(p.min_total),
				berlaku_mulai: p.berlaku_mulai ?? '', berlaku_sampai: p.berlaku_sampai ?? '',
				max_penggunaan: p.max_penggunaan !== null ? String(p.max_penggunaan) : '',
			};
			fbTargets = p.targets.map((t) => ({
				target_tipe: t.target_tipe,
				target_id: t.target_id,
				nama: t.target_tipe === 'barang'
					? barangList.find((b) => b.id === t.target_id)?.nama_barang
					: kategoriList.find((k) => k.id === t.target_id)?.nama,
			}));
		} else {
			fb = { nama: '', deskripsi: '', tipe: 'item', nilai: '', tipe_nilai: 'persen',
				min_qty: '1', min_total: '0', berlaku_mulai: '', berlaku_sampai: '', max_penggunaan: '' };
			fbTargets = [];
		}
		modalOpen = true;
	}

	function tambahTarget(tipe: 'barang' | 'kategori', id: number, nama: string) {
		if (fbTargets.some((t) => t.target_tipe === tipe && t.target_id === id)) return;
		fbTargets = [...fbTargets, { target_tipe: tipe, target_id: id, nama }];
		targetQuery = '';
	}

	async function simpan() {
		error = '';
		if (!fb.nama.trim()) { error = 'Nama promo wajib diisi'; return; }
		if (!fb.nilai || Number(fb.nilai) <= 0) { error = 'Nilai diskon harus > 0'; return; }
		if (fb.tipe !== 'total' && fbTargets.length === 0) { error = 'Tambah minimal 1 target (barang/kategori)'; return; }

		saving = true;
		const body = {
			nama: fb.nama.trim(),
			deskripsi: fb.deskripsi || undefined,
			tipe: fb.tipe,
			nilai: Number(fb.nilai),
			tipe_nilai: fb.tipe_nilai,
			min_qty: Number(fb.min_qty) || 1,
			min_total: Number(fb.min_total) || 0,
			berlaku_mulai: fb.berlaku_mulai || undefined,
			berlaku_sampai: fb.berlaku_sampai || undefined,
			max_penggunaan: fb.max_penggunaan ? Number(fb.max_penggunaan) : undefined,
			targets: fb.tipe !== 'total' ? fbTargets.map((t) => ({ target_tipe: t.target_tipe, target_id: t.target_id })) : [],
		};

		const r = editPromo?.id
			? await api.put(`/promo/${editPromo.id}`, body)
			: await api.post('/promo', body);
		saving = false;

		if (!r.success) { error = (r as { success: false; error: string }).error; return; }
		modalOpen = false;
		muatPromo();
	}

	async function toggleAktif(p: Promo) {
		await api.put(`/promo/${p.id}`, { aktif: !p.aktif });
		muatPromo();
	}

	async function hapus(id: number) {
		if (!confirm('Nonaktifkan promo ini?')) return;
		await api.delete(`/promo/${id}`);
		muatPromo();
	}

	onMount(() => { muatPromo(); muatMeta(); });
</script>

<div class="flex flex-col gap-4">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<h2 class="font-bold text-sm">Promo & Diskon</h2>
		<button
			onclick={() => bukaForm()}
			class="px-3 py-1 rounded text-sm font-bold"
			style="background:var(--accent);color:var(--bg)">
			+ Buat Promo
		</button>
		<span class="text-xs ml-auto" style="color:var(--text-dim)">
			{promoList.filter(isAktifHariIni).length} promo aktif hari ini
		</span>
	</div>

	<!-- Tabel promo -->
	<DataTable
		columns={PROMO_COLUMNS}
		bind:sortKey={pSortKey}
		bind:sortDir={pSortDir}
		rowCount={loading ? 1 : sortedPromo.length}
		emptyText="Belum ada promo"
		tableId="promo-list"
		maxRows={12}
	>
		{#snippet body(hidden)}
			{#if loading}
				<tr><td colspan="7" class="px-3 py-6 text-center text-xs" style="color:var(--text-dim)">Memuat...</td></tr>
			{:else}
				{#each sortedPromo as p (p.id)}
					{@const badge = badgeTipe(p.tipe)}
					{@const aktifHariIni = isAktifHariIni(p)}
					<tr class="border-t" style="border-color:var(--border);opacity:{p.aktif ? 1 : 0.5}">
						{#if !hidden.has('nama')}
							<td class="px-3 py-2 text-sm">
								<div class="font-medium">{p.nama}</div>
								{#if p.deskripsi}<div class="text-xs" style="color:var(--text-dim)">{p.deskripsi}</div>{/if}
								{#if p.min_qty > 1 || p.min_total > 0}
									<div class="text-xs" style="color:var(--text-dim)">
										{p.min_qty > 1 ? `min ${p.min_qty} qty` : ''}
										{p.min_total > 0 ? `min total ${rupiah(p.min_total)}` : ''}
									</div>
								{/if}
							</td>
						{/if}
						{#if !hidden.has('tipe')}
							<td class="px-3 py-2">
								<span class="text-xs font-bold" style="color:{badge.color}">{badge.label}</span>
							</td>
						{/if}
						{#if !hidden.has('nilai')}
							<td class="px-3 py-2 text-right text-sm font-mono font-medium" style="color:var(--accent)">
								{p.tipe_nilai === 'persen' ? `${p.nilai}%` : rupiah(p.nilai)}
							</td>
						{/if}
						{#if !hidden.has('targets')}
							<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">
								{#if p.tipe === 'total'}
									<span>Semua belanja</span>
								{:else}
									{p.targets.length} {p.tipe === 'item' ? 'barang' : 'kategori'}
								{/if}
							</td>
						{/if}
						{#if !hidden.has('berlaku_mulai')}
							<td class="px-3 py-2 text-xs" style="color:var(--text-dim)">
								{tglStr(p.berlaku_mulai)} — {tglStr(p.berlaku_sampai)}
								{#if p.max_penggunaan !== null}
									<div>{p.jumlah_dipakai}/{p.max_penggunaan}×</div>
								{/if}
							</td>
						{/if}
						{#if !hidden.has('aktif_status')}
							<td class="px-3 py-2 text-center">
								<button
									onclick={() => toggleAktif(p)}
									class="text-xs px-2 py-0.5 rounded border"
									style="{aktifHariIni
										? 'border-color:var(--accent);color:var(--accent)'
										: 'border-color:var(--border);color:var(--text-dim)'}">
									{aktifHariIni ? 'AKTIF' : p.aktif ? 'belum berlaku' : 'nonaktif'}
								</button>
							</td>
						{/if}
						{#if !hidden.has('aksi')}
							<td class="px-3 py-2 text-right">
								<button onclick={() => bukaForm(p)} class="text-xs mr-2" style="color:var(--info)">Edit</button>
								<button onclick={() => hapus(p.id)} class="text-xs" style="color:var(--danger)">Hapus</button>
							</td>
						{/if}
					</tr>
				{/each}
			{/if}
		{/snippet}
	</DataTable>
</div>

<!-- ── Modal Form Promo ──────────────────────────────────────────────────────── -->
<SlideOver bind:open={modalOpen} title={editPromo ? 'Edit Promo' : 'Buat Promo Baru'}>
	{#snippet children()}
	<form onsubmit={(e) => { e.preventDefault(); simpan(); }} class="flex flex-col gap-3 text-sm">
		{#if error}<p class="text-xs p-2 rounded" style="background:var(--surface2);color:var(--danger)">{error}</p>{/if}

		<div class="grid grid-cols-2 gap-3">
			<!-- Nama -->
			<div class="flex flex-col gap-1 col-span-2">
				<label for="pm-nama" class="text-xs" style="color:var(--text-dim)">NAMA PROMO *</label>
				<input id="pm-nama" bind:value={fb.nama} required class="px-2 py-1.5 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>

			<!-- Deskripsi -->
			<div class="flex flex-col gap-1 col-span-2">
				<label for="pm-desk" class="text-xs" style="color:var(--text-dim)">DESKRIPSI</label>
				<input id="pm-desk" bind:value={fb.deskripsi} placeholder="Opsional"
					class="px-2 py-1.5 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>

			<!-- Tipe -->
			<div class="flex flex-col gap-1 col-span-2">
				<p class="text-xs" style="color:var(--text-dim)">TIPE PROMO</p>
				<div class="flex gap-1">
					{#each (['item', 'kategori', 'total'] as const) as t (t)}
						<button type="button" onclick={() => { fb.tipe = t; fbTargets = []; }}
							class="flex-1 py-1.5 px-2 rounded text-xs border font-bold transition-all"
							style="{fb.tipe === t
								? 'background:var(--accent);color:var(--bg);border-color:var(--accent)'
								: 'border-color:var(--border);color:var(--text-dim)'}">
							{t === 'item' ? 'Barang' : t === 'kategori' ? 'Kategori' : 'Min. Total'}
						</button>
					{/each}
				</div>
				<p class="text-xs" style="color:var(--text-dim)">
					{fb.tipe === 'item' ? 'Diskon untuk barang tertentu'
					: fb.tipe === 'kategori' ? 'Diskon untuk semua barang dalam kategori'
					: 'Diskon jika total belanja mencapai jumlah tertentu'}
				</p>
			</div>

			<!-- Nilai + tipe nilai -->
			<div class="flex flex-col gap-1 col-span-2">
				<p class="text-xs" style="color:var(--text-dim)">NILAI DISKON *</p>
				<div class="flex gap-1">
					<button type="button" onclick={() => fb.tipe_nilai = 'persen'}
						class="px-2 py-1.5 rounded text-xs border"
						style="{fb.tipe_nilai === 'persen'
							? 'background:var(--accent);color:var(--bg);border-color:var(--accent)'
							: 'border-color:var(--border);color:var(--text-dim)'}">%</button>
					<button type="button" onclick={() => fb.tipe_nilai = 'rupiah'}
						class="px-2 py-1.5 rounded text-xs border"
						style="{fb.tipe_nilai === 'rupiah'
							? 'background:var(--accent);color:var(--bg);border-color:var(--accent)'
							: 'border-color:var(--border);color:var(--text-dim)'}">Rp</button>
					<input type="number" min="0" bind:value={fb.nilai} placeholder={fb.tipe_nilai === 'persen' ? '0–100' : '0'}
						class="flex-1 px-2 py-1.5 rounded border outline-none text-right"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
				</div>
			</div>

			<!-- Min qty / min total -->
			{#if fb.tipe !== 'total'}
				<div class="flex flex-col gap-1">
					<label for="pm-minqty" class="text-xs" style="color:var(--text-dim)">MIN. QTY</label>
					<input id="pm-minqty" type="number" min="1" bind:value={fb.min_qty}
						class="px-2 py-1.5 rounded border outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
				</div>
			{:else}
				<div class="flex flex-col gap-1">
					<label for="pm-mintotal" class="text-xs" style="color:var(--text-dim)">MIN. TOTAL (Rp)</label>
					<input id="pm-mintotal" type="number" min="0" step="1000" bind:value={fb.min_total}
						class="px-2 py-1.5 rounded border outline-none"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
				</div>
			{/if}

			<!-- Periode -->
			<div class="flex flex-col gap-1">
				<label for="pm-mulai" class="text-xs" style="color:var(--text-dim)">BERLAKU MULAI</label>
				<input id="pm-mulai" type="date" bind:value={fb.berlaku_mulai}
					class="px-2 py-1.5 rounded border outline-none text-sm"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
			<div class="flex flex-col gap-1">
				<label for="pm-sampai" class="text-xs" style="color:var(--text-dim)">BERLAKU SAMPAI</label>
				<input id="pm-sampai" type="date" bind:value={fb.berlaku_sampai}
					class="px-2 py-1.5 rounded border outline-none text-sm"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>

			<!-- Max penggunaan -->
			<div class="flex flex-col gap-1">
				<label for="pm-maxguna" class="text-xs" style="color:var(--text-dim)">MAKS. PENGGUNAAN</label>
				<input id="pm-maxguna" type="number" min="1" bind:value={fb.max_penggunaan} placeholder="Tidak terbatas"
					class="px-2 py-1.5 rounded border outline-none"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
			</div>
		</div>

		<!-- Target barang / kategori -->
		{#if fb.tipe !== 'total'}
			<div class="flex flex-col gap-2">
				<p class="text-xs" style="color:var(--text-dim)">
					{fb.tipe === 'item' ? 'BARANG TARGET *' : 'KATEGORI TARGET *'}
				</p>

				<!-- Target yang sudah dipilih -->
				{#if fbTargets.length > 0}
					<div class="flex flex-wrap gap-1 mb-1">
						{#each fbTargets as t, i (t.target_id)}
							<span class="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
								style="background:var(--surface2);color:var(--text)">
								{t.nama ?? t.target_id}
								<button type="button" onclick={() => fbTargets = fbTargets.filter((_, j) => j !== i)}
									class="ml-1" style="color:var(--danger)">✕</button>
							</span>
						{/each}
					</div>
				{/if}

				<!-- Search box -->
				<div class="relative">
					<input type="text" placeholder="Cari {fb.tipe === 'item' ? 'nama/kode barang' : 'kategori'}..."
						bind:value={targetQuery}
						class="w-full px-2 py-1.5 rounded border outline-none text-sm"
						style="background:var(--surface2);border-color:var(--border);color:var(--text)" />
					{#if (fb.tipe === 'item' && filteredBarang.length > 0) || (fb.tipe === 'kategori' && filteredKategori.length > 0)}
						<div class="absolute z-10 top-full left-0 right-0 mt-1 rounded border max-h-40 overflow-y-auto shadow-lg"
							style="background:var(--surface);border-color:var(--border)">
							{#if fb.tipe === 'item'}
								{#each filteredBarang as b (b.id)}
									<button type="button"
										onclick={() => tambahTarget('barang', b.id, b.nama_barang)}
										class="w-full text-left px-3 py-2 text-sm border-t hover:opacity-80"
										style="border-color:var(--border)">
										<span class="font-mono text-xs mr-2" style="color:var(--text-dim)">{b.kode_barang}</span>
										{b.nama_barang}
									</button>
								{/each}
							{:else}
								{#each filteredKategori as k (k.id)}
									<button type="button"
										onclick={() => tambahTarget('kategori', k.id, k.nama)}
										class="w-full text-left px-3 py-2 text-sm border-t hover:opacity-80"
										style="border-color:var(--border)">
										{k.nama}
									</button>
								{/each}
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<p class="text-xs p-2 rounded" style="background:var(--surface2);color:var(--text-dim)">
				Promo tipe "Min. Total" berlaku untuk semua barang. Kasir akan mendapat notifikasi saat total belanja memenuhi syarat.
			</p>
		{/if}

		<div class="flex justify-end gap-2 pt-1">
			<button type="button" onclick={() => modalOpen = false}
				class="px-4 py-1.5 rounded text-sm" style="color:var(--text-dim)">Batal</button>
			<button type="submit" disabled={saving}
				class="px-6 py-1.5 rounded text-sm font-bold disabled:opacity-50"
				style="background:var(--accent);color:var(--bg)">
				{saving ? 'Menyimpan...' : 'Simpan'}
			</button>
		</div>
	</form>
	{/snippet}
</SlideOver>
