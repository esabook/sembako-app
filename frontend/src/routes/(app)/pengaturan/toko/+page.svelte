<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { withLoading } from '$lib/utils/async.js';
	import { toast } from '$lib/stores/ui.store.js';
	import { user } from '$lib/stores/auth.js';
	import { invalidateCabangList } from '$lib/stores/cabang-version.js';

	// Mode SaaS: 1 email = 1 toko → halaman fokus kelola CABANG toko sendiri.
	const saas = $derived($user?.saas ?? false);
	const tenantId = $derived($user?.tenant_id ?? 0);
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import SectionCard from '$lib/components/layout/SectionCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import SlideOver from '$lib/components/SlideOver.svelte';

	type Toko = {
		id: number;
		kode_toko: string;
		nama: string;
		alamat: string | null;
		is_active: boolean;
	};
	type Cabang = {
		id: number;
		toko_id: number;
		kode_cabang: string;
		nama: string;
		alamat: string | null;
		is_active: boolean;
	};

	let tokoList = $state<Toko[]>([]);
	let cabangByToko = $state<Record<number, Cabang[]>>({});
	let expandedToko = $state<number | null>(null);

	// ── SlideOver form ─────────────────────────────────────────────────────────
	type SlideMode = null | 'tambahToko' | 'editToko' | 'tambahCabang' | 'editCabang';
	let slide = $state<SlideMode>(null);
	let slideTokoId = $state<number | null>(null); // konteks cabang
	let slideEditId = $state<number | null>(null); // id toko/cabang yang diedit

	let formToko = $state({ kode_toko: '', nama: '', alamat: '' });
	let formCabang = $state({ kode_cabang: '', nama: '', alamat: '' });

	const slideTitle = $derived(
		{
			tambahToko: 'Tambah Toko',
			editToko: 'Edit Toko',
			tambahCabang: 'Tambah Cabang',
			editCabang: 'Edit Cabang'
		}[slide ?? 'tambahToko'] ?? ''
	);
	function closeSlide() {
		slide = null;
	}

	// ── Konfirmasi soft-delete (nonaktifkan) ─────────────────────────────────────
	let konfirmBuka = $state(false);
	let konfirmJudul = $state('');
	let konfirmPesan = $state('');
	let konfirmAksi = $state<(() => void) | null>(null);

	function mintaKonfirmasi(judul: string, pesan: string, aksi: () => void) {
		konfirmJudul = judul;
		konfirmPesan = pesan;
		konfirmAksi = aksi;
		konfirmBuka = true;
	}

	async function loadToko() {
		const res = await api.get<Toko[]>('/toko');
		if (res.success) tokoList = res.data;
	}

	async function loadCabang(tokoId: number) {
		const res = await api.get<Cabang[]>(`/toko/${tokoId}/cabang`);
		if (res.success) cabangByToko[tokoId] = res.data;
	}

	async function toggleToko(tokoId: number) {
		if (expandedToko === tokoId) {
			expandedToko = null;
		} else {
			expandedToko = tokoId;
			if (!cabangByToko[tokoId]) await loadCabang(tokoId);
		}
	}

	// ── Toko ─────────────────────────────────────────────────────────────────────
	function openTambahToko() {
		formToko = { kode_toko: '', nama: '', alamat: '' };
		slide = 'tambahToko';
	}

	function openEditToko(t: Toko) {
		slideEditId = t.id;
		formToko = { kode_toko: t.kode_toko, nama: t.nama, alamat: t.alamat ?? '' };
		slide = 'editToko';
	}

	async function tambahToko() {
		if (!formToko.kode_toko || !formToko.nama) return toast.error('Kode dan nama wajib');
		await withLoading(
			async () => {
				const res = await api.post<Toko>('/toko', formToko);
				if (res.success) {
					tokoList = [...tokoList, res.data];
					closeSlide();
					invalidateCabangList();
					toast.sukses('Toko ditambahkan');
				}
			},
			{ loadingKey: 'tambah-toko', modul: 'toko', aksi: 'tambah' }
		);
	}

	async function simpanEditToko() {
		if (!formToko.nama) return toast.error('Nama wajib');
		await withLoading(
			async () => {
				const res = await api.put<Toko>(`/toko/${slideEditId}`, {
					nama: formToko.nama,
					alamat: formToko.alamat
				});
				if (res.success) {
					tokoList = tokoList.map((x) => (x.id === slideEditId ? res.data : x));
					closeSlide();
					invalidateCabangList();
					toast.sukses('Toko diperbarui');
				}
			},
			{ loadingKey: 'edit-toko', modul: 'toko', aksi: 'edit' }
		);
	}

	async function setAktifToko(t: Toko, aktif: boolean) {
		await withLoading(
			async () => {
				const res = await api.put<Toko>(`/toko/${t.id}`, { is_active: aktif });
				if (res.success) {
					tokoList = tokoList.map((x) => (x.id === t.id ? res.data : x));
					invalidateCabangList();
					toast.sukses(res.data.is_active ? 'Toko diaktifkan' : 'Toko dinonaktifkan');
				}
			},
			{ loadingKey: 'toggle-toko', modul: 'toko', aksi: 'toggle' }
		);
	}

	function hapusToko(t: Toko) {
		mintaKonfirmasi(
			'Nonaktifkan toko?',
			`Toko "${t.nama}" akan dinonaktifkan. Data lama (transaksi, stok) tetap tersimpan dan bisa diaktifkan lagi.`,
			() => setAktifToko(t, false)
		);
	}

	// ── Cabang ─────────────────────────────────────────────────────────────────────
	function openTambahCabang(tokoId: number) {
		slideTokoId = tokoId;
		formCabang = { kode_cabang: '', nama: '', alamat: '' };
		slide = 'tambahCabang';
	}

	function openEditCabang(tokoId: number, c: Cabang) {
		slideTokoId = tokoId;
		slideEditId = c.id;
		formCabang = { kode_cabang: c.kode_cabang, nama: c.nama, alamat: c.alamat ?? '' };
		slide = 'editCabang';
	}

	async function tambahCabang() {
		if (slideTokoId === null) return;
		if (!formCabang.kode_cabang || !formCabang.nama) return toast.error('Kode dan nama wajib');
		const tokoId = slideTokoId;
		await withLoading(
			async () => {
				const res = await api.post<Cabang>(`/toko/${tokoId}/cabang`, formCabang);
				if (res.success) {
					cabangByToko[tokoId] = [...(cabangByToko[tokoId] ?? []), res.data];
					closeSlide();
					invalidateCabangList();
					toast.sukses('Cabang ditambahkan');
				}
			},
			{ loadingKey: 'tambah-cabang', modul: 'cabang', aksi: 'tambah' }
		);
	}

	async function simpanEditCabang() {
		if (slideTokoId === null) return;
		if (!formCabang.nama) return toast.error('Nama wajib');
		const tokoId = slideTokoId;
		const id = slideEditId;
		await withLoading(
			async () => {
				const res = await api.put<Cabang>(`/toko/${tokoId}/cabang/${id}`, {
					nama: formCabang.nama,
					alamat: formCabang.alamat
				});
				if (res.success) {
					cabangByToko[tokoId] = cabangByToko[tokoId].map((x) => (x.id === id ? res.data : x));
					closeSlide();
					invalidateCabangList();
					toast.sukses('Cabang diperbarui');
				}
			},
			{ loadingKey: 'edit-cabang', modul: 'cabang', aksi: 'edit' }
		);
	}

	async function setAktifCabang(tokoId: number, c: Cabang, aktif: boolean) {
		await withLoading(
			async () => {
				const res = await api.put<Cabang>(`/toko/${tokoId}/cabang/${c.id}`, { is_active: aktif });
				if (res.success) {
					cabangByToko[tokoId] = cabangByToko[tokoId].map((x) => (x.id === c.id ? res.data : x));
					invalidateCabangList();
					toast.sukses(res.data.is_active ? 'Cabang diaktifkan' : 'Cabang dinonaktifkan');
				}
			},
			{ loadingKey: 'toggle-cabang', modul: 'cabang', aksi: 'toggle' }
		);
	}

	function hapusCabang(tokoId: number, c: Cabang) {
		mintaKonfirmasi(
			'Nonaktifkan cabang?',
			`Cabang "${c.nama}" akan dinonaktifkan. Bisa diaktifkan lagi kapan saja.`,
			() => setAktifCabang(tokoId, c, false)
		);
	}

	$effect(() => {
		if (saas && tenantId) loadCabang(tenantId);
		else if (!saas) loadToko();
	});
</script>

<PageHeader judul={saas ? 'Manajemen Cabang' : 'Manajemen Toko & Cabang'} />

{#if saas}
	<div class="mx-auto max-w-2xl space-y-4">
		<SectionCard judul="Daftar Cabang">
			<div class="mb-2 flex justify-end">
				<Button size="xs" onclick={() => openTambahCabang(tenantId)}>+ Tambah Cabang</Button>
			</div>
			{#each cabangByToko[tenantId] ?? [] as c (c.id)}
				<div class="flex items-center gap-2 border-b py-2 text-sm last:border-0" style="border-color:var(--border)">
					<span class:opacity-40={!c.is_active} class="flex-1">
						<span class="font-mono text-xs" style="color:var(--text-dim)">[{c.kode_cabang}]</span>
						{c.nama}
						{#if c.alamat}<span class="text-xs" style="color:var(--text-dim)">· {c.alamat}</span>{/if}
					</span>
					{#if c.is_active}
						<Button variant="ghost" size="xs" onclick={() => openEditCabang(tenantId, c)}>Edit</Button>
						<Button variant="danger" size="xs" onclick={() => hapusCabang(tenantId, c)}>Nonaktifkan</Button>
					{:else}
						<Button variant="ghost" size="xs" onclick={() => setAktifCabang(tenantId, c, true)}>Aktifkan</Button>
					{/if}
				</div>
			{/each}
			{#if (cabangByToko[tenantId] ?? []).length === 0}
				<p class="text-sm" style="color:var(--text-dim)">Belum ada cabang</p>
			{/if}
		</SectionCard>
	</div>
{:else}
<div class="mx-auto max-w-2xl space-y-4">
	<SectionCard judul="Daftar Toko">
		<div class="mb-2 flex justify-end">
			<Button size="xs" onclick={openTambahToko}>+ Tambah Toko</Button>
		</div>

		{#each tokoList as t (t.id)}
			<div class="border-b py-2 last:border-0" style="border-color:var(--border)">
				<div class="flex items-center gap-2">
					<button
						class="flex-1 text-left text-sm font-medium"
						class:opacity-40={!t.is_active}
						onclick={() => toggleToko(t.id)}
					>
						<span class="font-mono text-xs" style="color:var(--text-dim)">[{t.kode_toko}]</span>
						{t.nama}
						{#if t.alamat}<span class="text-xs" style="color:var(--text-dim)">· {t.alamat}</span
							>{/if}
					</button>
					{#if t.is_active}
						<Button variant="ghost" size="xs" onclick={() => openEditToko(t)}>Edit</Button>
						<Button variant="danger" size="xs" onclick={() => hapusToko(t)}>Nonaktifkan</Button>
					{:else}
						<Button variant="ghost" size="xs" onclick={() => setAktifToko(t, true)}>Aktifkan</Button>
					{/if}
					<Button variant="dim" size="xs" onclick={() => toggleToko(t.id)}>
						{expandedToko === t.id ? '▲ Cabang' : '▼ Cabang'}
					</Button>
				</div>

				{#if expandedToko === t.id}
					<div class="mt-2 ml-4 space-y-1">
						{#each cabangByToko[t.id] ?? [] as c (c.id)}
							<div class="flex items-center gap-2 text-sm">
								<span class:opacity-40={!c.is_active} class="flex-1">
									<span class="font-mono text-xs" style="color:var(--text-dim)"
										>[{c.kode_cabang}]</span
									>
									{c.nama}
									{#if c.alamat}<span class="text-xs" style="color:var(--text-dim)">· {c.alamat}</span
										>{/if}
								</span>
								{#if c.is_active}
									<Button variant="ghost" size="xs" onclick={() => openEditCabang(t.id, c)}>
										Edit
									</Button>
									<Button variant="danger" size="xs" onclick={() => hapusCabang(t.id, c)}>
										Nonaktifkan
									</Button>
								{:else}
									<Button variant="ghost" size="xs" onclick={() => setAktifCabang(t.id, c, true)}>
										Aktifkan
									</Button>
								{/if}
							</div>
						{/each}

						<button
							class="mt-1 text-xs"
							style="color:var(--accent)"
							onclick={() => openTambahCabang(t.id)}
						>
							+ Tambah Cabang
						</button>
					</div>
				{/if}
			</div>
		{/each}
		{#if tokoList.length === 0}
			<p class="text-sm" style="color:var(--text-dim)">Belum ada toko</p>
		{/if}
	</SectionCard>
</div>
{/if}

<SlideOver bind:open={() => slide !== null, (v) => { if (!v) slide = null; }} title={slideTitle}>
	{#if slide === 'tambahToko' || slide === 'editToko'}
		<div class="flex flex-col gap-3 p-4">
			<Input
				placeholder="Kode (mis. TOKO-2)"
				bind:value={formToko.kode_toko}
				disabled={slide === 'editToko'}
			/>
			<Input placeholder="Nama toko" bind:value={formToko.nama} />
			<Input placeholder="Alamat (opsional)" bind:value={formToko.alamat} />
			<div class="flex gap-2">
				{#if slide === 'tambahToko'}
					<Button onclick={tambahToko}>+ Tambah Toko</Button>
				{:else}
					<Button onclick={simpanEditToko}>Simpan</Button>
				{/if}
				<Button variant="ghost" onclick={closeSlide}>Batal</Button>
			</div>
		</div>
	{:else if slide === 'tambahCabang' || slide === 'editCabang'}
		<div class="flex flex-col gap-3 p-4">
			<Input
				placeholder="Kode (mis. CAB-02)"
				bind:value={formCabang.kode_cabang}
				disabled={slide === 'editCabang'}
			/>
			<Input placeholder="Nama cabang" bind:value={formCabang.nama} />
			<Input placeholder="Alamat (opsional)" bind:value={formCabang.alamat} />
			<div class="flex gap-2">
				{#if slide === 'tambahCabang'}
					<Button onclick={tambahCabang}>+ Tambah Cabang</Button>
				{:else}
					<Button onclick={simpanEditCabang}>Simpan</Button>
				{/if}
				<Button variant="ghost" onclick={closeSlide}>Batal</Button>
			</div>
		</div>
	{/if}
</SlideOver>

<ConfirmDialog
	bind:open={konfirmBuka}
	judul={konfirmJudul}
	pesan={konfirmPesan}
	labelKiri="Batal"
	labelKanan="Nonaktifkan"
	warnaKanan="var(--danger)"
	onkanan={() => konfirmAksi?.()}
/>
