import type { PageServerLoad } from './$types';
import { requireUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('auth_token');
	const user = await requireUser(token);
	return { user };
};
