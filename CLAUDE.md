# CLAUDE.md — Stokasir App

> Deployment ke Raspberry Pi → baca `DEPLOY.md`.
> Pola implementasi fitur baru → baca `CLAUDE_SKILL_FEATURE_DEV.md`.

---

## IDENTITAS & PRINSIP

Aplikasi manajemen stok-kasir grosir/eceran. Webview lokal via WiFi LAN.
1 developer, 1 toko, < 5 karyawan. Offline-first, siap migrasi ke Turso/Supabase.

```
SIMPEL → sedikit dependencies   RINGAN → cepat di HP jadul
OFFLINE → tanpa internet        WEBVIEW → 1 codebase, HP & laptop
```

---

## TECH STACK

```
Frontend  : SvelteKit + TypeScript + TailwindCSS (font: JetBrains Mono)
Backend   : Hono.js + Bun runtime, port 3000
Database  : SQLite via bun:sqlite (bukan better-sqlite3), ORM: drizzle-orm/bun-sqlite
Auth      : JWT via jose, httpOnly cookie `auth_token`, RBAC
Storage   : backend/uploads/{produk,invoice,karyawan}/
```

```bash
cd backend  && bun run dev       # http://localhost:3000
cd frontend && bun run dev       # http://localhost:5173
cd backend  && bun run db:generate && bun run db:migrate
```

---

## STRUKTUR FOLDER

```
frontend/src/
  routes/(app)/
    dashboard/   kasir/    gudang/    karyawan/
    keuangan/    laporan/  harga/     pengaturan/
      pengaturan/notifikasi/   pengaturan/audit/
    kasir/retur/   gudang/label/
  lib/
    components/{ui,data,form,layout}/
    stores/        utils/{api.ts,async.ts,wa.ts}

backend/src/
  routes/   db/{schema.ts,index.ts,migrations/}
  middleware/{auth.ts,upload.ts}
```

---

## RBAC

```
pemilik  → *
manajer  → semua kecuali role.kelola
kasir    → stok.lihat, harga_jual.lihat, penjualan.*, absensi.diri
gudang   → stok.*, harga_beli.*, pembelian.*, absensi.diri
```

Permission format: `modul.aksi` (stok.lihat, harga_beli.edit, penjualan.void, dll.)
Cek role di frontend: `import { user } from '$lib/stores/auth.js'` → `$user.role`

---

## ATURAN DATABASE

```
1. id INTEGER PRIMARY KEY AUTOINCREMENT di semua tabel
2. Hapus = is_active = 0, bukan DELETE
3. Harga di detail transaksi = SNAPSHOT (bukan FK ke master)
4. Setiap perubahan stok = 1 baris di mutasi_stok (wajib ada referensi dokumen)
5. Hutang/piutang otomatis dari transaksi — tidak ada input ganda
6. Multi-tabel → wajib db.transaction()
7. Laporan approve → tersimpan sebagai JSON snapshot
```

Schema detail → `backend/src/db/schema.ts`

---

## ATURAN CODING

```
1. Selalu TypeScript — tidak ada .js
2. Middleware auth di SETIAP route yang butuh login
3. Validasi input di backend
4. Response konsisten: { success: true, data } | { success: false, error }
5. Foto di filesystem, path di database
6. Transaction SQLite untuk operasi multi-tabel
7. Route statis HARUS di atas route dinamis (/:id) — Hono match urut dari atas
```

---

## FRONTEND — KONVENSI WAJIB

### Struktur file per modul
```
[modul].types.ts   → interface/type, tanpa import selain TS built-in
[modul].api.ts     → fetch ke backend, unwrap ApiResponse, throw on error
[modul].logic.ts   → pure functions, tanpa fetch/store/DOM
[modul].store.svelte.ts → createXStore() factory, $state runes, withLoading()
+page.svelte       → HANYA template: bind store, on:event, {#if}, {#each}
```

### Svelte 5 runes (wajib — bukan Svelte 4)
```svelte
let { value = 0, ontutup }: { value?: number; ontutup?: () => void } = $props()
const total = $derived(value * 2)
let items = $state<Item[]>([])

// Cleanup pakai return dari onMount, bukan onDestroy
onMount(() => { const id = setInterval(fn, 1000); return () => clearInterval(id) })

// Callback props — bukan createEventDispatcher
ontutup?.()
```

### withLoading (semua async di store wajib pakai ini)
```typescript
import { withLoading } from '$lib/utils/async'

const hasil = await withLoading(() => fetchData(), {
  loadingKey: 'modul-aksi', loadingPesan: 'Memuat...',
  modul: 'barang', aksi: 'muat',
  errorPesan: 'Gagal memuat', bisaRetry: true,
})
if (hasil) data = hasil
```

### CSS — custom properties (jangan hardcode warna)
```
var(--bg) var(--surface) var(--surface2) var(--border)
var(--text) var(--text-dim) var(--accent) var(--warn) var(--danger) var(--info)
```
3 tema: `dark` / `light` / `eye` — toggle di navbar.

### Responsive — breakpoint Tailwind
```
mobile   : default (< 640px)   → HP portrait, layar kecil
tablet   : sm: (640px+)        → HP landscape, tablet
desktop  : md: (768px+)        → laptop, PC
```

Pola wajib saat layout berubah antar device:
```svelte
<!-- Grid: 1 kolom HP → 2 kolom tablet → 3 kolom desktop -->
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">

<!-- Tabel: sembunyikan kolom minor di HP -->
<th class="hidden sm:table-cell">Kolom Minor</th>
<td class="hidden sm:table-cell">...</td>

<!-- Tombol: full-width di HP, auto di desktop -->
<button class="w-full sm:w-auto">Simpan</button>

<!-- Teks: lebih kecil di HP -->
<h1 class="text-base md:text-lg">Judul</h1>

<!-- Padding: lebih kecil di HP -->
<div class="p-3 md:p-6">
```

Prioritas tampilan:
- HP → kasir & gudang harus 100% usable (aksi utama toko)
- Tablet → semua modul usable, tabel boleh scroll horizontal
- Desktop → layout optimal, tampilkan semua kolom

Tabel di HP — wajib scrollable, jangan dipotong:
```svelte
<div class="overflow-x-auto">
  <table class="min-w-full">...</table>
</div>
```

### Anti-patterns
```
✗ window/document di luar onMount     → SSR crash
✗ createEventDispatcher                → pakai callback props ($props)
✗ export let                           → pakai $props() rune
✗ try/catch di store action            → pakai withLoading()
✗ onMount() + $effect() untuk load     → pilih salah satu
✗ hitung di template {a - b}          → pakai $derived
✗ localStorage/sessionStorage          → state di store, data di backend
✗ {kondisi ? <span>...</span> : ...}  → JSX tidak valid di Svelte, pakai {#if}
✗ lebar fixed px di elemen utama      → pakai %, max-w-, atau w-full
✗ tabel tanpa overflow-x-auto di HP   → konten terpotong
```

---

## STATUS IMPLEMENTASI

| Modul | Status |
|-------|--------|
| Auth + RBAC, Master Data | ✅ |
| Kasir + Scanner + Shift | ✅ |
| Gudang (PO, terima, opname, label) | ✅ |
| Keuangan (jurnal, hutang, piutang) | ✅ |
| Laporan (L/R, arus kas, neraca, aging) | ✅ |
| Absensi, Penggajian, Kasbon | ✅ |
| Pengaturan Toko, Manajemen Harga | ✅ |
| Retur Penjualan, Notifikasi, Audit Trail | ✅ |
| WhatsApp (wa.me reminder piutang) | ✅ |
| Kartu Anggota | ✅ |
| Jadwal & Shift Kerja | ✅ |
| Promo & Diskon (admin + kasir) | ✅ |
| Budget & Target | ✅ |
| Retur Penjualan dari UI kasir | ✅ |
| History transaksi kasir (filter + cetak ulang) | ✅ |
| Alert stok menipis di kasir | ✅ |
| Info Server + QR koneksi HP | ✅ |
| PWA installable (Add to Home Screen) | ✅ |
| Backup database (download SQLite) | ✅ |
| Dashboard chart toggle 7/30 hari + rata-rata | ✅ |
| Riwayat mutasi stok per barang (filter + detail) | ✅ |
| Absensi: durasi kerja, filter karyawan, export CSV rekap | ✅ |
| WA alert tombol cepat ke pemilik dari notifikasi | ✅ |
| Service Worker / offline cache (static + API stale-while-revalidate) | ✅ |
| Rebrand ke Stokasir (nama, path, docs) | ✅ |
| Halaman panduan penggunaan (/panduan — accordion + TOC + FAQ) | ✅ |
| Halaman panduan instalasi (/panduan/instalasi — per device) | ✅ |
| Shortcut Ctrl+Home toggle sidebar | ✅ |
| DEPLOY.md: panduan server Windows / Mac / Linux | ✅ |
| Installer ZIP: setup.sh (Linux/Mac/Pi) + setup.ps1 (Windows) + build-zip.sh | ✅ |

Branch aktif: `development`

---

## BUGFIX WAJIB (sebelum deploy)

### Masih Open


### Sudah Diperbaiki (referensi)


---

## BACKLOG — NEXT TASKS

```
Pertimbangan jangka panjang:
  [x] Service Worker / offline cache — agar kasir tetap jalan saat WiFi putus
  [ ] Multi-toko / multi-cabang
  [ ] Migrasi ke Turso (libSQL) untuk akses remote
```

---

## POLA WAJIB DIJAGA

```
1. Route order Hono: static (/tukar, /aktif) HARUS sebelum dynamic (/:id)
2. Multi-tabel → db.transaction() (contoh: bayar gaji → penggajian+kasbon+jurnal_kas)
3. api.ts try/catch: setelah fix F-H3, tidak perlu try/catch di setiap caller
4. Load data: onMount ATAU $effect — jangan keduanya untuk data yang sama
5. Permission guard di setiap halaman sensitif:
   $effect(() => { if ($user && !['pemilik','manajer'].includes($user.role)) goto('/kasir') })
```

---

## GIT COMMIT

```
<type>(<scope>): <deskripsi singkat>   ← maks 72 karakter

type: feat | fix | refactor | style | chore | docs | db
scope: auth | kasir | gudang | keuangan | laporan | karyawan | barang | stok

Bahasa Indonesia, imperatif, huruf kecil. Jangan tambah Co-Authored-By.
Body: jelaskan KENAPA berubah, bukan APA yang berubah.
```

Contoh: `fix(kasir): reset tipeTransaksi ke eceran setelah checkout`
