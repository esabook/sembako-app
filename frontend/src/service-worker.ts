/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

const STATIC_CACHE = `static-${version}`;
const API_CACHE = 'api-v1';

// Semua static asset untuk precache
const ASSETS = [...build, ...files];

// API path yang layak di-cache (GET only, kasir-critical)
const CACHEABLE_API = [
	'/produk',
	'/harga',
	'/pengaturan/publik',
	'/promo/aktif',
	'/kartu-anggota',
];

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Stokasir — Offline</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;
         display:flex;align-items:center;justify-content:center;min-height:100vh;padding:1.5rem}
    .card{background:#1e293b;border:1px solid #334155;border-radius:1rem;
          padding:2rem;max-width:360px;width:100%;text-align:center}
    .icon{font-size:3rem;margin-bottom:1rem}
    h1{font-size:1.25rem;font-weight:700;margin-bottom:.5rem;color:#f1f5f9}
    p{font-size:.875rem;color:#94a3b8;margin-bottom:1.5rem;line-height:1.6}
    button{background:#3b82f6;color:#fff;border:none;border-radius:.5rem;
           padding:.75rem 1.5rem;font-size:.875rem;font-weight:600;
           cursor:pointer;width:100%}
    button:active{background:#2563eb}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📡</div>
    <h1>Tidak Dapat Terhubung</h1>
    <p>Pastikan HP terhubung ke WiFi toko dan server menyala, lalu coba lagi.</p>
    <button onclick="location.reload()">Coba Lagi</button>
  </div>
</body>
</html>`;

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

	// Skip non-GET dan non-http(s)
	if (request.method !== 'GET') return;
	if (!url.protocol.startsWith('http')) return;

	// External requests (fonts, CDN) — cache first
	if (url.origin !== self.location.origin) {
		event.respondWith(cacheFirst(request, STATIC_CACHE));
		return;
	}

	// Navigation (buka halaman) — network first, fallback ke cache, lalu offline page
	// HARUS sebelum pengecekan API agar tidak tertangkap staleWhileRevalidate
	if (request.mode === 'navigate') {
		event.respondWith(networkFirstNav(request));
		return;
	}

	// Static assets (versioned oleh Vite) — cache first
	if (ASSETS.includes(url.pathname)) {
		event.respondWith(cacheFirst(request, STATIC_CACHE));
		return;
	}

	// API cacheable — stale-while-revalidate
	const apiPath = url.pathname.startsWith('/api/')
		? url.pathname.replace(/^\/api/, '')
		: url.pathname;
	if (url.pathname.startsWith('/api/') && CACHEABLE_API.some((p) => apiPath.startsWith(p))) {
		event.respondWith(staleWhileRevalidate(request, API_CACHE));
		return;
	}

	// Semua lainnya — lewat langsung ke network (tidak di-intercept)
});

// Navigation: coba network, fallback ke cached page, lalu offline HTML
async function networkFirstNav(request: Request): Promise<Response> {
	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(STATIC_CACHE);
			cache.put(request, response.clone());
		}
		return response;
	} catch {
		const cached = await caches.match(request);
		if (cached) return cached;
		return new Response(OFFLINE_HTML, {
			status: 503,
			headers: { 'Content-Type': 'text/html; charset=utf-8' },
		});
	}
}

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
		return new Response(OFFLINE_HTML, {
			status: 503,
			headers: { 'Content-Type': 'text/html; charset=utf-8' },
		});
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
