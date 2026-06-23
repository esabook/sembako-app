import { writable, derived } from 'svelte/store'

export type Role = 'pemilik' | 'manajer' | 'kasir' | 'gudang' | 'sales' | 'pelayanan'

export type User = {
  id: number
  nama: string
  role: Role
  kode_karyawan?: string
  tenant_id?: number
  cabang_id?: number | null
  saas?: boolean
}

export const user = writable<User | null>(null)
export const isLoggedIn = derived(user, ($u) => $u !== null)
