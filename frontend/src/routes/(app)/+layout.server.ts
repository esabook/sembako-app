import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

// Server-side: langsung ke backend, tidak lewat Vite proxy
const API_URL = process.env.BACKEND_URL ?? 'http://localhost:3000'

export const load: LayoutServerLoad = async ({ cookies, url }) => {
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

	const user = json.data as {
		id: number
		nama: string
		role: string
		kode_karyawan?: string
		tenant_id?: number
		cabang_id?: number | null
	}

	// Onboarding gate — pemilik baru wajib selesai wizard sebelum masuk app.
	// Cek setting di server agar tidak ada flash; hindari loop di /onboarding.
	// redirect() di luar try/catch supaya throw-nya tidak ketelan.
	let perluOnboarding = false
	if (user.role === 'pemilik' && !url.pathname.startsWith('/onboarding')) {
		try {
			const setRes = await fetch(`${API_URL}/pengaturan`, {
				headers: { Cookie: `auth_token=${token}` }
			})
			if (setRes.ok) {
				const setJson = await setRes.json()
				perluOnboarding = setJson.success && setJson.data?.onboarding_selesai !== 'true'
			}
		} catch {
			// Gagal baca setting → jangan blokir akses; lanjut normal.
		}
	}
	if (perluOnboarding) redirect(302, '/onboarding')

	return { user }
}
