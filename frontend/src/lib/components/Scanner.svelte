<script lang="ts">
	import { onMount } from 'svelte';

	let { onDetect, onClose }: { onDetect: (kode: string) => void; onClose?: () => void } = $props();

	let videoEl = $state<HTMLVideoElement | undefined>(undefined);
	let stream = $state<MediaStream | null>(null);
	let statusMsg = $state('Memulai kamera...');
	let scanning = $state(false);
	let polyfillLoading = $state(false);
	let animFrameId: number | null = null;
	let manualInput = $state('');
	let manualInputEl = $state<HTMLInputElement | undefined>(undefined);

	type Detector = { detect(v: HTMLVideoElement): Promise<{ rawValue: string }[]> };

	const ALL_FORMATS = [
		// 2D
		'qr_code', 'data_matrix', 'pdf417', 'aztec',
		// 1D
		'ean_13', 'ean_8', 'upc_a', 'upc_e',
		'code_128', 'code_39', 'code_93', 'codabar', 'itf'
	];

	async function getDetector(): Promise<Detector> {
		if ('BarcodeDetector' in window) {
			// @ts-expect-error - BarcodeDetector belum ada di TypeScript lib
			const supported: string[] = await BarcodeDetector.getSupportedFormats();
			const formats = ALL_FORMATS.filter((f) => supported.includes(f));
			// @ts-expect-error
			return new BarcodeDetector({ formats: formats.length ? formats : ALL_FORMATS });
		}
		polyfillLoading = true;
		const { BarcodeDetector } = await import('barcode-detector/pure');
		polyfillLoading = false;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return new BarcodeDetector({ formats: ALL_FORMATS } as any) as Detector;
	}

	async function start() {
		if (!navigator.mediaDevices?.getUserMedia) {
			statusMsg = 'Kamera tidak tersedia — buka halaman via HTTPS';
			return;
		}
		try {
			stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
			if (!videoEl) return;
			videoEl.srcObject = stream;
			await videoEl.play();
			statusMsg = 'Arahkan kamera ke barcode...';
			scanning = true;
			const detector = await getDetector();
			scanLoop(detector);
		} catch (e) {
			const name = e instanceof DOMException ? e.name : '';
			if (name === 'NotAllowedError') statusMsg = 'Akses kamera ditolak — izinkan di pengaturan browser';
			else if (name === 'NotFoundError') statusMsg = 'Tidak ada kamera yang ditemukan';
			else statusMsg = 'Tidak bisa akses kamera. Periksa izin browser.';
		}
	}

	async function scanLoop(detector: Detector) {
		while (scanning && stream?.active) {
			await new Promise((r) => { animFrameId = requestAnimationFrame(r as FrameRequestCallback); });
			if (!videoEl || videoEl.readyState < 2) continue;
			try {
				const barcodes = await detector.detect(videoEl);
				if (barcodes.length > 0) {
					onDetect(barcodes[0].rawValue);
					stop();
					return;
				}
			} catch {
				// frame not ready, skip
			}
		}
	}

	function stop() {
		scanning = false;
		if (animFrameId !== null) { cancelAnimationFrame(animFrameId); animFrameId = null; }
		stream?.getTracks().forEach((t) => t.stop());
		stream = null;
		onClose?.();
	}

	function submitManual() {
		const kode = manualInput.trim();
		if (!kode) return;
		onDetect(kode);
		stop();
	}

	onMount(() => {
		start();
		return () => {
			scanning = false;
			if (animFrameId !== null) { cancelAnimationFrame(animFrameId); animFrameId = null; }
			stream?.getTracks().forEach((t) => t.stop());
			stream = null;
		};
	});
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') stop(); }} />

<!-- Overlay fullscreen -->
<div
	class="fixed inset-0 z-50 flex flex-col items-center justify-center"
	style="background:rgba(0,0,0,0.92)"
	role="dialog"
	aria-modal="true">

	<div class="flex flex-col items-center gap-3 w-full max-w-sm px-4">
		<p class="text-xs font-bold tracking-widest" style="color:var(--accent)">SCAN BARCODE</p>

		<!-- Viewfinder -->
		<div class="relative w-full rounded overflow-hidden" style="aspect-ratio:4/3;background:#000;border:2px solid var(--accent)">
			<video bind:this={videoEl} autoplay playsinline muted class="w-full h-full object-cover"></video>
			<!-- Aiming guide -->
			<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
				<div class="w-3/4 h-1/3 rounded" style="border:2px solid rgba(0,230,118,0.7);box-shadow:0 0 0 9999px rgba(0,0,0,0.4)">
					{#if polyfillLoading}
						<span class="absolute bottom-1 left-0 right-0 text-center text-xs" style="color:#ffb300">memuat scanner...</span>
					{/if}
				</div>
			</div>
		</div>

		<p class="text-xs text-center" style="color:var(--text-dim)">{statusMsg}</p>

		<!-- Manual input untuk barcode rusak -->
		<div class="w-full mt-1">
			<p class="text-xs mb-1" style="color:var(--text-dim)">Barcode rusak? Ketik manual:</p>
			<div class="flex gap-2">
				<input
					bind:this={manualInputEl}
					bind:value={manualInput}
					type="text"
					inputmode="text"
					placeholder="Kode barcode / QR..."
					onkeydown={(e) => { if (e.key === 'Enter') submitManual(); }}
					class="flex-1 px-3 py-1.5 rounded text-sm font-mono"
					style="background:var(--surface2);color:var(--text);border:1px solid var(--border);outline:none"
				/>
				<button
					type="button"
					onclick={submitManual}
					disabled={!manualInput.trim()}
					class="px-3 py-1.5 rounded text-sm font-bold"
					style="background:var(--accent);color:#000;opacity:{manualInput.trim() ? '1' : '0.4'}">
					OK
				</button>
			</div>
		</div>

		<button
			type="button"
			onclick={stop}
			class="mt-1 px-4 py-1.5 rounded text-sm font-bold"
			style="background:var(--surface2);color:var(--text);border:1px solid var(--border)">
			Tutup (ESC)
		</button>
	</div>
</div>
