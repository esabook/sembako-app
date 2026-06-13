# Aturan Coding

```
1. Selalu TypeScript — tidak ada .js
2. Middleware auth di SETIAP route yang butuh login
3. Validasi input di backend
4. Response konsisten: { success: true, data } | { success: false, error }
5. Foto di filesystem, path di database
6. Transaction SQLite untuk operasi multi-tabel
7. Route statis HARUS di atas route dinamis (/:id) — Hono match urut dari atas
```
