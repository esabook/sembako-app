import { goto } from '$app/navigation'
import { user } from '$lib/stores/auth'
import { loginApi, fetchNamaToko, fetchServerIP } from './login.api'
import { formatWaktu } from './login.logic'
import type { User } from '$lib/stores/auth'

export function createLoginStore() {
	let username = $state('')
	let password = $state('')
	let showPassword = $state(false)
	let rememberMe = $state(false)
	let attemptsLeft = $state(3)
	let showBrand = $state(false)
	let namaToko = $state('')
	let serverIP = $state('')
	let timeStr = $state('--:--:--')
	let dateStr = $state('')
	let loading = $state(false)
	let error = $state('')

	async function login(e: Event) {
		e.preventDefault()
		if (attemptsLeft <= 0) return
		error = ''
		loading = true
		try {
			const hasil = await loginApi(username, password)
			user.set(hasil as User)
			goto('/dashboard')
		} catch (err) {
			attemptsLeft = Math.max(0, attemptsLeft - 1)
			const msg = err instanceof Error ? err.message : String(err)
			const s = msg.toLowerCase()
			if (s.includes('failed to fetch') || s.includes('networkerror'))
				error = 'Koneksi ke server gagal. Cek jaringan WiFi.'
			else
				error = msg || 'Username atau password salah.'
		} finally {
			loading = false
		}
	}

	function muatInfo(hostname: string) {
		serverIP = hostname
		fetchNamaToko()
			.then((v) => {
				namaToko = v
			})
			.catch(() => { })
		fetchServerIP(hostname)
			.then((v) => {
				serverIP = v
			})
			.catch(() => { })
	}

	function tick(now: Date) {
		const w = formatWaktu(now)
		timeStr = w.timeStr
		dateStr = w.dateStr
	}

	function clearPassword() {
		password = ''
	}

	return {
		get username() {
			return username
		},
		set username(v: string) {
			username = v
			error = ''
		},
		get password() {
			return password
		},
		set password(v: string) {
			password = v
			error = ''
		},
		get showPassword() {
			return showPassword
		},
		set showPassword(v: boolean) {
			showPassword = v
		},
		get rememberMe() {
			return rememberMe
		},
		set rememberMe(v: boolean) {
			rememberMe = v
		},
		get attemptsLeft() {
			return attemptsLeft
		},
		get showBrand() {
			return showBrand
		},
		set showBrand(v: boolean) {
			showBrand = v
		},
		get namaToko() {
			return namaToko
		},
		get serverIP() {
			return serverIP
		},
		get timeStr() {
			return timeStr
		},
		get dateStr() {
			return dateStr
		},
		get loading() {
			return loading
		},
		get error() {
			return error
		},
		login,
		muatInfo,
		tick,
		clearPassword
	}
}
