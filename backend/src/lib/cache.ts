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
