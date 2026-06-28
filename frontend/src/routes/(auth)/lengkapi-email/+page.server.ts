import { redirect } from '@sveltejs/kit'
import { requireUser } from '$lib/server/auth'
import type { PageServerLoad } from './$types'

// Hanya untuk karyawan yang belum punya email. Sudah punya → ke dashboard
// (cegah akses halaman ini tanpa alasan + loop dengan gate).
export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('auth_token')
	const user = await requireUser(token)
	if (!user.perlu_email) redirect(302, '/dashboard')
	return { user }
}
