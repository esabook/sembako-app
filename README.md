# Stokasir

Aplikasi manajemen stok-kasir grosir & eceran — berbasis web, multi-toko, multi-cabang. Jalan di jaringan WiFi lokal (Raspberry Pi) atau cloud (Turso/Supabase/Railway).

---

## Fitur Utama

- **Kasir** — transaksi eceran & grosir, shortcut keyboard F1–F12, scan barcode USB/BT/kamera
- **Gudang** — terima barang, kelola stok, purchase order, retur supplier, label barcode
- **Pelanggan** — kartu member, tier, diskon otomatis, piutang, CRM & sales
- **Keuangan** — jurnal kas, hutang supplier, piutang pelanggan, multi akun, pinjaman
- **Laporan** — Laba Rugi, Arus Kas, Neraca, filter per cabang, export PDF/Excel
- **Dashboard** — alert stok kritis, anomali kasir, insight otomatis
- **HR** — karyawan, absensi kiosk PIN, penggajian, kasbon, shift, evaluasi, izin, sanksi
- **Multi-Toko** — isolasi data per toko (tenant), filter per cabang dalam satu toko
- **RBAC** — 6 role: `pemilik`, `manajer`, `kasir`, `gudang`, `sales`, `pelayanan`
- **Backup** — SQLite: binary `.db`; Turso/PG: streaming `.json.gz`; opsional include gambar

---

## Screenshot
|  |  |  |
|---|---|---|
| ![1](doc/screenshots/1.webp) | ![2](doc/screenshots/2.webp) | ![3](doc/screenshots/3.webp) |
| ![4](doc/screenshots/4.webp) | ![5](doc/screenshots/5.webp) | ![6](doc/screenshots/6.webp) |
| ![7](doc/screenshots/7.webp) |  |  |

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | SvelteKit · TypeScript · TailwindCSS |
| Backend | Hono.js · Bun runtime |
| Database | SQLite / Turso (libSQL) / PostgreSQL / MySQL via Drizzle ORM |
| Auth | JWT (httpOnly cookie) · RBAC 6 role |
| Storage | Local disk (`uploads/`) atau S3/R2/MinIO |
| Deployment | Raspberry Pi · Nginx · systemd — atau cloud (Turso + Railway/Fly.io) |

---

## Menjalankan Lokal

```bash
# Terminal 1 — Backend
cd backend
bun install
cp .env.example .env   # sesuaikan jika perlu
bun run db:migrate
bun run db:seed        # buat toko-1, cabang-1, admin user
bun run dev            # → http://localhost:3000

# Terminal 2 — Frontend
cd frontend
bun install
bun run dev            # → http://localhost:5173
```

Lihat isi database via GUI:

```bash
cd backend && bun run db:studio   # → http://local.drizzle.studio
```

---

## Deploy

| Target | Panduan |
|---|---|
| Raspberry Pi / Linux / Mac / Windows (lokal) | [DEPLOY.md](DEPLOY.md) |
| Turso · PostgreSQL · Cloud storage · Checklist | [claude/deployment.md](claude/deployment.md) |

---

## Struktur Folder

```
stokasir/
├── frontend/        ← SvelteKit app
├── backend/         ← Hono.js API + multi-dialect DB
│   └── src/
│       ├── routes/      ← API endpoints
│       ├── db/          ← schema, migrations, builders (multi-dialect)
│       ├── middleware/  ← auth, tenant, upload
│       └── utils/       ← storage, backup, audit, log
├── claude/          ← Dokumentasi konteks untuk Claude Code
└── CLAUDE.md        ← Entrypoint konteks project
```

---

## Lisensi

Public domain — lihat [LICENSE](LICENSE).
