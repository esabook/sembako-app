import { writable } from 'svelte/store'
import { browser } from '$app/environment'

export type FontPilihan =
	| 'jetbrains'
	| 'ibm-plex-mono'
	| 'courier'
	| 'inconsolata'
	| 'space-mono'
	| 'vt323'
	| 'ibm-plex-sans'
	| 'montserrat'

export const FONT_LABEL: Record<FontPilihan, string> = {
	'jetbrains': 'JetBrains Mono',
	'ibm-plex-mono': 'IBM Plex Mono',
	'courier': 'Courier New',
	'inconsolata': 'Inconsolata',
	'space-mono': 'Space Mono',
	'vt323': 'VT323',
	'ibm-plex-sans': 'IBM Plex Sans',
	'montserrat': 'Montserrat',
}

export const FONT_CSS: Record<FontPilihan, string> = {
	'jetbrains': "'JetBrains Mono', monospace",
	'ibm-plex-mono': "'IBM Plex Mono', monospace",
	'courier': "'Courier New', monospace",
	'inconsolata': "'Inconsolata', monospace",
	'space-mono': "'Space Mono', monospace",
	'vt323': "'VT323', monospace",
	'ibm-plex-sans': "'IBM Plex Sans', sans-serif",
	'montserrat': "'Montserrat', sans-serif",
}

const STORAGE_KEY = 'font'
const DEFAULT: FontPilihan = 'jetbrains'

function fontAwal(): FontPilihan {
	if (!browser) return DEFAULT
	const tersimpan = localStorage.getItem(STORAGE_KEY) as FontPilihan
	return tersimpan in FONT_LABEL ? tersimpan : DEFAULT
}

export const font = writable<FontPilihan>(fontAwal())

font.subscribe((val) => {
	if (!browser) return
	localStorage.setItem(STORAGE_KEY, val)
	document.documentElement.style.fontFamily = FONT_CSS[val]
})
