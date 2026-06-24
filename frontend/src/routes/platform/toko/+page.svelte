<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { padmin } from '../platform.api';
	import { toast } from '$lib/stores/ui.store';
	import { imgUrl } from '$lib/utils/upload';
	import LogOut from '@lucide/svelte/icons/log-out';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Activity from '@lucide/svelte/icons/activity';

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

	const STATUS_BADGE: Record<string, string> = {
		aktif: 'badge-success',
		trial: 'badge-info',
		suspended: 'badge-error'
	};

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
			toast.sukses(aksi === 'setuju' ? 'Bukti disetujui — langganan diaktifkan.' : 'Bukti ditolak.');
			delete catatan[id];
			await load();
		} else {
			toast.error(res.error || 'Gagal memproses verifikasi.');
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
			<a class="btn btn-ghost btn-sm" href="/platform/analytics/toko">
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
					<span class="badge ml-1 badge-warning">{antrian.length}</span>
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
			<div class="flex items-center justify-between gap-2">
				<h2 class="text-lg font-semibold">Semua Toko</h2>
				<select bind:value={filterStatus} class="select select-sm w-40">
					<option value="">Semua status</option>
					<option value="trial">Trial</option>
					<option value="aktif">Aktif</option>
					<option value="suspended">Suspended</option>
				</select>
			</div>

			<div class="mt-3 overflow-x-auto rounded-2xl border" style="border-color:var(--border)">
				<table class="table-sm table">
					<thead>
						<tr>
							<th>Toko</th>
							<th>Status</th>
							<th>Sisa</th>
							<th>Pemilik</th>
							<th class="text-center">Bukti</th>
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
									<span class="badge {STATUS_BADGE[t.status_langganan] ?? 'badge-ghost'}">
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
								<td class="text-center">
									{#if t.bukti_menunggu}
										<span class="badge badge-warning">{t.bukti_menunggu}</span>
									{:else}
										<span style="color:var(--text-dim)">—</span>
									{/if}
								</td>
							</tr>
						{/each}
						{#if !tokoTampil.length}
							<tr>
								<td colspan="5" class="text-center" style="color:var(--text-dim)">Tidak ada toko.</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
</main>
