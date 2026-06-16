// Pure helpers & constants untuk modul pengaturan — tanpa fetch/store/DOM-state.

const MAX_AUDIO_BYTES = 2 * 1024 * 1024 // 2MB

/** Validasi file audio kasir. Return pesan error, atau null jika valid. */
export function validateAudioFile(file: File): string | null {
	if (file.size > MAX_AUDIO_BYTES) {
		return 'File terlalu besar (maks. 2MB). Gunakan klip pendek.'
	}
	return null
}

/** Ambil nama file dari header Content-Disposition. */
export function parseBackupFilename(contentDisposition: string): string {
	const match = contentDisposition.match(/filename="([^"]+)"/)
	return match?.[1] ?? 'stokasir-backup.db'
}

/** File restore valid jika .db (SQLite) atau .json.gz hasil backup. */
export function isValidRestoreFile(name: string): boolean {
	return name.endsWith('.db') || name.endsWith('.json.gz')
}

// ── Opsi pilihan (radio groups) ──────────────────────────────────────────────

export const UKURAN_STRUK_OPTS: [string, string][] = [
	['58', '58mm'],
	['80', '80mm']
]

export const COPY_OPTS: [string, string][] = [
	['1', '1 copy'],
	['2', '2 copy']
]

export const TEMA_OPTS: [string, string][] = [
	['dark', 'Dark'],
	['light', 'Light'],
	['bww', 'BW Putih'],
	['bwb', 'BW Hitam'],
	['island', 'Island Gelap'],
	['islandl', 'Island Terang'],
	['klasik', 'Klasik Gelap'],
	['klasikl', 'Klasik Terang']
]

export const HARGA_OPTS: [string, string][] = [
	['eceran', 'Eceran'],
	['grosir', 'Grosir']
]

export const AUDIO_MODE_OPTS: [string, string][] = [
	['beep', 'Beep bawaan'],
	['file', 'File audio']
]
