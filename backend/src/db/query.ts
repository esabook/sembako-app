export const query = {
  findAll: async <T>(b: any): Promise<T[]> =>
    typeof b.all === 'function' ? b.all() : await b,

  find: async <T>(b: any): Promise<T | undefined> =>
    typeof b.get === 'function' ? b.get() : (await b)[0],

  exec: async (b: any): Promise<void> =>
    void (typeof b.run === 'function' ? b.run() : await b),

  ret: async <T>(b: any): Promise<T | undefined> =>
    typeof b.get === 'function' ? b.get() : (await b)[0],
}
