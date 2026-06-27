// Router scan-relay versi Workers (Durable Object). Hanya dipakai di worker.ts.
// Bun/LAN tetap pakai scan_relay.ts (long-poll in-memory).
//
// - GET /ws-ticket?session=  : cookie-auth (lewat proxy) → ticket JWT 60s.
// - GET /ws/:sessionId?ticket=: ticket-auth, upgrade WS → DO. TANPA cookie.
// - POST /scanner/:id        : kompat klien lama — broadcast scan ke listener.
// - POST /kasir-pre-qty/:id  : kompat klien lama — persist + broadcast pre-qty.

import { Hono } from 'hono';
import { jwtVerify, SignJWT } from 'jose';
import { type RelayMessage, type RelayNamespace, relayStub } from '../do/relay-types.ts';
import { authMiddleware } from '../middleware/auth.ts';
import { tenantMiddleware } from '../middleware/tenant.ts';
import type { JWTPayload } from './auth.ts';

const ticketSecret = () =>
	new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-ganti-di-production');

type Env = {
	Bindings: { RELAY: RelayNamespace };
	Variables: { user: JWTPayload; tenant_id: number; cabang_id: number | null };
};

export const scanRelayDORouter = new Hono<Env>();

// Mint ticket pendek untuk handshake WS (auth_token httpOnly tak ikut WS cross-domain).
scanRelayDORouter.get('/ws-ticket', authMiddleware, tenantMiddleware, async (c) => {
	const sessionId = c.req.query('session');
	if (!sessionId) return c.json({ success: false, error: 'session wajib' }, 400);
	const ticket = await new SignJWT({ t: c.get('tenant_id'), s: sessionId })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('60s')
		.sign(ticketSecret());
	return c.json({ success: true, data: { ticket } });
});

// Upgrade WebSocket → forward ke DO. Auth via ticket query, bukan cookie.
scanRelayDORouter.get('/ws/:sessionId', async (c) => {
	if (c.req.header('Upgrade') !== 'websocket') {
		return c.json({ success: false, error: 'butuh koneksi websocket' }, 426);
	}
	const sessionId = c.req.param('sessionId');
	const ticket = c.req.query('ticket');
	if (!ticket) return c.json({ success: false, error: 'ticket wajib' }, 401);

	let tenant: number;
	try {
		const { payload } = await jwtVerify(ticket, ticketSecret());
		if (payload.s !== sessionId)
			return c.json({ success: false, error: 'ticket tidak cocok' }, 403);
		tenant = Number(payload.t);
	} catch {
		return c.json({ success: false, error: 'ticket invalid atau kedaluwarsa' }, 401);
	}

	return relayStub(c.env.RELAY, tenant, sessionId).fetch(c.req.raw);
});

// Sender scan (kamera HP) → broadcast ke listener.
scanRelayDORouter.post('/scanner/:sessionId', authMiddleware, tenantMiddleware, async (c) => {
	const sessionId = c.req.param('sessionId');
	if (!sessionId) return c.json({ success: false, error: 'session wajib' }, 400);
	const { kode, qty = 1 } = await c.req.json<{ kode: string; qty?: number }>();
	await forward(c.env.RELAY, c.get('tenant_id'), sessionId, { type: 'scan', kode, qty });
	return c.json({ success: true });
});

// Update pre-qty (klien lama yang masih POST) → persist + broadcast.
scanRelayDORouter.post('/kasir-pre-qty/:sessionId', authMiddleware, tenantMiddleware, async (c) => {
	const sessionId = c.req.param('sessionId');
	if (!sessionId) return c.json({ success: false, error: 'session wajib' }, 400);
	const { qty } = await c.req.json<{ qty: number }>();
	await forward(c.env.RELAY, c.get('tenant_id'), sessionId, { type: 'preqty', qty });
	return c.json({ success: true, data: { qty } });
});

async function forward(
	ns: RelayNamespace,
	tenant: number,
	sessionId: string,
	msg: RelayMessage
): Promise<void> {
	await relayStub(ns, tenant, sessionId).fetch(
		new Request('https://relay/broadcast', { method: 'POST', body: JSON.stringify(msg) })
	);
}
