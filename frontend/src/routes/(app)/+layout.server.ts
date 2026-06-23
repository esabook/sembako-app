import type { LayoutServerLoad } from './$types'
import { requireUser, gateOnboarding } from '$lib/server/auth'

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	const token = cookies.get('auth_token')
	const user = await requireUser(token)

	// Hindari loop di /onboarding — gate hanya di luar route onboarding.
	if (!url.pathname.startsWith('/onboarding')) {
		await gateOnboarding(token as string, user)
	}

	return { user }
}
