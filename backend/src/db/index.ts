import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import * as schema from './schema.ts'

// bun:sqlite tidak kenal URI scheme "file:" — strip prefix jika ada
const DB_PATH = (process.env.DATABASE_URL ?? './data.db').replace(/^file:/, '')
const sqlite = new Database(DB_PATH)

sqlite.run('PRAGMA journal_mode = WAL')
sqlite.run('PRAGMA synchronous = NORMAL')
sqlite.run('PRAGMA cache_size = -16000')
sqlite.run('PRAGMA temp_store = MEMORY')
sqlite.run('PRAGMA mmap_size = 268435456')
sqlite.run('PRAGMA foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
export { sqlite }
