import { writable } from 'svelte/store'
import { browser } from '$app/environment'

export type Tema = 'dark' | 'light' | 'eye' | 'bww' | 'bwb' | 'island'

const STORAGE_KEY = 'tema'
const DEFAULT: Tema = 'dark'

function temaAwal(): Tema {
  if (!browser) return DEFAULT
  return (localStorage.getItem(STORAGE_KEY) as Tema) ?? DEFAULT
}

export const tema = writable<Tema>(temaAwal())

tema.subscribe((val) => {
  if (!browser) return
  localStorage.setItem(STORAGE_KEY, val)
  document.documentElement.setAttribute('data-theme', val)
})
