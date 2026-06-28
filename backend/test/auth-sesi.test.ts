// Integrasi endpoint auth (Fase A): bridge sid, validasi middleware, list/revoke
// sesi, logout. Pakai Hono app minimal (cuma authRouter) + app.request.
import { beforeAll, describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { backfillBetterAuth } from '../src/db/backfill-ba.ts'
import { authRouter } from '../src/routes/auth.ts'
import { authCookie, ensureToko, jwtPayload, seedKaryawan } from './helpers.ts'

const app = new Hono().route('/auth', authRouter)
const env = {} // c.env kosong → getCache pakai noopKV (LAN)

function post(path: string, body: unknown, cookie?: string) {
  return app.request(
    path,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    },
    env,
  )
}
function get(path: string, cookie?: string) {
  return app.request(path, { headers: cookie ? { cookie } : {} }, env)
}
const login = (username: string, password: string) => post('/auth/login', { username, password })

beforeAll(async () => {
  await ensureToko(1)
  await seedKaryawan({
    username: 'owner',
    email: 'owner@x.id',
    password: '111111',
    role: 'pemilik',
  })
  await seedKaryawan({ username: 'kasirx', email: null, password: '111111', role: 'kasir' })
  await backfillBetterAuth() // set ba_user_id owner → login bisa bridge
})

describe('login bridge', () => {
  test('pemilik ber-email → JWT punya sid', async () => {
    const res = await login('owner@x.id', '111111')
    expect(res.status).toBe(200)
    const ck = authCookie(res)
    expect(jwtPayload(ck).sid).toBeTruthy()
  })

  test('kasir tanpa email → login 200 tanpa sid', async () => {
    const res = await login('kasirx', '111111')
    expect(res.status).toBe(200)
    expect(jwtPayload(authCookie(res)).sid).toBeUndefined()
  })

  test('password salah → 401', async () => {
    const res = await login('owner@x.id', 'salah')
    expect(res.status).toBe(401)
  })
})

describe('validasi sid + list + revoke', () => {
  test('sesi valid → /auth/me 200; revoke sesi lain → 401; logout → 401', async () => {
    // dua perangkat
    const a = authCookie(await login('owner@x.id', '111111'))
    const b = authCookie(await login('owner@x.id', '111111'))
    const sidB = jwtPayload(b).sid as string

    // keduanya hidup
    expect((await get('/auth/me', a)).status).toBe(200)
    expect((await get('/auth/me', b)).status).toBe(200)

    // list sesi dari A → minimal 2, salah satunya current
    const list = (await (await get('/auth/sesi', a)).json()) as {
      data: { id: string; current: boolean }[]
    }
    expect(list.data.length).toBeGreaterThanOrEqual(2)
    expect(list.data.some((s) => s.current)).toBe(true)

    // A cabut sesi B
    const cabut = await post(`/auth/sesi/${sidB}/cabut`, {}, a)
    expect(cabut.status).toBe(200)

    // B tertolak, A tetap jalan
    expect((await get('/auth/me', b)).status).toBe(401)
    expect((await get('/auth/me', a)).status).toBe(200)

    // logout A → A tertolak
    expect((await post('/auth/logout', {}, a)).status).toBe(200)
    expect((await get('/auth/me', a)).status).toBe(401)
  })

  test('cabut sesi milik orang lain → 404', async () => {
    const a = authCookie(await login('owner@x.id', '111111'))
    const res = await post('/auth/sesi/sid-asal-asalan-bukan-milik/cabut', {}, a)
    expect(res.status).toBe(404)
  })

  test('JWT lama tanpa sid tetap diterima (kasir)', async () => {
    const k = authCookie(await login('kasirx', '111111'))
    expect((await get('/auth/me', k)).status).toBe(200)
  })
})
