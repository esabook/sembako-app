// Bun otomatis load .env dari working directory — pastikan jalankan dari folder backend/
import { dialect } from './index.ts'

const url = process.env.DATABASE_URL ?? './data.db'

if (dialect === 'postgres') {
  const { migrate } = await import('drizzle-orm/postgres-js/migrator')
  const { drizzle } = await import('drizzle-orm/postgres-js')
  const postgres = (await import('postgres')).default
  const client = postgres(url, { max: 1 })
  const db = drizzle(client)
  await migrate(db, { migrationsFolder: './src/db/migrations/postgres' })
  await client.end()
} else if (dialect === 'mysql') {
  const { migrate } = await import('drizzle-orm/mysql2/migrator')
  const { drizzle } = await import('drizzle-orm/mysql2')
  const mysql = await import('mysql2/promise')
  const conn = await mysql.createConnection(url)
  const db = drizzle(conn)
  await migrate(db, { migrationsFolder: './src/db/migrations/mysql' })
  await conn.end()
} else {
  const { migrate } = await import('drizzle-orm/bun-sqlite/migrator')
  const { db } = await import('./index.ts')
  migrate(db as any, { migrationsFolder: './src/db/migrations/sqlite' })
}

console.log('Migrations complete')
