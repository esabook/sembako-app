import { redirect } from '@sveltejs/kit'

const API_URL = process.env.BACKEND_URL ?? 'http://localhost:3000'

export type AuthUser = {
	id: number
	nama: string
	role: string
	kode_karyawan?: string
	tenant_id?: number
	cabang_id?: number | null
	saas?: boolean
}

/**
 * Validasi cookie auth_token ke backend.
 * Redirect ke /login bila token kosong/invalid. Kembalikan user bila valid.
 */
export async function requireUser(token: string | undefined): Promise<AuthUser> {
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

	return json.data as AuthUser
}

/**
 * Cek apakah pemilik sudah menyelesaikan wizard onboarding.
 * Gagal baca setting → anggap selesai agar tidak memblokir akses.
 */
export async function onboardingSelesai(token: string): Promise<boolean> {
	try {
		const res = await fetch(`${API_URL}/pengaturan`, {
			headers: { Cookie: `auth_token=${token}` }
		})
		if (res.ok) {
			const json = await res.json()
			return json.success && json.data?.onboarding_selesai === 'true'
		}
	} catch {
		// abaikan
	}
	return true
}

/**
 * Pemilik yang belum selesai onboarding diarahkan ke /onboarding.
 * Role lain dilewatkan. Panggil di luar try/catch agar throw redirect tidak ketelan.
 */
export async function gateOnboarding(token: string, user: AuthUser): Promise<void> {
	if (user.role !== 'pemilik') return
	if (!(await onboardingSelesai(token))) {
		redirect(302, '/onboarding')
	}
}
