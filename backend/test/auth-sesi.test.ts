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

describe('gate lengkapi-email (Fase B)', () => {
  test('staff tanpa email isi email → identity dibuat, perlu_email false, login berikut ber-sid', async () => {
    await seedKaryawan({ username: 'staffb', email: null, password: '111111', role: 'gudang' })
    const a = authCookie(await login('staffb', '111111'))
    expect(jwtPayload(a).sid).toBeUndefined()

    const me1 = (await (await get('/auth/me', a)).json()) as { data: { perlu_email: boolean } }
    expect(me1.data.perlu_email).toBe(true)

    const r = await post('/auth/lengkapi-email', { email: 'staffb@x.id' }, a)
    expect(r.status).toBe(200)

    const me2 = (await (await get('/auth/me', a)).json()) as { data: { perlu_email: boolean } }
    expect(me2.data.perlu_email).toBe(false)

    // login ulang → sekarang ber-sid (ba_user_id terset)
    const b = authCookie(await login('staffb', '111111'))
    expect(jwtPayload(b).sid).toBeTruthy()
  })

  test('email sudah dipakai akun lain → 409', async () => {
    const a = authCookie(await login('owner@x.id', '111111'))
    const r = await post('/auth/lengkapi-email', { email: 'staffb@x.id' }, a)
    expect(r.status).toBe(409)
  })

  test('format email invalid → 400', async () => {
    const a = authCookie(await login('staffb', '111111'))
    const r = await post('/auth/lengkapi-email', { email: 'bukan-email' }, a)
    expect(r.status).toBe(400)
  })
})

describe('OAuth one-time-code exchange (Fase B, B1)', () => {
  // KV palsu (Map) — di test tak ada binding KV (noopKV).
  function makeKV() {
    const m = new Map<string, string>()
    return {
      get: async (k: string) => m.get(k) ?? null,
      put: async (k: string, v: string) => {
        m.set(k, v)
      },
      delete: async (k: string) => {
        m.delete(k)
      },
    }
  }
  const payload = {
    sub: '1', id: 1, nama: 'OAuth User', role: 'kasir', kode_karyawan: 'K1',
    email: 'oauth@x.id', tenant_id: 1, cabang_id: null, home_toko_id: 1, is_demo: false, sid: 'sess-oauth-1',
  }
  const exchange = (code: string, kv: ReturnType<typeof makeKV>) =>
    app.request(
      '/auth/oauth-exchange',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) },
      { KV: kv },
    )

  test('code valid → token (decode sid cocok), sekali pakai (kedua 400)', async () => {
    const kv = makeKV()
    await kv.put('oauth:code:abc123', JSON.stringify(payload))

    const res = await exchange('abc123', kv)
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { token: string } }
    const decoded = jwtPayload(`x=${json.data.token}`)
    expect(decoded.sid).toBe('sess-oauth-1')
    expect(decoded.tenant_id).toBe(1)

    // sekali pakai → code terhapus
    expect((await exchange('abc123', kv)).status).toBe(400)
  })

  test('code tidak ada → 400', async () => {
    const res = await exchange('tidak-ada', makeKV())
    expect(res.status).toBe(400)
  })
})
