import { redirect } from '@sveltejs/kit'
import { dev } from '$app/environment'
import { backendUrl } from '$lib/server/config'
import type { RequestHandler } from './$types'

// Tukar one-time-code dari backend → JWT, lalu set cookie di domain pages.dev.
// Cross-origin: cookie backend tak terkirim ke pages.dev, jadi token dipindah via
// code sekali pakai (lihat backend /auth/google/bridge + /auth/oauth-exchange).
export const GET: RequestHandler = async ({ url, cookies, fetch }) => {
	const code = url.searchParams.get('code')
	if (!code) redirect(302, '/login?oauth=error')

	const res = await fetch(`${backendUrl}/auth/oauth-exchange`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ code })
	})
	const json = (await res.json().catch(() => ({ success: false }))) as {
		success: boolean
		data?: { token: string }
	}
	if (!json.success || !json.data?.token) redirect(302, '/login?oauth=error')

	cookies.set('auth_token', json.data.token, {
		httpOnly: true,
		secure: !dev, // http://localhost dev: browser tolak cookie Secure
		sameSite: 'lax',
		path: '/',
		maxAge: 12 * 60 * 60
	})
	redirect(302, '/dashboard')
}
