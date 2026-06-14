import * as schema from '../db/schema.ts'
import { db, sqlite, dialect } from '../db/index.ts'
import { sql } from 'drizzle-orm'
import { mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads'

function schemaTableEntries() {
  return Object.entries(schema).filter(
    ([, v]) => v && typeof v === 'object' && '_' in (v as object) && typeof (v as any)._.name === 'string',
  )
}

async function* yieldBackupLines(includeMedia: boolean): AsyncGenerator<string> {
  for (const [, tableObj] of schemaTableEntries()) {
    const tableName = (tableObj as any)._.name as string
    const rows = (await db.select().from(tableObj as any)) as Record<string, unknown>[]
    for (const row of rows) {
      yield JSON.stringify({ __t: tableName, ...row }) + '\n'
    }
  }

  if (includeMedia && process.env.STORAGE_DRIVER !== 's3') {
    try {
      const glob = new Bun.Glob('**/*')
      const scanner = glob.scan({ cwd: UPLOAD_DIR, onlyFiles: true })
      for await (const relPath of scanner) {
        try {
          const buf = await Bun.file(join(UPLOAD_DIR, relPath)).arrayBuffer()
          yield JSON.stringify({ __t: '__file', p: relPath, d: Buffer.from(buf).toString('base64') }) + '\n'
        } catch { /* skip unreadable */ }
      }
    } catch { /* no uploads dir */ }
  }
}

export function createBackupStream(includeMedia: boolean): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  const gen = yieldBackupLines(includeMedia)
  return new ReadableStream<Uint8Array>({
    async pull(ctrl) {
      try {
        const { value, done } = await gen.next()
        if (done) ctrl.close()
        else ctrl.enqueue(enc.encode(value))
      } catch (e) {
        ctrl.error(e)
      }
    },
    async cancel() {
      await gen.return(undefined)
    },
  })
}

export async function restoreFromBackup(rawStream: ReadableStream<Uint8Array>): Promise<{ tables: number; files: number }> {
  const decompressed = rawStream.pipeThrough(new DecompressionStream('gzip'))
  const reader = decompressed.getReader()
  const dec = new TextDecoder()

  const byTable = new Map<string, Record<string, unknown>[]>()
  const fileEntries: { p: string; d: string }[] = []
  let buf = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.trim()) continue
      const obj = JSON.parse(line) as Record<string, unknown>
      const t = obj.__t as string
      if (t === '__file') {
        fileEntries.push({ p: obj.p as string, d: obj.d as string })
      } else {
        const { __t, ...row } = obj
        if (!byTable.has(t)) byTable.set(t, [])
        byTable.get(t)!.push(row)
      }
    }
  }

  const entries = schemaTableEntries()

  // Disable FK constraints during restore
  try {
    if (dialect === 'sqlite') {
      sqlite.run('PRAGMA foreign_keys = OFF')
    } else if (dialect === 'libsql') {
      await (db as any).execute(sql`PRAGMA foreign_keys = OFF`)
    } else if (dialect === 'postgres') {
      await (db as any).execute(sql.raw("SET session_replication_role = 'replica'"))
    }
  } catch { /* ignore */ }

  try {
    // Delete in reverse order (child → parent) to avoid FK violations
    for (const [, tableObj] of [...entries].reverse()) {
      try {
        await db.delete(tableObj as any)
      } catch { /* ignore FK errors on individual tables */ }
    }

    // Insert in forward order
    for (const [, tableObj] of entries) {
      const tableName = (tableObj as any)._.name as string
      const rows = byTable.get(tableName) ?? []
      for (let i = 0; i < rows.length; i += 200) {
        const batch = rows.slice(i, i + 200)
        if (batch.length) await db.insert(tableObj as any).values(batch)
      }
    }
  } finally {
    try {
      if (dialect === 'sqlite') {
        sqlite.run('PRAGMA foreign_keys = ON')
      } else if (dialect === 'libsql') {
        await (db as any).execute(sql`PRAGMA foreign_keys = ON`)
      } else if (dialect === 'postgres') {
        await (db as any).execute(sql.raw("SET session_replication_role = 'DEFAULT'"))
      }
    } catch { /* ignore */ }
  }

  // Restore uploaded files
  for (const { p, d } of fileEntries) {
    const full = join(UPLOAD_DIR, p)
    await mkdir(dirname(full), { recursive: true })
    await Bun.write(full, Buffer.from(d, 'base64'))
  }

  return { tables: byTable.size, files: fileEntries.length }
}
