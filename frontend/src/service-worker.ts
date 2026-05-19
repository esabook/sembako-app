/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

const STATIC_CACHE = `static-${version}`;
const API_CACHE = 'api-v1';

// All static assets to precache
const ASSETS = [...build, ...files];

// API paths worth caching (GET only, kasir-critical)
const CACHEABLE_API = [
	'/produk',
	'/harga',
	'/pengaturan/publik',
	'/promo/aktif',
	'/kartu-anggota',
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(STATIC_CACHE).then((cache) => cache.addAll(ASSETS))
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(
				keys
					.filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
					.map((k) => caches.delete(k))
			)
		)
	);
	self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Skip non-GET and non-http(s)
	if (request.method !== 'GET') return;
	if (!url.protocol.startsWith('http')) return;

	// External requests (fonts, CDN) — cache first
	if (url.origin !== self.location.origin) {
		event.respondWith(cacheFirst(request, STATIC_CACHE));
		return;
	}

	// Static assets — cache first (versioned by Vite)
	if (ASSETS.includes(url.pathname)) {
		event.respondWith(cacheFirst(request, STATIC_CACHE));
		return;
	}

	// API — stale-while-revalidate for cacheable endpoints
	if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/')) {
		const apiPath = url.pathname.replace(/^\/api/, '');
		if (CACHEABLE_API.some((p) => apiPath.startsWith(p))) {
			event.respondWith(staleWhileRevalidate(request, API_CACHE));
			return;
		}
	}

	// Navigation — network first, fallback to cache
	if (request.mode === 'navigate') {
		event.respondWith(networkFirst(request));
		return;
	}
});

async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
	const cached = await caches.match(request);
	if (cached) return cached;

	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(cacheName);
			cache.put(request, response.clone());
		}
		return response;
	} catch {
		return new Response('Offline', { status: 503 });
	}
}

async function staleWhileRevalidate(request: Request, cacheName: string): Promise<Response> {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(request);

	const fetchPromise = fetch(request)
		.then((response) => {
			if (response.ok) cache.put(request, response.clone());
			return response;
		})
		.catch(() => null);

	if (cached) {
		// Return cache immediately, update in background
		fetchPromise.catch(() => {});
		return cached;
	}

	const fresh = await fetchPromise;
	return (
		fresh ??
		new Response(JSON.stringify({ success: false, error: 'Offline — data tidak tersedia' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' },
		})
	);
}

async function networkFirst(request: Request): Promise<Response> {
	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(STATIC_CACHE);
			cache.put(request, response.clone());
		}
		return response;
	} catch {
		const cached = await caches.match(request);
		return cached ?? new Response('Offline', { status: 503 });
	}
}
