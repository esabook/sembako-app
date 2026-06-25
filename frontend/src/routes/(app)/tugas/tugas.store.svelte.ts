import { SvelteDate } from 'svelte/reactivity'
import { withLoading } from '$lib/utils/async'
import type { Item, LogRow, TemplateForm } from './tugas.types'
import * as api from './tugas.api'

export function createTugasStore() {
	let tanggal = $state(new SvelteDate().toLocaleDateString('sv-SE'))
	let items = $state<Item[]>([])
	let logRows = $state<LogRow[]>([])

	const loading = $state(false)

	// form template
	let tab = $state('harian') // 'harian' | 'template'	
	let formOpen = $state(false)
	let editItem = $state<Item | null>(null)
	let form = $state<TemplateForm>({ nama: '', kategori: 'kebersihan', urutan: '0' })
	let konfirmHapus = $state<{ buka: boolean; id: number | null }>({ buka: false, id: null })

	// derived
	const grouped = $derived(() => {
		const m: Record<string, LogRow[]> = {}
		for (const r of logRows) {
			if (!m[r.kategori]) m[r.kategori] = []
			m[r.kategori].push(r)
		}
		return m
	})

	const totalSelesai = $derived(logRows.filter((r) => r.selesai).length)
	const totalItem = $derived(logRows.length)
	const persen = $derived(totalItem > 0 ? Math.round((totalSelesai / totalItem) * 100) : 0)

	// actions
	async function muatLog() {
		const hasil = await withLoading(() => api.fetchLog(tanggal), {
			loadingKey: 'tugas-log',
			loadingPesan: 'Memuat tugas...',
			modul: 'tugas',
			aksi: 'muat-log',
			bisaRetry: true,
		})
		if (hasil) logRows = hasil
	}

	async function muatItems() {
		const hasil = await withLoading(() => api.fetchItems(), {
			loadingKey: 'tugas-item',
			loadingPesan: 'Memuat item...',
			modul: 'tugas',
			aksi: 'muat-item',
			bisaRetry: true,
		})
		if (hasil) items = hasil
	}

	async function tandai(itemId: number, selesai: boolean) {
		await withLoading(() => api.tandaiItem(itemId, selesai, tanggal), {
			loadingKey: 'tugas-tandai',
			modul: 'tugas',
			aksi: 'tandai',
		})
		await muatLog()
	}

	async function simpanItem() {
		if (!form.nama.trim()) return
		const payload: TemplateForm = { ...form }
		const editId = editItem?.id
		await withLoading(() => api.simpanItem(payload, editId), {
			loadingKey: 'tugas-simpan',
			loadingPesan: 'Menyimpan...',
			modul: 'tugas',
			aksi: 'simpan',
			suksesOtomatis: true,
		})
		formOpen = false
		await muatItems()
	}

	async function hapusItem() {
		if (!konfirmHapus.id) return
		await withLoading(() => api.hapusItem(konfirmHapus.id!), {
			loadingKey: 'tugas-hapus',
			loadingPesan: 'Menghapus...',
			modul: 'tugas',
			aksi: 'hapus',
			suksesOtomatis: true,
		})
		konfirmHapus = { buka: false, id: null }
		await muatItems()
	}

	// form helpers
	function bukaFormTambah() {
		editItem = null
		form = { nama: '', kategori: 'kebersihan', urutan: '0' }
		formOpen = true
	}

	function bukaFormEdit(item: Item) {
		editItem = item
		form = { nama: item.nama, kategori: item.kategori, urutan: String(item.urutan) }
		formOpen = true
	}


	return {
		get tanggal() { return tanggal },
		set tanggal(v) { tanggal = v },
		get items() { return items },
		get logRows() { return logRows },
		get tab() { return tab },
		set tab(v) { tab = v },
		get loading() { return loading },
		get grouped() { return grouped() },
		get totalSelesai() { return totalSelesai },
		get totalItem() { return totalItem },
		get persen() { return persen },

		// form
		get formOpen() { return formOpen },
		set formOpen(v) { formOpen = v },
		get editItem() { return editItem },
		get form() { return form },
		set form(v) { form = v },
		get konfirmHapus() { return konfirmHapus },
		set konfirmHapus(v) { konfirmHapus = v },

		muatLog,
		muatItems,
		tandai,
		simpanItem,
		hapusItem,
		bukaFormTambah,
		bukaFormEdit,
	}
}
