import { derived, writable } from 'svelte/store'
import { browser } from '$app/environment'

export type Skin = 'normal' | 'bw' | 'island' | 'klasik'
export type Mode = 'dark' | 'light' | 'system'
export type Tema = 'dark' | 'light' | 'bww' | 'bwb' | 'island' | 'islandl' | 'klasik' | 'klasikl'

const SKIN_KEY = 'tema_skin'
const MODE_KEY = 'tema_mode'

function skinAwal(): Skin {
  if (!browser) return 'normal'
  return (localStorage.getItem(SKIN_KEY) as Skin) ?? 'normal'
}

function modeAwal(): Mode {
  if (!browser) return 'dark'
  return (localStorage.getItem(MODE_KEY) as Mode) ?? 'dark'
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
    default:
      return gelap ? 'dark' : 'light'
  }
}

export const tema = derived(
  [temaSkin, temaMode, systemGelap],
  ([$skin, $mode, $gelapSistem]) => resolveTema($skin, $mode, $gelapSistem)
)

const DARK_VARIANTS: Tema[] = ['dark', 'bwb', 'island', 'klasik']

tema.subscribe((val) => {
  if (!browser) return
  document.documentElement.setAttribute('data-theme', val)
  document.documentElement.classList.toggle('dark', DARK_VARIANTS.includes(val))
})

temaSkin.subscribe((val) => {
  if (browser) localStorage.setItem(SKIN_KEY, val)
})

temaMode.subscribe((val) => {
  if (browser) localStorage.setItem(MODE_KEY, val)
})
