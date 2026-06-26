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

  ret: async <T>(b: any): Promise<T | undefined> =>
    typeof b.get === 'function' ? b.get() : (await b)[0],
}
