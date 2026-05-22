// Bun otomatis load .env dari working directory — pastikan jalankan dari folder backend/
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import { db } from './index.ts'

migrate(db, { migrationsFolder: './src/db/migrations' })
console.log('Migrations complete')
