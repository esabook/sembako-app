import { writable, derived } from 'svelte/store'

export type Role = 'pemilik' | 'manajer' | 'kasir' | 'gudang'

export type User = {
  id: number
  nama: string
  role: Role
}

export const user = writable<User | null>(null)
export const isLoggedIn = derived(user, ($u) => $u !== null)
