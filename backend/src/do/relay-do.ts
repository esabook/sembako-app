/// <reference types="@cloudflare/workers-types" />
// RelayDO — koordinator scan-relay per-session memakai WebSocket Hibernation API.
// Pengganti Map global in-memory (scan_relay.ts) yang rusak antar-isolate di Workers.
//
// - Listener (kasir/gudang/HP) buka WS → ctx.acceptWebSocket (hibernatable, idle = 0 biaya).
// - Sender scan (kamera HP) POST lewat worker → fetch internal /broadcast → push ke semua WS.
// - pre-qty 2-arah lewat pesan WS, nilai dipersist di ctx.storage (selamat dari hibernasi).

import { DurableObject } from 'cloudflare:workers';
import type { RelayMessage } from './relay-types.ts';

export class RelayDO extends DurableObject {
	// Upgrade WS (dari worker /ws/:id) atau broadcast internal (POST /broadcast).
	override async fetch(request: Request): Promise<Response> {
		if (request.headers.get('Upgrade') === 'websocket') {
			const { 0: client, 1: server } = new WebSocketPair();
			this.ctx.acceptWebSocket(server); // hibernatable — BUKAN server.accept()

			// Kirim nilai pre-qty tersimpan ke client baru (untuk refresh/reconnect).
			const preqty = await this.ctx.storage.get<number>('preqty');
			if (preqty !== undefined) {
				server.send(JSON.stringify({ type: 'preqty', qty: preqty } satisfies RelayMessage));
			}
			return new Response(null, { status: 101, webSocket: client });
		}

		// Broadcast internal dari worker (scan dari HP).
		const msg = (await request.json()) as RelayMessage;
		if (msg.type === 'preqty') await this.ctx.storage.put('preqty', msg.qty);
		this.broadcast(msg);
		return new Response(null, { status: 204 });
	}

	// Pesan dari client WS (kasir/HP kirim update pre-qty).
	override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
		let msg: RelayMessage;
		try {
			const raw = typeof message === 'string' ? message : new TextDecoder().decode(message);
			msg = JSON.parse(raw) as RelayMessage;
		} catch {
			return;
		}
		if (msg.type === 'preqty') {
			await this.ctx.storage.put('preqty', msg.qty);
			this.broadcast(msg, ws); // ke peer lain, skip pengirim
		}
	}

	override webSocketClose(ws: WebSocket, code: number): void {
		try {
			ws.close(code);
		} catch {
			/* sudah tertutup */
		}
	}

	private broadcast(msg: RelayMessage, except?: WebSocket): void {
		const json = JSON.stringify(msg);
		for (const ws of this.ctx.getWebSockets()) {
			if (ws === except) continue;
			try {
				ws.send(json);
			} catch {
				/* socket mati — diabaikan, DO auto-cleanup */
			}
		}
	}
}
