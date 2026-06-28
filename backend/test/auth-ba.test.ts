// Unit/integrasi better-auth core + backfill (Fase A).
import { beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { backfillBetterAuth } from '../src/db/backfill-ba.ts'
import { prodDb } from '../src/db/index.ts'
import { ba_account, ba_session, ba_user } from '../src/db/schema.ts'
import { getBetterAuth } from '../src/lib/auth-ba.ts'
import { ensureToko, getKaryawan, seedKaryawan } from './helpers.ts'

const auth = getBetterAuth({})

beforeAll(async () => {
  await ensureToko(1)
})

describe('better-auth core (signup/signin/password)', () => {
  test('signup email+password → 200, user & account credential tersimpan', async () => {
    const res = await auth.api.signUpEmail({
      body: { email: 'core@x.id', password: 'rahasia123', name: 'Core' },
      asResponse: true,
    })
    expect(res.status).toBe(200)

    const u = await prodDb().select().from(ba_user).where(eq(ba_user.email, 'core@x.id'))
    expect(u[0]?.name).toBe('Core')
    expect(u[0]?.email_verified).toBe(false)

    const acc = await prodDb().select().from(ba_account).where(eq(ba_account.user_id, u[0]!.id))
    expect(acc[0]?.provider_id).toBe('credential')
    expect(acc[0]?.password).toBeTruthy()
  })

  test('signin benar → 200 + session row (expires_at = Date)', async () => {
    const res = await auth.api.signInEmail({
      body: { email: 'core@x.id', password: 'rahasia123' },
      asResponse: true,
    })
    expect(res.status).toBe(200)
    const u = await prodDb().select().from(ba_user).where(eq(ba_user.email, 'core@x.id'))
    const sess = await prodDb().select().from(ba_session).where(eq(ba_session.user_id, u[0]!.id))
    expect(sess.length).toBeGreaterThanOrEqual(1)
    expect(sess[0]?.expires_at).toBeInstanceOf(Date)
  })

  test('signin salah password → 401', async () => {
    const res = await auth.api.signInEmail({
      body: { email: 'core@x.id', password: 'salah' },
      asResponse: true,
    })
    expect(res.status).toBe(401)
  })

  test('bridge: token signin cocok dgn ba_session.id', async () => {
    const r = await auth.api.signInEmail({ body: { email: 'core@x.id', password: 'rahasia123' } })
    const token = (r as { token?: string }).token
    expect(token).toBeTruthy()
    const sess = await prodDb()
      .select({ id: ba_session.id })
      .from(ba_session)
      .where(eq(ba_session.token, token!))
    expect(sess[0]?.id).toBeTruthy()
  })
})

describe('backfill karyawan → better-auth', () => {
  test('buat user+account dari hash legacy, idempoten, login pakai password lama', async () => {
    await seedKaryawan({ username: 'bf1', email: 'bf1@x.id', password: 'legacy123', role: 'kasir' })

    const r1 = await backfillBetterAuth()
    expect(r1.created).toBeGreaterThanOrEqual(1)

    const k = await getKaryawan('bf1')
    expect(k?.ba_user_id).toBeTruthy()

    // password_hash karyawan disalin apa adanya ke account.
    const acc = await prodDb()
      .select({ password: ba_account.password })
      .from(ba_account)
      .where(eq(ba_account.user_id, k!.ba_user_id!))
    expect(acc[0]?.password).toBe(k!.password_hash)

    // re-run tak bikin user duplikat (idempoten).
    await backfillBetterAuth()
    const users = await prodDb().select().from(ba_user).where(eq(ba_user.email, 'bf1@x.id'))
    expect(users.length).toBe(1)

    // login better-auth pakai password legacy (verify lewat utils/password.ts).
    const si = await auth.api.signInEmail({
      body: { email: 'bf1@x.id', password: 'legacy123' },
      asResponse: true,
    })
    expect(si.status).toBe(200)
  })

  test('karyawan tanpa email dilewati (tetap ba_user_id null)', async () => {
    await seedKaryawan({ username: 'noemail1', email: null, password: '111111', role: 'gudang' })
    await backfillBetterAuth()
    const k = await getKaryawan('noemail1')
    expect(k?.ba_user_id).toBeNull()
  })

  test('karyawan email sama dgn user existing → ditautkan, bukan dibuat baru', async () => {
    // user 'core@x.id' sudah ada dari test core. Buat karyawan email sama.
    await seedKaryawan({ username: 'linkcore', email: 'core@x.id', password: 'apa', role: 'manajer' })
    const before = await prodDb().select().from(ba_user).where(eq(ba_user.email, 'core@x.id'))
    const r = await backfillBetterAuth()
    expect(r.linked).toBeGreaterThanOrEqual(1)
    const after = await prodDb().select().from(ba_user).where(eq(ba_user.email, 'core@x.id'))
    expect(after.length).toBe(before.length) // tak ada user baru
    const k = await getKaryawan('linkcore')
    expect(k?.ba_user_id).toBe(after[0]!.id)
  })
})
