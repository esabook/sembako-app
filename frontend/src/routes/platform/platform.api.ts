// Klien fetch khusus panel platform admin. Beda dari $lib/utils/api:
// pakai cookie platform_token & 401 mengarah ke /platform/login (bukan /login tenant).
import { goto } from '$app/navigation';

const BASE_URL = import.meta.env.PUBLIC_API_URL ?? '/api';

type Res<T> = { success: true; data: T } | { success: false; error: string };

async function req<T>(path: string, init?: RequestInit): Promise<Res<T>> {
	try {
		const res = await fetch(`${BASE_URL}${path}`, {
			headers: { 'Content-Type': 'application/json', ...init?.headers },
			credentials: 'include',
			...init
		});
		if (res.status === 401) {
			goto('/platform/login');
			return { success: false, error: 'Sesi admin berakhir' };
		}
		return res.json() as Promise<Res<T>>;
	} catch {
		return { success: false, error: 'Network error' };
	}
}

export const padmin = {
	get: <T>(path: string) => req<T>(path),
	post: <T>(path: string, body: unknown) =>
		req<T>(path, { method: 'POST', body: JSON.stringify(body) })
};
