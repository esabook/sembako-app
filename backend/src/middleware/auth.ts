import type { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import { jwtVerify } from 'jose'
import { eq } from 'drizzle-orm'
import { db, query, runWithDemo } from '../db/index.ts'
import { karyawan } from '../db/schema.ts'
import type { JWTPayload } from '../routes/auth.ts'
import { getCache } from '../lib/cache.ts'

const jwtSecret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-ganti-di-production')

export type Role = 'pemilik' | 'manajer' | 'kasir' | 'gudang' | 'sales' | 'pelayanan'
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
  sales: [
    'stok.lihat',
    'harga_jual.lihat',
    'pelanggan.lihat',
    'pelanggan.edit',
    'penjualan.lihat',
    'penjualan.buat',
    'absensi.diri',
  ],
  pelayanan: [
    'stok.lihat',
    'harga_jual.lihat',
    'pelanggan.lihat',
    'penjualan.lihat',
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

  let user: JWTPayload
  try {
    const { payload } = await jwtVerify(token, jwtSecret())
    user = payload as JWTPayload
  } catch (e) {
    if (e instanceof HTTPException) throw e
    throw new HTTPException(401, { message: 'Token tidak valid atau kedaluwarsa' })
  }

  // Sesi demo: route SEMUA query (termasuk cek is_active + handler) ke DB demo.
  // user.id = pemilik demo (ada di demo DB), jadi lookup di bawah konsisten.
  const handle = async () => {
    const cache = getCache(c.env as { KV?: unknown })
    // Namespace cache per-DB agar is_active demo & prod tidak saling cemar (id bisa collision).
    const cacheKey = `user:active:${user.is_demo ? 'demo:' : ''}${user.id}`
    const cached = await cache.get(cacheKey)

    let isActive: boolean
    if (cached !== null) {
      isActive = cached === '1'
    } else {
      const row = await query.find<{ is_active: boolean }>(
        db.select({ is_active: karyawan.is_active }).from(karyawan).where(eq(karyawan.id, user.id))
      )
      isActive = row?.is_active ?? false
      await cache.put(cacheKey, isActive ? '1' : '0', { expirationTtl: 600 })
    }

    if (!isActive) throw new HTTPException(401, { message: 'Akun tidak aktif' })
    c.set('user', user)
    await next()
  }

  if (user.is_demo) return runWithDemo(handle)
  return handle()
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
