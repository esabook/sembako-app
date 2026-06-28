import { redirect } from '@sveltejs/kit'
import { backendUrl } from '$lib/server/config'
import type { RequestHandler } from './$types'

// Mulai OAuth Google: redirect top-level ke backend /auth/google supaya state/PKCE
// cookie better-auth ter-set di domain backend (bukan pages.dev). Backend lalu 302
// ke Google. backendUrl server-side (tak expose ke browser).
export const GET: RequestHandler = () => {
	redirect(302, `${backendUrl}/auth/google`)
}
