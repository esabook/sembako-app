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

// bunny.net family+weights per font (null = system font, no load needed)
const FONT_BUNNY: Record<FontPilihan, string | null> = {
	'jetbrains': 'jetbrains-mono:400,700',
	'ibm-plex-mono': 'ibm-plex-mono:400,700',
	'courier': null,
	'inconsolata': 'inconsolata:400,700',
	'space-mono': 'space-mono:400,700',
	'vt323': 'vt323:400',
	'ibm-plex-sans': 'ibm-plex-sans:400,700',
	'montserrat': 'montserrat:400,700',
}

// 'jetbrains' loaded statically in app.html — skip dynamic inject
const loaded = new Set<FontPilihan>(['jetbrains'])

function loadFont(f: FontPilihan) {
	if (!browser || loaded.has(f)) return
	const family = FONT_BUNNY[f]
	if (!family) return
	const link = document.createElement('link')
	link.rel = 'stylesheet'
	link.href = `https://fonts.bunny.net/css?family=${family}&display=swap`
	document.head.appendChild(link)
	loaded.add(f)
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
	loadFont(val)
	localStorage.setItem(STORAGE_KEY, val)
	document.documentElement.style.fontFamily = FONT_CSS[val]
})
