import { defineConfig } from 'drizzle-kit'

const url = process.env.DATABASE_URL ?? './data.db'
const isPg = url.startsWith('postgres')
const isMy = url.startsWith('mysql')

export default defineConfig({
  schema: './src/db/schema.ts',
  out: isPg ? './src/db/migrations/postgres' : isMy ? './src/db/migrations/mysql' : './src/db/migrations/sqlite',
  dialect: isPg ? 'postgresql' : isMy ? 'mysql' : 'sqlite',
  dbCredentials: isPg ? { url } : isMy ? { url } : { url: url.replace(/^(file:|sqlite:\/\/)/, '') },
})
