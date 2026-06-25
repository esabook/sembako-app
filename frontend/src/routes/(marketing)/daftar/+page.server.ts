import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { optionalUser } from '$lib/server/auth'

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('auth_token')
	const user = await optionalUser(token)
	if (user) redirect(302, '/kasir')
	return {}
}
