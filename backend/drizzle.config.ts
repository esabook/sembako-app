import { defineConfig } from 'drizzle-kit'

const url = process.env.DATABASE_URL ?? './data.db'
const isPg = url.startsWith('postgres')
const isMy = url.startsWith('mysql')
const isLibsql = url.startsWith('libsql://') || url.startsWith('https://')

export default defineConfig({
  schema: './src/db/schema.ts',
  out: isPg ? './src/db/migrations/postgres' : isMy ? './src/db/migrations/mysql' : './src/db/migrations/sqlite',
  dialect: isPg ? 'postgresql' : isMy ? 'mysql' : isLibsql ? 'turso' : 'sqlite',
  dbCredentials: isPg ? { url }
    : isMy ? { url }
    : isLibsql ? { url, authToken: process.env.TURSO_AUTH_TOKEN ?? '' }
    : { url: url.replace(/^(file:|sqlite:\/\/)/, '') },
})
