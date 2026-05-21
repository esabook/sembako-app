/**
 * Script untuk apply migration 0018 dan 0019 secara manual.
 * Diperlukan karena migration 0019 menggunakan PRAGMA foreign_keys=OFF
 * yang tidak bisa dijalankan di dalam transaksi (Drizzle wraps migrations in BEGIN/COMMIT).
 *
 * Jalankan: bun run src/db/apply_pending_migrations.ts
 */

import { Database } from 'bun:sqlite'
import crypto from 'node:crypto'
import fs from 'node:fs'

const DB_PATH = process.env.DATABASE_URL ?? './data.db'
const MIGRATIONS_FOLDER = './src/db/migrations'

const db = new Database(DB_PATH)

function getLastAppliedTimestamp(): number {
  const row = db.query<{ created_at: number }, []>(
    'SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1'
  ).get()
  return row?.created_at ?? 0
}

function isColumnExists(table: string, column: string): boolean {
  const cols = db.query<{ name: string }, []>(`PRAGMA table_info(${table})`).all()
  return cols.some(c => c.name === column)
}

function applyMigration018() {
  if (isColumnExists('barang', 'harga_beli_rata')) {
    console.log('0018: harga_beli_rata sudah ada, skip ALTER TABLE')
  } else {
    console.log('0018: menambah kolom harga_beli_rata...')
    db.run('ALTER TABLE `barang` ADD `harga_beli_rata` real DEFAULT 0 NOT NULL')
    console.log('0018: OK')
  }

  const content = fs.readFileSync(`${MIGRATIONS_FOLDER}/0018_useful_iron_fist.sql`).toString()
  const hash = crypto.createHash('sha256').update(content).digest('hex')
  db.run('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)', [hash, 1779291753300])
  console.log('0018: dicatat di __drizzle_migrations')
}

function applyMigration019() {
  console.log('0019: menjalankan rebuild tabel dengan PRAGMA foreign_keys=OFF...')

  // PRAGMA FK tidak bisa di dalam transaksi — harus di luar
  db.run('PRAGMA foreign_keys=OFF')

  const content = fs.readFileSync(`${MIGRATIONS_FOLDER}/0019_common_black_queen.sql`).toString()
  const stmts = content.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s.length > 0)

  for (const stmt of stmts) {
    if (stmt.toLowerCase().startsWith('pragma foreign_keys')) continue // sudah diset di atas
    try {
      db.run(stmt)
    } catch (err: unknown) {
      db.run('PRAGMA foreign_keys=ON')
      throw new Error(`Gagal: ${stmt.slice(0, 80)}...\n${String(err)}`)
    }
  }

  db.run('PRAGMA foreign_keys=ON')
  console.log('0019: OK')

  const hash = crypto.createHash('sha256').update(content).digest('hex')
  db.run('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)', [hash, 1779306784101])
  console.log('0019: dicatat di __drizzle_migrations')
}

const lastTs = getLastAppliedTimestamp()
console.log(`Migrasi terakhir di DB: timestamp ${lastTs}`)

if (lastTs < 1779291753300) {
  applyMigration018()
} else {
  console.log('0018: sudah diterapkan')
}

if (lastTs < 1779306784101) {
  applyMigration019()
} else {
  console.log('0019: sudah diterapkan')
}

db.close()
console.log('\nSelesai.')
