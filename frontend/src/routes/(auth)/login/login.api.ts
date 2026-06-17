import { api } from '$lib/utils/api'

export async function loginApi(username: string, password: string) {
	const res = await api.post<{ id: number; nama: string; role: string }>('/auth/login', {
		username,
		password
	})
	if (!res.success) throw new Error(res.error)
	return res.data
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
