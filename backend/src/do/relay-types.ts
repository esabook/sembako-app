// Seam bertipe untuk scan-relay Durable Object.
// Sengaja TANPA @cloudflare/workers-types (triple-slash mencemari global Bun
// di typecheck). Interface minimal di bawah dipenuhi struktural oleh
// DurableObjectNamespace/Stub asli saat runtime Workers.

export type RelayMessage =
	| { type: 'scan'; kode: string; qty: number }
	| { type: 'preqty'; qty: number };

// Opaque id — cukup diteruskan dari idFromName ke get.
export interface RelayId {
	readonly name?: string;
}

export interface RelayStub {
	fetch(request: Request): Promise<Response>;
}

// Subset struktural dari DurableObjectNamespace.
export interface RelayNamespace {
	idFromName(name: string): RelayId;
	get(id: RelayId): RelayStub;
}

// DO id dinamespace tenant → isolasi antar-toko (cegah tabrakan sessionId).
export function relayStub(ns: RelayNamespace, tenantId: number, sessionId: string): RelayStub {
	return ns.get(ns.idFromName(`${tenantId}:${sessionId}`));
}
