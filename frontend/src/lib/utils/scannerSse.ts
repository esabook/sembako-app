export function connectScannerSse(sessionId: string, onScan: (kode: string) => void): () => void {
	const abort = new AbortController();

	async function pollLoop() {
		while (!abort.signal.aborted) {
			try {
				const res = await fetch(`/api/scan-relay/kasir/${sessionId}`, {
					signal: abort.signal,
					credentials: 'include',
				});
				if (abort.signal.aborted) break;
				if (!res.ok) { await new Promise((r) => setTimeout(r, 2000)); continue; }
				const body = await res.json() as { success: boolean; data: { kode: string } | null };
				if (abort.signal.aborted) break;
				if (body.data?.kode) onScan(body.data.kode);
			} catch {
				if (abort.signal.aborted) break;
				await new Promise((r) => setTimeout(r, 2000));
			}
		}
	}

	void pollLoop();
	return () => abort.abort();
}
