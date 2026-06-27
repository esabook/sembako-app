import { get } from 'svelte/store'
import { withLoading } from '$lib/utils/async'
import { toast } from '$lib/stores/ui.store'
import { invalidateToko } from '$lib/stores/toko-version'
import { ukuranFont, UKURAN_MIN, UKURAN_MAX } from '$lib/stores/ukuran-font'
import { audioLoad, audioSave, type AudioMode } from '$lib/utils/audio'
import { getPengaturan, simpanPengaturan, downloadBackupDb, restoreDb } from './pengaturan.api'
import { validateAudioFile, isValidRestoreFile } from './pengaturan.logic'
import { defaultSettings, type Settings } from './pengaturan.types'

export function createPengaturanStore() {
	// ── Server settings ──────────────────────────────────────────────────────
	let form = $state<Settings>(defaultSettings())
	let loading = $state(true)
	let saving = $state(false)

	// ── Ukuran font (localStorage, per-device — draft, commit saat simpan) ────
	let ukuranDraft = $state(get(ukuranFont))

	// ── Audio kasir (localStorage, per-device) ───────────────────────────────
	let audioOn = $state(true)
	let audioMode = $state<AudioMode>('beep')
	let audioFileName = $state('')
	let audioFileSrc = $state('')
	let audioFileErr = $state('')

	// ── Backup ───────────────────────────────────────────────────────────────
	let backing = $state(false)
	let backupIncludeMedia = $state(false)

	// ── Restore ──────────────────────────────────────────────────────────────
	let restoring = $state(false)
	let restoreFile = $state<File | null>(null)
	let restoreConfirm = $state(false)

	// ── Load ───────────────────────────────────────────────────────────────────

	async function muat() {
		const hasil = await withLoading(() => getPengaturan(), {
			loadingKey: 'pengaturan-muat',
			loadingPesan: 'Memuat pengaturan...',
			modul: 'pengaturan',
			aksi: 'muat',
			errorPesan: 'Gagal memuat pengaturan',
			bisaRetry: true
		})
		if (hasil) form = { ...form, ...hasil }
		loading = false

		const a = audioLoad()
		audioOn = a.on
		audioMode = a.mode
		audioFileName = a.name
		audioFileSrc = a.src
	}

	async function simpan() {
		saving = true
		await withLoading(() => simpanPengaturan(form), {
			loadingKey: 'pengaturan-simpan',
			loadingPesan: 'Menyimpan...',
			modul: 'pengaturan',
			aksi: 'simpan',
			suksesPesan: 'Pengaturan tersimpan',
			suksesOtomatis: true,
			errorPesan: 'Gagal menyimpan pengaturan'
		})
		// commit ukuran font (clamp + apply global + localStorage via store)
		ukuranFont.set(Math.min(UKURAN_MAX, Math.max(UKURAN_MIN, Math.round(ukuranDraft))))
		// identitas toko mungkin berubah → invalidate konsumen (layout/NavUser)
		invalidateToko()
		saving = false
	}

	// ── Audio ──────────────────────────────────────────────────────────────────

	function simpanAudio() {
		audioSave({ on: audioOn, mode: audioMode, src: audioFileSrc, name: audioFileName })
	}

	function pilihFileAudio(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0]
		if (!file) return
		const err = validateAudioFile(file)
		if (err) {
			audioFileErr = err
			return
		}
		audioFileErr = ''
		const reader = new FileReader()
		reader.onload = (ev) => {
			audioFileSrc = ev.target?.result as string
			audioFileName = file.name
			simpanAudio()
		}
		reader.readAsDataURL(file)
	}

	function hapusFileAudio() {
		audioFileSrc = ''
		audioFileName = ''
		audioMode = 'beep'
		simpanAudio()
	}

	// ── Backup ───────────────────────────────────────────────────────────────

	async function downloadBackup() {
		if (backing) return
		backing = true
		try {
			await downloadBackupDb(backupIncludeMedia)
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Gagal menghubungi server')
		} finally {
			backing = false
		}
	}

	// ── Restore ──────────────────────────────────────────────────────────────

	function pilihFileRestore(e: Event) {
		const f = (e.target as HTMLInputElement).files?.[0]
		if (!f) return
		if (!isValidRestoreFile(f.name)) {
			toast.error('Pilih file .db atau .json.gz hasil backup Stokasir')
			return
		}
		restoreFile = f
		restoreConfirm = false
	}

	async function jalankanRestore() {
		if (!restoreFile) return
		restoring = true
		try {
			const json = await restoreDb(restoreFile)
			if (json.success) {
				toast.sukses('Restore berhasil. Halaman akan dimuat ulang...')
				setTimeout(() => window.location.reload(), 3000)
			} else {
				toast.error(json.error ?? 'Restore gagal')
			}
		} catch {
			toast.error('Gagal menghubungi server')
		} finally {
			restoring = false
			restoreConfirm = false
		}
	}

	return {
		// server settings
		get form() {
			return form
		},
		get loading() {
			return loading
		},
		get saving() {
			return saving
		},
		// ukuran font (draft)
		get ukuranDraft() {
			return ukuranDraft
		},
		set ukuranDraft(v) {
			ukuranDraft = v
		},
		// audio
		get audioOn() {
			return audioOn
		},
		set audioOn(v) {
			audioOn = v
		},
		get audioMode() {
			return audioMode
		},
		set audioMode(v) {
			audioMode = v
		},
		get audioFileName() {
			return audioFileName
		},
		get audioFileSrc() {
			return audioFileSrc
		},
		get audioFileErr() {
			return audioFileErr
		},
		// backup
		get backing() {
			return backing
		},
		get backupIncludeMedia() {
			return backupIncludeMedia
		},
		set backupIncludeMedia(v) {
			backupIncludeMedia = v
		},
		// restore
		get restoring() {
			return restoring
		},
		get restoreFile() {
			return restoreFile
		},
		set restoreFile(v) {
			restoreFile = v
		},
		get restoreConfirm() {
			return restoreConfirm
		},
		set restoreConfirm(v) {
			restoreConfirm = v
		},
		// actions
		muat,
		simpan,
		simpanAudio,
		pilihFileAudio,
		hapusFileAudio,
		downloadBackup,
		pilihFileRestore,
		jalankanRestore
	}
}
