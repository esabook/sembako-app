import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'
import { optionalUser } from '$lib/server/auth'

// User di-load di level layout supaya +layout.svelte (header akun) dapat data.user.
// +page.server.ts mewarisi lewat parent().
export const load: LayoutServerLoad = async ({ cookies }) => {
	const token = cookies.get('auth_token')
	const user = await optionalUser(token)

	if (!user) {
		redirect(302, '/login')
	}

	return { user }
}
