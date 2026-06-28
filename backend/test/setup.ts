// Preload test — siapkan DB sqlite sementara + migrasi SEBELUM modul app import.
// db/index.ts membaca DATABASE_URL saat module-init, jadi env WAJIB di-set di sini
// (preload jalan paling awal). Semua test berbagi koneksi prod yang sama.

import { mkdirSync, rmSync } from 'node:fs'

const dir = new URL('./.tmp/', import.meta.url).pathname
rmSync(dir, { recursive: true, force: true })
mkdirSync(dir, { recursive: true })

process.env.DATABASE_URL = `${dir}test.db`
process.env.DEMO_DATABASE_URL = `${dir}demo.db`
process.env.BETTER_AUTH_SECRET = `test-secret-${'a'.repeat(32)}`
process.env.NODE_ENV = 'test'
process.env.SAAS_GATING = '' // mode LAN — gating off saat test

// Migrasi prod DB (test) pakai migrator bun-sqlite.
const { db, sqlite } = await import('../src/db/index.ts')
const { migrate } = await import('drizzle-orm/bun-sqlite/migrator')
// foreign_keys harus OFF saat migrate (drizzle bungkus BEGIN/COMMIT).
sqlite.run('PRAGMA foreign_keys = OFF')
// biome-ignore lint/suspicious/noExplicitAny: migrator minta tipe drizzle spesifik
migrate(db as any, { migrationsFolder: './src/db/migrations/sqlite' })
sqlite.run('PRAGMA foreign_keys = ON')
