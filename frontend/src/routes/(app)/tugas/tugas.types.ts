export type Item = {
	id: number
	nama: string
	kategori: string
	urutan: number
	is_active: boolean
}

export type LogRow = {
	log_id: number | null
	item_id: number
	nama: string
	kategori: string
	urutan: number
	selesai: boolean | null
	catatan: string | null
	nama_karyawan: string | null
	tanggal: string | null
}

export type TemplateForm = {
	nama: string
	kategori: string
	urutan: string
}
