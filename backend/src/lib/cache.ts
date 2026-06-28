// No-op KV adapter — active when KV binding absent (LAN/SQLite mode).
// Cloud mode: real KV; LAN mode: every call returns null/void, falls through to DB.

interface CacheOpts { expirationTtl?: number }

interface Cache {
  get(key: string): Promise<string | null>
  put(key: string, value: string, opts?: CacheOpts): Promise<void>
  delete(key: string): Promise<void>
}

const noopKV: Cache = {
  get: async () => null,
  put: async () => {},
  delete: async () => {},
}

export function getCache(env: { KV?: unknown }): Cache {
  return (env.KV as Cache | undefined) ?? noopKV
}

// Adapter secondaryStorage better-auth → KV existing. Session & rate-limit
// better-auth disimpan di KV (revoke/list murah), bukan DB. ttl dalam detik;
// CF KV menolak expirationTtl < 60 → clamp. Prefix `ba:` agar tak tabrakan
// dengan cache app lain. LAN mode (noopKV): get→null, better-auth fallback DB.
export function betterAuthKV(env: { KV?: unknown }) {
  const kv = getCache(env)
  return {
    get: (key: string) => kv.get(`ba:${key}`),
    set: (key: string, value: string, ttl?: number) =>
      kv.put(`ba:${key}`, value, ttl ? { expirationTtl: Math.max(60, ttl) } : undefined),
    delete: (key: string) => kv.delete(`ba:${key}`),
  }
}

// KV-based rate limiter — sliding window. LAN mode (noopKV): always allows (get → null).
// Race condition di multi-instance CF Workers: acceptable untuk auth brute-force.
export async function checkRateLimit(
  kv: Cache,
  key: string,
  max: number,
  windowSec: number
): Promise<boolean> {
  const raw = await kv.get(key)
  const count = raw ? Number(raw) : 0
  if (count >= max) return false
  await kv.put(key, String(count + 1), { expirationTtl: windowSec })
  return true
}
