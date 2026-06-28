import type { LayoutServerLoad } from './$types'
import { requireUser, gateLengkapiEmail, gateOnboarding, gateTokoTerkunci } from '$lib/server/auth'

export const load: LayoutServerLoad = async ({ cookies }) => {
	const token = cookies.get('auth_token')
	const user = await requireUser(token)
	await gateLengkapiEmail(user)
	await gateOnboarding(token as string, user)
	await gateTokoTerkunci(user)
	return { user }
}
