<script lang="ts">
	import { onMount } from 'svelte';
	import { connectScannerRelay, type ScannerRelayHandle } from '$lib/utils/scannerSse';

	type Status = 'ready' | 'error' | 'no_session';
	type Detector = { detect(v: HTMLVideoElement): Promise<{ rawValue: string }[]> };

	let sessionId = $state('');
	let status = $state<Status>('ready');
	let statusMsg = $state('Siap scan...');
	let lastScan = $state('');
	let lastQty = $state(1);
	let qty = $state(1);
	let isCounterShow = $state(true);

	// Sync qty dua arah dengan kasir.store dummyJumlah via scan-relay
	let _lastSyncedQtyFromKasir = 1;
	let relayHandle: ScannerRelayHandle | null = null;

	// Kirim qty update saat qty berubah (debounced, skip jika datang dari kasir)
	$effect(() => {
		const currentQty = qty;
		if (currentQty === _lastSyncedQtyFromKasir || !sessionId) return;
		const timer = setTimeout(() => {
			_lastSyncedQtyFromKasir = currentQty;
			relayHandle?.sendQty(currentQty);
		}, 300);
		return () => clearTimeout(timer);
	});
	let scanFlash = $state(false);
	let camError = $state('');
	let polyfillLoading = $state(false);

	let videoEl = $state<HTMLVideoElement>();
	let stream: MediaStream | null = null;
	let lastScanTime = 0;
	let lockedKode: string | null = null;
	let absenceTimer: ReturnType<typeof setTimeout> | null = null;
	let cameraIdle = $state(false);
	let idleTimer: ReturnType<typeof setInterval> | null = null;
	let audioCtx: AudioContext | null = null;

	const STATUS_COLOR: Record<Status, string> = {
		ready: '#00e676',
		error: '#ff5252',
		no_session: '#ff5252'
	};

	function resetIdle() {
		lastScanTime = Date.now();
	}

	function playBeep() {
		try {
			audioCtx ??= new AudioContext();
			if (audioCtx.state === 'suspended') audioCtx.resume();
			const osc = audioCtx.createOscillator();
			const gain = audioCtx.createGain();
			osc.connect(gain);
			gain.connect(audioCtx.destination);
			osc.type = 'sine';
			osc.frequency.value = 1800;
			gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
			gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
			osc.start();
			osc.stop(audioCtx.currentTime + 0.08);
		} catch {
			/* unsupported */
		}
		navigator.vibrate?.(40);
	}

	function pauseCamera() {
		stream?.getTracks().forEach((t) => t.stop());
		stream = null;
		cameraIdle = true;
		if (idleTimer) {
			clearInterval(idleTimer);
			idleTimer = null;
		}
	}

	function startIdleTimer() {
		if (idleTimer) clearInterval(idleTimer);
		idleTimer = setInterval(() => {
			if (stream?.active && Date.now() - lastScanTime > 60_000) pauseCamera();
		}, 5000);
	}

	async function resumeCamera() {
		cameraIdle = false;
		lastScanTime = Date.now();
		await startCamera();
	}

	onMount(() => {
		sessionId = new URLSearchParams(window.location.search).get('s') ?? '';

		if (!sessionId) {
			status = 'no_session';
			statusMsg = 'Session ID tidak valid — buka ulang dari kasir';
			return;
		}

		document.addEventListener('touchstart', resetIdle, { passive: true });
		startCamera();

		// Terima update qty dari kasir (WS cloud / long-poll LAN). Kamera boleh dijeda,
		// koneksi relay tetap hidup terpisah.
		relayHandle = connectScannerRelay(sessionId, {
			onQty: (received) => {
				if (received !== qty) {
					_lastSyncedQtyFromKasir = received;
					qty = received;
				}
			}
		});

		return () => {
			document.removeEventListener('touchstart', resetIdle);
			stream?.getTracks().forEach((t) => t.stop());
			if (idleTimer) clearInterval(idleTimer);
			if (absenceTimer) clearTimeout(absenceTimer);
			audioCtx?.close();
			relayHandle?.close();
		};
	});

	async function kirimScan(kode: string, sentQty: number) {
		for (let attempt = 0; attempt < 2; attempt++) {
			if (attempt > 0) {
				statusMsg = 'Mengirim ulang...';
				await new Promise((r) => setTimeout(r, 2000));
			}
			try {
				const res = await fetch(`/api/scan-relay/scanner/${sessionId}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ kode, qty: sentQty })
				});
				if (res.ok) {
					status = 'ready';
					statusMsg = 'Siap scan...';
					return;
				}
				if ((res.status === 404 || res.status === 503) && attempt === 0) continue;
				status = 'error';
				statusMsg =
					res.status === 404
						? 'Session tidak valid — scan ulang QR dari kasir'
						: res.status === 503
							? 'Kasir belum terhubung — coba lagi'
							: 'Gagal kirim scan';
				return;
			} catch {
				if (attempt === 0) {
					statusMsg = 'Mengirim ulang...';
					continue;
				}
				status = 'error';
				statusMsg = 'Tidak bisa terhubung ke server';
			}
		}
	}

	async function startCamera() {
		if (!navigator.mediaDevices?.getUserMedia) {
			camError = 'http_block';
			return;
		}
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
			});
			videoEl!.srcObject = stream;
			await videoEl!.play();
			lastScanTime = Date.now();
			startIdleTimer();
			scanLoop();
		} catch (e: unknown) {
			const name = e instanceof DOMException ? e.name : '';
			camError = name === 'NotAllowedError' ? 'permission_denied' : 'camera_error';
		}
	}

	async function getDetector(): Promise<Detector> {
		const formats = ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code'];
		if ('BarcodeDetector' in window) {
			const Native = (window as unknown as { BarcodeDetector: new (o: object) => Detector })
				.BarcodeDetector;
			return new Native({ formats });
		}
		polyfillLoading = true;
		const { BarcodeDetector } = await import('barcode-detector/pure');
		polyfillLoading = false;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return new BarcodeDetector({ formats: formats as any }) as Detector;
	}

	async function scanLoop() {
		const detector = await getDetector();

		while (stream?.active) {
			await new Promise((r) => requestAnimationFrame(r));
			if (!videoEl || videoEl.readyState < 2) continue;
			try {
				const barcodes = await detector.detect(videoEl);
				if (barcodes.length > 0) {
					const kode = barcodes[0]!.rawValue;
					if (kode === lockedKode) {
						// Barcode sama masih terlihat — batalkan absence timer
						if (absenceTimer) {
							clearTimeout(absenceTimer);
							absenceTimer = null;
						}
					} else if (!lockedKode) {
						// Tidak sedang locked — scan langsung
						lockedKode = kode;
						lastScanTime = Date.now();
						lastScan = kode;
						lastQty = qty;
						const sentQty = qty;
						qty = 1;
						scanFlash = true;
						playBeep();
						setTimeout(() => (scanFlash = false), 350);
						kirimScan(kode, sentQty);
					}
					// Barcode beda saat locked → biarkan absence timer jalan
				} else {
					// Tidak ada barcode — mulai absence timer jika sedang locked
					if (lockedKode && !absenceTimer) {
						absenceTimer = setTimeout(() => {
							lockedKode = null;
							absenceTimer = null;
						}, 300);
					}
				}
			} catch {
				// frame not ready, skip
			}
		}
	}
</script>

<svelte:head>
	<title>Scanner HP</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
</svelte:head>

<div class="fixed inset-0 flex flex-col" style="background:#000;color:#d4d4d4;">
	<!-- Status bar -->
	<div
		class="z-10 flex shrink-0 items-center gap-2 px-4 py-2 text-sm"
		style="background:rgba(0,0,0,0.75)"
	>
		<span
			class="h-2 w-2 shrink-0 rounded-full"
			style="background:{STATUS_COLOR[status]};box-shadow:0 0 6px {STATUS_COLOR[status]}"
		>
		</span>
		<span>{statusMsg}</span>
		{#if sessionId}
			<span class="ml-auto text-xs opacity-50">#{sessionId}</span>
		{/if}
	</div>

	<!-- Kamera / error state -->
	{#if camError === 'http_block'}
		<div class="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-8">
			<p class="mt-4 text-center text-2xl">🔒</p>
			<p class="text-center text-sm" style="color:#ffb300">
				Kamera diblokir — halaman diakses via HTTP
			</p>

			<div
				class="rounded-lg p-4 text-sm"
				style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1)"
			>
				<p class="mb-2 font-bold" style="color:#00e676">
					Opsi 1 — Pakai Chrome di HP (paling mudah)
				</p>
				<p class="text-xs leading-relaxed opacity-70">
					Chrome/Chromium mengizinkan kamera di jaringan lokal (LAN) meski HTTP. Buka halaman ini
					dengan Chrome lalu izinkan akses kamera saat diminta.
				</p>
			</div>

			<div
				class="rounded-lg p-4 text-sm"
				style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1)"
			>
				<p class="mb-2 font-bold" style="color:#40c4ff">Opsi 2 — Firefox: aktifkan manual</p>
				<ol class="list-inside list-decimal space-y-1 text-xs leading-relaxed opacity-70">
					<li>
						Ketik <span class="font-mono" style="color:#fff">about:config</span> di address bar
					</li>
					<li>
						Cari <span class="font-mono" style="color:#fff">media.devices.insecure.enabled</span>
					</li>
					<li>Set ke <span class="font-mono" style="color:#fff">true</span></li>
					<li>Muat ulang halaman ini</li>
				</ol>
			</div>
		</div>
	{:else if camError === 'permission_denied'}
		<div class="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
			<p class="text-4xl">🚫</p>
			<p class="text-sm" style="color:#ff5252">Akses kamera ditolak</p>
			<p class="text-xs leading-relaxed opacity-60">
				Izinkan kamera di pengaturan browser lalu<br />muat ulang halaman ini
			</p>
		</div>
	{:else if camError}
		<div class="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
			<p class="text-4xl">📷</p>
			<p class="text-sm" style="color:#ff5252">Kamera tidak bisa diakses</p>
			<p class="text-xs opacity-60">Periksa apakah kamera sedang dipakai aplikasi lain</p>
		</div>
	{:else if status === 'no_session'}
		<div class="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
			<p class="text-4xl">🔗</p>
			<p class="text-sm" style="color:#ff5252">{statusMsg}</p>
		</div>
	{:else if cameraIdle}
		<!-- Camera paused -->
		<div class="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
			<div class="text-5xl opacity-30">⏸</div>
			<p class="text-sm opacity-40">Kamera dijeda — tidak ada aktivitas selama 1 menit</p>
			<button
				onclick={resumeCamera}
				class="rounded-xl px-8 py-3 text-sm font-bold tracking-wide transition-transform active:scale-95"
				style="background:#00e676;color:#000"
			>
				▶ Aktifkan Kamera
			</button>
			{#if lastScan}
				<p class="mt-2 font-mono text-xs opacity-30">Terakhir: {lastScan}</p>
			{/if}
		</div>
	{:else}
		<!-- relative container: video + overlays -->
		<div class="relative min-h-0 flex-1">
			<!-- Video feed -->
			<video
				bind:this={videoEl}
				autoplay
				playsinline
				muted
				class="absolute inset-0 h-full w-full object-cover"
			></video>

			<!-- Viewfinder overlay -->
			<div class="absolute inset-0 flex items-center justify-center">
				<div class="relative">
					<div
						class="pointer-events-none flex h-40 w-64 items-end justify-center rounded-lg pb-2"
						style="box-shadow:0 0 0 9999px rgba(0,0,0,0.45);border:2px solid {scanFlash
							? '#00e676'
							: 'rgba(255,255,255,0.4)'}; transition:border-color 0.1s"
					>
						{#if polyfillLoading}
							<span
								class="rounded px-2 py-0.5 text-xs"
								style="background:rgba(0,0,0,0.7);color:#ffb300"
							>
								memuat scanner...
							</span>
						{/if}
					</div>
					<button
						onclick={() => (isCounterShow = !isCounterShow)}
						class="absolute -top-4 -right-4 flex h-10 w-10 items-center justify-center rounded-full font-mono font-bold transition-all active:scale-90"
						style="background:{isCounterShow
							? '#ff5252'
							: '#00e676'};color:#000;font-size:{isCounterShow ? '18px' : '14px'}"
					>
						{isCounterShow ? '×' : qty}
					</button>
				</div>
			</div>

			<!-- Last scan result -->
			{#if lastScan}
				<div
					class="absolute right-0 bottom-0 left-0 z-10 px-4 py-3 text-center transition-all"
					style="background:rgba(0,0,0,0.8)"
				>
					<p class="mb-0.5 text-xs opacity-60">Terakhir discan</p>
					<p
						class="font-mono text-lg font-bold tracking-widest transition-colors"
						style="color:{scanFlash ? '#00e676' : '#d4d4d4'}"
					>
						{lastScan}
					</p>
					{#if lastQty > 1}
						<p class="font-mono text-sm font-bold" style="color:#00e676">×{lastQty}</p>
					{/if}
					{#if status === 'error'}
						<p class="mt-1 text-xs" style="color:#ff5252">{statusMsg}</p>
					{/if}
				</div>
			{:else}
				<div
					class="absolute right-0 bottom-0 left-0 z-10 px-4 py-3 text-center"
					style="background:rgba(0,0,0,0.5)"
				>
					<p class="text-xs opacity-50">Arahkan ke barcode produk</p>
				</div>
			{/if}
		</div>

		<!-- Counter panel (dismissible) -->
		{#if isCounterShow}
			<div
				class="shrink-0"
				style="display:grid;grid-template-columns:25% 50% 25%;grid-template-rows:1fr 1fr;height:50vw;background:#000;border-top:2px solid #00e676"
			>
				<!-- col1 row1: -1 -->
				<button
					onclick={() => (qty = Math.max(1, qty - 1))}
					style="grid-column:1;grid-row:1;background:#1a1a00;color:#fff;font-size:7vw;font-weight:900;border-right:2px solid #333;border-bottom:2px solid #333"
				>
					−1
				</button>

				<!-- col2 rows 1-2: label + counter + reset hint -->
				<div
					style="grid-column:2;grid-row:1/3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;background:#0a0a0a;border-right:2px solid #333"
				>
					<span style="font-size:3vw;color:#666;letter-spacing:0.15em;text-transform:uppercase"
						>Jumlah</span
					>
					<button
						onclick={() => (qty = 1)}
						style="font-size:20vw;font-weight:900;color:#00e676;line-height:1;background:none;border:none;text-shadow:0 0 20px rgba(0,230,118,0.6)"
					>
						{qty}
					</button>
					<span style="font-size:3vw;color:#444">tap to reset</span>
				</div>

				<!-- col3 row1: +1 -->
				<button
					onclick={() => (qty = Math.min(qty + 1, 999))}
					style="grid-column:3;grid-row:1;background:#001a0a;color:#fff;font-size:7vw;font-weight:900;border-bottom:2px solid #333"
				>
					+1
				</button>

				<!-- col1 row2: -10 -->
				<button
					onclick={() => (qty = Math.max(1, qty - 10))}
					style="grid-column:1;grid-row:2;background:#111;color:#aaa;font-size:5.5vw;font-weight:700;border-right:2px solid #333"
				>
					−10
				</button>

				<!-- col3 row2: +10 -->
				<button
					onclick={() => (qty = Math.min(qty + 10, 999))}
					style="grid-column:3;grid-row:2;background:#111;color:#aaa;font-size:5.5vw;font-weight:700"
				>
					+10
				</button>
			</div>
		{/if}
	{/if}
</div>
