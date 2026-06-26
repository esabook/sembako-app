import type { LayoutServerLoad } from './$types'
import { requireUser } from '$lib/server/auth'

export const load: LayoutServerLoad = async ({ cookies }) => {
	const user = await requireUser(cookies.get('auth_token'))
	return { user }
}
