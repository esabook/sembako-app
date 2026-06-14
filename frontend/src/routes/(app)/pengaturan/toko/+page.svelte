<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { withLoading } from '$lib/utils/async.js';
	import { toast } from '$lib/stores/ui.store.js';
	import { onMount } from 'svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import SectionCard from '$lib/components/layout/SectionCard.svelte';

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

	let formToko = $state({ kode_toko: '', nama: '', alamat: '' });
	let formCabang = $state({ kode_cabang: '', nama: '', alamat: '' });
	let addingCabangForToko = $state<number | null>(null);

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

	async function tambahToko() {
		if (!formToko.kode_toko || !formToko.nama) return toast.error('Kode dan nama wajib');
		await withLoading(
			async () => {
				const res = await api.post<Toko>('/toko', formToko);
				if (res.success) {
					tokoList = [...tokoList, res.data];
					formToko = { kode_toko: '', nama: '', alamat: '' };
					toast.sukses('Toko ditambahkan');
				}
			},
			{ loadingKey: 'tambah-toko', modul: 'toko', aksi: 'tambah' }
		);
	}

	async function toggleAktifToko(t: Toko) {
		await withLoading(
			async () => {
				const res = await api.put<Toko>(`/toko/${t.id}`, { is_active: !t.is_active });
				if (res.success) {
					tokoList = tokoList.map((x) => (x.id === t.id ? res.data : x));
					toast.sukses(res.data.is_active ? 'Toko diaktifkan' : 'Toko dinonaktifkan');
				}
			},
			{ loadingKey: 'toggle-toko', modul: 'toko', aksi: 'toggle' }
		);
	}

	async function tambahCabang(tokoId: number) {
		if (!formCabang.kode_cabang || !formCabang.nama) return toast.error('Kode dan nama wajib');
		await withLoading(
			async () => {
				const res = await api.post<Cabang>(`/toko/${tokoId}/cabang`, formCabang);
				if (res.success) {
					cabangByToko[tokoId] = [...(cabangByToko[tokoId] ?? []), res.data];
					formCabang = { kode_cabang: '', nama: '', alamat: '' };
					addingCabangForToko = null;
					toast.sukses('Cabang ditambahkan');
				}
			},
			{ loadingKey: 'tambah-cabang', modul: 'cabang', aksi: 'tambah' }
		);
	}

	async function toggleAktifCabang(tokoId: number, c: Cabang) {
		await withLoading(
			async () => {
				const res = await api.put<Cabang>(`/toko/${tokoId}/cabang/${c.id}`, {
					is_active: !c.is_active
				});
				if (res.success) {
					cabangByToko[tokoId] = cabangByToko[tokoId].map((x) => (x.id === c.id ? res.data : x));
					toast.sukses(res.data.is_active ? 'Cabang diaktifkan' : 'Cabang dinonaktifkan');
				}
			},
			{ loadingKey: 'toggle-cabang', modul: 'cabang', aksi: 'toggle' }
		);
	}

	onMount(loadToko);
</script>

<PageHeader judul="Manajemen Toko & Cabang" />

<div class="mx-auto max-w-2xl space-y-4">
	<!-- Form tambah toko -->
	<SectionCard judul="Tambah Toko Baru">
		<div class="flex flex-col gap-2">
			<div class="flex gap-2">
				<input
					class="w-full rounded border px-3 py-2 text-sm"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					placeholder="Kode (mis. TOKO-2)"
					bind:value={formToko.kode_toko}
				/>
				<input
					class="w-full rounded border px-3 py-2 text-sm"
					style="background:var(--surface2);border-color:var(--border);color:var(--text)"
					placeholder="Nama toko"
					bind:value={formToko.nama}
				/>
			</div>
			<input
				class="w-full rounded border px-3 py-2 text-sm"
				style="background:var(--surface2);border-color:var(--border);color:var(--text)"
				placeholder="Alamat (opsional)"
				bind:value={formToko.alamat}
			/>
			<button
				class="shrink-0 self-end rounded px-3 py-1 text-sm font-bold"
				style="background:var(--accent);color:var(--bg)"
				onclick={tambahToko}>+ Tambah Toko</button
			>
		</div>
	</SectionCard>

	<!-- Daftar toko -->
	<SectionCard judul="Daftar Toko">
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
						{#if t.alamat}<span class="text-xs" style="color:var(--text-dim)">
								· {t.alamat}</span
							>{/if}
					</button>
					<button
						class="ml-auto rounded border px-2 py-1 text-xs transition-colors"
						style="border-color:var(--border);color:var(--danger)"
						onclick={() => toggleAktifToko(t)}
					>
						{t.is_active ? 'Nonaktifkan' : 'Aktifkan'}
					</button>
					<button
						class="rounded px-2 py-0.5 text-xs"
						style="background:var(--surface-2)"
						onclick={() => toggleToko(t.id)}
					>
						{expandedToko === t.id ? '▲ Cabang' : '▼ Cabang'}
					</button>
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
								</span>
								<button
									class="ml-auto rounded border px-2 py-1 text-xs transition-colors"
									style="border-color:var(--border);color:var(--danger)"
									onclick={() => toggleAktifCabang(t.id, c)}
								>
									{c.is_active ? 'Nonaktifkan' : 'Aktifkan'}
								</button>
							</div>
						{/each}

						{#if addingCabangForToko === t.id}
							<div class="mt-2 flex flex-col gap-1.5">
								<div class="flex gap-2">
									<input
										class="w-full rounded border px-3 py-2 text-sm"
										style="background:var(--surface2);border-color:var(--border);color:var(--text)"
										placeholder="Kode (mis. CAB-02)"
										bind:value={formCabang.kode_cabang}
									/>
									<input
										class="w-full rounded border px-3 py-2 text-sm"
										style="background:var(--surface2);border-color:var(--border);color:var(--text)"
										placeholder="Nama cabang"
										bind:value={formCabang.nama}
									/>
								</div>
								<input
									class="w-full rounded border px-3 py-2 text-sm"
									style="background:var(--surface2);border-color:var(--border);color:var(--text)"
									placeholder="Alamat (opsional)"
									bind:value={formCabang.alamat}
								/>
								<div class="flex gap-2">
									<button class="btn-primary text-xs" onclick={() => tambahCabang(t.id)}
										>Simpan</button
									>
									<button class="btn-ghost text-xs" onclick={() => (addingCabangForToko = null)}
										>Batal</button
									>
								</div>
							</div>
						{:else}
							<button
								class="mt-1 text-xs"
								style="color:var(--accent)"
								onclick={() => {
									addingCabangForToko = t.id;
									formCabang = { kode_cabang: '', nama: '', alamat: '' };
								}}
							>
								+ Tambah Cabang
							</button>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
		{#if tokoList.length === 0}
			<p class="text-sm" style="color:var(--text-dim)">Belum ada toko</p>
		{/if}
	</SectionCard>
</div>
