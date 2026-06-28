import { redirect } from '@sveltejs/kit'
import { backendUrl } from '$lib/server/config'

const API_URL = backendUrl

export type AuthUser = {
	id: number
	nama: string
	role: string
	kode_karyawan?: string
	tenant_id?: number
	cabang_id?: number | null
	saas?: boolean
	perlu_email?: boolean
	onboarding_selesai?: boolean
	status_toko?: string | null
	sisa_hari_hapus?: number | null
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
 * Validasi cookie auth_token tanpa redirect.
 * Kembalikan user bila valid, null bila tidak login/invalid.
 * Dipakai di halaman publik (marketing) yang ingin tahu status login.
 */
export async function optionalUser(token: string | undefined): Promise<AuthUser | null> {
	if (!token) return null
	try {
		const res = await fetch(`${API_URL}/auth/me`, {
			headers: { Cookie: `auth_token=${token}` }
		})
		if (!res.ok) return null
		const json = await res.json()
		if (!json.success) return null
		return json.data as AuthUser
	} catch {
		return null
	}
}

/**
 * Karyawan tanpa email (belum punya identity better-auth) diarahkan ke
 * /lengkapi-email. Gate Fase B — jangan dipanggil di route /lengkapi-email
 * sendiri (halaman ada di grup (auth), di luar gate ini, jadi tak ada loop).
 */
export async function gateLengkapiEmail(user: AuthUser): Promise<void> {
	if (user.perlu_email) {
		redirect(302, '/lengkapi-email')
	}
}

/**
 * Toko yang dinonaktifkan atau dijadwalkan dihapus diarahkan ke /toko-terkunci.
 * Cukup cek dari user object yang sudah di-load oleh requireUser.
 */
export async function gateTokoTerkunci(user: AuthUser): Promise<void> {
	if (user.status_toko === 'deactivated' || user.sisa_hari_hapus !== null && user.sisa_hari_hapus !== undefined) {
		redirect(302, '/toko-terkunci')
	}
}

/**
 * Pemilik yang belum selesai onboarding diarahkan ke /onboarding.
 * Baca dari user.onboarding_selesai (sudah di-embed di GET /auth/me dari home toko,
 * bukan tenant aktif) — context-independent, aman saat switch ke demo toko.
 * Role lain dilewatkan. Panggil di luar try/catch agar throw redirect tidak ketelan.
 */
export async function gateOnboarding(_token: string, user: AuthUser): Promise<void> {
	if (user.role !== 'pemilik') return
	if (!user.onboarding_selesai) {
		redirect(302, '/onboarding')
	}
}
