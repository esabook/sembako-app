import type { AudioMode } from '$lib/utils/audio'

export type { AudioMode }

export type Settings = {
	nama_toko: string
	alamat: string
	telepon: string
	email: string
	struk_header: string
	struk_footer: string
	struk_ukuran: string
	struk_copy: string
	auto_cetak: string
	wa_nomor: string
	tema_default: string
	harga_default: string
}

export function defaultSettings(): Settings {
	return {
		nama_toko: '',
		alamat: '',
		telepon: '',
		email: '',
		struk_header: '',
		struk_footer: '',
		struk_ukuran: '80',
		struk_copy: '1',
		auto_cetak: 'false',
		wa_nomor: '',
		tema_default: 'dark',
		harga_default: 'eceran'
	}
}
