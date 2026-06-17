import { derived, writable } from 'svelte/store'
import { browser } from '$app/environment'

export type Skin = 'normal' | 'bw' | 'island' | 'klasik' | 'lambo'
export type Mode = 'dark' | 'light' | 'system'
export type Tema = 'dark' | 'light' | 'bww' | 'bwb' | 'island' | 'islandl' | 'klasik' | 'klasikl' | 'lambo' | 'lambol'

// ── Config: tema options untuk UI ──────────────────────────────────────────────

export const MODE_LIST: { nilai: Mode; label: string; ikon: string }[] = [
	{ nilai: 'dark', label: 'Gelap', ikon: '🌙' },
	{ nilai: 'light', label: 'Terang', ikon: '☀️' },
	{ nilai: 'system', label: 'Sistem', ikon: '🖥️' }
];

export const SKIN_LIST: { nilai: Skin; label: string; deskripsi: string }[] = [
	{ nilai: 'normal', label: 'Normal', deskripsi: 'Default' },
	{ nilai: 'bw', label: 'Hitam-Putih', deskripsi: 'Kontras tinggi' },
	{ nilai: 'island', label: 'Island', deskripsi: 'Panel mengambang' },
	{ nilai: 'klasik', label: 'Klasik', deskripsi: 'Kasir terminal' },
	{ nilai: 'lambo', label: 'Lambo', deskripsi: 'Tema Lamborghini' }
];

// Untuk radio group / select dropdown
export const TEMA_OPTS: [string, string][] = [
	['dark', 'Dark'],
	['light', 'Light'],
	['bww', 'BW Putih'],
	['bwb', 'BW Hitam'],
	['island', 'Island Gelap'],
	['islandl', 'Island Terang'],
	['klasik', 'Klasik Gelap'],
	['klasikl', 'Klasik Terang'],
	['lambo', 'Lambo Gelap'],
	['lambol', 'Lambo Terang']
];

const SKIN_KEY = 'tema_skin'
const MODE_KEY = 'tema_mode'

function skinAwal(): Skin {
  if (!browser) return 'normal'
  return (localStorage.getItem(SKIN_KEY) as Skin) ?? 'normal'
}

function modeAwal(): Mode {
  if (!browser) return 'system'
  return (localStorage.getItem(MODE_KEY) as Mode) ?? 'system'
}

export const temaSkin = writable<Skin>(skinAwal())
export const temaMode = writable<Mode>(modeAwal())

const systemGelap = writable<boolean>(
  browser ? window.matchMedia('(prefers-color-scheme: dark)').matches : true
)

if (browser) {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (e) => systemGelap.set(e.matches))
}

function resolveTema(skin: Skin, mode: Mode, gelapSistem: boolean): Tema {
  const gelap = mode === 'system' ? gelapSistem : mode === 'dark'
  switch (skin) {
    case 'bw':
      return gelap ? 'bwb' : 'bww'
    case 'island':
      return gelap ? 'island' : 'islandl'
    case 'klasik':
      return gelap ? 'klasik' : 'klasikl'
    case 'lambo':
      return gelap ? 'lambo' : 'lambol'
    default:
      return gelap ? 'dark' : 'light'
  }
}

export const tema = derived(
  [temaSkin, temaMode, systemGelap],
  ([$skin, $mode, $gelapSistem]) => resolveTema($skin, $mode, $gelapSistem)
)

const DARK_VARIANTS: Tema[] = ['dark', 'bwb', 'island', 'klasik', 'lambo']

// Swap skin CSS file on theme change
function swapSkinCSS(skin: Skin) {
  if (!browser) return
  let link = document.getElementById('skin-css') as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.rel = 'stylesheet'
    link.id = 'skin-css'
    document.head.appendChild(link)
  }
  link.href = `/themes/${skin}.css`
}

tema.subscribe((val) => {
  if (!browser) return
  document.documentElement.setAttribute('data-theme', val)
  document.documentElement.classList.toggle('dark', DARK_VARIANTS.includes(val))
})

temaSkin.subscribe((val) => {
  if (browser) {
    localStorage.setItem(SKIN_KEY, val)
    swapSkinCSS(val)
  }
})

temaMode.subscribe((val) => {
  if (browser) localStorage.setItem(MODE_KEY, val)
})

const SIKLUS: Array<{ skin: Skin; mode: Mode }> = [
  { skin: 'normal', mode: 'dark' },
  { skin: 'normal', mode: 'light' },
  { skin: 'bw',     mode: 'dark' },
  { skin: 'bw',     mode: 'light' },
  { skin: 'island', mode: 'dark' },
  { skin: 'island', mode: 'light' },
  { skin: 'klasik', mode: 'dark' },
  { skin: 'klasik', mode: 'light' },
  { skin: 'lambo',  mode: 'dark' },
  { skin: 'lambo',  mode: 'light' },
]

const TEMA_KE_IDX: Record<Tema, number> = {
  dark: 0, light: 1, bwb: 2, bww: 3, island: 4, islandl: 5, klasik: 6, klasikl: 7, lambo: 8, lambol: 9,
}

export function nextTema(temaSekarang: Tema): void {
  const idx = TEMA_KE_IDX[temaSekarang] ?? 0
  const next = SIKLUS[(idx + 1) % SIKLUS.length]
  temaSkin.set(next.skin)
  temaMode.set(next.mode)
}
