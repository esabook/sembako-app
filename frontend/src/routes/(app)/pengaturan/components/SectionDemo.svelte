<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api';
	import { toast } from '$lib/stores/ui.store';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	type DemoStatus =
		| { exists: false }
		| {
				exists: true;
				toko_id: number;
				jumlah_barang: number;
				jumlah_penjualan: number;
				jumlah_barang_masuk: number;
		  };

	let status = $state<DemoStatus | null>(null);
	let isDemo = $state(true);
	let loadingStatus = $state(true);
	let generating = $state(false);
	let deleting = $state(false);
	let confirmHapus = $state(false);
	let masuk = $state(false);

	async function muatStatus() {
		loadingStatus = true;
		const me = await api.get<{ is_demo?: boolean }>('/auth/me');
		if (me.success) isDemo = !!me.data.is_demo;
		const res = await api.get<DemoStatus>('/demo/status');
		if (res.success) status = res.data;
		else toast.error(res.error ?? 'Gagal memuat status demo');
		loadingStatus = false;
	}

	async function generate() {
		generating = true;
		const res = await api.post<{ message: string; toko_id: number }>('/demo/generate', {});
		if (res.success) {
			toast.sukses('Data demo berhasil di-generate');
			await muatStatus();
		} else {
			toast.error(res.error ?? 'Gagal generate data demo');
		}
		generating = false;
	}

	// Masuk mode demo = switch-context ke toko demo. Simpan toko asli untuk balik.
	async function masukDemo(tokoId: number) {
		if (masuk) return;
		masuk = true;
		const me = await api.get<{ tenant_id: number }>('/auth/me');
		if (me.success) localStorage.setItem('home_tenant', String(me.data.tenant_id));
		const sw = await api.post('/auth/switch-context', { toko_id: tokoId, cabang_id: null });
		if (sw.success) location.href = '/kasir';
		else {
			toast.error(sw.error ?? 'Gagal masuk mode demo');
			masuk = false;
		}
	}

	async function hapus() {
		deleting = true;
		const res = await api.delete<{ message: string }>('/demo');
		if (res.success) {
			confirmHapus = false;
			toast.sukses('Data demo berhasil dihapus');
			await muatStatus();
		} else {
			toast.error(res.error ?? 'Gagal menghapus data demo');
		}
		deleting = false;
	}

	onMount(muatStatus);
</script>

{#if !isDemo}
	<section
		class="space-y-4 rounded border p-4"
		style="background:var(--surface);border-color:var(--border)"
	>
		<h2 class="text-sm font-bold tracking-widest uppercase" style="color:var(--text-dim)">
			Data Demo
		</h2>

		<p class="text-xs" style="color:var(--text-dim)">
			Generate data contoh realistis (30 hari transaksi, 10 barang, 3 supplier, 5 pelanggan) untuk
			keperluan demo atau percobaan fitur. Data demo terisolasi di toko tersendiri dan bisa dihapus
			sepenuhnya.
		</p>

		{#if loadingStatus}
			<div class="flex items-center gap-2 text-xs" style="color:var(--text-dim)">
				<Spinner size={14} /> Mengecek status...
			</div>
		{:else if status?.exists}
			{@const demoTokoId = status.toko_id}
			<!-- Status: ada data demo -->
			<div
				class="flex flex-wrap items-center gap-4 rounded border px-3 py-2 text-xs"
				style="border-color:var(--success, #22c55e);background:rgba(34,197,94,.07)"
			>
				<span style="color:var(--success, #22c55e)">● Data demo aktif</span>
				<span style="color:var(--text-dim)">
					{status.jumlah_barang} barang &bull; {status.jumlah_penjualan} transaksi &bull;
					{status.jumlah_barang_masuk} pembelian
				</span>
			</div>

			{#if !confirmHapus}
				<div class="flex flex-wrap gap-2">
					<button
						onclick={() => masukDemo(demoTokoId)}
						disabled={masuk}
						class="btn inline-flex h-fit items-center gap-2 rounded border px-4 py-2 text-xs font-medium btn-primary"
						style="border-color:var(--accent);cursor:{masuk ? 'default' : 'pointer'};opacity:{masuk
							? 0.6
							: 1}"
					>
						{#if masuk}<Spinner size={12} />{/if}
						{masuk ? 'Masuk...' : 'Masuk Mode Demo'}
					</button>
					<button
						onclick={() => (confirmHapus = true)}
						class="rounded border px-4 py-2 text-xs font-medium"
						style="border-color:var(--danger);color:var(--danger);background:transparent;cursor:pointer"
					>
						Hapus Data Demo
					</button>
				</div>
			{:else}
				<div
					class="space-y-2 rounded border px-3 py-2"
					style="border-color:var(--danger);background:rgba(255,82,82,.08)"
				>
					<p class="text-xs font-bold" style="color:var(--danger)">Yakin hapus semua data demo?</p>
					<p class="text-xs" style="color:var(--text-dim)">
						Toko demo beserta seluruh transaksi, barang, dan karyawan demo akan dihapus permanen.
					</p>
					<div class="flex gap-2">
						<button
							onclick={hapus}
							disabled={deleting}
							class="inline-flex items-center gap-2 rounded px-4 py-2 text-xs font-medium"
							style="background:var(--danger);color:#fff;cursor:{deleting
								? 'default'
								: 'pointer'};opacity:{deleting ? 0.6 : 1}"
						>
							{#if deleting}<Spinner size={12} />{/if}
							{deleting ? 'Menghapus...' : 'Ya, Hapus Sekarang'}
						</button>
						<button
							onclick={() => (confirmHapus = false)}
							disabled={deleting}
							class="rounded border px-4 py-2 text-xs"
							style="border-color:var(--border);color:var(--text);cursor:pointer"
						>
							Batal
						</button>
					</div>
				</div>
			{/if}
		{:else}
			<!-- Status: belum ada data demo -->
			<div class="flex items-center gap-2 text-xs" style="color:var(--text-dim)">
				<span>○ Belum ada data demo</span>
			</div>

			<button
				onclick={generate}
				disabled={generating}
				class="inline-flex items-center gap-2 rounded border px-4 py-2 text-sm font-medium"
				style="background:var(--accent);color:#fff;border-color:var(--accent);cursor:{generating
					? 'default'
					: 'pointer'};opacity:{generating ? 0.6 : 1}"
			>
				{#if generating}<Spinner size={14} />{/if}
				{generating ? 'Generating... (±5 detik)' : '⚡ Generate Data Demo'}
			</button>
		{/if}
	</section>
{/if}
