import { api } from '$lib/utils/api'

export async function loginApi(username: string, password: string) {
	// Gunakan proxy SvelteKit (/api/auth/login) bukan backend langsung.
	// Cookie dari workers.dev tidak dikirim browser ke pages.dev (cross-origin);
	// proxy re-issue cookie di pages.dev sehingga SSR bisa baca.
	const res = await fetch('/api/auth/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ username, password })
	})
	const json = await res.json() as { success: boolean; data?: { id: number; nama: string; role: string }; error?: string }
	if (!json.success) throw new Error(json.error ?? 'Login gagal')
	return json.data!
}

export async function fetchNamaToko(): Promise<string> {
	const res = await api.get<{ nama_toko: string }>('/pengaturan/publik')
	if (!res.success) throw new Error(res.error)
	return res.data.nama_toko
}

export async function fetchServerIP(fallback: string): Promise<string> {
	const res = await api.get<{ lan_ips: string[] }>('/pengaturan/server-info')
	if (!res.success) throw new Error(res.error)
	return res.data.lan_ips[0] ?? fallback
}
