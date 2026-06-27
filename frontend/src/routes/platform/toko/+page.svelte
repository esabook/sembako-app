<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { padmin } from '../platform.api';
	import { toast } from '$lib/stores/ui.store';
	import { imgUrl } from '$lib/utils/upload';
	import LogOut from '@lucide/svelte/icons/log-out';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Activity from '@lucide/svelte/icons/activity';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import List from '@lucide/svelte/icons/list';
	import Eye from '@lucide/svelte/icons/eye';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	type Toko = {
		id: number;
		nama: string;
		kode_toko: string;
		status_langganan: string;
		trial_berakhir: string | null;
		aktif_sampai: string | null;
		email_pemilik: string | null;
		wa_pemilik: string | null;
		bukti_menunggu: number;
		alasan_terakhir: string[];
	};
	type Bayar = {
		id: number;
		toko_id: number;
		nama_toko: string;
		periode_bulan: number;
		nominal: number;
		bukti_path: string | null;
		status: string;
		catatan_admin: string | null;
		created_at: string;
	};

	let tokoList = $state<Toko[]>([]);
	let antrian = $state<Bayar[]>([]);
	let loading = $state(true);
	let filterStatus = $state('');
	let prosesId = $state<number | null>(null);
	let catatan = $state<Record<number, string>>({});
	let viewMode = $state<'list' | 'card'>('list');
	let detailToko = $state<Toko | null>(null);
	let hapusToko = $state<Toko | null>(null);
	let konfirmHapus = $state('');

	const STATUS_BADGE: Record<string, string> = {
		aktif: 'badge-success',
		trial: 'badge-info',
		suspended: 'badge-error',
		deactivated: 'badge-warning',
		deleted: 'badge-neutral'
	};

	const STATUS_OPSI = ['trial', 'aktif', 'suspended', 'deactivated', 'deleted'];

	function sisaHari(t: Toko): number | null {
		const acuan = t.status_langganan === 'aktif' ? t.aktif_sampai : t.trial_berakhir;
		if (!acuan) return null;
		return Math.ceil((new Date(acuan).getTime() - Date.now()) / 86_400_000);
	}

	function rupiah(n: number): string {
		return 'Rp ' + n.toLocaleString('id-ID');
	}

	function tanggal(s: string): string {
		return new Date(s).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
	}

	const tokoTampil = $derived(
		filterStatus ? tokoList.filter((t) => t.status_langganan === filterStatus) : tokoList
	);

	async function load() {
		loading = true;
		const [resToko, resBayar] = await Promise.all([
			padmin.get<Toko[]>('/platform/toko'),
			padmin.get<Bayar[]>('/platform/pembayaran?status=menunggu')
		]);
		if (resToko.success) tokoList = resToko.data;
		if (resBayar.success) antrian = resBayar.data;
		loading = false;
	}

	async function verifikasi(id: number, aksi: 'setuju' | 'tolak') {
		if (prosesId) return;
		prosesId = id;
		const res = await padmin.post(`/platform/pembayaran/${id}/verifikasi`, {
			aksi,
			catatan: catatan[id]?.trim() || undefined
		});
		prosesId = null;
		if (res.success) {
			toast.sukses(
				aksi === 'setuju' ? 'Bukti disetujui — langganan diaktifkan.' : 'Bukti ditolak.'
			);
			delete catatan[id];
			await load();
		} else {
			toast.error(res.error || 'Gagal memproses verifikasi.');
		}
	}

	async function ubahStatus(id: number, status: string) {
		if (prosesId) return;
		prosesId = id;
		const res = await padmin.post(`/platform/toko/${id}/status`, { status });
		prosesId = null;
		if (res.success) {
			toast.sukses(`Status toko diubah → ${status}.`);
			await load();
		} else {
			toast.error(res.error || 'Gagal mengubah status.');
		}
	}

	async function hapus() {
		if (!hapusToko || prosesId) return;
		const t = hapusToko;
		prosesId = t.id;
		const res = await padmin.del(`/platform/toko/${t.id}`, { konfirmasi: konfirmHapus.trim() });
		prosesId = null;
		if (res.success) {
			toast.sukses(`Toko "${t.nama}" dihapus permanen.`);
			hapusToko = null;
			konfirmHapus = '';
			await load();
		} else {
			toast.error(res.error || 'Gagal menghapus toko.');
		}
	}

	async function logout() {
		await padmin.post('/platform/logout', {});
		goto('/platform/login');
	}

	onMount(load);
</script>

<svelte:head>
	<title>Toko &amp; Verifikasi · Admin Platform</title>
</svelte:head>

<header
	class="sticky top-0 z-20 border-b backdrop-blur"
	style="border-color:var(--border);background:color-mix(in srgb, var(--bg) 85%, transparent)"
>
	<div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
		<span class="text-lg font-bold tracking-tight" style="color:var(--accent)">
			Stokasir · Admin
		</span>
		<div class="flex items-center gap-2">
			<a class="btn btn-ghost btn-sm" href="/platform/analytics">
				<Activity class="size-4" />
				<span class="hidden sm:inline">Analytics</span>
			</a>
			<button class="btn btn-ghost btn-sm" onclick={load} disabled={loading}>
				<RefreshCw class="size-4" />
				<span class="hidden sm:inline">Muat ulang</span>
			</button>
			<button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick={logout}>
				<LogOut class="size-4" />
				<span class="hidden sm:inline">Keluar</span>
			</button>
		</div>
	</div>
</header>

<main class="mx-auto max-w-5xl px-4 py-6">
	{#if loading}
		<p class="text-sm" style="color:var(--text-dim)">Memuat…</p>
	{:else}
		<!-- Antrian verifikasi bukti -->
		<section>
			<h2 class="text-lg font-semibold">
				Antrian Verifikasi
				{#if antrian.length}
					<span class="ml-1 badge px-2 badge-warning">{antrian.length}</span>
				{/if}
			</h2>
			{#if !antrian.length}
				<p class="mt-2 text-sm" style="color:var(--text-dim)">Tidak ada bukti menunggu.</p>
			{:else}
				<div class="mt-3 grid gap-3 sm:grid-cols-2">
					{#each antrian as b (b.id)}
						<div class="rounded-2xl border p-4" style="border-color:var(--border)">
							<div class="flex items-start justify-between gap-2">
								<div>
									<div class="font-semibold">{b.nama_toko}</div>
									<div class="text-xs" style="color:var(--text-dim)">{tanggal(b.created_at)}</div>
								</div>
								<div class="text-right">
									<div class="font-semibold">{rupiah(b.nominal)}</div>
									<div class="text-xs" style="color:var(--text-dim)">{b.periode_bulan} bulan</div>
								</div>
							</div>

							{#if b.bukti_path}
								{#if b.bukti_path.endsWith('.pdf')}
									<a
										href={imgUrl(b.bukti_path)}
										target="_blank"
										class="mt-3 inline-block text-sm font-medium"
										style="color:var(--accent)">Lihat bukti (PDF)</a
									>
								{:else}
									<a href={imgUrl(b.bukti_path)} target="_blank" class="mt-3 block">
										<img
											src={imgUrl(b.bukti_path)}
											alt="Bukti transfer {b.nama_toko}"
											class="max-h-48 w-full rounded-lg border object-contain"
											style="border-color:var(--border)"
										/>
									</a>
								{/if}
							{:else}
								<p class="mt-3 text-xs" style="color:var(--text-dim)">Tanpa lampiran bukti.</p>
							{/if}

							<input
								bind:value={catatan[b.id]}
								placeholder="Catatan (opsional, wajib jika tolak)"
								class="input mt-3 w-full text-sm"
							/>

							<div class="mt-3 flex gap-2">
								<button
									class="btn flex-1 btn-sm btn-success"
									disabled={prosesId === b.id}
									onclick={() => verifikasi(b.id, 'setuju')}
								>
									Setujui
								</button>
								<button
									class="btn flex-1 btn-sm btn-error"
									disabled={prosesId === b.id}
									onclick={() => verifikasi(b.id, 'tolak')}
								>
									Tolak
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Daftar toko -->
		<section class="mt-8">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h2 class="text-lg font-semibold">
					Semua Toko
					<span class="ml-1 text-sm font-normal" style="color:var(--text-dim)"
						>({tokoTampil.length})</span
					>
				</h2>
				<div class="flex items-center gap-2">
					<select bind:value={filterStatus} class="select w-36 select-sm">
						<option value="">Semua status</option>
						<option value="trial">Trial</option>
						<option value="aktif">Aktif</option>
						<option value="suspended">Suspended</option>
						<option value="deactivated">Deactivated</option>
						<option value="deleted">Deleted</option>
					</select>
					<!-- View toggle -->
					<div class="flex overflow-hidden rounded-lg border" style="border-color:var(--border)">
						<button
							class="btn rounded-none border-r px-2 btn-ghost btn-sm"
							style="border-color:var(--border);{viewMode === 'list'
								? 'background:var(--surface-raised)'
								: ''}"
							onclick={() => (viewMode = 'list')}
							title="Tampilan list"
						>
							<List class="size-4" />
						</button>
						<button
							class="btn rounded-none px-2 btn-ghost btn-sm"
							style={viewMode === 'card' ? 'background:var(--surface-raised)' : ''}
							onclick={() => (viewMode = 'card')}
							title="Tampilan card"
						>
							<LayoutGrid class="size-4" />
						</button>
					</div>
				</div>
			</div>

			<!-- LIST / TABLE mode -->
			{#if viewMode === 'list'}
				<div class="mt-3 overflow-x-auto rounded-2xl border" style="border-color:var(--border)">
					<table class="table min-w-[680px] table-sm">
						<thead>
							<tr>
								<th>Toko</th>
								<th>Status</th>
								<th>Sisa</th>
								<th>Pemilik</th>
								<th>Alasan</th>
								<th class="text-center">Bukti</th>
								<th>Ubah Status</th>
								<th class="text-center">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{#each tokoTampil as t (t.id)}
								<tr>
									<td>
										<div class="font-medium">{t.nama}</div>
										<div class="text-xs" style="color:var(--text-dim)">{t.kode_toko}</div>
									</td>
									<td>
										<span class="badge px-2 {STATUS_BADGE[t.status_langganan] ?? 'badge-ghost'}">
											{t.status_langganan}
										</span>
									</td>
									<td>
										{#if sisaHari(t) !== null}
											<span style={(sisaHari(t) ?? 0) < 0 ? 'color:var(--danger)' : ''}>
												{sisaHari(t)} hari
											</span>
										{:else}
											<span style="color:var(--text-dim)">—</span>
										{/if}
									</td>
									<td>
										<div class="text-xs">{t.email_pemilik ?? '—'}</div>
										<div class="text-xs" style="color:var(--text-dim)">{t.wa_pemilik ?? ''}</div>
									</td>
									<td class="max-w-[160px]">
										{#if t.alasan_terakhir.length}
											<div class="flex flex-wrap gap-1">
												{#each t.alasan_terakhir as a (a)}
													<span
														class="badge badge-ghost px-2 badge-xs text-[10px] whitespace-nowrap"
														>{a}</span
													>
												{/each}
											</div>
										{:else}
											<span style="color:var(--text-dim)">—</span>
										{/if}
									</td>
									<td class="text-center">
										{#if t.bukti_menunggu}
											<span class="badge px-2 badge-warning">{t.bukti_menunggu}</span>
										{:else}
											<span style="color:var(--text-dim)">—</span>
										{/if}
									</td>
									<td>
										<select
											class="select w-32 select-xs"
											value={t.status_langganan}
											disabled={prosesId === t.id}
											onchange={(e) => ubahStatus(t.id, e.currentTarget.value)}
										>
											{#each STATUS_OPSI as s (s)}
												<option value={s}>{s}</option>
											{/each}
										</select>
									</td>
									<td>
										<div class="flex justify-center gap-1">
											<button
												class="btn btn-ghost btn-xs"
												title="Lihat detail"
												onclick={() => (detailToko = t)}
											>
												<Eye class="size-4" />
											</button>
											<button
												class="btn btn-ghost btn-xs"
												style="color:var(--danger)"
												title="Hapus permanen"
												onclick={() => {
													hapusToko = t;
													konfirmHapus = '';
												}}
											>
												<Trash2 class="size-4" />
											</button>
										</div>
									</td>
								</tr>
							{/each}
							{#if !tokoTampil.length}
								<tr>
									<td colspan="8" class="text-center" style="color:var(--text-dim)"
										>Tidak ada toko.</td
									>
								</tr>
							{/if}
						</tbody>
					</table>
				</div>

				<!-- CARD mode -->
			{:else}
				<div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{#each tokoTampil as t (t.id)}
						<div
							class="flex flex-col gap-3 rounded-2xl border p-4"
							style="border-color:var(--border);background:var(--surface)"
						>
							<!-- Header -->
							<div class="flex items-start justify-between gap-2">
								<div>
									<div class="font-semibold">{t.nama}</div>
									<div class="text-xs" style="color:var(--text-dim)">{t.kode_toko}</div>
								</div>
								<span
									class="badge shrink-0 px-2 {STATUS_BADGE[t.status_langganan] ?? 'badge-ghost'}"
								>
									{t.status_langganan}
								</span>
							</div>

							<!-- Info baris -->
							<div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
								<span style="color:var(--text-dim)">Pemilik</span>
								<span>{t.email_pemilik ?? '—'}</span>
								{#if t.wa_pemilik}
									<span style="color:var(--text-dim)">WA</span>
									<span>{t.wa_pemilik}</span>
								{/if}
								{#if sisaHari(t) !== null}
									<span style="color:var(--text-dim)">Sisa</span>
									<span style={(sisaHari(t) ?? 0) < 0 ? 'color:var(--danger)' : ''}
										>{sisaHari(t)} hari</span
									>
								{/if}
								{#if t.bukti_menunggu}
									<span style="color:var(--text-dim)">Bukti</span>
									<span class="badge px-2 badge-sm badge-warning">{t.bukti_menunggu} menunggu</span>
								{/if}
							</div>

							<!-- Alasan lifecycle -->
							{#if t.alasan_terakhir.length}
								<div class="border-t pt-2" style="border-color:var(--border)">
									<p class="mb-1 text-[10px] font-semibold uppercase" style="color:var(--text-dim)">
										Alasan
									</p>
									<div class="flex flex-wrap gap-1">
										{#each t.alasan_terakhir as a (a)}
											<span class="badge badge-ghost px-2 badge-xs text-[10px]">{a}</span>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Ubah status -->
							<div class="border-t pt-2" style="border-color:var(--border)">
								<select
									class="select w-full select-xs"
									value={t.status_langganan}
									disabled={prosesId === t.id}
									onchange={(e) => ubahStatus(t.id, e.currentTarget.value)}
								>
									{#each STATUS_OPSI as s (s)}
										<option value={s}>{s}</option>
									{/each}
								</select>
							</div>

							<!-- Aksi -->
							<div class="flex gap-2">
								<button class="btn flex-1 btn-ghost btn-sm" onclick={() => (detailToko = t)}>
									<Eye class="size-4" /> Detail
								</button>
								<button
									class="btn flex-1 btn-ghost btn-sm"
									style="color:var(--danger)"
									onclick={() => {
										hapusToko = t;
										konfirmHapus = '';
									}}
								>
									<Trash2 class="size-4" /> Hapus
								</button>
							</div>
						</div>
					{/each}
					{#if !tokoTampil.length}
						<p class="col-span-full text-sm" style="color:var(--text-dim)">Tidak ada toko.</p>
					{/if}
				</div>
			{/if}
		</section>
	{/if}
</main>

<!-- Modal detail toko -->
{#if detailToko}
	{@const t = detailToko}
	<div class="modal-open modal" role="dialog">
		<div class="modal-box" style="background:var(--surface)">
			<div class="flex items-start justify-between gap-2">
				<div>
					<h3 class="text-lg font-bold">{t.nama}</h3>
					<p class="text-xs" style="color:var(--text-dim)">{t.kode_toko}</p>
				</div>
				<span class="badge px-2 {STATUS_BADGE[t.status_langganan] ?? 'badge-ghost'}">
					{t.status_langganan}
				</span>
			</div>

			<div class="mt-4 grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
				<span style="color:var(--text-dim)">Email pemilik</span>
				<span class="col-span-2 break-all">{t.email_pemilik ?? '—'}</span>
				<span style="color:var(--text-dim)">WA pemilik</span>
				<span class="col-span-2">{t.wa_pemilik ?? '—'}</span>
				<span style="color:var(--text-dim)">Trial berakhir</span>
				<span class="col-span-2">{t.trial_berakhir ? tanggal(t.trial_berakhir) : '—'}</span>
				<span style="color:var(--text-dim)">Aktif sampai</span>
				<span class="col-span-2">{t.aktif_sampai ? tanggal(t.aktif_sampai) : '—'}</span>
				<span style="color:var(--text-dim)">Sisa hari</span>
				<span class="col-span-2" style={(sisaHari(t) ?? 0) < 0 ? 'color:var(--danger)' : ''}>
					{sisaHari(t) !== null ? `${sisaHari(t)} hari` : '—'}
				</span>
				<span style="color:var(--text-dim)">Bukti menunggu</span>
				<span class="col-span-2">{t.bukti_menunggu || '—'}</span>
			</div>

			{#if t.alasan_terakhir.length}
				<div class="mt-3 border-t pt-3" style="border-color:var(--border)">
					<p class="mb-1 text-[10px] font-semibold uppercase" style="color:var(--text-dim)">
						Alasan terakhir
					</p>
					<div class="flex flex-wrap gap-1">
						{#each t.alasan_terakhir as a (a)}
							<span class="badge badge-ghost px-2 badge-xs text-[10px]">{a}</span>
						{/each}
					</div>
				</div>
			{/if}

			<div class="modal-action">
				<button class="btn btn-sm" onclick={() => (detailToko = null)}>Tutup</button>
			</div>
		</div>
		<button class="modal-backdrop" aria-label="Tutup" onclick={() => (detailToko = null)}></button>
	</div>
{/if}

<!-- Modal hapus permanen -->
{#if hapusToko}
	{@const t = hapusToko}
	<div class="modal-open modal" role="dialog">
		<div class="modal-box" style="background:var(--surface)">
			<h3 class="text-lg font-bold" style="color:var(--danger)">Hapus toko permanen?</h3>
			<p class="mt-2 text-sm" style="color:var(--text-dim)">
				Aksi ini <strong>tidak bisa dibatalkan</strong>. Seluruh data toko
				<strong>{t.nama}</strong> (barang, transaksi, karyawan, dll) akan dihapus permanen.
			</p>
			<p class="mt-3 text-sm">
				Ketik kode toko <strong>{t.kode_toko}</strong> untuk konfirmasi:
			</p>
			<input
				bind:value={konfirmHapus}
				placeholder={t.kode_toko}
				class="input mt-2 w-full text-sm"
				autocomplete="off"
			/>
			<div class="modal-action">
				<button
					class="btn btn-sm"
					onclick={() => {
						hapusToko = null;
						konfirmHapus = '';
					}}
				>
					Batal
				</button>
				<button
					class="btn btn-sm btn-error"
					disabled={prosesId === t.id || konfirmHapus.trim() !== t.kode_toko}
					onclick={hapus}
				>
					Hapus permanen
				</button>
			</div>
		</div>
		<button
			class="modal-backdrop"
			aria-label="Batal"
			onclick={() => {
				hapusToko = null;
				konfirmHapus = '';
			}}
		></button>
	</div>
{/if}
