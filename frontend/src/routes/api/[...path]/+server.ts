import type { RequestEvent } from '@sveltejs/kit'
import { backendUrl } from '$lib/server/config'

const BACKEND = backendUrl

// Proxy umum: forward semua /api/* ke backend dengan Pages cookie.
// Auth-specific routes (/api/auth/*) ditangani oleh proxy lebih spesifik di ../auth/[...path].

async function proxy(event: RequestEvent): Promise<Response> {
	const { params, request, cookies } = event
	const path = (params as Record<string, string>).path

	const headers: Record<string, string> = {}

	const ct = request.headers.get('content-type')
	if (ct) headers['Content-Type'] = ct

	// Forward kedua token tenant (auth_token) & platform admin (platform_token).
	// Backend platformMiddleware baca platform_token; tanpa ini /platform/* → 401.
	const cookiePairs: string[] = []
	const authToken = cookies.get('auth_token')
	if (authToken) cookiePairs.push(`auth_token=${authToken}`)
	const platformToken = cookies.get('platform_token')
	if (platformToken) cookiePairs.push(`platform_token=${platformToken}`)
	if (cookiePairs.length) headers['Cookie'] = cookiePairs.join('; ')

	let body: ArrayBuffer | undefined
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		body = await request.arrayBuffer()
	}

	const qs = new URL(request.url).search
	const backendRes = await fetch(`${BACKEND}/${path}${qs}`, {
		method: request.method,
		headers,
		body: body ?? undefined
	})

	const resBody = await backendRes.arrayBuffer()
	const resHeaders = new Headers()
	backendRes.headers.forEach((v, k) => {
		const kl = k.toLowerCase()
		if (kl === 'set-cookie' || kl === 'transfer-encoding') return
		resHeaders.set(k, v)
	})

	// Re-issue cookie backend (workers.dev) ke pages.dev domain — cross-origin
	// set-cookie tidak disimpan browser, jadi harus di-set ulang di sini.
	// CF Workers menggabungkan multi set-cookie; pakai getSetCookie() bila ada.
	const setCookies =
		typeof backendRes.headers.getSetCookie === 'function'
			? backendRes.headers.getSetCookie()
			: [backendRes.headers.get('set-cookie') ?? '']
	for (const sc of setCookies) {
		if (!sc) continue
		const name = /platform_token=/.test(sc)
			? 'platform_token'
			: /auth_token=/.test(sc)
				? 'auth_token'
				: null
		if (!name) continue
		const isDelete = /Max-Age=0/i.test(sc) || new RegExp(`${name}=;`).test(sc)
		if (isDelete) {
			cookies.delete(name, { path: '/' })
			continue
		}
		const value = sc.match(new RegExp(`${name}=([^;]+)`))?.[1]
		if (value) {
			cookies.set(name, value, {
				httpOnly: true,
				secure: true,
				sameSite: 'lax',
				path: '/',
				maxAge: 12 * 60 * 60
			})
		}
	}

	return new Response(resBody, { status: backendRes.status, headers: resHeaders })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
