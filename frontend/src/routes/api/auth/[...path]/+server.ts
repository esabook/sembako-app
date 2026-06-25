import type { RequestEvent } from '@sveltejs/kit'
import { backendUrl } from '$lib/server/config'

const BACKEND_URL = backendUrl

// Proxy /api/auth/* ke backend dan re-issue cookie di pages.dev domain.
// Dibutuhkan karena backend (workers.dev) dan frontend (pages.dev) cross-origin:
// cookie yang di-set workers.dev tidak dikirim browser ke pages.dev saat SSR.

function parseCookieToken(setCookieHeader: string): string | null {
	const match = setCookieHeader.match(/auth_token=([^;]+)/)
	return match ? match[1] : null
}

async function proxy(event: RequestEvent): Promise<Response> {
	const { params, request, cookies } = event
	const path = (params as Record<string, string>).path

	const headers: Record<string, string> = { 'Content-Type': 'application/json' }

	// Forward Pages cookie ke backend (penting untuk GET /auth/me, accessible-context, dll)
	const existingToken = cookies.get('auth_token')
	if (existingToken) headers['Cookie'] = `auth_token=${existingToken}`

	let body: string | undefined
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		body = await request.text().catch(() => '')
	}

	const res = await fetch(`${BACKEND_URL}/auth/${path}`, {
		method: request.method,
		headers,
		body: body || undefined
	})

	const json = await res.json().catch(() => ({ success: false, error: 'Backend error' }))

	// Re-issue atau hapus cookie di pages.dev domain
	const setCookieHeader = res.headers.get('set-cookie') ?? ''
	if (setCookieHeader) {
		const isDelete = /Max-Age=0/i.test(setCookieHeader) || /auth_token=;/i.test(setCookieHeader)
		if (isDelete) {
			cookies.delete('auth_token', { path: '/' })
		} else {
			const token = parseCookieToken(setCookieHeader)
			if (token) {
				cookies.set('auth_token', token, {
					httpOnly: true,
					secure: true,
					sameSite: 'lax',
					path: '/',
					maxAge: 12 * 60 * 60
				})
			}
		}
	}

	return new Response(JSON.stringify(json), {
		status: res.status,
		headers: { 'Content-Type': 'application/json' }
	})
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
