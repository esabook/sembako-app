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
