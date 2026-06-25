// Runtime-agnostic password util.
// Bun: delegates to Bun.password (bcrypt) — used for local dev.
// CF Workers: PBKDF2 via Web Crypto — D1 is a fresh DB so no bcrypt hashes.
declare const Bun: { password: { hash(p: string): Promise<string>; verify(p: string, h: string): Promise<boolean> } }

const isBun = typeof Bun !== 'undefined'
const ITER = 100_000

function b64(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}
function unb64(s: string) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
}
async function pbkdf2(plain: string, salt: Uint8Array<ArrayBuffer>, iter: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(plain), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256)
}

export async function hashPassword(plain: string): Promise<string> {
  if (isBun) return Bun.password.hash(plain)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const derived = await pbkdf2(plain, salt, ITER)
  return `pbkdf2:${b64(salt.buffer as ArrayBuffer)}:${b64(derived)}`
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (isBun) return Bun.password.verify(plain, stored)
  if (stored.startsWith('$2')) return false // bcrypt hash — not verifiable on CF Workers
  const parts = stored.split(':')
  if (parts[0] !== 'pbkdf2' || parts.length !== 3) return false
  const salt = unb64(parts[1]!) as Uint8Array<ArrayBuffer>
  const expected = unb64(parts[2]!) as Uint8Array<ArrayBuffer>
  const derived = new Uint8Array(await pbkdf2(plain, salt, ITER))
  if (derived.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < derived.length; i++) diff |= (derived[i] ?? 0) ^ (expected[i] ?? 0)
  return diff === 0
}
