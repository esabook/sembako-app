import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

// Server-side: langsung ke backend, tidak lewat Vite proxy
const API_URL = process.env.BACKEND_URL ?? 'http://localhost:3000'

export const load: LayoutServerLoad = async ({ cookies }) => {
	const token = cookies.get('auth_token')
	if (!token) {
		redirect(302, '/login')
	}

	const res = await fetch(`${API_URL}/auth/me`, {
		headers: { Cookie: `auth_token=${token}` }
	})

	if (!res.ok) {
		redirect(302, '/login')
	}

	const json = await res.json()
	if (!json.success) {
		redirect(302, '/login')
	}

	return { user: json.data as { id: number; nama: string; role: string } }
}
