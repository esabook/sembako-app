import { env } from '$env/dynamic/public';
import { api } from '$lib/utils/api';

// Transport scan-relay dual-mode:
// - Cloud (PUBLIC_DEPLOYMENT_MODE=online + PUBLIC_WS_URL): WebSocket ke Durable Object.
//   Listener pasif idle = 0 biaya (WS Hibernation). Ticket auth (cookie httpOnly tak
//   ikut WS cross-domain) di-fetch lewat proxy /api.
// - LAN/offline: long-poll ke backend Bun (in-memory). Perilaku lama, tak berubah.

type RelayMsg = { type: 'scan'; kode: string; qty: number } | { type: 'preqty'; qty: number };

export interface ScannerRelayOpts {
	onScan?: (kode: string, qty: number) => void;
	onQty?: (qty: number) => void;
	onStatus?: (status: 'connected' | 'disconnected') => void;
}

export interface ScannerRelayHandle {
	close(): void;
	sendQty(qty: number): void;
	// Toggle UI listening. Cloud: cuma stop dispatch scan (WS tetap hibernate, hemat).
	// LAN: benar-benar stop/restart loop poll (hemat request).
	setListening(on: boolean): void;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isCloud = () => env.PUBLIC_DEPLOYMENT_MODE === 'online' && !!env.PUBLIC_WS_URL;

export function connectScannerRelay(sessionId: string, opts: ScannerRelayOpts): ScannerRelayHandle {
	return isCloud() ? wsRelay(sessionId, opts) : pollRelay(sessionId, opts);
}

// ── Cloud: WebSocket + Durable Object ────────────────────────────────────────
function wsRelay(sessionId: string, opts: ScannerRelayOpts): ScannerRelayHandle {
	const wsBase = (env.PUBLIC_WS_URL ?? '').replace(/\/$/, '');
	let ws: WebSocket | null = null;
	let closed = false;
	let listening = true;
	let retry = 0;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let pendingQty: number | null = null; // qty diubah saat WS belum open → kirim saat open

	async function connect() {
		if (closed) return;
		const res = await api.get<{ ticket: string }>(
			`/scan-relay/ws-ticket?session=${encodeURIComponent(sessionId)}`
		);
		if (closed) return;
		if (!res.success) {
			scheduleReconnect();
			return;
		}
		const url = `${wsBase}/scan-relay/ws/${encodeURIComponent(sessionId)}?ticket=${encodeURIComponent(res.data.ticket)}`;
		try {
			ws = new WebSocket(url);
		} catch {
			scheduleReconnect();
			return;
		}
		ws.onopen = () => {
			retry = 0;
			opts.onStatus?.('connected');
			if (pendingQty !== null) {
				ws?.send(JSON.stringify({ type: 'preqty', qty: pendingQty } satisfies RelayMsg));
				pendingQty = null;
			}
		};
		ws.onmessage = (ev) => {
			let msg: RelayMsg;
			try {
				msg = JSON.parse(ev.data as string) as RelayMsg;
			} catch {
				return;
			}
			if (msg.type === 'scan') {
				if (listening) opts.onScan?.(msg.kode, msg.qty);
			} else if (msg.type === 'preqty') {
				opts.onQty?.(msg.qty);
			}
		};
		ws.onclose = () => {
			opts.onStatus?.('disconnected');
			ws = null;
			scheduleReconnect();
		};
		ws.onerror = () => {
			try {
				ws?.close();
			} catch {
				/* noop */
			}
		};
	}

	function scheduleReconnect() {
		if (closed || reconnectTimer) return;
		const delay = Math.min(1000 * 2 ** retry, 15000);
		retry++;
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			void connect();
		}, delay);
	}

	void connect();

	return {
		close() {
			closed = true;
			if (reconnectTimer) clearTimeout(reconnectTimer);
			try {
				ws?.close();
			} catch {
				/* noop */
			}
			ws = null;
		},
		sendQty(qty) {
			if (ws && ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: 'preqty', qty } satisfies RelayMsg));
			} else {
				pendingQty = qty; // flush saat open
			}
		},
		setListening(on) {
			listening = on; // WS tetap terbuka/hibernate — JANGAN reconnect
		}
	};
}

// ── LAN/offline: long-poll (perilaku lama) ───────────────────────────────────
function pollRelay(sessionId: string, opts: ScannerRelayOpts): ScannerRelayHandle {
	let scanAbort: AbortController | null = null;
	const qtyAbort = new AbortController();
	let listening = true;

	async function scanLoop(signal: AbortSignal) {
		while (!signal.aborted) {
			try {
				const res = await fetch(`/api/scan-relay/kasir/${sessionId}`, {
					signal,
					credentials: 'include'
				});
				if (signal.aborted) break;
				if (!res.ok) {
					opts.onStatus?.('disconnected');
					await wait(2000);
					continue;
				}
				const body = (await res.json()) as {
					success: boolean;
					data: { kode: string; qty?: number } | null;
				};
				if (signal.aborted) break;
				opts.onStatus?.('connected');
				if (body.data?.kode) opts.onScan?.(body.data.kode, body.data.qty ?? 1);
			} catch {
				if (signal.aborted) break;
				opts.onStatus?.('disconnected');
				await wait(2000);
			}
		}
	}

	async function qtyLoop(signal: AbortSignal) {
		let known: number | null = null;
		while (!signal.aborted) {
			try {
				const url =
					known === null
						? `/api/scan-relay/kasir-pre-qty/${sessionId}`
						: `/api/scan-relay/kasir-pre-qty/${sessionId}?known=${known}`;
				const res = await fetch(url, { signal, credentials: 'include' });
				if (signal.aborted) break;
				if (!res.ok) {
					await wait(2000);
					continue;
				}
				const body = (await res.json()) as { success: boolean; data: { qty: number } };
				if (signal.aborted) break;
				known = body.data.qty;
				opts.onQty?.(body.data.qty);
			} catch {
				if (signal.aborted) break;
				await wait(2000);
			}
		}
	}

	function startScan() {
		if (!opts.onScan) return;
		scanAbort = new AbortController();
		void scanLoop(scanAbort.signal);
	}

	startScan();
	if (opts.onQty) void qtyLoop(qtyAbort.signal);

	return {
		close() {
			scanAbort?.abort();
			qtyAbort.abort();
		},
		sendQty(qty) {
			void fetch(`/api/scan-relay/kasir-pre-qty/${sessionId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ qty }),
				credentials: 'include'
			}).catch(() => {});
		},
		setListening(on) {
			if (on === listening) return;
			listening = on;
			if (!on) scanAbort?.abort();
			else startScan(); // benar-benar mulai ulang poll
		}
	};
}
