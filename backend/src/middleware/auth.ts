import type { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import { jwtVerify } from 'jose'
import type { JWTPayload } from '../routes/auth.ts'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-ganti-di-production'
)

export type Role = 'pemilik' | 'manajer' | 'kasir' | 'gudang'
export type Permission = string

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  kasir: [
    'stok.lihat',
    'harga_jual.lihat',
    'penjualan.buat',
    'penjualan.lihat',
    'absensi.diri',
  ],
  gudang: [
    'stok.lihat',
    'stok.edit',
    'harga_beli.lihat',
    'harga_beli.edit',
    'pembelian.buat',
    'pembelian.lihat',
    'absensi.diri',
  ],
  manajer: [
    'stok.*',
    'harga_jual.*',
    'harga_beli.*',
    'penjualan.*',
    'pembelian.*',
    'piutang.*',
    'hutang.*',
    'laporan.*',
    'karyawan.lihat',
    'absensi.semua',
    'gaji.lihat',
    'gaji.edit',
  ],
  pemilik: ['*'],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? []
  if (perms.includes('*')) return true

  const [modul, aksi] = permission.split('.')
  return (
    perms.includes(permission) ||
    perms.includes(`${modul}.*`)
  )
}

export async function authMiddleware(c: Context, next: Next) {
  const token = getCookie(c, 'auth_token')
  if (!token) throw new HTTPException(401, { message: 'Tidak terautentikasi' })

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    c.set('user', payload as JWTPayload)
  } catch {
    throw new HTTPException(401, { message: 'Token tidak valid atau kedaluwarsa' })
  }

  await next()
}

export function requirePermission(permission: Permission) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as JWTPayload
    if (!user) throw new HTTPException(401, { message: 'Tidak terautentikasi' })

    if (!hasPermission(user.role as Role, permission)) {
      throw new HTTPException(403, { message: 'Akses ditolak' })
    }

    await next()
  }
}
