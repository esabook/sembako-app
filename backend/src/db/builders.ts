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
: d === 'my' ? my.int(name).primaryKey().autoincrement() as unknown as ReturnType<typeof sl.integer>
: sl.integer(name).primaryKey({ autoIncrement: true })

// Boolean — integer(mode:'boolean') di SQLite, boolean() di PG/MySQL
// Cast seluruh ternary ke satu tipe kanonik agar return-type tunggal
// (bukan union); kalau union, .default(true) di-resolve ke intersection
// (boolean|SQL)&(number|SQL) yang mustahil dipenuhi literal boolean.
type BoolCol = ReturnType<typeof sl.integer<string, 'boolean'>>
export const bool = (name: string): BoolCol =>
  (d === 'pg' ? pg.boolean(name)
  : d === 'my' ? my.boolean(name)
  : sl.integer(name, { mode: 'boolean' })) as unknown as BoolCol

// JSON stored as text — mode:'json' hanya valid di SQLite
type JsonCol = ReturnType<typeof sl.text<string, string, [string, ...string[]], undefined, 'json'>>
export const jsonText = (name: string): JsonCol =>
  (d === 'pg' ? pg.text(name)
  : d === 'my' ? my.text(name)
  : sl.text(name, { mode: 'json' })) as unknown as JsonCol

// Kolom tanggal sebagai JS Date — dipakai better-auth (supportsDates=true,
// driver kirim objek Date, bukan ISO string). SQLite/D1: integer unix-timestamp;
// PG/MySQL: native timestamp. JANGAN pakai untuk kolom app biasa (pakai txt+isoNow).
type TsCol = ReturnType<typeof sl.integer<string, 'timestamp'>>
export const tsDate = (name: string): TsCol =>
  (d === 'pg' ? pg.timestamp(name)
  : d === 'my' ? my.timestamp(name)
  : sl.integer(name, { mode: 'timestamp' })) as unknown as TsCol

// Timestamp dengan $defaultFn agar berlaku di semua dialect (bukan SQL default)
export const isoNow = () => new Date().toISOString()

export const timestamps = {
  created_at: txt('created_at').$defaultFn(isoNow),
  updated_at: txt('updated_at').$defaultFn(isoNow).$onUpdateFn(isoNow),
}

export { sql } from 'drizzle-orm'
