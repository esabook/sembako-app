import type { PageServerLoad } from './$types';
import { requireUser, gateTokoTerkunci } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('auth_token');
	const user = await requireUser(token);
	await gateTokoTerkunci(user);
	return { user };
};
