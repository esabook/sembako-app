# Database: Migration & Generate

## Ringkasan

Backend pakai **Drizzle ORM** dengan 3 dialect: SQLite, PostgreSQL, MySQL.  
Source of truth = `backend/src/db/schema.ts`.  
Migration files = artifact yang di-generate dari schema, bukan ditulis manual.

---

## Perintah

### Generate migration baru

Setelah ubah `schema.ts`, generate migration:

```bash
# SQLite (default, tidak perlu DATABASE_URL)
cd backend
bun run db:generate

# PostgreSQL — URL dummy cukup, tidak perlu koneksi nyata
DATABASE_URL=postgres://x/x bun run db:generate

# MySQL — sama, prefix dipakai hanya untuk deteksi dialect
DATABASE_URL=mysql://x/x bun run db:generate
```

Output: file SQL baru di folder migration sesuai dialect.

### Jalankan migration ke DB

```bash
cd backend
bun run db:migrate
```

Baca `DATABASE_URL` dari `.env` — otomatis pilih dialect yang tepat.

---

## Lokasi file

```
backend/src/db/migrations/
├── sqlite/       ← default lokal/Turso/libsql
├── postgres/     ← Railway/Supabase/Neon
└── mysql/        ← MySQL/PlanetScale
```

Setiap folder punya subfolder `meta/` — berisi snapshot schema per migration, jangan dihapus manual.

---

## Squash migration (fresh start)

Kalau migration sudah menumpuk dan ingin reset jadi 1 file bersih:

1. Hapus semua isi folder migration (bukan foldernya):
   ```bash
   rm -rf backend/src/db/migrations/sqlite/*
   rm -rf backend/src/db/migrations/postgres/*
   rm -rf backend/src/db/migrations/mysql/*
   ```

2. Generate ulang untuk tiap dialect:
   ```bash
   cd backend
   bun run db:generate                              # sqlite
   DATABASE_URL=postgres://x/x bun run db:generate # postgres (dummy URL ok)
   DATABASE_URL=mysql://x/x bun run db:generate    # mysql (dummy URL ok)
   ```

3. Hasilnya: 1 file `0000_*.sql` per dialect berisi seluruh schema saat ini.

> **Aman:** `schema.ts` tidak disentuh. Kalau generate gagal, tinggal retry.  
> Restore lama: `git checkout -- src/db/migrations/`

---

## Cara kerja

`index.ts` hanya **connect** ke DB — tidak auto-create table.  
Tabel baru terbuat saat `migrate.ts` dijalankan eksplisit (`bun run db:migrate`).

Fresh DB tanpa migrate = kosong. Wajib migrate setelah deploy.

---

## Alur ubah schema

```
edit schema.ts
    ↓
bun run db:generate   ← buat file SQL baru
    ↓
bun run db:migrate    ← apply ke DB
```
