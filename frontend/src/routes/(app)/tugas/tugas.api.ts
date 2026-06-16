import { api } from '$lib/utils/api.js'
import type { Item, LogRow, TemplateForm } from './tugas.types'

export async function fetchLog(tanggal: string): Promise<LogRow[]> {
	const r = await api.get<LogRow[]>(`/tugas/log?tanggal=${tanggal}`)
	if (!r.success) throw new Error(r.error)
	return r.data
}

export async function fetchItems(): Promise<Item[]> {
	const r = await api.get<Item[]>('/tugas/item')
	if (!r.success) throw new Error(r.error)
	return r.data
}

export async function tandaiItem(itemId: number, selesai: boolean, tanggal: string): Promise<void> {
	const r = await api.post('/tugas/log/tandai', { item_id: itemId, selesai, tanggal })
	if (!r.success) throw new Error(r.error)
}

export async function simpanItem(payload: TemplateForm, editId?: number): Promise<void> {
	const r = editId
		? await api.put(`/tugas/item/${editId}`, payload)
		: await api.post('/tugas/item', payload)
	if (!r.success) throw new Error(r.error)
}

export async function hapusItem(id: number): Promise<void> {
	const r = await api.delete(`/tugas/item/${id}`)
	if (!r.success) throw new Error(r.error)
}
