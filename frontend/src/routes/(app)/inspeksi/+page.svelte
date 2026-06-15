<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api.js';
	import SlideOver from '$lib/components/SlideOver.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	type Inspeksi = {
		id: number;
		tanggal: string;
		jenis: string;
		area: string | null;
		temuan: string | null;
		tindakan: string | null;
		nilai: number | null;
		status: string;
		catatan: string | null;
		nama_petugas: string | null;
	};

	const JENIS_LABEL: Record<string, string> = {
		rutin: 'Rutin',
		mendadak: 'Mendadak',
		bulanan: 'Bulanan',
		tahunan: 'Tahunan'
	};
	const JENIS_COLOR: Record<string, string> = {
		rutin: '#3b82f6',
		mendadak: '#ef4444',
		bulanan: '#8b5cf6',
		tahunan: '#10b981'
	};

	function nilaiColor(n: number) {
		if (n >= 80) return '#10b981';
		if (n >= 60) return '#f59e0b';
		return '#ef4444';
	}

	let list = $state<Inspeksi[]>([]);
	let loading = $state(false);
	let filterBulan = $state(new Date().toISOString().slice(0, 7));
	let filterJenis = $state('');
	let filterStatus = $state('');

	let formOpen = $state(false);
	let editRow = $state<Inspeksi | null>(null);
	let fTanggal = $state('');
	let fJenis = $state<string>('rutin');
	let fArea = $state('');
	let fTemuan = $state('');
	let fTindakan = $state('');
	let fNilai = $state<number | ''>('');
	let fStatus = $state('draft');
	let fCatatan = $state('');

	let konfirmHapus = $state<{ buka: boolean; id: number | null }>({ buka: false, id: null });

	async function muat() {
		loading = true;
		try {
			const q = new URLSearchParams();
			if (filterBulan) {
				q.set('dari', `${filterBulan}-01`);
				q.set('sampai', `${filterBulan}-31`);
			}
			if (filterJenis) q.set('jenis', filterJenis);
			if (filterStatus) q.set('status', filterStatus);
			const r = await api.get<Inspeksi[]>(`/inspeksi?${q}`);
			if (r.success) list = r.data;
		} finally {
			loading = false;
		}
	}

	function bukaFormTambah() {
		editRow = null;
		fTanggal = new Date().toLocaleDateString('sv-SE');
		fJenis = 'rutin';
		fArea = '';
		fTemuan = '';
		fTindakan = '';
		fNilai = '';
		fStatus = 'draft';
		fCatatan = '';
		formOpen = true;
	}

	function bukaFormEdit(row: Inspeksi) {
		editRow = row;
		fTanggal = row.tanggal;
		fJenis = row.jenis;
		fArea = row.area ?? '';
		fTemuan = row.temuan ?? '';
		fTindakan = row.tindakan ?? '';
		fNilai = row.nilai ?? '';
		fStatus = row.status;
		fCatatan = row.catatan ?? '';
		formOpen = true;
	}

	async function simpan() {
		if (!fTanggal) return;
		const payload = {
			tanggal: fTanggal,
			jenis: fJenis,
			area: fArea || undefined,
			temuan: fTemuan || undefined,
			tindakan: fTindakan || undefined,
			nilai: fNilai !== '' ? Number(fNilai) : undefined,
			status: fStatus,
			catatan: fCatatan || undefined
		};
		if (editRow) {
			await api.put(`/inspeksi/${editRow.id}`, payload);
		} else {
			await api.post('/inspeksi', payload);
		}
		formOpen = false;
		await muat();
	}

	async function hapus() {
		if (!konfirmHapus.id) return;
		await api.delete(`/inspeksi/${konfirmHapus.id}`);
		konfirmHapus = { buka: false, id: null };
		await muat();
	}

	$effect(() => {
		filterBulan;
		filterJenis;
		filterStatus;
		muat();
	});
	onMount(muat);
</script>

<svelte:head><title>Inspeksi — Stokasir</title></svelte:head>

<div class="space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-base font-bold md:text-lg" style="color:var(--text)">Inspeksi Toko</h1>
		<Button onclick={bukaFormTambah}>+ Catat Inspeksi</Button>
	</div>

	<!-- Filter -->
	<div class="flex flex-wrap gap-2">
		<input
			type="month"
			bind:value={filterBulan}
			class="rounded border px-2 py-1 text-sm"
			style="background:var(--bg);border-color:var(--border);color:var(--text)"
		/>
		<select
			bind:value={filterJenis}
			class="rounded border px-2 py-1 text-sm"
			style="background:var(--bg);border-color:var(--border);color:var(--text)"
		>
			<option value="">Semua Jenis</option>
			{#each Object.entries(JENIS_LABEL) as [k, v] (k)}
				<option value={k}>{v}</option>
			{/each}
		</select>
		<select
			bind:value={filterStatus}
			class="rounded border px-2 py-1 text-sm"
			style="background:var(--bg);border-color:var(--border);color:var(--text)"
		>
			<option value="">Semua Status</option>
			<option value="draft">Draft</option>
			<option value="selesai">Selesai</option>
		</select>
	</div>

	<!-- Rata-rata nilai bulan ini -->
	{#if list.filter((x) => x.nilai !== null).length > 0}
		{@const avg = Math.round(
			list.filter((x) => x.nilai !== null).reduce((s, x) => s + (x.nilai ?? 0), 0) /
				list.filter((x) => x.nilai !== null).length
		)}
		<div
			class="flex items-center gap-3 rounded-lg border p-3"
			style="background:var(--surface);border-color:var(--border)"
		>
			<div class="text-3xl font-bold" style="color:{nilaiColor(avg)}">{avg}</div>
			<div>
				<p class="text-sm font-medium" style="color:var(--text)">Rata-rata Nilai</p>
				<p class="text-xs" style="color:var(--text-dim)">
					{list.filter((x) => x.nilai !== null).length} inspeksi dengan nilai
				</p>
			</div>
		</div>
	{/if}

	{#if loading}
		<div class="flex justify-center py-6"><Spinner /></div>
	{:else if list.length === 0}
		<p class="py-12 text-center text-sm" style="color:var(--text-dim)">
			Belum ada catatan inspeksi.
		</p>
	{:else}
		<div class="overflow-x-auto">
			<table class="min-w-full text-sm">
				<thead>
					<tr style="border-bottom:1px solid var(--border)">
						<th class="px-3 py-2 text-left font-semibold" style="color:var(--text-dim)">Tanggal</th>
						<th class="px-3 py-2 text-left font-semibold" style="color:var(--text-dim)">Jenis</th>
						<th
							class="hidden px-3 py-2 text-left font-semibold sm:table-cell"
							style="color:var(--text-dim)">Area</th
						>
						<th
							class="hidden px-3 py-2 text-left font-semibold md:table-cell"
							style="color:var(--text-dim)">Petugas</th
						>
						<th class="px-3 py-2 text-left font-semibold" style="color:var(--text-dim)">Nilai</th>
						<th class="px-3 py-2 text-left font-semibold" style="color:var(--text-dim)">Status</th>
						<th class="px-3 py-2"></th>
					</tr>
				</thead>
				<tbody>
					{#each list as row (row.id)}
						<tr style="border-bottom:1px solid var(--border)">
							<td class="px-3 py-2" style="color:var(--text)">
								{new Date(row.tanggal).toLocaleDateString('id-ID', {
									day: 'numeric',
									month: 'short'
								})}
							</td>
							<td class="px-3 py-2">
								<span
									class="rounded-full px-2 py-0.5 text-xs font-medium text-white"
									style="background:{JENIS_COLOR[row.jenis]}">{JENIS_LABEL[row.jenis]}</span
								>
							</td>
							<td class="hidden px-3 py-2 sm:table-cell" style="color:var(--text-dim)"
								>{row.area ?? '—'}</td
							>
							<td class="hidden px-3 py-2 md:table-cell" style="color:var(--text-dim)"
								>{row.nama_petugas ?? '—'}</td
							>
							<td class="px-3 py-2">
								{#if row.nilai !== null}
									<span class="text-sm font-bold" style="color:{nilaiColor(row.nilai)}"
										>{row.nilai}</span
									>
								{:else}
									<span style="color:var(--text-dim)">—</span>
								{/if}
							</td>
							<td class="px-3 py-2">
								<span
									class="rounded-full px-2 py-0.5 text-xs font-medium"
									style={row.status === 'selesai'
										? 'background:color-mix(in srgb,var(--accent) 15%,transparent);color:var(--accent)'
										: 'background:color-mix(in srgb,var(--warn) 15%,transparent);color:var(--warn)'}
								>
									{row.status === 'selesai' ? 'Selesai' : 'Draft'}
								</span>
							</td>
							<td class="px-3 py-2">
								<div class="flex justify-end gap-2">
									<Button size="xs" variant="dim" onclick={() => bukaFormEdit(row)}>Edit</Button>
									<Button
										size="xs"
										variant="danger"
										onclick={() => (konfirmHapus = { buka: true, id: row.id })}>Hapus</Button
									>
								</div>
							</td>
						</tr>
						{#if row.temuan || row.tindakan}
							<tr style="border-bottom:1px solid var(--border)">
								<td colspan="7" class="px-3 pb-2">
									{#if row.temuan}
										<p class="text-xs" style="color:var(--text-dim)">
											<strong>Temuan:</strong>
											{row.temuan}
										</p>
									{/if}
									{#if row.tindakan}
										<p class="text-xs" style="color:var(--text-dim)">
											<strong>Tindakan:</strong>
											{row.tindakan}
										</p>
									{/if}
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<SlideOver bind:open={formOpen} title={editRow ? 'Edit Inspeksi' : 'Catat Inspeksi'}>
	{#snippet children()}
		<div class="space-y-4">
			<div>
				<label for="fi-tgl" class="mb-1 block text-sm font-medium" style="color:var(--text-dim)"
					>Tanggal *</label
				>
				<input
					id="fi-tgl"
					bind:value={fTanggal}
					type="date"
					class="w-full rounded border px-3 py-2 text-sm"
					style="background:var(--bg);border-color:var(--border);color:var(--text)"
				/>
			</div>
			<div>
				<p class="mb-2 block text-sm font-medium" style="color:var(--text-dim)">Jenis Inspeksi</p>
				<div class="flex flex-wrap gap-2">
					{#each Object.entries(JENIS_LABEL) as [k, v] (k)}
						<button
							onclick={() => (fJenis = k)}
							class="rounded border px-3 py-1.5 text-sm transition-colors"
							style={fJenis === k
								? `background:${JENIS_COLOR[k]};color:white;border-color:${JENIS_COLOR[k]}`
								: 'background:var(--surface);color:var(--text-dim);border-color:var(--border)'}
						>
							{v}
						</button>
					{/each}
				</div>
			</div>
			<div>
				<label for="fi-area" class="mb-1 block text-sm font-medium" style="color:var(--text-dim)"
					>Area yang Diperiksa</label
				>
				<input
					id="fi-area"
					bind:value={fArea}
					type="text"
					placeholder="Gudang, Kasir, Toilet, dll"
					class="w-full rounded border px-3 py-2 text-sm"
					style="background:var(--bg);border-color:var(--border);color:var(--text)"
				/>
			</div>
			<div>
				<label for="fi-temuan" class="mb-1 block text-sm font-medium" style="color:var(--text-dim)"
					>Temuan</label
				>
				<textarea
					id="fi-temuan"
					bind:value={fTemuan}
					rows="3"
					placeholder="Masalah atau kondisi yang ditemukan"
					class="w-full resize-none rounded border px-3 py-2 text-sm"
					style="background:var(--bg);border-color:var(--border);color:var(--text)"
				></textarea>
			</div>
			<div>
				<label
					for="fi-tindakan"
					class="mb-1 block text-sm font-medium"
					style="color:var(--text-dim)">Tindakan</label
				>
				<textarea
					id="fi-tindakan"
					bind:value={fTindakan}
					rows="2"
					placeholder="Tindakan yang sudah/akan dilakukan"
					class="w-full resize-none rounded border px-3 py-2 text-sm"
					style="background:var(--bg);border-color:var(--border);color:var(--text)"
				></textarea>
			</div>
			<div>
				<label for="fi-nilai" class="mb-1 block text-sm font-medium" style="color:var(--text-dim)"
					>Nilai (1–100)</label
				>
				<input
					id="fi-nilai"
					bind:value={fNilai}
					type="number"
					min="1"
					max="100"
					class="w-full rounded border px-3 py-2 text-sm"
					style="background:var(--bg);border-color:var(--border);color:var(--text)"
				/>
			</div>
			<div>
				<p class="mb-2 block text-sm font-medium" style="color:var(--text-dim)">Status</p>
				<div class="flex gap-2">
					{#each [['draft', 'Draft', '#f59e0b'], ['selesai', 'Selesai', '#10b981']] as [k, v, color] (k)}
						<button
							onclick={() => (fStatus = k)}
							class="flex-1 rounded border py-1.5 text-sm transition-colors"
							style={fStatus === k
								? `background:${color};color:white;border-color:${color}`
								: 'background:var(--surface);color:var(--text-dim);border-color:var(--border)'}
						>
							{v}
						</button>
					{/each}
				</div>
			</div>
			<div>
				<label for="fi-catatan" class="mb-1 block text-sm font-medium" style="color:var(--text-dim)"
					>Catatan</label
				>
				<textarea
					id="fi-catatan"
					bind:value={fCatatan}
					rows="2"
					class="w-full resize-none rounded border px-3 py-2 text-sm"
					style="background:var(--bg);border-color:var(--border);color:var(--text)"
				></textarea>
			</div>
			<div class="flex gap-2 pt-2">
				<div class="flex-1">
					<Button variant="dim" onclick={() => (formOpen = false)}>Batal</Button>
				</div>
				<div class="flex-1"><Button onclick={simpan}>Simpan</Button></div>
			</div>
		</div>
	{/snippet}
</SlideOver>

<ConfirmDialog
	bind:open={konfirmHapus.buka}
	pesan="Hapus catatan inspeksi ini?"
	onkanan={hapus}
	onkiri={() => (konfirmHapus = { buka: false, id: null })}
/>
