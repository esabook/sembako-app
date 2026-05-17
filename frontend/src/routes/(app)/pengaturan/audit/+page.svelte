<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { user } from '$lib/stores/auth.js';
	import { toast } from '$lib/stores/ui.store.js';

	type LogRow = {
		id: number;
		aksi: string;
		modul: string;
		referensi_id: number | null;
		detail_json: Record<string, unknown> | null;
		waktu: string | null;
		ip_address: string | null;
		nama_karyawan: string | null;
		role_karyawan: string | null;
	};

	type KaryawanItem = { id: number; nama: string; role: string };

	// Aksi yang dianggap berisiko — highlight merah
	const AKSI_RISIKO = new Set(['void', 'koreksi_stok', 'nonaktifkan', 'hapus', 'diskon_tinggi', 'reset_password']);

	$effect(() => {
		if ($user && $user.role !== 'pemilik' && $user.role !== 'manajer') goto('/dashboard');
	});

	let rows = $state<LogRow[]>([]);
	let total = $state(0);
	let page = $state(1);
	const PER_PAGE = 50;
	let loading = $state(false);

	let filterModul = $state('');
	let filterAksi = $state('');
	let filterKaryawanId = $state('');
	let filterDari = $state('');
	let filterSampai = $state('');

	let karyawanList = $state<KaryawanItem[]>([]);
	let modulList = $state<string[]>([]);

	let detailItem = $state<LogRow | null>(null);

	const totalPages = $derived(Math.max(1, Math.ceil(total / PER_PAGE)));

	function buildQuery(p = page) {
		const params = new URLSearchParams();
		params.set('page', String(p));
		params.set('per_page', String(PER_PAGE));
		if (filterModul)      params.set('modul', filterModul);
		if (filterAksi)       params.set('aksi', filterAksi);
		if (filterKaryawanId) params.set('karyawan_id', filterKaryawanId);
		if (filterDari)       params.set('dari', filterDari);
		if (filterSampai)     params.set('sampai', filterSampai);
		return params.toString();
	}

	async function muat(p = 1) {
		loading = true;
		page = p;
		const r = await api.get<{ rows: LogRow[]; total: number; page: number }>(`/audit?${buildQuery(p)}`);
		if (r.success) {
			rows = r.data.rows;
			total = r.data.total;
		} else {
			toast.error('Gagal memuat log aktivitas');
		}
		loading = false;
	}

	async function muatMeta() {
		const [k, m] = await Promise.all([
			api.get<KaryawanItem[]>('/audit/karyawan-list'),
			api.get<string[]>('/audit/modul-list'),
		]);
		if (k.success) karyawanList = k.data;
		if (m.success) modulList = m.data;
	}

	function reset() {
		filterModul = '';
		filterAksi = '';
		filterKaryawanId = '';
		filterDari = '';
		filterSampai = '';
		muat(1);
	}

	function exportCsv() {
		const params = new URLSearchParams();
		if (filterModul)      params.set('modul', filterModul);
		if (filterAksi)       params.set('aksi', filterAksi);
		if (filterKaryawanId) params.set('karyawan_id', filterKaryawanId);
		if (filterDari)       params.set('dari', filterDari);
		if (filterSampai)     params.set('sampai', filterSampai);
		window.open(`/api/audit/export?${params}`, '_blank');
	}

	function fmtWaktu(w: string | null) {
		if (!w) return '—';
		return w.replace('T', ' ').slice(0, 16);
	}

	function badgeRisiko(aksi: string) {
		return AKSI_RISIKO.has(aksi);
	}

	function labelAksi(aksi: string): string {
		const map: Record<string, string> = {
			void: 'VOID',
			koreksi_stok: 'KOREKSI STOK',
			nonaktifkan: 'NONAKTIFKAN',
			hapus: 'HAPUS',
			diskon_tinggi: 'DISKON TINGGI',
			reset_password: 'RESET PASSWORD',
		};
		return map[aksi] ?? aksi.toUpperCase().replace(/_/g, ' ');
	}

	function labelModul(m: string): string {
		const map: Record<string, string> = {
			penjualan: 'Penjualan', stok: 'Stok', barang: 'Barang',
			keuangan: 'Keuangan', karyawan: 'Karyawan', laporan: 'Laporan',
		};
		return map[m] ?? m;
	}

	let debounceTimer: ReturnType<typeof setTimeout>;
	function onFilterChange() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => muat(1), 400);
	}

	onMount(() => {
		muatMeta();
		muat(1);
		return () => clearTimeout(debounceTimer);
	});
</script>

<div class="space-y-4 p-4 pb-16 max-w-7xl mx-auto">

	<!-- Header -->
	<div class="flex items-center justify-between flex-wrap gap-2">
		<div>
			<h1 class="text-lg font-bold" style="color:var(--text)">Audit Trail</h1>
			<p class="text-xs" style="color:var(--text-dim)">Riwayat aktivitas kritis sistem</p>
		</div>
		<div class="flex gap-2">
			<button
				onclick={exportCsv}
				class="px-3 py-1.5 rounded border text-xs font-mono"
				style="border-color:var(--border);color:var(--text);background:var(--surface)"
			>
				Export CSV
			</button>
			<a href="/pengaturan" class="px-3 py-1.5 rounded border text-xs font-mono" style="border-color:var(--border);color:var(--text-dim)">
				← Kembali
			</a>
		</div>
	</div>

	<!-- Filter -->
	<div class="rounded border p-3 flex flex-wrap gap-2 items-end" style="background:var(--surface);border-color:var(--border)">
		<div class="flex flex-col gap-1">
			<label class="text-xs" style="color:var(--text-dim)">Modul</label>
			<select
				bind:value={filterModul}
				onchange={onFilterChange}
				class="px-2 py-1 text-xs rounded border outline-none"
				style="background:var(--surface2);border-color:var(--border);color:var(--text)"
			>
				<option value="">Semua modul</option>
				{#each modulList as m}
					<option value={m}>{labelModul(m)}</option>
				{/each}
			</select>
		</div>

		<div class="flex flex-col gap-1">
			<label class="text-xs" style="color:var(--text-dim)">Aksi</label>
			<input
				type="text"
				bind:value={filterAksi}
				oninput={onFilterChange}
				placeholder="cari aksi..."
				class="px-2 py-1 text-xs rounded border outline-none w-32"
				style="background:var(--surface2);border-color:var(--border);color:var(--text)"
			/>
		</div>

		<div class="flex flex-col gap-1">
			<label class="text-xs" style="color:var(--text-dim)">Karyawan</label>
			<select
				bind:value={filterKaryawanId}
				onchange={onFilterChange}
				class="px-2 py-1 text-xs rounded border outline-none"
				style="background:var(--surface2);border-color:var(--border);color:var(--text)"
			>
				<option value="">Semua karyawan</option>
				{#each karyawanList as k}
					<option value={String(k.id)}>{k.nama} ({k.role})</option>
				{/each}
			</select>
		</div>

		<div class="flex flex-col gap-1">
			<label class="text-xs" style="color:var(--text-dim)">Dari</label>
			<input
				type="date"
				bind:value={filterDari}
				onchange={onFilterChange}
				class="px-2 py-1 text-xs rounded border outline-none"
				style="background:var(--surface2);border-color:var(--border);color:var(--text)"
			/>
		</div>

		<div class="flex flex-col gap-1">
			<label class="text-xs" style="color:var(--text-dim)">Sampai</label>
			<input
				type="date"
				bind:value={filterSampai}
				onchange={onFilterChange}
				class="px-2 py-1 text-xs rounded border outline-none"
				style="background:var(--surface2);border-color:var(--border);color:var(--text)"
			/>
		</div>

		<button
			onclick={reset}
			class="px-3 py-1 text-xs rounded border"
			style="border-color:var(--border);color:var(--text-dim)"
		>
			Reset
		</button>

		<span class="text-xs ml-auto" style="color:var(--text-dim)">
			{total} entri
		</span>
	</div>

	<!-- Tabel -->
	<div class="rounded border overflow-x-auto" style="border-color:var(--border)">
		<table class="w-full text-xs font-mono">
			<thead>
				<tr style="background:var(--surface2);border-bottom:1px solid var(--border)">
					<th class="px-3 py-2 text-left" style="color:var(--text-dim)">Waktu</th>
					<th class="px-3 py-2 text-left" style="color:var(--text-dim)">Karyawan</th>
					<th class="px-3 py-2 text-left" style="color:var(--text-dim)">Modul</th>
					<th class="px-3 py-2 text-left" style="color:var(--text-dim)">Aksi</th>
					<th class="px-3 py-2 text-left" style="color:var(--text-dim)">Detail</th>
					<th class="px-3 py-2 text-left" style="color:var(--text-dim)">IP</th>
				</tr>
			</thead>
			<tbody>
				{#if loading}
					<tr>
						<td colspan="6" class="px-3 py-8 text-center" style="color:var(--text-dim)">Memuat...</td>
					</tr>
				{:else if rows.length === 0}
					<tr>
						<td colspan="6" class="px-3 py-8 text-center" style="color:var(--text-dim)">
							{#if filterModul || filterAksi || filterKaryawanId || filterDari || filterSampai}
								Tidak ada log untuk filter ini
							{:else}
								Belum ada log aktivitas
							{/if}
						</td>
					</tr>
				{:else}
					{#each rows as row (row.id)}
						{@const risiko = badgeRisiko(row.aksi)}
						<tr
							onclick={() => detailItem = row}
							class="border-b cursor-pointer"
							style="border-color:var(--border);background:{risiko ? 'color-mix(in srgb,var(--danger) 6%,transparent)' : 'transparent'}"
						>
							<td class="px-3 py-2 whitespace-nowrap" style="color:var(--text-dim)">{fmtWaktu(row.waktu)}</td>
							<td class="px-3 py-2">
								{#if row.nama_karyawan}
									<span style="color:var(--text)">{row.nama_karyawan}</span>
									<span class="ml-1" style="color:var(--text-dim);font-size:10px">[{row.role_karyawan}]</span>
								{:else}
									<span style="color:var(--text-dim)">—</span>
								{/if}
							</td>
							<td class="px-3 py-2">
								<span class="px-1.5 py-0.5 rounded text-xs" style="background:var(--surface2);color:var(--text-dim)">
									{labelModul(row.modul)}
								</span>
							</td>
							<td class="px-3 py-2">
								{#if risiko}
									<span class="px-1.5 py-0.5 rounded font-bold text-xs" style="background:color-mix(in srgb,var(--danger) 20%,transparent);color:var(--danger)">
										⚠ {labelAksi(row.aksi)}
									</span>
								{:else}
									<span style="color:var(--text)">{labelAksi(row.aksi)}</span>
								{/if}
							</td>
							<td class="px-3 py-2 max-w-xs truncate" style="color:var(--text-dim)">
								{#if row.detail_json}
									{Object.entries(row.detail_json).map(([k, v]) => `${k}: ${v}`).join(' · ')}
								{:else if row.referensi_id}
									ID #{row.referensi_id}
								{:else}
									—
								{/if}
							</td>
							<td class="px-3 py-2" style="color:var(--text-dim)">{row.ip_address ?? '—'}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="flex items-center justify-center gap-2 text-xs">
			<button
				onclick={() => muat(page - 1)}
				disabled={page <= 1}
				class="px-3 py-1 rounded border"
				style="border-color:var(--border);color:{page <= 1 ? 'var(--text-dim)' : 'var(--text)'}"
			>
				← Prev
			</button>
			<span style="color:var(--text-dim)">Halaman {page} / {totalPages}</span>
			<button
				onclick={() => muat(page + 1)}
				disabled={page >= totalPages}
				class="px-3 py-1 rounded border"
				style="border-color:var(--border);color:{page >= totalPages ? 'var(--text-dim)' : 'var(--text)'}"
			>
				Next →
			</button>
		</div>
	{/if}
</div>

<!-- Modal Detail -->
{#if detailItem}
	<div
		class="fixed inset-0 flex items-center justify-center z-50"
		style="background:rgba(0,0,0,0.6)"
		onclick={() => detailItem = null}
	>
		<div
			class="rounded border max-w-lg w-full mx-4 overflow-hidden"
			style="background:var(--surface);border-color:var(--border)"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex items-center justify-between px-4 py-3 border-b" style="border-color:var(--border)">
				<span class="text-sm font-bold" style="color:var(--text)">Detail Log #{detailItem.id}</span>
				<button onclick={() => detailItem = null} class="text-lg leading-none" style="color:var(--text-dim)">×</button>
			</div>
			<div class="p-4 space-y-3 text-xs font-mono">
				<div class="grid grid-cols-2 gap-2">
					<div>
						<div style="color:var(--text-dim)">Waktu</div>
						<div style="color:var(--text)">{fmtWaktu(detailItem.waktu)}</div>
					</div>
					<div>
						<div style="color:var(--text-dim)">Karyawan</div>
						<div style="color:var(--text)">{detailItem.nama_karyawan ?? '—'} {detailItem.role_karyawan ? `[${detailItem.role_karyawan}]` : ''}</div>
					</div>
					<div>
						<div style="color:var(--text-dim)">Modul</div>
						<div style="color:var(--text)">{labelModul(detailItem.modul)}</div>
					</div>
					<div>
						<div style="color:var(--text-dim)">Aksi</div>
						<div style="color:{badgeRisiko(detailItem.aksi) ? 'var(--danger)' : 'var(--text)'};font-weight:700">
							{badgeRisiko(detailItem.aksi) ? '⚠ ' : ''}{labelAksi(detailItem.aksi)}
						</div>
					</div>
					{#if detailItem.referensi_id}
						<div>
							<div style="color:var(--text-dim)">Referensi ID</div>
							<div style="color:var(--text)">#{detailItem.referensi_id}</div>
						</div>
					{/if}
					{#if detailItem.ip_address}
						<div>
							<div style="color:var(--text-dim)">IP Address</div>
							<div style="color:var(--text)">{detailItem.ip_address}</div>
						</div>
					{/if}
				</div>

				{#if detailItem.detail_json}
					<div>
						<div class="mb-1" style="color:var(--text-dim)">Detail Perubahan</div>
						<div class="p-3 rounded" style="background:var(--surface2);color:var(--text)">
							{#each Object.entries(detailItem.detail_json) as [k, v]}
								<div class="flex gap-2">
									<span style="color:var(--text-dim);min-width:120px">{k}:</span>
									<span>{String(v)}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
