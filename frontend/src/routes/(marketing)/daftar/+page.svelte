<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { api } from '$lib/utils/api';
	import { toast } from '$lib/stores/ui.store';
	import { bukaDemo } from '$lib/utils/demo-onboard';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';

	let step = $state(1);
	// Pilihan di step-2: daftar penuh vs buka demo langsung.
	let pilihan = $state<'akun' | 'demo'>('akun');

	let showPassword = $state(false);
	let showRePassword = $state(false);

	let email = $state('');
	let password = $state('');
	let re_password = $state('');

	let nama_toko = $state('');
	let nama_pemilik = $state('');
	let wa = $state('');
	let nama_cabang = $state('');

	let loading = $state(false);
	let demoLoading = $state(false);
	let errors = $state<Record<string, string>>({});

	// Prefill dari buku tamu landing: email → step-1, wa → step-2.
	onMount(() => {
		const sp = new URL(window.location.href).searchParams;
		const e = sp.get('email');
		const w = sp.get('wa');
		if (e) email = e;
		if (w) wa = w;
	});

	// Buka demo: akun asli (email+password step-1) + data toko sentinel,
	// lalu langsung masuk sandbox demo. Profil toko diisi nanti di onboarding.
	async function bukaVersiDemo() {
		if (demoLoading) return;
		demoLoading = true;
		const ok = await bukaDemo({
			email,
			password,
			nama_toko: 'StokasirDemo',
			nama_pemilik: email.split('@')[0]?.trim() || 'PemilikDemo',
			wa: wa.trim() || '08000000000'
		});
		if (!ok) demoLoading = false; // sukses → sudah redirect ke '/'
	}

	function validasiStep1(): boolean {
		const e: Record<string, string> = {};
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) e.email = 'Format email tidak valid';
		if (password.length < 6) e.password = 'Password minimal 6 karakter';
		if (password !== re_password) e.re_password = 'Password tidak cocok';
		errors = e;
		return Object.keys(e).length === 0;
	}

	function validasiStep2(): boolean {
		const e: Record<string, string> = {};
		if (!nama_toko.trim()) e.nama_toko = 'Nama toko wajib diisi';
		if (!nama_pemilik.trim()) e.nama_pemilik = 'Nama pemilik wajib diisi';
		if (!/^[0-9+\s-]{8,}$/.test(wa.trim())) e.wa = 'Nomor WA tidak valid';
		errors = e;
		return Object.keys(e).length === 0;
	}

	function lanjut(ev: SubmitEvent) {
		ev.preventDefault();
		if (validasiStep1()) step = 2;
	}

	async function submit(ev: SubmitEvent) {
		ev.preventDefault();
		if (loading || !validasiStep2()) return;
		loading = true;
		const res = await api.post('/auth/daftar', {
			email: email.trim().toLowerCase(),
			password,
			nama_toko: nama_toko.trim(),
			nama_pemilik: nama_pemilik.trim(),
			wa: wa.trim(),
			nama_cabang: nama_cabang.trim() || undefined
		});
		loading = false;
		if (res.success) {
			toast.sukses('Akun toko dibuat. Silakan masuk dengan email Anda.');
			goto('/login');
		} else {
			toast.error(res.error || 'Pendaftaran gagal, coba lagi.');
		}
	}
</script>

<svelte:head>
	<title>Daftar Stokasir</title>
	<meta
		name="description"
		content="Buat akun toko di Stokasir secara gratis dan mulai kelola stok-kasir hari ini."
	/>
</svelte:head>

<section class="mx-auto max-w-md px-4 py-12">
	<h1 class="text-2xl font-bold">Buat akun toko</h1>
	<p class="mt-1 text-sm" style="color:var(--text-dim)">
		Gratis, semua fitur terbuka. Dibatasi kuota penyimpanan &amp; lalu-lintas server.
	</p>

	<!-- step indicator -->
	<div class="mt-4 flex items-center gap-2 text-xs" style="color:var(--text-dim)">
		<span
			class="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
			style={step === 1
				? 'background:var(--accent);color:var(--bg)'
				: 'background:var(--surface2);color:var(--text-dim)'}>1</span
		>
		<span style={step === 1 ? 'color:var(--text)' : ''}>Akun</span>
		<span style="color:var(--border)">—</span>
		<span
			class="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
			style={step === 2
				? 'background:var(--accent);color:var(--bg)'
				: 'background:var(--surface2);color:var(--text-dim)'}>2</span
		>
		<span style={step === 2 ? 'color:var(--text)' : ''}>Info Toko</span>
	</div>

	{#snippet field(
		label: string,
		val: string,
		set: (v: string) => void,
		key: string,
		type = 'text',
		ph = ''
	)}
		<label class="block">
			<span class="mb-1 block text-xs" style="color:var(--text-dim)">{label}</span>
			<input
				{type}
				value={val}
				placeholder={ph}
				oninput={(e) => set((e.target as HTMLInputElement).value)}
				class="input w-full text-sm"
				class:input-error={errors[key]}
			/>
			{#if errors[key]}
				<span class="mt-1 block text-xs text-error">{errors[key]}</span>
			{/if}
		</label>
	{/snippet}

	{#snippet passwordField(
		label: string,
		val: string,
		set: (v: string) => void,
		key: string,
		show: boolean,
		toggleShow: () => void
	)}
		<div class="block">
			<span class="mb-1 block text-xs" style="color:var(--text-dim)">{label}</span>
			<div class="input flex w-full items-center gap-1 p-0" class:input-error={errors[key]}>
				<input
					type={show ? 'text' : 'password'}
					value={val}
					oninput={(e) => set((e.target as HTMLInputElement).value)}
					class="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
				/>
				<button
					type="button"
					onclick={toggleShow}
					class="flex shrink-0 items-center px-2 py-2"
					style="color:var(--text-dim)"
				>
					{#if show}
						<EyeOff size="1rem" />
					{:else}
						<Eye size="1rem" />
					{/if}
				</button>
			</div>
			{#if errors[key]}
				<span class="mt-1 block text-xs text-error">{errors[key]}</span>
			{/if}
		</div>
	{/snippet}

	{#if step === 1}
		<form class="mt-6 flex flex-col gap-4" onsubmit={lanjut}>
			{@render field('Email', email, (v) => (email = v), 'email', 'email', 'nama@gmail.com')}
			{@render passwordField(
				'Password',
				password,
				(v) => (password = v),
				'password',
				showPassword,
				() => (showPassword = !showPassword)
			)}
			{@render passwordField(
				'Ulangi password',
				re_password,
				(v) => (re_password = v),
				're_password',
				showRePassword,
				() => (showRePassword = !showRePassword)
			)}

			<button type="submit" class="btn mt-2 btn-primary"> Lanjut </button>
		</form>
	{:else}
		<div class="mt-6 flex flex-col gap-4">
			<!-- pilihan: daftar penuh vs buka demo -->
			<div class="grid gap-3 sm:grid-cols-2">
				<button
					type="button"
					class="rounded-2xl border p-4 text-left transition-colors"
					style:border-color={pilihan === 'akun' ? 'var(--accent)' : 'var(--border)'}
					onclick={() => (pilihan = 'akun')}
					aria-pressed={pilihan === 'akun'}
				>
					<span class="block text-sm font-semibold">Daftar akun toko</span>
					<span class="mt-1 block text-xs" style="color:var(--text-dim)">
						Isi data toko, langsung punya toko sendiri.
					</span>
				</button>
				<button
					type="button"
					class="rounded-2xl border p-4 text-left transition-colors"
					style:border-color={pilihan === 'demo' ? 'var(--accent)' : 'var(--border)'}
					onclick={() => (pilihan = 'demo')}
					aria-pressed={pilihan === 'demo'}
				>
					<span class="block text-sm font-semibold">Buka versi demo</span>
					<span class="mt-1 block text-xs" style="color:var(--text-dim)">
						Coba dulu pakai data contoh, tanpa isi data toko.
					</span>
				</button>
			</div>

			<div class="dash-h mt-4"></div>

			{#if pilihan === 'akun'}
				<form class="flex flex-col gap-4" onsubmit={submit}>
					{@render field(
						'Nama toko',
						nama_toko,
						(v) => (nama_toko = v),
						'nama_toko',
						'text',
						'Toko Sembako Jaya'
					)}
					{@render field('Nama pemilik', nama_pemilik, (v) => (nama_pemilik = v), 'nama_pemilik')}
					{@render field('No. WhatsApp', wa, (v) => (wa = v), 'wa', 'tel', '08xxxxxxxxxx')}
					{@render field(
						'Nama cabang (opsional)',
						nama_cabang,
						(v) => (nama_cabang = v),
						'nama_cabang',
						'text',
						'Cabang Utama'
					)}

					<div class="flex flex-wrap gap-2">
						<button
							type="button"
							class="btn flex btn-secondary"
							onclick={() => {
								step = 1;
								errors = {};
							}}
						>
							<ChevronLeft size="1rem" />
						</button>
						<button type="submit" class="btn flex-1 btn-primary" disabled={loading}>
							{loading ? 'Memproses…' : 'Daftar & Mulai Gratis'}
						</button>
					</div>
				</form>
			{:else}
				<div class="rounded-2xl border p-4" style="border-color:var(--border)">
					<p class="text-sm" style="color:var(--text-dim)">
						Langsung masuk toko demo berisi data contoh — barang, transaksi, dan laporan siap
						dijelajahi. Tanpa isi data toko dulu. Saat keluar mode demo, kamu bisa lengkapi data
						toko aslimu kapan saja.
					</p>
				</div>

				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						class="btn flex btn-secondary"
						onclick={() => {
							step = 1;
							errors = {};
						}}
					>
						<ChevronLeft size="1rem" />
					</button>
					<button
						type="button"
						class="btn flex-1 btn-primary"
						disabled={demoLoading}
						onclick={bukaVersiDemo}
					>
						{demoLoading ? 'Menyiapkan…' : 'Daftar'}
					</button>
				</div>
			{/if}
		</div>
	{/if}

	<p class="mt-4 text-center text-sm" style="color:var(--text-dim)">
		Sudah punya akun? <a href="/login" class="font-medium" style="color:var(--accent)">Masuk</a>
	</p>
</section>

<style>
	.dash-h {
		display: block;
		top: 50%;
		left: 0;
		right: 0;
		bottom: auto;
		transform: translateY(-50%);
		width: 100%;
		height: 1px;
		background: repeating-linear-gradient(
			to right,
			var(--border) 0px,
			var(--border) 4px,
			transparent 4px,
			transparent 8px
		);
	}
</style>
