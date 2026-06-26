export const query = {
  findAll: async <T>(b: any): Promise<T[]> =>
    typeof b.all === 'function' ? b.all() : await b,

  find: async <T>(b: any): Promise<T | undefined> =>
    typeof b.get === 'function' ? b.get() : (await b)[0],

  // PENTING: await b.run() — D1 .run() balikin promise. Tanpa await, handler
  // return response sebelum write landing → CF tear down isolate → write hilang.
  exec: async (b: any): Promise<void> => {
    if (typeof b.run === 'function') {
      await b.run()
    } else {
      await b
    }
  },

  // Sama seperti exec, tapi return jumlah baris yang terkena (untuk optimistic lock).
  // bun-sqlite: { changes }, libsql: { rowsAffected }, D1: { meta.changes }, PG/MySQL: array length
  execRows: async (b: any): Promise<number> => {
    if (typeof b.run === 'function') {
      const r = await b.run()
      return r?.changes ?? r?.rowsAffected ?? r?.meta?.changes ?? 0
    }
    const r = await b
    return Array.isArray(r) ? r.length : 0
  },

  ret: async <T>(b: any): Promise<T | undefined> =>
    typeof b.get === 'function' ? b.get() : (await b)[0],
}
