<script lang="ts">
	import { onMount } from 'svelte';
	import X from '@lucide/svelte/icons/x';

	type Phase = 'select' | 'pin' | 'loading' | 'confirm' | 'success' | 'error';
	type StatusHariIni = 'belum' | 'masuk' | 'selesai';
	type AuthMode = 'pin' | 'password';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let phase = $state<Phase>('select');
	let karyawanList = $state<{ id: number; nama: string; has_pin: boolean }[]>([]);
	let selected = $state<{ id: number; nama: string } | null>(null);
	let digits = $state('');
	let passwordInput = $state('');
	let authMode = $state<AuthMode>('pin');
	let statusHariIni = $state<StatusHariIni>('belum');
	let pesan = $state('');
	let jam = $state('');
	let tgl = $state('');
	let resetTimer: ReturnType<typeof setTimeout> | null = null;
	let clockInterval: ReturnType<typeof setInterval> | null = null;

	function updateClock() {
		const now = new Date();
		jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
		tgl = now.toLocaleDateString('id-ID', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	async function muatKaryawan() {
		try {
			const res = await fetch('/api/absensi-kiosk/karyawan');
			const json = await res.json();
			if (json.success) karyawanList = json.data;
		} catch {
			/* silent */
		}
	}

	$effect(() => {
		if (open) {
			updateClock();
			muatKaryawan();
			clockInterval = setInterval(updateClock, 1000);
		} else {
			if (clockInterval) clearInterval(clockInterval);
			clockInterval = null;
			reset(false);
		}
	});

	onMount(() => {
		return () => {
			if (clockInterval) clearInterval(clockInterval);
			if (resetTimer) clearTimeout(resetTimer);
		};
	});

	function pilihKaryawan(k: { id: number; nama: string; has_pin: boolean }) {
		selected = k;
		digits = '';
		passwordInput = '';
		authMode = k.has_pin ? 'pin' : 'password';
		phase = 'pin';
	}

	function switchMode() {
		authMode = authMode === 'pin' ? 'password' : 'pin';
		digits = '';
		passwordInput = '';
	}

	function tapDigit(d: string) {
		if (phase !== 'pin' || authMode !== 'pin') return;
		if (digits.length >= 4) return;
		digits += d;
		if (digits.length === 4) verifyPin();
	}

	function tapBackspace() {
		if (phase !== 'pin' || authMode !== 'pin') return;
		digits = digits.slice(0, -1);
	}

	function reset(reloadList = false) {
		if (resetTimer) clearTimeout(resetTimer);
		phase = 'select';
		selected = null;
		digits = '';
		passwordInput = '';
		pesan = '';
		if (reloadList) muatKaryawan();
	}

	function scheduleReset(ms: number, reloadList = false) {
		if (resetTimer) clearTimeout(resetTimer);
		resetTimer = setTimeout(() => reset(reloadList), ms);
	}

	async function verifyPin() {
		if (!selected) return;
		phase = 'loading';
		try {
			const res = await fetch('/api/absensi-kiosk/check-pin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ karyawan_id: selected.id, pin: digits })
			});
			const json = await res.json();
			digits = '';
			if (!json.success) throw new Error(json.error ?? 'PIN salah');
			statusHariIni = json.data.status_hari_ini;
			phase = 'confirm';
		} catch (e) {
			pesan = e instanceof Error ? e.message : 'Terjadi kesalahan';
			digits = '';
			phase = 'error';
			scheduleReset(2500);
		}
	}

	async function verifyPassword() {
		if (!selected || !passwordInput) return;
		phase = 'loading';
		try {
			const res = await fetch('/api/absensi-kiosk/check-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ karyawan_id: selected.id, password: passwordInput })
			});
			const json = await res.json();
			passwordInput = '';
			if (!json.success) throw new Error(json.error ?? 'Password salah');
			statusHariIni = json.data.status_hari_ini;
			phase = 'confirm';
		} catch (e) {
			pesan = e instanceof Error ? e.message : 'Terjadi kesalahan';
			passwordInput = '';
			phase = 'error';
			scheduleReset(2500);
		}
	}

	async function doMasuk() {
		if (!selected) return;
		phase = 'loading';
		try {
			const res = await fetch('/api/absensi-kiosk/masuk', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ karyawan_id: selected.id })
			});
			const json = await res.json();
			if (!json.success) throw new Error(json.error);
			pesan = `Selamat datang, ${selected.nama}!`;
			phase = 'success';
			scheduleReset(4000, true);
		} catch (e) {
			pesan = e instanceof Error ? e.message : 'Gagal clock in';
			phase = 'error';
			scheduleReset(2500);
		}
	}

	async function doPulang() {
		if (!selected) return;
		phase = 'loading';
		try {
			const res = await fetch('/api/absensi-kiosk/pulang', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ karyawan_id: selected.id })
			});
			const json = await res.json();
			if (!json.success) throw new Error(json.error);
			pesan = `Sampai jumpa, ${selected.nama}!`;
			phase = 'success';
			scheduleReset(4000, true);
		} catch (e) {
			pesan = e instanceof Error ? e.message : 'Gagal clock out';
			phase = 'error';
			scheduleReset(2500);
		}
	}

	function handleKey(e: KeyboardEvent) {
		if (!open) return;
		if (phase === 'pin' && authMode === 'pin' && e.key >= '0' && e.key <= '9') tapDigit(e.key);
		else if (phase === 'pin' && authMode === 'pin' && e.key === 'Backspace') tapBackspace();
		else if (e.key === 'Escape') {
			if (phase === 'select') open = false;
			else reset();
		}
	}

	const pinSlots = $derived(Array.from({ length: 4 }, (_, i) => (i < digits.length ? '●' : '○')));
</script>

<svelte:window onkeydown={handleKey} />

{#if open}
	<!-- Overlay -->
	<div
		class="fixed inset-0 z-[60] bg-black/60"
		style="backdrop-filter:blur(4px);"
		onclick={() => { if (phase === 'select') open = false; }}
		role="presentation"
	></div>

	<!-- Modal -->
	<div
		class="fixed inset-0 z-[61] flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-label="Absensi Kiosk"
	>
		<div
			class="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl shadow-2xl"
			style="background:var(--bg);color:var(--text);max-height:90svh;"
		>
			<!-- Header -->
			<div
				class="flex shrink-0 items-center justify-between border-b px-5 py-3"
				style="border-color:var(--border)"
			>
				<div class="text-sm font-bold tracking-wider" style="color:var(--text-dim)">
					ABSENSI KARYAWAN
				</div>
				<div class="flex items-center gap-4">
					<span class="text-sm capitalize" style="color:var(--text-dim)">{tgl}</span>
					<span class="text-lg font-bold tracking-widest" style="color:var(--accent)">{jam}</span>
					<button
						onclick={() => (open = false)}
						class="rounded p-1 active:opacity-60"
						aria-label="Tutup"
					>
						<X size={16} />
					</button>
				</div>
			</div>

			<!-- Konten -->
			<div class="flex flex-1 items-center justify-center overflow-y-auto p-6">
				{#if phase === 'select'}
					<div class="flex w-full flex-col items-center gap-4">
						<p class="text-sm" style="color:var(--text-dim)">Pilih nama Anda</p>
						{#if karyawanList.length === 0}
							<p class="text-xs" style="color:var(--text-dim)">Belum ada karyawan aktif.</p>
						{:else}
							<div class="grid w-full grid-cols-2 gap-3">
								{#each karyawanList as k (k.id)}
									<button
										onclick={() => pilihKaryawan(k)}
										class="rounded-xl px-4 py-5 text-center text-base font-bold transition-all active:scale-95"
										style="background:var(--surface);border:1px solid var(--border);color:var(--text)"
									>
										{k.nama}
									</button>
								{/each}
							</div>
						{/if}
					</div>

				{:else if phase === 'pin' || (phase === 'loading' && digits === '' && passwordInput === '')}
					<div class="flex flex-col items-center gap-5">
						<div class="text-center">
							<p class="mb-1 text-xs" style="color:var(--text-dim)">
								{authMode === 'pin' ? 'Masuk PIN untuk' : 'Masuk password untuk'}
							</p>
							<p class="text-2xl font-bold">{selected?.nama}</p>
						</div>

						{#if authMode === 'pin'}
							<div class="flex gap-4">
								{#each pinSlots as slot, i (i)}
									<span
										class="text-4xl font-bold"
										style="color:{slot === '●' ? 'var(--accent)' : 'var(--border)'}">{slot}</span
									>
								{/each}
							</div>
							<div class="grid grid-cols-3 gap-3">
								{#each ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'] as key, i (i)}
									{#if key === ''}
										<div></div>
									{:else}
										<button
											onclick={() => (key === '⌫' ? tapBackspace() : tapDigit(key))}
											disabled={phase === 'loading'}
											class="flex items-center justify-center rounded-xl text-2xl font-bold transition-all active:scale-95"
											style="width:80px;height:80px;background:var(--surface);border:1px solid var(--border);color:var(--text)"
											>{key}</button
										>
									{/if}
								{/each}
							</div>
						{:else}
							<input
								type="password"
								bind:value={passwordInput}
								onkeydown={(e) => { if (e.key === 'Enter') verifyPassword(); }}
								placeholder="Masukkan password"
								disabled={phase === 'loading'}
								class="w-64 rounded-xl px-4 py-3 text-center text-lg tracking-widest"
								style="background:var(--surface);border:1px solid var(--border);color:var(--text);outline:none"
							/>
							<button
								onclick={verifyPassword}
								disabled={phase === 'loading' || !passwordInput}
								class="rounded-xl px-10 py-4 text-base font-bold transition-all active:scale-95 disabled:opacity-40"
								style="background:var(--accent);color:var(--bg)"
							>
								Masuk
							</button>
						{/if}

						<button onclick={switchMode} class="text-xs" style="color:var(--text-dim)">
							{authMode === 'pin' ? 'Gunakan password' : 'Gunakan PIN'}
						</button>
						<button onclick={() => reset()} class="text-xs" style="color:var(--text-dim)"
							>← Kembali pilih nama</button
						>
					</div>

				{:else if phase === 'loading'}
					<p class="animate-pulse text-sm" style="color:var(--text-dim)">Memproses...</p>

				{:else if phase === 'confirm'}
					<div class="flex flex-col items-center gap-5 text-center">
						<div
							class="flex items-center justify-center rounded-full text-2xl font-bold"
							style="width:80px;height:80px;background:var(--surface2);color:var(--accent)"
						>
							{selected?.nama
								.trim()
								.split(/\s+/)
								.slice(0, 2)
								.map((w) => w[0])
								.join('')
								.toUpperCase()}
						</div>
						<div>
							<p class="text-2xl font-bold">{selected?.nama}</p>
							<p class="mt-1 text-xs" style="color:var(--text-dim)">
								{#if statusHariIni === 'belum'}Belum absen hari ini
								{:else if statusHariIni === 'masuk'}Sudah masuk — siap pulang
								{:else}Sudah selesai hari ini{/if}
							</p>
						</div>
						<div class="flex gap-3">
							{#if statusHariIni === 'belum'}
								<button
									onclick={doMasuk}
									class="rounded-xl px-10 py-4 text-lg font-bold active:scale-95"
									style="background:var(--accent);color:var(--bg)">MASUK</button
								>
							{:else if statusHariIni === 'masuk'}
								<button
									onclick={doPulang}
									class="rounded-xl px-10 py-4 text-lg font-bold active:scale-95"
									style="background:var(--warn);color:var(--bg)">PULANG</button
								>
							{:else}
								<div
									class="rounded-xl px-10 py-4 text-sm font-bold"
									style="background:var(--surface2);color:var(--text-dim)"
								>
									Sudah selesai hari ini
								</div>
							{/if}
							<button
								onclick={() => reset()}
								class="rounded-xl px-5 py-4 text-sm"
								style="background:var(--surface);border:1px solid var(--border);color:var(--text-dim)"
								>Batal</button
							>
						</div>
					</div>

				{:else if phase === 'success'}
					<div class="flex flex-col items-center gap-3 text-center">
						<div class="text-7xl font-bold" style="color:var(--accent)">✓</div>
						<div class="text-xl font-bold">{pesan}</div>
						<div class="text-xs" style="color:var(--text-dim)">Layar akan reset otomatis...</div>
					</div>

				{:else if phase === 'error'}
					<div class="flex flex-col items-center gap-3 text-center">
						<div class="text-7xl font-bold" style="color:var(--danger)">✗</div>
						<div class="text-xl font-bold" style="color:var(--danger)">{pesan}</div>
						<div class="text-xs" style="color:var(--text-dim)">Kembali otomatis...</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
