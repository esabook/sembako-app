import { api } from '$lib/utils/api'
import { parseBackupFilename } from './pengaturan.logic'
import type { Settings } from './pengaturan.types'

function unwrap<T>(res: { success: true; data: T } | { success: false; error: string }): T {
	if (!res.success) throw new Error(res.error)
	return res.data
}

export async function getPengaturan(): Promise<Settings> {
	return unwrap(await api.get<Settings>('/pengaturan'))
}

export async function simpanPengaturan(form: Settings): Promise<void> {
	unwrap(await api.post<Settings>('/pengaturan/bulk', form))
}

/**
 * Download backup database sebagai file. Pakai raw fetch (blob), bukan api.* —
 * response bukan JSON. Throw on error agar caller bisa toast.
 */
export async function downloadBackupDb(includeMedia: boolean): Promise<void> {
	const url = includeMedia
		? '/api/pengaturan/backup-db?include_media=1'
		: '/api/pengaturan/backup-db'
	const res = await fetch(url, { credentials: 'include' })
	if (!res.ok) {
		const body = await res.json().catch(() => null)
		throw new Error(body?.message ?? 'Gagal download backup')
	}
	const filename = parseBackupFilename(res.headers.get('Content-Disposition') ?? '')
	const blob = await res.blob()
	const a = document.createElement('a')
	a.href = URL.createObjectURL(blob)
	a.download = filename
	a.click()
	URL.revokeObjectURL(a.href)
}

/**
 * Restore database dari file backup. Pakai raw fetch (FormData upload).
 * Return hasil mentah dari server agar caller bisa handle success/error.
 */
export async function restoreDb(file: File): Promise<{ success: boolean; error?: string }> {
	const fd = new FormData()
	fd.append('file', file)
	const res = await fetch('/api/pengaturan/restore-db', {
		method: 'POST',
		body: fd,
		credentials: 'include'
	})
	return res.json()
}
