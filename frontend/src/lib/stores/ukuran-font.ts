import { writable } from 'svelte/store'
import { browser } from '$app/environment'

export const UKURAN_MIN = 10
export const UKURAN_MAX = 72
export const UKURAN_DEFAULT = 14

const STORAGE_KEY = 'ukuran-font'

function ukuranAwal(): number {
	if (!browser) return UKURAN_DEFAULT
	const val = parseInt(localStorage.getItem(STORAGE_KEY) ?? '')
	if (isNaN(val) || val < UKURAN_MIN || val > UKURAN_MAX) return UKURAN_DEFAULT
	return val
}

export const ukuranFont = writable<number>(ukuranAwal())

ukuranFont.subscribe((val) => {
	if (!browser) return
	localStorage.setItem(STORAGE_KEY, String(val))
	document.documentElement.style.fontSize = val + 'px'
})
