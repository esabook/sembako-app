const SSE_TIMEOUT_MS = 15_000;

export function connectScannerSse(sessionId: string, onScan: (kode: string) => void): () => void {
	let sse: EventSource | null = null;
	let lastEventMs = 0;
	let watchdog: ReturnType<typeof setInterval> | null = null;

	function connect() {
		sse?.close();
		sse = new EventSource(`/api/scan-relay/kasir/${sessionId}`);
		sse.onopen = () => { lastEventMs = Date.now(); };
		sse.onmessage = (e) => {
			lastEventMs = Date.now();
			const msg = JSON.parse(e.data as string) as { type: string; kode?: string };
			if (msg.type === 'scan' && msg.kode) onScan(msg.kode);
		};
		sse.onerror = () => {};
	}

	connect();
	watchdog = setInterval(() => {
		if (lastEventMs > 0 && Date.now() - lastEventMs > SSE_TIMEOUT_MS) connect();
	}, 5_000);

	return () => {
		sse?.close();
		if (watchdog) clearInterval(watchdog);
	};
}
