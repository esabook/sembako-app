import { writable, derived } from 'svelte/store'

export type Role = 'pemilik' | 'manajer' | 'kasir' | 'gudang'

export type User = {
  id: number
  nama: string
  role: Role
  kode_karyawan?: string
}

export const user = writable<User | null>(null)
export const isLoggedIn = derived(user, ($u) => $u !== null)
