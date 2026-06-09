import { drizzle as drizzleSQLite } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import postgres from 'postgres'
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import mysql from 'mysql2/promise'
import { drizzle as drizzleMy } from 'drizzle-orm/mysql2'
import * as schema from './schema.ts'

export { query } from './query.ts'
export { isoNow } from './builders.ts'

const url = process.env.DATABASE_URL ?? './data.db'

export const dialect = url.startsWith('postgres') ? 'postgres'
  : url.startsWith('mysql') ? 'mysql' : 'sqlite'

// Canonical TS type — runtime may be PG/MySQL instance but API is the same
type AnyDB = ReturnType<typeof drizzleSQLite<typeof schema>>

function initDB() {
  if (dialect === 'postgres') {
    const client = postgres(url)
    const db = drizzlePg(client, { schema }) as unknown as AnyDB
    const withTransaction = <T>(fn: (tx: AnyDB) => Promise<T>) =>
      (db as any).transaction((tx: any) => fn(tx as AnyDB))
    return { db, withTransaction, sqlite: undefined as unknown as Database }
  }

  if (dialect === 'mysql') {
    const pool = mysql.createPool(url)
    const db = drizzleMy(pool, { schema, mode: 'default' }) as unknown as AnyDB
    const withTransaction = <T>(fn: (tx: AnyDB) => Promise<T>) =>
      (db as any).transaction((tx: any) => fn(tx as AnyDB))
    return { db, withTransaction, sqlite: undefined as unknown as Database }
  }

  // SQLite (default)
  const path = url.replace(/^(file:|sqlite:\/\/)/, '')
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

const { db, withTransaction, sqlite } = initDB()

export { db, withTransaction, sqlite }
