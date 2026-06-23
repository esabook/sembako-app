import type { LayoutServerLoad } from './$types'
import { optionalUser } from '$lib/server/auth'

export const load: LayoutServerLoad = async ({ cookies }) => {
	const token = cookies.get('auth_token')
	const user = await optionalUser(token)
	return { user }
}
