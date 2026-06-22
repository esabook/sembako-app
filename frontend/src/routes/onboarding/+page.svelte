<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import SectionCard from '$lib/components/layout/SectionCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import StepperOnboarding from './StepperOnboarding.svelte';
	import { api } from '$lib/utils/api.js';
	import { withLoading } from '$lib/utils/async.js';

	let { data } = $props();

	const LANGKAH = ['Profil Toko', 'Barang Pertama', 'Undang Karyawan', 'Data Contoh'];
	let step = $state(0);
	let menyimpan = $state(false);
	// Revisit setelah selesai → langsung layar sukses, jangan ulang wizard.
	let sukses = $state(untrack(() => data.sudahSelesai));

	// Step 1 — profil toko
	let namaToko = $state('');
	let alamat = $state('');
	let telepon = $state('');

	// Step 2 — barang pertama
	let kodeBarang = $state('');
	let namaBarang = $state('');
	let kategoriId = $state<number | null>(null);
	let satuanId = $state<number | null>(null);
	let hargaEceran = $state<number>(0);
	let kategoriOpts = $state<{ value: number; label: string }[]>([]);
	let satuanOpts = $state<{ value: number; label: string }[]>([]);

	// Step 3 — undang karyawan
	let kodeKaryawan = $state('');
	let namaKaryawan = $state('');
	let username = $state('');
	let password = $state('');
	let role = $state<'kasir' | 'gudang' | 'manajer'>('kasir');

	// Step 4 — data contoh
	let isiDemo = $state(true);

	onMount(async () => {
		if (sukses) return; // sudah selesai → tak perlu muat data wizard
		const res = await api.get<Record<string, string>>('/pengaturan');
		if (res.success) {
			namaToko = res.data.nama_toko ?? '';
			alamat = res.data.alamat ?? '';
			telepon = res.data.telepon ?? '';
		}
		const [kat, sat] = await Promise.all([
			api.get<{ id: number; nama: string }[]>('/barang/kategori'),
			api.get<{ id: number; nama: string; singkatan: string }[]>('/barang/satuan')
		]);
		if (kat.success) kategoriOpts = kat.data.map((k) => ({ value: k.id, label: k.nama }));
		if (sat.success)
			satuanOpts = sat.data.map((s) => ({ value: s.id, label: `${s.nama} (${s.singkatan})` }));
	});

	async function simpanProfil(): Promise<boolean> {
		menyimpan = true;
		const hasil = await withLoading(
			async () => {
				const res = await api.post('/pengaturan/bulk', {
					nama_toko: namaToko.trim() || 'Stokasir',
					alamat: alamat.trim(),
					telepon: telepon.trim()
				});
				if (!res.success) throw new Error(res.error);
				return true;
			},
			{ loadingKey: 'ob-profil', suksesOtomatis: true, suksesPesan: 'Profil toko disimpan', modul: 'pengaturan', aksi: 'simpan profil onboarding' }
		);
		menyimpan = false;
		return !!hasil;
	}

	async function simpanBarang(): Promise<boolean> {
		if (!namaBarang.trim() || !kodeBarang.trim()) return true; // kosong → lewati saja
		menyimpan = true;
		const hasil = await withLoading(
			async () => {
				const res = await api.post('/barang', {
					kode_barang: kodeBarang.trim(),
					nama_barang: namaBarang.trim(),
					kategori_id: kategoriId ?? undefined,
					satuan_dasar_id: satuanId ?? undefined,
					harga_jual_eceran: hargaEceran || 0
				});
				if (!res.success) throw new Error(res.error);
				return true;
			},
			{ loadingKey: 'ob-barang', suksesOtomatis: true, suksesPesan: 'Barang pertama ditambahkan', modul: 'barang', aksi: 'tambah barang onboarding' }
		);
		menyimpan = false;
		return !!hasil;
	}

	async function simpanKaryawan(): Promise<boolean> {
		if (!namaKaryawan.trim() || !username.trim() || !password) return true; // kosong → lewati
		menyimpan = true;
		const hasil = await withLoading(
			async () => {
				const res = await api.post('/karyawan', {
					kode_karyawan: kodeKaryawan.trim() || username.trim().toUpperCase(),
					nama: namaKaryawan.trim(),
					username: username.trim(),
					password,
					role
				});
				if (!res.success) throw new Error(res.error);
				return true;
			},
			{ loadingKey: 'ob-karyawan', suksesOtomatis: true, suksesPesan: 'Karyawan diundang', modul: 'karyawan', aksi: 'undang karyawan onboarding' }
		);
		menyimpan = false;
		return !!hasil;
	}

	async function selesai() {
		menyimpan = true;
		const hasil = await withLoading(
			async () => {
				if (isiDemo) {
					const seed = await api.post('/onboarding/seed-demo', {});
					if (!seed.success) throw new Error(seed.error);
				}
				const res = await api.post('/pengaturan/bulk', { onboarding_selesai: 'true' });
				if (!res.success) throw new Error(res.error);
				return true;
			},
			{ loadingKey: 'ob-selesai', loadingPesan: 'Menyelesaikan…', suksesOtomatis: true, suksesPesan: 'Selamat datang di Stokasir!', modul: 'pengaturan', aksi: 'selesai onboarding' }
		);
		menyimpan = false;
		if (hasil) sukses = true;
	}

	async function lanjut() {
		let ok = true;
		if (step === 0) ok = await simpanProfil();
		else if (step === 1) ok = await simpanBarang();
		else if (step === 2) ok = await simpanKaryawan();
		if (ok && step < LANGKAH.length - 1) step += 1;
	}

	function lewati() {
		if (step < LANGKAH.length - 1) step += 1;
	}
</script>

<div class="w-full">
{#if sukses}
	<div class="flex flex-col items-center gap-4 py-8 text-center">
		<div
			class="flex h-16 w-16 items-center justify-center rounded-full text-3xl"
			style="background:color-mix(in srgb, var(--accent) 20%, transparent);color:var(--accent)"
		>
			✓
		</div>
		<h1 class="text-xl font-bold">Toko Anda siap! 🎉</h1>
		<p class="text-sm" style="color:var(--text-dim)">
			Onboarding selesai. Mulai kelola stok, kasir, dan laporan dari dashboard.
		</p>
		<Button variant="primary" onclick={() => goto('/dashboard')}>Buka Dashboard</Button>
	</div>
{:else}
	<PageHeader judul="Selamat datang 👋" sub="Atur toko Anda dalam beberapa langkah singkat" />

	<div class="my-4">
		<StepperOnboarding langkah={LANGKAH} aktif={step} />
	</div>

	{#if step === 0}
		<SectionCard judul="Profil Toko">
			<div class="grid gap-3">
				<Input label="Nama Toko" bind:value={namaToko} />
				<Input label="Alamat" bind:value={alamat} />
				<Input label="Telepon" type="tel" bind:value={telepon} />
			</div>
		</SectionCard>
	{:else if step === 1}
		<SectionCard judul="Barang Pertama">
			<p class="mb-3 text-xs" style="color:var(--text-dim)">Opsional — bisa dilewati dan diisi nanti.</p>
			<div class="grid gap-3 sm:grid-cols-2">
				<Input label="Kode Barang" bind:value={kodeBarang} />
				<Input label="Nama Barang" bind:value={namaBarang} />
				<Select label="Kategori" bind:value={kategoriId} options={kategoriOpts} />
				<Select label="Satuan" bind:value={satuanId} options={satuanOpts} />
				<Input label="Harga Jual Eceran (Rp)" type="number" bind:value={hargaEceran} />
			</div>
		</SectionCard>
	{:else if step === 2}
		<SectionCard judul="Undang Karyawan">
			<p class="mb-3 text-xs" style="color:var(--text-dim)">Opsional — tambah kasir/gudang sekarang atau nanti.</p>
			<div class="grid gap-3 sm:grid-cols-2">
				<Input label="Nama Karyawan" bind:value={namaKaryawan} />
				<Input label="Kode Karyawan" bind:value={kodeKaryawan} />
				<Input label="Username" bind:value={username} />
				<Input label="Password" type="password" bind:value={password} />
				<Select
					label="Role"
					bind:value={role}
					options={[
						{ value: 'kasir', label: 'Kasir' },
						{ value: 'gudang', label: 'Gudang' },
						{ value: 'manajer', label: 'Manajer' }
					]}
				/>
			</div>
		</SectionCard>
	{:else}
		<SectionCard judul="Data Contoh">
			<label class="flex cursor-pointer items-start gap-3">
				<input type="checkbox" class="checkbox checkbox-sm mt-0.5" bind:checked={isiDemo} />
				<span class="text-sm">
					Isi contoh data (barang, supplier, pelanggan) ke toko ini.
					<span class="mt-1 block text-xs" style="color:var(--text-dim)">
						Bagus untuk mencoba fitur. Bisa dihapus manual kapan saja.
					</span>
				</span>
			</label>
		</SectionCard>
	{/if}

	<div class="mt-4 flex items-center justify-between">
		<div>
			{#if step > 0}
				<Button variant="ghost" disabled={menyimpan} onclick={() => (step -= 1)}>Kembali</Button>
			{/if}
		</div>
		<div class="flex gap-2">
			{#if step > 0 && step < LANGKAH.length - 1}
				<Button variant="dim" disabled={menyimpan} onclick={lewati}>Lewati</Button>
			{/if}
			{#if step < LANGKAH.length - 1}
				<Button variant="primary" loading={menyimpan} disabled={menyimpan} onclick={lanjut}>Lanjut</Button>
			{:else}
				<Button variant="primary" loading={menyimpan} disabled={menyimpan} onclick={selesai}>Selesai</Button>
			{/if}
		</div>
	</div>
{/if}
</div>
