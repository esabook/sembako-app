<script lang="ts">
	import { onMount } from 'svelte';

	type Phase = 'select' | 'pin' | 'loading' | 'confirm' | 'success' | 'error';
	type StatusHariIni = 'belum' | 'masuk' | 'selesai';

	let phase = $state<Phase>('select');
	let karyawanList = $state<{ id: number; nama: string }[]>([]);
	let selected = $state<{ id: number; nama: string } | null>(null);
	let digits = $state('');
	let statusHariIni = $state<StatusHariIni>('belum');
	let pesan = $state('');
	let jam = $state('');
	let tgl = $state('');
	let resetTimer: ReturnType<typeof setTimeout> | null = null;

	function updateClock() {
		const now = new Date();
		jam = now.toLocaleTimeString('id-ID', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
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

	onMount(() => {
		updateClock();
		muatKaryawan();
		const id = setInterval(updateClock, 1000);
		return () => clearInterval(id);
	});

	function pilihKaryawan(k: { id: number; nama: string }) {
		selected = k;
		digits = '';
		phase = 'pin';
	}

	function tapDigit(d: string) {
		if (phase !== 'pin') return;
		if (digits.length >= 4) return;
		digits += d;
		if (digits.length === 4) verifyPin();
	}

	function tapBackspace() {
		if (phase !== 'pin') return;
		digits = digits.slice(0, -1);
	}

	function reset(reloadList = false) {
		if (resetTimer) clearTimeout(resetTimer);
		phase = 'select';
		selected = null;
		digits = '';
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

	const pinSlots = $derived(Array.from({ length: 4 }, (_, i) => (i < digits.length ? '●' : '○')));
</script>

<svelte:window
	onkeydown={(e) => {
		if (phase === 'pin' && e.key >= '0' && e.key <= '9') tapDigit(e.key);
		else if (phase === 'pin' && e.key === 'Backspace') tapBackspace();
		else if (e.key === 'Escape') reset();
	}}
/>

<div class="flex min-h-screen flex-col" style="background:var(--bg);color:var(--text);">
	<!-- Header: jam & tanggal -->
	<div
		class="flex items-center justify-between border-b px-6 py-3"
		style="border-color:var(--border)"
	>
		<div class="text-sm font-bold tracking-wider" style="color:var(--text-dim)">
			ABSENSI KARYAWAN
		</div>
		<div class="flex items-center gap-4">
			<span class="text-sm capitalize" style="color:var(--text-dim)">{tgl}</span>
			<span class="text-xl font-bold tracking-widest" style="color:var(--accent)">{jam}</span>
		</div>
	</div>

	<!-- Konten utama -->
	<div class="flex flex-1 items-center justify-center p-6">
		<!-- ── PILIH NAMA ─────────────────────────────────────────────────── -->
		{#if phase === 'select'}
			<div class="flex w-full max-w-lg flex-col items-center gap-4">
				<p class="text-sm" style="color:var(--text-dim)">Pilih nama Anda</p>
				{#if karyawanList.length === 0}
					<p class="text-xs" style="color:var(--text-dim)">
						Belum ada karyawan dengan PIN. Atur PIN di halaman Karyawan.
					</p>
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

			<!-- ── MASUK PIN ──────────────────────────────────────────────────── -->
		{:else if phase === 'pin' || (phase === 'loading' && digits === '')}
			<div class="flex flex-col items-center gap-5">
				<div class="text-center">
					<p class="mb-1 text-xs" style="color:var(--text-dim)">Masuk PIN untuk</p>
					<p class="text-2xl font-bold">{selected?.nama}</p>
				</div>

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

				<button onclick={() => reset()} class="mt-1 text-xs" style="color:var(--text-dim)"
					>← Kembali pilih nama</button
				>
			</div>

			<!-- ── LOADING ────────────────────────────────────────────────────── -->
		{:else if phase === 'loading'}
			<p class="animate-pulse text-sm" style="color:var(--text-dim)">Memproses...</p>

			<!-- ── KONFIRMASI MASUK / PULANG ─────────────────────────────────── -->
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

			<!-- ── SUKSES ─────────────────────────────────────────────────────── -->
		{:else if phase === 'success'}
			<div class="flex flex-col items-center gap-3 text-center">
				<div class="text-7xl font-bold" style="color:var(--accent)">✓</div>
				<div class="text-xl font-bold">{pesan}</div>
				<div class="text-xs" style="color:var(--text-dim)">Layar akan reset otomatis...</div>
			</div>

			<!-- ── ERROR ──────────────────────────────────────────────────────── -->
		{:else if phase === 'error'}
			<div class="flex flex-col items-center gap-3 text-center">
				<div class="text-7xl font-bold" style="color:var(--danger)">✗</div>
				<div class="text-xl font-bold" style="color:var(--danger)">{pesan}</div>
				<div class="text-xs" style="color:var(--text-dim)">Kembali otomatis...</div>
			</div>
		{/if}
	</div>
</div>
