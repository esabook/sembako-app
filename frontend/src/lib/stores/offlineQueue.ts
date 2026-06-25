import { writable, derived, get } from 'svelte/store'
import { api } from '$lib/utils/api'
import { errors } from '$lib/stores/ui.store'

const STORAGE_KEY = 'stokasir_offline_queue'

export type SyncStatus = 'synced' | 'unsynced' | 'syncing'

export type QueueItem = {
	id: string
	method: 'post' | 'put' | 'patch' | 'delete'
	path: string
	body: unknown
	label: string
	createdAt: string
}

export class OfflineQueuedError extends Error {
	constructor(public readonly label: string) {
		super('OFFLINE_QUEUED')
		this.name = 'OfflineQueuedError'
	}
}

function load(): QueueItem[] {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
	} catch { return [] }
}

function persist(items: QueueItem[]) {
	try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch {}
}

const _queue = writable<QueueItem[]>(load())

export const offlineQueue = { subscribe: _queue.subscribe }
export const jumlahAntrian = derived(_queue, (q) => q.length)
export const syncStatus = writable<SyncStatus>(load().length > 0 ? 'unsynced' : 'synced')

export function enqueue(item: Omit<QueueItem, 'id' | 'createdAt'>) {
	const full: QueueItem = { ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
	_queue.update((prev) => { const next = [...prev, full]; persist(next); return next })
	syncStatus.set('unsynced')
}

function dequeue(id: string) {
	_queue.update((prev) => { const next = prev.filter((i) => i.id !== id); persist(next); return next })
}

export async function flushQueue(): Promise<number> {
	const items = get(_queue)
	if (items.length === 0) return 0
	syncStatus.set('syncing')
	let n = 0

	for (const item of [...items]) {
		const res = await (api as Record<string, (p: string, b: unknown) => Promise<{ success: boolean; error?: string }>>)[item.method](item.path, item.body)
		if (res.success) {
			dequeue(item.id)
			n++
		} else if (res.error === 'Network error') {
			break  // jaringan masih mati, berhenti
		} else {
			// error bisnis/server — hapus dari antrian + catat error
			dequeue(item.id)
			errors.tambah({
				pesan: `Antrian gagal: ${res.error ?? 'Kesalahan tidak diketahui'}`,
				asli: res.error ?? 'unknown',
				modul: 'offline-queue',
				aksi: 'flush',
				bisaRetry: false,
				retry: null,
			})
		}
	}

	syncStatus.set(get(_queue).length > 0 ? 'unsynced' : 'synced')
	return n
}
