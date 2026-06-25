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
	import Store from '@lucide/svelte/icons/store';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Check from '@lucide/svelte/icons/check';

	let { data } = $props();

	const LANGKAH = ['Profil Toko', 'Undang Karyawan', 'Mode Demo'];
	let step = $state(0);
	let menyimpan = $state(false);
	// Revisit setelah selesai → langsung layar sukses, jangan ulang wizard.
	let sukses = $state(untrack(() => data.sudahSelesai));

	// Picker toko — pemilik yang punya >1 toko bisa pindah tanpa onboarding ulang.
	// Setelah switch, reload: layout.server hitung ulang sudahSelesai untuk toko itu
	// → kalau sudah onboarding otomatis tampil layar sukses.
	type TokoItem = { id: number; nama: string; cabang: { id: number; nama: string }[] };
	const konteksList = $derived((data.konteksList ?? []) as TokoItem[]);
	let pindahToko = $state(false);
	let bukaPicker = $state(false);
	let pickerRef = $state<HTMLDivElement>();
	const tokoAktifNama = $derived(
		konteksList.find((t) => t.id === data.user?.tenant_id)?.nama ?? 'Toko ini'
	);

	async function pindah(tokoId: number) {
		bukaPicker = false;
		if (pindahToko || tokoId === data.user?.tenant_id) return;
		pindahToko = true;
		const res = await api.post('/auth/switch-context', { toko_id: tokoId, cabang_id: null });
		if (res.success) location.reload();
		else pindahToko = false;
	}

	// Step 1 — profil toko
	let namaToko = $state('');
	let alamat = $state('');
	let telepon = $state('');

	// Step 1 — undang karyawan
	let kodeKaryawan = $state('');
	let namaKaryawan = $state('');
	let username = $state('');
	let password = $state('');
	let role = $state<'kasir' | 'gudang' | 'manajer'>('kasir');

	// Step 2 — data contoh
	let isiDemo = $state(true);

	function tutupPickerLuar(e: MouseEvent) {
		if (bukaPicker && pickerRef && !pickerRef.contains(e.target as Node)) bukaPicker = false;
	}

	$effect(() => {
		document.addEventListener('click', tutupPickerLuar);
		return () => document.removeEventListener('click', tutupPickerLuar);
	});

	onMount(async () => {
		// Nama toko asli dari registrasi (kolom toko.nama) — sumber kebenaran.
		const namaTokoAsli = konteksList.find((t) => t.id === data.user?.tenant_id)?.nama ?? '';

		if (sukses) return; // sudah selesai → tak perlu muat data wizard
		const res = await api.get<Record<string, string>>('/pengaturan');
		if (res.success) {
			// toko_settings.nama_toko default 'Stokasir' (belum diisi saat daftar) →
			// pakai nama toko asli supaya konsisten dengan picker.
			const setNama = res.data.nama_toko;
			namaToko = setNama && setNama !== 'Stokasir' ? setNama : namaTokoAsli || setNama || '';
			alamat = res.data.alamat ?? '';
			telepon = res.data.telepon ?? '';

			if (namaToko == 'Toko Demo') {
				step = 2;
				isiDemo = true;
			}
		}
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
			{
				loadingKey: 'ob-profil',
				suksesOtomatis: true,
				suksesPesan: 'Profil toko disimpan',
				modul: 'pengaturan',
				aksi: 'simpan profil onboarding'
			}
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
			{
				loadingKey: 'ob-karyawan',
				suksesOtomatis: true,
				suksesPesan: 'Karyawan diundang',
				modul: 'karyawan',
				aksi: 'undang karyawan onboarding'
			}
		);
		menyimpan = false;
		return !!hasil;
	}

	async function selesai() {
		menyimpan = true;
		const hasil = await withLoading(
			async () => {
				const res = await api.post('/pengaturan/bulk', { onboarding_selesai: 'true' });
				if (!res.success) throw new Error(res.error);
				if (isiDemo) {
					// Mode demo = sandbox toko terpisah. Generate lalu masuk konteks demo.
					// Toko asli tetap bersih; keluar mode demo = switch balik ke home_tenant.
					const statusDemo = await api.get<{ exists: boolean; toko_id?: number }>('/demo/status');
					let demoTokoId: number | null =
						statusDemo.success && statusDemo.data.exists ? (statusDemo.data.toko_id ?? null) : null;
					if (!demoTokoId) {
						const gen = await api.post<{ toko_id: number }>('/demo/generate', {});
						if (!gen.success) throw new Error(gen.error);
						demoTokoId = gen.data.toko_id;
					}
					if (data.user?.tenant_id)
						localStorage.setItem('home_tenant', String(data.user.tenant_id));
					const sw = await api.post('/auth/switch-context', {
						toko_id: demoTokoId,
						cabang_id: null
					});
					if (!sw.success) throw new Error(sw.error);
					return 'demo';
				}
				return true;
			},
			{
				loadingKey: 'ob-selesai',
				loadingPesan: 'Menyelesaikan…',
				suksesOtomatis: true,
				suksesPesan: 'Selamat datang di Stokasir!',
				modul: 'pengaturan',
				aksi: 'selesai onboarding'
			}
		);
		menyimpan = false;
		if (hasil === 'demo') {
			location.href = '/kasir';
			return;
		}
		if (hasil) sukses = true;
	}

	async function lanjut() {
		let ok = true;
		if (step === 0) ok = await simpanProfil();
		else if (step === 1) ok = await simpanKaryawan();
		if (ok && step < LANGKAH.length - 1) step += 1;
	}

	function lewati() {
		if (step < LANGKAH.length - 1) step += 1;
	}
</script>

<div class="w-full">
	{#if konteksList.length > 1}
		<div class="mb-3 flex justify-center border-b pb-3" style="border-color:var(--border)">
			<div class="relative" bind:this={pickerRef}>
				<button
					type="button"
					disabled={pindahToko}
					onclick={() => (bukaPicker = !bukaPicker)}
					class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-opacity disabled:opacity-50"
					style="background:var(--surface);border-color:var(--border);color:var(--text)"
					title="Pindah toko"
				>
					<Store size={14} color="var(--accent)" />
					<span class="max-w-[10rem] truncate font-medium">{tokoAktifNama}</span>
					<ChevronDown size={14} color="var(--text-dim)" />
				</button>
				{#if bukaPicker}
					<div
						class="absolute right-0 z-20 mt-1 max-h-64 min-w-[13rem] overflow-auto rounded border py-1 shadow-lg"
						style="background:var(--surface);border-color:var(--border)"
					>
						<p
							class="px-3 py-1 text-[0.65rem] tracking-wide uppercase"
							style="color:var(--text-dim)"
						>
							Pindah ke toko lain
						</p>
						{#each konteksList as t (t.id)}
							{@const aktif = t.id === data.user?.tenant_id}
							<button
								type="button"
								onclick={() => pindah(t.id)}
								class="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-[var(--surface2)]"
								style={aktif ? 'color:var(--accent)' : 'color:var(--text)'}
							>
								<span class="truncate">{t.nama}</span>
								{#if aktif}<Check size={14} color="var(--accent)" />{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}

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

		<div class="my-4 overflow-x-auto">
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
			<SectionCard judul="Undang Karyawan">
				<p class="mb-3 text-xs" style="color:var(--text-dim)">
					Opsional — tambah kasir/gudang sekarang atau nanti.
				</p>
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
			<SectionCard judul="Mode Demo">
				<label class="flex cursor-pointer items-start gap-3">
					<input type="checkbox" class="checkbox mt-0.5 checkbox-sm" bind:checked={isiDemo} />
					<span class="text-sm">
						Coba fitur dengan data contoh di toko demo terpisah.
						<span class="mt-1 block text-xs" style="color:var(--text-dim)">
							Toko Anda tetap bersih. Selesai onboarding langsung masuk mode demo — keluar kapan
							saja untuk kembali ke toko asli.
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
					<Button variant="primary" loading={menyimpan} disabled={menyimpan} onclick={lanjut}
						>Lanjut</Button
					>
				{:else}
					<Button variant="primary" loading={menyimpan} disabled={menyimpan} onclick={selesai}
						>Selesai</Button
					>
				{/if}
			</div>
		</div>
	{/if}
</div>
