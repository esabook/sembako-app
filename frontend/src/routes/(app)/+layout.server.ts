import type { LayoutServerLoad } from './$types'
import { requireUser, gateLengkapiEmail, gateOnboarding, gateTokoTerkunci } from '$lib/server/auth'

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	const token = cookies.get('auth_token')
	const user = await requireUser(token)

	// Karyawan tanpa email → lengkapi dulu (identity better-auth).
	await gateLengkapiEmail(user)

	// Hindari loop di /onboarding — gate hanya di luar route onboarding.
	if (!url.pathname.startsWith('/onboarding')) {
		await gateOnboarding(token as string, user)
	}

	// Toko nonaktif/dijadwalkan hapus → blokir akses (app), arahkan ke halaman status.
	await gateTokoTerkunci(user)

	return { user }
}
