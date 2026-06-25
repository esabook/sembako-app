import type { LayoutServerLoad } from './$types'
import { requireUser, gateOnboarding } from '$lib/server/auth'

export const load: LayoutServerLoad = async ({ cookies }) => {
	const token = cookies.get('auth_token')
	const user = await requireUser(token)
	await gateOnboarding(token as string, user)
	return { user }
}
