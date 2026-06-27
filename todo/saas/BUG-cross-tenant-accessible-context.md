# BUG (SaaS) — getAccessibleContext bocor lintas tenant

**STATUS: RESOLVED & VERIFIED** (commit 9bcd4c4). Saat `SAAS_GATING=1`, pemilik di
`getAccessibleContext` (auth.ts) discope ke toko dgn `email_pemilik` cocok →
accessible-context & switch-context terkunci ke toko milik sendiri. Mode LAN tak
berubah (pemilik superuser). Manajer tetap toko sendiri. Verifikasi runtime 2-akun: DONE.

**Severity:** tinggi (untuk mode SaaS multi-tenant). Aman di mode LAN.

## Masalah
`getAccessibleContext(role, tokoId)` di [backend/src/routes/auth.ts:249](../../backend/src/routes/auth.ts#L249)
untuk role `pemilik` mengembalikan **SEMUA** toko aktif di DB:

```ts
const tokoList = role === 'pemilik'
  ? await db.select(...).from(toko).where(eq(toko.is_active, true))   // ← semua toko
  : ... // manajer: cuma toko sendiri
```

Konsekuensi:
- `GET /auth/accessible-context` → pemilik lihat toko milik orang lain.
- `POST /auth/switch-context` → pemilik bisa pindah ke tenant orang lain (gate pakai fungsi yg sama).
- Dipakai di: `lib/components/NavUser.svelte` (switcher navbar) + `routes/onboarding/+page.svelte` (chip picker).

Di LAN tidak masalah (pemilik = superuser 1 instance). Di SaaS = pelanggaran isolasi tenant.

## Perbaikan (ide)
Scope toko ke kepemilikan, bukan "semua aktif":
- Tambah relasi kepemilikan eksplisit (mis. `toko.email_pemilik` sudah ada → filter `eq(toko.email_pemilik, user.email)`),
  atau tabel pivot `pemilik_toko (karyawan_id/email, toko_id)` untuk multi-toko proper.
- Update `getAccessibleContext`: pemilik → hanya toko yang dia miliki.
- Cek `switch-context` ikut aman (sudah pakai fungsi sama → otomatis terkunci).
- Pertimbangkan flag mode: LAN (semua) vs SAAS (scoped) — mungkin pakai env yg sama dgn gating (`SAAS_GATING`/serupa).

## Terkait
- `/auth/daftar` ([auth.ts:141](../../backend/src/routes/auth.ts#L141)) TIDAK seed `toko_settings.nama_toko` → onboarding harus prefill dari `toko.nama` (sudah ditangani di FE commit 55580e6). Idealnya daftar seed nama_toko ke settings biar konsisten dari awal.

## Verifikasi
- 2 akun pemilik beda → akun A tak boleh lihat/switch toko akun B di accessible-context.
- NavUser switcher & onboarding chip cuma tampilkan toko milik sendiri.
