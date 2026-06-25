// Stub for bun:sqlite — not available in Cloudflare Workers.
// Imported by drizzle-orm/bun-sqlite but never called since D1 is used instead.
export class Database {
  constructor(_path?: string) {}
  run(_sql: string) { return this }
  prepare(_sql: string) { return { run: () => {}, get: () => null, all: () => [] } }
  query(_sql: string) { return { all: () => [], get: () => null, values: () => [] } }
  close() {}
}
