import type { PageServerLoad } from './$types'

// User + redirect ditangani +layout.server.ts; page tinggal mewarisi.
export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent()
	return { user }
}
