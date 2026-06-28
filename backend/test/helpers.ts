// Util bersama test better-auth.
import { eq } from 'drizzle-orm'
import { prodDb } from '../src/db/index.ts'
import { karyawan, toko } from '../src/db/schema.ts'
import { hashPassword } from '../src/utils/password.ts'

let kodeSeq = 0

export async function ensureToko(id = 1): Promise<void> {
  await prodDb()
    .insert(toko)
    .values({ id, kode_toko: `T${id}`, nama: `Toko ${id}`, status_langganan: 'trial' })
    .onConflictDoNothing()
}

export type SeedKaryawan = {
  nama?: string
  role?: 'pemilik' | 'manajer' | 'kasir' | 'gudang'
  username: string
  email?: string | null
  password: string
  toko_id?: number
}

// Buat karyawan dgn password_hash asli (lewat util) → bisa diverify better-auth.
export async function seedKaryawan(k: SeedKaryawan): Promise<number> {
  kodeSeq++
  const hash = await hashPassword(k.password)
  const rows = await prodDb()
    .insert(karyawan)
    .values({
      kode_karyawan: `KRY-T${kodeSeq}`,
      nama: k.nama ?? k.username,
      role: k.role ?? 'kasir',
      username: k.username,
      email: k.email ?? null,
      password_hash: hash,
      tipe_gaji: 'bulanan',
      toko_id: k.toko_id ?? 1,
    })
    .returning({ id: karyawan.id })
  return rows[0]!.id!
}

export async function getKaryawan(username: string) {
  const r = await prodDb().select().from(karyawan).where(eq(karyawan.username, username))
  return r[0]
}

// Ambil nilai cookie auth_token dari response (format "auth_token=<jwt>").
export function authCookie(res: Response): string {
  const sc = res.headers.get('set-cookie') ?? ''
  return sc.match(/auth_token=[^;]+/)?.[0] ?? ''
}

// Decode payload JWT dari string cookie tanpa verifikasi (cukup utk assert isi).
export function jwtPayload(cookie: string): Record<string, unknown> {
  const jwt = cookie.split('=')[1] ?? ''
  const part = jwt.split('.')[1] ?? ''
  return JSON.parse(Buffer.from(part, 'base64').toString('utf8'))
}
