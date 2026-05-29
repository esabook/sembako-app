import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

const API_URL = process.env.BACKEND_URL ?? 'http://localhost:3000'

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('auth_token')
	if (!token) return {}

	const res = await fetch(`${API_URL}/auth/me`, {
		headers: { Cookie: `auth_token=${token}` }
	})

	if (res.ok) {
		const json = await res.json()
		if (json.success) redirect(302, '/kasir')
	}

	return {}
}
