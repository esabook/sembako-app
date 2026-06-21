<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/utils/api';
	import { toast } from '$lib/stores/ui.store';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	type DemoStatus =
		| { exists: false }
		| { exists: true; toko_id: number; jumlah_barang: number; jumlah_penjualan: number; jumlah_barang_masuk: number };

	let status = $state<DemoStatus | null>(null);
	let loadingStatus = $state(true);
	let generating = $state(false);
	let deleting = $state(false);
	let confirmHapus = $state(false);
	let lastGenerated = $state<{ toko_id: number } | null>(null);

	async function muatStatus() {
		loadingStatus = true;
		const res = await api.get<DemoStatus>('/demo/status');
		if (res.success) status = res.data;
		loadingStatus = false;
	}

	async function generate() {
		generating = true;
		const res = await api.post<{ message: string; toko_id: number }>('/demo/generate', {});
		if (res.success) {
			lastGenerated = { toko_id: res.data.toko_id };
			toast.sukses('Data demo berhasil di-generate');
			await muatStatus();
		} else {
			toast.error(res.error ?? 'Gagal generate data demo');
		}
		generating = false;
	}

	async function hapus() {
		deleting = true;
		const res = await api.delete<{ message: string }>('/demo');
		if (res.success) {
			lastGenerated = null;
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

		{#if lastGenerated}
			<div
				class="rounded border px-3 py-2 text-xs space-y-1"
				style="border-color:var(--accent);background:rgba(99,102,241,.08)"
			>
				<p class="font-semibold" style="color:var(--accent)">Login data demo:</p>
				<p style="color:var(--text)">Username: <code class="font-mono">demo-admin</code></p>
				<p style="color:var(--text)">Password: <code class="font-mono">demo123</code></p>
			</div>
		{/if}

		{#if !confirmHapus}
			<button
				onclick={() => (confirmHapus = true)}
				class="rounded border px-4 py-2 text-xs font-medium"
				style="border-color:var(--danger);color:var(--danger);background:transparent;cursor:pointer"
			>
				Hapus Data Demo
			</button>
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
						style="background:var(--danger);color:#fff;cursor:{deleting ? 'default' : 'pointer'};opacity:{deleting ? .6 : 1}"
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
		<div
			class="flex items-center gap-2 text-xs"
			style="color:var(--text-dim)"
		>
			<span>○ Belum ada data demo</span>
		</div>

		<button
			onclick={generate}
			disabled={generating}
			class="inline-flex items-center gap-2 rounded border px-4 py-2 text-sm font-medium"
			style="background:var(--accent);color:#fff;border-color:var(--accent);cursor:{generating ? 'default' : 'pointer'};opacity:{generating ? .6 : 1}"
		>
			{#if generating}<Spinner size={14} />{/if}
			{generating ? 'Generating... (±5 detik)' : '⚡ Generate Data Demo'}
		</button>
	{/if}
</section>
