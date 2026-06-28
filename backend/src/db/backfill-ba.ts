// Backfill karyawan ber-email → identity better-auth (Fase A). Idempoten.
//
// Untuk tiap karyawan yang punya email & belum ter-link (ba_user_id null):
//  1. tautkan ke user better-auth yang sudah ada (email sama), ATAU
//  2. buat user + account(credential) baru dgn password = hash existing.
//
// Password TIDAK di-hash ulang (plaintext tak ada) — hash lama (PBKDF2/bcrypt)
// disalin apa adanya; better-auth memverifikasinya lewat password.verify hook
// (utils/password.ts), jadi tak perlu reset paksa.
//
// Karyawan TANPA email dilewati → nanti kena gate lengkapi-email di Fase B.
// Jalankan PROD DB (auth identity hidup di prod, bukan demo).

import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import { prodDb } from './index.ts'
import { ba_account, ba_user, karyawan } from './schema.ts'

// id bergaya better-auth (string acak) — better-auth menerima string id apa pun.
function genId(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

export type BackfillResult = {
  total: number // karyawan ber-email belum ter-link
  linked: number // ditautkan ke user existing
  created: number // user+account baru dibuat
  skippedNoHash: number // tak ada password_hash → tak bisa dibuat
}

type KaryawanLite = {
  id: number
  nama: string
  email: string
  password_hash: string | null
}

// Tautkan satu karyawan ke identity better-auth: pakai user existing (email sama)
// atau buat user + account(credential) baru dgn hash existing. Set karyawan.ba_user_id.
// Dipakai backfill massal, gate lengkapi-email, & admin set email. Idempoten.
export async function linkOrCreateBaUser(
  db: ReturnType<typeof prodDb>,
  k: KaryawanLite,
): Promise<{ baUserId: string; created: boolean } | null> {
  const email = k.email.trim().toLowerCase()
  if (!email) return null

  const existing = await db
    .select({ id: ba_user.id })
    .from(ba_user)
    .where(eq(ba_user.email, email))
    .limit(1)

  if (existing[0]) {
    await db.update(karyawan).set({ ba_user_id: existing[0].id }).where(eq(karyawan.id, k.id))
    return { baUserId: existing[0].id, created: false }
  }

  if (!k.password_hash) return null // tanpa hash tak bisa bikin account credential

  const now = new Date()
  const userId = genId()
  await db.insert(ba_user).values({
    id: userId,
    name: k.nama,
    email,
    email_verified: false,
    created_at: now,
    updated_at: now,
  })
  // Account credential: account_id = user_id (konvensi better-auth utk password).
  await db.insert(ba_account).values({
    id: genId(),
    user_id: userId,
    account_id: userId,
    provider_id: 'credential',
    password: k.password_hash,
    created_at: now,
    updated_at: now,
  })
  await db.update(karyawan).set({ ba_user_id: userId }).where(eq(karyawan.id, k.id))
  return { baUserId: userId, created: true }
}

export async function backfillBetterAuth(): Promise<BackfillResult> {
  const db = prodDb()
  const res: BackfillResult = { total: 0, linked: 0, created: 0, skippedNoHash: 0 }

  const rows = await db
    .select({
      id: karyawan.id,
      nama: karyawan.nama,
      email: karyawan.email,
      password_hash: karyawan.password_hash,
    })
    .from(karyawan)
    .where(and(isNotNull(karyawan.email), isNull(karyawan.ba_user_id)))

  res.total = rows.length

  for (const k of rows) {
    if (!k.email) continue
    if (!k.password_hash) {
      // Cek dulu: mungkin user existing bisa ditautkan walau tanpa hash.
      const linked = await linkOrCreateBaUser(db, { id: k.id!, nama: k.nama, email: k.email, password_hash: null })
      if (linked) res.linked++
      else res.skippedNoHash++
      continue
    }
    const r = await linkOrCreateBaUser(db, {
      id: k.id!,
      nama: k.nama,
      email: k.email,
      password_hash: k.password_hash,
    })
    if (r?.created) res.created++
    else if (r) res.linked++
  }

  return res
}

// Jalankan langsung: `bun run src/db/backfill-ba.ts` (DATABASE_URL ke DB prod).
if (import.meta.main) {
  backfillBetterAuth()
    .then((r) => {
      console.log('Backfill better-auth selesai:', r)
      process.exit(0)
    })
    .catch((e) => {
      console.error('Backfill gagal:', e)
      process.exit(1)
    })
}
