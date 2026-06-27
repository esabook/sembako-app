import { drizzle as drizzleSQLite } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import postgres from 'postgres'
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import mysql from 'mysql2/promise'
import { drizzle as drizzleMy } from 'drizzle-orm/mysql2'
import { createClient } from '@libsql/client'
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql'
import { AsyncLocalStorage } from 'node:async_hooks'
import * as schema from './schema.ts'

export { query } from './query.ts'
export { isoNow } from './builders.ts'

const url = process.env.DATABASE_URL ?? './data.db'
// DB demo terpisah — sandbox reset-able. Dialect diasumsikan sama dengan url utama.
const demoUrl = process.env.DEMO_DATABASE_URL ?? './data_demo.db'

export const dialect = url.startsWith('postgres') ? 'postgres'
  : url.startsWith('mysql') ? 'mysql'
  : (url.startsWith('libsql://') || url.startsWith('https://')) ? 'libsql'
  : url.startsWith('d1://') ? 'd1'
  : 'sqlite'

// Canonical TS type — runtime may be PG/MySQL instance but API is the same
type AnyDB = ReturnType<typeof drizzleSQLite<typeof schema>>

type Conn = {
  db: AnyDB
  withTransaction: <T>(fn: (tx: AnyDB) => Promise<T>) => Promise<T>
  sqlite: Database
}

function initDB(dbUrl: string): Conn {
  const d = dbUrl.startsWith('postgres') ? 'postgres'
    : dbUrl.startsWith('mysql') ? 'mysql'
    : (dbUrl.startsWith('libsql://') || dbUrl.startsWith('https://')) ? 'libsql'
    : dbUrl.startsWith('d1://') ? 'd1'
    : 'sqlite'

  // CF Workers D1 — real db injected later via setD1Db(); return stub
  if (d === 'd1') {
    const stub = {} as AnyDB
    return { db: stub, withTransaction: (fn: any) => fn(stub), sqlite: undefined as unknown as Database }
  }
  if (d === 'postgres') {
    const client = postgres(dbUrl)
    const db = drizzlePg(client, { schema }) as unknown as AnyDB
    const withTransaction = <T>(fn: (tx: AnyDB) => Promise<T>) =>
      (db as any).transaction((tx: any) => fn(tx as AnyDB))
    return { db, withTransaction, sqlite: undefined as unknown as Database }
  }

  if (d === 'mysql') {
    const pool = mysql.createPool(dbUrl)
    const db = drizzleMy(pool, { schema, mode: 'default' }) as unknown as AnyDB
    const withTransaction = <T>(fn: (tx: AnyDB) => Promise<T>) =>
      (db as any).transaction((tx: any) => fn(tx as AnyDB))
    return { db, withTransaction, sqlite: undefined as unknown as Database }
  }

  if (d === 'libsql') {
    const client = createClient({ url: dbUrl, authToken: process.env.TURSO_AUTH_TOKEN })
    const db = drizzleLibsql(client, { schema }) as unknown as AnyDB
    const withTransaction = <T>(fn: (tx: AnyDB) => Promise<T>) =>
      (db as any).transaction((tx: any) => fn(tx as AnyDB))
    return { db, withTransaction, sqlite: undefined as unknown as Database }
  }

  // SQLite (default)
  const path = dbUrl.replace(/^(file:|sqlite:\/\/)/, '')
  const sqliteRaw = new Database(path)
  sqliteRaw.run('PRAGMA journal_mode = WAL')
  sqliteRaw.run('PRAGMA synchronous = NORMAL')
  sqliteRaw.run('PRAGMA cache_size = -16000')
  sqliteRaw.run('PRAGMA temp_store = MEMORY')
  sqliteRaw.run('PRAGMA mmap_size = 268435456')
  sqliteRaw.run('PRAGMA foreign_keys = ON')

  const db = drizzleSQLite(sqliteRaw, { schema }) as AnyDB

  const withTransaction = async <T>(fn: (tx: AnyDB) => Promise<T>): Promise<T> => {
    sqliteRaw.run('BEGIN')
    try {
      const r = await fn(db)
      sqliteRaw.run('COMMIT')
      return r
    } catch (e) {
      sqliteRaw.run('ROLLBACK')
      throw e
    }
  }

  return { db, withTransaction, sqlite: sqliteRaw }
}

// Dua koneksi hidup berdampingan: prod (default) + demo (sandbox).
let _prod = initDB(url)
let _demo = initDB(demoUrl)

// Routing transparan: route demo set _demo di store; selain itu fallback _prod.
// Semua route pakai `db`/`withTransaction` proxy → otomatis kena DB yang benar.
const _store = new AsyncLocalStorage<Conn>()
const _current = (): Conn => _store.getStore() ?? _prod

export const db = new Proxy({} as AnyDB, {
  get(_t, prop) {
    const conn = _current().db as any
    const v = conn[prop]
    return typeof v === 'function' ? v.bind(conn) : v
  },
}) as AnyDB

export const withTransaction = (<T>(fn: (tx: AnyDB) => Promise<T>) =>
  _current().withTransaction(fn)) as Conn['withTransaction']

// Jalankan fn dengan DB demo aktif di seluruh async context-nya.
export function runWithDemo<T>(fn: () => Promise<T>): Promise<T> {
  return _store.run(_demo, fn)
}

// Raw instances — untuk login/migrate/accessible-context yang butuh DB spesifik
// tanpa bergantung pada AsyncLocalStorage.
export const prodDb = (): AnyDB => _prod.db
export const demoDb = (): AnyDB => _demo.db

export const sqlite = _prod.sqlite
export const demoSqlite = _demo.sqlite

// CF Workers D1 override — dipanggil sekali pada request pertama di worker.ts.
// ESM live bindings: importer pakai proxy `db` → otomatis lihat koneksi terbaru.
export function setD1Db(d1Db: AnyDB) {
  // D1 .transaction() pakai BEGIN/COMMIT yang ditolak D1 → jalankan tanpa tx eksplisit.
  _prod = { db: d1Db, withTransaction: (fn: any) => fn(d1Db), sqlite: undefined as unknown as Database }
}

export function setD1DemoDb(d1Db: AnyDB) {
  _demo = { db: d1Db, withTransaction: (fn: any) => fn(d1Db), sqlite: undefined as unknown as Database }
}
