# TASKS — Migrasi better-auth

Tanggal: 2026-06-28. Centang saat selesai. Detail desain → [SPEC.md](./SPEC.md), [ERD.md](./ERD.md).

## FASE A — Pasang coexist (reversible)

- [x] A1. `bun add better-auth` di `backend/`.
- [x] A2. Tabel `user`/`session`/`account`/`verification` di `schema.ts` via `builders.ts`. Migrasi SQL di `migrations/sqlite/NNNN_better_auth.sql`. Tambah kolom `karyawan.ba_user_id`.
- [x] A3. `backend/src/lib/auth-ba.ts` — factory `getBetterAuth(env)` per-request. Config: drizzleAdapter, secondaryStorage=KV, emailAndPassword{enabled, password.hash/verify→utils/password.ts}, socialProviders.google, secret/baseURL/basePath `/auth/ba`, trustedOrigins. Gate `env.saasGating`.
- [x] A4. `backend/src/db/backfill-ba.ts` — backfill karyawan **ber-email** → user+account(credential, password=hash existing)+ba_user_id. Idempoten. Tanpa-email dilewati.
- [x] A5. Mount handler di `worker.ts` (`app.on(['GET','POST'],'/auth/ba/*', …)` SEBELUM `app.route('/auth', authRouter)`). Refactor blok JWT `auth.ts:101-127` → helper `issueAuthCookie(c, karyawan, {sid})`. Tambah claim `sid` ke `JWTPayload`. Bridge: setelah better-auth bikin session, mint JWT custom + `sid`.
- [x] A6. `middleware/auth.ts` — validasi `sid` (KV-cached) bila ada & `!is_demo` → 401 "Sesi dicabut". JWT lama tanpa `sid` lewati.
- [x] A7. Logout cabut session by `sid` + bust KV. Endpoint `GET /auth/sesi` (list) + `POST /auth/sesi/:id/cabut` (revoke).
- [x] A8. Env/secret: `config/env.ts` getter betterAuthSecret/Url, googleClientId/Secret, oauthEnabled. `wrangler.toml` vars + secret. `.env.example`, `Bindings` type.
- [x] A9. `backend/src/lib/email.ts` — **stub dulu** (log link). Sender CF Email Sending diaktifkan saat domain siap (lihat BACKLOG).

**Exit A**: login password lewat better-auth → JWT custom dgn `sid`; logout/revoke jalan; app existing tak berubah.

## FASE B — Email wajib + linking + OAuth

- [ ] B1. OAuth bridge cross-origin: tombol Google navigate langsung ke worker; callback simpan one-time-code di KV (TTL ~60s); endpoint `frontend/src/routes/auth/oauth-callback/+server.ts` tukar code→token, set cookie pages.dev, redirect `/kasir`.
- [ ] B2. Gate `gateLengkapiEmail` di `frontend/src/lib/server/auth.ts`. Halaman `frontend/src/routes/(auth)/lengkapi-email/`. Backend buat user+account, set `karyawan.email`+`ba_user_id`. Verifikasi via email (deferred sampai domain) → sementara mark `unverified`.
- [ ] B3. Jalur admin: `backend/src/routes/karyawan.ts` + UI karyawan — pemilik/manajer set email karyawan → undang verifikasi.
- [ ] B4. UI linking Google (pengaturan) + halaman "Perangkat & Sesi" (list+cabut).
- [ ] B5. Login page pakai better-auth (`signIn.email`/`signIn.social`) sbg jalur utama; `/auth/login` custom tetap fallback.

**Exit B**: owner login Google (auto-verified); staff isi email (admin/gate); device list & revoke dari UI.

## FASE C — Cutover buang JWT (DIRENCANAKAN, sesi terpisah)

- [ ] C1. `session.additionalFields`: activeTokoId, cabangId, isDemo, homeTokoId (migrasi tambah kolom).
- [ ] C2. `switch-context` (`auth.ts:472-549`) → update row session (bukan re-mint).
- [ ] C3. `authMiddleware` baca `auth.api.getSession` gantikan `jwtVerify`. Demo routing baca `isDemo` dari session.
- [ ] C4. `tenant.ts` + `langganan.ts` baca konteks dari session.
- [ ] C5. Hapus jose JWT + cookie custom + `issueAuthCookie`. Sesuaikan proxy SvelteKit + `lib/server/auth.ts` ke cookie better-auth.
- [ ] C6. Regresi penuh: switch-context, demo, gating, multi-device.

## Prasyarat eksternal

- [ ] Domain custom di CF (zone) → `wrangler email sending enable <domain>` + SPF/DKIM/DMARC. Buka forced-verification + self-serve reset.
- [ ] Google OAuth credential (client id/secret) → wrangler secret.
</content>
