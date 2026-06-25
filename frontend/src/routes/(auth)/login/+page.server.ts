import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { onboardingSelesai } from '$lib/server/auth'
import { backendUrl } from '$lib/server/config'

const API_URL = backendUrl

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('auth_token')
	if (!token) return {}

	const res = await fetch(`${API_URL}/auth/me`, {
		headers: { Cookie: `auth_token=${token}` }
	})

	if (res.ok) {
		const json = await res.json()
		if (json.success) {
			const user = json.data as { role: string }

			// Pemilik yang belum selesai wizard wajib ke onboarding dulu.
			if (user.role === 'pemilik' && !(await onboardingSelesai(token))) {
				redirect(302, '/onboarding')
			}
			redirect(302, '/kasir')
		}
	}

	return {}
}
