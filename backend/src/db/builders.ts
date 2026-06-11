import * as sl from 'drizzle-orm/sqlite-core'
import * as pg from 'drizzle-orm/pg-core'
import * as my from 'drizzle-orm/mysql-core'

const _url = process.env.DATABASE_URL ?? ''
const d = _url.startsWith('postgres') ? 'pg' : _url.startsWith('mysql') ? 'my' : 'sl'

// SQLite types as canonical — runtime selects dialect impl via cast
export const table = (d === 'pg' ? pg.pgTable : d === 'my' ? my.mysqlTable : sl.sqliteTable) as typeof sl.sqliteTable
export const int   = (d === 'pg' ? pg.integer : d === 'my' ? my.int       : sl.integer)      as typeof sl.integer
export const txt   = (d === 'pg' ? pg.text    : d === 'my' ? my.text      : sl.text)          as typeof sl.text
export const flt   = (d === 'pg' ? pg.doublePrecision : d === 'my' ? my.double : sl.real)     as typeof sl.real
export const money = (name: string) =>
  d === 'pg' ? pg.bigint(name, { mode: 'number' }) as unknown as ReturnType<typeof sl.integer>
: d === 'my' ? my.bigint(name, { mode: 'number' }) as unknown as ReturnType<typeof sl.integer>
: sl.integer(name)
export const idx   = (d === 'pg' ? pg.index   : d === 'my' ? my.index     : sl.index)         as typeof sl.index
export const uidx  = (d === 'pg' ? pg.uniqueIndex : d === 'my' ? my.uniqueIndex : sl.uniqueIndex) as typeof sl.uniqueIndex
export const chk   = (d === 'pg' ? pg.check   : d === 'my' ? my.check     : sl.check)         as typeof sl.check

// Primary key auto-increment — paling berbeda antar dialect
export const pkInt = (name: string) =>
  d === 'pg' ? pg.serial(name).primaryKey() as unknown as ReturnType<typeof sl.integer>
: d === 'my' ? my.int(name).primaryKey().autoIncrement() as unknown as ReturnType<typeof sl.integer>
: sl.integer(name).primaryKey({ autoIncrement: true })

// Boolean — integer(mode:'boolean') di SQLite, boolean() di PG/MySQL
export const bool = (name: string) =>
  d === 'pg' ? pg.boolean(name) as unknown as ReturnType<typeof sl.integer<string, { mode: 'boolean' }>>
: d === 'my' ? my.boolean(name) as unknown as ReturnType<typeof sl.integer<string, { mode: 'boolean' }>>
: sl.integer(name, { mode: 'boolean' })

// JSON stored as text — mode:'json' hanya valid di SQLite
export const jsonText = (name: string) =>
  d === 'pg' ? pg.text(name) as unknown as ReturnType<typeof sl.text<string, { mode: 'json' }>>
: d === 'my' ? my.text(name) as unknown as ReturnType<typeof sl.text<string, { mode: 'json' }>>
: sl.text(name, { mode: 'json' })

// Timestamp dengan $defaultFn agar berlaku di semua dialect (bukan SQL default)
export const isoNow = () => new Date().toISOString()

export const timestamps = {
  created_at: txt('created_at').$defaultFn(isoNow),
  updated_at: txt('updated_at').$defaultFn(isoNow).$onUpdateFn(isoNow),
}

export { sql } from 'drizzle-orm'
