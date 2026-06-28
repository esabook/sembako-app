// Integrasi: admin (pemilik/manajer) set email karyawan (Fase B, B3).
import { beforeAll, describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { backfillBetterAuth } from '../src/db/backfill-ba.ts'
import { authRouter } from '../src/routes/auth.ts'
import { karyawanRouter } from '../src/routes/karyawan.ts'
import { authCookie, ensureToko, getKaryawan, jwtPayload, seedKaryawan } from './helpers.ts'

const app = new Hono().route('/auth', authRouter).route('/karyawan', karyawanRouter)
const env = {}

const login = (u: string, p: string) =>
  app.request(
    '/auth/login',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) },
    env,
  )
const patchEmail = (id: number, email: string, cookie: string) =>
  app.request(
    `/karyawan/${id}/email`,
    { method: 'PATCH', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ email }) },
    env,
  )

beforeAll(async () => {
  await ensureToko(1)
  await seedKaryawan({ username: 'ownerk', email: 'ownerk@x.id', password: '111111', role: 'pemilik', toko_id: 1 })
  await seedKaryawan({ username: 'tgtk', email: null, password: '111111', role: 'kasir', toko_id: 1 })
  await seedKaryawan({ username: 'kasirk', email: null, password: '111111', role: 'kasir', toko_id: 1 })
  await backfillBetterAuth()
})

describe('admin set email karyawan', () => {
  test('pemilik set email staff → identity dibuat, staff bisa login ber-sid', async () => {
    const owner = authCookie(await login('ownerk', '111111'))
    const tgt = await getKaryawan('tgtk')
    const res = await patchEmail(tgt!.id!, 'tgtk@x.id', owner)
    expect(res.status).toBe(200)

    const after = await getKaryawan('tgtk')
    expect(after?.email).toBe('tgtk@x.id')
    expect(after?.ba_user_id).toBeTruthy()

    const tgtLogin = authCookie(await login('tgtk', '111111'))
    expect(jwtPayload(tgtLogin).sid).toBeTruthy()
  })

  test('email duplikat → 409', async () => {
    const owner = authCookie(await login('ownerk', '111111'))
    const k = await getKaryawan('kasirk')
    const res = await patchEmail(k!.id!, 'tgtk@x.id', owner)
    expect(res.status).toBe(409)
  })

  test('non-admin (kasir) → 403', async () => {
    // kasirk masih tanpa email → login tanpa sid, role kasir
    const kasir = authCookie(await login('kasirk', '111111'))
    const k = await getKaryawan('tgtk')
    const res = await patchEmail(k!.id!, 'lain@x.id', kasir)
    expect(res.status).toBe(403)
  })

  test('format email invalid → 400', async () => {
    const owner = authCookie(await login('ownerk', '111111'))
    const k = await getKaryawan('kasirk')
    const res = await patchEmail(k!.id!, 'bukan-email', owner)
    expect(res.status).toBe(400)
  })
})
